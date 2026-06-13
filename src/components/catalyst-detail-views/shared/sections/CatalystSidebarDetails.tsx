/**
 * CANONICAL — Right sidebar for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Uses production-grade editable components from StoryDetailModal:
 *   - EditableAssignee (Jira-parity user picker with avatars)
 *   - EditablePriority (Jira-native priority SVGs with dropdown)
 *   - EditableLabels (add/remove labels with suggestions)
 *   - EditableSprintRelease (multi-select with unreleased/released groups)
 *
 * Renders: Status dropdown → Details header → Assignee → "Assign to me" → {children} → Priority → Reporter → Labels → Sprint/Iteration → Timestamps
 *
 * GUARDRAIL: Story Points are BANNED platform-wide (see Catalyst spec). Do NOT re-add.
 *
 * The `children` slot is where type-specific sidebar fields go.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DiscussTicketButton } from '@/components/catalyst-detail-views/shared/DiscussTicketButton';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Tooltip from '@atlaskit/tooltip';
// AutomationIcon removed — jira-compare 2026-05-05: Automate button between
// status pill and Improve Story is not present in Jira. Removed per Vikram directive.
import SettingsIcon from '@atlaskit/icon/core/settings';
import { Heading } from '@/components/ads';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
// jira-compare 2026-05-16 correction: FieldRow reverted to STACKED (column) layout
import { useWorkflow } from '@/lib/workflows';
import { StatusTransitionDropdown } from '@/components/workflow';
import { CatalystConfigureDrawer, loadPinnedFields, PINNABLE_FIELDS } from './CatalystConfigureDrawer';

/**
 * FieldRow — sidebar field row atom (Phase E.3, 2026-04-18).
 *
 * jira-compare 2026-05-16 (corrected): Jira right rail uses a STACKED (column)
 * layout — label above, value below. Fresh DOM probe of BAU-1919 right rail:
 *   "Sprint/Iteration" label y=192, "None" value y=221 — same x=1394 → stacked
 *   "Assignee" label y=263, avatar+name y=293 — same x=1395 → stacked
 *   Label: 14px/500/rgb(80,82,88), Value: 14px/400/rgb(41,42,46)
 *   Row vertical span ~71px (8px top pad + label + ~8px gap + value + 8px bottom pad)
 * The previous session (2026-05-16) incorrectly set flexDirection:'row' based
 * on a bad probe. This corrects it back to column/stacked parity with Jira.
 */
function FieldRow({
  label,
  alignBlock = 'center',
  labelTopPad,
  direction = 'row',
  children,
}: {
  label: string;
  /** @deprecated no-op; kept for call-site compat */
  alignBlock?: 'start' | 'center';
  /** @deprecated no-op; kept for call-site compat */
  labelTopPad?: boolean;
  /** Inline (label + value on the same row) by default. Pass 'column' for stacked. */
  direction?: 'column' | 'row';
  children: React.ReactNode;
}) {
  const isRow = direction === 'row';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isRow ? 'row' : 'column',
      alignItems: isRow ? 'center' : 'stretch',
      gap: isRow ? 8 : 4,
      padding: '4px 4px',
      minHeight: isRow ? 32 : undefined,
    }}>
      <div style={{
        fontSize: isRow ? 12 : 11,
        fontWeight: isRow ? 500 : 600,
        lineHeight: '20px',
        color: 'var(--ds-text-subtle, #505258)',
        flexShrink: isRow ? 0 : undefined,
        width: isRow ? 128 : undefined,
        alignSelf: isRow ? 'center' : undefined,
      }}>
        {label}
      </div>
      <div
        className="cv-rail-value"
        style={{
          fontSize: 14, lineHeight: '20px', color: 'var(--ds-text, #292A2E)',
          minWidth: 0,
          flex: isRow ? 1 : undefined,
          alignSelf: isRow ? 'stretch' : undefined,
          display: 'flex',
          alignItems: 'center',
          padding: '0 4px',
          borderRadius: 4,
        }}
      >
        {children}
      </div>
    </div>
  );
}
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import type { PhIssue } from '../types';
import { useCatalystAvatarProfile } from '../hooks/useCatalystAvatarProfile';
/* jira-compare Phase 1 (2026-05-02): Parent + Priority restored to right
   rail per re-probe of Jira BAU-5609. REVERTED 2026-05-03 per Vikram
   directive: Parent does NOT appear in Jira's Details sidebar, only in
   the left "Key details" section. Catalyst was incorrectly showing it
   here. Priority stays in the right rail (conditionally, per issue type). */
