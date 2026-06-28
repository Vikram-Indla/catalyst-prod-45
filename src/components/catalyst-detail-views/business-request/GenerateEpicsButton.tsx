/**
 * GenerateEpicsButton — AI CTA for Business Request detail views.
 *
 * Flow:
 *  1. Click → ProjectPickerModal (pick target Jira project)
 *  2. Confirm project → generate epics via ai-generate-epics edge function
 *     (uses BR description as source; attachments support is future work)
 *  3. EpicProposalModal → user reviews/selects → createSelected creates
 *     epics in picked project, auto-linked to BR via parent.
 *
 * Self-gates: returns null if issue_type !== 'Business Request'.
 * Uses CatyButton (cat icon + label, no rainbow).
 */
import React, { useCallback, useEffect } from 'react';
import Spinner from '@atlaskit/spinner';
import { useEpicGeneration } from './useEpicGeneration';
import { ProjectPickerModal } from './ProjectPickerModal';
import { EpicProposalModal } from './EpicProposalModal';
import { catalystToast } from '@/lib/catalystToast';
import { adfToMarkdown } from '@/components/catalyst-detail-views/shared/sections/Description/utils/adfToMarkdown';
import { CatyButton } from '@/components/for-you/atlaskit/CatyButton';

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
        background: 'var(--ds-surface, rgba(255, 255, 255, 0.75))',
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
        marginTop: 16, fontSize: 'var(--ds-font-size-500)', fontWeight: 500,
        color: token('color.text', 'var(--ds-text, #172B4D)'),
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

  const handleCreateSelected = useCallback(async (assignees?: Record<number, import('@/components/shared/JiraTable').AssigneeChoice | null>) => {
    await store.createSelected(assignees);
  }, [store]);

  const isGenerating = store.state === 'generating' || store.state === 'selecting';
  const isCreating = store.state === 'creating';
  const disabled = store.isDisabled || store.maxGenerationsReached || isGenerating || isCreating;

  if (issue?.issue_type !== 'Business Request') return null;

  return (
    <>
      {isGenerating && <GeneratingOverlay message="Generating epics…" />}
      {isCreating && <GeneratingOverlay message="Creating epics…" />}

      <CatyButton
        label="Generate Epics"
        onClick={handleClick}
        loading={isGenerating || isCreating}
        disabled={disabled}
      />

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
