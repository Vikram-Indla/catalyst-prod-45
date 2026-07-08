/**
 * useTranslateSettings — Always/Ask/Never write-side translate preference
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S4b).
 *
 * Persists to the existing `user_preferences (user_id, scope, value jsonb)`
 * table under scope 'translate' — Plan Lock D1: the voice_dictation_settings
 * table from migration 20260620000003 does not exist live and is superseded.
 */
import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type TranslateMode = 'always' | 'ask' | 'never';

interface TranslatePrefs {
  mode: TranslateMode;
}

const DEFAULT_PREFS: TranslatePrefs = { mode: 'ask' };
const SCOPE = 'translate';

export function useTranslateSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['user-preferences', SCOPE, user?.id];

  const { data } = useQuery({
    queryKey,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<TranslatePrefs> => {
      const { data, error } = await supabase
        .from('user_preferences' as never)
        .select('value')
        .eq('user_id' as never, user!.id as never)
        .eq('scope' as never, SCOPE as never)
        .maybeSingle();
      if (error) throw error;
      const value = (data as { value?: Partial<TranslatePrefs> } | null)?.value;
      const mode = value?.mode;
      return mode === 'always' || mode === 'ask' || mode === 'never'
        ? { mode }
        : DEFAULT_PREFS;
    },
  });

  const setMode = useCallback(
    async (mode: TranslateMode) => {
      if (!user?.id) return;
      queryClient.setQueryData(queryKey, { mode });
      const { error } = await supabase
        .from('user_preferences' as never)
        .upsert(
          { user_id: user.id, scope: SCOPE, value: { mode } } as never,
          { onConflict: 'user_id,scope' },
        );
      if (error) {
        // Roll back the optimistic write; the banner falls back to server truth.
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, queryClient],
  );

  return { mode: data?.mode ?? DEFAULT_PREFS.mode, setMode };
}
