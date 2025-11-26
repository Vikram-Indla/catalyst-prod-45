import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFeatureFlag(flagKey: string): boolean {
  const { data: flag } = useQuery({
    queryKey: ['feature-flag', flagKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_key', flagKey)
        .single();

      if (error) {
        console.warn(`Feature flag ${flagKey} not found:`, error);
        return { enabled: false };
      }

      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return flag?.enabled ?? false;
}
