/**
 * CatalystViewIncident — Production Incident detail overlay.
 */
import React from 'react';
import { toast } from 'sonner';
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
  const queryClient = useQueryClient();

  const leftContent = (
    <>
      {/* INCIDENT-UNIQUE: Severity banner */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
        background: '#FFF5F5', borderRadius: 6, marginBottom: 16, border: '1px solid #FFEDEB',
      }}>
        <WarningIcon size="small" primaryColor="#FF5630" />
        <span style={{ fontSize: 13, fontWeight: 600, color: '#BF2600' }}>{issue?.issue_type || 'Production Incident'}</span>
        <span style={{ fontSize: 12, color: '#5E6C84', marginLeft: 'auto' }}>
          Priority: <span style={{ color: priorityStyle.color, fontWeight: 700 }}>{priorityStyle.symbol} {issue?.priority ?? 'Medium'}</span>
        </span>
      </div>

      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown moved to right-rail slot. */}
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
      onShare={() => { navigator.clipboard.writeText(window.location.href); toast.success('Link copied'); }}
      moreMenuItems={[
        { label: 'Print', onClick: () => window.print() },
        { label: 'Clone', onClick: () => { console.log('Clone'); } },
        { label: 'Delete incident', onClick: () => mutations.deleteIssue.mutate(), danger: true },
      ]}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent} isLoading={isLoading} isNotFound={!isLoading && issue === null}
    />
  );
}