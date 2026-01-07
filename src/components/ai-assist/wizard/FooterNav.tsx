import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
}: FooterNavProps) {
  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === totalSteps;

  return (
    <footer className="sticky bottom-0 bg-card border-t border-border/50 px-6 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
      {/* Left side - Previous button */}
      <div className="flex items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={isFirstStep}
          className={cn(
            "gap-2 min-w-[120px]",
            isFirstStep && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
      </div>

      {/* Center - Step indicator for mobile */}
      <div className="flex md:hidden items-center">
        <span className="text-sm text-muted-foreground tabular-nums">
          {currentStep} / {totalSteps}
        </span>
      </div>

      {/* Right side - Continue button */}
      <div className="flex items-center">
        <Button
          onClick={onNext}
          disabled={isLastStep || isNextDisabled || isSaving}
          className={cn(
            "gap-2 min-w-[140px]",
            isNextDisabled && !!nextDisabledReason && "bg-[hsl(var(--warning))] hover:bg-[hsl(var(--warning))]/90 text-[hsl(var(--warning-foreground))]"
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isNextDisabled && nextDisabledReason ? (
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
