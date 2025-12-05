import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp, GUEST_LIMITS } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, BookOpen, Timer, Star, Filter, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecipeDialog } from "@/components/equipment/RecipeDialog";
import { ShareButton } from "@/components/ShareButton";
import { generateRecipeShareText } from "@/lib/shareUtils";
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
import type { Recipe } from "@/contexts/AppContext";

export default function Recipes() {
  const { recipes, grinders, brewers, deleteRecipe, toggleRecipeFavorite, isGuest, guestLimitReached } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const getGrinderName = (id: string) => grinders.find((g) => g.id === id)?.model || "Unknown";
  const getBrewerName = (id: string) => brewers.find((b) => b.id === id)?.model || "Unknown";

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsCloning(false);
    setDialogOpen(true);
  };

  const handleClone = (recipe: Recipe) => {
    if (guestLimitReached("recipes")) {
      toast({
        title: "Guest Limit Reached",
        description: `Guest users can only add ${GUEST_LIMITS.recipes} recipes. Sign up for unlimited access.`,
        variant: "destructive",
      });
      return;
    }
    setEditingRecipe(recipe);
    setIsCloning(true);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    if (guestLimitReached("recipes")) {
      toast({
        title: "Guest Limit Reached",
        description: `Guest users can only add ${GUEST_LIMITS.recipes} recipes. Sign up for unlimited access.`,
        variant: "destructive",
      });
      return;
    }
    setEditingRecipe(null);
    setIsCloning(false);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecipe(id);
      setDeleteId(null);
      toast({
        title: "Recipe deleted",
        description: "Recipe has been removed successfully",
      });
    } catch (error) {
      setDeleteId(null);
      toast({
        title: "Cannot delete",
        description: error instanceof Error ? error.message : "Failed to delete recipe",
        variant: "destructive",
      });
    }
  };

  const filteredRecipes = filter === "favorites" 
    ? recipes.filter(r => r.favorite) 
    : recipes;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Recipes</h1>
          </div>
          <Button onClick={handleAdd} size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {recipes.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipes</SelectItem>
                <SelectItem value="favorites">Favorites Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {filteredRecipes.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                {filter === "favorites" ? "No favorite recipes yet" : "No recipes added yet"}
              </p>
              <Button onClick={handleAdd}>Add Your First Recipe</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRecipes.map((recipe) => (
              <Card key={recipe.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {recipe.photo ? (
                      <img
                        src={recipe.photo}
                        alt={recipe.name}
                        className="w-12 h-12 rounded-lg object-cover bg-muted flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold text-lg">{recipe.name}</h3>
                        <div className="flex -mr-2 flex-shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleRecipeFavorite(recipe.id)}
                          >
                            <Star className={`h-4 w-4 ${recipe.favorite ? "fill-golden text-golden" : ""}`} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClone(recipe)} title="Clone recipe">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(recipe)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setDeleteId(recipe.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1 mt-1">
                        <p className="text-sm">{getGrinderName(recipe.grinderId)}</p>
                        <p className="text-sm">{getBrewerName(recipe.brewerId)}</p>
                        <p className="text-sm">{recipe.dose}g : {recipe.water}g ({recipe.ratio})</p>
                        <p className="text-sm">{recipe.temperature}°C • {recipe.brewTime}</p>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          onClick={() => navigate('/brew-timer', { state: { recipeId: recipe.id } })}
                          size="sm"
                          variant="outline"
                        >
                          <Timer className="h-4 w-4 mr-2" />
                          Preview Timer
                        </Button>
                        <ShareButton
                          title={`Coffee Recipe: ${recipe.name}`}
                          text={generateRecipeShareText(
                            recipe,
                            getGrinderName(recipe.grinderId),
                            getBrewerName(recipe.brewerId)
                          )}
                          size="icon"
                          variant="outline"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <RecipeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          recipe={editingRecipe}
          isCloning={isCloning}
        />

        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Recipe</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this recipe? This action cannot be undone.
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
