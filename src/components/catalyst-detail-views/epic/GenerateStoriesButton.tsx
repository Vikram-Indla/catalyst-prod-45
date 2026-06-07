/**
 * GenerateStoriesButton — rainbow CTA for epic detail views.
 *
 * Replaces "Improve Epic" button. Opens ArtefactPickerModal → generates
 * stories → shows StoryProposalModal for review → creates approved stories.
 *
 * Rainbow CTA carve-out per CLAUDE.md: static conic-gradient, animation: none,
 * 2px padding-wrapper pattern.
 *
 * Disabled when: ≥25 child stories, max 2 generations reached, or no artefacts.
 *
 * During generation: renders a full-page overlay that greys out the entire
 * epic detail view with pointer-events: none + centered spinner.
 */
import React, { useCallback, useEffect } from 'react';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';
import { useStoryGeneration } from './useStoryGeneration';
import { ArtefactPickerModal } from './ArtefactPickerModal';
import { StoryProposalModal } from './StoryProposalModal';
import { catalystToast } from '@/lib/catalystToast';
import { adfToMarkdown } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToMarkdown';

const RAINBOW_GRADIENT =
  'conic-gradient(#FF3CAC, #784BA0, #2B86C5, #00C9FF, #92FE9D, #FFD700, #FF3CAC)';

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
        background: 'rgba(255, 255, 255, 0.75)',
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
        fontSize: 16,
        fontWeight: 500,
        color: token('color.text', '#172B4D'),
      }}>
        Generating stories…
      </div>
      <div style={{
        marginTop: 8,
        fontSize: 13,
        color: token('color.text.subtle', '#42526E'),
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

  const handleCreateSelected = useCallback(async () => {
    if (!issue?.issue_key || !issue?.project_key) return;
    await store.createSelected({
      parentIssueKey: issue.issue_key,
      parentSource: (issue.source as 'jira' | 'catalyst') ?? 'catalyst',
      projectKey: issue.project_key,
      projectId: issue.project_id ?? undefined,
    });
  }, [issue, store]);

  const isGenerating = store.state === 'generating';
  const isCreating = store.state === 'creating';
  const disabled = store.isDisabled || store.maxGenerationsReached || isGenerating || isCreating;

  const tooltipContent = store.isDisabled
    ? 'Maximum 25 stories reached'
    : store.maxGenerationsReached
    ? 'Maximum 2 generations reached for this epic'
    : isGenerating
    ? 'Generating stories…'
    : `Generate stories from epic documentation (${store.generationCount}/2 used)`;

  const buttonLabel = isGenerating
    ? 'Generating…'
    : isCreating
    ? 'Creating…'
    : store.maxGenerationsReached
    ? 'Generation limit reached'
    : 'Generate Stories';

  return (
    <>
      {/* Full overlay during generation — greys out entire epic */}
      {isGenerating && <GeneratingOverlay />}

      {/* Full overlay during story creation */}
      {isCreating && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(255, 255, 255, 0.75)',
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
          <div style={{ marginTop: 16, fontSize: 16, fontWeight: 500, color: token('color.text', '#172B4D') }}>
            Creating stories…
          </div>
        </div>
      )}

      {/* Rainbow CTA wrapper — static gradient, animation: none */}
      <Tooltip content={tooltipContent}>
        <div
          style={{
            display: 'inline-flex',
            background: disabled ? token('color.background.neutral', '#F1F2F4') : RAINBOW_GRADIENT,
            borderRadius: 5,
            padding: 2,
            animation: 'none',
          }}
        >
          <button
            onClick={handleClick}
            disabled={disabled}
            aria-busy={isGenerating || isCreating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              borderRadius: 3,
              border: 'none',
              background: '#FFFFFF',
              color: disabled
                ? token('color.text.disabled', '#A5ADBA')
                : token('color.text', '#172B4D'),
              fontSize: 14,
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.7 : 1,
              transition: 'filter 0.1s ease',
            }}
            onMouseEnter={(e) => {
              if (!disabled) (e.currentTarget.style.filter = 'brightness(1.08)');
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
            }}
          >
            {isGenerating || isCreating ? (
              <Spinner size="small" />
            ) : (
              <SparklesIcon label="" color={
                disabled
                  ? token('color.icon.disabled', '#A5ADBA')
                  : token('color.icon.brand', '#0052CC')
              } />
            )}
            <span>{buttonLabel}</span>
            {/* Generation count badge */}
            {!isGenerating && !isCreating && !store.maxGenerationsReached && store.generationCount > 0 && (
              <span style={{
                fontSize: 11,
                color: token('color.text.subtlest', '#6B778C'),
                marginLeft: 4,
              }}>
                ({store.generationCount}/2)
              </span>
            )}
          </button>
        </div>
      </Tooltip>

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
