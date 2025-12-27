import React from 'react';
import { EFD_STEPS } from '../types/efd.types';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EFDStepProgressProps {
  currentStep: number;
  onStepClick: (step: number) => void;
}

export const EFDStepProgress: React.FC<EFDStepProgressProps> = ({ currentStep, onStepClick }) => {
  return (
    <div className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between overflow-x-auto">
        {EFD_STEPS.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onStepClick(index)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap",
                  isCurrent && "bg-primary text-primary-foreground",
                  isCompleted && "text-green-600 hover:bg-green-50",
                  !isCurrent && !isCompleted && "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn(
                  "flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium",
                  isCurrent && "bg-primary-foreground text-primary",
                  isCompleted && "bg-green-100 text-green-600",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="text-sm font-medium hidden lg:inline">{step.name}</span>
              </button>
              
              {index < EFD_STEPS.length - 1 && (
                <div className={cn(
                  "flex-1 h-px mx-2 min-w-4",
                  isCompleted ? "bg-green-300" : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
