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
import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

/**
 * Compact-rail context — flipped to true by a ResizeObserver on the
 * sidebar wrapper when its width falls below COMPACT_RAIL_THRESHOLD
 * (2026-06-21 Vikram). FieldRow consumes this to switch from inline
 * (label left + value right) to stacked (label above value) layout,
 * matching Jira's narrow-rail behaviour.
 */
const COMPACT_RAIL_THRESHOLD = 360;
const CompactRailContext = createContext<boolean>(false);
import { DiscussTicketButton } from '@/components/catalyst-detail-views/shared/DiscussTicketButton';
import ChevronRightIcon from '@atlaskit/icon/utility/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/utility/chevron-down';
import Tooltip from '@atlaskit/tooltip';
// AutomationIcon removed — jira-compare 2026-05-05: Automate button between
// status pill and Improve Story is not present in Jira. Removed per Vikram directive.
import SettingsIcon from '@atlaskit/icon/core/settings';
import { Heading } from '@/components/ads';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
// jira-compare 2026-05-16 correction: FieldRow reverted to STACKED (column) layout
import { CatalystConfigureDrawer, loadPinnedFields, PINNABLE_FIELDS } from './CatalystConfigureDrawer';

/* Jira-parity: right-rail field chips (probe 2026-06-16).
   Idle: invisible 2px transparent border (zero layout shift on hover).
   Hover: 2px border appears + bg tint. Focus: inset 2px blue ring (#4688EC = actual
   --ds-border-focused resolved value on Jira MDT-818).
   :focus-within handles the blue ring so each editable component doesn't need
   its own focus ring inside the sidebar.
   Style injected via useEffect (not module-level) so it reliably runs on every
   component mount regardless of Vite HMR / browser bundle caching. */
