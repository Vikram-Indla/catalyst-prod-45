/**
 * CatalystViewEpic — Epic detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria, Activity, Sidebar.
 * Epic-unique: Child work items table (Jira-parity with inline CRUD).
 */
import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystKeyDetails, CatalystStatusPill,
} from '../shared/sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewEpic({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);

  // Track this view in user_recent_items so the sidebar Recents rail picks it up.
  // Per CLAUDE.md §7A + the Apr 2026 Recents directive: subtasks are excluded.
  const trackRecent = useTrackRecentItem();
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !issue?.id || !issue?.summary) return;
    if (recordedRef.current === issue.id) return;
    recordedRef.current = issue.id;
    trackRecent.mutate({
      entityType: 'epic',
      entityId: issue.id,
      entityKey: issue.issue_key ?? undefined,
      displaySummary: issue.summary,
      projectId: projectId ?? undefined,
      projectName: issue.project_name ?? undefined,
      navPath: `/project-hub/${issue.project_key ?? projectKey ?? ''}/issue/${issue.issue_key ?? issue.id}`,
    });
  }, [isOpen, issue?.id, issue?.summary, issue?.issue_key, issue?.project_key, issue?.project_name, projectId, projectKey, trackRecent]);

  const leftContent = (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-03 — Improve relocated to right-rail slot in CatalystSidebarDetails (Patch D). */}
      {/* jira-compare 2026-05-10 Fix E-1: Priority is EXCLUDED from Epic Key details.
          Per CLAUDE.md 2026-05-06 directive: Epic Priority belongs only in the right rail
          Details section (between Assignee and Reporter), never in Key details.
          showPriority={false} suppresses the Key details Priority row; the right rail
          already renders Priority via CatalystSidebarDetails. */}
      <CatalystKeyDetails issue={issue ?? null} itemId={itemId} itemType="epic" projectKey={projectKey} onOpenItem={onOpenItem} showPriority={false} />
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {/* EPIC: Child work items (canonical SubtasksPanel) */}
      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Epic'}
          parentSummary={issue.summary || ''}
        />
      )}

      <LinkedWorkItemsSection
        issueId={itemId}
        issueKey={issue?.issue_key ?? ''}
        projectKey={issue?.project_key || projectKey}
      />
      <CatalystAttachmentsPanel issueId={issue?.id} projectKey={issue?.project_key || projectKey} isOpen={isOpen} />
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="epic" statusPill={<CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />} improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />} />
  );

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Epic'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Business Request"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Jira parity): Epic → Business Request parent. */
      parentSource="business_request"
      onParentChange={async (newKey) => {
        await mutations.updateField.mutateAsync({
          field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
        });
      }}
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Print', onClick: () => window.print() },
        { label: 'Clone', onClick: () => {
          if (!issue?.issue_key) return;
          cloneIssue(issue.issue_key)
            .then((newKey) => {
              toast.success(`Cloned as ${newKey}`, {
                action: { label: 'Open', onClick: () => onOpenItem?.(newKey) },
              });
            })
            .catch((e: unknown) => {
              toast.error('Clone failed', { description: e instanceof Error ? e.message : 'Unknown error' });
            });
        } },
        { label: 'Move to project…', onClick: () => setShowMoveDialog(true) },
        { label: 'Archive', onClick: () => {
          if (!issue?.issue_key) return;
          if (!window.confirm(`Archive "${issue.summary}"?\nArchived items can be restored later.`)) return;
          archiveIssue(issue.issue_key)
            .then(() => { toast.success('Issue archived'); onClose(); })
            .catch((e: unknown) => { toast.error('Archive failed', { description: e instanceof Error ? e.message : 'Unknown error' }); });
        } },
        { label: 'Delete epic', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading} isNotFound={!isLoading && issue === null}
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
    </>
  );
}