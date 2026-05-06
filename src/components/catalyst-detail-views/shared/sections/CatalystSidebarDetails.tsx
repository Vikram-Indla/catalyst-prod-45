/**
 * CANONICAL — Right sidebar for all CatalystView* components.
 * Change here → updates all work item types.
 *
 * Uses production-grade editable components from StoryDetailModal:
 *   - EditableAssignee (Jira-parity user picker with avatars)
 *   - EditablePriority (Jira-native priority SVGs with dropdown)
 *   - EditableLabels (add/remove labels with suggestions)
 *   - EditableFixVersions (multi-select with unreleased/released groups)
 *
 * Renders: Status dropdown → Details header → Assignee → "Assign to me" → {children} → Priority → Reporter → Labels → Fix Versions → Timestamps
 *
 * GUARDRAIL: Story Points are BANNED platform-wide (see Catalyst spec). Do NOT re-add.
 *
 * The `children` slot is where type-specific sidebar fields go.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import CheckIcon from '@atlaskit/icon/glyph/check';
// AutomationIcon removed — jira-compare 2026-05-05: Automate button between
// status pill and Improve Story is not present in Jira. Removed per Vikram directive.
import SettingsIcon from '@atlaskit/icon/core/settings';
import { Heading } from '@/components/ads';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle, ModalTransition } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
// Inline removed — FieldRow switched to stacked layout (jira-compare 2026-05-05)
import { useWorkflow } from '@/lib/workflows';
import { StatusTransitionDropdown } from '@/components/workflow';
import { CatalystConfigureDrawer, loadPinnedFields, PINNABLE_FIELDS } from './CatalystConfigureDrawer';

/**
 * FieldRow — sidebar field row atom (Phase E.3, 2026-04-18).
 *
 * Collapses the repeated {flex + fixed-width label + flex-1 value} pattern
 * into a single call-site per field. Label typography (14/500/#505258 with
 * lineHeight 18.67px) is Jira-measured and kept inline so future typography
 * updates touch one spot. Horizontal gap uses @atlaskit/primitives Inline
 * with space.250 (20px) — the one token that maps exactly to Jira's measured
 * value. Vertical padding stays inline at 11px top/bottom; this doesn't map
 * to any space token cleanly, and we're not drifting for the sake of
 * tokenization.
 */
