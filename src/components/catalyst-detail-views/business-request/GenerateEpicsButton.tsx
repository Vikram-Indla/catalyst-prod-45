/**
 * GenerateEpicsButton — rainbow CTA for Business Request detail views.
 *
 * Flow:
 *  1. Click → ProjectPickerModal (pick target Jira project)
 *  2. Confirm project → generate epics via ai-generate-epics edge function
 *     (uses BR description as source; attachments support is future work)
 *  3. EpicProposalModal → user reviews/selects → createSelected creates
 *     epics in picked project, auto-linked to BR via parent.
 *
 * Self-gates: returns null if issue_type !== 'Business Request'.
 * Rainbow CTA per CLAUDE.md (static gradient, animation: none).
 */
import React, { useCallback, useEffect } from 'react';
import SparklesIcon from '@atlaskit/icon/core/atlassian-intelligence';
import Spinner from '@atlaskit/spinner';
import Tooltip from '@atlaskit/tooltip';
import { token } from '@atlaskit/tokens';
import { useEpicGeneration } from './useEpicGeneration';
import { ProjectPickerModal } from './ProjectPickerModal';
import { EpicProposalModal } from './EpicProposalModal';
import { catalystToast } from '@/lib/catalystToast';
import { adfToMarkdown } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToMarkdown';

const RAINBOW_GRADIENT =
  'conic-gradient(#FF3CAC, #784BA0, #2B86C5, #00C9FF, #92FE9D, #FFD700, #FF3CAC)';

interface GenerateEpicsButtonProps {
  issue: {
    id?: string;
    issue_key?: string | null;
    issue_type?: string | null;
    summary?: string | null;
    description_text?: string | null;
    description_adf?: unknown | null;
  } | null;
}

function GeneratingOverlay({ message }: { message: string }) {
  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(255, 255, 255, 0.75)',
        zIndex: 99990,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'all', cursor: 'wait',
      }}
      aria-busy="true"
      aria-label={message}
    >
      <Spinner size="large" />
      <div style={{
        marginTop: 16, fontSize: 16, fontWeight: 500,
        color: token('color.text', '#172B4D'),
      }}>
        {message}
      </div>
    </div>
  );
}

export function GenerateEpicsButton({ issue }: GenerateEpicsButtonProps) {
  const store = useEpicGeneration();

  useEffect(() => {
    if (issue?.id) {
      store.checkDisabled(issue.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issue?.id]);

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

  const handleClick = useCallback(() => {
    if (!issue?.id || !issue?.summary) return;
    if (store.maxGenerationsReached) {
      catalystToast.warning('Generation limit reached', 'Maximum 2 epic generations per business request.');
      return;
    }
    store.openProjectPicker(issue.id, issue.summary, descriptionText);
  }, [issue?.id, issue?.summary, descriptionText, store]);

  const handleProjectConfirmed = useCallback(
    async (project: Parameters<typeof store.setPickedProject>[0]) => {
      store.setPickedProject(project);
      if (!issue?.id || !issue?.summary) return;
      catalystToast.info(`Generating epics for ${project.projectName}…`);
      store.openArtefactPicker();
      await store.generate({
        brId: issue.id,
        brTitle: issue.summary,
        descriptionText: descriptionText ?? '',
        attachmentIds: [],
        selectedSources: ['description'],
      });
    },
    [issue?.id, issue?.summary, descriptionText, store],
  );

  const handleCreateSelected = useCallback(async () => {
    await store.createSelected();
  }, [store]);

  const isGenerating = store.state === 'generating' || store.state === 'selecting';
  const isCreating = store.state === 'creating';
  const disabled = store.isDisabled || store.maxGenerationsReached || isGenerating || isCreating;

  const tooltipContent = store.isDisabled
    ? 'Maximum 10 epics reached'
    : store.maxGenerationsReached
    ? 'Maximum 2 generations reached for this business request'
    : isGenerating
    ? 'Generating epics…'
    : `Generate epics from business request (${store.generationCount}/${store.maxGenerations} used)`;

  const buttonLabel = isGenerating
    ? 'Generating…'
    : isCreating
    ? 'Creating…'
    : store.maxGenerationsReached
    ? 'Generation limit reached'
    : 'Generate Epics';

  if (issue?.issue_type !== 'Business Request') return null;

  return (
    <>
      {isGenerating && <GeneratingOverlay message="Generating epics…" />}
      {isCreating && <GeneratingOverlay message="Creating epics…" />}

      <Tooltip content={tooltipContent}>
        <div
          style={{
            display: 'inline-flex',
            background: disabled ? token('color.background.neutral', '#F1F2F4') : RAINBOW_GRADIENT,
            borderRadius: 5,
            padding: 1.2,
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
            {!isGenerating && !isCreating && !store.maxGenerationsReached && store.generationCount > 0 && (
              <span style={{
                fontSize: 11,
                color: token('color.text.subtlest', '#6B778C'),
                marginLeft: 4,
              }}>
                ({store.generationCount}/{store.maxGenerations})
              </span>
            )}
          </button>
        </div>
      </Tooltip>

      <ProjectPickerModal
        isOpen={store.state === 'projectPicking'}
        onClose={store.reset}
        brTitle={issue?.summary ?? null}
        onConfirm={handleProjectConfirmed}
      />

      <EpicProposalModal
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
        projectName={store.pickedProject?.projectName ?? null}
      />
    </>
  );
}
