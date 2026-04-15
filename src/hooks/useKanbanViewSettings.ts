/**
 * useKanbanViewSettings — Persists per-user per-project kanban view settings
 * Uses kanban_view_settings table with optimistic updates + debounced save
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface VisibleFields {
  cardCover: boolean;
  workType: boolean;
  workItemKey: boolean;
  epic: boolean;
  linkedWorkItems: boolean;
  priority: boolean;
  assignee: boolean;
  fixVersions: boolean;
}

export interface KanbanViewSettings {
  openInSidebar: boolean;
  showQuickFilters: boolean;
  showWorkSuggestions: boolean;
  visibleFields: VisibleFields;
}

const DEFAULT_SETTINGS: KanbanViewSettings = {
  openInSidebar: false,
  showQuickFilters: false,
  showWorkSuggestions: true,
  visibleFields: {
    cardCover: true,
    workType: true,
    workItemKey: true,
    epic: true,
    linkedWorkItems: false,
    priority: true,
    assignee: true,
    fixVersions: true,
  },
};

export function useKanbanViewSettings(projectKey: string | undefined, userId: string | null | undefined) {
  const qc = useQueryClient();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const queryKey = ['kanban-view-settings', projectKey, userId];

  const { data: settings } = useQuery({
    queryKey,
    queryFn: async (): Promise<KanbanViewSettings> => {
      if (!userId || !projectKey) return DEFAULT_SETTINGS;
      const { data } = await supabase
        .from('kanban_view_settings')
        .select('open_in_sidebar, show_quick_filters, show_work_suggestions, visible_fields')
        .eq('user_id', userId)
        .eq('project_key', projectKey)
        .maybeSingle();

      if (!data) return DEFAULT_SETTINGS;
      return {
        openInSidebar: data.open_in_sidebar ?? false,
        showQuickFilters: data.show_quick_filters ?? false,
        showWorkSuggestions: data.show_work_suggestions ?? true,
        visibleFields: { ...DEFAULT_SETTINGS.visibleFields, ...(data.visible_fields as Partial<VisibleFields> ?? {}) },
      };
    },
    enabled: !!userId && !!projectKey,
    staleTime: 300_000,
  });

  const mutation = useMutation({
    mutationFn: async (newSettings: KanbanViewSettings) => {
      if (!userId || !projectKey) return;
      const row = {
        user_id: userId,
        project_key: projectKey,
        open_in_sidebar: newSettings.openInSidebar,
        show_quick_filters: newSettings.showQuickFilters,
        show_work_suggestions: newSettings.showWorkSuggestions,
        visible_fields: newSettings.visibleFields as any,
      };
      await supabase
        .from('kanban_view_settings')
        .upsert(row, { onConflict: 'user_id,project_key' });
    },
  });

  const updateSettings = useCallback((partial: Partial<KanbanViewSettings>) => {
    const current = qc.getQueryData<KanbanViewSettings>(queryKey) ?? DEFAULT_SETTINGS;
    const next: KanbanViewSettings = {
      ...current,
      ...partial,
      visibleFields: partial.visibleFields
        ? { ...current.visibleFields, ...partial.visibleFields }
        : current.visibleFields,
    };
    // Optimistic update
    qc.setQueryData(queryKey, next);
    // Debounced persist
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => mutation.mutate(next), 300);
  }, [qc, queryKey, mutation]);

  return {
    settings: settings ?? DEFAULT_SETTINGS,
    updateSettings,
  };
}