function FieldRow({
  label,
  children,
}: {
  label: string;
  /** @deprecated alignBlock and labelTopPad removed — stacked layout makes them irrelevant */
  alignBlock?: 'start' | 'center';
  labelTopPad?: boolean;
  children: React.ReactNode;
}) {
  /* jira-compare 2026-05-05: changed from INLINE (label left 96px + value right)
     to STACKED (label on its own line, value on next line) to match Jira's
     Details panel layout. DOM-probed BAU-5609 right rail:
       label: font-size 12px, font-weight 600, color #626F86, margin-bottom 4px
       value: font-size 14px, color #292A2E, full width
     Vertical padding between fields: ~12px top (8px bottom). */
  return (
    <div style={{ padding: '4px 0 12px' }}>
      <div style={{
        fontSize: 12, fontWeight: 600, lineHeight: '16px',
        color: 'var(--ds-text-subtlest, #626F86)',
        marginBottom: 4, textTransform: 'none',
      }}>
        {label}
      </div>
      <div style={{ fontSize: 14, color: 'var(--ds-text, #292A2E)', minWidth: 0 }}>
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
import { EditableAssignee, EditableReporter, EditableLabels, EditableFixVersions, EditablePriority } from '@/modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields';
import { CatalystParentLinker } from './CatalystParentLinker';
import type { CatalystItemType } from '../types';
import { EpicDueDateField } from '@/components/project/EpicDueDateField';
/* MDT Ref removed 2026-05-05 per Vikram directive — "remove MDT ref for good". */
import {
  CatalystIRDemoDateDisplay,
  CatalystIRFigmaApprovedDisplay,
  CatalystIRDemoApprovedDisplay,
  CatalystActualStartDisplay,
  CatalystActualEndDisplay,
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
import { toast } from 'sonner';
import {
  STATUS_OPTION_GROUPS,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/constants';
import {
  fmtDate, getStatusCategory, getStatusStyle, getInitials, getAvatarColor,
} from '@/modules/project-work-hub/components/dialogs/story-detail-modules/helpers';

/**
 * jira-compare 2026-05-03 — Patch A6 · Hybrid time format helper.
 * Returns a relative description like "4 days ago" / "yesterday" / "just now".
 * Pair with absolute fmtDate(...) for the "29 Apr 2026 · 4 days ago" hybrid
 * mirroring Jira's BAU-5737 footer timestamps.
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
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfigureDrawer, setShowConfigureDrawer] = useState(false);
  const [pinnedFields, setPinnedFields] = useState<string[]>(() =>
    loadPinnedFields(issue?.issue_type ?? 'Story'),
  );
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  const statusValue = localStatus || issue?.status || 'Backlog';
  const statusCategory = issue?.status_category || getStatusCategory(statusValue);
  const statusStyle = getStatusStyle(statusValue, statusCategory);

  // ── Workflow-aware dropdown (Jira-parity) ──────────────────────────
  // When the issue type is bound to one of our workflows (SDLC / Simple / Bug),
  // use the new StatusTransitionDropdown which matches Jira's verb→pill pattern
  // and renders categories beyond the legacy 3-colour guardrail (red / yellow /
  // purple). Falls back to the original grouped picker below when no workflow
  // is defined for the issue type (e.g. Task, Subtask).
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

  useEffect(() => {
    if (!showStatusDropdown) return;
    const h = (e: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node))
        setShowStatusDropdown(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusDropdown]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {statusPill}
          {improveDropdown}
        </div>
      )}
      {SHOW_RAIL_STATUS && (workflow && currentWorkflowState ? (
        <div style={{ marginBottom: 14 }}>
          {/* jira-compare A2 (2026-04-28): label every right-rail field for
              consistency with Fix versions / Assignee / Reporter / Labels. */}
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-primary, #292A2E)', marginBottom: 4 }}>Status</div>
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
      <div style={{ marginBottom: 14, position: 'relative' }} ref={statusDropdownRef}>
        {/* jira-compare A2 (2026-04-28): label for the rail Status field. */}
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-primary, #292A2E)', marginBottom: 4 }}>Status</div>
        <button
          onClick={() => setShowStatusDropdown(!showStatusDropdown)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 3,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--ds-surface-hovered, #F4F5F7)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {/* jira-compare A1 (2026-04-28): wrap with jira-parity attribute so
              the global lozenge override (text-transform: none, fw 600) reaches
              this direct AkLozenge import. */}
          {/* jira-compare follow-up (2026-05-02): isBold matches WorkItemStatusLozenge's
              rail-card rendering (variant='bold') so Status reads with the same
              saturation across rail card / pill / sidebar. */}
          <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
            <Lozenge appearance={lozengeAppearance} isBold={lozengeAppearance !== 'default'}>{statusValue}</Lozenge>
          </span>
          <ChevronDownIcon size="small" primaryColor="var(--ds-icon-subtle, #42526E)" />
        </button>
        {showStatusDropdown && (
          <div style={{
            position: 'absolute', left: 0, top: '100%', marginTop: 4,
            background: 'var(--ds-surface, #FFFFFF)', borderRadius: 8,
            boxShadow: '0 4px 24px rgba(30,31,33,0.16), 0 0 1px rgba(30,31,33,0.31)',
            padding: '6px 0', zIndex: 9999, minWidth: 240, maxHeight: 420, overflowY: 'auto',
            animation: 'cv-slide-down 0.15s ease-out',
          }}>
            {STATUS_OPTION_GROUPS.map(group => (
              <div key={group.category}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)', textTransform: 'uppercase',
                  letterSpacing: '0.06em', padding: '10px 16px 6px',
                }}>{group.groupLabel}</div>
                {group.statuses.map(st => {
                  const isActive = statusValue === st;
                  const cat = group.category as 'todo' | 'in_progress' | 'done';
                  // Phase E.2 (2026-04-18): Atlaskit Lozenge per CLAUDE.md §5.
                  const optionAppearance: 'default' | 'inprogress' | 'success' =
                    cat === 'done' ? 'success' : cat === 'in_progress' ? 'inprogress' : 'default';
                  return (
                    <div key={st} onClick={() => { setLocalStatus(st); setShowStatusDropdown(false); onStatusChange(st); }}
                      style={{
                        height: 36, padding: '0 16px', display: 'flex', alignItems: 'center',
                        justifyContent: 'space-between', cursor: 'pointer',
                        background: isActive ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent', transition: 'background 80ms',
                      }}
                      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--ds-surface-sunken, #F4F5F7)'; }}
                      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {/* jira-compare follow-up (2026-05-02): isBold so the
                          dropdown options inherit the same saturation as the
                          rendered status pill — fixes "everything is faded
                          out" gripe in Vikram's screenshot 5. */}
                      <span data-cp-lozenge-jira-parity style={{ display: 'inline-block' }}>
                        <Lozenge appearance={optionAppearance} isBold>{st}</Lozenge>
                      </span>
                      {isActive && (
                        <CheckIcon size="small" primaryColor="var(--ds-icon-selected, #0052CC)" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {/* View workflow link */}
            <div style={{ borderTop: '1px solid var(--ds-border, #EBECF0)', marginTop: 4, padding: '8px 16px' }}>
              <span style={{ fontSize: 13, color: 'var(--ds-text-secondary, #505258)', cursor: 'default' }}>View workflow</span>
            </div>
          </div>
        )}
      </div>
      ))}

      {/* ── Pinned fields section ────────────────────────────────────────
          Jira parity: when the user has pinned fields via Configure, they
          surface here above the Details block as a "Pinned fields" group. */}
      {pinnedFields.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, color: 'var(--ds-text-subtlest, #6B778C)',
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
              if (fieldId === 'labels') return (
                <FieldRow key={fieldId} label="Labels" labelTopPad>
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
              if (fieldId === 'fixVersions' && issue?.issue_type !== 'Epic') return (
                <FieldRow key={fieldId} label="Fix versions" labelTopPad>
                  {issue && (
                    <EditableFixVersions
                      issueId={issue.id}
                      currentFixVersions={issue.fix_versions}
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
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, height: 40,
          padding: '0 0', background: 'transparent',
        }}>
          <ChevronDownIcon size="small" primaryColor="var(--ds-icon-subtle, #626F86)" />
          <Heading size="small">Details</Heading>
        </div>

        <div style={{ padding: '0' }}>

          {/* ── Fix Versions ──── jira-compare Phase 2 (2026-05-02): hidden
              on Epic — Jira NIN omits this field from the Epic context
              items (BAU-5419 Lane A re-probe). */}
          {issue?.issue_type !== 'Epic' && (
            <FieldRow label="Fix versions" labelTopPad>
              {issue && (
                <EditableFixVersions
                  issueId={issue.id}
                  currentFixVersions={issue.fix_versions}
                  projectKey={issue.project_key}
                  onUpdate={invalidateIssue}
                />
              )}
            </FieldRow>
          )}

          {/* ── Assignee ──── */}
          <FieldRow label="Assignee">
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
              {/* jira-compare 2026-05-07: hide when current user IS the assignee (Jira account ID or Supabase UUID match) */}
              {user && issue?.assignee_account_id !== user.id && issue?.assignee_account_id !== currentUserJiraId && (
                <button
                  type="button"
                  onClick={handleAssignToMe}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ds-link, #0C66E4)', fontSize: 11, textAlign: 'left', marginTop: 2 }}
                >
                  Assign to me
                </button>
              )}
            </div>
          </FieldRow>

          {/* ── Priority (Epic) — REMOVED 2026-05-05 per Vikram directive.
              Jira does not show Priority in the right rail Details section
              for any issue type probed (Stories, Epics on BAU board).
              Priority belongs in the Key details left block. */}

          {/* ── Reporter ──── Defect-2 Cycle 6 (2026-05-03): made editable */}
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

          {/* ── Labels ──── REMOVED 2026-05-05 per Vikram directive (jira-compare cycle 1
              on BAU-5737 QA Bug). Lane B Rovo getJiraIssueTypeMetaWithFields(BAU,
              QA Bug=10012) proves Labels is NOT in the QA Bug screen scheme.
              The 2026-05-03 "RESTORED" directive came from a Story-only DOM
              probe and was over-generalised to all types (anti-pattern #18).
              Banned globally — per CLAUDE.md "no Catalyst-side fields rendered
              outside the Jira issue-type screen scheme without explicit ask".
              If Story etc. needs Labels back, gate by issue_type, don't render
              globally. */}

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
            <FieldRow label="Due date">
              <EpicDueDateField
                issueId={issue.id}
                dueDate={(issue as any).due_date ?? null}
                isEpic={false}
                onSave={async (date) => {
                  const { error } = await (supabase as any)
                    .from('ph_issues')
                    .update({ due_date: date })
                    .eq('issue_key', issue.issue_key);
                  if (error) {
                    toast.error('Failed to save due date');
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
              <FieldRow label="Due date">
                <EpicDueDateField
                  issueId={issue.id}
                  dueDate={(issue as any).due_date ?? null}
                  isEpic
                  onSave={async (date) => {
                    const { error } = await (supabase as any)
                      .from('ph_issues')
                      .update({ due_date: date })
                      .eq('issue_key', issue.issue_key);
                    if (error) {
                      toast.error('Failed to save due date');
                      throw error;
                    }
                    invalidateIssue();
                  }}
                />
              </FieldRow>
              <FieldRow label="Actual start">
                <CatalystActualStartDisplay issue={issue} />
              </FieldRow>
              <FieldRow label="Actual end">
                <CatalystActualEndDisplay issue={issue} />
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
              <FieldRow label="IR Figma Approved" labelTopPad>
                <CatalystIRFigmaApprovedDisplay issue={issue} />
              </FieldRow>
              <FieldRow label="IR Demo Approved" labelTopPad>
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
        </div>
      </div>

      {/* ── Timestamps + Configure CTA (canonical) ──────────────
          jira-compare 2026-05-03 — Patch A5 · ⚙ Configure CTA added
          alongside Created / Updated, mirroring Jira BAU-5737 footer. */}
      <div style={{ marginTop: 'auto', padding: '12px 0 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* jira-compare 2026-05-03 — Patch A6 · Hybrid time format
              (absolute · relative). Title attr exposes the ISO on hover. */}
          <div style={{ fontSize: 12, color: '#5E6C84', marginBottom: 4, lineHeight: 1.6 }} title={issue?.jira_created_at ?? undefined}>
            <span style={{ color: '#42526E', fontWeight: 500 }}>Created</span> {fmtDate(issue?.jira_created_at)}
            {issue?.jira_created_at && <span style={{ color: '#7A869A' }}> · {fmtRelative(issue.jira_created_at)}</span>}
          </div>
          <div style={{ fontSize: 12, color: '#5E6C84', lineHeight: 1.6 }} title={issue?.jira_updated_at ?? undefined}>
            <span style={{ color: '#42526E', fontWeight: 500 }}>Updated</span> {fmtDate(issue?.jira_updated_at)}
            {issue?.jira_updated_at && <span style={{ color: '#7A869A' }}> · {fmtRelative(issue.jira_updated_at)}</span>}
          </div>
        </div>
        <Button
          appearance="subtle"
          spacing="compact"
          iconBefore={(iconProps) => <SettingsIcon {...iconProps} label="" />}
          onClick={() => setShowConfigureDrawer(true)}
        >
          Configure
        </Button>
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
