/**
 * Module 3C-4: Delete Step Indicator
 */

import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { DeleteWizardStep } from '../../types/batch-delete';

interface DeleteStepIndicatorProps {
  currentStep: DeleteWizardStep;
}

const steps = [
  { number: 1, label: 'Select Type' },
  { number: 2, label: 'Confirm' },
  { number: 3, label: 'Delete' },
];

export function DeleteStepIndicator({ currentStep }: DeleteStepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {steps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                currentStep > step.number
                  ? 'border-destructive bg-destructive text-destructive-foreground'
                  : currentStep === step.number
                  ? 'border-destructive bg-destructive/10 text-destructive'
                  : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {currentStep > step.number ? (
                <Check className="h-4 w-4" />
              ) : (
                step.number
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                currentStep >= step.number
                  ? 'text-foreground'
                  : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={cn(
                'mx-3 h-0.5 w-8',
                currentStep > step.number
                  ? 'bg-destructive'
                  : 'bg-muted-foreground/30'
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
