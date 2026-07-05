/**
 * CatalystViewFeature — Feature detail overlay.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalystToast } from '@/lib/catalystToast';
import { archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { cloneWorkItemWithFlags } from '@/lib/cloneWorkItemWithFlags';
import type { ClonePatch } from '../shared/ConfirmCloneDialog';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import {
  CatalystTitleEditor, CatalystQuickActions, Description, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystKeyDetails, StatusLozengeDropdown,
} from '../shared/sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { DependenciesSection } from '@/modules/project-work-hub/components/dependencies';
import { TestCoveragePanel } from '../story/TestCoveragePanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewFeature({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading, isError, error, refetch } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const navigate = useNavigate();
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleClone = React.useCallback((patch?: ClonePatch) => {
    if (!issue?.issue_key) return;
    void cloneWorkItemWithFlags({
      sourceKey: issue.issue_key,
      sourceType: issue.issue_type,
      projectKey: issue.project_key ?? projectKey,
      patch,
    });
  }, [issue?.issue_key, issue?.issue_type, issue?.project_key, projectKey]);

  // Sidebar Recents tracking — entityType 'feature', no subtask exclusion
  // applies (features can't be subtasks).
  const trackRecent = useTrackRecentItem();
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !issue?.id || !issue?.summary) return;
    if (recordedRef.current === issue.id) return;
    recordedRef.current = issue.id;
    trackRecent.mutate({
      entityType: 'feature',
      entityId: issue.id,
      entityKey: issue.issue_key ?? undefined,
      displaySummary: issue.summary,
      projectId: projectId ?? undefined,
      projectName: issue.project_name ?? undefined,
      navPath: `/project-hub/${issue.project_key ?? projectKey ?? ''}/issue/${issue.issue_key ?? issue.id}`,
    });
  }, [isOpen, issue?.id, issue?.summary, issue?.issue_key, issue?.project_key, issue?.project_name, projectId, projectKey, trackRecent]);

  // Memoize so dialog state changes (showDeleteDialog etc.) don't re-render CatalystViewBase tree
  const leftContent = useMemo(() => (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · StatusLozengeDropdown relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions itemType={issue?.issue_type || 'Feature'} />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      <CatalystKeyDetails
        issue={issue ?? null}
        itemId={itemId}
        itemType="feature"
        projectKey={projectKey}
        onOpenItem={onOpenItem}
        afterBody={<Description issue={issue ?? null} />}
      />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {/* Canonical section order across all CatalystView*: Attachments
          → Child work items → Linked work items → Activity. */}
      <CatalystAttachmentsPanel issueId={issue?.id} projectKey={issue?.project_key || projectKey} isOpen={isOpen} />

      {/* FEATURE: Child work items (canonical SubtasksPanel) */}
      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Feature'}
          parentSummary={issue.summary || ''}
        />
      )}

      <LinkedWorkItemsSection
        issueId={itemId}
        issueKey={issue?.issue_key ?? ''}
        projectKey={issue?.project_key || projectKey}
      />
      <DependenciesSection
        issueKey={issue?.issue_key ?? ''}
        projectKey={issue?.project_key || projectKey}
      />
      {/* Test coverage (CAT-TESTHUB-REBUILD Phase C · L001) — rolls up
          coverage across the feature's child stories. */}
      {issue?.issue_key && (
        <TestCoveragePanel issueKey={issue.issue_key} statusCategory={issue.status_category} mode="feature" />
      )}
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectKey, onOpenItem, isOpen]);

  const rightContent = useMemo(() => (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st, reason) => mutations.updateStatus.mutate(reason ? { status: st, reasonCode: reason.code, reasonText: reason.text } : st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="feature" statusPill={<StatusLozengeDropdown status={issue?.status} statusCategory={issue?.status_category ?? undefined} onStatusChange={(st, reason) => mutations.updateStatus.mutate(reason ? { status: st, reasonCode: reason.code, reasonText: reason.text } : st)} issueType={issue?.issue_type} />} improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />} />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectId, projectKey, onOpenItem, onClose, improveHandlers]);

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'New Feature'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Jira parity): Feature → Epic parent. */
      parentSource="epic"
      onParentChange={async (newKey) => {
        await mutations.updateField.mutateAsync({
          field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
        });
      }}
      /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
      moreMenuItems={useMemo(() => [
        /* "Convert to Subtask" intentionally omitted — Feature is a higher-hierarchy
           work item (parent of Story). Jira strict-hierarchy rule: only base items
           (Story / Task / Bug / Defect) may be converted to Sub-task. */
        { label: 'Clone', onClick: () => { if (!issue?.issue_key) return; setShowCloneDialog(true); } },
        { label: 'Move', onClick: () => {
          const pk = issue?.project_key ?? projectKey;
          const ik = issue?.issue_key;
          if (!pk || !ik) return;
          onClose?.();
          navigate(`/project-hub/${pk}/issue/${ik}/move`);
        } },
        { label: 'Archive', onClick: () => { if (!issue?.issue_key) return; setShowArchiveDialog(true); } },
        { label: 'Delete feature', onClick: () => setShowDeleteDialog(true), danger: true },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ], [issue?.issue_key])}
      flagContext={issue?.id && issue?.issue_key ? {
        issueId: issue.id,
        issueKey: issue.issue_key,
        isFlagged: !!(issue as any).is_flagged,
        issueTitle: issue.summary,
        issueType: issue.issue_type,
        tableName: 'ph_issues',
      } : undefined}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent}
      cover={(issue as any)?.cover ?? null}
      coverItemId={(issue as any)?.id ?? null}
      coverItemTable="ph_issues"
      onCoverChange={(next) => mutations.updateField.mutate({ field: 'cover', value: next, oldValue: (issue as any)?.cover ?? null })}
      isLoading={isLoading} isNotFound={!isLoading && issue === null}
      isError={isError} error={error} onRetry={refetch}
    />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
        issueId={issue?.id}
        projectId={projectId}
        currentAssigneeId={issue?.assignee_account_id}
        currentAssigneeName={issue?.assignee_display_name}
        currentReporterId={issue?.reporter_account_id}
        currentReporterName={issue?.reporter_display_name}
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
      typeLabel="feature"
      onConfirm={() => mutations.deleteIssue.mutate()}
    />
    </>
  );
}