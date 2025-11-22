import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Coffee } from "lucide-react";
import { GrinderDialog } from "@/components/equipment/GrinderDialog";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Grinder } from "@/contexts/AppContext";

export default function Grinders() {
  const { grinders, deleteGrinder } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGrinder, setEditingGrinder] = useState<Grinder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (grinder: Grinder) => {
    setEditingGrinder(grinder);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingGrinder(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteGrinder(id);
    setDeleteId(null);
    toast({
      title: "Grinder deleted",
      description: "Grinder has been removed successfully",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Grinders</h1>
          </div>
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {grinders.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Coffee className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No grinders added yet</p>
              <Button onClick={handleAdd}>Add Your First Grinder</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {grinders.map((grinder) => (
              <Card key={grinder.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {grinder.photo ? (
                      <img
                        src={grinder.photo}
                        alt={grinder.model}
                        className="w-20 h-20 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Coffee className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{grinder.model}</h3>
                      <div className="space-y-1 mt-1">
                        <p className="text-sm text-muted-foreground">
                          Burr: <span className="text-foreground capitalize">{grinder.burrType}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Ideal for: <span className="text-foreground capitalize">{grinder.idealFor}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(grinder)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(grinder.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <GrinderDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          grinder={editingGrinder}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Grinder</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this grinder? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteId && handleDelete(deleteId)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
