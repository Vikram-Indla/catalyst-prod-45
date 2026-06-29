/**
 * CatalystDetailPanel — SINGLE canonical side panel for every Catalyst
 * detail surface (backlog, tasks, timeline, releases).
 *
 * Replaces the old CatalystViewBase-based two-column panel that suffered
 * from broken section sequence on every consumer. The new layout is a
 * single column owned by this component:
 *   1. Top chrome (type · "Catalyst work item" · open-page · close)
 *   2. Breadcrumb chrome (project / Add parent / key · copy · ⋯ · expand)
 *   3. Title
 *   4. Status pill · Improve · Discuss
 *   5. Quick actions (+)
 *   6. Details — Sprint · Assignee · Reporter (no border)
 *   7. Key details + Description + Activity
 *   8. Created · Updated
 *
 * Modes:
 *   - inline      — flex child inside a parent layout (release-detail rail)
 *   - overlay     — position:fixed, drag-resizable (backlog, tasks, timeline)
 *
 * entityKind:
 *   - ph_issue (default) — custom single-column layout above
 *   - task               — TaskCatalystView (Tasks Hub data source)
 *   - release            — ReleaseDetailContent (full release detail)
 */
import React, { lazy, Suspense, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import Spinner from '@atlaskit/spinner';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import CloseIcon from '@atlaskit/icon/core/close';
import LinkIcon from '@atlaskit/icon/core/link';
import LinkExternalIcon from '@atlaskit/icon/core/link-external';
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
  StatusLozengeDropdown,
} from '@/components/catalyst-detail-views/shared/sections';
import { DiscussTicketButton } from '@/components/catalyst-detail-views/shared/DiscussTicketButton';
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import {
  EditableAssignee,
  EditableReporter,
  EditableSprintReleases as EditableSprintRelease,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';

const CatalystDetailRouter = lazy(
  () => import('@/components/catalyst-detail-views/CatalystDetailRouter')
);
const ReleaseDetailContent = lazy(
  () => import('@/pages/releasehub/ReleaseDetailPage').then(m => ({ default: m.ReleaseDetailContent }))
);

const BORDER = 'var(--ds-border)';
const TEXT = 'var(--ds-text)';
const SUBTLE = 'var(--ds-text-subtle)';

export interface CatalystDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  /** ph_issues.issue_key (e.g. "BAU-5364"), tasks.id, or ph_releases.id */
  itemId: string;
  /** Free-text type used by CatalystDetailRouter (e.g. "Story", "QA Bug") */
  itemType?: string;
  /** Type label for the JiraIssueTypeIcon in the header */
  typeIconLabel?: string;
  projectKey: string;
  projectId?: string;
  /** When provided, shows the open-in-full-page icon in the header */
  onOpenFullPage?: () => void;

  /** Source table / view variant */
  entityKind?: 'ph_issue' | 'task' | 'release' | 'test_cycle';

  /** Inline mode: flex item with fixed width, no resize. Overlay mode (default):
   *  position:fixed with drag-resize handle. */
  inline?: boolean;

  /** Overlay-mode width controlled by parent (drag-resize callbacks). */
  width?: number;
  onResize?: (next: number) => void;
  onResizeCommit?: (final: number) => void;
  minWidth?: number;
  maxWidth?: number;
  /** Pixels reserved above the panel (global topbar height). Default 56. */
  topOffset?: number;
}

