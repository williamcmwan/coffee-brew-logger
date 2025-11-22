import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, Pencil, Trash2, Bean, Star, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CoffeeBeanDialog } from "@/components/equipment/CoffeeBeanDialog";
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
import type { CoffeeBean } from "@/contexts/AppContext";

export default function CoffeeBeans() {
  const { coffeeBeans, deleteCoffeeBean, toggleCoffeeBeanFavorite } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBean, setEditingBean] = useState<CoffeeBean | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const handleEdit = (bean: CoffeeBean) => {
    setEditingBean(bean);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingBean(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteCoffeeBean(id);
    setDeleteId(null);
    toast({
      title: "Coffee bean deleted",
      description: "Coffee bean has been removed successfully",
    });
  };

  const filteredBeans = filter === "favorites" 
    ? coffeeBeans.filter(b => b.favorite) 
    : coffeeBeans;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Coffee Beans</h1>
          </div>
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {coffeeBeans.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Beans</SelectItem>
                <SelectItem value="favorites">Favorites Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {filteredBeans.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bean className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {filter === "favorites" ? "No favorite beans yet" : "No coffee beans added yet"}
              </p>
              <Button onClick={handleAdd}>Add Your First Coffee Bean</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredBeans.map((bean) => (
              <Card key={bean.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {bean.photo ? (
                      <img
                        src={bean.photo}
                        alt={bean.name}
                        className="w-24 h-24 rounded-lg object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                        <Bean className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg truncate">{bean.name}</h3>
                          <p className="text-sm text-muted-foreground">{bean.roaster}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => toggleCoffeeBeanFavorite(bean.id)}
                          >
                            <Star className={`h-4 w-4 ${bean.favorite ? "fill-golden text-golden" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(bean)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(bean.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 mt-2">
                        <p className="text-sm">
                          <span className="text-muted-foreground">{bean.country}</span>
                          {bean.region && (
                            <span className="text-muted-foreground"> • {bean.region}</span>
                          )}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {bean.roastLevel}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {bean.process}
                          </Badge>
                          {bean.batches.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {bean.batches.length} batch{bean.batches.length > 1 ? "es" : ""}
                            </Badge>
                          )}
                        </div>
                        {bean.tastingNotes && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                            {bean.tastingNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <CoffeeBeanDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          bean={editingBean}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Coffee Bean</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this coffee bean and all its batches? This action
                cannot be undone.
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
