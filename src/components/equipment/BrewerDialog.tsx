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
import type { Brewer } from "@/contexts/AppContext";

const brewerSchema = z.object({
  model: z.string().trim().min(1, "Model is required").max(100),
  photo: z.string().trim().url("Must be a valid URL").optional().or(z.literal("")),
  type: z.enum(["espresso", "pour-over"]),
});

type BrewerFormData = z.infer<typeof brewerSchema>;

interface BrewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brewer: Brewer | null;
}

export function BrewerDialog({ open, onOpenChange, brewer }: BrewerDialogProps) {
  const { addBrewer, updateBrewer } = useApp();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BrewerFormData>({
    resolver: zodResolver(brewerSchema),
    defaultValues: {
      model: "",
      photo: "",
      type: "pour-over",
    },
  });

  const type = watch("type");

  useEffect(() => {
    if (brewer) {
      setValue("model", brewer.model);
      setValue("photo", brewer.photo || "");
      setValue("type", brewer.type);
    } else {
      reset();
    }
  }, [brewer, setValue, reset]);

  const onSubmit = (data: BrewerFormData) => {
    if (brewer) {
      updateBrewer(brewer.id, data);
      toast({ title: "Brewer updated", description: "Brewer has been updated successfully" });
    } else {
      addBrewer(data as Omit<Brewer, "id">);
      toast({ title: "Brewer added", description: "Brewer has been added successfully" });
    }
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{brewer ? "Edit Brewer" : "Add Brewer"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Model *</Label>
            <Input id="model" {...register("model")} placeholder="e.g., V60, La Marzocco" />
            {errors.model && <p className="text-sm text-destructive">{errors.model.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="photo">Photo URL</Label>
            <Input id="photo" {...register("photo")} placeholder="https://example.com/image.jpg" />
            {errors.photo && <p className="text-sm text-destructive">{errors.photo.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select value={type} onValueChange={(value) => setValue("type", value as any)}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pour-over">Pour-over</SelectItem>
                <SelectItem value="espresso">Espresso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              {brewer ? "Update" : "Add"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
