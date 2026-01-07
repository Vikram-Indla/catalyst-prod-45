import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  onStepClick: (stepId: number) => void;
}

export function HorizontalStepper({ steps, currentStep, onStepClick }: HorizontalStepperProps) {
  return (
    <div className="bg-card border-b border-border/50 py-4 px-6">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, idx) => {
          const isActive = step.id === currentStep;
          const isComplete = step.id < currentStep;
          const isPending = step.id > currentStep;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepClick(step.id)}
                className={cn(
                  "flex items-center gap-2 group transition-all",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg px-2 py-1"
                )}
              >
                {/* Step circle */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 flex-shrink-0",
                    isComplete && "bg-[hsl(var(--success))] text-white",
                    isActive && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                    isPending && "bg-muted border-2 border-border text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>

                {/* Step label - hidden on smaller screens */}
                <span
                  className={cn(
                    "text-xs font-medium hidden lg:block transition-colors",
                    isComplete && "text-[hsl(var(--success))]",
                    isActive && "text-foreground font-semibold",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.shortName}
                </span>
              </button>

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
  );
}
