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

/** Jira parity: color cards by a field. 'none' = no colour stripe. */
export type CardColorMode = 'none' | 'priority' | 'issueType';

/**
 * All available quick filter preset keys.
 * The first 3 are always enabled by default; users can toggle any on/off
 * via View Settings (Jira: Board config → Quick Filters).
 */
export const ALL_QUICK_FILTERS = [
  { key: 'assigned-to-me',   label: 'Assigned to me',  defaultOn: true  },
  { key: 'flagged',          label: 'Flagged',          defaultOn: true  },
  { key: 'recently-updated', label: 'Recently updated', defaultOn: true  },
  { key: 'high-priority',    label: 'High priority',    defaultOn: false },
  { key: 'unassigned',       label: 'Unassigned',       defaultOn: false },
  { key: 'in-progress',      label: 'In progress',      defaultOn: false },
] as const;

export type QuickFilterKey = (typeof ALL_QUICK_FILTERS)[number]['key'];

/** Set of quick filter keys visible in the toolbar. Persisted per board. */
export type EnabledQuickFilters = Set<QuickFilterKey>;

export interface KanbanViewSettings {
  openInSidebar: boolean;
  showQuickFilters: boolean;
  showWorkSuggestions: boolean;
  visibleFields: VisibleFields;
  /** Card left-border colour rule (Jira: Board config → Card colors) */
  cardColorMode: CardColorMode;
  /**
   * Which quick-filter pills are visible in the toolbar.
   * Stored as an array in JSONB for serialization.
   */
  enabledQuickFilters: QuickFilterKey[];
}

const DEFAULT_ENABLED_QF: QuickFilterKey[] = ALL_QUICK_FILTERS
  .filter(f => f.defaultOn)
  .map(f => f.key);

const DEFAULT_SETTINGS: KanbanViewSettings = {
  openInSidebar: false,
  showQuickFilters: false,
  showWorkSuggestions: true,
  cardColorMode: 'none',
  enabledQuickFilters: DEFAULT_ENABLED_QF,
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
      const vf = (data.visible_fields ?? {}) as Record<string, unknown>;
      return {
        openInSidebar: data.open_in_sidebar ?? false,
        showQuickFilters: data.show_quick_filters ?? false,
        showWorkSuggestions: data.show_work_suggestions ?? true,
        cardColorMode: (vf.__cardColorMode as CardColorMode) ?? 'none',
        enabledQuickFilters: (vf.__enabledQF as QuickFilterKey[]) ?? DEFAULT_ENABLED_QF,
        visibleFields: { ...DEFAULT_SETTINGS.visibleFields, ...vf as Partial<VisibleFields> },
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
        // Piggyback extra settings into visible_fields JSONB to avoid a migration
        visible_fields: {
          ...newSettings.visibleFields,
          __cardColorMode: newSettings.cardColorMode,
          __enabledQF: newSettings.enabledQuickFilters,
        } as any,
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
