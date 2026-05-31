/**
 * CatalystViewBusinessRequest — Business Request / Demand detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria, Priority,
 * Activity, Sidebar.
 * BR-unique: Blue type badge. Child work items rendered via the canonical
 * SubtasksPanel (Atlaskit parity).
 */
import React, { useMemo } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import FileIcon from '@atlaskit/icon/glyph/document';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, Description, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails, CatalystKeyDetails, CatalystStatusPill,
} from '../shared/sections';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import { BrStatusSection } from '@/components/business-requests/BrStatusSection';
import { useBRStatusTransition } from '@/hooks/useBRStatusTransition';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewBusinessRequest({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const { mutate: transitionStatus, isPending: isTransitioning } = useBRStatusTransition();
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleClone = React.useCallback(() => {
    if (!issue?.issue_key) return;
    cloneIssue(issue.issue_key)
      .then((newKey) => {
        catalystToast.success(`Cloned as ${newKey}`, undefined, { label: 'Open', onClick: () => onOpenItem?.(newKey) });
      })
      .catch((e: unknown) => {
        catalystToast.error('Clone failed', e instanceof Error ? e.message : (e as any)?.message ?? 'Unknown error');
      });
  }, [issue?.issue_key, onOpenItem]);

  // Memoize leftContent / rightContent / moreMenuItems so that opening a
  // confirmation dialog (showDeleteDialog, showCloneDialog, etc.) does NOT
  // cause the entire CatalystViewBase tree to re-render. Without memos, any
  // state change in this component creates new JSX/array references, which
  // forces CatalystViewBase (not React.memo'd) to re-diff SubtasksPanel +
  // LinkedWorkItemsSection + ActivitySection + SidebarDetails
  // synchronously — blocking the main thread for ~150–400ms before the dialog
  // paint. With memos, the refs stay stable and CatalystViewBase bails out.
  const leftContent = useMemo(() => (
    <>
      {/* BR-UNIQUE: Type badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        background: 'var(--ds-background-selected, #EFF6FF)', borderRadius: 4, marginBottom: 12, fontSize: 12, fontWeight: 600, color: 'var(--ds-background-brand-bold-hovered, #1D4ED8)',
      }}>
        <FileIcon size="small" primaryColor="var(--ds-background-brand-bold-hovered, #1D4ED8)" />
        Business Request
      </div>

      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />

      {issue && (
        <BrStatusSection
          currentStatusSlug={issue.process_step || 'funnel'}
          requestId={issue.id}
          onStatusChange={(newStatusSlug, comment) => {
            transitionStatus({
              requestId: issue.id,
              fromStatusSlug: issue.process_step || 'funnel',
              toStatusSlug: newStatusSlug,
              comment
            });
          }}
          isLoading={isTransitioning}
        />
      )}

      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      <CatalystKeyDetails issue={issue ?? null} itemId={itemId} itemType="business_request" projectKey={projectKey} onOpenItem={onOpenItem} showParent={false} />
      <Description issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Business Request'}
          parentSummary={issue.summary || ''}
        />
      )}

      <LinkedWorkItemsSection
        issueId={itemId}
        issueKey={issue?.issue_key ?? ''}
        projectKey={issue?.project_key || projectKey}
      />
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectKey, onOpenItem, isOpen, transitionStatus, isTransitioning]);

  const rightContent = useMemo(() => (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="business request" statusPill={<CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />} improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />} />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectId, projectKey, onOpenItem, onClose, improveHandlers]);

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Business Request'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
      moreMenuItems={useMemo(() => [
        { label: 'Print', onClick: () => window.print() },
        { label: 'Clone', onClick: () => { if (!issue?.issue_key) return; setShowCloneDialog(true); } },
        { label: 'Move to project…', onClick: () => setShowMoveDialog(true) },
        { label: 'Archive', onClick: () => { if (!issue?.issue_key) return; setShowArchiveDialog(true); } },
        { label: 'Delete request', onClick: () => setShowDeleteDialog(true), danger: true },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ], [issue?.issue_key])}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading} isNotFound={!isLoading && issue === null}
    />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
        onConfirm={handleClone}
      />
      {showMoveDialog && issue?.issue_key && (
      <MoveIssueDialog
        isOpen={showMoveDialog}
        onClose={() => setShowMoveDialog(false)}
        issueKey={issue.issue_key}
        issueSummary={issue.summary}
        currentProjectKey={issue.project_key || projectKey}
        onMoved={onClose}
      />
    )}
    <ConfirmArchiveDialog
      isOpen={showArchiveDialog}
      onClose={() => setShowArchiveDialog(false)}
      issueSummary={issue?.summary}
      onConfirm={() => {
        if (!issue?.issue_key) return;
        archiveIssue(issue.issue_key)
          .then(() => { catalystToast.success('Issue archived'); onClose(); })
          .catch((e: unknown) => { catalystToast.error('Archive failed', e instanceof Error ? e.message : (e as any)?.message ?? 'Unknown error'); });
      }}
    />
    <ConfirmDeleteDialog
      isOpen={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      issueKey={issue?.issue_key}
      issueSummary={issue?.summary}
      typeLabel="request"
      onConfirm={() => mutations.deleteIssue.mutate()}
    />
    </>
  );
}
