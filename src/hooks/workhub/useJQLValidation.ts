/**
 * useJQLValidation — P0-52
 * Debounced server-side JQL validation via the jql-validate Edge Function.
 */
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface JQLValidationResult {
  valid: boolean;
  errors: string[];
  isChecking: boolean;
}

export function useJQLValidation(jql: string, debounceMs = 600): JQLValidationResult {
  const [result, setResult] = useState<JQLValidationResult>({ valid: true, errors: [], isChecking: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!jql?.trim()) {
      setResult({ valid: true, errors: [], isChecking: false });
      return;
    }

    setResult(prev => ({ ...prev, isChecking: true }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      try {
        const { data, error } = await supabase.functions.invoke('jql-validate', {
          body: { jql },
        });
        if (ac.signal.aborted) return;
        if (error || !data) {
          setResult({ valid: true, errors: [], isChecking: false });
          return;
        }
        setResult({ valid: data.valid, errors: data.errors ?? [], isChecking: false });
      } catch {
        if (!ac.signal.aborted) {
          setResult({ valid: true, errors: [], isChecking: false });
        }
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [jql, debounceMs]);

  return result;
}
