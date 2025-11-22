import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { GitCompare, Coffee, Star, Droplets, TrendingUp, ArrowLeft } from "lucide-react";

const BrewComparison = () => {
  const navigate = useNavigate();
  const { brews, coffeeBeans, grinders, brewers, recipes } = useApp();
  const [brew1Id, setBrew1Id] = useState<string>("");
  const [brew2Id, setBrew2Id] = useState<string>("");

  const brew1 = brews.find((b) => b.id === brew1Id);
  const brew2 = brews.find((b) => b.id === brew2Id);

  const getBrewDetails = (brew: typeof brew1) => {
    if (!brew) return null;
    
    const bean = coffeeBeans.find((b) => b.id === brew.coffeeBeanId);
    const grinder = grinders.find((g) => g.id === brew.grinderId);
    const brewer = brewers.find((b) => b.id === brew.brewerId);
    const recipe = recipes.find((r) => r.id === brew.recipeId);

    return { bean, grinder, brewer, recipe };
  };

  const brew1Details = getBrewDetails(brew1);
  const brew2Details = getBrewDetails(brew2);

  const ComparisonCard = ({ brew, details, title }: { brew: typeof brew1; details: typeof brew1Details; title: string }) => {
    if (!brew || !details) {
      return (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">{title}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
            Select a brew to compare
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="flex-1">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{format(new Date(brew.date), "MMM dd, yyyy")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {brew.photo && (
            <img src={brew.photo} alt="Brew" className="w-full h-48 object-cover rounded-lg" />
          )}

          <div className="space-y-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-2">
                <Coffee className="h-4 w-4" />
                Coffee Bean
              </h3>
              <p className="text-sm">{details.bean?.name}</p>
              <p className="text-xs text-muted-foreground">{details.bean?.roaster}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Grinder</p>
                <p className="font-medium">{details.grinder?.model || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Brewer</p>
                <p className="font-medium">{details.brewer?.model || "N/A"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Recipe</p>
                <p className="font-medium">{details.recipe?.name || "Custom"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grind Size</p>
                <p className="font-medium">{brew.grindSize}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Brew Parameters</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Dose</p>
                  <p className="font-medium">{brew.dose}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Water</p>
                  <p className="font-medium">{brew.water}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Yield</p>
                  <p className="font-medium">{brew.yield}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Temperature</p>
                  <p className="font-medium">{brew.temperature}°C</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brew Time</p>
                  <p className="font-medium">{brew.brewTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ratio</p>
                  <p className="font-medium">1:{(brew.water / brew.dose).toFixed(1)}</p>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-2">Results</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Rating</span>
                  </div>
                  <Badge variant="secondary">{brew.rating}/5</Badge>
                </div>
                
                {brew.tds && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Droplets className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">TDS</span>
                    </div>
                    <Badge variant="secondary">{brew.tds}%</Badge>
                  </div>
                )}
                
                {brew.extractionYield && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Extraction Yield</span>
                    </div>
                    <Badge variant="secondary">{brew.extractionYield}%</Badge>
                  </div>
                )}
              </div>
            </div>

            {brew.comment && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground">{brew.comment}</p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <GitCompare className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Compare Brews</h1>
            <p className="text-muted-foreground">Compare two brews side-by-side</p>
          </div>
        </div>

        {brews.length < 2 ? (
          <Card>
            <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
              You need at least 2 brews to use the comparison tool
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select First Brew</label>
                <Select value={brew1Id} onValueChange={setBrew1Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a brew..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brews.map((brew) => {
                      const bean = coffeeBeans.find((b) => b.id === brew.coffeeBeanId);
                      return (
                        <SelectItem key={brew.id} value={brew.id} disabled={brew.id === brew2Id}>
                          {bean?.name} - {format(new Date(brew.date), "MMM dd, yyyy")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Second Brew</label>
                <Select value={brew2Id} onValueChange={setBrew2Id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a brew..." />
                  </SelectTrigger>
                  <SelectContent>
                    {brews.map((brew) => {
                      const bean = coffeeBeans.find((b) => b.id === brew.coffeeBeanId);
                      return (
                        <SelectItem key={brew.id} value={brew.id} disabled={brew.id === brew1Id}>
                          {bean?.name} - {format(new Date(brew.date), "MMM dd, yyyy")}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <ComparisonCard brew={brew1} details={brew1Details} title="Brew #1" />
              <ComparisonCard brew={brew2} details={brew2Details} title="Brew #2" />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BrewComparison;
