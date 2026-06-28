/**
 * WorkItemPlannerModal — unified BR→Epic→Story→Subtask orchestration wizard.
 *
 * 3 sequential levels, each using ProposalTable for review.
 * Level 2 (stories) and Level 3 (subtasks) iterate over items created in
 * the previous level. User can skip any level.
 *
 * Uses local state only (not global Zustand stores) to avoid conflicts
 * with the per-view GenerateEpics / GenerateStories / GenerateSubtasks buttons.
 */
import React, { useEffect, useCallback, useMemo, useReducer } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { supabase } from '@/integrations/supabase/client';
import { createChildIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { catalystToast } from '@/lib/catalystToast';
import {
  startPlannerRun,
  completePlannerRun,
  auditCreatedWorkItems,
} from '@/lib/workItemPlannerService';
import { ProposalTable, type ProposalRow } from './ProposalTable';
import { useProposalAssignees } from '@/hooks/useProposalAssignees';
import type { AssigneeChoice } from '@/components/shared/JiraTable';
import type { EpicProposal } from '../business-request/useEpicGeneration';
import type { StoryProposal } from '../epic/useStoryGeneration';
import type { SubtaskProposal } from '../story/useSubtaskGeneration';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep =
  | 'generating_epics'
  | 'reviewing_epics'
  | 'creating_epics'
  | 'generating_stories'
  | 'reviewing_stories'
  | 'creating_stories'
  | 'generating_subtasks'
  | 'reviewing_subtasks'
  | 'creating_subtasks'
  | 'done'
  | 'error';

interface CreatedEpic {
  key: string;
  summary: string;
  projectKey: string;
  projectId?: string;
  source: 'catalyst';
}

interface CreatedStory {
  key: string;
  summary: string;
  parentKey: string;
  projectKey: string;
  projectId?: string;
  source: 'catalyst';
}

interface WizardState {
  step: WizardStep;
  error: string | null;

  // Epic level
  epicProposals: EpicProposal[];
  epicSelection: Set<number>;
  epicAssignees: Record<number, AssigneeChoice | null>;
  createdEpics: CreatedEpic[];

  // Story level — iterates over createdEpics
  currentEpicIdx: number;
  storyProposals: StoryProposal[];
  storySelection: Set<number>;
  storyAssignees: Record<number, AssigneeChoice | null>;
  createdStories: CreatedStory[];

  // Subtask level — iterates over createdStories
  currentStoryIdx: number;
  subtaskProposals: SubtaskProposal[];
  subtaskSelection: Set<number>;
  subtaskAssignees: Record<number, AssigneeChoice | null>;
  createdSubtaskKeys: string[];
}

const INIT: WizardState = {
  step: 'generating_epics',
  error: null,
  epicProposals: [],
  epicSelection: new Set(),
  epicAssignees: {},
  createdEpics: [],
  currentEpicIdx: 0,
  storyProposals: [],
  storySelection: new Set(),
  storyAssignees: {},
  createdStories: [],
  currentStoryIdx: 0,
  subtaskProposals: [],
  subtaskSelection: new Set(),
  subtaskAssignees: {},
  createdSubtaskKeys: [],
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface WorkItemPlannerModalProps {
  brId: string;
  brTitle: string;
  brDescriptionText: string | null;
  projectKey: string;
  projectId: string;
  projectName: string;
  onClose: () => void;
}

const ALLOWED_SUBTASK_TYPES = ['Sub-task', 'Backend', 'Frontend', 'Integration'];

// ─── Component ────────────────────────────────────────────────────────────────

export function WorkItemPlannerModal({
  brId,
  brTitle,
  brDescriptionText,
  projectKey,
  projectId,
  projectName,
  onClose,
}: WorkItemPlannerModalProps) {
  const { data: assigneeOptions = [] } = useProposalAssignees();
  const [state, setState] = useReducer(
    (prev: WizardState, patch: Partial<WizardState>): WizardState => ({ ...prev, ...patch }),
    INIT,
  );

  // ── Epic selection ──────────────────────────────────────────────────────────
  const epicTableSelection = useMemo(
    () => new Set([...state.epicSelection].map(String)),
    [state.epicSelection],
  );
  const handleEpicSelectionChange = useCallback((next: Set<string>) => {
    setState({ epicSelection: new Set([...next].map(Number)) });
  }, []);
  const handleEpicAssigneeChange = useCallback((rowId: string, a: AssigneeChoice | null) => {
    setState({ epicAssignees: { ...state.epicAssignees, [Number(rowId)]: a } });
  }, [state.epicAssignees]);
  const handleEpicBulkAssign = useCallback((a: AssigneeChoice | null) => {
    const next: Record<number, AssigneeChoice | null> = { ...state.epicAssignees };
    state.epicSelection.forEach((i) => { next[i] = a; });
    setState({ epicAssignees: next });
  }, [state.epicAssignees, state.epicSelection]);

  const epicRows = useMemo<ProposalRow[]>(() =>
    state.epicProposals.map((e, i) => ({
      id: String(i),
      title: e.title,
      issueType: 'Epic',
      meta: [
        e.acceptanceCriteria.length > 0 ? `${e.acceptanceCriteria.length} AC` : null,
        e.brdRef ? `Ref: ${e.brdRef}` : null,
      ].filter(Boolean).join(' · '),
      assignee: state.epicAssignees[i] ?? null,
    })),
    [state.epicProposals, state.epicAssignees],
  );

  // ── Story selection ─────────────────────────────────────────────────────────
  const storyTableSelection = useMemo(
    () => new Set([...state.storySelection].map(String)),
    [state.storySelection],
  );
  const handleStorySelectionChange = useCallback((next: Set<string>) => {
    setState({ storySelection: new Set([...next].map(Number)) });
  }, []);
  const handleStoryAssigneeChange = useCallback((rowId: string, a: AssigneeChoice | null) => {
    setState({ storyAssignees: { ...state.storyAssignees, [Number(rowId)]: a } });
  }, [state.storyAssignees]);
  const handleStoryBulkAssign = useCallback((a: AssigneeChoice | null) => {
    const next: Record<number, AssigneeChoice | null> = { ...state.storyAssignees };
    state.storySelection.forEach((i) => { next[i] = a; });
    setState({ storyAssignees: next });
  }, [state.storyAssignees, state.storySelection]);

  const storyRows = useMemo<ProposalRow[]>(() =>
    state.storyProposals.map((s, i) => ({
      id: String(i),
      title: s.title,
      issueType: 'Story',
      meta: s.userStory
        ? s.userStory.slice(0, 80) + (s.userStory.length > 80 ? '…' : '')
        : undefined,
      assignee: state.storyAssignees[i] ?? null,
    })),
    [state.storyProposals, state.storyAssignees],
  );

  // ── Subtask selection ───────────────────────────────────────────────────────
  const subtaskTableSelection = useMemo(
    () => new Set([...state.subtaskSelection].map(String)),
    [state.subtaskSelection],
  );
  const handleSubtaskSelectionChange = useCallback((next: Set<string>) => {
    setState({ subtaskSelection: new Set([...next].map(Number)) });
  }, []);
  const handleSubtaskAssigneeChange = useCallback((rowId: string, a: AssigneeChoice | null) => {
    setState({ subtaskAssignees: { ...state.subtaskAssignees, [Number(rowId)]: a } });
  }, [state.subtaskAssignees]);
  const handleSubtaskBulkAssign = useCallback((a: AssigneeChoice | null) => {
    const next: Record<number, AssigneeChoice | null> = { ...state.subtaskAssignees };
    state.subtaskSelection.forEach((i) => { next[i] = a; });
    setState({ subtaskAssignees: next });
  }, [state.subtaskAssignees, state.subtaskSelection]);

  const subtaskRows = useMemo<ProposalRow[]>(() =>
    state.subtaskProposals.map((s, i) => ({
      id: String(i),
      title: s.title,
      issueType: s.type,
      assignee: state.subtaskAssignees[i] ?? null,
    })),
    [state.subtaskProposals, state.subtaskAssignees],
  );

  // ── Epic generation ─────────────────────────────────────────────────────────
  const generateEpics = useCallback(async () => {
    setState({ step: 'generating_epics', error: null });
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-epics', {
        body: {
          br_id: brId,
          br_title: brTitle,
          description_text: brDescriptionText ?? '',
          attachment_ids: [],
          selected_sources: ['description'],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const epics: EpicProposal[] = data?.epics ?? [];
      if (epics.length === 0) {
        catalystToast.info('No epics to generate — add description to the business request first.');
        setState({ step: 'done' });
        return;
      }
      setState({
        step: 'reviewing_epics',
        epicProposals: epics,
        epicSelection: new Set(epics.map((_, i) => i)),
        epicAssignees: {},
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Epic generation failed';
      setState({ step: 'error', error: msg });
    }
  }, [brId, brTitle, brDescriptionText]);

  // ── Epic creation ───────────────────────────────────────────────────────────
  const createEpics = useCallback(async () => {
    setState({ step: 'creating_epics' });
    const runId = await startPlannerRun({
      runType: 'epic_generation',
      brId,
      projectKey,
      proposalsCount: state.epicProposals.length,
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? undefined;
      const created: CreatedEpic[] = [];

      for (const idx of [...state.epicSelection].sort()) {
        const epic = state.epicProposals[idx];
        if (!epic) continue;
        const result = await createChildIssue({
          parent: { issueKey: brId, source: 'catalyst' },
          summary: epic.title,
          issueType: 'Epic',
          projectKey,
          projectId,
          reporterId,
          assigneeId: state.epicAssignees[idx]?.id ?? null,
        });
        if (result?.issue_key) {
          created.push({
            key: result.issue_key,
            summary: epic.title,
            projectKey,
            projectId,
            source: 'catalyst',
          });
        }
      }

      if (runId) {
        await completePlannerRun({ runId, createdCount: created.length });
        if (created.length > 0) {
          await auditCreatedWorkItems(runId, created.map((e) => ({
            issueKey: e.key,
            issueType: 'Epic',
            parentKey: brId,
            summary: e.summary,
          })));
        }
      }

      if (created.length === 0) {
        setState({ step: 'done' });
        return;
      }

      catalystToast.success(`Created ${created.length} epic${created.length === 1 ? '' : 's'} in ${projectName}`);
      setState({
        createdEpics: created,
        currentEpicIdx: 0,
        storyProposals: [],
        storySelection: new Set(),
        storyAssignees: {},
        step: 'generating_stories',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create epics';
      if (runId) await completePlannerRun({ runId, createdCount: 0, status: 'failed', error: msg });
      setState({ step: 'error', error: msg });
    }
  }, [state.epicSelection, state.epicProposals, state.epicAssignees, brId, projectKey, projectId, projectName]);

  // ── Story generation ────────────────────────────────────────────────────────
  const generateStoriesForCurrentEpic = useCallback(async (epicIdx: number, epics: CreatedEpic[]) => {
    const epic = epics[epicIdx];
    if (!epic) return;
    setState({ step: 'generating_stories', error: null, currentEpicIdx: epicIdx });
    try {
      const { data, error } = await supabase.functions.invoke('ai-generate-stories', {
        body: {
          epic_key: epic.key,
          epic_summary: epic.summary,
          description_text: '',
          attachment_ids: [],
          selected_sources: ['description'],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const stories: StoryProposal[] = data?.stories ?? [];
      if (stories.length === 0) {
        // Skip to next epic
        const nextIdx = epicIdx + 1;
        if (nextIdx < epics.length) {
          generateStoriesForCurrentEpic(nextIdx, epics);
        } else {
          setState({ step: 'done' });
        }
        return;
      }
      setState({
        step: 'reviewing_stories',
        storyProposals: stories,
        storySelection: new Set(stories.map((_, i) => i)),
        storyAssignees: {},
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Story generation failed';
      setState({ step: 'error', error: msg });
    }
  }, []);

  // ── Story creation ──────────────────────────────────────────────────────────
  const createStories = useCallback(async () => {
    const epic = state.createdEpics[state.currentEpicIdx];
    if (!epic) return;
    setState({ step: 'creating_stories' });
    const runId = await startPlannerRun({
      runType: 'story_generation',
      brId,
      parentKey: epic.key,
      projectKey: epic.projectKey,
      proposalsCount: state.storyProposals.length,
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? undefined;
      const created: CreatedStory[] = [...state.createdStories];
      const newlyCreated: CreatedStory[] = [];

      for (const idx of [...state.storySelection].sort()) {
        const story = state.storyProposals[idx];
        if (!story) continue;
        const result = await createChildIssue({
          parent: { issueKey: epic.key, source: epic.source },
          summary: story.title,
          issueType: 'Story',
          projectKey: epic.projectKey,
          projectId: epic.projectId,
          reporterId,
          assigneeId: state.storyAssignees[idx]?.id ?? null,
        });
        if (result?.issue_key) {
          const s: CreatedStory = {
            key: result.issue_key,
            summary: story.title,
            parentKey: epic.key,
            projectKey: epic.projectKey,
            projectId: epic.projectId,
            source: 'catalyst',
          };
          created.push(s);
          newlyCreated.push(s);
        }
      }

      if (runId) {
        await completePlannerRun({ runId, createdCount: newlyCreated.length });
        if (newlyCreated.length > 0) {
          await auditCreatedWorkItems(runId, newlyCreated.map((s) => ({
            issueKey: s.key,
            issueType: 'Story',
            parentKey: s.parentKey,
            summary: s.summary,
          })));
        }
      }

      catalystToast.success(`Created ${newlyCreated.length} stor${newlyCreated.length === 1 ? 'y' : 'ies'} for ${epic.key}`);

      const nextEpicIdx = state.currentEpicIdx + 1;
      if (nextEpicIdx < state.createdEpics.length) {
        setState({ createdStories: created });
        generateStoriesForCurrentEpic(nextEpicIdx, state.createdEpics);
      } else {
        if (created.length > 0) {
          setState({
            createdStories: created,
            currentStoryIdx: 0,
            step: 'generating_subtasks',
          });
          generateSubtasksForCurrentStory(0, created);
        } else {
          setState({ step: 'done' });
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create stories';
      if (runId) await completePlannerRun({ runId, createdCount: 0, status: 'failed', error: msg });
      setState({ step: 'error', error: msg });
    }
  }, [state, brId, generateStoriesForCurrentEpic]);

  // ── Subtask generation ──────────────────────────────────────────────────────
  const generateSubtasksForCurrentStory = useCallback(async (storyIdx: number, stories: CreatedStory[]) => {
    const story = stories[storyIdx];
    if (!story) {
      setState({ step: 'done' });
      return;
    }
    setState({ step: 'generating_subtasks', currentStoryIdx: storyIdx, error: null });
    try {
      const { data, error } = await supabase.functions.invoke('ai-suggest-children', {
        body: {
          parent_summary: story.summary,
          parent_type: 'Story',
          allowed_child_types: ALLOWED_SUBTASK_TYPES,
          sibling_summaries: [],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const suggestions: SubtaskProposal[] = data?.suggestions ?? [];
      if (suggestions.length === 0) {
        // Skip to next story
        const nextIdx = storyIdx + 1;
        if (nextIdx < stories.length) {
          generateSubtasksForCurrentStory(nextIdx, stories);
        } else {
          setState({ step: 'done' });
        }
        return;
      }
      setState({
        step: 'reviewing_subtasks',
        subtaskProposals: suggestions,
        subtaskSelection: new Set(suggestions.map((_, i) => i)),
        subtaskAssignees: {},
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Subtask generation failed';
      setState({ step: 'error', error: msg });
    }
  }, []);

  // ── Subtask creation ────────────────────────────────────────────────────────
  const createSubtasks = useCallback(async () => {
    const story = state.createdStories[state.currentStoryIdx];
    if (!story) return;
    setState({ step: 'creating_subtasks' });
    const runId = await startPlannerRun({
      runType: 'subtask_generation',
      brId,
      parentKey: story.key,
      projectKey: story.projectKey,
      proposalsCount: state.subtaskProposals.length,
    });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const reporterId = user?.id ?? undefined;
      const createdKeys = [...state.createdSubtaskKeys];
      const auditItems: Array<{ issueKey: string; issueType: string; parentKey: string; summary: string; assigneeId?: string | null }> = [];

      for (const idx of [...state.subtaskSelection].sort()) {
        const sub = state.subtaskProposals[idx];
        if (!sub) continue;
        const result = await createChildIssue({
          parent: { issueKey: story.key, source: story.source },
          summary: sub.title,
          issueType: sub.type,
          projectKey: story.projectKey,
          projectId: story.projectId,
          reporterId,
          assigneeId: state.subtaskAssignees[idx]?.id ?? null,
        });
        if (result?.issue_key) {
          createdKeys.push(result.issue_key);
          auditItems.push({
            issueKey: result.issue_key,
            issueType: sub.type,
            parentKey: story.key,
            summary: sub.title,
            assigneeId: state.subtaskAssignees[idx]?.id ?? null,
          });
        }
      }

      if (runId) {
        await completePlannerRun({ runId, createdCount: auditItems.length });
        if (auditItems.length > 0) await auditCreatedWorkItems(runId, auditItems);
      }

      catalystToast.success(`Created ${auditItems.length} subtask${auditItems.length === 1 ? '' : 's'} for ${story.key}`);

      const nextStoryIdx = state.currentStoryIdx + 1;
      if (nextStoryIdx < state.createdStories.length) {
        setState({ createdSubtaskKeys: createdKeys });
        generateSubtasksForCurrentStory(nextStoryIdx, state.createdStories);
      } else {
        setState({ step: 'done', createdSubtaskKeys: createdKeys });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create subtasks';
      if (runId) await completePlannerRun({ runId, createdCount: 0, status: 'failed', error: msg });
      setState({ step: 'error', error: msg });
    }
  }, [state, brId, generateSubtasksForCurrentStory]);

  // ── Start on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    generateEpics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const currentEpic = state.createdEpics[state.currentEpicIdx];
  const currentStory = state.createdStories[state.currentStoryIdx];
  const isLoading = ['generating_epics', 'creating_epics', 'generating_stories', 'creating_stories', 'generating_subtasks', 'creating_subtasks'].includes(state.step);

  const levelLabel =
    state.step.includes('epic') ? 'Epics'
    : state.step.includes('stor') ? `Stories for ${currentEpic?.key ?? '…'}`
    : state.step.includes('subtask') ? `Subtasks for ${currentStory?.key ?? '…'}`
    : '';

  const stepIndex =
    state.step.includes('epic') ? 1
    : state.step.includes('stor') ? 2
    : state.step.includes('subtask') ? 3
    : 3;

  return (
    <ModalDialog onClose={onClose} width="x-large">
      <ModalHeader>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <ModalTitle>Work Item Planner — {projectName}</ModalTitle>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[
              { n: 1, label: 'Epics' },
              { n: 2, label: 'Stories' },
              { n: 3, label: 'Subtasks' },
            ].map(({ n, label }) => (
              <span
                key={n}
                style={{
                  fontSize: 'var(--ds-font-size-100)',
                  fontWeight: stepIndex === n ? 600 : 400,
                  color: stepIndex > n
                    ? token('color.text.success', 'var(--ds-text-success, #006644)')
                    : stepIndex === n
                      ? token('color.text.brand', 'var(--ds-link, #0052CC)')
                      : token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: '50%', fontSize: 'var(--ds-font-size-50)', fontWeight: 600,
                  background: stepIndex > n
                    ? token('color.background.success.bold', 'var(--ds-background-success-bold, #1F845A)')
                    : stepIndex === n
                      ? token('color.background.brand.bold', 'var(--ds-link, #0052CC)')
                      : token('color.background.neutral', 'var(--ds-background-neutral, #F1F2F4)'),
                  color: stepIndex >= n ? 'var(--ds-text-inverse, #FFFFFF)' : token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)'),
                }}>
                  {stepIndex > n ? '✓' : n}
                </span>
                {label}
                {n < 3 && (
                  <span style={{ color: token('color.border', 'var(--ds-border, #DFE1E6)'), margin: '0 2px' }}>›</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </ModalHeader>

      <ModalBody>
        {/* Loading state */}
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '32px 0' }}>
            <Spinner size="medium" />
            <span style={{ fontSize: 'var(--ds-font-size-400)', color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>
              {state.step === 'generating_epics' && `Generating epics for ${brTitle}…`}
              {state.step === 'creating_epics' && 'Creating epics…'}
              {state.step === 'generating_stories' && `Generating stories for ${currentEpic?.key ?? ''}…`}
              {state.step === 'creating_stories' && 'Creating stories…'}
              {state.step === 'generating_subtasks' && `Generating subtasks for ${currentStory?.key ?? ''}…`}
              {state.step === 'creating_subtasks' && 'Creating subtasks…'}
            </span>
          </div>
        )}

        {/* Error state */}
        {state.step === 'error' && (
          <div style={{ padding: '16px 0', color: token('color.text.danger', 'var(--ds-text-danger, #AE2A19)') }}>
            {state.error}
          </div>
        )}

        {/* Done state */}
        {state.step === 'done' && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✓</div>
            <div style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, color: token('color.text', 'var(--ds-text, #172B4D)'), marginBottom: 4 }}>
              Planning complete
            </div>
            <div style={{ fontSize: 'var(--ds-font-size-300)', color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>
              {state.createdEpics.length > 0 && `${state.createdEpics.length} epic${state.createdEpics.length === 1 ? '' : 's'}`}
              {state.createdStories.length > 0 && `, ${state.createdStories.length} stor${state.createdStories.length === 1 ? 'y' : 'ies'}`}
              {state.createdSubtaskKeys.length > 0 && `, ${state.createdSubtaskKeys.length} subtask${state.createdSubtaskKeys.length === 1 ? '' : 's'}`}
              {' '}created in {projectName}
            </div>
          </div>
        )}

        {/* Epic review */}
        {state.step === 'reviewing_epics' && (
          <ProposalTable
            rows={epicRows}
            selection={epicTableSelection}
            onSelectionChange={handleEpicSelectionChange}
            onAssigneeChange={handleEpicAssigneeChange}
            onBulkAssign={handleEpicBulkAssign}
            assigneeOptions={assigneeOptions}
          />
        )}

        {/* Story review */}
        {state.step === 'reviewing_stories' && (
          <ProposalTable
            rows={storyRows}
            selection={storyTableSelection}
            onSelectionChange={handleStorySelectionChange}
            onAssigneeChange={handleStoryAssigneeChange}
            onBulkAssign={handleStoryBulkAssign}
            assigneeOptions={assigneeOptions}
          />
        )}

        {/* Subtask review */}
        {state.step === 'reviewing_subtasks' && (
          <ProposalTable
            rows={subtaskRows}
            selection={subtaskTableSelection}
            onSelectionChange={handleSubtaskSelectionChange}
            onAssigneeChange={handleSubtaskAssigneeChange}
            onBulkAssign={handleSubtaskBulkAssign}
            assigneeOptions={assigneeOptions}
          />
        )}
      </ModalBody>

      <ModalFooter>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {/* Left: level label */}
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
            {levelLabel}
          </span>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Skip subtasks (when reviewing subtasks) */}
            {state.step === 'reviewing_subtasks' && (
              <Button
                appearance="subtle"
                onClick={() => {
                  const nextIdx = state.currentStoryIdx + 1;
                  if (nextIdx < state.createdStories.length) {
                    generateSubtasksForCurrentStory(nextIdx, state.createdStories);
                  } else {
                    setState({ step: 'done' });
                  }
                }}
              >
                Skip subtasks
              </Button>
            )}

            {/* Skip stories (when reviewing stories) */}
            {state.step === 'reviewing_stories' && (
              <Button
                appearance="subtle"
                onClick={() => {
                  const nextIdx = state.currentEpicIdx + 1;
                  if (nextIdx < state.createdEpics.length) {
                    generateStoriesForCurrentEpic(nextIdx, state.createdEpics);
                  } else {
                    setState({ step: 'done' });
                  }
                }}
              >
                Skip stories
              </Button>
            )}

            {/* Done */}
            {(state.step === 'done' || state.step === 'error') && (
              <Button appearance="primary" onClick={onClose}>
                Done
              </Button>
            )}

            {/* Primary action per step */}
            {state.step === 'reviewing_epics' && (
              <>
                <Button appearance="subtle" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  isDisabled={state.epicSelection.size === 0}
                  onClick={createEpics}
                >
                  Create {state.epicSelection.size} epic{state.epicSelection.size === 1 ? '' : 's'} →
                </Button>
              </>
            )}

            {state.step === 'reviewing_stories' && (
              <Button
                appearance="primary"
                isDisabled={state.storySelection.size === 0}
                onClick={createStories}
              >
                Create {state.storySelection.size} stor{state.storySelection.size === 1 ? 'y' : 'ies'} →
              </Button>
            )}

            {state.step === 'reviewing_subtasks' && (
              <Button
                appearance="primary"
                isDisabled={state.subtaskSelection.size === 0}
                onClick={createSubtasks}
              >
                Create {state.subtaskSelection.size} subtask{state.subtaskSelection.size === 1 ? '' : 's'} →
              </Button>
            )}
          </div>
        </div>
      </ModalFooter>
    </ModalDialog>
  );
}
