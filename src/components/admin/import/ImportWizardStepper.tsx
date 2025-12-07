import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

export interface WizardStep {
  id: number;
  label: string;
  description?: string;
}

interface ImportWizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  className?: string;
}

export function ImportWizardStepper({ steps, currentStep, className }: ImportWizardStepperProps) {
  return (
    <div className={cn('flex items-center justify-between', className)}>
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isCurrent = currentStep === step.id;
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step circle and label */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                  isCompleted && 'bg-brand-gold text-white',
                  isCurrent && 'bg-brand-gold text-white ring-2 ring-brand-gold ring-offset-2',
                  !isCompleted && !isCurrent && 'bg-muted text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span
                className={cn(
                  'mt-2 text-xs font-medium text-center whitespace-nowrap',
                  isCurrent && 'text-brand-gold',
                  isCompleted && 'text-foreground',
                  !isCompleted && !isCurrent && 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            
            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4 transition-colors',
                  isCompleted ? 'bg-brand-gold' : 'bg-muted'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
