/**
 * CatalystViewTask — Task detail overlay.
 */
import React, { useEffect, useRef, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { catalystToast } from '@/lib/catalystToast';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import {
  CatalystTitleEditor, CatalystQuickActions, Description, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystKeyDetails,
  StatusLozengeDropdown, KeyDetailsFieldRow,
} from '../shared/sections';
import { CatalystSeverityField } from '../shared/sections/CatalystSeverityField';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewTask({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading, isError, error, refetch } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const queryClient = useQueryClient();
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

  // Sidebar Recents tracking — top-level tasks only.
  // Subtask exclusion (Apr 2026 owner directive): a task with a `parent_key`
  // is a subtask and is intentionally NOT recorded in user_recent_items.
  const trackRecent = useTrackRecentItem();
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !issue?.id || !issue?.summary) return;
    if (recordedRef.current === issue.id) return;
    // Subtask guard — never record subtasks per CLAUDE.md §7A directive.
    if ((issue as any).parent_key || (issue as any).parent_id) return;
    recordedRef.current = issue.id;
    trackRecent.mutate({
      entityType: 'task',
      entityId: issue.id,
      entityKey: issue.issue_key ?? undefined,
      displaySummary: issue.summary,
      projectId: projectId ?? undefined,
      projectName: issue.project_name ?? undefined,
      navPath: `/project-hub/${issue.project_key ?? projectKey ?? ''}/issue/${issue.issue_key ?? issue.id}`,
    });
  }, [isOpen, issue?.id, issue?.summary, issue?.issue_key, issue?.project_key, issue?.project_name, projectId, projectKey, trackRecent]);

  // Memoize so dialog state changes don't re-render CatalystViewBase tree
  const leftContent = useMemo(() => (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · StatusLozengeDropdown relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions itemType={issue?.issue_type || 'Task'} />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      {/* jira-compare 2026-05-10 Fix JC-2: Severity added to Key details.
          Jira Task screen scheme (10010) includes customfield_10125 (Severity).
          Mirrors the pattern from CatalystViewIncident. */}
      <CatalystKeyDetails
        issue={issue ?? null} itemId={itemId} itemType="task"
        projectKey={projectKey} onOpenItem={onOpenItem}
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
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {/* Canonical section order across all CatalystView*: Attachments
          → Child work items → Linked work items → Activity. */}
      <CatalystAttachmentsPanel issueId={issue?.id} projectKey={issue?.project_key || projectKey} isOpen={isOpen} />

      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Task'}
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
  ), [issue, itemId, projectKey, onOpenItem, isOpen, queryClient]);

  const rightContent = useMemo(() => (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="task" statusPill={<StatusLozengeDropdown status={issue?.status} statusCategory={issue?.status_category ?? undefined} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />} improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />} />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectId, projectKey, onOpenItem, onClose, improveHandlers]);

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Task'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Story"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Catalyst rule): Task → Story / Epic / Feature parent (Jira parity with Defect). */
      parentSource="story_epic_feature"
      onParentChange={async (newKey) => {
        await mutations.updateField.mutateAsync({
          field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
        });
      }}
      /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
      moreMenuItems={useMemo(() => [
        { label: 'Convert to Subtask', onClick: () => catalystToast.info('Coming soon') },
        { label: 'Clone', onClick: () => { if (!issue?.issue_key) return; setShowCloneDialog(true); } },
        { label: 'Move', onClick: () => setShowMoveDialog(true) },
        { label: 'Archive', onClick: () => { if (!issue?.issue_key) return; setShowArchiveDialog(true); } },
        { label: 'Delete task', onClick: () => setShowDeleteDialog(true), danger: true },
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
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading} isNotFound={!isLoading && issue === null}
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
      typeLabel="task"
      onConfirm={() => mutations.deleteIssue.mutate()}
    />
    </>
  );
}