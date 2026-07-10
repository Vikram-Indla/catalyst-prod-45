/**
 * GenerateSubtasksButton — AI CTA for Story detail views.
 *
 * Single click → generates subtask suggestions via ai-suggest-children →
 * shows SubtaskProposalModal for review → creates approved subtasks.
 *
 * Uses CatyButton (Catalyst AI icon, no rainbow). No picker modal needed —
 * generates directly from story summary + existing siblings.
 *
 * Disabled when: ≥10 child subtasks already exist.
 * Self-gates: renders null for any non-Story issue type.
 */
import React, { useCallback, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { useSubtaskGeneration } from './useSubtaskGeneration';
import { SubtaskProposalModal } from './SubtaskProposalModal';
import { CatyButton } from '@/components/for-you/atlaskit/CatyButton';

interface GenerateSubtasksButtonProps {
  issue: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    project_key?: string | null;
    project_id?: string | null;
    source?: 'jira' | 'catalyst' | string | null;
  } | null;
}

function GeneratingOverlay({ label }: { label: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'var(--ds-surface)',
        zIndex: 99990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        cursor: 'wait',
      }}
      aria-busy="true"
      aria-label={label}
    >
      <Spinner size="large" />
      <div style={{
        marginTop: 16,
        fontSize: 'var(--ds-font-size-500)',
        fontWeight: 500,
        color: token('color.text', 'var(--ds-text)'),
      }}>
        {label}
      </div>
    </div>
  );
}

export function GenerateSubtasksButton({ issue }: GenerateSubtasksButtonProps) {
  const store = useSubtaskGeneration();

  useEffect(() => {
    if (issue?.issue_key) {
      store.checkDisabled(issue.issue_key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.issue_key]);

  const handleClick = useCallback(async () => {
    if (!issue?.issue_key || !issue?.summary || !issue?.project_key) return;
    await store.generate({
      storyKey: issue.issue_key,
      storySummary: issue.summary,
      projectKey: issue.project_key,
      projectId: issue.project_id ?? null,
      source: (issue.source as 'jira' | 'catalyst') ?? 'jira',
    });
  }, [issue, store]);

  const handleCreateSelected = useCallback(async (assignees?: Record<number, import('@/components/shared/JiraTable').AssigneeChoice | null>) => {
    await store.createSelected(assignees);
  }, [store]);

  const isGenerating = store.state === 'generating';
  const isCreating = store.state === 'creating';
  const disabled = store.isDisabled || isGenerating || isCreating;

  if (issue?.issue_type !== 'Story') return null;

  return (
    <>
      {isGenerating && <GeneratingOverlay label="Generating subtasks…" />}
      {isCreating && <GeneratingOverlay label="Creating subtasks…" />}

      <CatyButton
        label="Generate Subtasks"
        onClick={handleClick}
        loading={isGenerating || isCreating}
        disabled={disabled}
      />

      <SubtaskProposalModal
        isOpen={store.state === 'reviewing'}
        onClose={store.reset}
        proposals={store.proposals}
        selectedIndices={store.selectedIndices}
        onToggle={store.toggleSelection}
        onSelectAll={store.selectAll}
        onDeselectAll={store.deselectAll}
        onCreateSelected={handleCreateSelected}
        isCreating={isCreating}
        existingCount={store.existingCount}
        storyKey={store.storyKey}
      />
    </>
  );
}
