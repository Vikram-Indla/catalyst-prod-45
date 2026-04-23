// @ts-nocheck
/**
 * useUWVPrefs — load and persist column visibility/widths/sort/density per
 * (user, view_key) into user_view_preferences. localStorage is used as a
 * fast-path cache; Supabase is the source of truth across devices.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UWVPrefs, UWVColumn } from './uwv.types';
import { DEFAULT_COLUMNS } from './uwv.utils';

export function useUWVPrefs(viewKey: string) {
  const qc = useQueryClient();
  const localKey = `uwvPrefs:v1:${viewKey}`;

  const defaultPrefs: UWVPrefs = {
    version: 1,
    columns: DEFAULT_COLUMNS.map((c) => ({
      fieldId: c.fieldId,
      width: c.width,
      visible: c.visible,
    })),
    sort: [{ fieldId: 'key', direction: 'asc' }],
    density: 'comfortable',
  };

  const { data: prefs = defaultPrefs } = useQuery({
    queryKey: ['uwv-prefs', viewKey],
    queryFn: async (): Promise<UWVPrefs> => {
      // 1) Local cache (instant render).
      try {
        const cached = localStorage.getItem(localKey);
        if (cached) {
          const parsed = JSON.parse(cached) as UWVPrefs;
          if (parsed?.version === 1) return parsed;
        }
      } catch {
        /* ignore corrupt cache */
      }

      // 2) Supabase (source of truth).
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return defaultPrefs;

      const { data } = await (supabase as any)
        .from('user_view_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .eq('view_key', viewKey)
        .maybeSingle();

      const remote = (data?.preferences as UWVPrefs) ?? defaultPrefs;
      try {
        localStorage.setItem(localKey, JSON.stringify(remote));
      } catch {
        /* quota exceeded */
      }
      return remote;
    },
  });

  const { mutate: savePrefs } = useMutation({
    mutationFn: async (updated: UWVPrefs) => {
      try {
        localStorage.setItem(localKey, JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return updated;

      await (supabase as any)
        .from('user_view_preferences')
        .upsert(
          {
            user_id: user.id,
            view_key: viewKey,
            preferences: updated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,view_key' },
        );
      return updated;
    },
    onSuccess: (updated) => qc.setQueryData(['uwv-prefs', viewKey], updated),
  });

  // Merge persisted slice (visibility + width) over registry defaults so new
  // columns added to DEFAULT_COLUMNS appear automatically.
  const columns: UWVColumn[] = DEFAULT_COLUMNS.map((def) => {
    const saved = prefs.columns.find((c) => c.fieldId === def.fieldId);
    return saved ? { ...def, ...saved } : def;
  });

  return { prefs, columns, savePrefs };
}
