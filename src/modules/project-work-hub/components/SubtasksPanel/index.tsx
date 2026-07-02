/**
 * SubtasksPanel — Atlaskit-parity subtasks table + end-to-end CRUD.
 *
 * Layout (match Jira):
 *   [▼ Subtasks]                                             [···]  [⊞]  [+]
 *   [════════════════════════════════════════════════════]   X% Done
 *   ┌──────────────────────────────────────────────────────────────────────┐
 *   │ Work                              Priority    Assignee       Status  │
 *   │ 🟦 BAU-5091  Enable AD SSO…       ═ Medium    👤 Hassan R…   [DONE ▾] │
 *   └──────────────────────────────────────────────────────────────────────┘
 *
 * Interactions:
 *   • Click status  → grouped popover (To Do / In Progress / Done)
 *   • Click priority → 4-level popover
 *   • Click assignee → search typeahead against jira_identity_map
 *   • Hover row → ··· row-actions (open / rename / delete)
 *   • Header ··· → Collapse / Clear completed
 *   • + → inline create row with type selector
 */
import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useCreateChildListener, useCreateChildWorkItemListener } from '@/components/catalyst-detail-views/shared/sections/quickActionsBus';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { catalystToast } from '@/lib/catalystToast';
import {
  ChevronDown, Plus,
  Check, X as CrossIcon, Edit as EditPencilIcon,
} from '@/lib/atlaskit-icons';
import UtilityChevronDown from '@atlaskit/icon/utility/chevron-down';
import UtilityChevronRight from '@atlaskit/icon/utility/chevron-right';
import Tooltip from '@atlaskit/tooltip';
import { nextPos, resolveStatusCategory } from '../dialogs/story-detail-modules/helpers';
import { CANONICAL_WORK_ITEM_OPTIONS } from '@/components/shared/canonicalWorkItemOptions';
import { EditableAssignee, EditablePriority } from '../dialogs/story-detail-modules/EditableFields';
import { AssigneeCell } from './cells/AssigneeCell';
import { StatusCell } from './cells/StatusCell';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import { ColumnsButton } from './ColumnsButton';
// ViewToggle and BoardView removed — Jira parity: child-issues panel is list-only.
// No list/board toggle exists in Jira's child issues section.
import { BulkEditBar } from './BulkEditBar';
import { useSubtaskMutations, type SubtaskRow } from './hooks/useSubtaskMutations';
import { sortRows, cycleSort, type SortField, type SortState } from './sort';
import { computeNewPosition, rebalancePositions } from './reorder';
import { WorkCellPrefix, WorkCellSummary } from './cells/WorkCell';
import { useAtlaskitThemeSync } from './atlaskitTheme';
import { resolveAllowedChildTypes, panelTitleFor } from './hierarchy';
import { InlineCreateWithAI } from './InlineCreateWithAI';
import { AiSuggestChildrenPanel } from './AiSuggestChildrenPanel';
import { CreateStoryModal } from '@/components/workhub/create-story';
import { subtaskCreateInputSchema } from './schemas';
import { resolveAvatarUrl } from '@/lib/avatars';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
// SubtasksPanel migrated off @atlaskit/dynamic-table on 2026-04-26 — the last
// direct importer of that package. List view now uses the canonical JiraTable.
// The board (Kanban) view above still renders via SubtasksKanban and is
// untouched. DnD row-reorder (handleRankEnd) is staged behind a JiraTable
// feature add (row drag-reorder) — kept in this file as `dndEnabled` /
// `handleRankEnd` so the wiring is one prop away when the canonical exposes
// it. For now the DnD flag is suppressed and rows render in `position` order.
import { JiraTable } from '@/components/shared/JiraTable';
import type { Column } from '@/components/shared/JiraTable';
import { WorkItemsProgressBar } from '@/components/shared/WorkItemsProgressBar';
import { createChildIssue } from '../../lib/workItemRepo';
import './SubtasksPanel.css';

// Jira parity: 4 columns only — Work (type+key+summary), Priority (icon), Assignee (avatar), Status.
type VisibleColumn = 'work' | 'priority' | 'assignee' | 'status';

interface SubtasksPanelProps {
  storyKey: string;
  storyId: string;
  projectKey: string;
  onSubtaskClick?: (subtaskId: string) => void;
  /**
   * Parent issue's type (e.g. "Epic", "Story", "Feature", "Sub-task"…).
   * Drives hierarchy enforcement:
   *   • Epic    → child types limited to story-level; Sub-task family blocked
   *   • Story/… → child types limited to the sub-task family
   *   • Sub-task / Backend / Frontend / etc. → creation disabled entirely
   * Also drives the default panel title ("Child work items" for Epic,
   * "Subtasks" everywhere else).
   * Optional for back-compat; when omitted, falls back to a permissive
   * union of story-level + sub-task-family types.
   */
  parentIssueType?: string;
  /** Parent issue summary — passed to AI predict_subtask_titles for better context. */
  parentSummary?: string;
  /** Optional explicit title override. Defaults to panelTitleFor(parentIssueType). */
  title?: string;
  /**
   * Phase 5 (Apr 2026): when the parent story is a Catalyst-native item,
   * subtasks are created in catalyst_issues with parent_key set. When the
   * parent is Jira-synced, subtasks land in ph_issues for write-back parity.
   */
  parentSource?: 'jira' | 'catalyst';
  parentProjectId?: string | null;
  /**
   * Per-surface override for the inline-create type picker. When supplied
   * (non-empty), these exact types are offered instead of the canonical
   * parent→child rules — used by the Business Request detail view to scope
   * creation to its 5 subtask categories without mutating the shared
   * hierarchy map (2026-06-15). Absent/empty → canonical rules apply.
   */
  childTypeOverride?: string[];
}

