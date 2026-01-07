import React from 'react';
import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface WizardStep {
  id: number;
  name: string;
  shortName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  key: string;
}

interface HorizontalStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick: (stepId: number) => void;
}

export function HorizontalStepper({ steps, currentStep, completedSteps, onStepClick }: HorizontalStepperProps) {
  // Can only access completed steps or current step
  const canAccessStep = (stepId: number) => {
    return completedSteps.has(stepId) || stepId === currentStep;
  };

  // Get the highest accessible step (for determining locked state)
  const highestAccessibleStep = Math.max(currentStep, ...Array.from(completedSteps));

  return (
    <TooltipProvider>
      <div className="bg-card border-b border-border/50 py-4 px-6">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, idx) => {
            const isComplete = completedSteps.has(step.id);
            const isActive = step.id === currentStep;
            const isLocked = step.id > highestAccessibleStep + 1 || (!isComplete && !isActive);
            const isAccessible = canAccessStep(step.id);

            return (
              <React.Fragment key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => isAccessible && onStepClick(step.id)}
                      disabled={!isAccessible}
                      className={cn(
                        "flex items-center gap-2 group transition-all",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-2 py-1",
                        !isAccessible && "cursor-not-allowed opacity-60"
                      )}
                    >
                      {/* Step circle */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 flex-shrink-0",
                          isComplete && "bg-[hsl(var(--success))] text-white",
                          isActive && !isComplete && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                          !isComplete && !isActive && "bg-muted border-2 border-border text-muted-foreground"
                        )}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" />
                        ) : !isAccessible ? (
                          <Lock className="h-3.5 w-3.5" />
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Step label - hidden on smaller screens */}
                      <span
                        className={cn(
                          "text-xs font-medium hidden lg:block transition-colors",
                          isComplete && "text-[hsl(var(--success))]",
                          isActive && !isComplete && "text-foreground font-semibold",
                          !isComplete && !isActive && "text-muted-foreground"
                        )}
                      >
                        {step.shortName}
                      </span>
                    </button>
                  </TooltipTrigger>
                  {!isAccessible && (
                    <TooltipContent side="bottom">
                      <p>Complete previous steps first</p>
                    </TooltipContent>
                  )}
                </Tooltip>

                {/* Connector line */}
                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-2 transition-colors duration-300",
                      isComplete ? "bg-[hsl(var(--success))]" : "bg-border"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
