/**
 * useFeatureBacklogPreferences — Supabase-persisted column visibility
 * Stores preferences in user_preferences table with scope:
 * "program:{programId}:feature-backlog:columns"
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FeatureBacklogPreferences {
  visible_columns: string[];
  last_view: 'list' | 'kanban';
  page_size: number;
}

const DEFAULT_PREFERENCES: FeatureBacklogPreferences = {
  visible_columns: ['key', 'summary', 'project', 'epic', 'status', 'priority', 'assignee', 'updated'],
  last_view: 'list',
  page_size: 50,
};

export function useFeatureBacklogPreferences(programId: string) {
  const queryClient = useQueryClient();
  const scope = `program:${programId}:feature-backlog:columns`;

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['feature-backlog-preferences', programId],
    queryFn: async (): Promise<FeatureBacklogPreferences> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return DEFAULT_PREFERENCES;

      const { data, error } = await (supabase.from('user_preferences') as any)
        .select('value')
        .eq('user_id', user.id)
        .eq('scope', scope)
        .maybeSingle();

      if (error) {
        console.error('Failed to fetch preferences:', error);
        return DEFAULT_PREFERENCES;
      }

      return (data?.value as unknown as FeatureBacklogPreferences) || DEFAULT_PREFERENCES;
    },
    enabled: !!programId,
    staleTime: 0,
  });

  const updatePreferences = useMutation({
    mutationFn: async (updates: Partial<FeatureBacklogPreferences>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const newValue = { ...preferences, ...updates };

      const { error } = await (supabase.from('user_preferences') as any)
        .upsert({
          user_id: user.id,
          scope,
          value: newValue,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,scope',
        });

      if (error) throw error;
      return newValue;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-backlog-preferences', programId] });
    },
  });

  return {
    preferences: preferences || DEFAULT_PREFERENCES,
    isLoading,
    updatePreferences: updatePreferences.mutate,
    isUpdating: updatePreferences.isPending,
  };
}
