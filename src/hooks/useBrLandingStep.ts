import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface LandingStep {
  id: string;
  value: string;
  label: string;
  sort_order: number;
}

export function useBrLandingStep() {
  const { user, loading } = useAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['br-landing-step'],
    enabled: !loading && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('demand_process_steps')
        .select('id, value, label, sort_order')
        .eq('is_landing', true)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return (data as LandingStep | null) ?? null;
    },
  });

  return {
    landingStep: data ?? null,
    isLoading: loading || isLoading,
    isError,
    error,
  };
}
