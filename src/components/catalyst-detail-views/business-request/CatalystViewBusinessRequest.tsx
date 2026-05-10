/**
 * CatalystViewBusinessRequest — Business Request / Demand detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria, Priority,
 * Activity, Sidebar.
 * BR-unique: Blue type badge. Child work items rendered via the canonical
 * SubtasksPanel (Atlaskit parity).
 */
import React from 'react';
import { toast } from 'sonner';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import FileIcon from '@atlaskit/icon/glyph/document';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails, CatalystKeyDetails, CatalystStatusPill,
} from '../shared/sections';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewBusinessRequest({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);

  const leftContent = (
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
      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      <CatalystKeyDetails issue={issue ?? null} itemId={itemId} itemType="business_request" projectKey={projectKey} onOpenItem={onOpenItem} showParent={false} />
      <CatalystDescriptionSection issue={issue ?? null} />
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
  );

  const rightContent = (
    <CatalystSidebarDetails issue={issue ?? null} itemId={itemId} projectId={projectId} onStatusChange={(st) => mutations.updateStatus.mutate(st)} onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="business request" statusPill={<CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />} improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />} />
  );

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Business Request'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
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
        { label: 'Delete request', onClick: () => mutations.deleteIssue.mutate(), danger: true },
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
