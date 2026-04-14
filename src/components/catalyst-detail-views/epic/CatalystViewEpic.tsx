/**
 * CatalystViewEpic — Epic detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria, Activity, Sidebar.
 * Epic-unique: Child work items table (Jira-parity with inline CRUD).
 */
import React from 'react';
import { toast } from 'sonner';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystParentLinker, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails,
} from '../shared/sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedIssuesSection } from '@/modules/project-work-hub/components/dialogs/story-detail-modules';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewEpic({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);

  const leftContent = (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      <CatalystParentLinker issue={issue ?? null} itemId={itemId} itemType="epic" projectKey={projectKey} onOpenItem={onOpenItem} />
      <CatalystQuickActions />
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {/* EPIC: Child work items table (Jira-parity with full CRUD) */}
      {issue?.issue_key && (
        <CatalystChildWorkItemsTable
          parentKey={issue.issue_key}
          parentId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onOpenItem={onOpenItem}
        />
      )}

      <LinkedIssuesSection issueId={itemId} />
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="epic" />
  );

  return (
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Epic'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
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
