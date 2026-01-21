/**
 * Module 3C-2: Step Indicator Component
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { WizardStep } from '../../types/batch-export';

interface Step {
  number: WizardStep;
  title: string;
  description: string;
}

const steps: Step[] = [
  { number: 1, title: 'Format', description: 'Choose export format' },
  { number: 2, title: 'Fields & Cases', description: 'Select data to export' },
  { number: 3, title: 'Export', description: 'Download your file' },
];

interface StepIndicatorProps {
  currentStep: WizardStep;
  onStepClick?: (step: WizardStep) => void;
}

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Export wizard progress" className="mb-8">
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.number;
          const isCurrent = currentStep === step.number;
          const isClickable = onStepClick && step.number < currentStep;

          return (
            <li key={step.number} className="flex-1 relative">
              {/* Connector line */}
              {index > 0 && (
                <div
                  className={cn(
                    'absolute top-5 -left-1/2 w-full h-0.5 -translate-y-1/2',
                    isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                  )}
                  style={{ width: 'calc(100% - 2rem)', left: 'calc(-50% + 1rem)' }}
                />
              )}

              {/* Step circle and content */}
              <div className="relative flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick(step.number)}
                  disabled={!isClickable}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                    'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                    isCompleted && 'bg-primary border-primary text-primary-foreground',
                    isCurrent && 'border-primary bg-background text-primary',
                    !isCompleted && !isCurrent && 'border-muted bg-background text-muted-foreground',
                    isClickable && 'cursor-pointer hover:bg-primary/10'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <span className="text-sm font-medium">{step.number}</span>
                  )}
                </button>

                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCurrent || isCompleted ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