import { EditableAssignee, EditableReporter, EditableLabels, EditableSprintReleases as EditableSprintRelease, EditablePriority } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { CatalystParentLinker } from './CatalystParentLinker';
import type { CatalystItemType } from '../types';
import { CatalystDueDateField } from '@/components/shared/CatalystDueDateField';
/* MDT Ref removed 2026-05-05 per Vikram directive — "remove MDT ref for good". */
import {
  CatalystIRDemoDateDisplay,
  CatalystIRFigmaApprovedDisplay,
  CatalystIRDemoApprovedDisplay,
} from './CatalystReadOnlyCustomFields';

/**
 * Normalize a ph_issues.issue_type string to a canonical bucket.
 * Mirrors resolveItemType() in CatalystDetailRouter.tsx — kept inline
 * to avoid pulling in the router (which lazy-imports every CatalystView*).
 *
 * Source of truth for the BAU-project mappings:
 *   defect   ← bug | defect | qa bug
 *   incident ← *incident* | production incident | business gap
 *   task     ← task
 *   feature  ← feature | new feature
 *   epic     ← epic
 */
function normalizeIssueTypeBucket(raw: string | undefined | null):
  | 'epic' | 'feature' | 'defect' | 'incident' | 'task'
  | 'story' | 'subtask' | 'business_request' | null {
  if (!raw) return null;
  const t = raw.toLowerCase().trim();
  if (t === 'epic') return 'epic';
  if (t === 'feature' || t === 'new feature') return 'feature';
  if (t === 'bug' || t === 'defect' || t === 'qa bug') return 'defect';
  if (t.includes('incident') || t === 'production incident' || t === 'business gap') return 'incident';
  if (t === 'task') return 'task';
  if (t === 'business request' || t === 'business_request' || t === 'demand') return 'business_request';
  if (t === 'sub-task' || t === 'subtask' || t === 'backend' || t === 'frontend' || t === 'figma' || t === 'entity figma' || t === 'integration') return 'subtask';
  if (t === 'story' || t === 'improvement') return 'story';
  return null;
}
import {
  STATUS_OPTION_GROUPS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';
import {
  fmtDate, getStatusCategory, getStatusStyle, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

/**
 * jira-compare 2026-05-08: Jira-style absolute date — "April 29, 2026 at 5:15 PM".
 * Replaces the compact "29 Apr 2026" format; matches Jira's footer probe exactly.
 */
function fmtJiraDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${date} at ${time}`;
}

/**
 * jira-compare 2026-05-03 — Patch A6 · Hybrid time format helper.
 * Returns a relative description like "4 days ago" / "yesterday" / "just now".
 */
function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 30) return `${day} days ago`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon} month${mon === 1 ? '' : 's'} ago`;
  const yr = Math.round(mon / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

interface CatalystSidebarDetailsProps {
  issue: PhIssue | null;
  itemId: string;
  projectId?: string;
  onStatusChange: (newStatus: string) => void;
  onClose: () => void;
  onDelete: () => void;
  /** Type-specific fields rendered between the "Details" header and Priority */
  children?: React.ReactNode;
  /**
   * jira-compare 2026-05-03 — slot for the ImproveIssueDropdown trigger.
   * Rendered next to the Status row at the top of the rail, mirroring
   * Jira's Status-pill / Improve-Story button layout. Each CatalystView*
   * passes its own <ImproveIssueDropdown> here and removes the inline
   * leftContent render so the affordance lives in one place.
   */
  improveDropdown?: React.ReactNode;
  /**
   * jira-compare 2026-05-03 (Patch E) — slot for the CatalystStatusPill.
   * Rendered alongside improveDropdown at the rail header to mirror Jira's
   * top-right layout where Status + Improve sit on the same line above
   * Details. Each CatalystView* passes its own <CatalystStatusPill> here
   * and removes the inline leftContent render.
   */
  statusPill?: React.ReactNode;
  /** Label for the work item type in the delete confirmation */
  typeLabel?: string;
  /** External trigger to open the delete confirmation */
  deleteRequested?: boolean;
  onDeleteDismiss?: () => void;
  /** jira-compare Phase 1 (2026-05-02): canonical type bucket for the
   *  CatalystParentLinker. Story → epic, Subtask → story|task, etc.
   *  Each CatalystView* passes the right value so the Parent picker
   *  shows the correct parent options. */
  parentSource?: CatalystItemType;
  projectKey?: string;
  onOpenItem?: (key: string) => void;
}

export function CatalystSidebarDetails({
  issue, itemId, projectId, onStatusChange, onClose, onDelete,
  children, improveDropdown, statusPill, typeLabel = 'item',
  deleteRequested, onDeleteDismiss,
  parentSource, projectKey, onOpenItem,
}: CatalystSidebarDetailsProps) {
  const queryClient = useQueryClient();

  /* ── Status state ───────────────────────── */
  const [localStatus, setLocalStatus] = useState<string>('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(false);
  const [showConfigureDrawer, setShowConfigureDrawer] = useState(false);
  const [pinnedFields, setPinnedFields] = useState<string[]>(() =>
    loadPinnedFields(issue?.issue_type ?? 'Story'),
  );
  const statusValue = localStatus || issue?.status || 'Backlog';
  const statusCategory = issue?.status_category || getStatusCategory(statusValue);
  const statusStyle = getStatusStyle(statusValue, statusCategory);

  // ── Workflow-aware dropdown (Jira-parity) ──────────────────────────
  // When the issue type is bound to one of our workflows (SDLC / Simple / Bug),
  // use the new StatusTransitionDropdown which matches Jira's verb→pill pattern
  // and renders categories beyond the legacy 3-colour guardrail (red / yellow /
  // purple). Falls back to the original grouped picker below when no workflow
  // is defined for the issue type (e.g. Task, Subtask).
  const { statusGroups: sidebarStatusGroups, hasConfig: sidebarHasConfig, getAvailableStatuses: getSidebarAvailable } = useIssueTypeWorkflow(issue?.issue_type ?? null);
  const sidebarAvailable = new Set(getSidebarAvailable(statusValue));
  const sidebarDisplayGroups = sidebarHasConfig
    ? sidebarStatusGroups
        .map(g => ({ ...g, statuses: g.statuses.filter(s => sidebarAvailable.has(s)) }))
        .filter(g => g.statuses.length > 0)
    : STATUS_OPTION_GROUPS;

  const workflow = useWorkflow(issue?.issue_type);
  const currentWorkflowState = workflow
    ? workflow.states.find(s => s.name.toLowerCase() === statusValue.toLowerCase())
      ?? workflow.states.find(s => s.id === statusValue.toLowerCase().replace(/[^a-z0-9]+/g, '_'))
      ?? workflow.states.find(s => s.id === workflow.initialStateId)
    : undefined;
  // Phase E.2 (2026-04-18): map Catalyst status category → Atlaskit Lozenge
  // appearance. Colours are locked to the 3-colour guardrail (CLAUDE.md §5):
  // grey / blue / green. Atlaskit's default / inprogress / success tokens
  // render those exact values.
  const lozengeAppearance: 'default' | 'inprogress' | 'success' =
    statusCategory === 'done'
      ? 'success'
      : statusCategory === 'in_progress'
        ? 'inprogress'
        : 'default';

  useEffect(() => { setLocalStatus(''); }, [itemId]);

  useEffect(() => {
    if (deleteRequested) setShowConfirmDelete(true);
  }, [deleteRequested]);

  /* ── Auth + current user profile ─────────── */
  const { user } = useAuth();
  const { data: currentProfile } = useCatalystAvatarProfile(user?.id);

  /* ── Current user's Jira account ID (for "Assign to me" gate) ── */
  const { data: currentUserJiraId } = useQuery({
    queryKey: ['cv-jira-id', user?.id],
    enabled: !!user?.id,
    staleTime: 300000,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('jira_identity_map')
        .select('jira_account_id')
        .eq('catalyst_user_id', user!.id)
        .maybeSingle();
      return (data?.jira_account_id as string | null) ?? null;
    },
  });

  /* ── Avatar resolution for reporter ─────── */
  const { data: reporterProfile } = useCatalystAvatarProfile(issue?.reporter_account_id);

  const labelsArray: string[] = Array.isArray(issue?.labels) ? issue.labels : [];

  const invalidateIssue = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId] }),
    [queryClient, itemId],
  );

  /* ── Assign to me handler ──────────────── */
  const handleAssignToMe = useCallback(async () => {
    if (!user) return;
    const displayName = (currentProfile as any)?.full_name ?? user.email ?? 'Me';
    await (supabase as any).from('ph_issues')
      .update({ assignee_account_id: user.id, assignee_display_name: displayName })
      .eq('issue_key', itemId);
    invalidateIssue();
  }, [user, currentProfile, itemId, invalidateIssue]);

  /* jira-compare follow-up (2026-05-02): Vikram directive — Status must
     not appear in the right rail. Jira renders Status only as the
     header pill under H1 (CatalystStatusPill). The rail-side Status
     dropdown is suppressed here; the workflow + dropdown still mount
     so legacy keyboard a11y bindings keep working, but the visible
     trigger is hidden. To restore later, flip SHOW_RAIL_STATUS to true. */
  const SHOW_RAIL_STATUS = false;

  return (
    <>
      {/* jira-compare 2026-05-05 (re-probe BAU-5609): Status pill + Improve Story
          render on ONE horizontal row in Jira — `[In QA ▾] [✦ Improve Story]`.
          The lightning-bolt Automate button is removed (not present in Jira BAU view,
          and Vikram directive §9 says remove flash icon). flexWrap so narrow rails
          gracefully push Improve Story to a second line rather than overflow. */}
      {(statusPill || improveDropdown) && (
        <div
          data-cv-sidebar-status-header="true"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}
        >
          {statusPill}
          {improveDropdown}
          {issue?.issue_key && <DiscussTicketButton issueKey={issue.issue_key} variant="full" />}
        </div>
      )}
      {SHOW_RAIL_STATUS && (workflow && currentWorkflowState ? (
        <div style={{ marginBottom: 14 }}>
          {/* jira-compare A2 (2026-04-28): label every right-rail field for
              consistency with Sprint/Iteration / Assignee / Reporter / Labels. */}
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)', marginBottom: 4 }}>Status</div>
          <StatusTransitionDropdown
            issueType={issue?.issue_type ?? 'Defect'}
            currentStateId={currentWorkflowState.id}
            onTransition={(_targetStateId, transition) => {
              const target = workflow.states.find(s => s.id === transition.to);
              if (!target) return;
              setLocalStatus(target.name);
              onStatusChange(target.name);
            }}
          />
        </div>
      ) : (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtle, #505258)', marginBottom: 4 }}>Status</div>
        <DropdownMenu
          trigger={({ triggerRef, ...triggerProps }) => (
            <button
              ref={triggerRef as React.Ref<HTMLButtonElement>}
              {...triggerProps}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 3,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                <Lozenge appearance={lozengeAppearance} isBold={lozengeAppearance !== 'default'}>{statusValue}</Lozenge>
              </span>
              <ChevronDownIcon size="small" primaryColor="var(--ds-icon-subtle, #42526E)" />
            </button>
          )}
        >
          {sidebarDisplayGroups.map(group => (
            <DropdownItemGroup key={group.category} title={group.groupLabel}>
              {group.statuses.map((st: string) => (
                <DropdownItem
                  key={st}
                  isSelected={statusValue === st}
                  onClick={() => { setLocalStatus(st); onStatusChange(st); }}
                >
                  <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                    <Lozenge
                      appearance={
                        (group.category as string) === 'done' ? 'success'
                        : (group.category as string) === 'in_progress' ? 'inprogress'
                        : 'default'
                      }
                      isBold
                    >{st}</Lozenge>
                  </span>
                </DropdownItem>
              ))}
            </DropdownItemGroup>
          ))}
        </DropdownMenu>
      </div>
      ))}

      {/* ── Pinned fields section ────────────────────────────────────────
          Jira parity: when the user has pinned fields via Configure, they
          surface here above the Details block as a "Pinned fields" group. */}
      {pinnedFields.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '0 0 6px',
          }}>
            Pinned fields
          </div>
          <div>
            {pinnedFields.map((fieldId) => {
              const field = PINNABLE_FIELDS.find((f) => f.id === fieldId);
              if (!field) return null;
              /* Render the same FieldRow used below, delegating to the same
                 editable components — no duplication of logic needed. */
              if (fieldId === 'assignee') return (
                <FieldRow key={fieldId} label="Assignee">
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {issue && (
                      <EditableAssignee
                        issueId={issue.id}
                        projectId={projectId || ''}
                        currentAssigneeId={issue.assignee_account_id}
                        currentAssigneeName={issue.assignee_display_name}
                        onUpdate={invalidateIssue}
                      />
                    )}
                  </div>
                </FieldRow>
              );
              if (fieldId === 'reporter') return (
                <FieldRow key={fieldId} label="Reporter" alignBlock="center">
                  {issue && (
                    <EditableReporter
                      issueId={issue.id}
                      projectId={projectId || ''}
                      currentReporterId={issue.reporter_account_id}
                      currentReporterName={issue.reporter_display_name}
                      onUpdate={invalidateIssue}
                    />
                  )}
                </FieldRow>
              );
              if (fieldId === 'priority') return (
                <FieldRow key={fieldId} label="Priority" alignBlock="center">
                  {issue && (
                    <EditablePriority
                      issueId={issue.id}
                      currentPriority={issue.priority}
                      onUpdate={invalidateIssue}
                    />
                  )}
                </FieldRow>
              );
              // Labels gate (anti-pattern #18, CLAUDE.md 2026-05-10):
              // Labels is in the Jira screen scheme ONLY for Task + Story
              // (verified via getJiraIssueTypeMetaWithFields on 2026-05-10).
              // Even when the user pins Labels for a different type, we must
              // not render it — the pinned-fields path MUST honor the same
              // gate as the canonical Details render at line ~624.
              if (
                fieldId === 'labels' &&
                (issue?.issue_type === 'Task' || issue?.issue_type === 'Story')
              ) return (
                <FieldRow key={fieldId} label="Labels" alignBlock="start">
                  {issue && (
                    <EditableLabels
                      issueId={issue.id}
                      issueKey={issue.issue_key}
                      currentLabels={(issue as any).labels ?? []}
                      onUpdate={invalidateIssue}
                    />
                  )}
                </FieldRow>
              );
              if (fieldId === 'sprintRelease' && issue?.issue_type !== 'Feature') return (
                <FieldRow key={fieldId} label="Sprint/Iteration" alignBlock="start">
                  {issue && (
                    <EditableSprintRelease
                      issueId={issue.id}
                      currentSprintRelease={issue.sprint_release}
                      projectKey={issue.project_key}
                      onUpdate={invalidateIssue}
                    />
                  )}
                </FieldRow>
              );
              return null;
            })}
          </div>
        </div>
      )}

      {/* ── Details section card ──────────────── */}
      {/* jira-compare 2026-05-05: Details section header height 49→40px,
          no borderRadius (Jira has square corners), no left padding on header,
          left padding moved to the body wrapper for field rows.
          Body padding: '8px 0' (Jira doesn't have a container left pad —
          the field rows themselves carry 11px v-padding with 96px label col). */}
      <div style={{ marginBottom: 8 }}>
        <div
          onClick={() => setDetailsCollapsed(c => !c)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, height: 40,
            padding: '0 0', background: 'transparent', cursor: 'pointer', userSelect: 'none',
          }}
        >
          <span style={{ display: 'inline-flex', transition: 'transform 0.15s ease', transform: detailsCollapsed ? 'rotate(0deg)' : 'rotate(90deg)', color: 'var(--ds-icon-subtle, #626F86)' }}>
            <ChevronRightIcon size="small" primaryColor="currentColor" />
          </span>
          {/* jira-compare 2026-05-11 TreeWalker probe: Details header = 16px/653 matching
              Key details, Subtasks, LWI, Activity. All section headers share the same spec.
              SectionHeaderTypography.test.ts verifies this from a live DOM probe. */}
          <div style={{ margin: 0, fontSize: 16, fontWeight: 653, lineHeight: '20px', color: 'var(--ds-text, #292A2E)' }}>Details</div>
        </div>

        {!detailsCollapsed && <div style={{ padding: '0' }}>

          {/* ── Sprint/Iteration ────
              jira-compare 2026-05-10 Fix E-2: Epic RESTORED — Lane B probe of Epic
              scheme (type 10000) confirms sprintRelease IS in the scheme. Prior exclusion
              was based on a BAU-5419 Lane A re-probe that misread the context items.
              Vikram approved 2026-05-10.
              Feature EXCLUDED: sprintRelease NOT in Feature scheme (type 10173). */}
          {issue?.issue_type !== 'Feature' && (
            <FieldRow label="Sprint/Iteration" alignBlock="start">
              {issue && (
                <EditableSprintRelease
                  issueId={issue.id}
                  currentSprintRelease={issue.sprint_release}
                  projectKey={issue.project_key}
                  onUpdate={invalidateIssue}
                />
              )}
            </FieldRow>
          )}

          {/* ── Assignee ──── */}
          <FieldRow label="Assignee">
            {issue && (
              <EditableAssignee
                issueId={issue.id}
                projectId={projectId || ''}
                currentAssigneeId={issue.assignee_account_id}
                currentAssigneeName={issue.assignee_display_name}
                onUpdate={invalidateIssue}
              />
            )}
          </FieldRow>
          {/* jira-compare 2026-05-07: hide when current user IS the assignee (Jira account ID or Supabase UUID match) */}
          {user && issue?.assignee_account_id !== user.id && issue?.assignee_account_id !== currentUserJiraId && (
            <button
              type="button"
              onClick={handleAssignToMe}
              onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
              onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              style={{ background: 'none', border: 'none', padding: '0 0 4px 152px', cursor: 'pointer', color: 'var(--ds-link, #1868DB)', fontSize: 12, fontWeight: 400, lineHeight: '16px', textAlign: 'left' }}
            >
              Assign to me
            </button>
          )}

          {/* ── Priority (Epic only) — jira-compare 2026-05-07: re-probe BAU-5419
              confirmed Priority IS in Jira's right rail for Epics.
              All other types: Priority stays in Key details left block. */}
          {issue?.issue_type === 'Epic' && (
            <FieldRow label="Priority" alignBlock="center">
              {issue && (
                <EditablePriority
                  issueId={issue.id}
                  currentPriority={issue.priority}
                  onUpdate={invalidateIssue}
                />
              )}
            </FieldRow>
          )}

          {/* ── Reporter ──── Defect-2 Cycle 6 (2026-05-03): made editable.
              D1: Tooltip "View profile" on hover per Jira parity. */}
          <FieldRow label="Reporter" alignBlock="center">
            {issue && (
              <EditableReporter
                issueId={issue.id}
                projectId={projectId || ''}
                currentReporterId={issue.reporter_account_id}
                currentReporterName={issue.reporter_display_name}
                onUpdate={invalidateIssue}
              />
            )}
          </FieldRow>

          {/* ── Labels ──── Task + Story (jira-compare 2026-05-07 Fix J + 2026-05-10 Fix JC-3).
              Task: re-probe BAU-5538 confirmed Labels in scheme (10010).
              Story: getJiraIssueTypeMetaWithFields confirmed Labels in scheme (10006).
              Vikram approved Story addition 2026-05-10. Do not widen further without
              per-type Jira screen scheme validation (anti-pattern #18). */}
          {(issue?.issue_type === 'Task' || issue?.issue_type === 'Story') && (
            <FieldRow label="Labels" alignBlock="start">
              {issue && (
                <EditableLabels
                  issueId={issue.id}
                  issueKey={issue.issue_key}
                  currentLabels={(issue as any).labels ?? []}
                  onUpdate={invalidateIssue}
                />
              )}
            </FieldRow>
          )}

          {/* ── Parent ──── REMOVED 2026-05-03 per Vikram directive.
              Parent belongs in Jira's left "Key details" section, not the
              right Details sidebar. Catalyst was incorrectly showing Parent
              in the Details rail. The CatalystParentLinker component is still
              used elsewhere (in CatalystKeyDetails or type-specific views). */}

          {/* ── Priority — REMOVED 2026-05-05 per Vikram "follow Jira" directive.
              Jira DOM probe: Priority is NOT in the right rail Details section
              for any BAU issue type (Stories, Epics, Defects etc.).
              Priority lives in the Key details left block only. */}

          {/* ── Due date (non-Epic types where Jira screen scheme has duedate) ──
              jira-compare 2026-05-05 (B4 4a). Verified via
              getJiraIssueTypeMetaWithFields against BAU project: `duedate` is
              present in Backend (subtask family share screen), Production
              Incident, Change Request. NOT present in Story / Task / QA Bug /
              Business Gap / Feature / API Requirement → those types do not
              render Due date here. Per anti-pattern #18 we never render a
              field that's absent from the type's screen scheme. */}
          {issue && issue.issue_type !== 'Epic'
            && (normalizeIssueTypeBucket(issue.issue_type) === 'subtask'
              || issue.issue_type === 'Production Incident'
              || issue.issue_type === 'Change Request') && (
            <FieldRow label="Due date" direction="row">
              <CatalystDueDateField
                value={(issue as any).due_date ?? null}
                onSave={async (date) => {
                  const { error } = await (supabase as any)
                    .from('ph_issues')
                    .update({ due_date: date })
                    .eq('issue_key', issue.issue_key);
                  if (error) {
                    console.error('[CatalystSidebarDetails] due date save failed:', error.message);
                    throw error;
                  }
                  invalidateIssue();
                }}
              />
            </FieldRow>
          )}

          {/* ── Epic-specific date fields ──── jira-compare Phase 2
              (2026-05-02). Relocated from above-Assignee to after-MDT-Ref
              to match Jira Epic ordering on BAU-5419: Assignee → Priority
              → Reporter → MDT Ref → Actual start → Actual end. Due date
              also surfaces here on Epic; Jira renders it in a separate
              "Dates" panel but Catalyst keeps the field inline. */}
          {issue?.issue_type === 'Epic' && (
            <>
              <FieldRow label="Due date" direction="row">
                <CatalystDueDateField
                  value={(issue as any).due_date ?? null}
                  onSave={async (date) => {
                    const { error } = await (supabase as any)
                      .from('ph_issues')
                      .update({ due_date: date })
                      .eq('issue_key', issue.issue_key);
                    if (error) {
                      console.error('[CatalystSidebarDetails] due date save failed:', error.message);
                      throw error;
                    }
                    invalidateIssue();
                  }}
                />
              </FieldRow>
              <FieldRow label="Actual start" direction="row">
                <CatalystDueDateField
                  value={((issue as any)?.raw_json?.fields?.customfield_10109 ?? null) as string | null}
                  onSave={async (date) => {
                    const { data: row, error: readErr } = await (supabase as any)
                      .from('ph_issues')
                      .select('raw_json')
                      .eq('issue_key', issue.issue_key)
                      .single();
                    if (readErr) {
                      console.error('[CatalystSidebarDetails] actual start read failed:', readErr.message);
                      throw readErr;
                    }
                    const current = (row?.raw_json as any) || {};
                    const newRawJson = {
                      ...current,
                      fields: { ...(current.fields || {}), customfield_10109: date },
                    };
                    const { error: writeErr } = await (supabase as any)
                      .from('ph_issues')
                      .update({ raw_json: newRawJson })
                      .eq('issue_key', issue.issue_key);
                    if (writeErr) {
                      console.error('[CatalystSidebarDetails] actual start save failed:', writeErr.message);
                      throw writeErr;
                    }
                    invalidateIssue();
                  }}
                />
              </FieldRow>
              <FieldRow label="Actual end" direction="row">
                <CatalystDueDateField
                  value={((issue as any)?.raw_json?.fields?.customfield_10108 ?? null) as string | null}
                  onSave={async (date) => {
                    const { data: row, error: readErr } = await (supabase as any)
                      .from('ph_issues')
                      .select('raw_json')
                      .eq('issue_key', issue.issue_key)
                      .single();
                    if (readErr) {
                      console.error('[CatalystSidebarDetails] actual end read failed:', readErr.message);
                      throw readErr;
                    }
                    const current = (row?.raw_json as any) || {};
                    const newRawJson = {
                      ...current,
                      fields: { ...(current.fields || {}), customfield_10108: date },
                    };
                    const { error: writeErr } = await (supabase as any)
                      .from('ph_issues')
                      .update({ raw_json: newRawJson })
                      .eq('issue_key', issue.issue_key);
                    if (writeErr) {
                      console.error('[CatalystSidebarDetails] actual end save failed:', writeErr.message);
                      throw writeErr;
                    }
                    invalidateIssue();
                  }}
                />
              </FieldRow>
            </>
          )}

          {/* ── Assessment Feature ──── REMOVED 2026-05-03 per Vikram directive.
              Assessment Feature is NOT in Jira's Details sidebar. It belongs
              in the left "Key details" section, not the right Details panel.
              The CatalystAssessmentFeatureField component is still mounted
              elsewhere (in CatalystKeyDetails or type-specific views where
              appropriate). This sidebar was incorrectly surfacing it. */}

          {/* ── Service Now# ──── REMOVED 2026-05-03 per Vikram directive.
              Service Now# is NOT in Jira's Details sidebar. This was a
              custom field from the digital-transformation Jira tenant.
              It does not belong in the Catalyst right sidebar. If it needs
              to be surfaced, it should be in a separate custom fields panel
              or "More fields" tray, not in the canonical Details section. */}

          {/* ── Feature IR fields ──── jira-compare night session
              (2026-04-28). Read-only surfaces of:
                customfield_10489  IR Demo Date        (date)
                customfield_10492  IR Figma Approved   (multi-checkbox)
                customfield_10493  IR Demo Approved    (multi-checkbox)
              Edit affordance deferred until Lovable lands typed columns. */}
          {normalizeIssueTypeBucket(issue?.issue_type) === 'feature' && (
            <>
              <FieldRow label="IR Demo Date">
                <CatalystIRDemoDateDisplay issue={issue} />
              </FieldRow>
              <FieldRow label="IR Figma Approved" alignBlock="start">
                <CatalystIRFigmaApprovedDisplay issue={issue} />
              </FieldRow>
              <FieldRow label="IR Demo Approved" alignBlock="start">
                <CatalystIRDemoApprovedDisplay issue={issue} />
              </FieldRow>
            </>
          )}

          {/* ── TYPE-SPECIFIC FIELDS (children slot) ──
              Jira parity: custom fields (MDT Ref, parent picker for legacy
              code paths, etc.) render after Labels. Each CatalystView* owns
              its own children tree. */}
          {children}

          {/* Priority MOVED to CatalystKeyDetails (main content).
              Story Points: BANNED platform-wide. Do NOT re-add. */}
        </div>}
      </div>

      {/* ── Timestamps (canonical) ──────────────────────────────────────
          jira-compare 2026-05-16 re-probe of Jira BAU-1919 (TreeWalker):
            Container  — 14px/400/rgb(41,42,46)
            Label SMALL — 12px/400/rgb(80,82,88) inline before date
            Date text   — inherits 14px from container, rgb(41,42,46)
            No relative time ("days ago") — Jira does not render this.
          Each timestamp is a single line: "<small>Created</small> May 14, 2026 at 4:21 PM"
          Configure CTA removed — Catalyst-specific affordance not present in
          Jira's right panel. See CatalystConfigureDrawer for the component if
          re-enabling later. */}
      <div style={{ marginTop: 16, padding: '12px 0 0' }}>
        {issue?.jira_created_at && (
          <div style={{ marginBottom: 6, fontSize: 14, fontWeight: 400, lineHeight: '20px', color: 'var(--ds-text, #292A2E)' }}
            title={issue.jira_created_at}>
            <small style={{ fontSize: 12, fontWeight: 400, color: 'var(--ds-text-subtle, #505258)', marginRight: 4 }}>Created</small>
            {fmtJiraDate(issue.jira_created_at)}
          </div>
        )}
        {issue?.jira_updated_at && (
          <div style={{ fontSize: 14, fontWeight: 400, lineHeight: '20px', color: 'var(--ds-text, #292A2E)' }}
            title={issue.jira_updated_at}>
            <small style={{ fontSize: 12, fontWeight: 400, color: 'var(--ds-text-subtle, #505258)', marginRight: 4 }}>Updated</small>
            {fmtJiraDate(issue.jira_updated_at)}
          </div>
        )}
      </div>

      {/* ── Configure drawer ─────────────────────────────────────────── */}
      <CatalystConfigureDrawer
        isOpen={showConfigureDrawer}
        onClose={() => setShowConfigureDrawer(false)}
        issueType={issue?.issue_type ?? 'Story'}
        pinnedFields={pinnedFields}
        onPinnedFieldsChange={setPinnedFields}
      />

      {/* ── Delete confirmation (canonical) ─────────────────────────────
          Phase E.1 (2026-04-18): migrated from hand-rolled position:fixed
          overlay to @atlaskit/modal-dialog. Focus trap, Escape to cancel,
          click-outside to dismiss, body scroll lock all inherited from
          Atlaskit. Matches the BacklogPage bulk-delete pattern. */}
      <ModalTransition>
        {showConfirmDelete && (
          <Modal
            onClose={() => { setShowConfirmDelete(false); onDeleteDismiss?.(); }}
            width="small"
          >
            <ModalHeader>
              <ModalTitle appearance="danger">
                Delete {issue?.issue_key}?
              </ModalTitle>
            </ModalHeader>
            <ModalBody>
              This {typeLabel} will be soft-deleted. It can be restored within 30 days.
            </ModalBody>
            <ModalFooter>
              <Button
                appearance="subtle"
                onClick={() => { setShowConfirmDelete(false); onDeleteDismiss?.(); }}
              >
                Cancel
              </Button>
              <Button
                appearance="danger"
                onClick={() => { setShowConfirmDelete(false); onDelete(); }}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </ModalTransition>
    </>
  );
}
