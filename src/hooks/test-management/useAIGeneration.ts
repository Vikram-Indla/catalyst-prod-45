/**
 * Hook for AI-powered test case generation.
 *
 * Invokes the `ai-generate-test-artefacts` edge function (Claude
 * claude-opus-4-8, structured outputs). The free-prompt entry point passes
 * `{ source: 'prompt', prompt, project_id, count }`; the server assembles
 * context and returns per-case test_type + coverage_area + traceability
 * (covers[]) + rationales, plus a coverage_map and a gaps list.
 *
 * The returned test_type is the model's real classification per case — it is
 * NOT forced to a single requested type (zero-assumption: no fabricated
 * uniform type).
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';

/** The model's per-case type and coverage-area vocabularies (mirrors the
 *  edge function's structured-output enums). */
export type GeneratedTestType =
  | 'functional'
  | 'api'
  | 'security'
  | 'performance'
  | 'integration'
  | 'regression';

export type GeneratedCoverageArea =
  | 'happy'
  | 'negative'
  | 'boundary'
  | 'security'
  | 'performance'
  | 'integration';

export interface GeneratedTestCase {
  title: string;
  summary: string;
  /** Real per-case classification returned by the model — never fabricated. */
  testType: GeneratedTestType;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'draft';
  preconditions: string[];
  steps: {
    stepNumber: number;
    action: string;
    testData?: string;
    expectedResult: string;
  }[];
  /** Coverage area the model assigned (happy / negative / boundary / …). */
  coverageArea?: GeneratedCoverageArea;
  /** Source anchors this case verifies (e.g. "AC-2", "defect-DEF-14"). */
  covers: string[];
  /** True when the model flagged this as a probable duplicate of an existing case. */
  similarToExisting: boolean;
  priorityReason?: string;
  typeReason?: string;
  isAIGenerated?: boolean;
  aiModel?: string;
  aiGeneratedAt?: string;
}

/** A requirement → covering-case-index mapping row from the coverage_map. */
export interface CoverageMapEntry {
  requirement: string;
  caseIndices: number[];
}

export interface GenerationResult {
  testCases: GeneratedTestCase[];
  metadata: {
    totalGenerated: number;
    /** Requirement → case-index traceability, straight from the model. */
    coverageMap: CoverageMapEntry[];
    /** Requirements/behaviours the model could NOT cover. */
    gaps: string[];
  };
}

export interface GenerationOptions {
  /** Optional Catalyst project id, forwarded for usage attribution. */
  projectId?: string;
  /** How many cases to request (server clamps to its own ceiling). */
  count?: number;
}

/** Wire shape returned by the ai-generate-test-artefacts edge function. */
interface EdgeFunctionStep {
  step_number: number;
  action: string;
  test_data?: string | null;
  expected_result: string;
}

interface EdgeFunctionCase {
  title: string;
  objective: string;
  preconditions: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priority_rationale?: string;
  test_type: GeneratedTestType;
  type_rationale?: string;
  coverage_area?: GeneratedCoverageArea;
  covers?: string[];
  similar_to_existing?: boolean;
  steps: EdgeFunctionStep[];
}

interface EdgeCoverageMapEntry {
  requirement: string;
  case_indices?: number[];
}

const VALID_TEST_TYPES: readonly GeneratedTestType[] = [
  'functional',
  'api',
  'security',
  'performance',
  'integration',
  'regression',
];
const VALID_COVERAGE_AREAS: readonly GeneratedCoverageArea[] = [
  'happy',
  'negative',
  'boundary',
  'security',
  'performance',
  'integration',
];

export function useAIGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // P2-S10 (AI-004): true when the server rejected the last attempt for
  // quota_exceeded or cooldown — a visible, distinct block state from a
  // generic error (dialog can disable the Generate button on this).
  const [isBlocked, setIsBlocked] = useState(false);
  // Ref-based guard: blocks duplicate in-flight calls even before the
  // isGenerating state update has re-rendered the consumer.
  const inFlightRef = useRef(false);

  const generateTestCases = useCallback(async (
    prompt: string,
    options: GenerationOptions = {},
  ): Promise<GenerationResult | null> => {
    if (inFlightRef.current) return null;
    inFlightRef.current = true;
    setIsGenerating(true);
    setError(null);
    setIsBlocked(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-generate-test-artefacts', {
        body: {
          source: 'prompt',
          prompt,
          project_id: options.projectId ?? null,
          count: options.count ?? 12,
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
        } else if (data.error === 'quota_exceeded' || data.error === 'cooldown') {
          catalystToast.error(message);
          setIsBlocked(true);
        } else {
          catalystToast.error(message);
        }
        setError(message);
        return null;
      }

      if (!Array.isArray(data?.test_cases)) {
        throw new Error('Invalid response from AI');
      }

      const generatedAt = new Date().toISOString();

      const testCases: GeneratedTestCase[] = (data.test_cases as EdgeFunctionCase[]).map(tc => ({
        title: tc.title,
        summary: tc.objective || '',
        // Real per-case type — validated against the enum, never coerced to a
        // single requested type. Falls back to 'functional' only when the
        // model returned an out-of-vocabulary value (defense-in-depth).
        testType: VALID_TEST_TYPES.includes(tc.test_type) ? tc.test_type : 'functional',
        priority: tc.priority,
        status: 'draft',
        preconditions: tc.preconditions
          ? tc.preconditions.split('\n').map(p => p.trim()).filter(Boolean)
          : [],
        steps: (tc.steps ?? []).map(step => ({
          stepNumber: step.step_number,
          action: step.action,
          testData: step.test_data ?? undefined,
          expectedResult: step.expected_result,
        })),
        coverageArea:
          tc.coverage_area && VALID_COVERAGE_AREAS.includes(tc.coverage_area)
            ? tc.coverage_area
            : undefined,
        covers: Array.isArray(tc.covers)
          ? tc.covers.filter((c): c is string => typeof c === 'string')
          : [],
        similarToExisting: tc.similar_to_existing === true,
        priorityReason: tc.priority_rationale || undefined,
        typeReason: tc.type_rationale || undefined,
        isAIGenerated: true,
        aiModel: typeof data.model === 'string' ? data.model : undefined,
        aiGeneratedAt: generatedAt,
      }));

      if (testCases.length === 0) {
        throw new Error('AI returned no test cases. Try a more detailed description.');
      }

      const coverageMap: CoverageMapEntry[] = Array.isArray(data.coverage_map)
        ? (data.coverage_map as EdgeCoverageMapEntry[])
            .filter(e => e && typeof e.requirement === 'string')
            .map(e => ({
              requirement: e.requirement,
              caseIndices: Array.isArray(e.case_indices)
                ? e.case_indices.filter((n): n is number => typeof n === 'number')
                : [],
            }))
        : [];
      const gaps: string[] = Array.isArray(data.gaps)
        ? (data.gaps as unknown[]).filter((g): g is string => typeof g === 'string')
        : [];

      const result: GenerationResult = {
        testCases,
        metadata: {
          totalGenerated: testCases.length,
          coverageMap,
          gaps,
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
    setIsBlocked(false);
  }, []);

  return {
    generateTestCases,
    isGenerating,
    error,
    isBlocked,
    clearError,
  };
}
