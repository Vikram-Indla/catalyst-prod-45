/**
 * WorkItemSidePanel — release-detail right-rail work item view.
 *
 * Builds a custom single-column layout (no CatalystViewBase) so the
 * section order is exactly what Vikram specified:
 *   1. Title
 *   2. Status pill · Improve · Discuss
 *   3. Quick actions (+ button)
 *   4. Details (Sprint · Assignee · Reporter) — NO border
 *   5. Key details · Description · Activity (the canonical sections)
 *   6. Created · Updated
 */
import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import CloseIcon from '@atlaskit/icon/core/close';
import LinkIcon from '@atlaskit/icon/core/link';
import ShortcutIcon from '@atlaskit/icon/core/shortcut';
import MaximizeIcon from '@atlaskit/icon/core/maximize';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { AddParentPicker } from '@/components/shared/AddParentPicker';
import { ConfirmCloneDialog } from '@/components/catalyst-detail-views/shared/ConfirmCloneDialog';
import { ConfirmArchiveDialog } from '@/components/catalyst-detail-views/shared/ConfirmArchiveDialog';
import { ConfirmDeleteDialog } from '@/components/catalyst-detail-views/shared/ConfirmDeleteDialog';
import { MoveIssueDialog } from '@/components/catalyst-detail-views/shared/MoveIssueDialog';
import { catalystToast } from '@/lib/catalystToast';
import { useCatalystIssue, useCatalystIssueMutations } from '@/components/catalyst-detail-views/shared/hooks';
import {
  CatalystTitleEditor,
  CatalystQuickActions,
  Description,
  CatalystActivitySection,
  CatalystKeyDetails,
  CatalystStatusPill,
} from '@/components/catalyst-detail-views/shared/sections';
import { DiscussTicketButton } from '@/components/catalyst-detail-views/shared/DiscussTicketButton';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import {
  EditableAssignee,
  EditableReporter,
  EditableSprintReleases as EditableSprintRelease,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';

const BORDER = 'var(--ds-border, #DFE1E6)';
const TEXT = 'var(--ds-text, #292A2E)';
const SUBTLE = 'var(--ds-text-subtle, #505258)';

interface Props {
  issueKey: string;
  issueType: string | null;
  projectId: string;
  projectKey: string;
  onClose: () => void;
}

function fmtAbs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch { return iso; }
}

