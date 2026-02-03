import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePlanSubscription(planId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!planId) return;

    const channel = supabase
      .channel(`plan:${planId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planhub_tasks', filter: `plan_id=eq.${planId}` },
        (payload) => {
          console.log('Task change:', payload);
          queryClient.invalidateQueries({ queryKey: ['planhub', 'tasks', planId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planhub_resources', filter: `plan_id=eq.${planId}` },
        (payload) => {
          console.log('Resource change:', payload);
          queryClient.invalidateQueries({ queryKey: ['planhub', 'resources', planId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'planhub_comments', filter: `plan_id=eq.${planId}` },
        (payload) => {
          console.log('Comment change:', payload);
          queryClient.invalidateQueries({ queryKey: ['planhub', 'comments', planId] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'planhub_plans', filter: `id=eq.${planId}` },
        (payload) => {
          console.log('Plan update:', payload);
          queryClient.invalidateQueries({ queryKey: ['planhub', 'plan', planId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [planId, queryClient]);
}

export function useSettingsSubscription() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('planhub-settings')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'planhub_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['planhub', 'settings'] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'planhub_ai_config' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['planhub', 'ai-config'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
