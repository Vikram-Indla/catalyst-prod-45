/**
 * CatalystViewEpic — Epic detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria, Activity, Sidebar.
 * Epic-unique: Child work items table (Jira-parity with inline CRUD).
 */
import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails, CatalystStatusPill, CatalystFooterMeta,
} from '../shared/sections';
import { ParentAndLabels } from './ParentAndLabels';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewEpic({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);

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
      <CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} />
      <CatalystQuickActions />
      <ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />
      <ParentAndLabels issue={issue ?? null} itemId={itemId} itemType="epic" projectKey={projectKey} onOpenItem={onOpenItem} />
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
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
      <CatalystFooterMeta issue={issue ?? null} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="epic" />
  );

  return (
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
        { label: 'Add flag', onClick: () => toast('Add flag — coming soon') },
        { label: 'Clone', onClick: () => toast('Clone — coming soon') },
        { label: 'Move', onClick: () => toast('Move — coming soon') },
        { label: 'Archive', onClick: () => toast('Archive — coming soon') },
        { label: 'Delete epic', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading}
    />
  );
}