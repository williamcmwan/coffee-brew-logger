import { useEffect, useState } from "react";
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
import { Plus, X, Copy } from "lucide-react";
import type { Recipe, RecipeStep } from "@/contexts/AppContext";
import ImageUpload from "@/components/ImageUpload";
import { api } from "@/lib/api";

interface AdminRecipe {
  id: string;
  name: string;
  ratio: string;
  dose: number;
  photo?: string;
  process?: string;
  processSteps?: RecipeStep[];
  grindSize: number;
  water: number;
  yield: number;
  temperature: number;
  brewTime: string;
  grinderModel?: string;
  brewerModel?: string;
}

const recipeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  grinderId: z.string().min(1, "Grinder is required"),
  brewerId: z.string().min(1, "Brewer is required"),
  ratio: z.string().trim().min(1, "Ratio is required").max(20),
  dose: z.number({ required_error: "Dose is required", invalid_type_error: "Dose must be a number" })
    .min(1, "Dose must be at least 1g").max(1000),
  photo: z.string().optional().or(z.literal("")),
  process: z.string().trim().optional().or(z.literal("")),
  grindSize: z.number({ required_error: "Grind size is required", invalid_type_error: "Grind size must be a number" })
    .min(0, "Grind size must be at least 0").max(100),
  water: z.number({ required_error: "Water is required", invalid_type_error: "Water must be a number" })
    .min(1, "Water must be at least 1g").max(10000),
  yield: z.number({ required_error: "Yield is required", invalid_type_error: "Yield must be a number" })
    .min(1, "Yield must be at least 1g").max(10000),
  temperature: z.number({ required_error: "Temperature is required", invalid_type_error: "Temperature must be a number" })
    .min(1, "Temperature must be at least 1°C").max(100),
  brewTime: z.string().trim().min(1, "Brew time is required").max(20),
});

type RecipeFormData = z.infer<typeof recipeSchema>;

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
  isCloning?: boolean;
}

// Helper to format duration in seconds to display string
const formatDuration = (seconds: number): string => {
  if (seconds >= 60) {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
  }
  return seconds.toString();
};

