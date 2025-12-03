import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useApp } from "@/contexts/AppContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { Plus, Trash2, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import type { CoffeeBean, CoffeeBatch } from "@/contexts/AppContext";
import { CoffeeBagScanner } from "./CoffeeBagScanner";
import { uploadImage } from "@/lib/imageUtils";

const coffeeBeanSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  roaster: z.string().trim().min(1, "Roaster is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  altitude: z.string().trim().max(50).optional().or(z.literal("")),
  varietal: z.string().trim().min(1, "Varietal is required").max(100),
  process: z.string().trim().min(1, "Process is required").max(100),
  roastLevel: z.string().trim().max(50).optional().or(z.literal("")),
  roastFor: z.enum(["pour-over", "espresso", ""]).optional(),
  tastingNotes: z.string().trim().max(500).optional().or(z.literal("")),
  url: z.string().trim().max(500).optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
});

type CoffeeBeanFormData = z.infer<typeof coffeeBeanSchema>;

interface CoffeeBeanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bean: CoffeeBean | null;
  isCloning?: boolean;
}

// State for adding batch to existing bean
interface PendingBatchAdd {
  bean: CoffeeBean;
  batch: CoffeeBatch;
}

// State for weight adjustment confirmation
interface PendingWeightAdjust {
  batchId: string;
  newWeight: number;
  currentRemaining: number;
}

