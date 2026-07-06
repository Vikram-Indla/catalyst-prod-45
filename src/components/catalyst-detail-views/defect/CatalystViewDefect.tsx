/**
 * CatalystViewDefect — Defect/Bug detail overlay.
 *
 * Canonical sections: Title, Description, Acceptance Criteria (as "Expected
 * Behavior"), Priority, Activity, Sidebar.
 * Defect-unique: Priority + type badge row in left panel.
 */
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { catalystToast } from '@/lib/catalystToast';
import { archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { cloneWorkItemWithFlags } from '@/lib/cloneWorkItemWithFlags';
import type { ClonePatch } from '../shared/ConfirmCloneDialog';
import { useQueryClient } from '@tanstack/react-query';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useParentIssueTypes } from '@/hooks/workhub/useParentIssueTypes';
import {
  CatalystTitleEditor, CatalystQuickActions, Description, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystAttachmentsPanel, CatalystPagesSection, CatalystSidebarDetails, CatalystKeyDetails,
  KeyDetailsFieldRow, StatusLozengeDropdown,
} from '../shared/sections';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import {
  CatalystDefectKeyRows,
  CatalystDefectLongFields,
} from './CatalystDefectFields';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { TestCoveragePanel } from '../story/TestCoveragePanel';
import { EditablePriority } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';
import {
  PRIORITY_STYLES,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';

export default function CatalystViewDefect({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
  hideSidebar,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading, isError, error, refetch } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const navigate = useNavigate();
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const priorityStyle = issue?.priority ? PRIORITY_STYLES[issue.priority] ?? null : null;
  // L004 (Phase C): resolve the defect's REAL parent issue_type from
  // ph_issues instead of the previous hard-coded parentType="Epic". Defects
  // parent to Story / Epic / Feature (parentSource="story_epic_feature"), so
  // "Epic" was a zero-assumption violation. Absent from the map → parent
  // unsynced → render no icon (silence beats a fabricated default).
  const parentTypeMap = useParentIssueTypes([issue?.parent_key]);
  const resolvedParentType = issue?.parent_key ? parentTypeMap.get(issue.parent_key) ?? null : null;
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleClone = React.useCallback((patch?: ClonePatch) => {
    if (!issue?.issue_key) return;
    void cloneWorkItemWithFlags({
      sourceKey: issue.issue_key,
      sourceType: issue.issue_type,
      projectKey: issue.project_key ?? projectKey,
      patch,
    });
  }, [issue?.issue_key, issue?.issue_type, issue?.project_key, projectKey]);
  const queryClient = useQueryClient();

  // Memoize so dialog state changes don't re-render CatalystViewBase tree
  const leftContent = useMemo(() => (
    <>
      <CatalystTitleEditor issue={issue ?? null} onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })} />
      {/* jira-compare 2026-05-03 — Patch B (Defect) · StatusLozengeDropdown relocated to right-rail header in CatalystSidebarDetails (slot-prop pattern). */}
      <CatalystQuickActions itemType={issue?.issue_type || 'QA Bug'} />
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
        afterBody={<Description issue={issue ?? null} />}
      />

      <CatalystDefectLongFields />
      <CatalystAcceptanceCriteria issue={issue ?? null} label="Expected Behavior" />

      {/* Canonical section order across all CatalystView*: Attachments
          → Child work items → Linked work items → Activity. */}
      <CatalystAttachmentsPanel issueId={issue?.id} projectKey={issue?.project_key || projectKey} isOpen={isOpen} />
      <CatalystPagesSection entityType="defect" entityId={issue?.id} entityLabel={issue?.issue_key} isOpen={isOpen} />

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
      {/* Test coverage / Trace-From (CAT-TESTHUB-REPORT-REVAMP, G-002) */}
      {issue?.issue_key && (
        <TestCoveragePanel issueKey={issue.issue_key} statusCategory={issue.status_category} mode="defect" />
      )}
      <CatalystActivitySection itemId={itemId} isOpen={isOpen} />
    </>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectKey, onOpenItem, isOpen, queryClient]);

  /* jira-compare 2026-05-06: Parent restored to Key details (showParent={true}).
     Right rail Parent picker removed 2026-05-03 per Vikram directive.
     Defect's KeyDetails: Parent / Severity / Found in / Fix in / Root Cause / Resolution / Priority. */
  const rightContent = useMemo(() => (
    <CatalystSidebarDetails
      issue={issue ?? null} itemId={itemId} projectId={projectId}
      onStatusChange={(st, reason) => mutations.updateStatus.mutate(reason ? { status: st, reasonCode: reason.code, reasonText: reason.text } : st)}
      onClose={onClose} onDelete={() => mutations.deleteIssue.mutate()} typeLabel="defect"
      parentSource="defect"
      projectKey={projectKey}
      onOpenItem={onOpenItem}
      /* jira-compare 2026-05-03 — Patch B (Defect) · Status pill + Improve dropdown
         anchored together at the rail header. Mirrors CatalystViewStory's Patch D + E. */
      statusPill={<StatusLozengeDropdown status={issue?.status} statusCategory={issue?.status_category} onStatusChange={(st, reason) => mutations.updateStatus.mutate(reason ? { status: st, reasonCode: reason.code, reasonText: reason.text } : st)} issueType={issue?.issue_type} />}
      improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [issue, itemId, projectId, projectKey, onOpenItem, onClose, improveHandlers]);

  return (
    <>
    <CatalystViewBase isOpen={isOpen} onClose={onClose} panelMode={panelMode} fullPageMode={fullPageMode}
      itemType={issue?.issue_type || 'Bug'} itemKey={issue?.issue_key || null}
      projectKey={issue?.project_key || projectKey} projectName={issue?.project_name || undefined}
      parentKey={issue?.parent_key} parentType={resolvedParentType}
      onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
      /* Canonical Add-parent (Catalyst rule): Defect → Story / Epic / Feature parent. */
      parentSource="story_epic_feature"
      onParentChange={async (newKey) => {
        await mutations.updateField.mutateAsync({
          field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
        });
      }}
      /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
      moreMenuItems={useMemo(() => [
        { label: 'Convert to Subtask', onClick: () => {
          const pk = issue?.project_key ?? projectKey;
          const ik = issue?.issue_key;
          if (!pk || !ik) return;
          onClose?.();
          navigate(`/project-hub/${pk}/issue/${ik}/convert-to-subtask`);
        } },
        { label: 'Clone', onClick: () => { if (!issue?.issue_key) return; setShowCloneDialog(true); } },
        { label: 'Move', onClick: () => {
          const pk = issue?.project_key ?? projectKey;
          const ik = issue?.issue_key;
          if (!pk || !ik) return;
          onClose?.();
          navigate(`/project-hub/${pk}/issue/${ik}/move`);
        } },
        { label: 'Archive', onClick: () => { if (!issue?.issue_key) return; setShowArchiveDialog(true); } },
        { label: 'Delete defect', onClick: () => setShowDeleteDialog(true), danger: true },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      ], [issue?.issue_key])}
      flagContext={issue?.id && issue?.issue_key ? {
        issueId: issue.id,
        issueKey: issue.issue_key,
        isFlagged: !!(issue as any).is_flagged,
        issueTitle: issue.summary,
        issueType: issue.issue_type,
        tableName: 'ph_issues',
      } : undefined}
      onTogglePanelMode={onTogglePanelMode} navigationItems={navigationItems} currentItemId={itemId} onNavigate={onNavigate}
      leftContent={leftContent} rightContent={rightContent}
      cover={(issue as any)?.cover ?? null}
      coverItemId={(issue as any)?.id ?? null}
      coverItemTable="ph_issues"
      onCoverChange={(next) => mutations.updateField.mutate({ field: 'cover', value: next, oldValue: (issue as any)?.cover ?? null })}
      isLoading={isLoading} isNotFound={!isLoading && issue === null}
      isError={isError} error={error} onRetry={refetch}
    />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
        issueId={issue?.id}
        projectId={projectId}
        currentAssigneeId={issue?.assignee_account_id}
        currentAssigneeName={issue?.assignee_display_name}
        currentReporterId={issue?.reporter_account_id}
        currentReporterName={issue?.reporter_display_name}
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
      typeLabel="defect"
      onConfirm={() => mutations.deleteIssue.mutate()}
    />
    </>
  );
}