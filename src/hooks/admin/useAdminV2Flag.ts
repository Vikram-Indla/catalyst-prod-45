/**
 * useAdminV2Flag — gate hook for the /admin/v2 surface.
 *
 * Reads `feature_flags` by `module_key` and returns the OR of `enabled` and
 * `is_enabled`. Both columns exist in the schema for historical reasons; the
 * legacy `useFeatureFlag` hook queries `flag_key` which does not exist on
 * this table — do not use it for admin v2 flags.
 *
 * Phase 0 ships `admin_v2_enabled` defaulting to FALSE. Flip it via Lovable
 * SQL when each section's content is real.
 */
import { useQuery } from '@tanstack/react-query';
import { typedQuery } from '@/integrations/supabase/client';

interface AdminV2FlagRow {
  enabled: boolean | null;
  is_enabled: boolean | null;
}

export function useAdminV2Flag(moduleKey: string): boolean {
  const { data } = useQuery<AdminV2FlagRow | null>({
    queryKey: ['admin-v2-flag', moduleKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('feature_flags')
        .select('enabled, is_enabled')
        .eq('module_key', moduleKey)
        .maybeSingle();
      if (error) {
        // Don't throw — a missing flag should fail closed (return false), not
        // surface a hard error to consumers that just want a boolean gate.
        console.warn('[useAdminV2Flag] read failed:', error);
        return null;
      }
      return data as AdminV2FlagRow | null;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!data) return false;
  return Boolean(data.enabled || data.is_enabled);
}
