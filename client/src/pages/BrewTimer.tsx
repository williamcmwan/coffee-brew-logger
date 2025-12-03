import { useLocation, useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import BrewTimerContent from "@/components/BrewTimerContent";

export default function BrewTimer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recipes } = useApp();
  
  // Handle both preview mode (from Recipes) and brew mode (from Brew workflow)
  const brewData = location.state?.brewData;
  const recipeId = location.state?.recipeId || brewData?.recipe?.id;
  const recipe = brewData?.recipe || recipes.find(r => r.id === recipeId);

  const handleBack = () => {
    navigate(-1);
  };

  const handleComplete = (recordedBrewTime?: string) => {
    if (brewData) {
      // Return to brew workflow with brew data and recorded brew time
      navigate('/brew', { state: { brewData: { ...brewData, brewTime: recordedBrewTime || brewData.brewTime }, fromTimer: true } });
    } else {
      // Start new brew with this recipe
      navigate('/brew', { state: { recipeId, brewTime: recordedBrewTime } });
    }
  };

  if (!recipe) {
    return (
      <div className="container mx-auto p-4 max-w-2xl">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">Recipe not found</p>
            <Button onClick={handleBack} className="mt-4 w-full">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Button onClick={handleBack} variant="ghost" className="mb-2">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <BrewTimerContent
        recipe={recipe}
        onComplete={handleComplete}
        completeButtonText="Log This Brew"
        showCloseButton={false}
        showBorder={true}
      />
    </div>
  );
}
