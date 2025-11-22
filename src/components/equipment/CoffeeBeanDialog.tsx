import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import type { CoffeeBean, CoffeeBatch } from "@/contexts/AppContext";
import ImageUpload from "@/components/ImageUpload";

const coffeeBeanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  roaster: z.string().trim().min(1, "Roaster is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  altitude: z.string().trim().max(50).optional().or(z.literal("")),
  varietal: z.string().trim().min(1, "Varietal is required").max(100),
  process: z.string().trim().min(1, "Process is required").max(100),
  roastLevel: z.string().trim().min(1, "Roast level is required").max(50),
  tastingNotes: z.string().trim().max(500).optional().or(z.literal("")),
  url: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
});

type CoffeeBeanFormData = z.infer<typeof coffeeBeanSchema>;

interface CoffeeBeanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bean: CoffeeBean | null;
}

export function CoffeeBeanDialog({ open, onOpenChange, bean }: CoffeeBeanDialogProps) {
  const { addCoffeeBean, updateCoffeeBean } = useApp();
  const { toast } = useToast();
  const [batches, setBatches] = useState<CoffeeBatch[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CoffeeBeanFormData>({
    resolver: zodResolver(coffeeBeanSchema),
    defaultValues: {
      name: "",
      roaster: "",
      country: "",
      region: "",
      altitude: "",
      varietal: "",
      process: "",
      roastLevel: "",
      tastingNotes: "",
      url: "",
      photo: "",
    },
  });

  const photo = watch("photo");

  useEffect(() => {
    if (bean) {
      setValue("name", bean.name);
      setValue("roaster", bean.roaster);
      setValue("country", bean.country);
      setValue("region", bean.region || "");
      setValue("altitude", bean.altitude || "");
      setValue("varietal", bean.varietal);
      setValue("process", bean.process);
      setValue("roastLevel", bean.roastLevel);
      setValue("tastingNotes", bean.tastingNotes || "");
      setValue("url", bean.url || "");
      setValue("photo", bean.photo || "");
      setBatches(bean.batches || []);
    } else {
      reset();
      setBatches([]);
    }
  }, [bean, setValue, reset]);

  const addBatch = () => {
    const today = new Date().toISOString().split("T")[0];
    setBatches([
      ...batches,
      {
        id: Date.now().toString(),
        price: 0,
        roastDate: today,
        weight: 250,
        currentWeight: 250,
        purchaseDate: today,
        isActive: true,
        notes: "",
      },
    ]);
  };

  const updateBatch = (id: string, field: keyof CoffeeBatch, value: any) => {
    setBatches(batches.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const removeBatch = (id: string) => {
    setBatches(batches.filter((b) => b.id !== id));
  };

  const onSubmit = (data: CoffeeBeanFormData) => {
    const beanData = { ...data, batches } as Omit<CoffeeBean, "id">;

    if (bean) {
      updateCoffeeBean(bean.id, beanData);
      toast({ title: "Coffee bean updated", description: "Coffee bean has been updated successfully" });
    } else {
      addCoffeeBean(beanData);
      toast({ title: "Coffee bean added", description: "Coffee bean has been added successfully" });
    }
    onOpenChange(false);
    reset();
    setBatches([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bean ? "Edit Coffee Bean" : "Add Coffee Bean"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" {...register("name")} placeholder="e.g., Ethiopia Yirgacheffe" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="roaster">Roaster *</Label>
            <Input id="roaster" {...register("roaster")} placeholder="e.g., Local Coffee Co." />
            {errors.roaster && <p className="text-sm text-destructive">{errors.roaster.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="country">Country *</Label>
              <Input id="country" {...register("country")} placeholder="Ethiopia" />
              {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input id="region" {...register("region")} placeholder="Yirgacheffe" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="altitude">Altitude</Label>
              <Input id="altitude" {...register("altitude")} placeholder="1800-2200m" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="varietal">Varietal *</Label>
              <Input id="varietal" {...register("varietal")} placeholder="Heirloom" />
              {errors.varietal && <p className="text-sm text-destructive">{errors.varietal.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="process">Process *</Label>
              <Input id="process" {...register("process")} placeholder="Washed" />
              {errors.process && <p className="text-sm text-destructive">{errors.process.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="roastLevel">Roast Level *</Label>
              <Input id="roastLevel" {...register("roastLevel")} placeholder="Light" />
              {errors.roastLevel && <p className="text-sm text-destructive">{errors.roastLevel.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tastingNotes">Tasting Notes</Label>
            <Textarea
              id="tastingNotes"
              {...register("tastingNotes")}
              placeholder="Floral, bergamot, honey"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...register("url")} placeholder="https://roaster.com/coffee" />
            {errors.url && <p className="text-sm text-destructive">{errors.url.message}</p>}
          </div>

          <div className="space-y-2">
            <ImageUpload
              value={photo || ""}
              onChange={(dataUrl) => setValue("photo", dataUrl)}
              label="Photo"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Batches</Label>
              <Button type="button" size="sm" variant="outline" onClick={addBatch}>
                <Plus className="h-4 w-4 mr-1" />
                Add Batch
              </Button>
            </div>
            {batches.map((batch) => (
              <div key={batch.id} className="flex gap-2 items-start p-3 rounded-lg bg-muted">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Price ($)</Label>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={batch.price}
                        onChange={(e) => updateBatch(batch.id, "price", parseFloat(e.target.value) || 0)}
                        step="0.01"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Weight (g)</Label>
                      <Input
                        type="number"
                        placeholder="Weight"
                        value={batch.weight}
                        onChange={(e) => {
                          const weight = parseFloat(e.target.value) || 0;
                          updateBatch(batch.id, "weight", weight);
                          if (!bean) {
                            updateBatch(batch.id, "currentWeight", weight);
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Purchase Date</Label>
                      <Input
                        type="date"
                        value={batch.purchaseDate}
                        onChange={(e) => updateBatch(batch.id, "purchaseDate", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Roast Date</Label>
                      <Input
                        type="date"
                        value={batch.roastDate}
                        onChange={(e) => updateBatch(batch.id, "roastDate", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeBatch(batch.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {bean ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
