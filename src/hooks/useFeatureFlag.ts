import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

export type FeatureFlagKey = 'home_v2_enabled' | 'home_v2_shadow_mode';

export function useFeatureFlag(flagKey: string): boolean {
  const { data: flag } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await typedQuery('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .single();

      if (error) {
        console.warn(`Feature flag ${flagKey} not found:`, error);
        return { enabled: false };
      }

      return data as { enabled: boolean };
    },
    staleTime: 5 * 60 * 1000,
  });

  return flag?.enabled ?? false;
}

export function useFeatureFlags(flagKeys: FeatureFlagKey[]): {
  flags: Record<FeatureFlagKey, boolean>;
  isLoading: boolean;
} {
  const { data, isLoading } = useQuery({
    queryKey: ['feature-flags', flagKeys.join(',')],
    queryFn: async (): Promise<Record<string, boolean>> => {
      const { data, error } = await typedQuery('feature_flags')
        .select('flag_key, enabled')
        .in('flag_key', flagKeys);

      if (error) return {};
      return ((data || []) as any[]).reduce((acc, flag: any) => {
        acc[flag.flag_key] = flag.enabled;
        return acc;
      }, {} as Record<string, boolean>);
    },
    staleTime: 5 * 60 * 1000,
  });

  const flags = flagKeys.reduce((acc, key) => {
    acc[key] = data?.[key] ?? false;
    return acc;
  }, {} as Record<FeatureFlagKey, boolean>);

  return { flags, isLoading };
}
