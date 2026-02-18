// =====================================================
// TIMELINE REALTIME — Supabase realtime subscription
// =====================================================

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTimelineRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('ph-initiatives-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ph_initiatives',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ph-timeline-initiatives'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
