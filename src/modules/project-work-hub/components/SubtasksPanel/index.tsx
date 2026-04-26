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
 *   • ⊞ → toggle list ↔ board (kanban by status category)
 *   • + → inline create row with type selector
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronRight, Plus, LayoutGrid,
  Check,
} from 'lucide-react';
import { nextPos, resolveStatusCategory } from '../dialogs/story-detail-modules/helpers';
import { CANONICAL_WORK_ITEM_OPTIONS } from '@/components/shared/canonicalWorkItemOptions';
import { PriorityCell } from './cells/PriorityCell';
import { AssigneeCell } from './cells/AssigneeCell';
import { StatusCell } from './cells/StatusCell';
import { RowActionsMenu } from './RowActionsMenu';
import { HeaderOverflowMenu } from './HeaderOverflowMenu';
import { ViewToggle, type SubtaskView } from './ViewToggle';
import { BoardView } from './BoardView';
import { BulkEditBar } from './BulkEditBar';
import { useSubtaskMutations, type SubtaskRow } from './hooks/useSubtaskMutations';
import { sortRows, cycleSort, type SortField, type SortState } from './sort';
import { computeNewPosition, rebalancePositions } from './reorder';
import { IssueTypeCell } from './cells/IssueTypeCell';
import { useAtlaskitThemeSync } from './atlaskitTheme';
import { allowedChildTypes, panelTitleFor } from './hierarchy';
import { InlineCreateWithAI } from './InlineCreateWithAI';
import { DescriptionPopover } from './DescriptionPopover';
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
import { createChildIssue } from '../../lib/workItemRepo';
import './SubtasksPanel.css';

