/**
 * CatalystViewStory — Story detail overlay.
 *
 * Patch #9 (2026-04-28): ported off legacy StoryDetailModal (V15) onto
 * the canonical Base+slots pattern, matching Epic/Feature/Subtask/Task.
 * This unblocks Patch #8 (header status pill in CatalystViewBase) and
 * the watchers chip / shared header for Story.
 *
 * Story-unique sections (Attachments, Defects, Incidents, TestHub) are
 * imported directly from story-detail-modules — same convention Epic uses
 * with SubtasksPanel + LinkedWorkItemsSection. The StoryDetailModal shell
 * is retired (Patch 9.4); the modules folder stays because helpers,
 * types, shared-components and the section files are still consumed
 * across the Catalyst views.
 */
import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cloneIssue, archiveIssue } from '@/modules/project-work-hub/lib/workItemRepo';
import { CatalystViewBase } from '../shared/CatalystViewBase';
import { useCatalystIssue, useCatalystIssueMutations } from '../shared/hooks';
import { useTrackRecentItem } from '@/hooks/useRecentProjectItems';
import {
  CatalystTitleEditor, CatalystQuickActions, CatalystDescriptionSection, CatalystAcceptanceCriteria,
  CatalystActivitySection, CatalystSidebarDetails, CatalystStatusPill, CatalystKeyDetails,
} from '../shared/sections';
import { SubtasksPanel } from '@/modules/project-work-hub/components/SubtasksPanel';
import { LinkedWorkItemsSection } from '@/modules/project-work-hub/components/linked-work-items';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import {
  AttachmentsSection,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules';
import type { PhAttachment } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/types';
import { MoveIssueDialog } from '../shared/MoveIssueDialog';
import { ConfirmArchiveDialog } from '../shared/ConfirmArchiveDialog';
import { ConfirmCloneDialog } from '../shared/ConfirmCloneDialog';
import { ConfirmDeleteDialog } from '../shared/ConfirmDeleteDialog';
import type { CatalystViewBaseProps } from '../shared/types';

export default function CatalystViewStory({
  isOpen, onClose, itemId, projectId, projectKey,
  onOpenItem, panelMode, fullPageMode, onTogglePanelMode, navigationItems, onNavigate,
}: CatalystViewBaseProps) {

  const { data: issue, isLoading } = useCatalystIssue(itemId, isOpen);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);
  const { user } = useAuth();
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);
  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const handleClone = React.useCallback(() => {
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
  }, [issue?.issue_key, onOpenItem]);

  /* ── Catalyst-vs-Jira source split ─────────
     Mirrors StoryDetailModal line 291. When ph_issues row carries the
     __catalyst_source flag, attachments + child issues route through the
     catalyst_* tables; otherwise we use the Jira-synced ph_* tables. */
  const workItemSource: 'jira' | 'catalyst' =
    (issue as any)?.__catalyst_source ? 'catalyst' : 'jira';
  const attachmentsTable =
    workItemSource === 'catalyst' ? 'catalyst_attachments' : 'ph_attachments';

  /* ── Attachments fetch (parity with StoryDetailModal lines 447–) ── */
  const { data: attachments = [] } = useQuery({
    queryKey: ['ph-attachments', issue?.id, workItemSource],
    enabled: !!issue?.id && isOpen,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from(attachmentsTable)
        .select('*')
        .eq('work_item_id', issue!.id)
        .order('created_at', { ascending: false });
      return (data ?? []) as PhAttachment[];
    },
  });

  /* ── Recents tracking — Story type, top-level only ─────────
     Stories do not carry a parent of subtask kind, so the subtask-guard
     used in CatalystViewTask is unnecessary here. */
  const trackRecent = useTrackRecentItem();
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen || !issue?.id || !issue?.summary) return;
    if (recordedRef.current === issue.id) return;
    recordedRef.current = issue.id;
    trackRecent.mutate({
      entityType: 'story',
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
      <CatalystTitleEditor
        issue={issue ?? null}
        onTitleChange={(t) =>
          mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue?.summary ?? '' })
        }
      />
      {/* jira-compare follow-up (2026-05-02): Story was missing the
          Jira-parity status button under H1. Other CatalystView* types
          mount it; Story didn't. Lane A re-probe of BAU-5609 confirmed
          Jira renders a 32px status button immediately under the title
          (testid issue-field-status.ui.status-view.status-button). */}
      {/* jira-compare 2026-05-03 — Patch E · CatalystStatusPill relocated to right-rail header in CatalystSidebarDetails. */}
      <CatalystQuickActions />
      {/* jira-compare 2026-05-10: ImproveIssueDropdown relocated to right-rail improveDropdown slot (Vikram "follow jira"). */}
      {/* jira-compare 2026-05-04 (D5 — Vikram approved): Key details section
          re-added to Story left body. DOM-probed Jira BAU-5609 (Story):
          "Key details" header visible with Parent + Priority rows between
          the quick-actions row and Description. Previous note (2026-05-02)
          said Story went "straight from title to Description" — that was
          wrong; the section IS present in Jira for Story. */}
      {issue && (
        <CatalystKeyDetails
          issue={issue}
          itemId={itemId}
          itemType="story"
          projectKey={issue.project_key || projectKey}
          onOpenItem={onOpenItem}
          showParent
          showPriority
        />
      )}
      <CatalystDescriptionSection issue={issue ?? null} />
      <CatalystAcceptanceCriteria issue={issue ?? null} />

      {/* STORY-UNIQUE: Attachments — Jira-parity table with full CRUD. */}
      {issue?.id && user?.id && (
        <AttachmentsSection
          attachments={attachments}
          itemId={issue.id}
          userId={user.id}
          projectKey={issue.project_key || projectKey}
          source={workItemSource}
        />
      )}

      {/* Child sub-tasks (canonical SubtasksPanel) */}
      {issue?.issue_key && (
        <SubtasksPanel
          storyKey={issue.issue_key}
          storyId={issue.id}
          projectKey={issue.project_key || projectKey || ''}
          onSubtaskClick={onOpenItem}
          parentIssueType={issue.issue_type || 'Story'}
          parentSummary={issue.summary || ''}
          parentSource={workItemSource}
          parentProjectId={projectId ?? null}
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
    <CatalystSidebarDetails
      issue={issue ?? null}
      itemId={itemId}
      projectId={projectId}
      onStatusChange={(st) => mutations.updateStatus.mutate(st)}
      onClose={onClose}
      onDelete={() => mutations.deleteIssue.mutate()}
      typeLabel="story"
      /* jira-compare Phase 1 (2026-05-02): Parent picker rendered in the
         right rail. Story → Epic per CatalystViewBase parentSource. */
      parentSource="story"
      projectKey={projectKey}
      onOpenItem={onOpenItem}
      /* jira-compare 2026-05-03 — Patch D + E · Status pill + Improve dropdown
         anchored together at the rail header. Mirrors Jira's "In QA" / "Improve
         Story" pair on the right side of BAU-5609. */
      statusPill={<CatalystStatusPill status={issue?.status} statusCategory={issue?.status_category} onStatusChange={(st) => mutations.updateStatus.mutate(st)} issueType={issue?.issue_type} />}
      improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />}
    />
  );

  return (
    <>
      <CatalystViewBase
        isOpen={isOpen}
        onClose={onClose}
        panelMode={panelMode}
        fullPageMode={fullPageMode}
        itemType={issue?.issue_type || 'Story'}
        itemKey={issue?.issue_key || null}
        projectKey={issue?.project_key || projectKey}
        projectName={issue?.project_name || undefined}
        parentKey={issue?.parent_key}
        parentType="Epic"
        onParentClick={issue?.parent_key ? () => onOpenItem?.(issue.parent_key!) : undefined}
        /* Canonical Add-parent (Jira parity): Story → Epic parent. */
        parentSource="epic"
        onParentChange={async (newKey) => {
          await mutations.updateField.mutateAsync({
            field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
          });
        }}
        /* onShare removed 2026-05-10 — canonical handleShare owns ticket URL */
        moreMenuItems={[
          { label: 'Clone', onClick: () => { if (!issue?.issue_key) return; setShowCloneDialog(true); } },
          { label: 'Move to project…', onClick: () => setShowMoveDialog(true) },
          { label: 'Archive', onClick: () => { if (!issue?.issue_key) return; setShowArchiveDialog(true); } },
          { label: 'Delete story', onClick: () => setShowDeleteDialog(true), danger: true },
        ]}
        onTogglePanelMode={onTogglePanelMode}
        navigationItems={navigationItems}
        currentItemId={itemId}
        onNavigate={onNavigate}
        leftContent={leftContent}
        rightContent={rightContent}
        isLoading={isLoading}
        isNotFound={!isLoading && issue === null}
      />
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
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
            .then(() => { toast.success('Issue archived'); onClose(); })
            .catch((e: unknown) => { toast.error('Archive failed', { description: e instanceof Error ? e.message : 'Unknown error' }); });
        }}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
        typeLabel="story"
        onConfirm={() => mutations.deleteIssue.mutate()}
      />
    </>
  );
}
