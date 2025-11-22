import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Coffee, Calendar, Star, TrendingUp, Filter, SortAsc } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

export default function BrewHistory() {
  const navigate = useNavigate();
  const { brews, coffeeBeans, grinders, brewers, recipes } = useApp();
  
  const [filterBean, setFilterBean] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  // Helper functions to get entity names
  const getBeanName = (beanId: string) => {
    const bean = coffeeBeans.find(b => b.id === beanId);
    return bean ? `${bean.name} - ${bean.roaster}` : "Unknown";
  };

  const getGrinderName = (grinderId: string) => {
    const grinder = grinders.find(g => g.id === grinderId);
    return grinder ? grinder.model : "Unknown";
  };

  const getBrewerName = (brewerId: string) => {
    const brewer = brewers.find(b => b.id === brewerId);
    return brewer ? brewer.model : "Unknown";
  };

  const getRecipeName = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    return recipe ? recipe.name : "Unknown";
  };

  // Filter and sort brews
  const filteredAndSortedBrews = useMemo(() => {
    let filtered = [...brews];

    // Filter by coffee bean
    if (filterBean !== "all") {
      filtered = filtered.filter(brew => brew.coffeeBeanId === filterBean);
    }

    // Filter by rating
    if (filterRating !== "all") {
      const rating = parseInt(filterRating);
      filtered = filtered.filter(brew => brew.rating === rating);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case "date-asc":
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case "rating-desc":
          return (b.rating || 0) - (a.rating || 0);
        case "rating-asc":
          return (a.rating || 0) - (b.rating || 0);
        case "ey-desc":
          return (b.extractionYield || 0) - (a.extractionYield || 0);
        case "ey-asc":
          return (a.extractionYield || 0) - (b.extractionYield || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [brews, filterBean, filterRating, sortBy]);

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-golden text-golden" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-background p-4">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="border-espresso/20 mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-espresso">
              <Coffee className="h-6 w-6" />
              Brew History
            </CardTitle>
            <CardDescription>
              {filteredAndSortedBrews.length} brew{filteredAndSortedBrews.length !== 1 ? 's' : ''} recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Filters and Sort */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filter by Bean
                </label>
                <Select value={filterBean} onValueChange={setFilterBean}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Beans</SelectItem>
                    {coffeeBeans.map((bean) => (
                      <SelectItem key={bean.id} value={bean.id}>
                        {bean.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Filter by Rating
                </label>
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    <SelectItem value="5">5 Stars</SelectItem>
                    <SelectItem value="4">4 Stars</SelectItem>
                    <SelectItem value="3">3 Stars</SelectItem>
                    <SelectItem value="2">2 Stars</SelectItem>
                    <SelectItem value="1">1 Star</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <SortAsc className="h-4 w-4" />
                  Sort by
                </label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="rating-desc">Highest Rating</SelectItem>
                    <SelectItem value="rating-asc">Lowest Rating</SelectItem>
                    <SelectItem value="ey-desc">Highest EY</SelectItem>
                    <SelectItem value="ey-asc">Lowest EY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Brew List */}
            {filteredAndSortedBrews.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Coffee className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No brews found matching your filters.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAndSortedBrews.map((brew) => (
                  <Collapsible key={brew.id}>
                    <Card className="overflow-hidden hover:shadow-md transition-shadow">
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                          <div className="flex items-start justify-between">
                            <div className="text-left flex-1">
                              <CardTitle className="text-lg mb-2">
                                {getBeanName(brew.coffeeBeanId)}
                              </CardTitle>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(brew.date).toLocaleDateString()}
                                </span>
                                {renderStars(brew.rating)}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              {brew.extractionYield && (
                                <Badge variant="secondary" className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  EY: {brew.extractionYield.toFixed(2)}%
                                </Badge>
                              )}
                              {brew.tds && (
                                <Badge variant="outline">
                                  TDS: {brew.tds.toFixed(2)}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0">
                          <Separator className="mb-4" />
                          
                          {/* Equipment Section */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-semibold mb-2 text-sm text-espresso">Equipment</h4>
                              <div className="space-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Grinder:</span>{" "}
                                  <span className="font-medium">{getGrinderName(brew.grinderId)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Brewer:</span>{" "}
                                  <span className="font-medium">{getBrewerName(brew.brewerId)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Recipe:</span>{" "}
                                  <span className="font-medium">{getRecipeName(brew.recipeId)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Parameters Section */}
                            <div>
                              <h4 className="font-semibold mb-2 text-sm text-espresso">Parameters</h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Dose:</span>{" "}
                                  <span className="font-medium">{brew.dose}g</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Grind:</span>{" "}
                                  <span className="font-medium">{brew.grindSize}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Water:</span>{" "}
                                  <span className="font-medium">{brew.water}g</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Yield:</span>{" "}
                                  <span className="font-medium">{brew.yield}g</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Temp:</span>{" "}
                                  <span className="font-medium">{brew.temperature}°C</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Time:</span>{" "}
                                  <span className="font-medium">{brew.brewTime}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Comment Section */}
                          {brew.comment && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2 text-sm text-espresso">Notes</h4>
                              <p className="text-sm text-muted-foreground bg-cream/50 p-3 rounded-md">
                                {brew.comment}
                              </p>
                            </div>
                          )}

                          {/* Photo Section */}
                          {brew.photo && (
                            <div className="mt-4">
                              <h4 className="font-semibold mb-2 text-sm text-espresso">Photo</h4>
                              <img
                                src={brew.photo}
                                alt="Brew"
                                className="w-full max-w-md rounded-lg border border-espresso/20"
                              />
                            </div>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