// Helper to parse time string to seconds
const parseDuration = (val: string): number => {
  if (val === '' || val === ':') return 0;
  if (val.includes(':')) {
    const parts = val.split(':');
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return parseInt(val, 10) || 0;
};

export function RecipeDialog({ open, onOpenChange, recipe, isCloning = false }: RecipeDialogProps) {
  const { addRecipe, updateRecipe, grinders, brewers } = useApp();
  const { toast } = useToast();
  const [processSteps, setProcessSteps] = useState<RecipeStep[]>([
    { description: "", waterAmount: 0, duration: 30 }
  ]);
  // Track raw elapsed time input values to allow free editing
  const [elapsedTimeInputs, setElapsedTimeInputs] = useState<Record<number, string>>({});
  const [adminRecipes, setAdminRecipes] = useState<AdminRecipe[]>([]);
  const [showAdminPicker, setShowAdminPicker] = useState(false);

  useEffect(() => {
    if (open && !recipe && !isCloning) {
      api.admin.getRecipes()
        .then((data) => setAdminRecipes([...data].sort((a, b) => a.name.localeCompare(b.name))))
        .catch(() => setAdminRecipes([]));
    }
  }, [open, recipe, isCloning]);

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
  const photo = watch("photo");

  useEffect(() => {
    if (recipe) {
      // Reset form first, then set values
      reset({
        name: isCloning ? `${recipe.name} (Copy)` : recipe.name,
        grinderId: recipe.grinderId,
        brewerId: recipe.brewerId,
        ratio: recipe.ratio,
        dose: recipe.dose,
        photo: recipe.photo || "",
        process: recipe.process || "",
        grindSize: recipe.grindSize,
        water: recipe.water,
        yield: recipe.yield,
        temperature: recipe.temperature,
        brewTime: recipe.brewTime,
      });
      if (recipe.processSteps && recipe.processSteps.length > 0) {
        setProcessSteps([...recipe.processSteps]);
        // Initialize elapsed time inputs from recipe steps
        const inputs: Record<number, string> = {};
        recipe.processSteps.forEach((step, index) => {
          inputs[index] = formatDuration(step.duration);
        });
        setElapsedTimeInputs(inputs);
      }
    } else {
      reset();
      setProcessSteps([{ description: "", waterAmount: 0, duration: 30 }]);
      setElapsedTimeInputs({ 0: "30" });
    }
  }, [recipe, isCloning, reset]);

  const onSubmit = async (data: RecipeFormData) => {
    if (grinders.length === 0) {
      toast({ title: "No grinders", description: "Please add a grinder first", variant: "destructive" });
      return;
    }
    if (brewers.length === 0) {
      toast({ title: "No brewers", description: "Please add a brewer first", variant: "destructive" });
      return;
    }

    const recipeData = {
      ...data,
      processSteps: processSteps.filter(step => step.description.trim() !== "")
    };

    try {
      if (recipe && !isCloning) {
        await updateRecipe(recipe.id, recipeData);
        toast({ title: "Recipe updated", description: "Recipe has been updated successfully" });
      } else {
        await addRecipe(recipeData as Omit<Recipe, "id">);
        toast({ title: isCloning ? "Recipe cloned" : "Recipe added", description: isCloning ? "Recipe has been cloned successfully" : "Recipe has been added successfully" });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save recipe",
        variant: "destructive"
      });
    }
  };

  const addStep = () => {
    const newIndex = processSteps.length;
    setProcessSteps([...processSteps, { description: "", waterAmount: 0, duration: 30 }]);
    setElapsedTimeInputs(prev => ({ ...prev, [newIndex]: "30" }));
  };

  const removeStep = (index: number) => {
    if (processSteps.length > 1) {
      setProcessSteps(processSteps.filter((_, i) => i !== index));
      // Reindex elapsed time inputs
      const newInputs: Record<number, string> = {};
      Object.keys(elapsedTimeInputs).forEach(key => {
        const keyNum = parseInt(key, 10);
        if (keyNum < index) {
          newInputs[keyNum] = elapsedTimeInputs[keyNum];
        } else if (keyNum > index) {
          newInputs[keyNum - 1] = elapsedTimeInputs[keyNum];
        }
      });
      setElapsedTimeInputs(newInputs);
    }
  };

  const updateStep = (index: number, field: keyof RecipeStep, value: string | number) => {
    const newSteps = [...processSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setProcessSteps(newSteps);
  };

  const handleCopyFromAdmin = (adminRecipe: AdminRecipe) => {
    setValue("name", adminRecipe.name);
    setValue("ratio", adminRecipe.ratio);
    setValue("dose", adminRecipe.dose);
    setValue("photo", adminRecipe.photo || "");
    setValue("process", adminRecipe.process || "");
    setValue("grindSize", adminRecipe.grindSize);
    setValue("water", adminRecipe.water);
    setValue("yield", adminRecipe.yield);
    setValue("temperature", adminRecipe.temperature);
    setValue("brewTime", adminRecipe.brewTime);
    
    if (adminRecipe.processSteps && adminRecipe.processSteps.length > 0) {
      setProcessSteps([...adminRecipe.processSteps]);
      const inputs: Record<number, string> = {};
      adminRecipe.processSteps.forEach((step, index) => {
        inputs[index] = formatDuration(step.duration);
      });
      setElapsedTimeInputs(inputs);
    }
    
    setShowAdminPicker(false);
    toast({ 
      title: "Copied", 
      description: `Copied "${adminRecipe.name}" settings. Please select your grinder and brewer.` 
    });
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
          <DialogTitle>{isCloning ? "Clone Recipe" : recipe ? "Edit Recipe" : "Add Recipe"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!recipe && !isCloning && adminRecipes.length > 0 && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setShowAdminPicker(!showAdminPicker)}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy from templates
              </Button>
              {showAdminPicker && (
                <div className="border rounded-lg p-2 space-y-1 max-h-48 overflow-y-auto bg-muted/50">
                  {adminRecipes.map((ar) => (
                    <Button
                      key={ar.id}
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleCopyFromAdmin(ar)}
                    >
                      <div className="flex items-center gap-2 w-full">
                        {ar.photo ? (
                          <img src={ar.photo} alt={ar.name} className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground shrink-0">—</div>
                        )}
                        <div className="truncate">
                          {ar.name}
                          <span className="text-xs text-muted-foreground ml-2">
                            ({ar.brewerModel || "Unknown brewer"})
                          </span>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Morning V60" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grinderId">Grinder *</Label>
            <Select value={grinderId} onValueChange={(value) => setValue("grinderId", value)}>
              <SelectTrigger id="grinderId" className="w-full">
                <SelectValue placeholder="Select grinder" />
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
              <SelectTrigger id="brewerId" className="w-full">
                <SelectValue placeholder="Select brewer" />
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
                step="any"
                {...register("dose", { valueAsNumber: true })}
              />
              {errors.dose && <p className="text-sm text-destructive">{errors.dose.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Process Steps *</Label>
            <div className="space-y-3">
              {processSteps.map((step, index) => (
                <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Step {index + 1}</span>
                    {processSteps.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Description (e.g., Bloom, Main pour)"
                    value={step.description}
                    onChange={(e) => updateStep(index, "description", e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Cumulative Water (g)</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={(() => {
                          // Calculate cumulative water up to and including this step
                          const cumulativeWater = processSteps.slice(0, index + 1).reduce((sum, s) => sum + (s.waterAmount || 0), 0);
                          return cumulativeWater || "";
                        })()}
                        onChange={(e) => {
                          const cumulativeValue = parseFloat(e.target.value) || 0;
                          // Calculate water for previous steps
                          const previousWater = processSteps.slice(0, index).reduce((sum, s) => sum + (s.waterAmount || 0), 0);
                          // Set this step's water amount (allow negative, user will see warning)
                          const stepWater = cumulativeValue - previousWater;
                          updateStep(index, "waterAmount", stepWater);
                        }}
                      />
                      {(() => {
                        const cumulativeWater = processSteps.slice(0, index + 1).reduce((sum, s) => sum + (s.waterAmount || 0), 0);
                        const previousWater = processSteps.slice(0, index).reduce((sum, s) => sum + (s.waterAmount || 0), 0);
                        if (index > 0 && cumulativeWater < previousWater) {
                          return <p className="text-xs text-destructive mt-1">Water should be ≥ {previousWater}g</p>;
                        }
                        return null;
                      })()}
                    </div>
                    <div>
                      <Label className="text-xs">Elapsed Time (s)</Label>
                      <Input
                        type="text"
                        placeholder="30 or 1:30"
                        value={elapsedTimeInputs[index] ?? formatDuration(step.duration)}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Allow any input including empty string
                          setElapsedTimeInputs(prev => ({ ...prev, [index]: val }));
                          // Parse and update duration
                          const seconds = parseDuration(val);
                          updateStep(index, "duration", seconds);
                        }}
                        onBlur={() => {
                          // On blur, format the value nicely if it's valid
                          const currentInput = elapsedTimeInputs[index] ?? '';
                          if (currentInput === '') {
                            // Keep empty as 0
                            updateStep(index, "duration", 0);
                            setElapsedTimeInputs(prev => ({ ...prev, [index]: '0' }));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStep}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Step
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="grindSize">Grind Size *</Label>
              <Input
                id="grindSize"
                type="number"
                step="any"
                {...register("grindSize", { valueAsNumber: true })}
              />
              {errors.grindSize && <p className="text-sm text-destructive">{errors.grindSize.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="water">Water (g) *</Label>
              <Input
                id="water"
                type="number"
                step="any"
                {...register("water", { valueAsNumber: true })}
              />
              {errors.water && <p className="text-sm text-destructive">{errors.water.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="yield">Yield (g) *</Label>
              <Input
                id="yield"
                type="number"
                step="any"
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
                step="any"
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
            <ImageUpload
              value={photo || ""}
              onChange={(dataUrl) => setValue("photo", dataUrl)}
              label="Photo"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {isCloning ? "Clone" : recipe ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
