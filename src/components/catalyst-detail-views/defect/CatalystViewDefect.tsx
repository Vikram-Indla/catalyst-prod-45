/**
 * CatalystViewDefect — Defect/Bug detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria (as "Expected
 * Behavior"), Priority, Activity, Sidebar.
 * Defect-unique: Priority + type badge row in left panel.
 */
import React from 'react';
import { toast } from 'sonner';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { useQueryClient } from '@tanstack/react-query';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystSidebarDetails, CatalystKeyDetails,
  KeyDetailsFieldRow, CatalystStatusPill,
} from '../shared/sections';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import {
  CatalystDefectKeyRows,
  CatalystDefectLongFields,
} from './CatalystDefectFields';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { EditablePriority } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

export default function CatalystViewDefect({
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
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch B (Defect) · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails (slot-prop pattern). */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}

      {/* Jira-parity: Parent → Severity → Priority → (any populated
          Catalyst-only fields) all render inside the collapsible "Key
          details" block. The standalone "Bug / Defect" badge was removed
          (BAU-5534 audit) — the issue-type icon in the title already
          carries the defect signal and Jira's own detail view has no
          equivalent inline badge. Long-form fields (Steps / Environment)
          render below via CatalystDefectLongFields, matching Jira's
          collapsed-block layout.

          Apr 28, 2026 (jira-compare cycle 2 — Phase B B5):
            - Field order changed from Parent → Priority → Severity to
              Parent → Severity → Priority to match Jira's BAU/list
              detail panel. Implemented by passing showPriority={false}
              to CatalystKeyDetails (so it skips its own Priority row)
              and threading a priorityRow JSX through CatalystDefectKeyRows
              between Severity and the rest.
            - Found in / Fix in / Root cause / Resolution rows now hide
              when their value is null/empty (match Jira hide-empty
              default). Severity stays always-rendered. */}
      <CatalystKeyDetails
        issue={issue ?? null}
        itemId={itemId}
        itemType="defect"
        projectKey={projectKey}
        onOpenItem={onOpenItem}
        showParent={true}
        showPriority={false}
        extraRows={
          <CatalystDefectKeyRows
            issue={issue ?? null}
            // Severity now reads ph_issues.severity directly via
            // CatalystSeverityField (jira-compare Round 4, 2026-04-28).
            // raw_json fallback is preserved inside the component itself
            // for the transition window before the migration is applied.
            severity={
              (issue as any)?.severity
                ?? (issue as any)?.raw_json?.fields?.customfield_10125?.value
                ?? null
            }
            foundInBuild={(issue as any)?.found_in_build ?? null}
            rootCause={(issue as any)?.root_cause ?? null}
            onUpdate={() =>
              queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] })
            }
            priorityRow={
              <KeyDetailsFieldRow label="Priority" alignBlock="center">
                {issue && (
                  <EditablePriority
                    issueId={issue.id}
                    currentPriority={issue.priority}
                    onUpdate={() =>
                      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] })
                    }
                  />
                )}
              </KeyDetailsFieldRow>
            }
          />
        }
      />

      <CatalystDefectLongFields />

      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} label="Expected Behavior" />

      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Bug'}
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

  /* jira-compare 2026-05-06: Parent restored to Key details (showParent={true}).
     Right rail Parent picker removed 2026-05-03 per Vikram directive.
     Defect's KeyDetails: Parent / Severity / Found in / Fix in / Root Cause / Resolution / Priority. */
  const rightContent = (
    <CatalystSidebarDetails
      issue={issue ?? null} itemId={itemId} projectId={projectId}
      onStatusChange={(st) => mutations.updateStatus.mutate(st)}
      onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="defect"
      parentSource="defect"
      projectKey={projectKey}
      onOpenItem={onOpenItem}
      /* jira-compare 2026-05-03 — Patch B (Defect) · Status pill + Improve dropdown
         anchored together at the rail header. Mirrors CatalystViewStory's Patch D + E. */
      statusPill={<CatalystStatusPill status={issue?.status} statusCategory={issue?.status_category} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />}
      improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />}
    />
  );

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Bug'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType="Epic"
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Catalyst rule): Defect → Story / Epic / Feature parent. */
      parentSource="story_epic_feature"
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
        { label: 'Delete defect', onClick: () => mutations.deleteIssue.mutate(), danger: true },
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