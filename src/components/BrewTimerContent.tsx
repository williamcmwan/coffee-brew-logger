import { useState, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw, Coffee, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TimerStep {
  title: string;
  duration: number; // in seconds
  description: string;
}

interface BrewTimerContentProps {
  recipe: any;
  onClose: () => void;
  onComplete: () => void;
}

export default function BrewTimerContent({ recipe, onClose, onComplete }: BrewTimerContentProps) {
  const { grinders, brewers } = useApp();
  
  const [steps, setSteps] = useState<TimerStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // Parse recipe process into timed steps
  useEffect(() => {
    if (!recipe) return;
    
    const parsedSteps: TimerStep[] = [];
    
    // Helper to parse brew time (mm:ss or seconds)
    const parseBrewTime = (time: string): number => {
      if (time.includes(':')) {
        const [mins, secs] = time.split(':').map(Number);
        return (mins || 0) * 60 + (secs || 0);
      }
      return Number(time) || 180;
    };
    
    // Helper to format seconds to mm:ss
    const formatElapsed = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // Add initial preparation step (0 seconds - starts immediately)
    parsedSteps.push({
      title: "Preparation",
      duration: 0,
      description: `Heat water to ${recipe.temperature}°C. Prepare ${recipe.dose}g of coffee ground at setting ${recipe.grindSize}.`
    });
    
    // Use structured process steps if available (elapsed times)
    if (recipe.processSteps && recipe.processSteps.length > 0) {
      let previousElapsed = 0;
      recipe.processSteps.forEach((step, index) => {
        const stepDuration = step.duration - previousElapsed;
        parsedSteps.push({
          title: step.description || `Step ${index + 1}`,
          duration: stepDuration,
          description: `Pour ${step.waterAmount}g of water at ${formatElapsed(step.duration)}.`
        });
        previousElapsed = step.duration;
      });
      
      // Add drawdown step using brew time
      const brewTimeSeconds = parseBrewTime(recipe.brewTime);
      const drawdownDuration = brewTimeSeconds - previousElapsed;
      if (drawdownDuration > 0) {
        parsedSteps.push({
          title: "Drawdown",
          duration: drawdownDuration,
          description: `Wait for complete drawdown. Target yield: ${recipe.yield}ml.`
        });
      }
    } else {
      // Fallback to old process parsing or default steps
      const brewTimeSeconds = parseBrewTime(recipe.brewTime);
      const water = Number(recipe.water) || 0;
      
      if (recipe.process) {
        const lines = recipe.process.split('\n').filter(line => line.trim());
        lines.forEach((line, index) => {
          parsedSteps.push({
            title: `Step ${index + 1}`,
            duration: Math.floor(brewTimeSeconds / lines.length),
            description: line.trim()
          });
        });
      } else {
        // Default brewing steps based on brew time
        const stepDuration = Math.floor(brewTimeSeconds / 3);
        parsedSteps.push({
          title: "Bloom",
          duration: stepDuration,
          description: `Pour ${Math.floor(water * 0.3)}ml of water and let bloom.`
        });
        parsedSteps.push({
          title: "Main Pour",
          duration: stepDuration,
          description: `Pour remaining water in circular motions to reach ${recipe.water}ml total.`
        });
        parsedSteps.push({
          title: "Drawdown",
          duration: stepDuration,
          description: `Wait for complete drawdown. Target yield: ${recipe.yield}ml.`
        });
      }
    }
    
    // Add final step
    parsedSteps.push({
      title: "Complete",
      duration: 0,
      description: "Brewing complete! Enjoy your coffee."
    });
    
    setSteps(parsedSteps);
    setTimeRemaining(parsedSteps[0]?.duration || 0);
  }, [recipe]);

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, []);

  // Timer countdown logic
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Step completed
          playNotificationSound();
          
          if (currentStepIndex < steps.length - 1) {
            const nextIndex = currentStepIndex + 1;
            const nextStep = steps[nextIndex];
            
            toast({
              title: nextStep.title,
              description: nextStep.description,
              duration: 5000,
            });
            
            setCurrentStepIndex(nextIndex);
            
            if (nextStep.duration === 0) {
              setIsRunning(false);
              setIsComplete(true);
            }
            
            return nextStep.duration;
          } else {
            setIsRunning(false);
            setIsComplete(true);
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, currentStepIndex, steps, playNotificationSound]);

  const handleStart = () => {
    // Skip preparation step if at index 0
    if (currentStepIndex === 0 && steps.length > 1) {
      setCurrentStepIndex(1);
      setTimeRemaining(steps[1].duration);
    }
    setIsRunning(true);
    playNotificationSound();
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStepIndex(0);
    setTimeRemaining(steps[0]?.duration || 0);
    setIsComplete(false);
  };

  if (!recipe) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Recipe not found</p>
        </CardContent>
      </Card>
    );
  }

  const grinder = grinders.find(g => g.id === recipe.grinderId);
  const brewer = brewers.find(b => b.id === recipe.brewerId);
  const currentStep = steps[currentStepIndex];
  const totalTime = steps.reduce((sum, step) => sum + step.duration, 0);
  const elapsedTime = steps.slice(0, currentStepIndex).reduce((sum, step) => sum + step.duration, 0) + 
                      (currentStep ? currentStep.duration - timeRemaining : 0);
  const progressPercentage = totalTime > 0 ? (elapsedTime / totalTime) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coffee className="h-5 w-5" />
          {recipe.name}
        </CardTitle>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Grinder: {grinder?.model || 'Unknown'}</p>
          <p>Brewer: {brewer?.model || 'Unknown'}</p>
          <p>Ratio: {recipe.ratio} | Dose: {recipe.dose}g | Water: {recipe.water}ml</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Current Step */}
        <div className="text-center space-y-4 py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-2xl font-bold">
            {currentStepIndex + 1}
          </div>
          <div>
            <h3 className="text-2xl font-bold mb-2">{currentStep?.title}</h3>
            <p className="text-muted-foreground">{currentStep?.description}</p>
          </div>
          
          {currentStep && currentStep.duration > 0 && (
            <div className="text-6xl font-bold tabular-nums">
              {formatTime(timeRemaining)}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2 justify-center">
          {!isComplete && (
            <>
              {!isRunning ? (
                <Button onClick={handleStart} size="lg" className="min-w-32">
                  <Play className="mr-2 h-5 w-5" />
                  {currentStepIndex === 0 ? 'Start' : 'Resume'}
                </Button>
              ) : (
                <Button onClick={handlePause} size="lg" variant="secondary" className="min-w-32">
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
              )}
              <Button onClick={handleReset} size="lg" variant="outline">
                <RotateCcw className="mr-2 h-5 w-5" />
                Reset
              </Button>
            </>
          )}
          
          {isComplete && (
            <div className="text-center space-y-4 w-full">
              <div className="text-xl text-primary font-semibold">
                ✨ Brewing Complete!
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReset} size="lg" variant="outline" className="flex-1">
                  <RotateCcw className="mr-2 h-5 w-5" />
                  Brew Again
                </Button>
                <Button onClick={onComplete} size="lg" className="flex-1">
                  Continue to Log Brew
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Step List */}
        <div className="border-t pt-4 space-y-2">
          <h4 className="font-semibold text-sm text-muted-foreground mb-3">All Steps</h4>
          {steps.map((step, index) => {
            // Calculate elapsed time at the end of this step
            const elapsedTime = steps.slice(0, index + 1).reduce((sum, s) => sum + s.duration, 0);
            
            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                  index === currentStepIndex
                    ? 'bg-primary/10 border border-primary/20'
                    : index < currentStepIndex
                    ? 'bg-muted/50 opacity-60'
                    : 'bg-muted/20'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                  index < currentStepIndex ? 'bg-primary text-primary-foreground' :
                  index === currentStepIndex ? 'bg-primary text-primary-foreground' :
                  'bg-muted text-muted-foreground'
                }`}>
                  {index < currentStepIndex ? '✓' : index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                </div>
                {(step.duration > 0 || (step.duration === 0 && index === steps.length - 1)) && (
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(elapsedTime)}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <Button 
          onClick={onClose} 
          variant="outline" 
          className="w-full"
        >
          <X className="mr-2 h-4 w-4" />
          Close Timer
        </Button>
      </CardContent>
    </Card>
  );
}
