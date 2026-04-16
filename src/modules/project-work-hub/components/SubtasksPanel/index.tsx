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
  Check, Loader2, CornerDownLeft,
} from 'lucide-react';
import { nextPos, resolveStatusCategory } from '../dialogs/story-detail-modules/helpers';
import { CANONICAL_WORK_ITEM_OPTIONS } from '@/components/shared/canonicalWorkItemOptions';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { WorkCell } from './cells/WorkCell';
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
import { computeNewPosition } from './reorder';
import { SortableRow } from './SortableRow';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import './SubtasksPanel.css';

type VisibleColumn = 'priority' | 'assignee' | 'status' | 'fixVersions';

interface SubtasksPanelProps {
  storyKey: string;
  storyId: string;
  projectKey: string;
  onSubtaskClick?: (subtaskId: string) => void;
  /** Section title — defaults to "Subtasks". Epic/Feature parents pass "Child work items". */
  title?: string;
}

// ─── Type selector for inline create ────────────────────
const TYPE_OPTIONS = CANONICAL_WORK_ITEM_OPTIONS;

function TypeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = TYPE_OPTIONS.find(t => t.key === value) ?? TYPE_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button type="button" onClick={() => setOpen(o => !o)} className="sp-type-selector-btn">
        <span style={{ display: 'flex', width: 16, height: 16 }}>{current.icon}</span>
        <span>{current.label}</span>
        <ChevronDown size={12} color="#6B778C" />
      </button>
      {open && (
        <div className="sp-type-selector-dropdown">
          {TYPE_OPTIONS.map(opt => (
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
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'fixVersions', label: 'Fix versions' },
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
  storyKey, storyId, projectKey, onSubtaskClick, title = 'Subtasks',
}: SubtasksPanelProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<SubtaskView>('list');
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState('Sub-task');
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

  const [columns, setColumns] = useState<Record<VisibleColumn, boolean>>({
    priority: true,
    assignee: true,
    status: true,
    fixVersions: false,
  });
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const createRef = useRef<HTMLInputElement>(null);

  // DnD sensors — require 6px drag before engaging so clicks still work.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const { update, remove, bulkUpdate, bulkRemove } = useSubtaskMutations(storyKey);

  // ─── Data query ───────────────────────────────
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_display_name,assignee_account_id,priority,position,deleted_at,fix_versions,jira_created_at')
        .eq('parent_key', storyKey)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubtaskRow[];
    },
    enabled: !!storyKey,
  });

  // ─── Resolve avatar URLs from jira_identity_map ───
  const assigneeAccountIds = useMemo(
    () => [...new Set(children.map(c => c.assignee_account_id).filter(Boolean))] as string[],
    [children]
  );

  const { data: avatarMap = {} } = useQuery({
    queryKey: ['subtask-avatars', assigneeAccountIds],
    queryFn: async () => {
      if (assigneeAccountIds.length === 0) return {};
      const { data, error } = await supabase
        .from('jira_identity_map')
        .select('jira_account_id,avatar_url')
        .in('jira_account_id', assigneeAccountIds);
      if (error) throw error;
      const map: Record<string, string | null> = {};
      (data ?? []).forEach(row => {
        if (row.jira_account_id) map[row.jira_account_id] = row.avatar_url;
      });
      return map;
    },
    enabled: assigneeAccountIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // ─── Progress calc ────────────────────────────
  const doneRows = useMemo(
    () => children.filter(c => (c.status_category ?? '').toLowerCase() === 'done'),
    [children]
  );
  const doneCount = doneRows.length;
  const totalCount = children.length;
  const percentage = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

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
      const tempKey = `${projectKey}-NEW-${Date.now()}`;
      const { error } = await supabase.from('ph_issues').insert({
        issue_key: tempKey,
        summary: summary.trim(),
        issue_type: draftType,
        parent_key: storyKey,
        project_key: projectKey,
        status: 'To Do',
        status_category: 'todo',
        priority: 'Medium',
        position: nextPos(children),
        reporter_account_id: user?.id,
        source: 'catalyst',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childIssues', storyKey] });
      setDraftSummary('');
      setTimeout(() => createRef.current?.focus(), 50);
    },
    onError: (err) => toast.error('Failed to create subtask', { description: (err as Error).message }),
  });

  useEffect(() => {
    if (creating) setTimeout(() => createRef.current?.focus(), 50);
  }, [creating]);

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
    if (!window.confirm(`Delete subtask "${row.summary}"?`)) return;
    remove.mutate(row.id);
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
    const n = selectedIds.size;
    if (!window.confirm(`Delete ${n} subtask${n === 1 ? '' : 's'}? This cannot be undone.`)) return;
    bulkRemove.mutate(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleViewInSearch = () => {
    const pk = projectKey || storyKey.split('-')[0];
    if (!pk) return;
    window.location.href = `/project-hub/${pk}/hierarchy/allwork?parent=${encodeURIComponent(storyKey)}`;
  };

  // ─── DnD reorder ────────────────────────────────
  // Jira-parity: DnD disabled while a sort is active OR hide-done is on.
  const dndEnabled = !sort.field && !hideDone && !bulkEditMode && view === 'list';

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = visibleRows.findIndex(r => r.id === active.id);
    const toIndex = visibleRows.findIndex(r => r.id === over.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const newPos = computeNewPosition(
      visibleRows.map(r => ({ id: r.id, position: r.position ?? 0 })),
      String(active.id),
      toIndex,
    );
    if (newPos == null) return;
    update.mutate({ id: String(active.id), patch: { position: newPos } });
  };

  // ─── Keyboard navigation ─────────────────────────
  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    // ⇧C → create subtask (Jira parity)
    if (e.shiftKey && (e.key === 'C' || e.key === 'c')
        && !creating && !editingId
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
    } else if (e.key === 'Enter' && focusedRowId && !editingId) {
      e.preventDefault();
      onSubtaskClick?.(focusedRowId);
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
          <span className="sp-title">{title}</span>
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
            <button
              type="button"
              className="sp-icon-btn sp-icon-btn--add"
              title="Create subtask"
              aria-label="Create subtask"
              onClick={() => setCreating(true)}
            >
              <Plus size={16} />
            </button>
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
            <div>
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
              <div className="sp-empty-heading">No subtasks yet</div>
              <div className="sp-empty-sub">Break this item into subtasks to track progress</div>
              <button type="button" className="sp-empty-cta" onClick={() => setCreating(true)}>+ Create subtask</button>
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

          {/* ═══ List (native HTML table) view ═══ */}
          {!isLoading && visibleRows.length > 0 && view === 'list' && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={visibleRows.map(r => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="sp-scroll-container">
                  <table className="sp-table">
                    <thead className="sp-thead">
                      <tr>
                        <th className="sp-th sp-th--drag" aria-label="Reorder" />
                        {bulkEditMode && (
                          <th className="sp-th sp-th--select">
                            <label className="sp-checkbox" aria-label="Select all">
                              <input
                                type="checkbox"
                                checked={allVisibleSelected}
                                ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                                onChange={toggleSelectAll}
                              />
                              <span className="sp-checkbox-box">
                                {allVisibleSelected && <Check size={10} color="#fff" strokeWidth={3} />}
                                {!allVisibleSelected && someVisibleSelected && <span className="sp-checkbox-dash" />}
                              </span>
                            </label>
                          </th>
                        )}
                        <th className="sp-th" style={{ width: 'auto' }}>Work</th>
                        {columns.priority && <th className="sp-th sp-th--priority">Priority</th>}
                        {columns.assignee && <th className="sp-th sp-th--assignee">Assignee</th>}
                        {columns.status && <th className="sp-th sp-th--status">Status</th>}
                        {columns.fixVersions && <th className="sp-th sp-th--fixv">Fix versions</th>}
                        <th className="sp-th sp-th--actions" aria-label="Row actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map(child => {
                        const checked = selectedIds.has(child.id);
                        const focused = focusedRowId === child.id;
                        return (
                          <SortableRow
                            key={child.id}
                            id={child.id}
                            disabled={!dndEnabled}
                            selected={checked}
                            className={[
                              'sp-row',
                              checked ? 'sp-row--selected' : '',
                              focused ? 'sp-row--focused' : '',
                            ].join(' ')}
                            onRowClick={() => {
                              if (bulkEditMode) toggleSelected(child.id);
                              else onSubtaskClick?.(child.id);
                              setFocusedRowId(child.id);
                            }}
                          >
                        {bulkEditMode && (
                          <td className="sp-td sp-td--select" onClick={(e) => e.stopPropagation()}>
                            <label className="sp-checkbox" aria-label={`Select ${child.issue_key}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleSelected(child.id)}
                              />
                              <span className="sp-checkbox-box">
                                {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                              </span>
                            </label>
                          </td>
                        )}
                        <td className="sp-td">
                          {editingId === child.id ? (
                            <div className="sp-work-cell" onClick={(e) => e.stopPropagation()}>
                              <span className="sp-type-icon">
                                <JiraIssueTypeIcon type={child.issue_type} size={16} />
                              </span>
                              <span className="sp-issue-key">{child.issue_key}</span>
                              <InlineSummaryEditor
                                value={child.summary}
                                onSave={handleSummarySave(child)}
                                onCancel={() => setEditingId(null)}
                              />
                            </div>
                          ) : (
                            <WorkCell
                              issueType={child.issue_type}
                              issueKey={child.issue_key}
                              summary={child.summary}
                              onClick={() => onSubtaskClick?.(child.id)}
                            />
                          )}
                        </td>
                        {columns.priority && (
                          <td className="sp-td">
                            <PriorityCell
                              priority={child.priority}
                              onChange={handlePriorityChange(child)}
                              readOnly={bulkEditMode}
                            />
                          </td>
                        )}
                        {columns.assignee && (
                          <td className="sp-td">
                            <AssigneeCell
                              displayName={child.assignee_display_name}
                              accountId={child.assignee_account_id}
                              avatarUrl={child.assignee_account_id ? avatarMap[child.assignee_account_id] : null}
                              onChange={handleAssigneeChange(child)}
                              readOnly={bulkEditMode}
                            />
                          </td>
                        )}
                        {columns.status && (
                          <td className="sp-td">
                            <StatusCell
                              status={child.status}
                              statusCategory={child.status_category}
                              onChange={handleStatusChange(child)}
                              readOnly={bulkEditMode}
                            />
                          </td>
                        )}
                        {columns.fixVersions && (
                          <td className="sp-td">
                            <FixVersionsCell value={child.fix_versions} />
                          </td>
                        )}
                        <td className="sp-td sp-td--actions" onClick={(e) => e.stopPropagation()}>
                          {!bulkEditMode && (
                            <RowActionsMenu
                              onOpen={() => onSubtaskClick?.(child.id)}
                              onRename={() => setEditingId(child.id)}
                              onDelete={() => handleDelete(child)}
                            />
                          )}
                        </td>
                          </SortableRow>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </SortableContext>
            </DndContext>
          )}

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

          {/* ═══ Inline create ═══ */}
          {creating && (
            <>
              <div className="sp-create-row">
                <input
                  ref={createRef}
                  type="text"
                  className="sp-create-input"
                  placeholder="What needs to be done?"
                  value={draftSummary}
                  onChange={e => setDraftSummary(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && draftSummary.trim()) {
                      e.preventDefault();
                      createMutation.mutate(draftSummary);
                    }
                    if (e.key === 'Escape') {
                      setCreating(false);
                      setDraftSummary('');
                    }
                  }}
                  maxLength={255}
                />
                <div className="sp-create-actions">
                  <TypeSelector value={draftType} onChange={setDraftType} />
                  <button
                    type="button"
                    onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                    disabled={!draftSummary.trim() || createMutation.isPending}
                    title="Create (Enter)"
                    className="sp-create-submit"
                    style={{
                      cursor: draftSummary.trim() ? 'pointer' : 'not-allowed',
                      opacity: draftSummary.trim() ? 1 : 0.5,
                    }}
                  >
                    {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CornerDownLeft size={14} />}
                  </button>
                </div>
              </div>
              <div style={{ textAlign: 'right', padding: '6px 0 2px' }}>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setDraftSummary(''); }}
                  className="sp-create-cancel"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

export type { SubtasksPanelProps };
