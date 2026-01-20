/**
 * Module 3A-2: Step Navigation Hook (Standalone Version)
 * Manages step navigation state independent of execution store
 */
import { useState, useCallback, useMemo } from 'react';
import type { StepNavigationState } from '../types/step-execution';

export function useStepNavigationV2(totalSteps: number, initialStep: number = 0) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);

  const state = useMemo<StepNavigationState>(() => ({
    currentStepIndex,
    totalSteps,
    canGoPrev: currentStepIndex > 0,
    canGoNext: currentStepIndex < totalSteps - 1,
    isFirstStep: currentStepIndex === 0,
    isLastStep: currentStepIndex === totalSteps - 1,
  }), [currentStepIndex, totalSteps]);

  const goToStep = useCallback((index: number) => {
    if (index >= 0 && index < totalSteps) {
      setCurrentStepIndex(index);
    }
  }, [totalSteps]);

  const nextStep = useCallback(() => {
    if (currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex(prev => prev + 1);
      return true;
    }
    return false;
  }, [currentStepIndex, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
      return true;
    }
    return false;
  }, [currentStepIndex]);

  const reset = useCallback(() => {
    setCurrentStepIndex(0);
  }, []);

  return {
    ...state,
    goToStep,
    nextStep,
    prevStep,
    reset,
    setCurrentStepIndex,
  };
}
