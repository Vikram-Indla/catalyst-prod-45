/**
 * Step Navigation Hook with keyboard support
 */

import { useEffect, useCallback } from 'react';
import { useExecutionStore } from '../stores/executionStore';

export function useStepNavigation() {
  const {
    currentStepIndex,
    steps,
    goToStep,
    nextStep,
    prevStep,
    markStep,
    skipStep,
  } = useExecutionStore();
  
  const currentStep = steps[currentStepIndex];
  const canGoNext = currentStep?.status !== 'pending' && currentStepIndex < steps.length - 1;
  const canGoPrev = currentStepIndex > 0;
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger in form fields
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (e.key === 'Escape') {
        target.blur();
      }
      return;
    }
    
    switch (e.key.toLowerCase()) {
      case 'p':
        e.preventDefault();
        markStep('passed');
        break;
      case 'f':
        e.preventDefault();
        markStep('failed');
        break;
      case 'b':
        e.preventDefault();
        markStep('blocked');
        break;
      case 's':
        e.preventDefault();
        skipStep();
        break;
      case 'arrowright':
        e.preventDefault();
        if (canGoNext) nextStep();
        break;
      case 'arrowleft':
        e.preventDefault();
        if (canGoPrev) prevStep();
        break;
    }
  }, [markStep, skipStep, nextStep, prevStep, canGoNext, canGoPrev]);
  
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return {
    currentStepIndex,
    totalSteps: steps.length,
    currentStep,
    canGoNext,
    canGoPrev,
    goToStep,
    nextStep,
    prevStep,
  };
}
