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
import type { Grinder } from "@/contexts/AppContext";
import ImageUpload from "@/components/ImageUpload";

const grinderSchema = z.object({
  model: z.string().trim().min(1, "Model is required").max(100),
  photo: z.string().optional().or(z.literal("")),
  burrType: z.enum(["conical", "flat"]),
  idealFor: z.enum(["pour-over", "espresso", "both"]),
});

type GrinderFormData = z.infer<typeof grinderSchema>;

interface GrinderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grinder: Grinder | null;
}

export function GrinderDialog({ open, onOpenChange, grinder }: GrinderDialogProps) {
  const { addGrinder, updateGrinder } = useApp();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GrinderFormData>({
    resolver: zodResolver(grinderSchema),
    defaultValues: {
      model: "",
      photo: "",
      burrType: "conical",
      idealFor: "both",
    },
  });

  const burrType = watch("burrType");
  const idealFor = watch("idealFor");
  const photo = watch("photo");

  useEffect(() => {
    if (grinder) {
      setValue("model", grinder.model);
      setValue("photo", grinder.photo || "");
      setValue("burrType", grinder.burrType);
      setValue("idealFor", grinder.idealFor);
    } else {
      reset();
    }
  }, [grinder, setValue, reset]);

  const onSubmit = (data: GrinderFormData) => {
    if (grinder) {
      updateGrinder(grinder.id, data);
      toast({ title: "Grinder updated", description: "Grinder has been updated successfully" });
    } else {
      addGrinder(data as Omit<Grinder, "id">);
      toast({ title: "Grinder added", description: "Grinder has been added successfully" });
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{grinder ? "Edit Grinder" : "Add Grinder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input id="model" {...register("model")} placeholder="e.g., Comandante C40" />
            {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
          </div>

          <div className="space-y-2">
            <ImageUpload
              value={photo || ""}
              onChange={(dataUrl) => setValue("photo", dataUrl)}
              label="Photo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="burrType">Burr Type *</Label>
            <Select value={burrType} onValueChange={(value) => setValue("burrType", value as any)}>
              <SelectTrigger id="burrType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conical">Conical</SelectItem>
                <SelectItem value="flat">Flat</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="idealFor">Ideal For *</Label>
            <Select value={idealFor} onValueChange={(value) => setValue("idealFor", value as any)}>
              <SelectTrigger id="idealFor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pour-over">Pour-over</SelectItem>
                <SelectItem value="espresso">Espresso</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {grinder ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
