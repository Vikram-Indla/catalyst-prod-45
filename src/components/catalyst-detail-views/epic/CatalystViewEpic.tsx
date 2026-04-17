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
import { LinkedWorkItems } from '@/modules/project-work-hub/components/linked-work-items';
import { AtlaskitBoundary } from '@/components/shared/rich-text/atlaskit';
import type { CatalystViewBaseProps } from '../shared/types';

/**
 * BAU-4771 pilot: swap in the Atlaskit-based LinkedWorkItems molecule
 * only for the pilot issue. Every other Epic keeps the production
 * LinkedIssuesSection. The AtlaskitBoundary falls back to the legacy
 * section if the Atlaskit stack throws at runtime, so the worst case is
 * visual parity with pre-pilot production.
 */
const LINKED_WORK_ITEMS_PILOT_KEYS = new Set<string>(['BAU-4771']);

export default function CatalystViewEpic({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);

  const leftContent = (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      <CatalystQuickActions />
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

      {issue?.issue_key && LINKED_WORK_ITEMS_PILOT_KEYS.has(issue.issue_key) ? (
        <AtlaskitBoundary
          diagnosticTag={`linked-work-items:${issue.issue_key}`}
          fallback={<LinkedIssuesSection issueId={itemId} issueKey={issue.issue_key} />}
        >
          <LinkedWorkItems
            issueId={itemId}
            issueKey={issue.issue_key}
            projectKey={issue.project_key || projectKey}
          />
        </AtlaskitBoundary>
      ) : (
        <LinkedIssuesSection issueId={itemId} issueKey={issue?.issue_key ?? ''} />
      )}
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="epic">
      <CatalystParentLinker issue={issue ?? null} itemId={itemId} itemType="epic" projectKey={projectKey} onOpenItem={onOpenItem} />
    </CatalystSidebarDetails>
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