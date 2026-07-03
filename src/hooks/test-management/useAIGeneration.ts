/**
 * Hook for AI-powered test case generation.
 *
 * Invokes the `ai-generate-story-test-cases` edge function in prompt mode
 * ({ mode: 'prompt', prompt, ... }) — the single real generation function
 * (Gemini via OpenAI-compat endpoint, server-side sanitizer, max 10 cases).
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

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

/** Wire shape returned by the ai-generate-story-test-cases edge function. */
interface EdgeFunctionStep {
  step_number: number;
  action: string;
  test_data?: string;
  expected_result: string;
}

interface EdgeFunctionCase {
  title: string;
  objective: string;
  preconditions: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'DRAFT' | 'REVIEW' | 'APPROVED';
  steps: EdgeFunctionStep[];
}

const VALID_TEST_TYPES = ['functional', 'api', 'performance', 'security'] as const;

export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref-based guard: blocks duplicate in-flight calls even before the
  // isGenerating state update has re-rendered the consumer.
  const inFlightRef = useRef(false);

  const generateTestCases = useCallback(async (
    prompt: string,
    options: GenerationOptions
  ): Promise<GenerationResult | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-generate-story-test-cases', {
        body: {
          mode: 'prompt',
          prompt,
          project_name: options.projectName,
          feature_name: options.featureName,
          test_type: options.testType,
          count: 10,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to generate test cases');
      }

      if (data?.error) {
        const message: string = data.message || data.error;
        // Handle specific error codes from the edge function
        if (data.error === 'rate_limited') {
          catalystToast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (data.error === 'payment_required') {
          catalystToast.error('AI credits exhausted. Please add credits to continue.');
        } else {
          catalystToast.error(message);
        }
        setError(message);
        return null;
      }

      if (!Array.isArray(data?.test_cases)) {
        throw new Error('Invalid response from AI');
      }

      const requestedType = VALID_TEST_TYPES.includes(
        options.testType as (typeof VALID_TEST_TYPES)[number],
      )
        ? (options.testType as GeneratedTestCase['testType'])
        : 'functional';
      const generatedAt = new Date().toISOString();

      const testCases: GeneratedTestCase[] = (data.test_cases as EdgeFunctionCase[]).map(tc => ({
        title: tc.title,
        summary: tc.objective || '',
        testType: requestedType,
        priority: tc.priority,
        status: 'draft',
        preconditions: tc.preconditions
          ? tc.preconditions.split('\n').map(p => p.trim()).filter(Boolean)
          : [],
        steps: (tc.steps ?? []).map(step => ({
          stepNumber: step.step_number,
          action: step.action,
          testData: step.test_data,
          expectedResult: step.expected_result,
        })),
        tags: [],
        isAIGenerated: true,
        aiModel: typeof data.model === 'string' ? data.model : undefined,
        aiGeneratedAt: generatedAt,
      }));

      if (testCases.length === 0) {
        throw new Error('AI returned no test cases. Try a more detailed description.');
      }

      const result: GenerationResult = {
        testCases,
        metadata: {
          totalGenerated: testCases.length,
          coverageAreas: [],
          suggestedAdditionalTests: [],
        },
      };

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate test cases';
      setError(message);
      catalystToast.error(message);
      return null;
    } finally {
      inFlightRef.current = false;
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
