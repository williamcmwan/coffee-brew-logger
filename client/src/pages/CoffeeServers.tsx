import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, GUEST_LIMITS } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, GlassWater } from "lucide-react";
import { CoffeeServerDialog } from "@/components/equipment/CoffeeServerDialog";
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
import type { CoffeeServer } from "@/contexts/AppContext";

export default function CoffeeServers() {
  const { coffeeServers, deleteCoffeeServer, isGuest, guestLimitReached } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<CoffeeServer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleEdit = (server: CoffeeServer) => {
    setEditingServer(server);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    if (guestLimitReached("servers")) {
      toast({
        title: "Guest Limit Reached",
        description: `Guest users can only add ${GUEST_LIMITS.servers} coffee servers. Sign up for unlimited access.`,
        variant: "destructive",
      });
      return;
    }
    setEditingServer(null);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCoffeeServer(id);
      setDeleteId(null);
      toast({
        title: "Coffee server deleted",
        description: "Coffee server has been removed successfully",
      });
    } catch (error) {
      setDeleteId(null);
      toast({
        title: "Cannot delete",
        description: error instanceof Error ? error.message : "Failed to delete coffee server",
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
            <h1 className="text-2xl font-bold">Coffee Servers</h1>
          </div>
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {coffeeServers.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <GlassWater className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No coffee servers added yet</p>
              <Button onClick={handleAdd}>Add Your First Coffee Server</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {coffeeServers.map((server) => (
              <Card key={server.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {server.photo ? (
                      <img
                        src={server.photo}
                        alt={server.model}
                        className="w-20 h-20 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                        <GlassWater className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{server.model}</h3>
                      <div className="space-y-1 mt-1">
                        {server.maxVolume && (
                          <p className="text-sm text-muted-foreground">
                            Max Volume: <span className="text-foreground">{server.maxVolume}ml</span>
                          </p>
                        )}
                        {server.emptyWeight && (
                          <p className="text-sm text-muted-foreground">
                            Empty Weight: <span className="text-foreground">{server.emptyWeight}g</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(server)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(server.id)}
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

        <CoffeeServerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          server={editingServer}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Coffee Server</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this coffee server? This action cannot be undone.
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
