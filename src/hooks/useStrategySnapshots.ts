import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StrategySnapshot {
  id: string;
  name: string;
  description?: string;
  mission?: string;
  vision?: string;
  values?: string[];
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useStrategySnapshots() {
  return useQuery({
    queryKey: ['strategy-snapshots'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as StrategySnapshot[];
    },
  });
}

export function useStrategySnapshot(snapshotId?: string) {
  return useQuery({
    queryKey: ['strategy-snapshot', snapshotId],
    queryFn: async () => {
      if (!snapshotId) return null;
      
      const { data, error } = await supabase
        .from('strategy_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();

      if (error) throw error;
      return data as StrategySnapshot;
    },
    enabled: !!snapshotId,
  });
}
