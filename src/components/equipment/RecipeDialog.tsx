import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Recipe } from "@/contexts/AppContext";

const recipeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  grinderId: z.string().min(1, "Grinder is required"),
  brewerId: z.string().min(1, "Brewer is required"),
  ratio: z.string().trim().min(1, "Ratio is required").max(20),
  dose: z.number().min(1, "Dose must be at least 1g").max(1000),
  photo: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  process: z.string().trim().min(1, "Process is required").max(200),
  grindSize: z.number().min(0, "Grind size must be at least 0").max(100),
  water: z.number().min(1, "Water must be at least 1g").max(10000),
  yield: z.number().min(1, "Yield must be at least 1g").max(10000),
  temperature: z.number().min(1, "Temperature must be at least 1°C").max(100),
  brewTime: z.string().trim().min(1, "Brew time is required").max(20),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
}

export function RecipeDialog({ open, onOpenChange, recipe }: RecipeDialogProps) {
  const { addRecipe, updateRecipe, grinders, brewers } = useApp();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<RecipeFormData>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      name: "",
      grinderId: "",
      brewerId: "",
      ratio: "1:16",
      dose: 15,
      photo: "",
      process: "",
      grindSize: 20,
      water: 240,
      yield: 240,
      temperature: 93,
      brewTime: "3:00",
    },
  });

  const grinderId = watch("grinderId");
  const brewerId = watch("brewerId");

  useEffect(() => {
    if (recipe) {
      Object.entries(recipe).forEach(([key, value]) => {
        setValue(key as any, value);
      });
    } else {
      reset();
    }
  }, [recipe, setValue, reset]);

  const onSubmit = (data: RecipeFormData) => {
    if (grinders.length === 0) {
      toast({ title: "No grinders", description: "Please add a grinder first", variant: "destructive" });
      return;
    }
    if (brewers.length === 0) {
      toast({ title: "No brewers", description: "Please add a brewer first", variant: "destructive" });
      return;
    }

    if (recipe) {
      updateRecipe(recipe.id, data);
      toast({ title: "Recipe updated", description: "Recipe has been updated successfully" });
    } else {
      addRecipe(data as Omit<Recipe, "id">);
      toast({ title: "Recipe added", description: "Recipe has been added successfully" });
    }
    onOpenChange(false);
    reset();
  };

  if (grinders.length === 0 || brewers.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Missing Equipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              You need to add at least one grinder and one brewer before creating recipes.
            </p>
            <Button onClick={() => onOpenChange(false)} className="w-full">
              OK
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? "Edit Recipe" : "Add Recipe"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Morning V60" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grinderId">Grinder *</Label>
              <Select value={grinderId} onValueChange={(value) => setValue("grinderId", value)}>
                <SelectTrigger id="grinderId">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {grinders.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.grinderId && <p className="text-sm text-destructive">{errors.grinderId.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brewerId">Brewer *</Label>
              <Select value={brewerId} onValueChange={(value) => setValue("brewerId", value)}>
                <SelectTrigger id="brewerId">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {brewers.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.brewerId && <p className="text-sm text-destructive">{errors.brewerId.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ratio">Ratio *</Label>
              <Input id="ratio" {...register("ratio")} placeholder="1:16" />
              {errors.ratio && <p className="text-sm text-destructive">{errors.ratio.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dose">Dose (g) *</Label>
              <Input
                id="dose"
                type="number"
                step="0.1"
                {...register("dose", { valueAsNumber: true })}
              />
              {errors.dose && <p className="text-sm text-destructive">{errors.dose.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="process">Process *</Label>
            <Input id="process" {...register("process")} placeholder="e.g., Standard pour" />
            {errors.process && <p className="text-sm text-destructive">{errors.process.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grindSize">Grind Size *</Label>
              <Input
                id="grindSize"
                type="number"
                step="0.1"
                {...register("grindSize", { valueAsNumber: true })}
              />
              {errors.grindSize && <p className="text-sm text-destructive">{errors.grindSize.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="water">Water (g) *</Label>
              <Input
                id="water"
                type="number"
                step="1"
                {...register("water", { valueAsNumber: true })}
              />
              {errors.water && <p className="text-sm text-destructive">{errors.water.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yield">Yield (g) *</Label>
              <Input
                id="yield"
                type="number"
                step="1"
                {...register("yield", { valueAsNumber: true })}
              />
              {errors.yield && <p className="text-sm text-destructive">{errors.yield.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="temperature">Temp (°C) *</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                {...register("temperature", { valueAsNumber: true })}
              />
              {errors.temperature && <p className="text-sm text-destructive">{errors.temperature.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="brewTime">Brew Time *</Label>
              <Input id="brewTime" {...register("brewTime")} placeholder="3:00" />
              {errors.brewTime && <p className="text-sm text-destructive">{errors.brewTime.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo URL</Label>
            <Input id="photo" {...register("photo")} placeholder="https://example.com/image.jpg" />
            {errors.photo && <p className="text-sm text-destructive">{errors.photo.message}</p>}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {recipe ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
