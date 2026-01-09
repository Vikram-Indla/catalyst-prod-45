/**
 * Hook for AI-powered test case generation using Lovable AI
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedTestCase {
  title: string;
  summary: string;
  testType: string;
  priority: string;
  preconditions: string[];
  steps: {
    stepNumber: number;
    action: string;
    testData?: string;
    expectedResult: string;
  }[];
  tags: string[];
}

export interface GenerationResult {
  testCases: GeneratedTestCase[];
  metadata: {
    totalGenerated: number;
    coverageAreas: string[];
    suggestedAdditionalTests: string[];
  };
}

export interface GenerationOptions {
  projectName: string;
  featureName?: string;
  testType: string;
  includeEdgeCases: boolean;
  includeNegativeTests: boolean;
  includePerformance: boolean;
  includeSecurity: boolean;
}

export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTestCases = useCallback(async (
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-generate-test-cases', {
        body: {
          prompt,
          projectName: options.projectName,
          featureName: options.featureName,
          testType: options.testType,
          includeEdgeCases: options.includeEdgeCases,
          includeNegativeTests: options.includeNegativeTests,
          includePerformance: options.includePerformance,
          includeSecurity: options.includeSecurity,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate test cases');
      }

      if (data?.error) {
        // Handle specific error codes
        if (data.error.includes('Rate limit')) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      if (!data?.data?.testCases) {
        throw new Error('Invalid response from AI');
      }

      return data.data as GenerationResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate test cases';
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    generateTestCases,
    isGenerating,
    error,
    clearError,
  };
}
