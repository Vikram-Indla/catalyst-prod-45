import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useMyResource() {
  const { user, loading: authLoading } = useAuth();

  const query = useQuery({
    queryKey: ['my-resource', user?.id ?? null],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resource_inventory')
        .select('id')
        .eq('profile_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data?.id as string | undefined) ?? null;
    },
  });

  return {
    resourceId: query.data ?? null,
    isLoading: authLoading || (!!user?.id && query.isLoading),
    isError: query.isError,
    error: (query.error as Error | null) ?? null,
  };
}