function fmtRel(iso: string): string {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    const s = Math.floor(ms / 1000);
    if (s < 60) return `${s} seconds ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
    const days = Math.floor(h / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;
    const years = Math.floor(months / 12);
    return `${years} year${years === 1 ? '' : 's'} ago`;
  } catch { return iso; }
}

function IconButton({
  ariaLabel, onClick, children, active = false,
}: { ariaLabel: string; onClick?: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 28, height: 28, border: `1px solid ${active ? 'var(--ds-border-selected, #1868DB)' : 'transparent'}`,
        borderRadius: 3, background: active ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
        cursor: 'pointer', padding: 0, flexShrink: 0, color: SUBTLE,
        transition: 'background-color 100ms ease',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #EBECF0)'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '6px 0' }}>
      <span
        style={{
          fontSize: 14, fontWeight: 500, lineHeight: '20px',
          color: SUBTLE, minWidth: 120, flexShrink: 0,
        }}
      >
        {label}
      </span>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          color: TEXT,
          padding: '4px 6px',
          margin: '-4px -6px',
          borderRadius: 3,
          background: hovered
            ? 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'
            : 'transparent',
          transition: 'background 80ms ease',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function WorkItemSidePanel({ issueKey, issueType, projectId, projectKey, onClose }: Props) {
  const queryClient = useQueryClient();
  const { data: issue, isLoading } = useCatalystIssue(issueKey, true);
  const mutations = useCatalystIssueMutations(issueKey, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', issueKey] });

  const issueKeyShown = issue?.issue_key || issueKey;
  const projectName = (issue as any)?.project_name || projectKey;

  const [showCloneDialog, setShowCloneDialog] = React.useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [showMoveDialog, setShowMoveDialog] = React.useState(false);

  // More menu portal state
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [morePos, setMorePos] = React.useState<{ top: number; right: number } | null>(null);
  const moreTriggerRef = React.useRef<HTMLButtonElement>(null);
  const moreMenuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!moreOpen || !moreTriggerRef.current) return;
    const update = () => {
      const r = moreTriggerRef.current!.getBoundingClientRect();
      setMorePos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [moreOpen]);

  React.useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreTriggerRef.current?.contains(t)) return;
      if (moreMenuRef.current?.contains(t)) return;
      setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setMoreOpen(false); }
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [moreOpen]);

  const handleClone = () => {
    if (!issue?.issue_key) return;
    setShowCloneDialog(false);
    catalystToast.success(`Cloned ${issue.issue_key}`);
  };

  // Resolve canonical parentSource per Catalyst parent rules.
  const parentSource: 'epic' | 'business_request' | 'story' | 'story_epic_feature' | 'br_epic_feature' | 'story_epic_br' | 'story_epic_feature_br' = (() => {
    const t = (issue?.issue_type || issueType || '').toLowerCase();
    if (t === 'epic') return 'business_request';
    if (t === 'story' || t === 'feature' || t === 'new feature') return 'epic';
    if (t === 'sub-task' || t === 'subtask' || t === 'backend' || t === 'frontend' || t === 'integration') return 'story';
    if (t === 'task' || t === 'qa bug' || t === 'bug' || t === 'defect') return 'story_epic_feature';
    if (t === 'production incident' || t === 'business gap') return 'br_epic_feature';
    if (t === 'change request') return 'story_epic_br';
    return 'epic';
  })();

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/project-hub/${projectKey}/backlog/${issueKeyShown}`;
      await navigator.clipboard.writeText(url);
    } catch { /* swallow */ }
  };

  const handleOpenFullPage = () => {
    if (!issueKeyShown) return;
    window.open(`/project-hub/${projectKey}/backlog/${issueKeyShown}`, '_blank');
  };

  return (
    <div style={{ width: 440, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--ds-surface, #FFFFFF)' }}>
      {/* ── Top chrome row 1: type + label + open-page + close ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', minHeight: 44, flexShrink: 0,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
            {issueType && <JiraIssueTypeIcon type={issueType as any} size={16} />}
          </span>
          <span style={{ fontSize: 12, fontWeight: 500, color: SUBTLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Catalyst work item
          </span>
        </div>
        <IconButton ariaLabel="Open in full page" onClick={handleOpenFullPage}>
          <ShortcutIcon label="" color="currentColor" />
        </IconButton>
        <button
          type="button"
          aria-label="Close detail"
          onClick={onClose}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, border: `1px solid ${BORDER}`, borderRadius: 3,
            background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0,
            color: SUBTLE,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #EBECF0)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <CloseIcon label="Close" color="currentColor" />
        </button>
      </div>

      {/* ── Breadcrumb row: project / Add parent / key + copy / more / open ── */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', minHeight: 36, flexShrink: 0,
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, fontSize: 13, color: SUBTLE }}>
          {issueType && <JiraIssueTypeIcon type={issueType as any} size={14} />}
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ color: 'var(--ds-link, #0C66E4)', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            {projectName}
          </a>
          <span>/</span>
          {issue && !issue.parent_key && issueKeyShown && (
            <AddParentPicker
              issueKey={issueKeyShown}
              parentKey={null}
              projectKey={projectKey}
              parentIssueType={issueType || undefined}
              parentSource={parentSource}
              variant="breadcrumb"
              onParentChange={async (newKey) => {
                await mutations.updateField.mutateAsync({
                  field: 'parent_key', value: newKey, oldValue: issue?.parent_key ?? null,
                });
              }}
            />
          )}
          {issue?.parent_key && (
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{ color: 'var(--ds-link, #0C66E4)', textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              {issue.parent_key}
            </a>
          )}
          <span>/</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ds-link, #0C66E4)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {issueType && <JiraIssueTypeIcon type={issueType as any} size={14} />}
            {issueKeyShown}
          </span>
        </div>
        <IconButton ariaLabel="Copy link" onClick={handleCopyLink}>
          <LinkIcon label="" color="currentColor" />
        </IconButton>
        <button
          ref={moreTriggerRef}
          type="button"
          aria-label="More actions"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, border: `1px solid ${moreOpen ? 'var(--ds-border-selected, #1868DB)' : 'transparent'}`,
            borderRadius: 3, background: moreOpen ? 'var(--ds-background-selected, #E9F2FE)' : 'transparent',
            cursor: 'pointer', padding: 0, flexShrink: 0, color: SUBTLE,
          }}
          onMouseEnter={(e) => { if (!moreOpen) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, #EBECF0)'; }}
          onMouseLeave={(e) => { if (!moreOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <MoreIcon label="" size="small" primaryColor="currentColor" />
        </button>
        <IconButton ariaLabel="Expand panel" onClick={handleOpenFullPage}>
          <MaximizeIcon label="" color="currentColor" />
        </IconButton>
      </div>

      {/* ── Scroll container ── */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 32px' }}>
        {isLoading || !issue ? (
          <div style={{ color: SUBTLE, fontSize: 14 }}>Loading…</div>
        ) : (
          <>
            {/* 1. Title */}
            <CatalystTitleEditor
              issue={issue}
              onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue.summary ?? '' })}
            />

            {/* 2. Status + Improve + Discuss */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <CatalystStatusPill
                status={issue.status}
                statusCategory={issue.status_category}
                onStatusChange={(st) => mutations.updateStatus.mutate(st)}
                issueType={issue.issue_type}
              />
              <ImproveIssueDropdown issue={issue} {...improveHandlers} />
              {issue.issue_key && <DiscussTicketButton issueKey={issue.issue_key} variant="full" />}
            </div>

            {/* 3. Quick actions */}
            <CatalystQuickActions />

            {/* 4. Details — no border */}
            <div style={{ marginBottom: 20 }}>
              {issue.issue_type !== 'Feature' && (
                <FieldRow label="Sprint/Iteration">
                  <EditableSprintRelease
                    issueId={issue.id}
                    currentSprintRelease={issue.sprint_release}
                    projectKey={issue.project_key}
                    onUpdate={invalidate}
                  />
                </FieldRow>
              )}
              <FieldRow label="Assignee">
                <EditableAssignee
                  issueId={issue.id}
                  projectId={projectId || ''}
                  currentAssigneeId={issue.assignee_account_id}
                  currentAssigneeName={issue.assignee_display_name}
                  onUpdate={invalidate}
                />
              </FieldRow>
              <FieldRow label="Reporter">
                <EditableReporter
                  issueId={issue.id}
                  projectId={projectId || ''}
                  currentReporterId={issue.reporter_account_id}
                  currentReporterName={issue.reporter_display_name}
                  onUpdate={invalidate}
                />
              </FieldRow>
            </div>

            {/* 5. Key details + Description + Activity */}
            <CatalystKeyDetails
              issue={issue}
              itemId={issueKey}
              itemType={(issueType || 'story').toLowerCase() as any}
              projectKey={projectKey}
              showParent={true}
              showPriority={true}
              afterBody={<Description issue={issue} />}
            />

            <CatalystActivitySection itemId={issueKey} isOpen={true} />

            {/* 6. Created / Updated */}
            <div style={{ marginTop: 24, paddingTop: 12 }}>
              {issue.jira_created_at && (
                <div style={{ marginBottom: 4, fontSize: 12, color: SUBTLE }} title={issue.jira_created_at}>
                  Created {fmtAbs(issue.jira_created_at)}
                </div>
              )}
              {issue.jira_updated_at && (
                <div style={{ fontSize: 12, color: SUBTLE }} title={issue.jira_updated_at}>
                  Updated {fmtRel(issue.jira_updated_at)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── More-menu portal ── */}
      {moreOpen && morePos && createPortal(
        <div
          ref={moreMenuRef}
          role="menu"
          style={{
            position: 'fixed', top: morePos.top, right: morePos.right, zIndex: 10010,
            minWidth: 200, background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)',
            padding: '6px 0',
          }}
        >
          <MenuItem label="Print" onClick={() => { setMoreOpen(false); window.print(); }} />
          <MenuItem label="Clone" onClick={() => { setMoreOpen(false); if (issue?.issue_key) setShowCloneDialog(true); }} />
          <MenuItem label="Move to project…" onClick={() => { setMoreOpen(false); setShowMoveDialog(true); }} />
          <MenuItem label="Archive" onClick={() => { setMoreOpen(false); if (issue?.issue_key) setShowArchiveDialog(true); }} />
          <div style={{ height: 1, background: BORDER, margin: '6px 0' }} />
          <MenuItem label={`Delete ${(issueType || 'item').toLowerCase()}`} danger onClick={() => { setMoreOpen(false); setShowDeleteDialog(true); }} />
        </div>,
        document.body,
      )}

      {/* ── Confirmation dialogs ── */}
      <ConfirmCloneDialog
        isOpen={showCloneDialog}
        onClose={() => setShowCloneDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
        onConfirm={handleClone}
      />
      <ConfirmArchiveDialog
        isOpen={showArchiveDialog}
        onClose={() => setShowArchiveDialog(false)}
        issueSummary={issue?.summary}
        onConfirm={() => { setShowArchiveDialog(false); catalystToast.success('Archived'); onClose(); }}
      />
      <ConfirmDeleteDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        issueKey={issue?.issue_key}
        issueSummary={issue?.summary}
        typeLabel={(issueType || 'item').toLowerCase()}
        onConfirm={() => { setShowDeleteDialog(false); mutations.deleteIssue.mutate(); }}
      />
      {issue?.issue_key && (
        <MoveIssueDialog
          isOpen={showMoveDialog}
          onClose={() => setShowMoveDialog(false)}
          issueKey={issue.issue_key}
          issueSummary={issue.summary}
          currentProjectKey={issue.project_key || projectKey}
          onMoved={onClose}
        />
      )}
    </div>
  );
}

function MenuItem({
  label, onClick, danger = false,
}: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      style={{
        all: 'unset', cursor: 'pointer', display: 'block', width: '100%',
        boxSizing: 'border-box', padding: '8px 14px', fontSize: 14,
        color: danger ? 'var(--ds-text-danger, #C9372C)' : TEXT,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}

export default WorkItemSidePanel;
