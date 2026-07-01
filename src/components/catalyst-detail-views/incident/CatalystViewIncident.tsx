/**
 * CatalystViewIncident — Production Incident detail overlay.
 */
import React, { useMemo } from 'react';
import { catalystToast } from '@/lib/catalystToast';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, Description, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystKeyDetails, StatusLozengeDropdown,
} from '../shared/sections';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { TestCoveragePanel } from '../story/TestCoveragePanel';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { CatalystSeverityField } from '../shared/sections/CatalystSeverityField';
import { KeyDetailsFieldRow } from '../shared/sections';
import { useQueryClient } from '@tanstack/react-query';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';
import { ReleaseSection } from './ReleaseSection';
export default function CatalystViewIncident({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
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
  const queryClient = useQueryClient();

  // Memoize leftContent / rightContent / moreMenuItems so that opening a
  // confirmation dialog (showDeleteDialog, showCloneDialog, etc.) does NOT
  // cause the entire CatalystViewBase tree to re-render. Without memos, any
  // state change in this component creates new JSX/array references, which
  // forces CatalystViewBase (not React.memo'd) to re-diff SubtasksPanel +
  // LinkedWorkItemsSection + ActivitySection + AttachmentsPanel + SidebarDetails
  // synchronously — blocking the main thread for ~150–400ms before the dialog
  // paint. With memos, the refs stay stable and CatalystViewBase bails out.
  const leftContent = useMemo(() => (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · StatusLozengeDropdown relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      {/* jira-compare 2026-05-07 Fix N: Severity added to Key details.
          Service Now# + Assessment Feature permanently banned (see CLAUDE.md).
          Jira PI key order: Priority → Severity. showParent={false} — Jira PI has no Parent row. */}
      <CatalystKeyDetails
        issue={issue ?? null} itemId={itemId} itemType="incident"
        projectKey={projectKey} onOpenItem={onOpenItem} showParent={false}
        extraRows={
          <KeyDetailsFieldRow label="Severity" alignBlock="center">
            <CatalystSeverityField
              issue={issue ?? null}
              onUpdate={() => queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] })}
            />
          </KeyDetailsFieldRow>
        }
        afterBody={<Description issue={issue ?? null} />}
      />
      <CatalystAcceptanceCriteria issue={issue ?? null} label="Impact / Root Cause" />

      {/* Canonical section order across all CatalystView*: Attachments
          → Child work items → Linked work items → Activity. */}
      <CatalystAttachmentsPanel issueId={issue?.id} projectKey={issue?.project_key || projectKey} isOpen={isOpen} />

      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Incident'}
          parentSummary={issue.summary || ''}
        />
      )}

      <LinkedWorkItemsSection
        issueId={itemId}
        issueKey={issue?.issue_key ?? ''}
        projectKey={issue?.project_key || projectKey}
      />
      {/* Regression coverage / Trace-From (CAT-TESTHUB-REPORT-REVAMP, G-002) */}
      {issue?.issue_key && (
        <TestCoveragePanel issueKey={issue.issue_key} statusCategory={issue.status_category} mode="incident" />
      )}
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectKey, onOpenItem, isOpen, queryClient]);

  const rightContent = useMemo(() => (
    <CatalystSidebarDetails
      issue={issue ?? null} itemId={itemId} projectId={projectId}
      onStatusChange={(st) => mutations.updateStatus.mutate(st)}
      onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="incident"
      parentSource="incident"
      projectKey={projectKey}
      onOpenItem={onOpenItem}
      statusPill={<StatusLozengeDropdown status={issue?.status} statusCategory={issue?.status_category ?? undefined} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />}
      improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />}
    >
      {/* Tier 3.4: PI Release field */}
      {issue?.id && (
        <ReleaseSection
          incidentId={issue.id}
          projectId={projectId}
          releaseVersionId={(issue as any)?.release_version_id ?? null}
          onReleaseChange={() => {
            // TODO: Implement release change handler if needed
          }}
        />
      )}
    </CatalystSidebarDetails>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectId, projectKey, onOpenItem, onClose, improveHandlers]);

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Incident'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Business Request"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Catalyst rule): Production Incident → Business Request / Epic / Feature.
         NOT Story — confirmed Vikram 2026-06-12. */
      parentSource="br_epic_feature"
      onParentChange={async (newKey) => {
        await mutations.updateField.mutateAsync({
          field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
        });
      }}
      /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
      moreMenuItems={useMemo(() => [
        { label: 'Print', onClick: () => window.print() },
        { label: 'Clone', onClick: () => { if (!issue?.issue_key) return; setShowCloneDialog(true); } },
        { label: 'Move to project…', onClick: () => setShowMoveDialog(true) },
        { label: 'Archive', onClick: () => { if (!issue?.issue_key) return; setShowArchiveDialog(true); } },
        { label: 'Delete incident', onClick: () => setShowDeleteDialog(true), danger: true },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ], [issue?.issue_key])}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading} isNotFound={!isLoading && issue === null}
      fullPageHrefBuilder={() => issue?.issue_key ? `/incident-hub/view/${issue.issue_key}` : '/incident-hub'}
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
      typeLabel="incident"
      onConfirm={() => mutations.deleteIssue.mutate()}
    />
    </>
  );
}