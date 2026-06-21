/**
 * useSubtaskGeneration — Zustand store for the Generate Subtasks flow on Story detail.
 *
 * State machine: idle → generating → reviewing → creating → done
 * Reuses ai-suggest-children edge function (existing AI infrastructure).
 * Hard cap: ≤10 subtasks per story.
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { createChildIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { catalystToast } from '@/lib/catalystToast';

export type SubtaskGenState = 'idle' | 'generating' | 'reviewing' | 'creating' | 'done' | 'error';

export interface SubtaskProposal {
  title: string;
  type: string;
}

const ALLOWED_CHILD_TYPES = ['Sub-task', 'Backend', 'Frontend', 'Integration'];
const MAX_SUBTASKS = 10;

interface SubtaskGenerationStore {
  state: SubtaskGenState;
  storyKey: string | null;
  storySummary: string | null;
  projectKey: string | null;
  projectId: string | null;
  source: 'jira' | 'catalyst';
  proposals: SubtaskProposal[];
  existingCount: number;
  selectedIndices: Set<number>;
  createdKeys: string[];
  error: string | null;
  isDisabled: boolean;

  generate: (params: {
    storyKey: string;
    storySummary: string;
    projectKey: string;
    projectId?: string | null;
    source: 'jira' | 'catalyst';
  }) => Promise<void>;
  toggleSelection: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  createSelected: () => Promise<void>;
  reset: () => void;
  checkDisabled: (storyKey: string) => Promise<void>;
}

export const useSubtaskGeneration = create<SubtaskGenerationStore>((set, get) => ({
  state: 'idle',
  storyKey: null,
  storySummary: null,
  projectKey: null,
  projectId: null,
  source: 'jira',
  proposals: [],
  existingCount: 0,
  selectedIndices: new Set(),
  createdKeys: [],
  error: null,
  isDisabled: false,

  generate: async (params) => {
    set({
      state: 'generating',
      error: null,
      storyKey: params.storyKey,
      storySummary: params.storySummary,
      projectKey: params.projectKey,
      projectId: params.projectId ?? null,
      source: params.source,
    });

    try {
      // Fetch existing subtask summaries to avoid duplication
      const { data: existingRows } = await supabase
        .from('ph_issues')
        .select('summary')
        .eq('parent_key', params.storyKey)
        .in('issue_type', ALLOWED_CHILD_TYPES);

      const siblingCount = existingRows?.length ?? 0;
      set({ existingCount: siblingCount });

      if (siblingCount >= MAX_SUBTASKS) {
        set({ state: 'idle', isDisabled: true });
        catalystToast.info(`Maximum ${MAX_SUBTASKS} subtasks already exist for this story.`);
        return;
      }

      const siblingSummaries = (existingRows ?? [])
        .map((r: { summary: string | null }) => r.summary ?? '')
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke('ai-suggest-children', {
        body: {
          parent_summary: params.storySummary,
          parent_type: 'Story',
          allowed_child_types: ALLOWED_CHILD_TYPES,
          sibling_summaries: siblingSummaries,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const suggestions: SubtaskProposal[] = (data?.suggestions ?? []).slice(
        0,
        MAX_SUBTASKS - siblingCount,
      );

      if (suggestions.length === 0) {
        set({ state: 'idle' });
        catalystToast.info('No new subtasks to suggest — story is already fully decomposed.');
        return;
      }

      set({
        state: 'reviewing',
        proposals: suggestions,
        selectedIndices: new Set(suggestions.map((_, i) => i)),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Subtask generation failed';
      set({ state: 'error', error: msg });
      catalystToast.error('Subtask generation failed', msg);
    }
  },

  toggleSelection: (index) => {
    const next = new Set(get().selectedIndices);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    set({ selectedIndices: next });
  },

  selectAll: () => {
    set({ selectedIndices: new Set(get().proposals.map((_, i) => i)) });
  },

  deselectAll: () => {
    set({ selectedIndices: new Set() });
  },

  createSelected: async () => {
    const { proposals, selectedIndices, storyKey, projectKey, projectId, source } = get();
    if (selectedIndices.size === 0 || !storyKey || !projectKey) return;

    set({ state: 'creating' });
    const created: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? undefined;

      for (const idx of [...selectedIndices].sort()) {
        const subtask = proposals[idx];
        if (!subtask) continue;

        const result = await createChildIssue({
          parent: { issueKey: storyKey, source },
          summary: subtask.title,
          issueType: subtask.type,
          projectKey,
          projectId: projectId ?? undefined,
          reporterId,
        });

        if (result?.issue_key) created.push(result.issue_key);
      }

      set({ state: 'done', createdKeys: created });
      catalystToast.success(
        `Created ${created.length} subtask${created.length === 1 ? '' : 's'} for ${storyKey}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create subtasks';
      set({ state: 'error', error: msg });
      catalystToast.error('Failed to create subtasks', msg);
    }
  },

  reset: () => {
    set({
      state: 'idle',
      storyKey: null,
      storySummary: null,
      projectKey: null,
      projectId: null,
      proposals: [],
      error: null,
      selectedIndices: new Set(),
      createdKeys: [],
    });
  },

  checkDisabled: async (storyKey) => {
    const { count } = await supabase
      .from('ph_issues')
      .select('id', { count: 'exact', head: true })
      .eq('parent_key', storyKey)
      .in('issue_type', ALLOWED_CHILD_TYPES);

    set({
      existingCount: count ?? 0,
      isDisabled: (count ?? 0) >= MAX_SUBTASKS,
    });
  },
}));
