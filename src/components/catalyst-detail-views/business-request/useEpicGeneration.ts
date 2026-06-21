/**
 * useEpicGeneration — Zustand store for Generate Epics flow on Business Request detail.
 *
 * State machine: idle → projectPicking → selecting → generating → reviewing → creating → done
 * Handles: project pick, artefact selection, edge function call, proposal review, epic creation.
 *
 * Hard cap: ≤10 epics per BR. Max 2 generations per BR.
 * Mirrors useStoryGeneration architecture.
 */
import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { createChildIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { catalystToast } from '@/lib/catalystToast';
import type { AssigneeChoice } from '@/components/shared/JiraTable';

export type EpicGenState =
  | 'idle'
  | 'projectPicking'
  | 'selecting'
  | 'generating'
  | 'reviewing'
  | 'creating'
  | 'done'
  | 'error';

export interface EpicProposal {
  title: string;
  summary: string;
  acceptanceCriteria: string[];
  brdRef: string;
  covers: string[];
}

export interface RequirementUnit {
  cuid: string;
  type: string;
  text: string;
}

export interface PickedProject {
  projectKey: string;
  projectId: string;
  projectName: string;
}

interface EpicGenerationStore {
  state: EpicGenState;
  brId: string | null;
  brTitle: string | null;
  brDescriptionText: string | null;
  pickedProject: PickedProject | null;
  proposals: EpicProposal[];
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

  openProjectPicker: (brId: string, brTitle: string, brDescriptionText: string | null) => void;
  setPickedProject: (p: PickedProject) => void;
  openArtefactPicker: () => void;
  reset: () => void;
  generate: (params: {
    brId: string;
    brTitle: string;
    descriptionText: string;
    attachmentIds: string[];
    selectedSources: string[];
  }) => Promise<void>;
  toggleSelection: (index: number) => void;
  selectAll: () => void;
  deselectAll: () => void;
  createSelected: (assignees?: Record<number, AssigneeChoice | null>) => Promise<void>;
  checkDisabled: (brId: string) => Promise<void>;
}

const MAX_EPICS = 10;
const MAX_GENERATIONS = 2;

export const useEpicGeneration = create<EpicGenerationStore>((set, get) => ({
  state: 'idle',
  brId: null,
  brTitle: null,
  brDescriptionText: null,
  pickedProject: null,
  proposals: [],
  requirementUnits: [],
  coveragePercent: 0,
  existingCount: 0,
  remainingSlots: MAX_EPICS,
  error: null,
  selectedIndices: new Set(),
  createdKeys: [],
  isDisabled: false,
  noContent: false,
  generationCount: 0,
  maxGenerations: MAX_GENERATIONS,
  maxGenerationsReached: false,

  openProjectPicker: (brId, brTitle, brDescriptionText) => {
    set({
      state: 'projectPicking',
      brId,
      brTitle,
      brDescriptionText,
      pickedProject: null,
      proposals: [],
      error: null,
      createdKeys: [],
      noContent: false,
    });
  },

  setPickedProject: (p) => {
    set({ pickedProject: p });
  },

  openArtefactPicker: () => {
    set({ state: 'selecting' });
  },

  reset: () => {
    set({
      state: 'idle',
      brId: null,
      brTitle: null,
      brDescriptionText: null,
      pickedProject: null,
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
      const { data, error } = await supabase.functions.invoke('ai-generate-epics', {
        body: {
          br_id: params.brId,
          br_title: params.brTitle,
          description_text: params.descriptionText,
          attachment_ids: params.attachmentIds,
          selected_sources: params.selectedSources,
        },
      });

      if (error) throw error;

      if (data?.disabled) {
        set({ state: 'idle', isDisabled: true, existingCount: data.existingCount ?? MAX_EPICS });
        catalystToast.info(`Maximum ${MAX_EPICS} epics already exist for this business request.`);
        return;
      }

      if (data?.noContent) {
        set({ state: 'idle', noContent: true });
        catalystToast.warning('Not enough details', 'Add a description or attach documentation to this business request.');
        return;
      }

      if (data?.maxGenerationsReached) {
        set({ state: 'idle', maxGenerationsReached: true, generationCount: data.generationCount ?? MAX_GENERATIONS });
        catalystToast.warning('Generation limit reached', `Maximum ${MAX_GENERATIONS} epic generations per business request.`);
        return;
      }

      if (data?.error) throw new Error(data.error);

      const epics: EpicProposal[] = data.epics ?? [];
      set({
        state: 'reviewing',
        proposals: epics,
        requirementUnits: data.requirementUnits ?? [],
        coveragePercent: data.coveragePercent ?? 0,
        existingCount: data.existingCount ?? 0,
        remainingSlots: data.remainingSlots ?? (MAX_EPICS - (data.existingCount ?? 0)),
        selectedIndices: new Set(epics.map((_: EpicProposal, i: number) => i)),
        generationCount: data.generationCount ?? 0,
        maxGenerations: data.maxGenerations ?? MAX_GENERATIONS,
      });

      if (epics.length === 0) {
        catalystToast.info('No new epics to generate — existing epics already cover this documentation.');
        set({ state: 'idle' });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Epic generation failed';
      set({ state: 'error', error: msg });
      catalystToast.error('Epic generation failed', msg);
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

  createSelected: async (assignees?: Record<number, AssigneeChoice | null>) => {
    const { proposals, selectedIndices, brId, pickedProject } = get();
    if (selectedIndices.size === 0) return;
    if (!brId || !pickedProject) {
      catalystToast.error('Missing context', 'Project or business request not set.');
      return;
    }

    set({ state: 'creating' });
    const created: string[] = [];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? undefined;

      for (const idx of [...selectedIndices].sort()) {
        const epic = proposals[idx];
        if (!epic) continue;

        const descParts = [epic.summary];
        if (epic.acceptanceCriteria.length > 0) {
          descParts.push('\n\n## Acceptance Criteria\n');
          descParts.push(...epic.acceptanceCriteria.map((ac) => `- ${ac}`));
        }
        if (epic.brdRef) descParts.push(`\n\nBRD ref: ${epic.brdRef}`);
        if (epic.covers.length > 0) descParts.push(`\nCovers: ${epic.covers.join(', ')}`);

        const result = await createChildIssue({
          parent: {
            issueKey: brId,
            source: 'catalyst',
          },
          summary: epic.title,
          issueType: 'Epic',
          projectKey: pickedProject.projectKey,
          projectId: pickedProject.projectId,
          reporterId,
          assigneeId: assignees?.[idx]?.id ?? null,
        });

        if (result?.issue_key) created.push(result.issue_key);
      }

      set({ state: 'done', createdKeys: created });
      catalystToast.success(
        `Created ${created.length} epic${created.length === 1 ? '' : 's'} in ${pickedProject.projectName}`,
      );

      if ((get().existingCount + created.length) >= MAX_EPICS) {
        set({ isDisabled: true });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create epics';
      set({ state: 'error', error: msg });
      catalystToast.error('Failed to create epics', msg);
    }
  },

  checkDisabled: async (brId) => {
    const { count } = await supabase
      .from('ph_issues')
      .select('id', { count: 'exact', head: true })
      .eq('parent_key', brId)
      .eq('issue_type', 'Epic');

    set({
      existingCount: count ?? 0,
      isDisabled: (count ?? 0) >= MAX_EPICS,
      remainingSlots: MAX_EPICS - (count ?? 0),
    });
  },
}));
