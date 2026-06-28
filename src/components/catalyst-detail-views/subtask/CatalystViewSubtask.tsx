/**
 * CatalystViewSubtask — Sub-task detail overlay.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, Description, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystStatusPill,
} from '../shared/sections';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  IssueIcon, StatusLozenge,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/shared-components';

export default function CatalystViewSubtask({
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

  /* ── SUBTASK-UNIQUE: parent issue query ──── */
  const { data: parentIssue } = useQuery({
    queryKey: ['cv-subtask-parent', issue?.parent_key],
    enabled: !!issue?.parent_key && isOpen,
    queryFn: async () => {
      const { data } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, issue_type, status, status_category')
        .eq('issue_key', issue!.parent_key!)
        .is('deleted_at', null)
        .maybeSingle();
      return data;
    },
  });

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
      {/* SUBTASK-UNIQUE: Parent story context banner */}
      {parentIssue && (
        <div onClick={() => onOpenItem?.(parentIssue.issue_key)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))', borderRadius: 6, marginBottom: 16, cursor: 'pointer', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-border, #DFE1E6)')} onMouseLeave={e => (e.currentTarget.style.background = 'var(--ds-surface-sunken, var(--cp-bg-sunken, #F4F5F7))')}>
          <IssueIcon type={parentIssue.issue_type} size={14} />
          <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, #5E6C84)' }}>{parentIssue.issue_key}</span>
          <span style={{ fontSize: 'var(--ds-font-size-300)', color: 'var(--ds-text, #292A2E)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{parentIssue.summary}</span>
          <StatusLozenge status={parentIssue.status} category={parentIssue.status_category} />
        </div>
      )}

      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      {/* jira-compare Phase 3 (2026-05-02): KeyDetails section removed.
          Sub-task has no extraRows; Parent is shown in the parent-banner
          above + CatalystViewBase header. Priority is hidden on Sub-task
          per Jira parity (BAU-5569 Lane A re-probe). */}
      <Description issue={issue ?? null} />
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
          parentIssueType={issue.issue_type || 'Sub-task'}
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
  ), [issue, itemId, projectKey, onOpenItem, isOpen, parentIssue]);

  const rightContent = useMemo(() => (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="sub-task" statusPill={<CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />} improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />} />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectId, projectKey, onOpenItem, onClose, improveHandlers]);

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Sub-task'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType={parentIssue?.issue_type || 'Story'}
      onParentClick={parentIssue ? () => onOpenItem?.(parentIssue.issue_key) : undefined}
      /* Canonical Add-parent (Jira parity): Sub-task → Story parent. */
      parentSource="story"
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
        { label: 'Delete sub-task', onClick: () => setShowDeleteDialog(true), danger: true },
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
      typeLabel="sub-task"
      onConfirm={() => mutations.deleteIssue.mutate()}
    />
    </>
  );
}