export function CoffeeBeanDialog({ open, onOpenChange, bean, isCloning = false }: CoffeeBeanDialogProps) {
  const { addCoffeeBean, updateCoffeeBean, coffeeBeans } = useApp();
  const { toast } = useToast();
  const { symbol } = useCurrency();
  const [batches, setBatches] = useState<CoffeeBatch[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingBatchAdd, setPendingBatchAdd] = useState<PendingBatchAdd | null>(null);
  const [pendingWeightAdjust, setPendingWeightAdjust] = useState<PendingWeightAdjust | null>(null);
  const [adjustedRemaining, setAdjustedRemaining] = useState<number>(0);
  const [showEmptyBatches, setShowEmptyBatches] = useState(false);

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
      roastFor: "",
      tastingNotes: "",
      url: "",
      photo: "",
    },
  });

  const photo = watch("photo");

  useEffect(() => {
    if (bean) {
      setValue("name", isCloning ? `${bean.name} (Copy)` : bean.name);
      setValue("roaster", bean.roaster);
      setValue("country", bean.country);
      setValue("region", bean.region || "");
      setValue("altitude", bean.altitude || "");
      setValue("varietal", bean.varietal);
      setValue("process", bean.process);
      setValue("roastLevel", bean.roastLevel);
      setValue("roastFor", bean.roastFor || "");
      setValue("tastingNotes", bean.tastingNotes || "");
      setValue("url", bean.url || "");
      setValue("photo", bean.photo || "");
      // Don't copy batches when cloning - start fresh
      setBatches(isCloning ? [] : (bean.batches || []));
    } else {
      reset();
      setBatches([]);
    }
  }, [bean, isCloning, setValue, reset]);

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

  const handleScanComplete = async (data: {
    name: string;
    roaster: string;
    country: string;
    region: string;
    altitude: string;
    varietal: string;
    process: string;
    roastLevel: string;
    roastFor: string;
    tastingNotes: string;
    url: string;
    photo: string;
    roastDate: string;
    weight: number;
  }) => {
    const today = new Date().toISOString().split("T")[0];
    const roastDate = data.roastDate && data.roastDate.match(/^\d{4}-\d{2}-\d{2}$/) ? data.roastDate : today;
    const weight = data.weight && data.weight > 0 ? data.weight : 250;
    
    // Skip existing bean check when editing - just update the form
    if (!bean) {
      // Check for existing bean with same name, roaster (partial match), and country
      const normalizeStr = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ');
      const roasterMatches = (existing: string, scanned: string) => {
        const a = normalizeStr(existing);
        const b = normalizeStr(scanned);
        // Exact match or one contains the other (partial match)
        return a === b || a.includes(b) || b.includes(a);
      };
      const existingBean = coffeeBeans.find(b => 
        normalizeStr(b.name) === normalizeStr(data.name || '') &&
        roasterMatches(b.roaster, data.roaster || '') &&
        normalizeStr(b.country) === normalizeStr(data.country || '')
      );
      
      if (existingBean) {
        // Show review dialog for adding batch to existing bean
        const newBatch: CoffeeBatch = {
          id: Date.now().toString(),
          price: 0,
          roastDate: roastDate,
          weight: weight,
          currentWeight: weight,
          purchaseDate: today,
          isActive: true,
          notes: "",
        };
        setPendingBatchAdd({ bean: existingBean, batch: newBatch });
        return;
      }
    }
    
    // Fill form with scanned data (for new bean or editing existing)
    setValue("name", data.name || "");
    setValue("roaster", data.roaster || "");
    setValue("country", data.country || "");
    setValue("region", data.region || "");
    setValue("altitude", data.altitude || "");
    setValue("varietal", data.varietal || "");
    setValue("process", data.process || "");
    setValue("roastLevel", data.roastLevel || "");
    setValue("roastFor", (data.roastFor as "pour-over" | "espresso" | "") || "");
    setValue("tastingNotes", data.tastingNotes || "");
    setValue("url", data.url || "");
    
    // Upload photo to server and set URL
    if (data.photo) {
      try {
        const blob = await fetch(data.photo).then(r => r.blob());
        const file = new File([blob], 'coffee-bag.jpg', { type: 'image/jpeg' });
        const photoUrl = await uploadImage(file);
        setValue("photo", photoUrl);
      } catch {
        setValue("photo", "");
      }
    } else {
      setValue("photo", "");
    }
    
    // Only add a new batch when creating new bean, not when editing
    if (!bean) {
      setBatches([{
        id: Date.now().toString(),
        price: 0,
        roastDate: roastDate,
        weight: weight,
        currentWeight: weight,
        purchaseDate: today,
        isActive: true,
        notes: "",
      }]);
    }
  };

  const updateBatch = (id: string, field: keyof CoffeeBatch, value: any) => {
    setBatches(batches.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const updatePendingBatch = (field: keyof CoffeeBatch, value: any) => {
    if (pendingBatchAdd) {
      setPendingBatchAdd({
        ...pendingBatchAdd,
        batch: { ...pendingBatchAdd.batch, [field]: value }
      });
    }
  };

  const confirmAddBatch = async () => {
    if (!pendingBatchAdd) return;
    
    try {
      // Update weight to match currentWeight for new batch
      const batchToAdd = {
        ...pendingBatchAdd.batch,
        currentWeight: pendingBatchAdd.batch.weight
      };
      
      await updateCoffeeBean(pendingBatchAdd.bean.id, {
        batches: [...pendingBatchAdd.bean.batches, batchToAdd]
      });
      toast({
        title: "Batch added",
        description: `New batch added to "${pendingBatchAdd.bean.name}"`,
      });
      setPendingBatchAdd(null);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add batch",
        variant: "destructive",
      });
    }
  };

  const removeBatch = (id: string) => {
    setBatches(batches.filter((b) => b.id !== id));
  };

  const onSubmit = async (data: CoffeeBeanFormData) => {
    const beanData = { ...data, batches } as Omit<CoffeeBean, "id">;

    try {
      if (bean && !isCloning) {
        await updateCoffeeBean(bean.id, beanData);
        toast({ title: "Coffee bean updated", description: "Coffee bean has been updated successfully" });
      } else {
        await addCoffeeBean(beanData);
        toast({ title: isCloning ? "Coffee bean cloned" : "Coffee bean added", description: isCloning ? "Coffee bean has been cloned successfully" : "Coffee bean has been added successfully" });
      }
      onOpenChange(false);
      reset();
      setBatches([]);
    } catch (error) {
      toast({ 
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to save coffee bean",
        variant: "destructive"
      });
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>{isCloning ? "Clone Coffee Bean" : bean ? "Edit Coffee Bean" : "Add Coffee Bean"}</DialogTitle>
            {!isCloning && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setScannerOpen(true)}
                className="ml-2"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Scan Bag
              </Button>
            )}
          </div>
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
              <Label htmlFor="roastLevel">Roast Level</Label>
              <Input id="roastLevel" {...register("roastLevel")} placeholder="Light" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Roast For</Label>
            <Select value={watch("roastFor")} onValueChange={(value) => setValue("roastFor", value as "pour-over" | "espresso" | "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select brew method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pour-over">Pour-over</SelectItem>
                <SelectItem value="espresso">Espresso</SelectItem>
              </SelectContent>
            </Select>
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

          {photo && (
            <div className="space-y-2">
              <Label>Photo</Label>
              <img
                src={photo}
                alt="Coffee bag"
                className="w-full h-48 object-cover rounded-lg border"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Batches</Label>
              <Button type="button" size="sm" variant="outline" onClick={addBatch}>
                <Plus className="h-4 w-4 mr-1" />
                Add Batch
              </Button>
            </div>
            {batches.some((b) => (b.currentWeight || 0) === 0) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowEmptyBatches(!showEmptyBatches)}
              >
                {showEmptyBatches ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
                {showEmptyBatches ? "Hide" : "Show"} empty batches ({batches.filter((b) => (b.currentWeight || 0) === 0).length})
              </Button>
            )}
            {batches.filter((b) => (b.currentWeight || 0) > 0 || showEmptyBatches).map((batch) => (
              <div key={batch.id} className="flex gap-2 items-start p-3 rounded-lg bg-muted">
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Price ({symbol})</Label>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={batch.price === 0 ? "" : batch.price}
                        onChange={(e) => updateBatch(batch.id, "price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                        onBlur={(e) => updateBatch(batch.id, "price", parseFloat(e.target.value) || 0)}
                        step="0.01"
                        className="px-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Weight (g)</Label>
                      <Input
                        type="number"
                        placeholder="Weight"
                        value={batch.weight === 0 ? "" : batch.weight}
                        onChange={(e) => {
                          const weight = e.target.value === "" ? 0 : parseFloat(e.target.value);
                          const currentRemaining = batch.currentWeight || 0;
                          
                          // If editing existing bean and new weight is less than remaining, ask user
                          if (bean && weight < currentRemaining && weight > 0) {
                            setPendingWeightAdjust({
                              batchId: batch.id,
                              newWeight: weight,
                              currentRemaining: currentRemaining
                            });
                            setAdjustedRemaining(weight);
                          } else {
                            updateBatch(batch.id, "weight", weight);
                            if (!bean) {
                              updateBatch(batch.id, "currentWeight", weight);
                            }
                          }
                        }}
                        className="px-2"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Remaining (g)</Label>
                      <Input
                        type="number"
                        value={batch.currentWeight || 0}
                        disabled
                        className="px-2 bg-background"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="min-w-0">
                      <Label className="text-xs">Purchase Date</Label>
                      <Input
                        type="date"
                        className="w-full px-2"
                        value={batch.purchaseDate}
                        onChange={(e) => updateBatch(batch.id, "purchaseDate", e.target.value)}
                      />
                    </div>
                    <div className="min-w-0">
                      <Label className="text-xs">Roast Date</Label>
                      <Input
                        type="date"
                        className="w-full px-2"
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
              {isCloning ? "Clone" : bean ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    <CoffeeBagScanner
      open={scannerOpen}
      onOpenChange={setScannerOpen}
      onScanComplete={handleScanComplete}
    />

    {/* Review batch dialog for existing bean */}
    <Dialog open={!!pendingBatchAdd} onOpenChange={(open) => !open && setPendingBatchAdd(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Add Batch to Existing Bean</DialogTitle>
        </DialogHeader>
        {pendingBatchAdd && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found existing bean: <span className="font-medium text-foreground">{pendingBatchAdd.bean.name}</span> by {pendingBatchAdd.bean.roaster}
            </p>
            
            <div className="space-y-3 p-3 rounded-lg bg-muted">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Weight (g)</Label>
                  <Input
                    type="number"
                    value={pendingBatchAdd.batch.weight === 0 ? "" : pendingBatchAdd.batch.weight}
                    onChange={(e) => updatePendingBatch("weight", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Price ({symbol})</Label>
                  <Input
                    type="number"
                    value={pendingBatchAdd.batch.price === 0 ? "" : pendingBatchAdd.batch.price}
                    onChange={(e) => updatePendingBatch("price", e.target.value === "" ? 0 : parseFloat(e.target.value))}
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Purchase Date</Label>
                  <Input
                    type="date"
                    value={pendingBatchAdd.batch.purchaseDate}
                    onChange={(e) => updatePendingBatch("purchaseDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label className="text-xs">Roast Date</Label>
                  <Input
                    type="date"
                    value={pendingBatchAdd.batch.roastDate}
                    onChange={(e) => updatePendingBatch("roastDate", e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingBatchAdd(null)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={confirmAddBatch}>
                Add Batch
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Weight adjustment confirmation dialog */}
    <Dialog open={!!pendingWeightAdjust} onOpenChange={(open) => !open && setPendingWeightAdjust(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adjust Remaining Weight</DialogTitle>
        </DialogHeader>
        {pendingWeightAdjust && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The new weight ({pendingWeightAdjust.newWeight}g) is less than the current remaining weight ({pendingWeightAdjust.currentRemaining}g).
            </p>
            <p className="text-sm text-muted-foreground">
              Please confirm the new remaining weight:
            </p>
            
            <div className="space-y-2">
              <Label className="text-xs">Remaining Weight (g)</Label>
              <Input
                type="number"
                value={adjustedRemaining}
                onChange={(e) => setAdjustedRemaining(parseFloat(e.target.value) || 0)}
                max={pendingWeightAdjust.newWeight}
              />
              {adjustedRemaining > pendingWeightAdjust.newWeight && (
                <p className="text-xs text-destructive">Remaining cannot exceed total weight</p>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingWeightAdjust(null)}>
                Cancel
              </Button>
              <Button 
                className="flex-1" 
                disabled={adjustedRemaining > pendingWeightAdjust.newWeight}
                onClick={() => {
                  updateBatch(pendingWeightAdjust.batchId, "weight", pendingWeightAdjust.newWeight);
                  updateBatch(pendingWeightAdjust.batchId, "currentWeight", Math.min(adjustedRemaining, pendingWeightAdjust.newWeight));
                  setPendingWeightAdjust(null);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
