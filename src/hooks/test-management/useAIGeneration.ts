/**
 * Hook for AI-powered test case generation using Lovable AI
 * With smart priority and type assignment
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface GeneratedTestCase {
  title: string;
  summary: string;
  testType: 'functional' | 'api' | 'performance' | 'security';
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft';
  preconditions: string[];
  steps: {
    stepNumber: number;
    action: string;
    testData?: string;
    expectedResult: string;
  }[];
  tags: string[];
  priorityReason?: string;
  typeReason?: string;
  isAIGenerated?: boolean;
  aiModel?: string;
  aiGeneratedAt?: string;
}

export interface GenerationResult {
  testCases: GeneratedTestCase[];
  metadata: {
    totalGenerated: number;
    priorityBreakdown?: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    typeBreakdown?: {
      functional: number;
      api: number;
      performance: number;
      security: number;
    };
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

      const result = data.data as GenerationResult;
      
      // Log breakdown for debugging
      if (result.metadata?.priorityBreakdown) {
        console.log('AI Priority Breakdown:', result.metadata.priorityBreakdown);
      }
      if (result.metadata?.typeBreakdown) {
        console.log('AI Type Breakdown:', result.metadata.typeBreakdown);
      }

      return result;
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