export function CatalystDetailPanel(props: CatalystDetailPanelProps) {
  const {
    isOpen, onClose, itemId, itemType, typeIconLabel, projectKey, projectId,
    onOpenFullPage, entityKind = 'ph_issue', inline = false,
    width = 440, onResize, onResizeCommit,
    minWidth = 360, maxWidth = 550, topOffset = 56,
  } = props;

  const [resizing, setResizing] = useState<{ originX: number; originWidth: number } | null>(null);

  useEffect(() => {
    if (!resizing || inline) return;
    const clamp = (w: number) => Math.max(minWidth, Math.min(maxWidth, w));
    const onMove = (e: MouseEvent) => {
      const next = clamp(resizing.originWidth + (resizing.originX - e.clientX));
      onResize?.(next);
    };
    const onUp = (e: MouseEvent) => {
      const final = clamp(resizing.originWidth + (resizing.originX - e.clientX));
      onResize?.(final);
      onResizeCommit?.(final);
      setResizing(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp, { once: true });
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizing, minWidth, maxWidth, onResize, onResizeCommit, inline]);

  if (!isOpen) return null;

  const containerStyle: React.CSSProperties = inline
    ? {
        width, flexShrink: 0, display: 'flex', flexDirection: 'column',
        minHeight: 0, background: 'var(--ds-surface)',
      }
    : {
        position: 'fixed', top: topOffset, right: 0, bottom: 0, width,
        zIndex: 50, borderLeft: `1px solid ${BORDER}`, background: 'var(--ds-surface)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: resizing ? 'none' : 'width 180ms ease',
      };

  return (
    <div data-cv-stacked-panel="true" style={containerStyle}>
      {/* Drag handle — overlay mode only */}
      {!inline && (
        <div
          role="separator"
          aria-label="Resize detail panel"
          aria-orientation="vertical"
          tabIndex={0}
          onMouseDown={(e) => {
            e.preventDefault();
            setResizing({ originX: e.clientX, originWidth: width });
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const next = Math.min(maxWidth, width + (e.shiftKey ? 40 : 10));
              onResize?.(next);
              onResizeCommit?.(next);
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              const next = Math.max(minWidth, width - (e.shiftKey ? 40 : 10));
              onResize?.(next);
              onResizeCommit?.(next);
            }
          }}
          onMouseEnter={(e) => { if (!resizing) e.currentTarget.style.boxShadow = 'inset 1px 0 0 0 var(--ds-link, var(--ds-link))'; }}
          onMouseLeave={(e) => { if (!resizing) e.currentTarget.style.boxShadow = 'none'; }}
          style={{
            position: 'absolute', top: 0, left: -2, bottom: 0, width: 6,
            cursor: 'col-resize', background: 'transparent',
            boxShadow: resizing ? 'inset 1px 0 0 0 var(--ds-link)' : 'none',
            zIndex: 51, transition: 'box-shadow 120ms ease',
          }}
        />
      )}

      {entityKind === 'release' ? (
        <ReleasePanelBody itemId={itemId} typeIconLabel={typeIconLabel} onClose={onClose} onOpenFullPage={onOpenFullPage} />
      ) : entityKind === 'task' ? (
        <TaskPanelBody itemId={itemId} itemType={itemType} typeIconLabel={typeIconLabel} projectKey={projectKey} projectId={projectId} onClose={onClose} onOpenFullPage={onOpenFullPage} />
      ) : entityKind === 'test_cycle' ? (
        <TestCyclePanelBody itemId={itemId} itemType={itemType} typeIconLabel={typeIconLabel} projectKey={projectKey} projectId={projectId} onClose={onClose} onOpenFullPage={onOpenFullPage} />
      ) : (
        <PhIssuePanelBody itemId={itemId} itemType={itemType} typeIconLabel={typeIconLabel} projectKey={projectKey} projectId={projectId} onClose={onClose} onOpenFullPage={onOpenFullPage} />
      )}
    </div>
  );
}

export default CatalystDetailPanel;

// ──────────────────────────────────────────────────────────────────────
// ph_issue body (canonical single-column layout)
// ──────────────────────────────────────────────────────────────────────

