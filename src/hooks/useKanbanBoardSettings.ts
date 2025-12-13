import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface KanbanColumn {
  id: string;
  name: string;
  color: string;
  category: 'todo' | 'in_progress' | 'done' | 'blocked';
  statuses: string[];
  wipLimit: number | null;
  sortOrder: number;
}

export interface SwimLaneQuery {
  id: string;
  name: string;
  query: string;
  enabled: boolean;
  sortOrder: number;
}

export type SwimLaneMethod = 'none' | 'assignee' | 'priority' | 'department' | 'custom';

export interface SwimLaneConfig {
  method: SwimLaneMethod;
  queries: SwimLaneQuery[];
}

export interface SwimLaneConfig {
  method: 'none' | 'assignee' | 'priority' | 'department' | 'custom';
  queries: SwimLaneQuery[];
}

export interface QuickFilter {
  id: string;
  name: string;
  query: string;
  enabled: boolean;
  sortOrder: number;
}

export interface CardLayout {
  visibleFields: string[];
}

export type CardColorMethod = 'priority' | 'status' | 'age' | 'none';

export interface CardColors {
  method: CardColorMethod;
  priorityColors: Record<string, string>;
}

export interface KanbanBoardSettings {
  columns: KanbanColumn[];
  swimlaneConfig: SwimLaneConfig;
  quickFilters: QuickFilter[];
  cardLayout: CardLayout;
  cardColors: CardColors;
}

export interface KanbanBoardSettingsRow {
  id: string;
  scope: string;
  scope_id: string | null;
  settings_json: KanbanBoardSettings;
  version: number;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

const DEFAULT_SETTINGS: KanbanBoardSettings = {
  columns: [
    { id: 'col_new', name: 'New Request', color: '#9ca3af', category: 'todo', statuses: ['NEW_REQUEST', 'NEW_DEMAND'], wipLimit: null, sortOrder: 0 },
    { id: 'col_analyse', name: 'Analyse', color: '#3b82f6', category: 'in_progress', statuses: ['IN_REVIEW', 'ANALYSE'], wipLimit: null, sortOrder: 1 },
    { id: 'col_approved', name: 'Approved', color: '#22c55e', category: 'in_progress', statuses: ['APPROVED'], wipLimit: null, sortOrder: 2 },
    { id: 'col_ready', name: 'Ready to Implement', color: '#8b5cf6', category: 'in_progress', statuses: ['READY_TO_IMPLEMENT'], wipLimit: null, sortOrder: 3 },
    { id: 'col_implement', name: 'Implement', color: '#f59e0b', category: 'in_progress', statuses: ['IMPLEMENT'], wipLimit: null, sortOrder: 4 },
    { id: 'col_closed', name: 'Closed', color: '#10b981', category: 'done', statuses: ['CLOSED'], wipLimit: null, sortOrder: 5 },
    { id: 'col_rejected', name: 'Rejected', color: '#ef4444', category: 'done', statuses: ['REJECTED'], wipLimit: null, sortOrder: 6 },
    { id: 'col_onhold', name: 'On-Hold', color: '#6b7280', category: 'blocked', statuses: ['ON_HOLD'], wipLimit: null, sortOrder: 7 },
  ],
  swimlaneConfig: {
    method: 'none',
    queries: [],
  },
  quickFilters: [
    { id: 'qf_my_items', name: 'My Items', query: 'assignee:me', enabled: true, sortOrder: 0 },
    { id: 'qf_high_priority', name: 'High Priority', query: 'priority:high', enabled: true, sortOrder: 1 },
    { id: 'qf_overdue', name: 'Overdue', query: 'due:<today', enabled: true, sortOrder: 2 },
  ],
  cardLayout: {
    visibleFields: ['priority', 'assignee', 'due_date', 'score'],
  },
  cardColors: {
    method: 'priority',
    priorityColors: {
      critical: '#ef4444',
      high: '#f97316',
      medium: '#eab308',
      low: '#22c55e',
    },
  },
};

export function useKanbanBoardSettings(scope: string = 'product', scopeId?: string) {
  return useQuery({
    queryKey: ['kanban-board-settings', scope, scopeId],
    queryFn: async () => {
      let query = supabase
        .from('kanban_board_settings')
        .select('*')
        .eq('scope', scope);

      if (scopeId) {
        query = query.eq('scope_id', scopeId);
      } else {
        query = query.is('scope_id', null);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return defaults
          return { settings: DEFAULT_SETTINGS, id: null, version: 0 };
        }
        throw error;
      }

      return {
        settings: data.settings_json as unknown as KanbanBoardSettings,
        id: data.id,
        version: data.version,
      };
    },
  });
}

export function useSaveKanbanBoardSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scope,
      scopeId,
      settings,
      existingId,
    }: {
      scope: string;
      scopeId?: string;
      settings: KanbanBoardSettings;
      existingId?: string | null;
    }) => {
      if (existingId) {
        // Update existing
        const { data, error } = await supabase
          .from('kanban_board_settings')
          .update({
            settings_json: settings as unknown as Json,
          })
          .eq('id', existingId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('kanban_board_settings')
          .insert({
            scope,
            scope_id: scopeId || null,
            settings_json: settings as unknown as Json,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['kanban-board-settings', variables.scope, variables.scopeId],
      });
      toast.success('Kanban settings saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save kanban settings:', error);
      toast.error('Failed to save kanban settings');
    },
  });
}

export { DEFAULT_SETTINGS };
