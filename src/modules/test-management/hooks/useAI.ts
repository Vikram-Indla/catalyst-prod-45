/**
 * AI Hooks for Test Management
 */

import { useMutation } from '@tanstack/react-query';
import { aiApi } from '../api';
import type { AIGenerateStepsInput, AISuggestCasesInput } from '../api/types';
import { useToast } from '@/hooks/use-toast';
import { parseApiError } from '../api/client';

/**
 * Generate test steps from title/description
 */
export function useGenerateSteps() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: AIGenerateStepsInput) => aiApi.generateSteps(data),
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to generate steps',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Suggest test cases from requirement
 */
export function useSuggestCases() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: AISuggestCasesInput) => aiApi.suggestCases(data),
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to generate suggestions',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Enhance test case description
 */
export function useEnhanceDescription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ caseId, description }: { caseId: string; description: string }) =>
      aiApi.enhanceDescription(caseId, description),
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to enhance description',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Generate test data suggestions
 */
export function useGenerateTestData() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ stepAction, context }: { stepAction: string; context?: string }) =>
      aiApi.generateTestData(stepAction, context),
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to generate test data',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Analyze failed test
 */
export function useAnalyzeFailure() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ runId, stepId }: { runId: string; stepId: string }) =>
      aiApi.analyzeFailure(runId, stepId),
    onError: (error) => {
      const apiError = parseApiError(error);
      toast({
        title: 'Failed to analyze failure',
        description: apiError.message,
        variant: 'destructive',
      });
    },
  });
}
