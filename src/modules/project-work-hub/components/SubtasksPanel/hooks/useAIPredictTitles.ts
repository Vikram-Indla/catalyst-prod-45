/**
 * useAIPredictTitles — debounced Lovable-gateway call for inline title suggestions.
 *
 * Contract (matches PR-1 extension of ai-improve-story):
 *   request  { improve_type: 'predict_subtask_titles', parent_summary,
 *              parent_type, sibling_summaries, user_draft }
 *   response { suggestions: string[] }  (max 5)
 *
 * Guardrails (chosen in the auto-mode plan, no ratified policy exists):
 *   • 300 ms debounce after user stops typing
 *   • Minimum 3 characters of draft before ANY call fires
 *   • Client-side throttle: 10 calls/minute/panel instance (token bucket)
 *   • AbortController cancels in-flight calls if the user types again
 *   • 429 / 402 / network errors fall back to the last known suggestions;
 *     we never show an error toast from here (overflow spam)
 */
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UseAIPredictTitlesParams {
  draft: string;
  parentSummary: string;
  parentType: string;
  siblingSummaries: string[];
  /** Disable the hook entirely (e.g. when hierarchy forbids creation). */
  disabled?: boolean;
}

export interface UseAIPredictTitlesResult {
  suggestions: string[];
  isLoading: boolean;
}

const DEBOUNCE_MS = 300;
const MIN_DRAFT_LENGTH = 3;
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX = 10;
const SIBLING_CAP = 20; // Matches edge-function slice.

export function useAIPredictTitles({
  draft,
  parentSummary,
  parentType,
  siblingSummaries,
  disabled,
}: UseAIPredictTitlesParams): UseAIPredictTitlesResult {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const callTimestampsRef = useRef<number[]>([]);

  useEffect(() => {
    if (disabled) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }
    if (draft.trim().length < MIN_DRAFT_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // Token-bucket: drop new calls once > THROTTLE_MAX fired in the window.
      const now = Date.now();
      callTimestampsRef.current = callTimestampsRef.current.filter(
        (t) => now - t < THROTTLE_WINDOW_MS,
      );
      if (callTimestampsRef.current.length >= THROTTLE_MAX) {
        // Keep whatever we had — do not clear UI.
        return;
      }
      callTimestampsRef.current.push(now);

      // Abort any prior in-flight call.
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          'ai-improve-story',
          {
            body: {
              improve_type: 'predict_subtask_titles',
              parent_summary: parentSummary,
              parent_type: parentType,
              sibling_summaries: siblingSummaries.slice(0, SIBLING_CAP),
              user_draft: draft.trim(),
            },
          },
        );
        if (controller.signal.aborted) return;
        if (error) {
          // Silent fallback — keep last-known suggestions.
          return;
        }
        const next = Array.isArray(data?.suggestions)
          ? data.suggestions
              .filter((s: unknown): s is string => typeof s === 'string')
              .slice(0, 5)
          : [];
        setSuggestions(next);
      } catch {
        // Silent — network errors / aborts don't surface.
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Intentionally NOT depending on siblingSummaries identity — its content
    // is captured on fire, and dependency on its array ref would re-debounce
    // on every row mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, parentSummary, parentType, disabled]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { suggestions, isLoading };
}
