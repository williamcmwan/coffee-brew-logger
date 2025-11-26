import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, Coffee, Droplets, Thermometer, Clock, Scale, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ImageUpload from "@/components/ImageUpload";
import BrewTimerContent from "@/components/BrewTimerContent";

export default function Brew() {
  const navigate = useNavigate();
  const location = useLocation();
  const { coffeeBeans, grinders, brewers, recipes, addBrew, updateBrew, updateCoffeeBean, brewTemplates, brews } = useApp();
  
  const fromTimer = location.state?.fromTimer;
  const editBrew = location.state?.editBrew;
  const initialBrewData = editBrew || location.state?.brewData || location.state;
  const isEditing = !!editBrew;
  
  // Get last brew for defaults
  const lastBrew = brews.length > 0 ? brews[brews.length - 1] : null;
  
  const [step, setStep] = useState(fromTimer ? 3 : (location.state?.step || 1));
  const [selectedBeanId, setSelectedBeanId] = useState(initialBrewData?.coffeeBeanId || lastBrew?.coffeeBeanId || "");
  const [selectedBatchId, setSelectedBatchId] = useState(initialBrewData?.batchId || lastBrew?.batchId || "");
  const [selectedGrinderId, setSelectedGrinderId] = useState(initialBrewData?.grinderId || lastBrew?.grinderId || "");
  const [selectedBrewerId, setSelectedBrewerId] = useState(initialBrewData?.brewerId || lastBrew?.brewerId || "");
  const [selectedRecipeId, setSelectedRecipeId] = useState(initialBrewData?.recipeId || lastBrew?.recipeId || "");
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    editBrew?.templateNotes?.templateId || lastBrew?.templateNotes?.templateId || ""
  );
  
  // Brew parameters
  const [dose, setDose] = useState(initialBrewData?.dose?.toString() || "");
  const [grindSize, setGrindSize] = useState(initialBrewData?.grindSize?.toString() || "");
  const [water, setWater] = useState(initialBrewData?.water?.toString() || "");
  const [yieldAmount, setYieldAmount] = useState(initialBrewData?.yield?.toString() || "");
  const [temperature, setTemperature] = useState(initialBrewData?.temperature?.toString() || "");
  const [brewTime, setBrewTime] = useState(initialBrewData?.brewTime || "");
  
  // Post-brew data
  const [tds, setTds] = useState(editBrew?.tds?.toString() || "");
  const [rating, setRating] = useState(editBrew?.rating || 0);
  const [comment, setComment] = useState(editBrew?.comment || "");
  const [photo, setPhoto] = useState(editBrew?.photo || "");
  const [templateNotes, setTemplateNotes] = useState<Record<string, any>>(editBrew?.templateNotes?.fields || {});
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);

  const selectedBean = coffeeBeans.find(b => b.id === selectedBeanId);
  const selectedBatch = selectedBean?.batches.find(b => b.id === selectedBatchId);
  const selectedGrinder = grinders.find(g => g.id === selectedGrinderId);
  const selectedBrewer = brewers.find(b => b.id === selectedBrewerId);
  const selectedRecipe = recipes.find(r => r.id === selectedRecipeId);
  const selectedTemplate = brewTemplates.find(t => t.id === selectedTemplateId);
  
  const filteredRecipes = recipes.filter(
    r => r.grinderId === selectedGrinderId && r.brewerId === selectedBrewerId
  );

  // Pre-fill parameters when recipe is selected
  useEffect(() => {
    if (selectedRecipe && !initialBrewData) {
      setDose(selectedRecipe.dose.toString());
      setGrindSize(selectedRecipe.grindSize.toString());
      setWater(selectedRecipe.water.toString());
      setYieldAmount(selectedRecipe.yield.toString());
      setTemperature(selectedRecipe.temperature.toString());
      setBrewTime(selectedRecipe.brewTime);
    }
  }, [selectedRecipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const calculateEY = () => {
    if (!tds || !yieldAmount || !dose) return null;
    const tdsNum = parseFloat(tds);
    const yieldNum = parseFloat(yieldAmount);
    const doseNum = parseFloat(dose);
    // Correct EY formula: (TDS × Brew Weight / Dose) × 100
    return ((tdsNum * yieldNum / doseNum)).toFixed(2);
  };

  const handleNext = () => {
    if (step === 1) {
      if (!selectedBeanId || !selectedBatchId) {
        toast({ title: "Please select a coffee bean and batch", variant: "destructive" });
        return;
      }
      if (!selectedGrinderId) {
        toast({ title: "Please select a grinder", variant: "destructive" });
        return;
      }
      if (!selectedBrewerId) {
        toast({ title: "Please select a brewer", variant: "destructive" });
        return;
      }
      if (!selectedRecipeId) {
        toast({ title: "Please select a recipe", variant: "destructive" });
        return;
      }
    }
    if (step === 2) {
      if (!dose || !grindSize || !water || !yieldAmount || !temperature || !brewTime) {
        toast({ title: "Please fill in all brew parameters", variant: "destructive" });
        return;
      }
      // Open timer dialog
      setTimerDialogOpen(true);
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    if (isEditing) {
      navigate("/history");
    } else if (step > 1) {
      setStep(step - 1);
    } else {
      navigate("/");
    }
  };

  const handleSaveBrew = async () => {
    if (rating === 0) {
      toast({ title: "Please add a rating", variant: "destructive" });
      return;
    }

    // Validate required template fields
    if (selectedTemplate) {
      const requiredFields = selectedTemplate.fields.filter(f => f.required);
      const missingFields = requiredFields.filter(f => !templateNotes[f.id]);
      if (missingFields.length > 0) {
        toast({
          title: "Required fields missing",
          description: `Please fill in: ${missingFields.map(f => f.label).join(", ")}`,
          variant: "destructive"
        });
        return;
      }
    }

    const extractionYield = calculateEY();
    
    const brewData = {
      coffeeBeanId: selectedBeanId,
      batchId: selectedBatchId,
      grinderId: selectedGrinderId,
      brewerId: selectedBrewerId,
      recipeId: selectedRecipeId,
      dose: parseFloat(dose),
      grindSize: parseFloat(grindSize),
      water: parseFloat(water),
      yield: parseFloat(yieldAmount),
      temperature: parseFloat(temperature),
      brewTime,
      tds: tds ? parseFloat(tds) : undefined,
      extractionYield: extractionYield ? parseFloat(extractionYield) : undefined,
      rating,
      comment,
      photo,
      ...(selectedTemplateId && {
        templateNotes: {
          templateId: selectedTemplateId,
          fields: templateNotes,
        },
      }),
    };

    try {
      if (isEditing && editBrew?.id) {
        // Calculate dose difference for editing
        const oldDose = editBrew.dose || 0;
        const newDose = parseFloat(dose);
        const doseDiff = newDose - oldDose;
        
        await updateBrew(editBrew.id, brewData);
        
        // Adjust batch weight if dose changed and same batch
        if (doseDiff !== 0 && selectedBeanId && selectedBatchId) {
          const bean = coffeeBeans.find(b => b.id === selectedBeanId);
          if (bean) {
            const updatedBatches = bean.batches.map(batch => 
              batch.id === selectedBatchId 
                ? { ...batch, currentWeight: Math.max(0, batch.currentWeight - doseDiff) }
                : batch
            );
            await updateCoffeeBean(selectedBeanId, { batches: updatedBatches });
          }
        }
        
        toast({ title: "Brew updated successfully!" });
        navigate("/history");
      } else {
        await addBrew({
          date: new Date().toISOString(),
          ...brewData,
        });
        
        // Deduct dose from batch currentWeight
        if (selectedBeanId && selectedBatchId) {
          const bean = coffeeBeans.find(b => b.id === selectedBeanId);
          if (bean) {
            const updatedBatches = bean.batches.map(batch => 
              batch.id === selectedBatchId 
                ? { ...batch, currentWeight: Math.max(0, batch.currentWeight - parseFloat(dose)) }
                : batch
            );
            await updateCoffeeBean(selectedBeanId, { batches: updatedBatches });
          }
        }
        
        toast({ title: "Brew logged successfully!" });
        navigate("/");
      }
    } catch (error) {
      toast({ 
        title: "Failed to save brew", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    }
  };

  // When recipe is selected, pre-fill brew parameters
  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      setDose(recipe.dose.toString());
      setGrindSize(recipe.grindSize.toString());
      setWater(recipe.water.toString());
      setYieldAmount(recipe.yield.toString());
      setTemperature(recipe.temperature.toString());
      setBrewTime(recipe.brewTime);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-background p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-espresso/20">
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2 text-espresso">
              <ArrowLeft 
                className="h-6 w-6 cursor-pointer hover:opacity-70 transition-opacity" 
                onClick={handleBack}
              />
              <Coffee className="h-6 w-6" />
              {isEditing ? "Edit Brew" : "New Brew"}
            </CardTitle>
            {step === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTimerDialogOpen(true)}
                className="absolute top-4 right-4 flex flex-col items-center gap-1 h-auto py-2 px-3"
              >
                <Clock className="h-6 w-6" />
                <span className="text-xs">Brew Timer</span>
              </Button>
            )}
            <CardDescription>Step {step} of 3</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Select All Equipment & Recipe */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <Label htmlFor="bean">Coffee Bean</Label>
                  <Select value={selectedBeanId} onValueChange={(value) => {
                    setSelectedBeanId(value);
                    setSelectedBatchId("");
                  }}>
                    <SelectTrigger id="bean">
                      <SelectValue placeholder="Select coffee bean" />
                    </SelectTrigger>
                    <SelectContent>
                      {coffeeBeans.map((bean) => (
                        <SelectItem key={bean.id} value={bean.id}>
                          {bean.name} - {bean.roaster}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedBean && selectedBean.batches.length > 0 && (
                  <div>
                    <Label htmlFor="batch">Batch</Label>
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger id="batch">
                        <SelectValue placeholder="Select batch" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedBean.batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            Roasted: {new Date(batch.roastDate).toLocaleDateString()} - {batch.weight}g
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedBean && selectedBean.batches.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No batches available. Please add a batch to this coffee bean first.
                  </p>
                )}

                <div>
                  <Label htmlFor="grinder">Grinder</Label>
                  <Select value={selectedGrinderId} onValueChange={setSelectedGrinderId}>
                    <SelectTrigger id="grinder">
                      <SelectValue placeholder="Select grinder" />
                    </SelectTrigger>
                    <SelectContent>
                      {grinders.map((grinder) => (
                        <SelectItem key={grinder.id} value={grinder.id}>
                          {grinder.model} ({grinder.burrType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="brewer">Brewer</Label>
                  <Select value={selectedBrewerId} onValueChange={setSelectedBrewerId}>
                    <SelectTrigger id="brewer">
                      <SelectValue placeholder="Select brewer" />
                    </SelectTrigger>
                    <SelectContent>
                      {brewers.map((brewer) => (
                        <SelectItem key={brewer.id} value={brewer.id}>
                          {brewer.model} ({brewer.type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recipe">Recipe</Label>
                  <Select value={selectedRecipeId} onValueChange={handleRecipeSelect}>
                    <SelectTrigger id="recipe">
                      <SelectValue placeholder="Select recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRecipes.map((recipe) => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name} (Ratio: {recipe.ratio})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredRecipes.length === 0 && selectedGrinderId && selectedBrewerId && (
                  <p className="text-sm text-muted-foreground">
                    No recipes available for this grinder and brewer combination. Please add a recipe in settings first.
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Adjust Parameters */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-muted-foreground">
                  Adjust parameters for this brew
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dose">
                      <span className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        Dose (g)
                      </span>
                    </Label>
                    <Input
                      id="dose"
                      type="number"
                      step="0.1"
                      value={dose}
                      onChange={(e) => setDose(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="grindSize">
                      <span className="block">Grind Size</span>
                    </Label>
                    <Input
                      id="grindSize"
                      type="number"
                      step="0.1"
                      value={grindSize}
                      onChange={(e) => setGrindSize(e.target.value)}
                      placeholder="e.g., 4.5"
                    />
                  </div>

                  <div>
                    <Label htmlFor="water">
                      <span className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        Water (g)
                      </span>
                    </Label>
                    <Input
                      id="water"
                      type="number"
                      step="0.1"
                      value={water}
                      onChange={(e) => setWater(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="yield">
                      <span className="block">Yield (g)</span>
                    </Label>
                    <Input
                      id="yield"
                      type="number"
                      step="0.1"
                      value={yieldAmount}
                      onChange={(e) => setYieldAmount(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="temperature">
                      <span className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        Temp (°C)
                      </span>
                    </Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="brewTime">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Brew Time
                      </span>
                    </Label>
                    <Input
                      id="brewTime"
                      value={brewTime}
                      onChange={(e) => setBrewTime(e.target.value)}
                      placeholder="e.g., 2:30"
                    />
                  </div>
                </div>

                {selectedRecipe?.processSteps && selectedRecipe.processSteps.length > 0 && (
                  <div className="space-y-2">
                    <Label>Timeline</Label>
                    <div className="relative">
                      {(() => {
                        const formatTime = (seconds: number) => {
                          const mins = Math.floor(seconds / 60);
                          const secs = seconds % 60;
                          return `${mins}:${secs.toString().padStart(2, '0')}`;
                        };
                        
                        // Build full timeline: Preparation + process steps + Drawdown + Complete
                        const timelineSteps: { title: string; description: string; startTime: number }[] = [];
                        
                        // Preparation step at 0:00
                        timelineSteps.push({
                          title: "Preparation",
                          description: `Heat water to ${selectedRecipe.temperature}°C. Prepare ${selectedRecipe.dose}g of coffee.`,
                          startTime: 0
                        });
                        
                        // Process steps
                        let previousDuration = 0;
                        selectedRecipe.processSteps.forEach((processStep) => {
                          const hasWater = processStep.waterAmount && processStep.waterAmount > 0;
                          timelineSteps.push({
                            title: processStep.description,
                            description: hasWater ? `Pour ${processStep.waterAmount}g of water.` : processStep.description,
                            startTime: previousDuration
                          });
                          previousDuration = processStep.duration;
                        });
                        
                        // Drawdown step
                        const parseBrewTime = (time: string): number => {
                          if (time.includes(':')) {
                            const [mins, secs] = time.split(':').map(Number);
                            return (mins || 0) * 60 + (secs || 0);
                          }
                          return Number(time) || 180;
                        };
                        const brewTimeSeconds = parseBrewTime(selectedRecipe.brewTime);
                        if (brewTimeSeconds > previousDuration) {
                          timelineSteps.push({
                            title: "Drawdown",
                            description: `Wait for complete drawdown. Target yield: ${selectedRecipe.yield}ml.`,
                            startTime: previousDuration
                          });
                        }
                        
                        // Complete step
                        timelineSteps.push({
                          title: "Complete",
                          description: "Brewing complete! Enjoy your coffee.",
                          startTime: brewTimeSeconds
                        });
                        
                        return timelineSteps.map((step, index) => {
                          const isLast = index === timelineSteps.length - 1;
                          
                          return (
                            <div key={index} className="flex gap-2">
                              {/* Timeline column */}
                              <div className="flex flex-col items-center">
                                {/* Time marker */}
                                <div className="text-xs font-mono w-10 text-right text-muted-foreground">
                                  {formatTime(step.startTime)}
                                </div>
                                {/* Dot */}
                                <div className="w-2.5 h-2.5 rounded-full mt-0.5 bg-muted-foreground/30" />
                                {/* Line */}
                                {!isLast && (
                                  <div className="w-0.5 flex-1 min-h-5 bg-muted-foreground/20" />
                                )}
                              </div>
                              {/* Content */}
                              <div className="flex-1 pb-2">
                                <div className="font-medium text-sm leading-tight">{step.title}</div>
                                <div className="text-xs text-muted-foreground leading-tight">
                                  {step.description}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                
                {selectedRecipe?.process && !selectedRecipe.processSteps && (
                  <div className="space-y-2">
                    <Label>Process</Label>
                    <div className="p-3 rounded-md bg-muted/50 text-sm">
                      {selectedRecipe.process}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Post-Brew Analysis */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-sm text-muted-foreground mb-4">
                  Record your brew results
                </p>

                <div>
                  <Label>Rating</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? "fill-golden text-golden"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tds">TDS (%) - Optional</Label>
                    <Input
                      id="tds"
                      type="number"
                      step="0.01"
                      value={tds}
                      onChange={(e) => setTds(e.target.value)}
                      placeholder="e.g., 1.35"
                    />
                  </div>

                  <div>
                    <Label>Extraction Yield</Label>
                    <div className="h-10 flex items-center px-3 rounded-md border border-input bg-muted">
                      {calculateEY() ? `${calculateEY()}%` : "-"}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="comment">Tasting Notes & Comments</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="How did it taste? Any observations?"
                    rows={4}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Brew Notes Template (Optional)</Label>
                  <Select 
                    value={selectedTemplateId || "none"} 
                    onValueChange={(value) => setSelectedTemplateId(value === "none" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No template</SelectItem>
                      {brewTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {brewTemplates.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No templates available.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => navigate("/brew-templates")}
                      >
                        Create one
                      </button>
                    </p>
                  )}
                </div>

                {selectedTemplate && (
                  <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                    <h3 className="font-semibold text-sm">Custom Observations</h3>
                    {selectedTemplate.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label>
                          {field.label}
                          {field.required && <span className="text-destructive ml-1">*</span>}
                        </Label>
                        {field.type === "text" && (
                          <Input
                            value={templateNotes[field.id] || ""}
                            onChange={(e) =>
                              setTemplateNotes({ ...templateNotes, [field.id]: e.target.value })
                            }
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        )}
                        {field.type === "number" && (
                          <Input
                            type="number"
                            value={templateNotes[field.id] || ""}
                            onChange={(e) =>
                              setTemplateNotes({ ...templateNotes, [field.id]: e.target.value })
                            }
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                          />
                        )}
                        {field.type === "rating" && (
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <Button
                                key={value}
                                type="button"
                                variant={templateNotes[field.id] === value ? "default" : "outline"}
                                size="sm"
                                onClick={() =>
                                  setTemplateNotes({ ...templateNotes, [field.id]: value })
                                }
                              >
                                {value}
                              </Button>
                            ))}
                          </div>
                        )}
                        {field.type === "select" && field.options && (
                          <Select
                            value={templateNotes[field.id] || ""}
                            onValueChange={(value) =>
                              setTemplateNotes({ ...templateNotes, [field.id]: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <ImageUpload
                  value={photo}
                  onChange={setPhoto}
                  label="Brew Photo (optional)"
                />
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-2 pt-2">
              {step > 1 && step < 3 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1"
                >
                  Previous
                </Button>
              )}
              {step < 3 && (
                <Button onClick={step === 2 ? () => setStep(3) : handleNext} className="flex-1">
                  Next
                </Button>
              )}
              {step === 3 && (
                <Button onClick={handleSaveBrew} className="flex-1">
                  {isEditing ? "Update Brew" : "Save Brew"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Brew Timer Dialog */}
        <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
          <DialogContent className="max-w-2xl h-[100vh] max-h-[100vh] overflow-y-auto p-0">
            <BrewTimerContent 
              recipe={selectedRecipe}
              onClose={() => setTimerDialogOpen(false)}
              onComplete={() => {
                setTimerDialogOpen(false);
                setStep(3);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
