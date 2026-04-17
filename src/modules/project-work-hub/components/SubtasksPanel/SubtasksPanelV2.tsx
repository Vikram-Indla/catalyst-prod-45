/**
 * SubtasksPanelV2 — DEPRECATED (Apr 2026). Pending removal.
 *
 * Original intent: a canonical Atlaskit/ADF molecular subtasks component
 * that would replace V1 once piloted on Epic.
 *
 * Status: the three strategic wins this scaffold carried — AlertDialog
 * (over window.confirm), role="grid" keyboard nav (Home/End/F2/Shift+Del),
 * and per-row DescriptionPopover — have been ported INTO V1 (`index.tsx`)
 * behind the existing `ENABLE_SUBTASKS_V2` flag. Porting was chosen over
 * replacement because V1 already carries DnD reorder, sort persistence,
 * bulk edit, AI create, link-existing, hierarchy enforcement, and the
 * Atlaskit DynamicTable — rebuilding all of that inside V2 would have
 * duplicated production code and created a regression surface.
 *
 * What the flag does now: it is the kill-switch for the NEW V1 behaviors
 * (per-row DescriptionPopover). Everything else in V1 is always-on.
 *
 * Retention: kept only while the smoke test at
 * __tests__/SubtasksPanelV2.smoke.test.tsx still references this file.
 * Safe to delete together with that test once V1 has an equivalent
 * integration test.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import {
  ChevronDown, ChevronRight, Plus, LayoutGrid,
  Check, Loader2, CornerDownLeft,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { DescriptionPopover } from './DescriptionPopover';
import { useSubtaskMutations, type SubtaskRow } from './hooks/useSubtaskMutations';
import './SubtasksPanel.css';
import './SubtasksPanelV2.css';

type VisibleColumn = 'priority' | 'assignee' | 'status';

interface SubtasksPanelV2Props {
  storyKey: string;
  storyId: string;
  projectKey: string;
  onSubtaskClick?: (subtaskId: string) => void;
  readOnly?: boolean;
}

const TYPE_OPTIONS = CANONICAL_WORK_ITEM_OPTIONS;

// ─── Inline type selector ───────────────────────────────
function TypeSelector({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
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
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="sp-type-selector-btn"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ display: 'flex', width: 16, height: 16 }}>{current.icon}</span>
        <span>{current.label}</span>
        <ChevronDown size={12} color="#6B778C" />
      </button>
      {open && (
        <div className="sp-type-selector-dropdown" role="listbox">
          {TYPE_OPTIONS.map(opt => (
            <div
              key={opt.key}
              role="option"
              aria-selected={opt.key === value}
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
      <button
        type="button"
        className="sp-icon-btn"
        onClick={() => setOpen(o => !o)}
        title="Configure columns"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <LayoutGrid size={16} />
      </button>
      {open && (
        <div className="sp-colpicker-dropdown" role="menu">
          <div className="sp-colpicker-title">Visible columns</div>
          {ALL_COLUMNS.map(col => (
            <div
              key={col.key}
              role="menuitemcheckbox"
              aria-checked={columns[col.key]}
              tabIndex={0}
              className="sp-colpicker-item"
              onClick={() => toggle(col.key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(col.key); }
              }}
            >
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
      aria-label="Subtask summary"
    />
  );
}

// ─── Main V2 component ──────────────────────────────────
export function SubtasksPanelV2({
  storyKey,
  storyId: _storyId,
  projectKey,
  onSubtaskClick,
  readOnly = false,
}: SubtasksPanelV2Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(true);
  const [view, setView] = useState<SubtaskView>('list');
  const [creating, setCreating] = useState(false);
  const [draftSummary, setDraftSummary] = useState('');
  const [draftType, setDraftType] = useState('Sub-task');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SubtaskRow | null>(null);
  const [pendingClearDone, setPendingClearDone] = useState(false);
  const [focusedRowId, setFocusedRowId] = useState<string | null>(null);
  const [columns, setColumns] = useState<Record<VisibleColumn, boolean>>({
    priority: true,
    assignee: true,
    status: true,
  });
  const createRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const { update, remove, bulkRemoveDone } = useSubtaskMutations(storyKey);

  // ─── Data query ───────────────────────────────
  const { data: children = [], isLoading } = useQuery({
    queryKey: ['childIssues', storyKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_issues')
        .select('id,issue_key,summary,status,status_category,issue_type,assignee_display_name,assignee_account_id,priority,position,deleted_at')
        .eq('parent_key', storyKey)
        .is('deleted_at', null)
        .order('position', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SubtaskRow[];
    },
    enabled: !!storyKey,
  });

  // ─── Avatar resolution ────────────────────────
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

  // ─── Progress ─────────────────────────────────
  const doneRows = useMemo(
    () => children.filter(c => (c.status_category ?? '').toLowerCase() === 'done'),
    [children]
  );
  const doneCount = doneRows.length;
  const totalCount = children.length;
  const percentage = totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  // ─── Create mutation (with optimistic insert) ──
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

  const confirmDelete = useCallback(() => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id);
    setPendingDelete(null);
  }, [pendingDelete, remove]);

  const confirmClearDone = useCallback(() => {
    bulkRemoveDone.mutate(doneRows.map(r => r.id));
    setPendingClearDone(false);
  }, [bulkRemoveDone, doneRows]);

  // ─── Keyboard navigation on rows ───────────────
  const focusRow = useCallback((id: string) => {
    const el = rowRefs.current.get(id);
    if (el) {
      el.focus();
      setFocusedRowId(id);
    }
  }, []);

  const handleRowKeyDown = useCallback((e: React.KeyboardEvent<HTMLTableRowElement>, row: SubtaskRow, index: number) => {
    if (readOnly) return;
    const rows = children;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = rows[Math.min(index + 1, rows.length - 1)];
      if (next) focusRow(next.id);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = rows[Math.max(index - 1, 0)];
      if (prev) focusRow(prev.id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      if (rows[0]) focusRow(rows[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = rows[rows.length - 1];
      if (last) focusRow(last.id);
    } else if (e.key === 'Enter' && !editingId) {
      e.preventDefault();
      onSubtaskClick?.(row.id);
    } else if ((e.key === 'Delete' || e.key === 'Backspace') && !editingId && e.shiftKey) {
      e.preventDefault();
      setPendingDelete(row);
    } else if (e.key === 'F2' && !editingId) {
      e.preventDefault();
      setEditingId(row.id);
    }
  }, [children, editingId, focusRow, onSubtaskClick, readOnly]);

  const visibleColumnCount = 1 + Number(columns.priority) + Number(columns.assignee) + Number(columns.status) + 1;

  return (
    <div className="sp-panel sp-panel--v2" data-testid="subtasks-panel-v2">
      {/* ═══ Header ═══ */}
      <div className="sp-header">
        <div className="sp-header-left">
          <button
            type="button"
            className="sp-collapse-btn"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-controls={`sp-body-${storyKey}`}
            aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <span className="sp-title">Subtasks</span>
          {totalCount > 0 && (
            <span className="sp-title-count" aria-label={`${doneCount} of ${totalCount} complete`}>
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
        {expanded && (
          <div className="sp-header-right">
            {/* HeaderOverflowMenu omitted in V2 prototype — see index.tsx for canonical wiring */}
            <ColumnPicker columns={columns} onChange={setColumns} />
            <ViewToggle view={view} onChange={setView} />
            <button
              type="button"
              className="sp-icon-btn sp-icon-btn--add"
              title="Create subtask"
              aria-label="Create subtask"
              onClick={() => setCreating(true)}
              disabled={readOnly}
            >
              <Plus size={16} />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div id={`sp-body-${storyKey}`}>
          {/* ═══ Progress bar ═══ */}
          {totalCount > 0 && (
            <div
              className="sp-progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalCount}
              aria-valuenow={doneCount}
              aria-label="Subtask progress"
            >
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
            <div aria-busy="true">
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

          {/* ═══ Empty state ═══ */}
          {!isLoading && children.length === 0 && !creating && (
            <div className="sp-empty">
              <div className="sp-empty-heading">No subtasks yet</div>
              <div className="sp-empty-sub">Break this item into subtasks to track progress</div>
              {!readOnly && (
                <button type="button" className="sp-empty-cta" onClick={() => setCreating(true)}>
                  + Create subtask
                </button>
              )}
            </div>
          )}

          {/* ═══ Board view ═══ */}
          {!isLoading && children.length > 0 && view === 'board' && (
            <BoardView
              subtasks={children}
              avatarMap={avatarMap}
              onCardClick={(id) => onSubtaskClick?.(id)}
            />
          )}

          {/* ═══ List view ═══ */}
          {!isLoading && children.length > 0 && view === 'list' && (
            <div className="sp-scroll-container">
              <table
                className="sp-table"
                role="grid"
                aria-rowcount={children.length}
                aria-colcount={visibleColumnCount}
                aria-label={`Subtasks for ${storyKey}`}
              >
                <thead className="sp-thead">
                  <tr role="row">
                    <th role="columnheader" className="sp-th" style={{ width: 'auto' }}>Work</th>
                    {columns.priority && <th role="columnheader" className="sp-th sp-th--priority">Priority</th>}
                    {columns.assignee && <th role="columnheader" className="sp-th sp-th--assignee">Assignee</th>}
                    {columns.status && <th role="columnheader" className="sp-th sp-th--status">Status</th>}
                    <th role="columnheader" className="sp-th sp-th--actions" aria-label="Row actions" />
                  </tr>
                </thead>
                <tbody>
                  {children.map((child, index) => {
                    const isFocused = focusedRowId === child.id;
                    return (
                      <tr
                        key={child.id}
                        ref={(el) => {
                          if (el) rowRefs.current.set(child.id, el);
                          else rowRefs.current.delete(child.id);
                        }}
                        role="row"
                        aria-rowindex={index + 1}
                        aria-selected={isFocused}
                        tabIndex={0}
                        className={`sp-row sp-row--v2 ${isFocused ? 'sp-row--focused' : ''}`}
                        data-testid={`subtask-row-${child.issue_key}`}
                        onClick={() => onSubtaskClick?.(child.id)}
                        onFocus={() => setFocusedRowId(child.id)}
                        onKeyDown={(e) => handleRowKeyDown(e, child, index)}
                      >
                        <td className="sp-td" role="gridcell">
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
                            <div className="sp-work-cell-wrap">
                              <WorkCell
                                issueType={child.issue_type}
                                issueKey={child.issue_key}
                                summary={child.summary}
                                onClick={() => onSubtaskClick?.(child.id)}
                              />
                              <DescriptionPopover
                                subtaskId={child.id}
                                subtaskKey={child.issue_key}
                                parentKey={storyKey}
                                readOnly={readOnly}
                              />
                            </div>
                          )}
                        </td>
                        {columns.priority && (
                          <td className="sp-td" role="gridcell">
                            <PriorityCell
                              priority={child.priority}
                              onChange={handlePriorityChange(child)}
                            />
                          </td>
                        )}
                        {columns.assignee && (
                          <td className="sp-td" role="gridcell">
                            <AssigneeCell
                              displayName={child.assignee_display_name}
                              accountId={child.assignee_account_id}
                              avatarUrl={child.assignee_account_id ? avatarMap[child.assignee_account_id] : null}
                              onChange={handleAssigneeChange(child)}
                            />
                          </td>
                        )}
                        {columns.status && (
                          <td className="sp-td" role="gridcell">
                            <StatusCell
                              status={child.status}
                              statusCategory={child.status_category}
                              onChange={handleStatusChange(child)}
                            />
                          </td>
                        )}
                        <td className="sp-td sp-td--actions" role="gridcell" onClick={(e) => e.stopPropagation()}>
                          <RowActionsMenu
                            onOpen={() => onSubtaskClick?.(child.id)}
                            onRename={() => setEditingId(child.id)}
                            onDelete={() => setPendingDelete(child)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ═══ Inline create ═══ */}
          {creating && !readOnly && (
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
                    if (e.key === 'Enter' && draftSummary.trim() && !createMutation.isPending) {
                      e.preventDefault();
                      createMutation.mutate(draftSummary);
                    }
                    if (e.key === 'Escape') {
                      setCreating(false);
                      setDraftSummary('');
                    }
                  }}
                  maxLength={255}
                  aria-label="New subtask summary"
                />
                <div className="sp-create-actions">
                  <TypeSelector value={draftType} onChange={setDraftType} disabled={createMutation.isPending} />
                  <button
                    type="button"
                    onClick={() => { if (draftSummary.trim()) createMutation.mutate(draftSummary); }}
                    disabled={!draftSummary.trim() || createMutation.isPending}
                    title="Create (Enter)"
                    className="sp-create-submit"
                    aria-label="Create subtask"
                  >
                    {createMutation.isPending
                      ? <Loader2 size={14} className="animate-spin" aria-hidden />
                      : <CornerDownLeft size={14} aria-hidden />}
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
        </div>
      )}

      {/* ═══ Delete confirmation ═══ */}
      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete subtask</AlertDialogTitle>
            <AlertDialogDescription>
              Delete subtask <strong>{pendingDelete?.issue_key}</strong> — {pendingDelete?.summary}? This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══ Clear-completed confirmation ═══ */}
      <AlertDialog open={pendingClearDone} onOpenChange={setPendingClearDone}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear completed subtasks</AlertDialogTitle>
            <AlertDialogDescription>
              Remove {doneRows.length} completed subtask{doneRows.length === 1 ? '' : 's'} from this parent?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearDone}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export type { SubtasksPanelV2Props };
export default SubtasksPanelV2;
