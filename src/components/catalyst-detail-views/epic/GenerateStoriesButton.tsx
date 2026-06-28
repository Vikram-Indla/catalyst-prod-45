/**
 * GenerateStoriesButton — AI CTA for epic detail views.
 *
 * Replaces "Improve Epic" button. Opens ArtefactPickerModal → generates
 * stories → shows StoryProposalModal for review → creates approved stories.
 *
 * Uses CatyButton (cat icon + label, no rainbow).
 *
 * Disabled when: ≥25 child stories, max 2 generations reached, or no artefacts.
 *
 * During generation: renders a full-page overlay that greys out the entire
 * epic detail view with pointer-events: none + centered spinner.
 */
import React, { useCallback, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import { useStoryGeneration } from './useStoryGeneration';
import { ArtefactPickerModal } from './ArtefactPickerModal';
import { StoryProposalModal } from './StoryProposalModal';
import { catalystToast } from '@/lib/catalystToast';
import { adfToMarkdown } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToMarkdown';
import { CatyButton } from '@/components/for-you/atlaskit/CatyButton';

interface GenerateStoriesButtonProps {
  issue: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    description_text?: string | null;
    description_adf?: unknown | null;
    project_key?: string | null;
    project_id?: string | null;
    source?: 'jira' | 'catalyst' | string | null;
    assignee_account_id?: string | null;
  } | null;
}

/** Full-overlay that greys out the epic detail during story generation. */
function GeneratingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--ds-surface, rgba(255, 255, 255, 0.75))',
        zIndex: 99990,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'all',
        cursor: 'wait',
      }}
      aria-busy="true"
      aria-label="Generating stories from epic documentation"
    >
      <Spinner size="large" />
      <div style={{
        marginTop: 16,
        fontSize: 'var(--ds-font-size-500)',
        fontWeight: 500,
        color: token('color.text', 'var(--ds-text)'),
      }}>
        Generating stories…
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 'var(--ds-font-size-300)',
        color: token('color.text.subtle', 'var(--ds-text-subtle)'),
      }}>
        Analyzing epic documentation. This may take a moment.
      </div>
    </div>
  );
}

export function GenerateStoriesButton({ issue }: GenerateStoriesButtonProps) {
  const store = useStoryGeneration();

  useEffect(() => {
    if (issue?.issue_key) {
      store.checkDisabled(issue.issue_key);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.issue_key]);

  const descriptionText = React.useMemo(() => {
    if (issue?.description_adf) {
      try {
        return adfToMarkdown(issue.description_adf as any);
      } catch {
        return issue?.description_text ?? '';
      }
    }
    return issue?.description_text ?? '';
  }, [issue?.description_adf, issue?.description_text]);

  const hasDescription = !!descriptionText?.trim();

  const handleClick = useCallback(() => {
    if (!issue?.issue_key || !issue?.summary) return;
    if (store.maxGenerationsReached) {
      catalystToast.warning('Generation limit reached', 'Maximum 2 story generations per epic.');
      return;
    }
    store.openPicker(issue.issue_key, issue.summary, descriptionText);
  }, [issue?.issue_key, issue?.summary, descriptionText, store]);

  const handleGenerate = useCallback(
    async (selectedSources: string[], attachmentIds: string[]) => {
      if (!issue?.issue_key || !issue?.summary) return;
      catalystToast.info('Generating stories from your epic documentation…');
      await store.generate({
        epicKey: issue.issue_key,
        epicSummary: issue.summary,
        descriptionText: descriptionText ?? '',
        attachmentIds,
        selectedSources,
      });
    },
    [issue?.issue_key, issue?.summary, descriptionText, store],
  );

  const handleCreateSelected = useCallback(async (assignees?: Record<number, import('@/components/shared/JiraTable').AssigneeChoice | null>) => {
    if (!issue?.issue_key || !issue?.project_key) return;
    await store.createSelected({
      parentIssueKey: issue.issue_key,
      parentSource: (issue.source as 'jira' | 'catalyst') ?? 'catalyst',
      projectKey: issue.project_key,
      projectId: issue.project_id ?? undefined,
      assignees,
    });
  }, [issue, store]);

  const isGenerating = store.state === 'generating';
  const isCreating = store.state === 'creating';
  const disabled = store.isDisabled || store.maxGenerationsReached || isGenerating || isCreating;

  if (issue?.issue_type !== 'Epic') return null;

  return (
    <>
      {isGenerating && <GeneratingOverlay />}

      {isCreating && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'var(--ds-surface, rgba(255, 255, 255, 0.75))',
            zIndex: 99990,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'all',
            cursor: 'wait',
          }}
          aria-busy="true"
        >
          <Spinner size="large" />
          <div style={{ marginTop: 16, fontSize: 'var(--ds-font-size-500)', fontWeight: 500, color: token('color.text', 'var(--ds-text)') }}>
            Creating stories…
          </div>
        </div>
      )}

      <CatyButton
        label="Generate Stories"
        onClick={handleClick}
        loading={isGenerating || isCreating}
        disabled={disabled}
      />

      {/* Artefact picker modal */}
      <ArtefactPickerModal
        isOpen={store.state === 'selecting'}
        onClose={store.reset}
        epicId={issue?.id}
        epicKey={issue?.issue_key}
        hasDescription={hasDescription}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />

      {/* Story proposal review modal */}
      <StoryProposalModal
        isOpen={store.state === 'reviewing'}
        onClose={store.reset}
        proposals={store.proposals}
        selectedIndices={store.selectedIndices}
        onToggle={store.toggleSelection}
        onSelectAll={store.selectAll}
        onDeselectAll={store.deselectAll}
        onCreateSelected={handleCreateSelected}
        isCreating={isCreating}
        coveragePercent={store.coveragePercent}
        existingCount={store.existingCount}
        epicKey={issue?.issue_key ?? null}
      />
    </>
  );
}
