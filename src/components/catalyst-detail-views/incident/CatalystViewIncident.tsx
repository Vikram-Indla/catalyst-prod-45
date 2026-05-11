/**
 * CatalystViewIncident — Production Incident detail overlay.
 */
import React from 'react';
import { toast } from 'sonner';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import WarningIcon from '@atlaskit/icon/core/warning';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystKeyDetails, CatalystStatusPill,
} from '../shared/sections';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { CatalystSeverityField } from '../shared/sections/CatalystSeverityField';
import { KeyDetailsFieldRow } from '../shared/sections';
import { useQueryClient } from '@tanstack/react-query';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

export default function CatalystViewIncident({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const priorityStyle = PRIORITY_STYLES[issue?.priority ?? 'Medium'] ?? PRIORITY_STYLES.Medium;
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const queryClient = useQueryClient();

  const leftContent = (
    <>
      {/* INCIDENT-UNIQUE: Severity banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: 'var(--ds-background-danger, #FFEDEB)', borderRadius: 6, marginBottom: 16, border: '1px solid var(--ds-border-danger, #FF8F73)',
      }}>
        <WarningIcon size="small" primaryColor="var(--ds-icon-danger, #C9372C)" />
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-danger, #AE2A19)' }}>{issue?.issue_type || 'Production Incident'}</span>
        <span style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #626F86)', marginLeft: 'auto' }}>
          Priority: <span style={{ color: priorityStyle.color, fontWeight: 700 }}>{priorityStyle.symbol} {issue?.priority ?? 'Medium'}</span>
        </span>
      </div>

      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
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
      />
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} label="Impact / Root Cause" />

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
      <CatalystAttachmentsPanel issueId={issue?.id} projectKey={issue?.project_key || projectKey} isOpen={isOpen} />
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  );

  const rightContent = (
    <CatalystSidebarDetails
      issue={issue ?? null} itemId={itemId} projectId={projectId}
      onStatusChange={(st) => mutations.updateStatus.mutate(st)}
      onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="incident"
      parentSource="incident"
      projectKey={projectKey}
      onOpenItem={onOpenItem}
      statusPill={<CatalystStatusPill status={issue?.status} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />}
      improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />}
    />
  );

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Incident'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Business Request"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Catalyst rule): Production Incident → Story / Epic / Feature /
         Business Request parent (only Incident + Epic can parent to a BR). */
      parentSource="story_epic_feature_br"
      onParentChange={async (newKey) => {
        await mutations.updateField.mutateAsync({
          field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
        });
      }}
      /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
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
        { label: 'Delete incident', onClick: () => mutations.deleteIssue.mutate(), danger: true },
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