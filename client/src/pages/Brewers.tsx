import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, GUEST_LIMITS } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Droplet } from "lucide-react";
import { BrewerDialog } from "@/components/equipment/BrewerDialog";
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
import type { Brewer } from "@/contexts/AppContext";

export default function Brewers() {
  const { brewers, deleteBrewer, isGuest, guestLimitReached } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBrewer, setEditingBrewer] = useState<Brewer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (brewer: Brewer) => {
    setEditingBrewer(brewer);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    if (guestLimitReached("brewers")) {
      toast({
        title: "Guest Limit Reached",
        description: `Guest users can only add ${GUEST_LIMITS.brewers} brewers. Sign up for unlimited access.`,
        variant: "destructive",
      });
      return;
    }
    setEditingBrewer(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBrewer(id);
      setDeleteId(null);
      toast({
        title: "Brewer deleted",
        description: "Brewer has been removed successfully",
      });
    } catch (error) {
      setDeleteId(null);
      toast({
        title: "Cannot delete",
        description: error instanceof Error ? error.message : "Failed to delete brewer",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Brewers</h1>
          </div>
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {brewers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Droplet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No brewers added yet</p>
              <Button onClick={handleAdd}>Add Your First Brewer</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {brewers.map((brewer) => (
              <Card key={brewer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {brewer.photo ? (
                      <img
                        src={brewer.photo}
                        alt={brewer.model}
                        className="w-20 h-20 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <Droplet className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{brewer.model}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Type: <span className="text-foreground capitalize">{brewer.type}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(brewer)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(brewer.id)}
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

        <BrewerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          brewer={editingBrewer}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Brewer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this brewer? This action cannot be undone.
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