// ─── Type selector for inline create ────────────────────
function TypeSelector({
  value, onChange, allowed,
}: { value: string; onChange: (v: string) => void; allowed: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allowedSet = React.useMemo(() => new Set(allowed), [allowed]);
  const options = React.useMemo(
    () => CANONICAL_WORK_ITEM_OPTIONS.filter(o => allowedSet.has(o.key)),
    [allowedSet],
  );
  const current = options.find(t => t.key === value) ?? options[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!current) return null;

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="sp-type-selector-btn">
        <span style={{ display: 'flex', width: 16, height: 16 }}>{current.icon}</span>
        <span>{current.label}</span>
        <ChevronDown size={12} color="var(--ds-text-subtlest, var(--cp-text-secondary))" />
      </button>
      {open && (
        <div className="sp-type-selector-dropdown">
          {options.map(opt => (
            <div
              key={opt.key}
              onClick={() => { onChange(opt.key); setOpen(false); }}
              className={`sp-type-selector-item ${opt.key === value ? 'is-active' : ''}`}
            >
              <span style={{ display: 'flex', width: 16, height: 16 }}>{opt.icon}</span>
              <span>{opt.label}</span>
              {opt.key === value && <Check size={12} color="var(--cp-primary-60)" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sprint/Iteration cell ──────────────────────────────────
function sprintReleaseNames(raw: unknown): string[] {
  if (!raw) return [];
  // Stored as Json on ph_issues. Tolerate: string[], { name: string }[], comma-separated string.
  if (Array.isArray(raw)) {
    return raw
      .map((v) => (typeof v === 'string' ? v : (v as { name?: string })?.name ?? ''))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof raw === 'string') {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function SprintReleasesCell({ value }: { value: unknown }) {
  const names = sprintReleaseNames(value);
  if (names.length === 0) return <span className="sp-fixv-empty" aria-label="No sprint/releases"></span>;
  return (
    <div className="sp-fixv-cell" title={names.join(', ')}>
      {names.slice(0, 2).map((n) => (
        <span key={n} className="sp-fixv-chip">{n}</span>
      ))}
      {names.length > 2 && (
        <span className="sp-fixv-more">+{names.length - 2}</span>
      )}
    </div>
  );
}

// ─── Inline summary editor ──────────────────────────────
function InlineSummaryEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionsPos, setActionsPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else onCancel();
  };

  // Compute action-row position from input rect. Recompute on scroll/resize
  // so the floating actions track the input through the page.
  useLayoutEffect(() => {
    const reposition = () => {
      const el = inputRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Actions = 2 × 32px button + 4px gap = 68px wide. Anchor right edge to input right.
      setActionsPos({ top: rect.bottom + 6, left: rect.right - 68 });
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, []);

  // Close on outside click — mirrors Jira's inline edit dismissal. The portal
  // actions live outside the wrap so check against both.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      if (actionsRef.current?.contains(t)) return;
      onCancel();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [onCancel]);

  // 2026-06-23 — Dismiss the edit when the user resizes the Work column.
  // ResizeObserver on the parent <td>; first measurement is ignored so the
  // mount itself doesn't cancel.
  useEffect(() => {
    const td = wrapRef.current?.closest('td');
    if (!td) return;
    let firstObservation = true;
    const ro = new ResizeObserver(() => {
      if (firstObservation) {
        firstObservation = false;
        return;
      }
      onCancel();
    });
    ro.observe(td);
    return () => ro.disconnect();
  }, [onCancel]);

  return (
    <div
      ref={wrapRef}
      className="sp-inline-summary-wrap"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="text"
        className="sp-inline-summary-input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
          if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        maxLength={255}
      />
      {actionsPos && createPortal(
        <div
          ref={actionsRef}
          className="sp-inline-summary-actions"
          style={{ position: 'fixed', top: actionsPos.top, left: actionsPos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="sp-inline-summary-btn sp-inline-summary-btn--confirm"
            onMouseDown={(e) => e.preventDefault()}
            onClick={commit}
            aria-label="Confirm"
            title="Confirm"
          >
            <Check size={16} />
          </button>
          <button
            type="button"
            className="sp-inline-summary-btn sp-inline-summary-btn--cancel"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onCancel}
            aria-label="Cancel"
            title="Cancel"
          >
            <CrossIcon size={16} />
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

function SummaryEditButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="sp-summary-edit-btn"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      aria-label="Edit summary"
      title="Edit summary"
    >
      <EditPencilIcon size={16} />
    </button>
  );
}

// ─── Main component ─────────────────────────────────────
export function SubtasksPanel({
  storyKey, storyId, projectKey, onSubtaskClick, parentIssueType, parentSummary, title,
  parentSource = 'jira', parentProjectId = null, childTypeOverride,
}: SubtasksPanelProps) {
  useAtlaskitThemeSync();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ─── Hierarchy-driven config ─────────────────────────
  const allowedTypes = useMemo(
    () => resolveAllowedChildTypes(parentIssueType, childTypeOverride),
    [parentIssueType, childTypeOverride],
  );
  const canCreate = allowedTypes.length > 0;
  const effectiveTitle = title ?? panelTitleFor(parentIssueType);
  const defaultDraftType = allowedTypes[0] ?? 'Sub-task';
  // Vikram 2026-07-02: for subtask creation the inline input skips the
  // AI-predict + Choose-existing dropdown — user just types + submits.
  // Detect via the panel title ("Subtasks" == father context).
  const isSubtaskContext = effectiveTitle === 'Subtasks';

  const [expanded, setExpanded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draftType, setDraftType] = useState(defaultDraftType);
  // Re-seed draft type when the allowed set changes (e.g. parent type reload)
  useEffect(() => {
    if (!allowedTypes.includes(draftType)) {
      setDraftType(defaultDraftType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultDraftType]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hideDone, setHideDone] = useState(false);
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Sort state — rehydrated from localStorage per parent on mount.
  const sortStorageKey = `sp.sort.${storyKey}`;
  const [sort, setSort] = useState<SortState>(() => {
    if (typeof window === 'undefined') return { field: null, dir: 'asc' };
    try {
      const raw = window.localStorage.getItem(sortStorageKey);
      if (!raw) return { field: null, dir: 'asc' };
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.field === null || typeof parsed.field === 'string')
          && (parsed.dir === 'asc' || parsed.dir === 'desc')) {
        return parsed as SortState;
      }
    } catch { /* ignore bad storage */ }
    return { field: null, dir: 'asc' };
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem(sortStorageKey, JSON.stringify(sort)); } catch { /* quota */ }
  }, [sort, sortStorageKey]);

  // Ref forwarded to InlineCreateWithAI so the "+" in the heading can
  // refocus the input when the user is already in creating mode.
  const inlineCreateInputRef = useRef<HTMLInputElement>(null);

  // Cross-component bridge: when CatalystQuickActions' "Create child
  // work item" menu item is clicked, expand the panel and enter
  // inline-create mode. InlineCreateWithAI auto-focuses its input on
  // mount, and HTMLElement.focus() natively scrolls the input into
  // view — no manual scrollIntoView needed (it would land on the
  // section title and conflict with the focus scroll).
  // Modal state for Edit action (AI-suggest → CreateStoryModal prefilled).
  const [subtaskModal, setSubtaskModal] = useState<{ title: string; type: string } | null>(null);
  // Whether the AI-suggest panel should auto-fetch on mount. Set true
  // when the create was triggered by the quick-actions menu (user
  // explicitly asked to create), false when triggered by the panel's
  // own "+ Add subtask" button (user just opened the section — waits
  // for Suggest click). Vikram 2026-07-02.
  const [autoFetchAi, setAutoFetchAi] = useState(false);
  const openCreate = useCallback(() => {
    if (!canCreate) return;
    setExpanded(true);
    setCreating(true);
    setAutoFetchAi(true); // came from quick actions → auto-fetch
  }, [canCreate]);
  useCreateChildListener(openCreate);
  useCreateChildWorkItemListener(openCreate);

  // Jira parity: 4 columns only (Work / Priority / Assignee / Status).
  const [columns, setColumns] = useState<Record<VisibleColumn, boolean>>({
    work: true,
    priority: true,
    assignee: true,
    status: true,
  });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SubtaskRow | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { update, remove, bulkUpdate, bulkRemove, reorderPositions } = useSubtaskMutations(storyKey);

  // ─── Data query ───────────────────────────────
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      // Phase 5 (Apr 2026): union catalyst_issues alongside ph_issues so
      // Catalyst-native subtasks render in the same list as Jira-synced ones.
      // 2026-07-02: ph_issues has no `position` column — real column is
      // `sort_order`. Aliased back to `position` in the SELECT so the
      // downstream row shape (SubtaskRow) doesn't have to change.
      const [phRes, catRes] = await Promise.all([
        supabase
          .from('ph_issues')
          .select('id,issue_key,summary,status,status_category,issue_type,assignee_display_name,assignee_account_id,priority,position:sort_order,deleted_at,sprint_release,jira_created_at')
          .eq('parent_key', storyKey)
          .is('deleted_at', null)
          .order('sort_order', { ascending: true, nullsFirst: false }),
        supabase
          .from('catalyst_issues')
          .select('id,issue_key,title,status,status_category,issue_type,assignee_id,priority,sprint_release,created_at,parent_key,deleted_at')
          .eq('parent_key', storyKey)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
      ]);
      if (phRes.error) throw phRes.error;
      const ph = (phRes.data ?? []) as SubtaskRow[];
      const seen = new Set(ph.map((r) => r.issue_key));
      const cat: SubtaskRow[] = (catRes.data ?? [])
        .filter((r: any) => r.issue_key && !seen.has(r.issue_key))
        .map((r: any) => ({
          id: r.id,
          issue_key: r.issue_key,
          summary: r.title,
          status: r.status,
          status_category: (r.status_category as any) ?? (r.status === 'Done' ? 'done' : r.status === 'In Progress' ? 'in_progress' : 'todo'),
          issue_type: r.issue_type,
          assignee_account_id: r.assignee_id ?? null,
          assignee_display_name: null,
          priority: r.priority,
          position: null,
          deleted_at: null,
          sprint_release: r.sprint_release ?? null,
          jira_created_at: r.created_at,
        } as SubtaskRow));
      return [...ph, ...cat];
    },
    enabled: !!storyKey,
  });

  /**
   * §19 avatar chokepoint (2026-04-20).
   * Previously queried `jira_identity_map.avatar_url` (BANNED PATTERN per
   * CLAUDE.md §19) and handed external Atlassian-CDN URLs to `<AssigneeCell>`.
   * Now avatars resolve synchronously from each child's `assignee_display_name`
   * via `resolveAvatarUrl`. No external URL; no Supabase call.
   */
  const avatarMap = useMemo<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    children.forEach((c) => {
      if (c.assignee_account_id && c.assignee_display_name) {
        map[c.assignee_account_id] = resolveAvatarUrl(c.assignee_display_name);
      }
    });
    return map;
  }, [children]);

  // ─── Progress calc ────────────────────────────
  const doneRows = useMemo(
    () => children.filter(c => (c.status_category ?? '').toLowerCase() === 'done'),
    [children]
  );
  const doneCount = doneRows.length;
  const totalCount = children.length;
  const percentage = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // Memoised sibling context for InlineCreateWithAI (AI prompt + fuzzy-search exclusion).
  const siblingSummaries = useMemo(() => children.map(c => c.summary), [children]);
  const siblingIds = useMemo(() => children.map(c => c.id), [children]);

  // ─── Hide-done filter + sort applied to visible rows ───
  const visibleRows = useMemo(() => {
    const filtered = hideDone
      ? children.filter(c => (c.status_category ?? '').toLowerCase() !== 'done')
      : children;
    return sortRows(filtered, sort);
  }, [children, hideDone, sort]);

  // Keep selection clean if hideDone removes rows or a row is deleted elsewhere.
  useEffect(() => {
    if (selectedIds.size === 0) return;
    const visibleIdSet = new Set(visibleRows.map(r => r.id));
    let changed = false;
    const next = new Set<string>();
    selectedIds.forEach(id => {
      if (visibleIdSet.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedIds(next);
  }, [visibleRows, selectedIds]);

  // ─── Create mutation ──────────────────────────
  const createMutation = useMutation({
    mutationFn: async (summary: string) => {
      // Boundary validation — guards against empty / whitespace-only summaries
      // arriving from any call site (inline create, AI create, future callers).
      const parsed = subtaskCreateInputSchema.safeParse({
        summary,
        issue_type: draftType,
        parent_key: storyKey,
        project_key: projectKey,
        priority: 'Medium',
      });
      if (!parsed.success) {
        throw new Error(parsed.error.issues.map((i) => i.message).join('; '));
      }
      // Phase 5 (Apr 2026): source-aware insert. Catalyst-parent → catalyst_issues
      // with parent_key set; Jira-parent → ph_issues (legacy write-back path).
      // generateIssueKey queries BOTH tables → no Jira collisions.
      const created = await createChildIssue({
        parent: { source: parentSource, id: '', issueKey: storyKey, projectKey },
        summary: parsed.data.summary,
        issueType: parsed.data.issue_type,
        projectKey: parsed.data.project_key,
        projectId: parentProjectId,
        reporterId: user?.id ?? null,
        priority: parsed.data.priority,
        position: nextPos(children),
      });
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
      // Jira-parity toast (2026-07-02) — "You've created 'KEY'" with
      // View (opens detail in new tab) + Copy link actions.
      const key = created?.issue_key;
      if (key && projectKey) {
        const url = `${window.location.origin}/project-hub/${projectKey}/issue/${key}`;
        catalystToast.show({
          type: 'success',
          title: `You've created "${key}"`,
          actions: [
            { label: 'View', onClick: () => window.open(url, '_blank', 'noopener,noreferrer') },
            { label: 'Copy link', onClick: () => { void navigator.clipboard.writeText(url); } },
          ],
          duration: 6000,
        });
      }
    },
    onError: (err, summary) => {
      // Jira-parity error flag (2026-07-02) — mirrors the release success
      // toast: canonical ADS flag with title + message + action buttons.
      // Retry re-runs the mutation with the same summary.
      const msg = err instanceof Error ? err.message : String(err ?? 'Unknown error');
      catalystToast.show({
        type: 'error',
        title: 'Failed to create subtask',
        message: msg,
        actions: [
          { label: 'Retry', onClick: () => createMutation.mutate(summary) },
        ],
        duration: 6000,
      });
    },
  });

  // ─── Link-existing mutation ───────────────────
  // Reparents an existing issue under this story by setting parent_key.
  const linkExistingMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const { error } = await supabase
        .from('ph_issues')
        .update({ parent_key: storyKey })
        .eq('id', issueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
      catalystToast.success('Linked to existing work item');
    },
    onError: (err) => catalystToast.error('Failed to link work item'),
  });


  // ─── Handlers ─────────────────────────────────
  const handleStatusChange = (row: SubtaskRow) => (status: string, category: 'todo' | 'in_progress' | 'done') => {
    if (row.status === status) return;
    update.mutate({
      id: row.id,
      patch: { status, status_category: category || resolveStatusCategory(status) },
    });
  };

  const handlePriorityChange = (row: SubtaskRow) => (priority: 'Critical' | 'High' | 'Medium' | 'Low') => {
    if ((row.priority ?? '').toLowerCase() === priority.toLowerCase()) return;
    update.mutate({ id: row.id, patch: { priority } });
  };

  const handleAssigneeChange = (row: SubtaskRow) => (a: { accountId: string | null; displayName: string | null }) => {
    if (row.assignee_account_id === a.accountId) return;
    update.mutate({
      id: row.id,
      patch: {
        assignee_account_id: a.accountId,
        assignee_display_name: a.displayName,
      },
    });
  };

  const handleSummarySave = (row: SubtaskRow) => (summary: string) => {
    setEditingId(null);
    update.mutate({ id: row.id, patch: { summary } });
  };

  const handleDelete = (row: SubtaskRow) => {
    setPendingDelete(row);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id);
    setPendingDelete(null);
  };

  // ─── Bulk edit handlers ───────────────────────
  const enterBulkEdit = () => {
    setBulkEditMode(true);
    setSelectedIds(new Set());
  };

  const exitBulkEdit = () => {
    setBulkEditMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every(r => selectedIds.has(r.id));
  const someVisibleSelected = visibleRows.some(r => selectedIds.has(r.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleRows.map(r => r.id)));
  };

  const handleBulkStatus = (status: string, category: 'todo' | 'in_progress' | 'done') => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      ids: Array.from(selectedIds),
      patch: { status, status_category: category || resolveStatusCategory(status) },
    });
  };

  const handleBulkPriority = (priority: 'Critical' | 'High' | 'Medium' | 'Low') => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({ ids: Array.from(selectedIds), patch: { priority } });
  };

  const handleBulkAssignee = (a: { accountId: string | null; displayName: string | null }) => {
    if (selectedIds.size === 0) return;
    bulkUpdate.mutate({
      ids: Array.from(selectedIds),
      patch: { assignee_account_id: a.accountId, assignee_display_name: a.displayName },
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setPendingBulkDelete(true);
  };

  const confirmBulkDelete = () => {
    bulkRemove.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
    setPendingBulkDelete(false);
  };

  const handleViewInSearch = () => {
    const pk = projectKey || storyKey.split('-')[0];
    if (!pk) return;
    window.location.href = `/project-hub/${pk}/allwork?issue=${encodeURIComponent(storyKey)}`;
  };

  // ─── Rank reorder (Atlaskit DynamicTable) ───────
  // Jira-parity: DnD disabled while a sort is active OR hide-done is on.
  const dndEnabled = !sort.field && !hideDone && !bulkEditMode;

  // DynamicTable onRankEnd signature: { sourceIndex, destination: { index } }
  // Indices are into the rows[] array we pass to DynamicTable, which already
  // matches our visibleRows order.
  const handleRankEnd = (params: { sourceIndex: number; destination?: { index: number } | null }) => {
    const { sourceIndex, destination } = params;
    if (!destination || destination.index === sourceIndex) return;
    const moved = visibleRows[sourceIndex];
    if (!moved) return;
    const movedId = moved.id;

    const positioned = visibleRows.map(r => ({ id: r.id, position: r.position ?? 0 }));
    const result = computeNewPosition(positioned, movedId, destination.index);

    // bigint-safe: if no integer slot exists between neighbours, renumber the
    // full list with 1024 spacing so subsequent drags have slack again.
    if (result.needsRebalance) {
      const without = visibleRows.filter(r => r.id !== movedId);
      const insertAt = Math.max(0, Math.min(destination.index, without.length));
      const reordered = [
        ...without.slice(0, insertAt),
        moved,
        ...without.slice(insertAt),
      ];
      reorderPositions.mutate(rebalancePositions(reordered.map(r => r.id)));
      return;
    }

    if (result.position == null) return;
    update.mutate({ id: movedId, patch: { position: result.position } });
  };

  // DynamicTable sort-click handler — translates its 2-state toggle to our
  // 3-state cycle (asc→desc→off) for users who click column headers.
  const handleColumnHeaderSort = (key: string, order: 'ASC' | 'DESC') => {
    const field = key as SortField;
    if (sort.field === field && sort.dir === 'desc' && order === 'ASC') {
      // User's third click on same field — clear.
      setSort({ field: null, dir: 'asc' });
      return;
    }
    setSort({ field, dir: order === 'DESC' ? 'desc' : 'asc' });
  };

  // ─── Keyboard navigation ─────────────────────────
  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    // ⇧C → create child (Jira parity). Silently no-ops when hierarchy
    // disallows creation under this parent type (e.g. Sub-task parents).
    if (e.shiftKey && (e.key === 'C' || e.key === 'c')
        && !creating && !editingId && canCreate
        && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      setAutoFetchAi(false);
      setCreating(true);
      return;
    }
    if (visibleRows.length === 0) return;
    const currentIdx = focusedRowId
      ? visibleRows.findIndex(r => r.id === focusedRowId)
      : -1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = visibleRows[Math.min(currentIdx + 1, visibleRows.length - 1)];
      if (next) setFocusedRowId(next.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = visibleRows[Math.max(currentIdx - 1, 0)];
      if (prev) setFocusedRowId(prev.id);
    } else if (e.key === 'Home' && visibleRows.length > 0) {
      e.preventDefault();
      setFocusedRowId(visibleRows[0].id);
    } else if (e.key === 'End' && visibleRows.length > 0) {
      e.preventDefault();
      setFocusedRowId(visibleRows[visibleRows.length - 1].id);
    } else if (e.key === 'Enter' && focusedRowId && !editingId) {
      e.preventDefault();
      const focusedRow = visibleRows.find(r => r.id === focusedRowId);
      onSubtaskClick?.(focusedRow?.issue_key ?? focusedRowId);
    } else if (e.key === 'F2' && focusedRowId && !editingId) {
      e.preventDefault();
      setEditingId(focusedRowId);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && e.shiftKey && focusedRowId && !editingId) {
      e.preventDefault();
      const row = visibleRows.find(r => r.id === focusedRowId);
      if (row) setPendingDelete(row);
    }
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div
        className="sp-panel"
        tabIndex={-1}
        ref={tableContainerRef}
        onKeyDown={handlePanelKeyDown}
      >
      {/* ═══ Header ═══ */}
      <div className="sp-header">
        <div className="sp-header-left">
          <Tooltip content={expanded ? 'Collapse' : 'Expand'} position="bottom">
            <button
              type="button"
              className="sp-collapse-btn"
              onClick={() => setExpanded(e => !e)}
              aria-expanded={expanded}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? <UtilityChevronDown label="" color="currentColor" /> : <UtilityChevronRight label="" color="currentColor" />}
            </button>
          </Tooltip>
          <h2
            className="sp-title"
            style={{ margin: 0, cursor: 'pointer' }}
            onClick={() => setExpanded(e => !e)}
          >
            {effectiveTitle}
          </h2>
          {totalCount > 0 && (
            <span className="sp-title-count">{doneCount}/{totalCount}</span>
          )}
        </div>
        {expanded && children.length > 0 && (
          <div className="sp-header-right">
            <HeaderOverflowMenu
              hideDone={hideDone}
              onToggleHideDone={() => setHideDone(h => !h)}
              bulkEditMode={bulkEditMode}
              onEnterBulkEdit={enterBulkEdit}
              onViewInSearch={handleViewInSearch}
              sort={sort}
              onCycleSort={(field: SortField) => setSort(s => cycleSort(s, field))}
            />
            <ColumnsButton columns={columns} onChange={setColumns} />
            {canCreate && (
              <button
                type="button"
                className="sp-icon-btn sp-icon-btn--add"
                title={`Create ${defaultDraftType.toLowerCase()}`}
                aria-label={`Create ${defaultDraftType.toLowerCase()}`}
                onClick={() => { setAutoFetchAi(false); setCreating(true); }}
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        )}
        {creating && canCreate && children.length === 0 && (
          <div className="sp-header-right">
            <button
              type="button"
              className="sp-title-plus"
              aria-label="Focus subtask name input"
              title="Focus subtask name input"
              onClick={() => {
                if (!expanded) setExpanded(true);
                inlineCreateInputRef.current?.focus();
                inlineCreateInputRef.current?.select();
              }}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Always-visible "Add subtask" link when there are no items. Sits
          outside the collapse gate so the user sees it even when the
          panel is collapsed (Jira parity — see Screenshot 2026-05-24). */}
      {!isLoading && children.length === 0 && !creating && canCreate && (
        <button
          type="button"
          className="sp-add-link"
          onClick={() => {
            setAutoFetchAi(false);
            setCreating(true);
            if (!expanded) setExpanded(true);
          }}
        >
          Add {effectiveTitle.toLowerCase().endsWith('s')
            ? effectiveTitle.toLowerCase().slice(0, -1)
            : effectiveTitle.toLowerCase()}
        </button>
      )}

      {expanded && (
        <>
          {/* ═══ Progress bar ═══ */}
          {totalCount > 0 && (
            <div className="sp-progress" role="progressbar" aria-valuemax={totalCount} aria-valuenow={doneCount} aria-label="Subtask progress">
              <div className="sp-progress-track">
                <div className="sp-progress-fill" style={{ width: `${percentage}%` }} />
              </div>
              <span className="sp-progress-label" aria-live="polite" aria-atomic="true">
                {percentage}% Done
              </span>
            </div>
          )}

          {/* ═══ Loading skeleton ═══ */}
          {isLoading && (
            <div aria-busy="true" aria-live="polite">
              {[1, 2, 3].map(i => (
                <div key={i} className="sp-skeleton-row">
                  <div className="sp-skeleton-pulse" style={{ width: 16, height: 16 }} />
                  <div className="sp-skeleton-pulse" style={{ width: 60, height: 12 }} />
                  <div className="sp-skeleton-pulse" style={{ flex: 1, height: 12 }} />
                  <div className="sp-skeleton-pulse" style={{ width: 60, height: 18 }} />
                </div>
              ))}
            </div>
          )}

          {!isLoading && children.length === 0 && !creating && !canCreate && (
            <div className="sp-empty">
              <div className="sp-empty-sub">This work item cannot have children.</div>
            </div>
          )}

          {/* ═══ Inline create from empty state ═══
              InlineCreateWithAI lives inside the visibleRows>0 IIFE when rows
              already exist. When the list is empty, that IIFE never runs, so we
              render a standalone copy here — triggered by the header + button or
              the "+ Create sub-task" CTA in the empty state. */}
          {creating && canCreate && children.length === 0 && (
            <AiSuggestChildrenPanel
              parentSummary={parentSummary ?? ''}
              parentType={parentIssueType ?? ''}
              allowedChildTypes={allowedTypes}
              siblingSummaries={siblingSummaries}
              defaultDraftType={defaultDraftType}
              isCreatingAny={createMutation.isPending}
              onCreate={(s) => {
                setDraftType(s.type as typeof draftType);
                createMutation.mutate(s.title);
              }}
              onCreateAll={(list) => {
                list.forEach((s) => {
                  setDraftType(s.type as typeof draftType);
                  createMutation.mutate(s.title);
                });
              }}
              onEditRequest={(s) => setSubtaskModal({ title: s.title, type: s.type })}
              autoFetch={autoFetchAi}
            />
          )}
          {creating && canCreate && children.length === 0 && (
            <InlineCreateWithAI
              allowedTypes={allowedTypes}
              draftType={draftType}
              onDraftTypeChange={(t) => setDraftType(t as typeof draftType)}
              typeSelectorSlot={
                <TypeSelector value={draftType} onChange={(v) => setDraftType(v as typeof draftType)} allowed={allowedTypes} />
              }
              parentSummary={parentSummary ?? ''}
              parentType={parentIssueType ?? ''}
              siblingSummaries={siblingSummaries}
              excludedIds={siblingIds}
              projectKey={projectKey}
              isSubmitting={createMutation.isPending || linkExistingMutation.isPending}
              onCreate={(summary) => createMutation.mutate(summary)}
              onLinkExisting={(id) => {
                linkExistingMutation.mutate(id);
                setCreating(false);
              }}
              onCancel={() => setCreating(false)}
              placeholder={`Name this ${(effectiveTitle.toLowerCase().endsWith('s')
                ? effectiveTitle.toLowerCase().slice(0, -1)
                : effectiveTitle.toLowerCase())}`}
              inputRef={inlineCreateInputRef}
              disableSuggestions={isSubtaskContext}
            />
          )}

          {/* ═══ Empty state (all subtasks hidden by filter) ═══ */}
          {!isLoading && children.length > 0 && visibleRows.length === 0 && hideDone && (
            <div className="sp-empty">
              <div className="sp-empty-heading">All subtasks are done</div>
              <div className="sp-empty-sub">Turn off "Hide done" to see them.</div>
              <button type="button" className="sp-empty-cta" onClick={() => setHideDone(false)}>Show completed</button>
            </div>
          )}

          {/* ═══ Status progress bar — Jira parity (Vikram 2026-07-02) ═══
              Reuses the canonical WorkItemsProgressBar extracted from
              the release detail Work items section, so the visual is
              identical to what shows on /release-hub/releases-management. */}
          {!isLoading && children.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <WorkItemsProgressBar
                items={children.map(c => ({ status_category: (c as any).status_category ?? null }))}
                label={effectiveTitle}
                compact
              />
            </div>
          )}

          {/* ═══ List view — canonical JiraTable (Jira parity: list-only) ═══ */}
          {!isLoading && visibleRows.length > 0 && (() => {
            // Jira-parity 4-column schema: Work | Priority | Assignee | Status.
            // Work col combines type-icon + issue-key + summary into one clickable cell.
            // Priority and Assignee are icon-only (40px). SprintReleases/Type/Key removed.
            const schema: Column<typeof visibleRows[number]>[] = [];

            if (columns.work) {
              schema.push({
                id: 'work', label: 'Work', width: 30, sortable: false, alwaysVisible: true, lockedPosition: true,
                // 2026-06-23 — Jira parity: Work column packs Type + Key + Summary
                // into one cell. Header three-dot menu renders "Sort by columns"
                // with nested submenus per sub-field. JiraTable picks these up
                // because col.lockedPosition && col.subSorts is set.
                subSorts: [
                  { id: 'type', label: 'Type', kind: 'alpha' },
                  { id: 'key', label: 'Key', kind: 'numeric' },
                  { id: 'summary', label: 'Summary', kind: 'alpha' },
                ],
                accessor: (r: any) => r.summary,
                cell: ({ row }) => {
                  const child = row as any;
                  const isEditing = editingId === child.id;
                  const openRow = () => {
                    if (bulkEditMode) { toggleSelected(child.id); return; }
                    onSubtaskClick?.(child.issue_key ?? child.id);
                    setFocusedRowId(child.id);
                  };
                  // 2026-06-23 — Empty-space click on the Work cell triggers
                  // summary edit (Jira parity). Inner buttons (key, summary,
                  // edit pencil) keep their explicit handlers — closest('button')
                  // check skips the wrap handler when click landed on them.
                  const handleWrapClick = (e: React.MouseEvent<HTMLSpanElement>) => {
                    if (bulkEditMode || isEditing) return;
                    const target = e.target as HTMLElement;
                    if (target.closest('button')) return;
                    setEditingId(child.id);
                  };
                  return (
                    <span
                      className="sp-summary-wrap"
                      onClick={handleWrapClick}
                      style={{ cursor: bulkEditMode || isEditing ? 'default' : 'text' }}
                    >
                      <WorkCellPrefix
                        issueType={child.issue_type}
                        issueKey={child.issue_key}
                        onClick={isEditing ? undefined : openRow}
                      />
                      {isEditing ? (
                        <InlineSummaryEditor
                          value={child.summary}
                          onSave={handleSummarySave(child)}
                          onCancel={() => setEditingId(null)}
                        />
                      ) : (
                        <>
                          <WorkCellSummary summary={child.summary} onClick={openRow} />
                          {!bulkEditMode && (
                            <SummaryEditButton onClick={() => setEditingId(child.id)} />
                          )}
                        </>
                      )}
                    </span>
                  );
                },
              });
            }
            if (columns.priority) {
              schema.push({
                id: 'priority', label: 'Priority', width: 10, sortable: true,
                accessor: (r: any) => {
                  const p = (r.priority ?? 'medium').toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
                  return ({ critical: 1, high: 2, medium: 3, low: 4 } as const)[p] ?? 3;
                },
                cell: ({ row }) => {
                  const child = row as any;
                  return (
                    <EditablePriority
                      issueId={child.id}
                      currentPriority={child.priority ?? 'Medium'}
                      hideClear
                      onUpdate={() => { /* invalidation handled by onChange path below */ }}
                      onChange={(value) => {
                        if (bulkEditMode) return;
                        if (!value) return;
                        if (value.toLowerCase() === (child.priority ?? '').toLowerCase()) return;
                        update.mutate({ id: child.id, patch: { priority: value } });
                      }}
                    />
                  );
                },
              });
            }
            if (columns.assignee) {
              schema.push({
                id: 'assignee', label: 'Assignee', width: 16, sortable: true,
                accessor: (r: any) => r.assignee_display_name ?? '￿',
                cell: ({ row }) => {
                  const child = row as any;
                  // Bulk mode: read-only avatar (no picker). Otherwise: canonical
                  // EditableAssignee — same searchable popover the right-rail uses
                  // so both surfaces share keyboard semantics + project-member list.
                  if (bulkEditMode) {
                    return (
                      <AssigneeCell
                        displayName={child.assignee_display_name}
                        accountId={child.assignee_account_id}
                        avatarUrl={child.assignee_account_id ? avatarMap[child.assignee_account_id] : null}
                        readOnly
                      />
                    );
                  }
                  return (
                    <EditableAssignee
                      issueId={child.id}
                      issueKey={child.issue_key}
                      projectId={parentProjectId ?? ''}
                      currentAssigneeId={child.assignee_account_id}
                      currentAssigneeName={child.assignee_display_name}
                      currentStatus={child.status}
                      onUpdate={() => { /* invalidation flows via mutation */ }}
                      onChange={(userId, displayName) => {
                        handleAssigneeChange(child)({ accountId: userId, displayName });
                      }}
                    />
                  );
                },
              });
            }
            if (columns.status) {
              schema.push({
                id: 'status', label: 'Status', width: 14, sortable: true,
                accessor: (r: any) => {
                  const cat = (r.status_category ?? '').toLowerCase();
                  if (cat === 'done') return 2;
                  if (cat.includes('progress')) return 1;
                  return 0;
                },
                cell: ({ row }) => {
                  const child = row as any;
                  return (
                    <StatusCell
                      status={child.status}
                      statusCategory={child.status_category}
                      issueType={child.issue_type}
                      onChange={handleStatusChange(child)}
                      readOnly={bulkEditMode}
                    />
                  );
                },
              });
            }
            // Jira parity (2026-06-22): no trailing row-actions column. Jira's
            // child issues table has no per-row ··· — open detail view to edit.

            // The 3-state sort cycle (asc → desc → off) the DynamicTable era
            // implemented via the local handleColumnHeaderSort lives natively
            // in JiraTable — onSortChange fires with key='' to mean cleared.
            const onSortChangeAdapter = (key: string, order: 'ASC' | 'DESC') => {
              if (!key) { setSort({ field: null, dir: 'asc' }); return; }
              setSort({ field: key as SortField, dir: order === 'DESC' ? 'desc' : 'asc' });
            };

            return (
              <div className="sp-ak-table" onClick={(e) => e.stopPropagation()}>
                {/* sp-table-body: shared border/radius container for table rows
                    + inline create row so the "+ Create" row appears visually
                    inside the same bordered card as the data rows (Jira parity). */}
                <div className="sp-table-body">
                  <JiraTable<typeof visibleRows[number]>
                    columns={schema}
                    data={visibleRows}
                    getRowId={(r: any) => r.id}
                    ariaLabel="Subtasks"
                    selectable={bulkEditMode}
                    selection={selectedIds}
                    onSelectionChange={(next) => {
                      // Replace the selection set wholesale when JiraTable
                      // commits a checkbox toggle (single, shift-range, or
                      // header select-all). The page's existing toggleSelected
                      // / toggleSelectAll keyboard paths still drive the same
                      // setSelectedIds setter so behaviour stays consistent.
                      setSelectedIds(new Set(next));
                    }}
                    sortKey={sort.field ?? undefined}
                    sortOrder={sort.dir === 'desc' ? 'DESC' : 'ASC'}
                    onSortChange={onSortChangeAdapter}
                    focusedRowId={focusedRowId ?? undefined}
                    onFocusedRowChange={(id) => setFocusedRowId(id)}
                    // 2026-06-23 — Row-wide click no longer navigates to the
                    // detail. Only the Summary text + Key in the Work cell
                    // call onSubtaskClick. Other cells (priority, status,
                    // assignee editors) keep their own click semantics.
                    // Bulk mode still toggles selection on row click.
                    onRowClick={bulkEditMode ? (r: any) => toggleSelected(r.id) : undefined}
                    enableColumnReorder
                    rowsPerPage={0}
                    emptyView={null}
                    // 2026-05-17: Feature flags declare intent — SubtasksPanel
                    // has inline create (via InlineCreateWithAI below), no group
                    // create affordances or sticky footer.
                    enableGroupCreateButton={false}
                    enableStickyCreateFooter={false}
                  />
                  {creating && canCreate && (
                    <InlineCreateWithAI
                      allowedTypes={allowedTypes}
                      draftType={draftType}
                      onDraftTypeChange={(t) => setDraftType(t as typeof draftType)}
                      typeSelectorSlot={
                        <TypeSelector value={draftType} onChange={(v) => setDraftType(v as typeof draftType)} allowed={allowedTypes} />
                      }
                      parentSummary={parentSummary ?? ''}
                      parentType={parentIssueType ?? ''}
                      siblingSummaries={siblingSummaries}
                      excludedIds={siblingIds}
                      projectKey={projectKey}
                      isSubmitting={createMutation.isPending || linkExistingMutation.isPending}
                      onCreate={(summary) => createMutation.mutate(summary)}
                      onLinkExisting={(id) => {
                        linkExistingMutation.mutate(id);
                        setCreating(false);
                      }}
                      onCancel={() => setCreating(false)}
                      disableSuggestions={isSubtaskContext}
                    />
                  )}
                </div>
              </div>
            );
            // NOTE: DnD row-reorder via handleRankEnd is not wired here. The
            // canonical does not yet expose row drag-reorder; this surface
            // accepts the regression until the canonical adds it (one prop
            // away). `dndEnabled` and `handleRankEnd` are retained above for
            // a one-line re-enable when the feature lands.
          })()}

          {/* ═══ Bulk edit bar ═══ */}
          {bulkEditMode && (
            <BulkEditBar
              selectedCount={selectedIds.size}
              totalCount={visibleRows.length}
              onStatusChange={handleBulkStatus}
              onPriorityChange={handleBulkPriority}
              onAssigneeChange={handleBulkAssignee}
              onDelete={handleBulkDelete}
              onCancel={exitBulkEdit}
            />
          )}

          {/* ═══ Destructive confirm (single row) — Phase F.b ═══
              Atlaskit ModalDialog replaces shadcn AlertDialog. Matches
              StoryDetailModal Phase H pattern: width="small", danger header,
              subtle Cancel + danger Delete. Escape + overlay click inherited. */}
          <ModalTransition>
            {pendingDelete !== null && (
              <Modal
                onClose={() => setPendingDelete(null)}
                width="small"
              >
                <ModalHeader>
                  <ModalTitle appearance="danger">
                    Delete {effectiveTitle.toLowerCase().replace(/s$/, '')}
                  </ModalTitle>
                </ModalHeader>
                <ModalBody>
                  Delete <strong>{pendingDelete?.issue_key}</strong> — {pendingDelete?.summary}? This cannot be undone.
                </ModalBody>
                <ModalFooter>
                  <Button appearance="subtle" onClick={() => setPendingDelete(null)}>
                    Cancel
                  </Button>
                  <Button appearance="danger" onClick={confirmDelete}>
                    Delete
                  </Button>
                </ModalFooter>
              </Modal>
            )}
          </ModalTransition>

          {/* ═══ Destructive confirm (bulk) — Phase F.b ═══ */}
          <ModalTransition>
            {pendingBulkDelete && (
              <Modal
                onClose={() => setPendingBulkDelete(false)}
                width="small"
              >
                <ModalHeader>
                  <ModalTitle appearance="danger">
                    Delete {selectedIds.size} item{selectedIds.size === 1 ? '' : 's'}
                  </ModalTitle>
                </ModalHeader>
                <ModalBody>
                  Delete {selectedIds.size} selected {effectiveTitle.toLowerCase()}? This cannot be undone.
                </ModalBody>
                <ModalFooter>
                  <Button appearance="subtle" onClick={() => setPendingBulkDelete(false)}>
                    Cancel
                  </Button>
                  <Button appearance="danger" onClick={confirmBulkDelete}>
                    Delete
                  </Button>
                </ModalFooter>
              </Modal>
            )}
          </ModalTransition>

          {/* InlineCreateWithAI moved inside sp-table-body (inside the IIFE above)
              so it appears as the last row within the table's visual border — Jira parity. */}
        </>
      )}
      </div>

      {/* Canonical CreateStoryModal — opened by the AI-suggest Edit
          action. Prefills the AI's title + work type + parent (current
          issue). Extended WORK_TYPES / PARENT_TYPE_RULES include the
          subtask family (2026-07-02). */}
      <CreateStoryModal
        open={!!subtaskModal}
        onClose={() => setSubtaskModal(null)}
        projectId={parentProjectId ?? ''}
        projectKey={projectKey}
        defaultWorkType={subtaskModal?.type ?? 'Sub-task'}
        initialSummary={subtaskModal?.title}
        initialParentKey={storyKey}
        onSuccess={() => {
          setSubtaskModal(null);
          queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
        }}
      />
    </div>
  );
}

export type { SubtasksPanelProps };