function PhIssuePanelBody({
  itemId, itemType, typeIconLabel, projectKey, projectId, onClose, onOpenFullPage,
}: {
  itemId: string;
  itemType?: string;
  typeIconLabel?: string;
  projectKey: string;
  projectId?: string;
  onClose: () => void;
  onOpenFullPage?: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: issue, isLoading } = useCatalystIssue(itemId, true);
  const mutations = useCatalystIssueMutations(itemId, onClose);
  const improveHandlers = useImproveApplyHandlers(issue ?? null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] });

  const issueKeyShown = issue?.issue_key || itemId;
  const projectName = (issue as any)?.project_name || projectKey;
  const effectiveType = issue?.issue_type || itemType || typeIconLabel || 'Story';

  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);

  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState<{ top: number; right: number } | null>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  useEffect(() => {
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

  const parentSource = (() => {
    const t = (effectiveType || '').toLowerCase();
    if (t === 'epic') return 'business_request' as const;
    if (t === 'story' || t === 'feature' || t === 'new feature') return 'epic' as const;
    if (t === 'sub-task' || t === 'subtask' || t === 'backend' || t === 'frontend' || t === 'integration') return 'story' as const;
    if (t === 'task' || t === 'qa bug' || t === 'bug' || t === 'defect') return 'story_epic_feature' as const;
    if (t === 'production incident' || t === 'business gap') return 'br_epic_feature' as const;
    if (t === 'change request') return 'story_epic_br' as const;
    return 'epic' as const;
  })();

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/project-hub/${projectKey}/backlog/${issueKeyShown}`;
      await navigator.clipboard.writeText(url);
    } catch { /* swallow */ }
  };

  const handleExpandFullPage = () => {
    if (onOpenFullPage) { onOpenFullPage(); return; }
    if (!issueKeyShown) return;
    window.open(`/project-hub/${projectKey}/backlog/${issueKeyShown}`, '_blank');
  };

  return (
    <>
      {/* Row 1 — type + label + open-page + close */}
      <ChromeRow
        type={effectiveType}
        onClose={onClose}
        onOpenFullPage={handleExpandFullPage}
      />

      {/* Row 2 — breadcrumb + copy + more + expand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', minHeight: 36, flexShrink: 0, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-300)', color: SUBTLE }}>
          {effectiveType && <JiraIssueTypeIcon type={effectiveType as any} size={14} />}
          <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--ds-link, var(--ds-link))', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            {projectName}
          </a>
          <span>/</span>
          {issue && !issue.parent_key && issueKeyShown && (
            <AddParentPicker
              issueKey={issueKeyShown}
              parentKey={null}
              projectKey={projectKey}
              parentIssueType={effectiveType || undefined}
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
            <a href="#" onClick={(e) => e.preventDefault()} style={{ color: 'var(--ds-link, var(--ds-link))', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {issue.parent_key}
            </a>
          )}
          <span>/</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ds-link)', fontWeight: 500, whiteSpace: 'nowrap' }}>
            {effectiveType && <JiraIssueTypeIcon type={effectiveType as any} size={14} />}
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
            width: 28, height: 28,
            border: `1px solid ${moreOpen ? 'var(--ds-border-selected)' : 'transparent'}`,
            borderRadius: 3,
            background: moreOpen ? 'var(--ds-background-selected)' : 'transparent',
            cursor: 'pointer', padding: 0, flexShrink: 0, color: SUBTLE,
          }}
          onMouseEnter={(e) => { if (!moreOpen) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, var(--ds-background-neutral))'; }}
          onMouseLeave={(e) => { if (!moreOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <MoreIcon label="" size="small" primaryColor="currentColor" />
        </button>
        <IconButton ariaLabel="Expand panel" onClick={handleExpandFullPage}>
          <MaximizeIcon label="" color="currentColor" />
        </IconButton>
      </div>

      {/* Scroll container */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px 32px' }}>
        {isLoading || !issue ? (
          <div style={{ color: SUBTLE, fontSize: 'var(--ds-font-size-400)' }}>Loading…</div>
        ) : (
          <>
            <CatalystTitleEditor
              issue={issue}
              onTitleChange={(t) => mutations.updateField.mutate({ field: 'summary', value: t, oldValue: issue.summary ?? '' })}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              <StatusLozengeDropdown
                status={issue.status}
                statusCategory={issue.status_category}
                onStatusChange={(st) => mutations.updateStatus.mutate(st)}
                issueType={issue.issue_type}
              />
              <ImproveIssueDropdown issue={issue} {...improveHandlers} />
              {issue.issue_key && <DiscussTicketButton issueKey={issue.issue_key} variant="full" />}
            </div>

            <CatalystQuickActions />

            <div style={{ marginBottom: 16 }}>
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

            <CatalystKeyDetails
              issue={issue}
              itemId={itemId}
              itemType={(effectiveType || 'story').toLowerCase() as any}
              projectKey={projectKey}
              showParent={true}
              showPriority={true}
              afterBody={<Description issue={issue} />}
            />

            <CatalystActivitySection itemId={itemId} isOpen={true} />

            <div style={{ marginTop: 24, paddingTop: 12 }}>
              {issue.jira_created_at && (
                <div style={{ marginBottom: 4, fontSize: 'var(--ds-font-size-200)', color: SUBTLE }} title={issue.jira_created_at}>
                  Created {fmtAbs(issue.jira_created_at)}
                </div>
              )}
              {issue.jira_updated_at && (
                <div style={{ fontSize: 'var(--ds-font-size-200)', color: SUBTLE }} title={issue.jira_updated_at}>
                  Updated {fmtRel(issue.jira_updated_at)}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* More-menu portal */}
      {moreOpen && morePos && createPortal(
        <div
          ref={moreMenuRef}
          role="menu"
          style={{
            position: 'fixed', top: morePos.top, right: morePos.right, zIndex: 10010,
            minWidth: 200, background: 'var(--ds-surface-overlay)',
            border: `1px solid ${BORDER}`, borderRadius: 4,
            boxShadow: '0 8px 24px rgba(9,30,66,0.16), 0 2px 4px rgba(9,30,66,0.08)', // ads-scanner:ignore-line — Atlassian elevation shadow rgba(9,30,66,*), no ds-shadow token for arbitrary alpha
            padding: '4px 0',
          }}
        >
          <MenuItem label="Print" onClick={() => { setMoreOpen(false); window.print(); }} />
          <MenuItem label="Clone" onClick={() => { setMoreOpen(false); if (issue?.issue_key) setShowCloneDialog(true); }} />
          <MenuItem label="Move to project…" onClick={() => { setMoreOpen(false); setShowMoveDialog(true); }} />
          <MenuItem label="Archive" onClick={() => { setMoreOpen(false); if (issue?.issue_key) setShowArchiveDialog(true); }} />
          <div style={{ height: 1, background: BORDER, margin: '4px 0' }} />
          <MenuItem label={`Delete ${(effectiveType || 'item').toLowerCase()}`} danger onClick={() => { setMoreOpen(false); setShowDeleteDialog(true); }} />
        </div>,
        document.body,
      )}

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
        typeLabel={(effectiveType || 'item').toLowerCase()}
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
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Task body — delegates to TaskCatalystView via the router
// ──────────────────────────────────────────────────────────────────────

function TaskPanelBody({
  itemId, itemType, typeIconLabel, projectKey, projectId, onClose, onOpenFullPage,
}: {
  itemId: string;
  itemType?: string;
  typeIconLabel?: string;
  projectKey: string;
  projectId?: string;
  onClose: () => void;
  onOpenFullPage?: () => void;
}) {
  return (
    <>
      <ChromeRow
        type={typeIconLabel || itemType || 'Task'}
        onClose={onClose}
        onOpenFullPage={onOpenFullPage}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner size="medium" /></div>}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={onClose}
            itemId={itemId}
            itemType={itemType}
            projectKey={projectKey}
            projectId={projectId}
            panelMode={true}
            hideSidebar={true}
            entityKind="task"
          />
        </Suspense>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Test cycle body — delegates to CatalystViewTestCycle via the router
// (entityKind='test_cycle'). tm_test_cycles, UUID-keyed. 2026-06-28.
// ──────────────────────────────────────────────────────────────────────

function TestCyclePanelBody({
  itemId, itemType, typeIconLabel, projectKey, projectId, onClose, onOpenFullPage,
}: {
  itemId: string;
  itemType?: string;
  typeIconLabel?: string;
  projectKey: string;
  projectId?: string;
  onClose: () => void;
  onOpenFullPage?: () => void;
}) {
  return (
    <>
      <ChromeRow
        type={typeIconLabel || itemType || 'Test Cycle'}
        labelText="Test Cycle"
        onClose={onClose}
        onOpenFullPage={onOpenFullPage}
      />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner size="medium" /></div>}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={onClose}
            itemId={itemId}
            itemType={itemType}
            projectKey={projectKey}
            projectId={projectId}
            panelMode={true}
            hideSidebar={true}
            entityKind="test_cycle"
          />
        </Suspense>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Release body — delegates to ReleaseDetailContent
// ──────────────────────────────────────────────────────────────────────

function ReleasePanelBody({
  itemId, typeIconLabel, onClose, onOpenFullPage,
}: {
  itemId: string;
  typeIconLabel?: string;
  onClose: () => void;
  onOpenFullPage?: () => void;
}) {
  return (
    <>
      <ChromeRow
        type={typeIconLabel || 'Release'}
        labelText="Release"
        onClose={onClose}
        onOpenFullPage={onOpenFullPage}
      />
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}><Spinner size="medium" /></div>}>
          <ReleaseDetailContent releaseId={itemId} hideChromeHeader />
        </Suspense>
      </div>
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Shared chrome / helpers
// ──────────────────────────────────────────────────────────────────────

function ChromeRow({
  type, labelText = 'Catalyst work item', onClose, onOpenFullPage,
}: {
  type?: string;
  labelText?: string;
  onClose: () => void;
  onOpenFullPage?: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        padding: '8px 12px', minHeight: 44, flexShrink: 0,
        borderBottom: `1px solid ${BORDER}`,
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
        {type && (
          <span style={{ display: 'inline-flex', flexShrink: 0 }}>
            <JiraIssueTypeIcon type={type as any} size={16} />
          </span>
        )}
        <span style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 500, color: SUBTLE, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {labelText}
        </span>
      </div>
      <IconButton ariaLabel="Open in full page" onClick={onOpenFullPage}>
        <LinkExternalIcon label="Open in full page" color="currentColor" />
      </IconButton>
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 28, height: 28, border: `1px solid ${BORDER}`, borderRadius: 3,
          background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0,
          color: SUBTLE, transition: 'background-color 100ms ease',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, var(--ds-background-neutral))'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
      >
        <CloseIcon label="Close" color="currentColor" />
      </button>
    </div>
  );
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
        width: 28, height: 28,
        border: `1px solid ${active ? 'var(--ds-border-selected)' : 'transparent'}`,
        borderRadius: 3,
        background: active ? 'var(--ds-background-selected)' : 'transparent',
        cursor: 'pointer', padding: 0, flexShrink: 0, color: SUBTLE,
        transition: 'background-color 100ms ease',
      }}
      onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral, var(--ds-background-neutral))'; }}
      onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '4px 0' }}>
      <span style={{ fontSize: 'var(--ds-font-size-400)', fontWeight: 500, lineHeight: '20px', color: SUBTLE, minWidth: 120, flexShrink: 0 }}>
        {label}
      </span>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1, minWidth: 0, fontSize: 'var(--ds-font-size-400)', color: TEXT,
          padding: '4px 6px', margin: '-4px -6px', borderRadius: 3,
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
        boxSizing: 'border-box', padding: '8px 14px', fontSize: 'var(--ds-font-size-400)',
        color: danger ? 'var(--ds-text-danger)' : TEXT,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {label}
    </button>
  );
}

function fmtAbs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
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
