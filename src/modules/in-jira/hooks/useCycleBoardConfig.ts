/**
 * Cycle Board Config Hook
 * Manages board_configs for test_cycle_board type
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export interface BoardColumn {
  id: string;
  title: string;
  statusKey: string;
  color: string;
  bgColor: string;
  icon?: string;
  order: number;
}

export interface BoardConfig {
  id: string;
  scope_type: 'global' | 'program' | 'project';
  scope_id: string | null;
  board_type: string;
  columns_json: BoardColumn[];
  swimlane_rule: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CYCLE_COLUMNS: BoardColumn[] = [
  { id: 'not_run', title: 'Not Run', statusKey: 'not_run', color: 'text-text-tertiary', bgColor: 'bg-surface-3', icon: 'circle', order: 0 },
  { id: 'passed', title: 'Passed', statusKey: 'passed', color: 'text-status-success', bgColor: 'bg-status-success/10', icon: 'check-circle', order: 1 },
  { id: 'failed', title: 'Failed', statusKey: 'failed', color: 'text-status-error', bgColor: 'bg-status-error/10', icon: 'x-circle', order: 2 },
  { id: 'blocked', title: 'Blocked', statusKey: 'blocked', color: 'text-status-warning', bgColor: 'bg-status-warning/10', icon: 'alert-triangle', order: 3 },
  { id: 'skipped', title: 'Skipped', statusKey: 'skipped', color: 'text-text-quaternary', bgColor: 'bg-surface-2', icon: 'skip-forward', order: 4 },
];

export function useCycleBoardConfig(programId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['cycle-board-config', programId],
    queryFn: async () => {
      // Try to find program-specific config first
      const { data, error } = await supabase
        .from('board_configs')
        .select('*')
        .eq('board_type', 'test_cycle_board' as any)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Find matching config - prefer program-specific
      const programConfig = data?.find((c: any) => c.scope_id === programId);
      const globalConfig = data?.find((c: any) => c.scope_type === 'program' && !c.scope_id);
      const foundConfig = programConfig || globalConfig || data?.[0];

      if (foundConfig) {
        return {
          ...foundConfig,
          columns_json: (foundConfig.columns_json as unknown as BoardColumn[]) || DEFAULT_CYCLE_COLUMNS,
        } as BoardConfig;
      }

      // Return default config if none exists
      return {
        id: '',
        scope_type: 'program' as const,
        scope_id: null,
        board_type: 'test_cycle_board',
        columns_json: DEFAULT_CYCLE_COLUMNS,
        swimlane_rule: null,
        created_at: '',
        updated_at: '',
      };
    },
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (columns: BoardColumn[]) => {
      if (!user) throw new Error('Not authenticated');

      // Use program scope type
      const scopeId = programId || null;

      // Check for existing config
      const { data: existing } = await supabase
        .from('board_configs')
        .select('id')
        .eq('board_type', 'test_cycle_board' as any)
        .eq('scope_type', 'program')
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('board_configs')
          .update({
            columns_json: columns as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('board_configs')
          .insert({
            board_type: 'test_cycle_board' as any,
            scope_type: 'program',
            scope_id: scopeId,
            columns_json: columns as any,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycle-board-config'] });
      toast.success('Board configuration saved');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    columns: config?.columns_json || DEFAULT_CYCLE_COLUMNS,
    isLoading,
    saveColumns: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  };
}
