import React from 'react';
import { Check } from 'lucide-react';
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
  // Highest completed step determines what's accessible
  const highestCompletedStep = completedSteps.size > 0 ? Math.max(...Array.from(completedSteps)) : 0;
  
  // Can only access completed steps or the NEXT step after highest completed
  const canAccessStep = (stepId: number) => {
    if (completedSteps.has(stepId)) return true;
    if (stepId === 1) return true;
    if (stepId === highestCompletedStep + 1) return true;
    return false;
  };

  return (
    <TooltipProvider>
      <nav className="py-6 px-4" aria-label="Wizard progress">
        <div className="flex items-center justify-center max-w-4xl mx-auto">
          {steps.map((step, idx) => {
            const isComplete = completedSteps.has(step.id);
            const isActive = step.id === currentStep;
            const isAccessible = canAccessStep(step.id);
            const isPast = step.id < currentStep || isComplete;

            return (
              <React.Fragment key={step.id}>
                {/* Step */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => isAccessible && onStepClick(step.id)}
                      disabled={!isAccessible}
                      className={cn(
                        "flex flex-col items-center gap-1.5 group transition-all relative",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg p-2",
                        isAccessible ? "cursor-pointer" : "cursor-not-allowed"
                      )}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      {/* Circle */}
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200",
                          // Completed: teal with checkmark
                          isComplete && "bg-[hsl(var(--success))] text-white shadow-sm",
                          // Active: primary blue with ring
                          isActive && !isComplete && "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md",
                          // Accessible but not active/complete: subtle
                          !isComplete && !isActive && isAccessible && "bg-background border-2 border-border text-muted-foreground group-hover:border-primary/50",
                          // Locked: very muted
                          !isAccessible && "bg-muted/30 border border-border/40 text-muted-foreground/30"
                        )}
                      >
                        {isComplete ? (
                          <Check className="h-4 w-4" strokeWidth={2.5} />
                        ) : (
                          <span className={cn(!isAccessible && "opacity-40")}>{step.id}</span>
                        )}
                      </div>

                      {/* Label - visible on larger screens */}
                      <span
                        className={cn(
                          "text-[11px] font-medium hidden md:block transition-colors text-center leading-tight max-w-[70px]",
                          isComplete && "text-[hsl(var(--success))]",
                          isActive && !isComplete && "text-foreground font-semibold",
                          !isComplete && !isActive && isAccessible && "text-muted-foreground group-hover:text-foreground",
                          !isAccessible && "text-muted-foreground/30"
                        )}
                      >
                        {step.shortName}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px]">
                    <p className="font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                    {!isAccessible && (
                      <p className="text-xs text-[hsl(var(--warning))] mt-1">Complete previous steps first</p>
                    )}
                  </TooltipContent>
                </Tooltip>

                {/* Connector line between steps */}
                {idx < steps.length - 1 && (
                  <div className="flex-1 flex items-center min-w-[20px] max-w-[60px] mx-1">
                    <div
                      className={cn(
                        "h-0.5 w-full rounded-full transition-all duration-300",
                        isPast ? "bg-[hsl(var(--success))]" : "bg-border"
                      )}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile compact view - dots */}
        <div className="flex md:hidden items-center justify-center gap-1.5 mt-3">
          {steps.map((step) => {
            const isComplete = completedSteps.has(step.id);
            const isActive = step.id === currentStep;
            return (
              <div
                key={step.id}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  isComplete && "bg-[hsl(var(--success))]",
                  isActive && !isComplete && "bg-primary w-4",
                  !isComplete && !isActive && "bg-muted-foreground/20"
                )}
              />
            );
          })}
          <span className="text-xs text-muted-foreground ml-2 tabular-nums">
            {currentStep}/{steps.length}
          </span>
        </div>
      </nav>
    </TooltipProvider>
  );
}
