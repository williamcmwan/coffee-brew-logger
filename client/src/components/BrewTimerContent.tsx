import { useState, useEffect, useCallback, useRef } from "react";
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
  waterAmount?: number;
}

interface BrewTimerContentProps {
  recipe: any;
  onClose?: () => void;
  onComplete: () => void;
  completeButtonText?: string;
  showCloseButton?: boolean;
  showBorder?: boolean;
}

export default function BrewTimerContent({ 
  recipe, 
  onClose, 
  onComplete,
  completeButtonText = "Log Brew",
  showCloseButton = true,
  showBorder = false
}: BrewTimerContentProps) {
  const { grinders, brewers } = useApp();
  
  const [steps, setSteps] = useState<TimerStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Persistent AudioContext for mobile browser support
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Initialize and unlock AudioContext on user interaction
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (required for mobile browsers)
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

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
        const hasWater = step.waterAmount && step.waterAmount > 0;
        parsedSteps.push({
          title: step.description || `Step ${index + 1}`,
          duration: stepDuration,
          description: hasWater ? `Pour ${step.waterAmount}g of water.` : step.description || `Step ${index + 1}`,
          waterAmount: hasWater ? step.waterAmount : undefined
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

  // Play tick sound for countdown (short click)
  const playTickSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 1200;
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.08);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getAudioContext]);

  // Play bell sound at end of step (light chime)
  const playBellSound = useCallback(() => {
    try {
      const audioContext = getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.8);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }, [getAudioContext]);

  // Play notification sound (legacy, now uses bell)
  const playNotificationSound = useCallback(() => {
    playBellSound();
  }, [playBellSound]);

  // Find next step with duration > 0, or return the final step
  const findNextActiveStep = useCallback((fromIndex: number): number => {
    for (let i = fromIndex; i < steps.length; i++) {
      if (steps[i].duration > 0 || i === steps.length - 1) {
        return i;
      }
    }
    return steps.length - 1;
  }, [steps]);

  // Timer countdown logic
  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;
    
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        // Play tick sound in last 5 seconds (but not at 0)
        if (prev <= 6 && prev > 1) {
          playTickSound();
        }
        
        if (prev <= 1) {
          // Step completed - play bell
          playBellSound();
          
          if (currentStepIndex < steps.length - 1) {
            // Find next step with duration > 0, skipping info-only steps
            const nextActiveIndex = findNextActiveStep(currentStepIndex + 1);
            const nextStep = steps[nextActiveIndex];
            
            toast({
              title: nextStep.title,
              description: nextStep.description,
              duration: 1000,
            });
            
            setCurrentStepIndex(nextActiveIndex);
            
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
  }, [isRunning, timeRemaining, currentStepIndex, steps, playTickSound, playBellSound, findNextActiveStep]);

  const handleStart = () => {
    // Unlock AudioContext on user interaction (required for mobile browsers)
    getAudioContext();
    
    // Skip any steps with duration 0 (info-only steps)
    const nextActiveIndex = findNextActiveStep(currentStepIndex === 0 ? 1 : currentStepIndex);
    const nextStep = steps[nextActiveIndex];
    
    if (nextActiveIndex !== currentStepIndex) {
      setCurrentStepIndex(nextActiveIndex);
      setTimeRemaining(nextStep?.duration || 0);
    }
    
    // If the step has no duration, mark as complete
    if (nextStep?.duration === 0) {
      setIsComplete(true);
    } else {
      setIsRunning(true);
    }
    
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
    <Card className={showBorder ? "" : "border-0"}>
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
      <CardContent className="space-y-4">
        {/* Overall Progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span>Overall Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>

        {/* Current Step */}
        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-lg font-bold flex-shrink-0">
              {currentStepIndex + 1}
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold leading-tight">{currentStep?.title}</h3>
              <p className="text-sm text-muted-foreground leading-tight mt-0.5">{currentStep?.description}</p>
            </div>
          </div>
          
          {currentStep && currentStep.duration > 0 && (
            <>
              <div className={`font-bold tabular-nums text-center ${timeRemaining <= 5 ? 'text-orange-500' : ''}`} style={{ fontSize: '6rem', lineHeight: 1 }}>
                {formatTime(timeRemaining)}
              </div>
              {currentStep.waterAmount && currentStep.waterAmount > 0 && (
                <div className="flex gap-8 justify-center text-muted-foreground mt-4">
                  <div className="flex flex-col items-center">
                    <span className="text-sm uppercase tracking-wide">Flow Rate</span>
                    <span className="text-4xl font-bold text-foreground">
                      {(currentStep.waterAmount / currentStep.duration).toFixed(1)} <span className="text-2xl">g/s</span>
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-sm uppercase tracking-wide">Total Water</span>
                    <span className="text-4xl font-bold text-foreground">
                      {(() => {
                        // Calculate cumulative water up to previous steps
                        const previousWater = steps.slice(0, currentStepIndex).reduce((sum, s) => 
                          sum + (s.waterAmount || 0), 0
                        );
                        // Calculate current step progress
                        const stepElapsed = currentStep.duration - timeRemaining;
                        const flowRate = currentStep.waterAmount / currentStep.duration;
                        const currentStepWater = Math.min(stepElapsed * flowRate, currentStep.waterAmount);
                        return Math.round(previousWater + currentStepWater);
                      })()}
                      <span className="text-2xl text-muted-foreground">/{(() => {
                        // Calculate target water at end of this step
                        const targetWater = steps.slice(0, currentStepIndex + 1).reduce((sum, s) => 
                          sum + (s.waterAmount || 0), 0
                        );
                        return targetWater;
                      })()}g</span>
                    </span>
                  </div>
                </div>
              )}
            </>
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
            <div className="text-center space-y-3 w-full">
              <div className="text-lg text-primary font-semibold">
                ✨ Brewing Complete!
              </div>
              <div className="flex gap-2">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  <RotateCcw className="mr-1 h-4 w-4" />
                  Brew Again
                </Button>
                <Button onClick={onComplete} className="flex-1">
                  {completeButtonText}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="border-t pt-2">
          <h4 className="font-semibold text-xs text-muted-foreground mb-2">Timeline</h4>
          <div className="relative">
            {steps.map((step, index) => {
              // Calculate elapsed time at the start of this step
              const stepStartTime = steps.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
              const isLast = index === steps.length - 1;
              
              return (
                <div key={index} className="flex gap-2">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    {/* Time marker */}
                    <div className={`text-xs font-mono w-10 text-right ${
                      index <= currentStepIndex ? 'text-primary font-semibold' : 'text-muted-foreground'
                    }`}>
                      {formatTime(stepStartTime)}
                    </div>
                    {/* Dot */}
                    <div className={`w-2.5 h-2.5 rounded-full mt-0.5 ${
                      index < currentStepIndex ? 'bg-primary' :
                      index === currentStepIndex ? 'bg-primary ring-2 ring-primary/20' :
                      'bg-muted-foreground/30'
                    }`} />
                    {/* Line */}
                    {!isLast && (
                      <div className={`w-0.5 flex-1 min-h-5 ${
                        index < currentStepIndex ? 'bg-primary' : 'bg-muted-foreground/20'
                      }`} />
                    )}
                  </div>
                  {/* Content */}
                  <div className={`flex-1 pb-2 ${index < currentStepIndex ? 'opacity-60' : ''}`}>
                    <div className={`font-medium text-sm leading-tight ${
                      index === currentStepIndex ? 'text-primary' : ''
                    }`}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">
                      {step.description}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <Button 
            onClick={onClose} 
            variant="outline" 
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Close Timer
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
