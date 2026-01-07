import React from 'react';
import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FooterNavProps {
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  isNextDisabled: boolean;
  nextDisabledReason?: string;
  isSaving?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onSave?: () => void;
}

export function FooterNav({
  currentStep,
  totalSteps,
  canGoNext,
  isNextDisabled,
  nextDisabledReason,
  isSaving,
  onPrevious,
  onNext,
  onSave
}: FooterNavProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <footer className="sticky bottom-0 bg-card border-t border-border/50 px-6 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3">
        {!isFirstStep && (
          <Button
            variant="outline"
            onClick={onPrevious}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onSave && (
          <Button
            variant="outline"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>
        )}

        <Button
          onClick={onNext}
          disabled={isLastStep || isNextDisabled}
          className={cn(
            "gap-2 min-w-[140px]",
            isNextDisabled && !!nextDisabledReason && "bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90"
          )}
        >
          {isNextDisabled && nextDisabledReason ? (
            nextDisabledReason
          ) : (
            <>
              {isLastStep ? 'Complete' : 'Continue'}
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </footer>
  );
}