const RAIL_BORDER_STYLE_ID = 'cv-rail-value-border-v2';
const RAIL_BORDER_CSS = `
  .cv-rail-value {
    border-radius: 3px;
    transition: box-shadow 0.1s, background 0.1s;
  }
  .cv-rail-value:hover:not(:focus-within) {
    /* 2026-06-17: border (inset box-shadow) removed — Vikram directive.
       Hover bg alone is the affordance; the gray ring was extra chrome. */
    background: var(--ds-background-neutral-subtle-hovered, rgba(5,21,36,0.06));
  }
  .cv-rail-value:focus-within {
    box-shadow: inset 0 0 0 2px var(--ds-border-focused, #4688EC);
  }
  .cv-rail-value:focus-within > div[style] {
    outline: none !important;
    border-color: transparent !important;
  }
  .cv-rail-value [class*="-select__control--is-focused"],
  .cv-rail-value [class*="-select__control--menu-is-open"] {
    border-color: transparent !important;
    box-shadow: none !important;
  }
  /* 2026-06-17 — single hover background. .cv-rail-value owns the only
     hover bg on the right rail. Inner atoms (react-select controls,
     hand-rolled SidebarAddTrigger buttons, EditablePriority chips,
     CatalystSeverityField, etc.) each ship their own hover bg — those
     would stack on top of .cv-rail-value's hover and produce a visible
     double background. Suppressed here on both idle and :hover. */
  .cv-rail-value [class*="-select__control"],
  .cv-rail-value [class*="-select__control"]:hover,
  .cv-rail-value button,
  .cv-rail-value button:hover {
    background: transparent !important;
  }
  /* 2026-06-17 — avatar + name vertical centering. react-select's default
     Control / ValueContainer / SingleValue use line-height baselines that
     push content above the row's visual centre. Force flex centering at
     every layer + symmetric zero padding so the avatar sits dead-centre. */
  .cv-rail-value [class*="-select__control"] {
    min-height: 32px !important;
    height: 32px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
  }
  .cv-rail-value [class*="-select__value-container"] {
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
    height: 100% !important;
  }
  .cv-rail-value [class*="-select__single-value"] {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
  }
  .cv-rail-value [class*="-select__input-container"] {
    margin-top: 0 !important;
    margin-bottom: 0 !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
  }
`;

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
  /* Compact mode forces column regardless of explicit `direction='row'` —
     the rail is too narrow to host both columns without truncation. */
  const compact = useContext(CompactRailContext);
  const isRow = !compact && direction === 'row';
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
        fontSize: isRow ? 14 : 12,
        fontWeight: isRow ? 500 : 600,
        lineHeight: '20px',
        color: 'var(--ds-text-subtle, #505258)',
        flexShrink: isRow ? 0 : undefined,
        width: isRow ? 128 : undefined,
        alignSelf: isRow ? 'center' : undefined,
        /* In column (compact) mode, indent the label so its left edge
           aligns with the value text. Value div has `padding: 0 4px`
           and editable controls (@atlaskit/select, chip, avatar) add
           ~4-6px of internal control padding. Net visible offset is
           ~8px (2026-06-21 Vikram). */
        padding: isRow ? undefined : '0 8px',
      }}>
        {label}
      </div>
      <div
        className="cv-rail-value"
        style={{
          fontSize: 'var(--ds-font-size-400)', lineHeight: '20px', color: 'var(--ds-text, #292A2E)',
          minWidth: 0,
          flex: isRow ? 1 : undefined,
          alignSelf: isRow ? 'stretch' : undefined,
          display: 'flex',
          alignItems: 'center',
          padding: '0 4px',
          borderRadius: 3,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* "Assign to me" link rendered under the Assignee field. INLINE mode:
   offsets by the label column width (152px) so it lines up under the
   value column. COMPACT (column) mode: padding matches the new label
   padding (8px) so the link sits flush-left like the field stack above
   it (2026-06-21 Vikram). */
function AssignToMeLink({ onClick }: { onClick: () => void }) {
  const compact = useContext(CompactRailContext);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
      style={{
        background: 'none',
        border: 'none',
        padding: compact ? '0 8px 4px 8px' : '0 0 4px 152px',
        cursor: 'pointer',
        color: 'var(--ds-link, #1868DB)',
        fontSize: 'var(--ds-font-size-200)',
        fontWeight: 400,
        lineHeight: '16px',
        textAlign: 'left',
      }}
    >
      Assign to me
    </button>
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
  if (sec < 5) return 'just now';
  if (sec < 60) return `${sec} seconds ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'} ago`;
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
  /** Optional health badge rendered next to statusPill in the header row (BR detail view). */
  healthBadge?: React.ReactNode;
  /** When true, hides the Discuss button (used for closed/done tickets). */
  hideDiscuss?: boolean;
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
  /**
   * Optional data-source adapter. When supplied, each callback overrides
   * the corresponding canonical ph_issues mutation in this sidebar (and
   * in the EditableAssignee/EditableReporter/EditablePriority/EditableLabels
   * children it mounts). Enables non-ph_issues callers (tasks, business_requests)
   * to reuse this canonical sidebar without forking. Per CLAUDE.md "Adopt
   * canonical components" rule (2026-06-01). When the prop is omitted,
   * the existing ph_issues write paths are preserved verbatim.
   */
  dataSource?: {
    onAssigneeChange?: (accountId: string | null, displayName: string | null) => Promise<void> | void;
    onAssignToMe?: () => Promise<void> | void;
    onReporterChange?: (accountId: string | null, displayName: string | null) => Promise<void> | void;
    onPriorityChange?: (priority: string | null) => Promise<void> | void;
    onDueDateChange?: (date: string | null) => Promise<void> | void;
    onLabelsChange?: (labels: string[]) => Promise<void> | void;
    onFixVersionsChange?: (versions: string[]) => Promise<void> | void;
    onComponentsChange?: (components: string[]) => Promise<void> | void;
  };
}

export function CatalystSidebarDetails({
  issue, itemId, projectId, onStatusChange, onClose, onDelete,
  children, improveDropdown, statusPill, healthBadge, hideDiscuss, typeLabel = 'item',
  deleteRequested, onDeleteDismiss,
  parentSource, projectKey, onOpenItem,
  dataSource,
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

  /* ── Compact-rail detection ────────────────
     Switches FieldRow to stacked (column) layout when the rail wrapper
     is narrower than COMPACT_RAIL_THRESHOLD (Jira parity for narrow
     rails — see context block at top of file). */
  const railRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    if (!railRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setIsCompact(w > 0 && w < COMPACT_RAIL_THRESHOLD);
    });
    ro.observe(railRef.current);
    return () => ro.disconnect();
  }, []);
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

  useEffect(() => { setLocalStatus(''); }, [itemId]);

  useEffect(() => {
    if (!document.getElementById(RAIL_BORDER_STYLE_ID)) {
      const s = document.createElement('style');
      s.id = RAIL_BORDER_STYLE_ID;
      s.textContent = RAIL_BORDER_CSS;
      document.head.appendChild(s);
    }
  }, []);

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
    () => {
      /* 2026-06-21: cross-invalidate the AllWork rail / list so left + right
         panels stay in sync. Without this, assignee written on the right
         (sidebar) stays stale on the left until manual reload. `refetchType:
         'all'` forces any currently-mounted query to refetch immediately
         instead of waiting for the next mount. */
      queryClient.invalidateQueries({ queryKey: ['cv-issue-detail', itemId], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-items-offset'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['project-all-work-count'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['project-list-items-v2'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['work-item-detail'], refetchType: 'all' });
    },
    [queryClient, itemId],
  );

  /* ── Assign to me handler ──────────────── */
  const handleAssignToMe = useCallback(async () => {
    if (!user) return;
    const displayName = (currentProfile as any)?.full_name ?? user.email ?? 'Me';
    // dataSource adapter takes precedence — non-ph_issues callers handle
    // their own assignee column (e.g. tasks.assignee_id).
    if (dataSource?.onAssignToMe) {
      await dataSource.onAssignToMe();
      invalidateIssue();
      return;
    }
    if (dataSource?.onAssigneeChange) {
      await dataSource.onAssigneeChange(user.id, displayName);
      invalidateIssue();
      return;
    }
    await (supabase as any).from('ph_issues')
      .update({ assignee_account_id: user.id, assignee_display_name: displayName })
      .eq('issue_key', itemId);
    invalidateIssue();
  }, [user, currentProfile, itemId, invalidateIssue, dataSource]);

  return (
    <CompactRailContext.Provider value={isCompact}>
    <div ref={railRef}>
      {/* jira-compare 2026-05-05 (re-probe BAU-5609): Status pill + Improve Story
          render on ONE horizontal row in Jira — `[In QA ▾] [✦ Improve Story]`.
          The lightning-bolt Automate button is removed (not present in Jira BAU view,
          and Vikram directive §9 says remove flash icon). flexWrap so narrow rails
          gracefully push Improve Story to a second line rather than overflow. */}
      {(statusPill || improveDropdown || healthBadge) && (
        <div
          data-cv-sidebar-status-header="true"
          style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}
        >
          {statusPill}
          {healthBadge}
          {improveDropdown}
          {!hideDiscuss && issue?.issue_key && <DiscussTicketButton issueKey={issue.issue_key} variant="full" />}
        </div>
      )}

      {/* ── Pinned fields section ────────────────────────────────────────
          Jira parity: when the user has pinned fields via Configure, they
          surface here above the Details block as a "Pinned fields" group. */}
      {pinnedFields.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 'var(--ds-font-size-100)', fontWeight: 600, color: 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))',
            letterSpacing: '0.06em',
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
                        onChange={dataSource?.onAssigneeChange}
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
                      onChange={dataSource?.onReporterChange}
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
                      onChange={dataSource?.onPriorityChange}
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
                      onChange={dataSource?.onLabelsChange}
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
      {/* 2026-06-21 jira-compare re-probe: Details renders as a bordered
          card with rounded corners. Header row hover bg = neutral fill,
          divider line between header and body when expanded. */}
      <div
        style={{
          marginBottom: 8,
          border: '1px solid var(--ds-border, #DFE1E6)',
          borderRadius: 6,
          background: 'var(--ds-surface, #FFFFFF)',
          overflow: 'hidden',
        }}
      >
        <div
          onClick={() => setDetailsCollapsed(c => !c)}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral, var(--ds-background-neutral, #F1F2F4))'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 0,
            padding: '8px 12px',
            background: 'transparent',
            userSelect: 'none', cursor: 'pointer',
            transition: 'background-color 150ms ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <Tooltip content={detailsCollapsed ? 'Expand' : 'Collapse'} position="bottom">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setDetailsCollapsed(c => !c); }}
                aria-expanded={!detailsCollapsed}
                aria-label={detailsCollapsed ? 'Expand' : 'Collapse'}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 24, height: 24, marginLeft: -4,
                  background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  color: 'var(--ds-text-subtle, #505258)', borderRadius: 3,
                  transition: 'background-color 150ms ease',
                }}
              >
                {detailsCollapsed
                  ? <ChevronRightIcon label="" color="currentColor" />
                  : <ChevronDownIcon label="" color="currentColor" />
                }
              </button>
            </Tooltip>
            {/* jira-compare 2026-05-11 TreeWalker probe: Details header = 16px/653 matching
                Key details, Subtasks, LWI, Activity. All section headers share the same spec. */}
            <h2
              style={{ margin: 0, padding: '0 4px', fontSize: 'var(--ds-font-size-500)', fontWeight: 653, lineHeight: '20px', color: 'var(--ds-text, #292A2E)' }}
            >
              Details
            </h2>
          </div>
        </div>

        {!detailsCollapsed && <div style={{ padding: '8px 12px' }}>

          {/* ── Sprint/Iteration ────
              jira-compare 2026-05-10 Fix E-2: Epic RESTORED — Lane B probe of Epic
              scheme (type 10000) confirms sprintRelease IS in the scheme. Prior exclusion
              was based on a BAU-5419 Lane A re-probe that misread the context items.
              Vikram approved 2026-05-10.
              Feature EXCLUDED: sprintRelease NOT in Feature scheme (type 10173). */}
          {issue?.issue_type !== 'Feature' && issue?.issue_type !== 'Business Request' && (
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
                onChange={dataSource?.onAssigneeChange}
              />
            )}
          </FieldRow>
          {/* jira-compare 2026-05-07: hide when current user IS the assignee (Jira account ID or Supabase UUID match) */}
          {user && issue?.assignee_account_id !== user.id && issue?.assignee_account_id !== currentUserJiraId && (
            <AssignToMeLink onClick={handleAssignToMe} />
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
                  onChange={dataSource?.onPriorityChange}
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
                onChange={dataSource?.onReporterChange}
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
                  onChange={dataSource?.onLabelsChange}
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
              || issue.issue_type === 'Change Request'
              || dataSource?.onDueDateChange) && (
            <FieldRow label="Due date" direction="row">
              <CatalystDueDateField
                value={(issue as any).due_date ?? null}
                onSave={async (date) => {
                  if (dataSource?.onDueDateChange) {
                    await dataSource.onDueDateChange(date);
                    invalidateIssue();
                    return;
                  }
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
          2026-06-21 re-probe of Jira SPAC-7 (sidebar screenshot):
            Created — absolute format: "Created May 18, 2026 at 6:07 PM"
            Updated — relative format: "Updated 30 seconds ago"
            Configure link with gear icon at bottom-right of the timestamp row.
          Each timestamp is a single line. Configure link wired to the
          same drawer as the top-right gear icon. */}
      <div style={{ marginTop: 16, padding: '12px 0 0' }}>
        {issue?.jira_created_at && (
          <div
            style={{ marginBottom: 4, fontSize: 'var(--ds-font-size-200)', fontWeight: 400, lineHeight: '16px', color: 'var(--ds-text-subtle, #505258)' }}
            title={issue.jira_created_at}
          >
            Created {fmtJiraDate(issue.jira_created_at)}
          </div>
        )}
        {issue?.jira_updated_at && (
          <div
            style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 400, lineHeight: '16px', color: 'var(--ds-text-subtle, #505258)' }}
            title={issue.jira_updated_at}
          >
            Updated {fmtRelative(issue.jira_updated_at)}
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
    </div>
    </CompactRailContext.Provider>
  );
}