type VisibleColumn = 'type' | 'key' | 'summary' | 'priority' | 'assignee' | 'status' | 'fixVersions';

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
        <ChevronDown size={12} color="#6B778C" />
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
              {opt.key === value && <Check size={12} color="#0052CC" style={{ marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Column picker ──────────────────────────────────────
const ALL_COLUMNS: { key: VisibleColumn; label: string }[] = [
  { key: 'type', label: 'Issue Type' },
  { key: 'key', label: 'Key' },
  { key: 'summary', label: 'Summary' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'fixVersions', label: 'Fix versions' },
  { key: 'priority', label: 'Priority' },
];

function ColumnPicker({ columns, onChange }: {
  columns: Record<VisibleColumn, boolean>;
  onChange: (cols: Record<VisibleColumn, boolean>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (key: VisibleColumn) => onChange({ ...columns, [key]: !columns[key] });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="sp-icon-btn" onClick={() => setOpen(o => !o)} title="Configure columns">
        <LayoutGrid size={16} />
      </button>
      {open && (
        <div className="sp-colpicker-dropdown">
          <div className="sp-colpicker-title">Visible columns</div>
          {ALL_COLUMNS.map(col => (
            <div key={col.key} className="sp-colpicker-item" onClick={() => toggle(col.key)}>
              <div className={`sp-colpicker-check ${columns[col.key] ? 'sp-colpicker-check--active' : ''}`}>
                {columns[col.key] && <Check size={10} color="#fff" strokeWidth={3} />}
              </div>
              <span>{col.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fix versions cell ──────────────────────────────────
function fixVersionNames(raw: unknown): string[] {
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

function FixVersionsCell({ value }: { value: unknown }) {
  const names = fixVersionNames(value);
  if (names.length === 0) return <span className="sp-fixv-empty">—</span>;
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

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else onCancel();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="sp-inline-summary-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
      }}
      onClick={(e) => e.stopPropagation()}
      maxLength={255}
    />
  );
}

// ─── Main component ─────────────────────────────────────
export function SubtasksPanel({
  storyKey, storyId, projectKey, onSubtaskClick, parentIssueType, parentSummary, title,
  parentSource = 'jira', parentProjectId = null,
}: SubtasksPanelProps) {
  useAtlaskitThemeSync();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // ─── Hierarchy-driven config ─────────────────────────
  const allowedTypes = useMemo(() => allowedChildTypes(parentIssueType), [parentIssueType]);
  const canCreate = allowedTypes.length > 0;
  const effectiveTitle = title ?? panelTitleFor(parentIssueType);
  const defaultDraftType = allowedTypes[0] ?? 'Sub-task';

  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<SubtaskView>('list');
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

  // Defaults match Jira's column picker screenshot (7 columns on by default).
  const [columns, setColumns] = useState<Record<VisibleColumn, boolean>>({
    type: true,
    key: true,
    summary: true,
    assignee: true,
    status: true,
    fixVersions: true,
    priority: true,
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
      const [phRes, catRes] = await Promise.all([
        supabase
          .from('ph_issues')
          .select('id,issue_key,summary,status,status_category,issue_type,assignee_display_name,assignee_account_id,priority,position,deleted_at,fix_versions,jira_created_at')
          .eq('parent_key', storyKey)
          .is('deleted_at', null)
          .order('position', { ascending: true }),
        supabase
          .from('catalyst_issues')
          .select('id,issue_key,title,status,status_category,issue_type,assignee_id,priority,fix_versions,created_at,parent_key,deleted_at')
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
          fix_versions: r.fix_versions ?? null,
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
      await createChildIssue({
        parent: { source: parentSource, id: '', issueKey: storyKey, projectKey },
        summary: parsed.data.summary,
        issueType: parsed.data.issue_type,
        projectKey: parsed.data.project_key,
        projectId: parentProjectId,
        reporterId: user?.id ?? null,
        priority: parsed.data.priority,
        position: nextPos(children),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
    },
    onError: (err) => toast.error('Failed to create subtask', { description: (err as Error).message }),
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
      toast.success('Linked to existing work item');
    },
    onError: (err) => toast.error('Failed to link work item', { description: (err as Error).message }),
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
  const dndEnabled = !sort.field && !hideDone && !bulkEditMode && view === 'list';

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
      onSubtaskClick?.(focusedRowId);
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
    <div
      className="sp-panel"
      tabIndex={-1}
      ref={tableContainerRef}
      onKeyDown={handlePanelKeyDown}
    >
      {/* ═══ Header ═══ */}
      <div className="sp-header">
        <div className="sp-header-left">
          <button
            type="button"
            className="sp-collapse-btn"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="sp-title">{effectiveTitle}</span>
          {totalCount > 0 && (
            <span className="sp-title-count">{doneCount}/{totalCount}</span>
          )}
        </div>
        {expanded && (
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
            <ColumnPicker columns={columns} onChange={setColumns} />
            <ViewToggle view={view} onChange={setView} />
            {canCreate && (
              <button
                type="button"
                className="sp-icon-btn sp-icon-btn--add"
                title={`Create ${defaultDraftType.toLowerCase()}`}
                aria-label={`Create ${defaultDraftType.toLowerCase()}`}
                onClick={() => setCreating(true)}
              >
                <Plus size={16} />
              </button>
            )}
          </div>
        )}
      </div>

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

          {/* ═══ Empty state (no subtasks at all) ═══ */}
          {!isLoading && children.length === 0 && !creating && (
            <div className="sp-empty">
              <div className="sp-empty-heading">No {effectiveTitle.toLowerCase()} yet</div>
              <div className="sp-empty-sub">
                {canCreate
                  ? 'Break this item down to track progress.'
                  : 'This work item cannot have children.'}
              </div>
              {canCreate && (
                <button type="button" className="sp-empty-cta" onClick={() => setCreating(true)}>
                  + Create {defaultDraftType.toLowerCase()}
                </button>
              )}
            </div>
          )}

          {/* ═══ Empty state (all subtasks hidden by filter) ═══ */}
          {!isLoading && children.length > 0 && visibleRows.length === 0 && hideDone && (
            <div className="sp-empty">
              <div className="sp-empty-heading">All subtasks are done</div>
              <div className="sp-empty-sub">Turn off "Hide done" to see them.</div>
              <button type="button" className="sp-empty-cta" onClick={() => setHideDone(false)}>Show completed</button>
            </div>
          )}

          {/* ═══ Board view ═══ */}
          {!isLoading && visibleRows.length > 0 && view === 'board' && (
            <BoardView
              subtasks={visibleRows}
              avatarMap={avatarMap}
              onCardClick={(id) => onSubtaskClick?.(id)}
            />
          )}

          {/* ═══ List view — canonical JiraTable ═══ */}
          {!isLoading && visibleRows.length > 0 && view === 'list' && (() => {
            // Build column schema once per render. `columns` (from props) is
            // the visibility config; we filter the schema by it instead of
            // emitting ternaries inside cells like the DynamicTable era did.
            // Existing cell components (IssueTypeCell, AssigneeCell, StatusCell,
            // FixVersionsCell, PriorityCell) are reused as-is — JiraTable
            // doesn't care about the inner JSX, only the column schema.
            const schema: Column<typeof visibleRows[number]>[] = [];

            if (columns.type) {
              schema.push({
                id: 'type', label: 'Type', width: 5, sortable: false,
                cell: ({ row }) => <IssueTypeCell issueType={(row as any).issue_type} />,
              });
            }
            if (columns.key) {
              schema.push({
                id: 'key', label: 'Key', width: 9, sortable: true,
                accessor: (r: any) => r.issue_key,
                cell: ({ row }) => (
                  <a
                    className="sp-issue-key"
                    data-jira-table-row-open
                    onClick={(e) => { e.stopPropagation(); onSubtaskClick?.((row as any).id); }}
                  >
                    {(row as any).issue_key}
                  </a>
                ),
              });
            }
            if (columns.summary) {
              schema.push({
                id: 'summary', label: 'Summary', width: 30, sortable: false, alwaysVisible: true,
                accessor: (r: any) => r.summary,
                cell: ({ row }) => {
                  const child = row as any;
                  return editingId === child.id ? (
                    <InlineSummaryEditor
                      value={child.summary}
                      onSave={handleSummarySave(child)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <span className="sp-summary-wrap">
                      <span
                        className="sp-issue-summary"
                        onClick={(e) => {
                          if (bulkEditMode) { toggleSelected(child.id); e.stopPropagation(); return; }
                          onSubtaskClick?.(child.id);
                          setFocusedRowId(child.id);
                        }}
                      >
                        {child.summary}
                      </span>
                      {!bulkEditMode && (
                        <DescriptionPopover
                          subtaskId={child.id}
                          subtaskKey={child.issue_key}
                          parentKey={storyKey}
                        />
                      )}
                    </span>
                  );
                },
              });
            }
            if (columns.assignee) {
              schema.push({
                id: 'assignee', label: 'Assignee', width: 14, sortable: true,
                accessor: (r: any) => r.assignee_display_name ?? '\uFFFF', // unassigned sorts last
                cell: ({ row }) => {
                  const child = row as any;
                  return (
                    <AssigneeCell
                      displayName={child.assignee_display_name}
                      accountId={child.assignee_account_id}
                      avatarUrl={child.assignee_account_id ? avatarMap[child.assignee_account_id] : null}
                      onChange={handleAssigneeChange(child)}
                      readOnly={bulkEditMode}
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
                      onChange={handleStatusChange(child)}
                      readOnly={bulkEditMode}
                    />
                  );
                },
              });
            }
            if (columns.fixVersions) {
              schema.push({
                id: 'fixVersions', label: 'Fix versions', width: 12, sortable: false,
                cell: ({ row }) => <FixVersionsCell value={(row as any).fix_versions} />,
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
                    <PriorityCell
                      priority={child.priority}
                      onChange={handlePriorityChange(child)}
                      readOnly={bulkEditMode}
                    />
                  );
                },
              });
            }
            // Trailing actions column — shown when not in bulk edit mode. The
            // RowActionsMenu was the per-row ⋯ trigger in the DynamicTable
            // era. We surface the same actions via JiraTable's right-click
            // contextMenuActions below; this trailing column keeps the click
            // affordance for users who don't right-click.
            if (!bulkEditMode) {
              schema.push({
                id: 'actions', label: '', width: 4, sortable: false,
                cell: ({ row }) => {
                  const child = row as any;
                  return (
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActionsMenu
                        onOpen={() => onSubtaskClick?.(child.id)}
                        onRename={() => setEditingId(child.id)}
                        onDelete={() => handleDelete(child)}
                      />
                    </div>
                  );
                },
              });
            }

            // The 3-state sort cycle (asc → desc → off) the DynamicTable era
            // implemented via the local handleColumnHeaderSort lives natively
            // in JiraTable — onSortChange fires with key='' to mean cleared.
            const onSortChangeAdapter = (key: string, order: 'ASC' | 'DESC') => {
              if (!key) { setSort({ field: null, dir: 'asc' }); return; }
              setSort({ field: key as SortField, dir: order === 'DESC' ? 'desc' : 'asc' });
            };

            return (
              <div className="sp-ak-table" onClick={(e) => e.stopPropagation()}>
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
                  onRowClick={(r: any) => {
                    if (bulkEditMode) { toggleSelected(r.id); return; }
                    onSubtaskClick?.(r.id);
                  }}
                  enableColumnReorder
                  rowsPerPage={0}
                  emptyView={null}
                />
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

          {/* ═══ Inline create (AI-augmented) ═══ */}
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
            />
          )}
        </>
      )}
    </div>
  );
}

export type { SubtasksPanelProps };
