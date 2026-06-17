/**
 * useThemeQuota — daily "Re-analyze" budget for the AI Theme Analyzer.
 *
 * Users may force a fresh LLM re-cluster at most THEME_DAILY_LIMIT times per
 * day. The authoritative counter lives in `ai_theme_quota` (one row per
 * user per Riyadh-day) and is incremented server-side by the ai-digest
 * themes handler on every forceRefresh. This hook is the READ side — it
 * surfaces `used` / `remaining` so the panel can render the hover counter
 * ("· 2 left") and lock the button at zero.
 *
 * The "day" is Asia/Riyadh (UTC+3, no DST) so the budget resets at the same
 * 6 AM pre-warm boundary for every user regardless of their browser locale.
 *
 * Resilience: any read failure (table absent, RLS, offline) resolves to a
 * full budget rather than a locked button — the server enforcement is the
 * real gate, the client counter is advisory.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const THEME_DAILY_LIMIT = 3;

/** YYYY-MM-DD for the current Asia/Riyadh calendar day (UTC+3, fixed). */
export function riyadhDayKey(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
}

export interface ThemeQuota {
  used: number;
  remaining: number;
  limit: number;
  isExhausted: boolean;
  refetch: () => void;
}

export function useThemeQuota(): ThemeQuota {
  const [used, setUsed] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id;
      if (!uid) { setUsed(0); return; }

      const { data } = await supabase
        .from('ai_theme_quota')
        .select('used')
        .eq('user_id', uid)
        .eq('day_riyadh', riyadhDayKey())
        .maybeSingle();

      setUsed(typeof (data as any)?.used === 'number' ? (data as any).used : 0);
    } catch {
      setUsed(0); // advisory only — never lock the UI on a read failure
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remaining = Math.max(0, THEME_DAILY_LIMIT - used);
  return {
    used,
    remaining,
    limit: THEME_DAILY_LIMIT,
    isExhausted: remaining <= 0,
    refetch: () => { void load(); },
  };
}
