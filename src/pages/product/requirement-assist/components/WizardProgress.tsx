import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  draftSaved?: boolean;
}

const steps = [
  { id: 1, label: 'Input' },
  { id: 2, label: 'Configure' },
  { id: 3, label: 'Generate' },
  { id: 4, label: 'Review' },
  { id: 5, label: 'Publish' },
];

export function WizardProgress({ currentStep, onStepClick, draftSaved }: WizardProgressProps) {
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="flex items-center justify-between py-4 px-6">
      <div className="flex items-center gap-2">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isClickable = step.id !== 3 && step.id !== 5 && step.id <= currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => isClickable && onStepClick(step.id)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium transition-all",
                  status === 'completed' && "bg-emerald-100 text-emerald-600",
                  status === 'active' && "bg-primary text-primary-foreground",
                  status === 'pending' && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:opacity-90",
                  !isClickable && "cursor-default"
                )}
              >
                <span className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold",
                  status === 'completed' && "bg-emerald-500 text-white",
                  status === 'active' && "bg-white/25",
                  status === 'pending' && "bg-border"
                )}>
                  {status === 'completed' ? <Check className="w-3 h-3" /> : step.id}
                </span>
                {step.label}
              </button>
              
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 transition-colors",
                  status === 'completed' ? "bg-emerald-500" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {draftSaved && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
          <Check className="w-3.5 h-3.5" />
          <span>Draft saved</span>
        </div>
      )}
    </div>
  );
}
