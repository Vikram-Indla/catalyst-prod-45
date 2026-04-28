/**
 * CatalystViewTask — Task detail overlay.
 */
import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails, CatalystKeyDetails, CatalystStatusPill,
} from '../shared/sections';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewTask({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);

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

  const leftContent = (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      <CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} />
      <CatalystQuickActions />
      <ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />
      <CatalystKeyDetails issue={issue ?? null} itemId={itemId} itemType="task" projectKey={projectKey} onOpenItem={onOpenItem} />
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

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
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="task" />
  );

  return (
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
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Add flag', onClick: () => toast('Add flag — coming soon') },
        { label: 'Clone', onClick: () => toast('Clone — coming soon') },
        { label: 'Delete task', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading}
    />
  );
}