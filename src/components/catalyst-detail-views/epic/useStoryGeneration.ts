/**
 * useStoryGeneration — Zustand store for the Generate Stories flow on Epic detail.
 *
 * State machine: idle → selecting → generating → reviewing → creating → done
 * Handles: artefact selection, edge function call, proposal review, child creation.
 *
 * Idempotent: same content_hash → cached proposals (no AI call).
 * Hard cap: ≤25 stories per epic.
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { createChildIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { catalystToast } from '@/lib/catalystToast';

export type GenerationState = 'idle' | 'selecting' | 'generating' | 'reviewing' | 'creating' | 'done' | 'error';

export interface StoryProposal {
  title: string;
  userStory: string;
  acceptanceCriteria: string[];
  brdRef: string;
  covers: string[];
}

export interface RequirementUnit {
  cuid: string;
  type: string;
  text: string;
}

interface StoryGenerationStore {
  state: GenerationState;
  epicKey: string | null;
  epicSummary: string | null;
  descriptionText: string | null;
  proposals: StoryProposal[];
  requirementUnits: RequirementUnit[];
  coveragePercent: number;
  existingCount: number;
  remainingSlots: number;
  error: string | null;
  selectedIndices: Set<number>;
  createdKeys: string[];
  isDisabled: boolean;
  noContent: boolean;
  generationCount: number;
  maxGenerations: number;
  maxGenerationsReached: boolean;

  // Actions
  openPicker: (epicKey: string, epicSummary: string, descriptionText: string | null) => void;
  reset: () => void;
  generate: (params: {
    epicKey: string;
    epicSummary: string;
    descriptionText: string;
    attachmentIds: string[];
    selectedSources: string[];
  }) => Promise<void>;
  toggleSelection: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  createSelected: (params: {
    parentIssueKey: string;
    parentSource: 'jira' | 'catalyst';
    projectKey: string;
    projectId?: string;
  }) => Promise<void>;
  checkDisabled: (epicKey: string) => Promise<void>;
}

const MAX_STORIES = 25;

export const useStoryGeneration = create<StoryGenerationStore>((set, get) => ({
  state: 'idle',
  epicKey: null,
  epicSummary: null,
  descriptionText: null,
  proposals: [],
  requirementUnits: [],
  coveragePercent: 0,
  existingCount: 0,
  remainingSlots: MAX_STORIES,
  error: null,
  selectedIndices: new Set(),
  createdKeys: [],
  isDisabled: false,
  noContent: false,
  generationCount: 0,
  maxGenerations: 2,
  maxGenerationsReached: false,

  openPicker: (epicKey, epicSummary, descriptionText) => {
    set({
      state: 'selecting',
      epicKey,
      epicSummary,
      descriptionText,
      proposals: [],
      error: null,
      createdKeys: [],
      noContent: false,
    });
  },

  reset: () => {
    set({
      state: 'idle',
      epicKey: null,
      epicSummary: null,
      descriptionText: null,
      proposals: [],
      requirementUnits: [],
      coveragePercent: 0,
      error: null,
      selectedIndices: new Set(),
      createdKeys: [],
      noContent: false,
    });
  },

  generate: async (params) => {
    set({ state: 'generating', error: null });
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-stories', {
        body: {
          epic_key: params.epicKey,
          epic_summary: params.epicSummary,
          description_text: params.descriptionText,
          attachment_ids: params.attachmentIds,
          selected_sources: params.selectedSources,
        },
      });

      if (error) throw error;

      if (data?.disabled) {
        set({ state: 'idle', isDisabled: true, existingCount: data.existingCount ?? MAX_STORIES });
        catalystToast.info(`Maximum ${MAX_STORIES} stories already exist for this epic.`);
        return;
      }

      if (data?.noContent) {
        set({ state: 'idle', noContent: true });
        catalystToast.warning('Not enough details', 'Add a description or attach documentation to this epic.');
        return;
      }

      if (data?.maxGenerationsReached) {
        set({ state: 'idle', maxGenerationsReached: true, generationCount: data.generationCount ?? 2 });
        catalystToast.warning('Generation limit reached', 'Maximum 2 story generations per epic. Delete existing stories or contact admin to reset.');
        return;
      }

      if (data?.error) throw new Error(data.error);

      const stories: StoryProposal[] = data.stories ?? [];
      set({
        state: 'reviewing',
        proposals: stories,
        requirementUnits: data.requirementUnits ?? [],
        coveragePercent: data.coveragePercent ?? 0,
        existingCount: data.existingCount ?? 0,
        remainingSlots: data.remainingSlots ?? (MAX_STORIES - (data.existingCount ?? 0)),
        selectedIndices: new Set(stories.map((_: StoryProposal, i: number) => i)),
        generationCount: data.generationCount ?? 0,
        maxGenerations: data.maxGenerations ?? 2,
      });

      if (stories.length === 0) {
        catalystToast.info('No new stories to generate — existing stories already cover this documentation.');
        set({ state: 'idle' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Story generation failed';
      set({ state: 'error', error: msg });
      catalystToast.error('Story generation failed', msg);
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

  createSelected: async (params) => {
    const { proposals, selectedIndices } = get();
    if (selectedIndices.size === 0) return;

    set({ state: 'creating' });
    const created: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? undefined;

      for (const idx of [...selectedIndices].sort()) {
        const story = proposals[idx];
        if (!story) continue;

        // Build description with user story + AC + BRD ref
        const descParts = [story.userStory];
        if (story.acceptanceCriteria.length > 0) {
          descParts.push('\n\n## Acceptance Criteria\n');
          descParts.push(...story.acceptanceCriteria.map((ac) => `- ${ac}`));
        }
        if (story.brdRef) {
          descParts.push(`\n\nBRD ref: ${story.brdRef}`);
        }
        if (story.covers.length > 0) {
          descParts.push(`\nCovers: ${story.covers.join(', ')}`);
        }

        const result = await createChildIssue({
          parent: {
            issueKey: params.parentIssueKey,
            source: params.parentSource,
          },
          summary: story.title,
          issueType: 'Story',
          projectKey: params.projectKey,
          projectId: params.projectId,
          reporterId,
        });

        if (result?.issue_key) created.push(result.issue_key);
      }

      set({ state: 'done', createdKeys: created });
      catalystToast.success(
        `Created ${created.length} stor${created.length === 1 ? 'y' : 'ies'} for ${get().epicKey}`,
      );

      // Update cache with created keys
      if (get().epicKey) {
        await supabase
          .from('story_generation_cache')
          .update({ created_story_keys: created })
          .eq('epic_key', get().epicKey);
      }

      // Check if now at max
      if ((get().existingCount + created.length) >= MAX_STORIES) {
        set({ isDisabled: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create stories';
      set({ state: 'error', error: msg });
      catalystToast.error('Failed to create stories', msg);
    }
  },

  checkDisabled: async (epicKey) => {
    const { count } = await supabase
      .from('ph_issues')
      .select('id', { count: 'exact', head: true })
      .eq('parent_key', epicKey)
      .eq('issue_type', 'Story');

    set({
      existingCount: count ?? 0,
      isDisabled: (count ?? 0) >= MAX_STORIES,
      remainingSlots: MAX_STORIES - (count ?? 0),
    });
  },
}));
