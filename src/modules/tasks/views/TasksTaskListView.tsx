/**
 * TasksTaskListView — Tasks Hub list view.
 *
 * Task 1.5b (2026-06-16) — matched Project Hub backlog structurally:
 *   1. TasksPageHeader (breadcrumb + H1)
 *   2. Inline toolbar: Search list · Filters · Avatar group · Saved filters
 *      · Group dropdown · Sort caret · ⋯ · item count
 *   3. JiraTable mount with selectable + columnVisibility wired
 *
 * Task 1.5c (2026-06-16) — wired the row action menu and side detail surface:
 *   - Row ⋯ menu mirrors Project Hub backlog (BacklogPage.atlaskit.tsx:2064),
 *     excluding `open-in-jira` and `duplicate` (no Jira sync for tasks; no
 *     duplicate mutation hook). Actions: view · comment · log-work · agile-board
 *     · rank-top · rank-bottom · attach · copy-link · delete.
 *
 * Task 1.5d (2026-06-16) — mounts `CatalystDetailPanel` (right-side
 *   drag-resizable panel — same as Project Hub backlog) with
 *   `entityKind='task'`. CatalystDetailRouter dispatches to TaskCatalystView,
 *   which reads from the `tasks` table and reuses CatalystViewBase chrome.
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - JiraTable for the table itself
 *   - DEFAULT_VISIBLE_COLUMNS from the column registry
 *   - useTasksTableData for rows + columns + users
 *   - TasksPageHeader for breadcrumb + H1
 *   - CatalystDetailPanel (entityKind='task' → TaskCatalystView)
 *   - RowAction<PlannerTask>[] + makeRowActionsCell from the canonical
 *     JiraTable editors module
 *   - `flag` toast helper from JiraTable index (catalystToast under the hood)
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import Avatar from '@atlaskit/avatar';
import AvatarGroup from '@atlaskit/avatar-group';
import AkPersonAvatarIcon from '@atlaskit/icon/glyph/person';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkMoreIcon from '@atlaskit/icon/glyph/more';
import AkFilterIcon from '@atlaskit/icon/core/filter';
import AkChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import AkEditIcon from '@atlaskit/icon/core/edit';
import AkCommentIcon from '@atlaskit/icon/core/comment';
import AkClockIcon from '@atlaskit/icon/core/clock';
import AkBoardIcon from '@atlaskit/icon/core/board';
import AkArrowUpIcon from '@atlaskit/icon/core/arrow-up';
import AkArrowDownIcon from '@atlaskit/icon/core/arrow-down';
import AkAttachmentIcon from '@atlaskit/icon/core/attachment';
import AkLinkIcon from '@atlaskit/icon/core/link';
import AkTrashIcon from '@atlaskit/icon/glyph/trash';
import { token } from '@atlaskit/tokens';
import { JiraTable, flag, type RowAction, type RowGroup } from '@/components/shared/JiraTable';
import {
  JiraFilterAtlaskit,
  emptyFilterValue,
  countActiveFilters,
  type JiraFilterValue,
  type AssigneeOption,
  type StatusFilterOption,
  type SprintReleaseOption,
} from '@/components/shared/JiraFilterAtlaskit';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { supabase } from '@/integrations/supabase/client';
import { useTasksTableData } from '@/modules/tasks/hooks/useTasksTableData';
import { useDeletePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import { DEFAULT_VISIBLE_COLUMNS } from '@/modules/tasks/columns/tasksListColumns';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import { CatalystDetailPanel } from '@/components/shared/CatalystDetailPanel';
import { useCreateTaskMutation } from '@/modules/tasks/components/CreateTaskModal/hooks/useCreateTaskMutation';
import { useTaskWorkstreams } from '@/modules/tasks/hooks/useTaskWorkstreams';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { PlannerTask } from '@/modules/tasks/types';

// Task 1.5d (2026-06-16) — right-side drag-resizable panel sizing.
// Mirrors Project Hub backlog's PANEL_MIN_W / PANEL_MAX_W constants and
// persists the user's chosen width across sessions via localStorage.
const TASK_PANEL_MIN_W = 400;
const TASK_PANEL_MAX_W = 900;
const TASK_PANEL_DEFAULT_W = 600;
const TASK_PANEL_LS_KEY = 'tasks-hub-detail-panel-width';

// Placeholder Group-by options — wiring deferred. Visual only.
// 2026-06-16 Fix #5: collapsed to a single "Group" trigger button (mirrors
// BacklogPage's GroupByControl portal pattern, BacklogPage.atlaskit.tsx:5285).
type TasksGroupBy = 'none' | 'status' | 'workstream' | 'assignee' | 'priority';
const GROUP_BY_LABELS: Record<TasksGroupBy, string> = {
  none: 'No grouping',
  status: 'Status',
  workstream: 'Workstream',
  assignee: 'Assignee',
  priority: 'Priority',
};
const TASKS_GROUP_BY_ORDER: TasksGroupBy[] = ['none', 'status', 'workstream', 'assignee', 'priority'];

/**
 * TasksGroupByControl — single "Group" button + chevron + portal dropdown.
 *
 * 2026-06-16 Fix #5: collapses the previous "Group by [No grouping]" inline
 * pair into one trigger button matching Project Hub backlog's GroupByControl
 * (BacklogPage.atlaskit.tsx:5285). Native button + ReactDOM.createPortal menu
 * mounted on <body> — same pattern used because @atlaskit/dropdown-menu
 * renders an empty portal on this surface (documented bug). Keeps the popover
 * wiring identical to backlog: setIsOpen on click, click-outside / Escape to
 * close, ArrowUp/Down + Home/End for keyboard nav, Enter/Space to select.
 */
function TasksGroupByControl({
  value,
  onChange,
}: {
  value: TasksGroupBy;
  onChange: (next: TasksGroupBy) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const triggerText = value === 'none' ? 'Group' : `Group: ${GROUP_BY_LABELS[value]}`;

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, left: r.left });
    const activeIdx = TASKS_GROUP_BY_ORDER.indexOf(value);
    setFocusedIdx(activeIdx >= 0 ? activeIdx : 0);
  }, [isOpen, value]);

  useEffect(() => {
    if (!isOpen) return;
    const el = itemsRef.current[focusedIdx];
    if (el) el.focus();
  }, [isOpen, focusedIdx]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIdx((i) => (i + 1) % TASKS_GROUP_BY_ORDER.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIdx((i) => (i - 1 + TASKS_GROUP_BY_ORDER.length) % TASKS_GROUP_BY_ORDER.length); }
      else if (e.key === 'Home') { e.preventDefault(); setFocusedIdx(0); }
      else if (e.key === 'End') { e.preventDefault(); setFocusedIdx(TASKS_GROUP_BY_ORDER.length - 1); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChange(TASKS_GROUP_BY_ORDER[focusedIdx]);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, focusedIdx, onChange]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={value === 'none' ? 'Group by' : `Group by ${GROUP_BY_LABELS[value]}. Click to change.`}
        onKeyDown={(e) => {
          if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 32,
          padding: '0 12px',
          borderRadius: 3,
          border: `1px solid ${(isOpen || value !== 'none')
            ? token('color.border.selected', '#0C66E4')
            : token('color.border', '#DFE1E6')}`,
          background: (isOpen || value !== 'none')
            ? token('color.background.selected', '#E9F2FF')
            : token('elevation.surface', '#FFFFFF'),
          color: (isOpen || value !== 'none')
            ? token('color.text.selected', '#0055CC')
            : token('color.text', '#292A2E'),
          fontSize: 13,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span>{triggerText}</span>
        <AkChevronDownIcon label="" size="small" />
      </button>
      {isOpen && anchor && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Group by"
          style={{
            position: 'fixed',
            top: anchor.top,
            left: anchor.left,
            minWidth: 180,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
            padding: '8px 0',
            zIndex: 9999,
            fontFamily: 'var(--cp-font-body)',
            fontSize: 14,
          }}
        >
          {TASKS_GROUP_BY_ORDER.map((opt, i) => {
            const active = value === opt;
            const focused = focusedIdx === i;
            return (
              <button
                key={opt}
                ref={(el) => { itemsRef.current[i] = el; }}
                role="menuitemradio"
                aria-checked={active}
                tabIndex={focused ? 0 : -1}
                type="button"
                onMouseEnter={() => setFocusedIdx(i)}
                onClick={() => { onChange(opt); setIsOpen(false); triggerRef.current?.focus(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  width: '100%',
                  padding: '8px 16px',
                  border: 'none',
                  outline: 'none',
                  background: active
                    ? token('color.background.selected', '#E9F2FF')
                    : focused
                      ? token('color.background.neutral.subtle.hovered', '#091E4208')
                      : 'transparent',
                  color: active ? token('color.text.selected', '#0C66E4') : token('color.text', '#292A2E'),
                  fontWeight: active ? 500 : 400,
                  fontSize: 14,
                  fontFamily: 'inherit',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                {GROUP_BY_LABELS[opt]}
              </button>
            );
          })}
        </div>,
        document.body,
      )}
    </>
  );
}

// 2026-06-17: Tasks adopts the canonical JiraFilterAtlaskit (CLAUDE.md REUSE
// FIRST). Saved filters keep working by storing the canonical `JiraFilterValue`
// instead of the old TasksFilters shape.
type SavedFilter = { name: string; filters: JiraFilterValue };
const SAVED_FILTERS_LS_KEY = 'tasks-saved-filters';

// Tasks priority → JiraFilterValue.priority mapping. Tasks have 4 levels
// (critical/high/medium/low) and the canonical filter exposes 5
// (highest/high/medium/low/lowest). 'critical' maps to 'highest'; the other
// three line up by name. 'lowest' is never produced by tasks (filtering by
// lowest just returns zero results).
const TASK_PRIORITY_TO_FILTER: Record<string, string> = {
  critical: 'highest',
  high: 'high',
  medium: 'medium',
  low: 'low',
};

/**
 * TasksSavedFiltersControl — localStorage-backed saved filter sets.
 */
function TasksSavedFiltersControl({
  currentFilters,
  saved,
  onSaveCurrent,
  onApply,
  onDelete,
}: {
  currentFilters: JiraFilterValue;
  saved: SavedFilter[];
  onSaveCurrent: (name: string) => void;
  onApply: (f: JiraFilterValue) => void;
  onDelete: (name: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [showNameField, setShowNameField] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const hasCurrent = countActiveFilters(currentFilters) > 0;

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setIsOpen(false);
      setShowNameField(false);
      setNameInput('');
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setIsOpen(false); triggerRef.current?.focus(); } };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDocClick); document.removeEventListener('keydown', onKey); };
  }, [isOpen]);

  const submitName = () => {
    const n = nameInput.trim();
    if (!n) return;
    onSaveCurrent(n);
    setNameInput('');
    setShowNameField(false);
  };

  return (
    <>
      <Button
        ref={triggerRef as never}
        appearance="subtle"
        onClick={() => setIsOpen((v) => !v)}
      >
        {saved.length > 0 ? `Saved filters (${saved.length})` : 'Saved filters'}
      </Button>
      {isOpen && anchor && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label="Saved filters"
          style={{
            position: 'fixed', top: anchor.top, right: anchor.right, width: 280,
            background: token('elevation.surface.overlay', '#FFFFFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
            padding: '6px 0', zIndex: 9999, fontFamily: 'var(--cp-font-body)',
            maxHeight: 400, overflowY: 'auto',
          }}
        >
          {showNameField ? (
            <div style={{ display: 'flex', gap: 6, padding: '6px 12px' }}>
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitName(); }}
                placeholder="Filter name"
                style={{ flex: 1, padding: '6px 8px', fontSize: 13, border: `1px solid ${token('color.border', '#DFE1E6')}`, borderRadius: 3, outline: 'none' }}
              />
              <Button appearance="primary" onClick={submitName}>Save</Button>
            </div>
          ) : (
            <button
              type="button"
              disabled={!hasCurrent}
              onClick={() => setShowNameField(true)}
              style={{
                display: 'block', width: '100%', padding: '8px 16px', textAlign: 'left',
                background: 'transparent', border: 'none', cursor: hasCurrent ? 'pointer' : 'not-allowed',
                color: hasCurrent ? token('color.text', '#292A2E') : token('color.text.disabled', '#9B9DA1'),
                fontSize: 13, fontFamily: 'inherit',
              }}
            >
              {hasCurrent ? 'Save current filter as…' : 'Apply a filter first to save'}
            </button>
          )}
          {saved.length === 0 ? (
            <div style={{ padding: '12px 16px', fontSize: 12, color: token('color.text.subtlest', '#6B6E76') }}>No saved filters yet.</div>
          ) : (
            <div style={{ borderTop: `1px solid ${token('color.border', '#DFE1E6')}`, padding: '4px 0' }}>
              {saved.map((s) => (
                <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px 4px 16px' }}>
                  <button
                    type="button"
                    onClick={() => { onApply(s.filters); setIsOpen(false); }}
                    style={{
                      flex: 1, textAlign: 'left', padding: '4px 8px', background: 'transparent',
                      border: 'none', cursor: 'pointer', fontSize: 13, color: token('color.text', '#292A2E'),
                      fontFamily: 'inherit',
                    }}
                  >
                    {s.name} <span style={{ color: token('color.text.subtlest', '#6B6E76'), fontSize: 11 }}>({countActiveFilters(s.filters)})</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${s.name}`}
                    onClick={() => onDelete(s.name)}
                    style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#6B6E76'), display: 'flex' }}
                  >
                    <AkCloseIcon label="" size="small" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  );
}

/**
 * TasksInlineCreateRow — bottom-of-table inline create row.
 *
 * Backlog-parity (2026-06-16): mirrors BacklogPage's `InlineGroupCreateRow`
 * geometry exactly — Task icon (no picker, only one type) | summary | due-date
 * portal calendar | workstream portal picker | assignee portal picker | Create.
 * Same row height, same gaps, same date popover, same assignee popover, same
 * primary Create button. Tasks-specific: workstream picker (required because
 * `useCreateTaskMutation` needs a `workstream_id`) replaces backlog's type
 * picker chevron, since tasks only have one type ('Task').
 */
function TasksInlineCreateRow({
  workstreams,
  members,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  workstreams: Array<{ id: string; name: string; color?: string | null }>;
  members: Array<{ key: string; name: string; src?: string }>;
  onSubmit: (
    title: string,
    workstreamId: string,
    assignee: { id: string; name: string } | null,
    dueDate: string | null,
  ) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const [summary, setSummary] = useState('');
  const [workstreamId, setWorkstreamId] = useState<string>(() => workstreams[0]?.id ?? '');
  const [assigneeIdx, setAssigneeIdx] = useState<number>(-1); // -1 = Unassigned
  const [dueDate, setDueDate] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Workstream picker
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [wsAnchor, setWsAnchor] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const wsTriggerRef = useRef<HTMLButtonElement>(null);
  const wsMenuRef = useRef<HTMLDivElement>(null);

  // Due-date picker
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [dateMenuAnchor, setDateMenuAnchor] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => { const d = new Date(); d.setDate(1); return d; });
  const [dateInputFocused, setDateInputFocused] = useState(false);
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  // Assignee picker
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false);
  const [assigneeMenuAnchor, setAssigneeMenuAnchor] = useState<{ top?: number; bottom?: number; left: number } | null>(null);
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const assigneeTriggerRef = useRef<HTMLButtonElement>(null);
  const assigneeMenuRef = useRef<HTMLDivElement>(null);

  // Autofocus the summary field on mount.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, []);

  // Backfill default workstream if one becomes available after mount.
  useEffect(() => {
    if (!workstreamId && workstreams[0]) setWorkstreamId(workstreams[0].id);
  }, [workstreams, workstreamId]);

  // ── Workstream menu: anchor + outside-click + Escape ────────────────────
  useLayoutEffect(() => {
    if (!wsMenuOpen || !wsTriggerRef.current) return;
    const r = wsTriggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(280, workstreams.length * 36 + 16);
    const menuWidth = 220;
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - menuWidth - margin));
    setWsAnchor(
      spaceBelow < estimatedHeight && r.top > estimatedHeight
        ? { bottom: window.innerHeight - r.top + 4, left }
        : { top: r.bottom + 4, left },
    );
  }, [wsMenuOpen, workstreams.length]);
  useEffect(() => {
    if (!wsMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wsTriggerRef.current?.contains(t)) return;
      if (wsMenuRef.current?.contains(t)) return;
      setWsMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setWsMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [wsMenuOpen]);

  // ── Assignee menu: anchor + outside-click + Escape ──────────────────────
  useLayoutEffect(() => {
    if (!assigneeMenuOpen || !assigneeTriggerRef.current) return;
    const r = assigneeTriggerRef.current.getBoundingClientRect();
    const estimatedHeight = Math.min(360, (members.length + 2) * 36 + 60);
    const menuWidth = 240;
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const left = Math.max(margin, Math.min(r.left, window.innerWidth - menuWidth - margin));
    setAssigneeMenuAnchor(
      spaceBelow < estimatedHeight && r.top > estimatedHeight
        ? { bottom: window.innerHeight - r.top + 4, left }
        : { top: r.bottom + 4, left },
    );
    setAssigneeQuery('');
  }, [assigneeMenuOpen, members.length]);
  useEffect(() => {
    if (!assigneeMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (assigneeTriggerRef.current?.contains(t)) return;
      if (assigneeMenuRef.current?.contains(t)) return;
      setAssigneeMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAssigneeMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [assigneeMenuOpen]);

  // ── Date menu: anchor + outside-click + Escape ──────────────────────────
  useLayoutEffect(() => {
    if (!dateMenuOpen || !dateBtnRef.current) return;
    const r = dateBtnRef.current.getBoundingClientRect();
    const estimatedHeight = 340;
    const menuWidth = 280;
    const margin = 8;
    const spaceBelow = window.innerHeight - r.bottom - 8;
    const preferredLeft = r.left - 120;
    const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - menuWidth - margin));
    setDateMenuAnchor(
      spaceBelow < estimatedHeight && r.top > estimatedHeight
        ? { bottom: window.innerHeight - r.top + 6, left }
        : { top: r.bottom + 6, left },
    );
    const d = dueDate ? new Date(dueDate + 'T00:00:00') : new Date();
    setDisplayMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }, [dateMenuOpen, dueDate]);
  useEffect(() => {
    if (!dateMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (dateBtnRef.current?.contains(t)) return;
      if (dateMenuRef.current?.contains(t)) return;
      setDateMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDateMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [dateMenuOpen]);

  // ── Global click-outside: dismiss the inline form ───────────────────────
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rowRef.current?.contains(t)) return;
      if (wsMenuRef.current?.contains(t)) return;
      if (assigneeMenuRef.current?.contains(t)) return;
      if (dateMenuRef.current?.contains(t)) return;
      onCancel();
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onCancel]);

  // ── Date helpers ────────────────────────────────────────────────────────
  const toStorage = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const toDisplay = (iso: string | null) => {
    if (!iso) return '';
    const [y, m, day] = iso.split('-').map(Number);
    return `${m}/${day}/${y}`;
  };
  const parseDisplay = (s: string): string | null => {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return null;
    const mm = Number(m[1]), dd = Number(m[2]), yy = Number(m[3]);
    const d = new Date(yy, mm - 1, dd);
    if (d.getFullYear() !== yy || d.getMonth() !== mm - 1 || d.getDate() !== dd) return null;
    return toStorage(d);
  };
  const todayIso = toStorage(new Date());
  const effectiveDateInput = dueDate ?? todayIso;
  const dateInputDisplay = toDisplay(effectiveDateInput);

  // 6-week day grid for the calendar.
  const monthStart = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(1 - monthStart.getDay());
  const dayCells: Array<{ date: Date; iso: string; day: number; outside: boolean; isToday: boolean; isSelected: boolean }> = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const iso = toStorage(d);
    dayCells.push({
      date: d,
      iso,
      day: d.getDate(),
      outside: d.getMonth() !== displayMonth.getMonth(),
      isToday: iso === todayIso,
      isSelected: iso === dueDate,
    });
  }
  const monthLabel = displayMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const trimmed = summary.trim();
  const canSubmit = !!trimmed && !!workstreamId && !isSubmitting;
  const currentAssignee = assigneeIdx === -1 ? null : members[assigneeIdx] ?? null;
  const activeWs = workstreams.find((w) => w.id === workstreamId);
  const filteredMembers = members.filter((m) => m.name.toLowerCase().includes(assigneeQuery.toLowerCase()));

  const submitNow = () => {
    if (!canSubmit) return;
    onSubmit(
      trimmed.slice(0, 255),
      workstreamId,
      currentAssignee ? { id: currentAssignee.key, name: currentAssignee.name } : null,
      dueDate,
    );
  };

  return (
    <div
      ref={rowRef}
      data-testid="tasks-table.group-row.inline-create-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        background: 'transparent',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        else if (e.key === 'Enter') { e.preventDefault(); submitNow(); }
      }}
    >
      {/* Type icon — tasks only have one type, no picker chevron */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 26,
          padding: '0 4px',
          flexShrink: 0,
        }}
        aria-label="Task type"
      >
        <JiraIssueTypeIcon type="Task" size={20} />
      </span>

      {/* Summary input — same geometry as backlog */}
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        placeholder="What needs to be done?"
        value={summary}
        onChange={(e) => setSummary(e.target.value)}
        maxLength={255}
        style={{
          flex: 1,
          minWidth: 80,
          height: 28,
          padding: '0 6px',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 14,
          color: token('color.text', '#292A2E'),
          fontFamily: 'inherit',
        }}
      />

      {/* Workstream picker — required for tasks; uses portal */}
      <>
        <button
          ref={wsTriggerRef}
          type="button"
          data-testid="tasks-table.group-row.inline-create-workstream-trigger"
          aria-label={`Workstream: ${activeWs?.name ?? 'Select workstream'}.`}
          aria-haspopup="listbox"
          aria-expanded={wsMenuOpen}
          onClick={() => setWsMenuOpen((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 26,
            padding: '0 8px',
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 3,
            background: 'transparent',
            color: token('color.text', '#292A2E'),
            fontSize: 12,
            fontFamily: 'inherit',
            cursor: 'pointer',
            flexShrink: 0,
            maxWidth: 160,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {activeWs?.color && (
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: activeWs.color, flexShrink: 0 }} />
          )}
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeWs?.name ?? 'Workstream'}
          </span>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M2.5 3.5 5 6l2.5-2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          </svg>
        </button>
        {wsMenuOpen && wsAnchor && ReactDOM.createPortal(
          <div
            ref={wsMenuRef}
            role="listbox"
            aria-label="Select workstream"
            style={{
              position: 'fixed',
              top: wsAnchor.top,
              bottom: wsAnchor.bottom,
              left: wsAnchor.left,
              minWidth: 220,
              maxHeight: '60vh',
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 4,
              boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
              padding: '6px 0',
              zIndex: 9999,
              fontFamily: 'var(--cp-font-body)',
              fontSize: 14,
            }}
          >
            {workstreams.length === 0 ? (
              <div style={{ padding: '8px 16px', fontSize: 12, color: token('color.text.subtlest', '#6B6E76') }}>
                No workstreams
              </div>
            ) : workstreams.map((w) => {
              const active = w.id === workstreamId;
              return (
                <button
                  key={w.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { setWorkstreamId(w.id); setWsMenuOpen(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 16px',
                    border: 'none',
                    outline: 'none',
                    background: active ? token('color.background.selected', '#E9F2FF') : 'transparent',
                    boxShadow: active ? 'inset 3px 0 0 0 var(--ds-border-focused, #0C66E4)' : undefined,
                    color: active ? token('color.text.selected', '#0C66E4') : token('color.text', '#292A2E'),
                    fontWeight: active ? 500 : 400,
                    fontSize: 14,
                    fontFamily: 'inherit',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F7F8F9'); }}
                  onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {w.color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: w.color, flexShrink: 0 }} />}
                  <span>{w.name}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )}
      </>

      {/* Due date trigger — opens the calendar popover */}
      <>
        <button
          ref={dateBtnRef}
          type="button"
          data-testid="tasks-table.group-row.inline-create-date-trigger"
          aria-label={dueDate ? `Due date: ${toDisplay(dueDate)}` : 'Set due date'}
          aria-haspopup="dialog"
          aria-expanded={dateMenuOpen}
          onClick={() => setDateMenuOpen((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            padding: 0,
            border: dateMenuOpen
              ? `1.5px solid ${token('color.border.focused', '#0C66E4')}`
              : '1.5px solid transparent',
            borderRadius: 4,
            background: dateMenuOpen
              ? token('color.background.information', '#E9F2FF')
              : 'transparent',
            color: dateMenuOpen
              ? token('color.text.brand', '#0C66E4')
              : token('color.text.subtle', '#505258'),
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'background-color 120ms ease, border-color 120ms ease',
          }}
          onMouseEnter={(e) => { if (!dateMenuOpen) e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
          onMouseLeave={(e) => { if (!dateMenuOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>
        {dateMenuOpen && dateMenuAnchor && ReactDOM.createPortal(
          <div
            ref={dateMenuRef}
            role="dialog"
            aria-label="Due date"
            style={{
              position: 'fixed',
              top: dateMenuAnchor.top,
              bottom: dateMenuAnchor.bottom,
              left: dateMenuAnchor.left,
              width: 280,
              padding: 12,
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 4,
              boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
              zIndex: 9999,
              fontFamily: 'var(--cp-font-body)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 600, color: token('color.text', '#292A2E'), marginBottom: 6 }}>
              Due date
            </div>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <input
                type="text"
                value={dateInputDisplay}
                onChange={(e) => {
                  const v = e.target.value;
                  const parsed = parseDisplay(v);
                  if (parsed) setDueDate(parsed);
                }}
                onFocus={() => setDateInputFocused(true)}
                onBlur={() => setDateInputFocused(false)}
                style={{
                  width: '100%',
                  height: 32,
                  padding: '0 32px 0 8px',
                  fontSize: 14,
                  border: dateInputFocused
                    ? `2px solid ${token('color.border.focused', '#0C66E4')}`
                    : `1px solid ${token('color.border', '#DFE1E6')}`,
                  borderRadius: 4,
                  outline: 'none',
                  fontFamily: 'inherit',
                  color: token('color.text', '#292A2E'),
                  background: token('elevation.surface', '#FFFFFF'),
                  boxSizing: 'border-box',
                }}
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate(null)}
                  aria-label="Clear due date"
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 20,
                    height: 20,
                    border: 'none',
                    borderRadius: '50%',
                    background: token('color.background.neutral.bold', '#42526E'),
                    color: token('color.text.inverse', '#FFFFFF'),
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                    <path d="M2 2l6 6M8 2l-6 6" />
                  </svg>
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto auto 1fr auto auto', alignItems: 'center', gap: 4, marginBottom: 8 }}>
              <button type="button" aria-label="Previous year" onClick={() => setDisplayMonth(d => new Date(d.getFullYear() - 1, d.getMonth(), 1))}
                style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: token('color.text.subtle', '#505258'), fontSize: 16, lineHeight: 1, borderRadius: 3 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >«</button>
              <button type="button" aria-label="Previous month" onClick={() => setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: token('color.text.subtle', '#505258'), fontSize: 16, lineHeight: 1, borderRadius: 3 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >‹</button>
              <span style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: token('color.text', '#292A2E') }}>{monthLabel}</span>
              <button type="button" aria-label="Next month" onClick={() => setDisplayMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: token('color.text.subtle', '#505258'), fontSize: 16, lineHeight: 1, borderRadius: 3 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >›</button>
              <button type="button" aria-label="Next year" onClick={() => setDisplayMonth(d => new Date(d.getFullYear() + 1, d.getMonth(), 1))}
                style={{ width: 24, height: 24, border: 'none', background: 'transparent', cursor: 'pointer', color: token('color.text.subtle', '#505258'), fontSize: 16, lineHeight: 1, borderRadius: 3 }}
                onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >»</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 500, textAlign: 'center', padding: '4px 0', color: token('color.text.subtle', '#505258') }}>{d}</div>
              ))}
              {dayCells.map((cell) => {
                const highlight = cell.isSelected || (cell.isToday && !dueDate);
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => { setDueDate(cell.iso); }}
                    style={{
                      height: 28,
                      border: 'none',
                      borderBottom: highlight
                        ? `2px solid ${token('color.border.focused', '#0C66E4')}`
                        : '2px solid transparent',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontFamily: 'inherit',
                      color: cell.outside
                        ? token('color.text.subtlest', '#6B6E76')
                        : highlight
                          ? token('color.text.brand', '#0C66E4')
                          : token('color.text', '#292A2E'),
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
      </>

      {/* Assignee picker — portal with search */}
      <>
        <button
          ref={assigneeTriggerRef}
          type="button"
          data-testid="tasks-table.group-row.inline-create-assignee-trigger"
          aria-label={`Assignee: ${currentAssignee ? currentAssignee.name : 'Unassigned'}. Click to change.`}
          aria-haspopup="listbox"
          aria-expanded={assigneeMenuOpen}
          onClick={() => setAssigneeMenuOpen((v) => !v)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            padding: 0,
            border: 'none',
            borderRadius: '50%',
            background: 'transparent',
            color: token('color.text.subtle', '#505258'),
            cursor: 'pointer',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral', '#EBECF0'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          {currentAssignee ? (
            <Avatar size="small" src={currentAssignee.src} name={currentAssignee.name} />
          ) : (
            <AkPersonAvatarIcon label="" size="medium" />
          )}
        </button>
        {assigneeMenuOpen && assigneeMenuAnchor && ReactDOM.createPortal(
          <div
            ref={assigneeMenuRef}
            role="listbox"
            aria-label="Select assignee"
            style={{
              position: 'fixed',
              top: assigneeMenuAnchor.top,
              bottom: assigneeMenuAnchor.bottom,
              left: assigneeMenuAnchor.left,
              minWidth: 240,
              maxHeight: '50vh',
              overflowY: 'auto',
              background: token('elevation.surface.overlay', '#FFFFFF'),
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 4,
              boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
              padding: 8,
              zIndex: 9999,
              fontFamily: 'var(--cp-font-body)',
              fontSize: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <input
              type="text"
              autoFocus
              value={assigneeQuery}
              onChange={(e) => setAssigneeQuery(e.target.value)}
              placeholder="Search people…"
              style={{
                padding: '8px 8px',
                fontSize: 13,
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: 3,
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ overflowY: 'auto', maxHeight: 280 }}>
              <button
                type="button"
                role="option"
                aria-selected={assigneeIdx === -1}
                onClick={() => { setAssigneeIdx(-1); setAssigneeMenuOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '8px 8px',
                  border: 'none', outline: 'none',
                  background: assigneeIdx === -1 ? token('color.background.selected', '#E9F2FF') : 'transparent',
                  color: token('color.text', '#292A2E'),
                  fontSize: 14, fontFamily: 'inherit', textAlign: 'left',
                  cursor: 'pointer', borderRadius: 3,
                }}
              >
                <AkPersonAvatarIcon label="" size="small" />
                <span>Unassigned</span>
              </button>
              {filteredMembers.length === 0 && assigneeQuery && (
                <div style={{ padding: '8px 8px', fontSize: 12, color: token('color.text.subtlest', '#6B6E76') }}>
                  No matches
                </div>
              )}
              {filteredMembers.map((m) => {
                const idx = members.indexOf(m);
                const isActive = idx === assigneeIdx;
                return (
                  <button
                    key={m.key}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => { setAssigneeIdx(idx); setAssigneeMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '8px 8px',
                      border: 'none', outline: 'none',
                      background: isActive ? token('color.background.selected', '#E9F2FF') : 'transparent',
                      color: token('color.text', '#292A2E'),
                      fontSize: 14, fontFamily: 'inherit', textAlign: 'left',
                      cursor: 'pointer', borderRadius: 3,
                    }}
                    onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', '#F7F8F9'); }}
                    onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Avatar size="xsmall" src={m.src} name={m.name} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
      </>

      {/* Create — primary brand button matching backlog */}
      <button
        type="button"
        disabled={!canSubmit}
        onClick={submitNow}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          height: 28,
          padding: '0 12px',
          border: 'none',
          borderRadius: 4,
          background: canSubmit
            ? token('color.background.brand.bold', '#0C66E4')
            : token('color.background.disabled', '#DCDFE4'),
          color: canSubmit
            ? token('color.text.inverse', '#FFFFFF')
            : token('color.text.disabled', '#6B6E76'),
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (canSubmit) e.currentTarget.style.background = token('color.background.brand.bold.hovered', '#0055CC'); }}
        onMouseLeave={(e) => { if (canSubmit) e.currentTarget.style.background = token('color.background.brand.bold', '#0C66E4'); }}
      >
        <span>{isSubmitting ? 'Creating…' : 'Create'}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 10 4 15 9 20" />
          <path d="M20 4v7a4 4 0 0 1-4 4H4" />
        </svg>
      </button>
    </div>
  );
}

/** Export the given task rows to a CSV download (current filter applied). */
function exportRowsToCsv(rows: PlannerTask[]) {
  const headers = ['Key', 'Title', 'Status', 'Assignee', 'Priority', 'Workstream', 'Due date'];
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push([r.key, r.title, r.status, r.assigneeName ?? '', r.priority, r.teamName ?? '', r.dueDate ?? ''].map(esc).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tasks-${rows.length}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * TasksIconMenu — generic icon-trigger + portal dropdown for the toolbar's
 * View-options and More-actions buttons. Uses ReactDOM.createPortal to
 * <body> (same reason as the group/filter controls: @atlaskit/dropdown-menu
 * renders an empty/origin portal inside this overflow:hidden surface).
 */
interface IconMenuItem {
  id: string;
  label: string;
  onClick: () => void;
  selected?: boolean;
}
function TasksIconMenu({
  icon,
  label,
  items,
}: {
  icon: React.ComponentType<{ label: string }>;
  label: string;
  items: IconMenuItem[];
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open]);

  return (
    <span ref={wrapRef} style={{ display: 'inline-flex' }}>
      <IconButton appearance="subtle" icon={icon} label={label} onClick={() => setOpen((v) => !v)} />
      {open && anchor && ReactDOM.createPortal(
        <div
          ref={menuRef}
          role="menu"
          aria-label={label}
          style={{
            position: 'fixed', top: anchor.top, right: anchor.right,
            background: 'var(--ds-surface-overlay, #FFFFFF)',
            border: '1px solid var(--ds-border, #DFE1E6)', borderRadius: 6,
            boxShadow: '0 8px 28px rgba(9,30,66,0.25)', padding: '4px 0',
            minWidth: 180, zIndex: 9999,
          }}
        >
          {items.map((it) => (
            <button
              key={it.id}
              role="menuitem"
              type="button"
              onClick={() => { it.onClick(); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                padding: '6px 12px', border: 'none', background: 'none',
                font: 'inherit', fontSize: 14, color: 'var(--ds-text, #172B4D)',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <span style={{ width: 14, display: 'inline-block', color: 'var(--ds-text-selected, #0C66E4)' }}>{it.selected ? '✓' : ''}</span>
              {it.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </span>
  );
}

export default function TasksTaskListView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteMutation = useDeletePlannerTask();

  // ── Detail panel state ───────────────────────────────────────────────────
  // `panelTaskId` holds the row id of the task open in the right-side panel.
  // Mirrors Project Hub backlog's `panelItem` (BacklogPage.atlaskit.tsx:1930).
  const [panelTaskId, setPanelTaskId] = useState<string | null>(null);

  // Drag-resizable panel width — persisted to localStorage (Task 1.5d, 2026-06-16).
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(TASK_PANEL_LS_KEY);
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n >= TASK_PANEL_MIN_W && n <= TASK_PANEL_MAX_W) return n;
    } catch { /* ignore */ }
    return TASK_PANEL_DEFAULT_W;
  });
  const persistPanelWidth = useCallback((next: number) => {
    try { localStorage.setItem(TASK_PANEL_LS_KEY, String(next)); } catch { /* ignore */ }
  }, []);

  const openDetail = useCallback((row: PlannerTask) => {
    setPanelTaskId(row.id);
  }, []);

  const closePanel = useCallback(() => {
    setPanelTaskId(null);
  }, []);

  // ── Row actions (⋯ menu) ─────────────────────────────────────────────────
  // Mirrors Project Hub backlog (BacklogPage.atlaskit.tsx:2064). Excludes
  // `open-in-jira` (tasks aren't Jira-synced) and `duplicate` (no duplicate
  // mutation hook wired into Tasks Hub yet). 9 actions total.
  const rowActions = useMemo<RowAction<PlannerTask>[]>(
    () => [
      // ── Primary group — Jira-parity 7 ───────────────────────────────────
      {
        id: 'view',
        label: 'View task',
        icon: <AkEditIcon label="" size="small" />,
        onClick: (r) => openDetail(r),
      },
      {
        id: 'comment',
        label: 'Comment',
        icon: <AkCommentIcon label="" />,
        onClick: (r) => {
          openDetail(r);
          flag.info('Open comments', 'Activity → Comments in the detail view.');
        },
      },
      {
        id: 'log-work',
        label: 'Log work',
        icon: <AkClockIcon label="" />,
        // Tasks Hub doesn't track worklog today. Surfacing the affordance with
        // an info flag so the menu structure matches Project Hub — when the
        // worklog feature ships, wire to the detail drawer's section.
        onClick: (r) => {
          openDetail(r);
          flag.info('Log work', 'Worklog isn’t tracked on tasks yet.');
        },
      },
      {
        id: 'agile-board',
        label: 'Agile board',
        icon: <AkBoardIcon label="" />,
        onClick: (r) => {
          // PlannerPage routes board via `/tasks/:view`. Forward-compat hint:
          // pass `?workstream=<id>` so when the board picks up a workstream
          // filter prop, the deeplink works without further wiring.
          const ws = r.teamId ? `?workstream=${r.teamId}` : '';
          navigate(`/tasks/board${ws}`);
        },
      },
      {
        id: 'rank-top',
        label: 'Rank to top',
        icon: <AkArrowUpIcon label="" />,
        onClick: async (r) => {
          // Tasks have a `position` column (Kanban DnD writes to it). Scope by
          // workstream: only re-rank within the row's workstream. Rows with no
          // workstream are scoped to the global tasks list (workstream_id IS
          // NULL — matches `useKanbanTasks` ordering).
          try {
            let q = supabase
              .from('tasks')
              .select('position')
              .is('deleted_at', null)
              .not('position', 'is', null)
              .order('position', { ascending: true })
              .limit(1);
            if (r.teamId) q = q.eq('workstream_id', r.teamId);
            else q = q.is('workstream_id', null);
            const { data: minRow, error: minErr } = await q.maybeSingle();
            if (minErr) throw minErr;
            // zero-assumption (CLAUDE.md 2026-06-11): if no row found, surface
            // — don't invent a default. minRow null → empty workstream, just
            // assign 0.
            const currentMin =
              (minRow as { position: number } | null)?.position ?? 100;
            const newPos = currentMin - 10;
            const { error: updErr } = await supabase
              .from('tasks')
              .update({ position: newPos })
              .eq('id', r.id);
            if (updErr) throw updErr;
            queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
            flag.success('Ranked to top', r.key);
          } catch (e: unknown) {
            flag.error(
              'Rank failed',
              e instanceof Error ? e.message : String(e),
            );
          }
        },
      },
      {
        id: 'rank-bottom',
        label: 'Rank to bottom',
        icon: <AkArrowDownIcon label="" />,
        onClick: async (r) => {
          try {
            let q = supabase
              .from('tasks')
              .select('position')
              .is('deleted_at', null)
              .not('position', 'is', null)
              .order('position', { ascending: false })
              .limit(1);
            if (r.teamId) q = q.eq('workstream_id', r.teamId);
            else q = q.is('workstream_id', null);
            const { data: maxRow, error: maxErr } = await q.maybeSingle();
            if (maxErr) throw maxErr;
            const currentMax =
              (maxRow as { position: number } | null)?.position ?? 0;
            const newPos = currentMax + 10;
            const { error: updErr } = await supabase
              .from('tasks')
              .update({ position: newPos })
              .eq('id', r.id);
            if (updErr) throw updErr;
            queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['kanban-tasks'] });
            flag.success('Ranked to bottom', r.key);
          } catch (e: unknown) {
            flag.error(
              'Rank failed',
              e instanceof Error ? e.message : String(e),
            );
          }
        },
      },
      {
        id: 'attach',
        label: 'Attach files',
        icon: <AkAttachmentIcon label="" />,
        onClick: (r) => {
          openDetail(r);
          flag.info('Attach files', 'Attachments section in the detail view.');
        },
      },
      // ── Secondary group — Catalyst-specific ─────────────────────────────
      {
        id: 'copy-link',
        label: 'Copy link',
        icon: <AkLinkIcon label="" size="small" />,
        onClick: (r) => {
          // Tasks Hub doesn't have a per-task deeplink route yet. Copy the
          // list URL with an ?openTask=<id> query string so when the route
          // ships it can hydrate the panel on load.
          const url = `${window.location.origin}/tasks/task-list?openTask=${r.id}`;
          navigator.clipboard.writeText(url).then(
            () => flag.success('Link copied'),
            () => flag.error('Copy failed', 'Clipboard access denied'),
          );
        },
      },
      {
        id: 'delete',
        label: 'Delete',
        icon: <AkTrashIcon label="" size="small" />,
        danger: true,
        onClick: async (r) => {
          try {
            await deleteMutation.mutateAsync(r.id);
            flag.success('Deleted', r.key);
          } catch (e: unknown) {
            flag.error(
              'Delete failed',
              e instanceof Error ? e.message : String(e),
            );
          }
        },
      },
    ],
    [openDetail, navigate, queryClient, deleteMutation],
  );

  const { rows, columns, isLoading, error, users } = useTasksTableData({
    onOpen: openDetail,
    getHref: () => '#',
    rowActions,
  });

  // ── Toolbar state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [groupBy, setGroupBy] = useState<TasksGroupBy>('none');
  const [density, setDensity] = useState<'comfortable' | 'compact'>('compact');
  // 2026-06-17 Filters: canonical JiraFilterValue (REUSE FIRST). Drives the
  // JiraFilterAtlaskit drawer below.
  const [filters, setFilters] = useState<JiraFilterValue>(emptyFilterValue);
  const [footerCreateActive, setFooterCreateActive] = useState(false);
  const [inlineCreateSubmitting, setInlineCreateSubmitting] = useState(false);
  const createMutation = useCreateTaskMutation();
  const { data: allWorkstreams = [] } = useTaskWorkstreams();

  // Saved filters (localStorage-backed)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const raw = localStorage.getItem(SAVED_FILTERS_LS_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as SavedFilter[];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  });

  const persistSavedFilters = useCallback((next: SavedFilter[]) => {
    setSavedFilters(next);
    try { localStorage.setItem(SAVED_FILTERS_LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const handleSaveCurrent = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = [...savedFilters.filter((s) => s.name !== trimmed), { name: trimmed, filters }];
    persistSavedFilters(next);
    flag.success('Filter saved', trimmed);
  }, [filters, savedFilters, persistSavedFilters]);

  const handleDeleteSaved = useCallback((name: string) => {
    persistSavedFilters(savedFilters.filter((s) => s.name !== name));
  }, [savedFilters, persistSavedFilters]);

  // ── JiraTable state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set<string>(DEFAULT_VISIBLE_COLUMNS),
  );

  // ── Client-side filter: title/key substring match + JiraFilterValue facets
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasFacets = countActiveFilters(filters) > 0;
    if (!q && !hasFacets) return rows;
    const dueFrom = filters.dateRange.start ?? null;
    const dueTo = filters.dateRange.due ?? null;
    const createdFrom = filters.created.from ?? null;
    const createdTo = filters.created.to ?? null;
    const updatedFrom = filters.updated.from ?? null;
    const updatedTo = filters.updated.to ?? null;
    return rows.filter((r) => {
      if (q && !(r.title.toLowerCase().includes(q) || r.key.toLowerCase().includes(q))) return false;
      if (filters.status.length && !filters.status.includes(r.status)) return false;
      if (filters.priority.length) {
        const mapped = r.priority ? TASK_PRIORITY_TO_FILTER[r.priority] : undefined;
        if (!mapped || !filters.priority.includes(mapped as never)) return false;
      }
      if (filters.assignees.length && (!r.assigneeId || !filters.assignees.includes(r.assigneeId))) return false;
      if (filters.sprintReleases.length && (!r.teamId || !filters.sprintReleases.includes(r.teamId))) return false;
      if (dueFrom || dueTo) {
        const d = r.dueDate ? r.dueDate.slice(0, 10) : null;
        if (!d) return false;
        if (dueFrom && d < dueFrom) return false;
        if (dueTo && d > dueTo) return false;
      }
      if (createdFrom || createdTo) {
        const c = r.createdAt ? r.createdAt.slice(0, 10) : null;
        if (!c) return false;
        if (createdFrom && c < createdFrom) return false;
        if (createdTo && c > createdTo) return false;
      }
      if (updatedFrom || updatedTo) {
        const u = r.updatedAt ? r.updatedAt.slice(0, 10) : null;
        if (!u) return false;
        if (updatedFrom && u < updatedFrom) return false;
        if (updatedTo && u > updatedTo) return false;
      }
      return true;
    });
  }, [rows, search, filters]);

  // ── Grouping — build RowGroup[] from the active Group-by field. When
  // 'none', groups stays undefined and JiraTable paginates the flat rows.
  // (2026-06-17: groupBy was previously set but never consumed — the
  // "Group: Status" control was a no-op. This wires it to JiraTable.groups.)
  const groups = useMemo<RowGroup<PlannerTask>[] | undefined>(() => {
    if (groupBy === 'none') return undefined;
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' ');
    const keyer = (r: PlannerTask): { id: string; label: string } => {
      switch (groupBy) {
        case 'workstream': return { id: r.teamId ?? '__none', label: r.teamName ?? 'No workstream' };
        case 'assignee':   return { id: r.assigneeId ?? '__none', label: r.assigneeName ?? 'Unassigned' };
        case 'priority':   return { id: r.priority ?? '__none', label: cap(r.priority ?? 'None') };
        case 'status':
        default:           return { id: r.status ?? '__none', label: cap(r.status ?? 'No status') };
      }
    };
    const map = new Map<string, RowGroup<PlannerTask>>();
    for (const r of filteredRows) {
      const { id, label } = keyer(r);
      if (!map.has(id)) map.set(id, { id, label, rows: [] });
      map.get(id)!.rows.push(r);
    }
    return Array.from(map.values());
  }, [groupBy, filteredRows]);

  // ── Filter option pools — derived from current rows + users.
  // Workstream filtering is exposed via the canonical "Sprint/Iteration"
  // facet (tasks don't have sprints, so we reuse that section's pill-chip
  // UI). Status uses the canonical lozenge-chip section; assignees the
  // avatar grid. Priority is fixed-vocabulary (Highest/High/Medium/Low/
  // Lowest) and handled internally by JiraFilterAtlaskit.
  const statusOptions = useMemo<StatusFilterOption[]>(() => {
    const seen = new Map<string, StatusFilterOption>();
    for (const r of rows) {
      if (!r.status) continue;
      if (!seen.has(r.status)) {
        const label = r.status.charAt(0).toUpperCase() + r.status.slice(1).replace(/-/g, ' ');
        // Map task status slug → Lozenge appearance for chip color.
        const appearance: StatusFilterOption['appearance'] =
          r.status === 'done' || r.status === 'completed' ? 'success'
          : r.status === 'in_progress' || r.status === 'in-progress' ? 'inprogress'
          : r.status === 'blocked' ? 'removed'
          : 'default';
        seen.set(r.status, { value: r.status, label, appearance });
      }
    }
    return Array.from(seen.values());
  }, [rows]);

  const workstreamSprintOptions = useMemo<SprintReleaseOption[]>(() => {
    const seen = new Map<string, SprintReleaseOption>();
    for (const r of rows) {
      if (!r.teamId || seen.has(r.teamId)) continue;
      seen.set(r.teamId, { id: r.teamId, label: r.teamName ?? r.teamId });
    }
    return Array.from(seen.values());
  }, [rows]);

  const assigneeOptions = useMemo<AssigneeOption[]>(
    () => users.map((u) => ({ id: u.id, name: u.name, avatarUrl: u.avatarUrl })),
    [users],
  );

  // ── AvatarGroup data — full team directory (users with avatars) ─────────
  // Zero-assumption (CLAUDE.md 2026-06-11): drop users with no avatarUrl so
  // the stack doesn't render initials-only placeholders mixed with real
  // avatars. Mirrors Project Hub's `activeAssignees` filter.
  const avatarData = useMemo(
    () =>
      users
        .filter((u) => u.avatarUrl)
        .map((u) => ({ key: u.id, name: u.name, src: u.avatarUrl })),
    [users],
  );

  if (error) {
    return (
      <div style={{ padding: 16, color: 'var(--ds-text-danger, #AE2A19)' }}>
        Error loading tasks.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        background: 'var(--ds-surface, #FFFFFF)',
      }}
    >
      {/* ── Page header (breadcrumb + H1) ──────────────────────────────── */}
      <TasksPageHeader routeWord="Task list" />

      {/* ── Outer bordered card wrapping toolbar + table (Fix 2, 2026-06-16) ─
          Mirrors Project Hub backlog's AtlaskitPageShell card (cardBorder +
          cardPadding props). Tasks Hub doesn't go through AtlaskitPageShell
          so we apply the same border/radius inline. The padding matches the
          shell's `{ x: 24, y: 16 }` so toolbar items inset visually align
          with the table content the same way as Backlog. */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          margin: '16px 24px',
          background: 'var(--ds-surface, #FFFFFF)',
          border: '1px solid var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))',
          borderRadius: 8,
          overflow: 'hidden',
        }}
      >
        {/* ── Toolbar — Project Hub backlog parity (Fix 1, 2026-06-16) ──── */}
        {/* Order mirrors BacklogPage.atlaskit.tsx:3437-3641 exactly:        */}
        {/* mascot AIIntelligenceButton · Search list · Filters · AvatarGroup */}
        {/* · Saved filters · spacer · Group by · sort icon · ⋯ · item count */}
        <div
          style={{
            padding: '32px 24px',
            marginBottom: 4,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            borderBottom: `1px solid ${token('color.border', 'var(--cp-lozenge-grey-bg, var(--cp-border-neutral, #DFE1E6))')}`,
          }}
        >
          {/* Mascot — Ask Caty (matches Backlog L3476-3482). Placeholder
              wiring: opens an info flag until Caty is wired into Tasks. */}
          <div style={{ flexShrink: 0 }}>
            <AIIntelligenceButton
              label="Ask Caty"
              onClick={() => flag.info('Ask Caty', 'Coming to Tasks Hub soon.')}
              tooltip="Ask Caty about these tasks"
            />
          </div>

          {/* Search list — Atlaskit Textfield (matches Backlog L3486-3519). */}
          <div style={{ flex: 1, minWidth: 240, maxWidth: 640 }}>
            <Textfield
              isCompact
              placeholder="Search list"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              elemBeforeInput={
                <span
                  style={{
                    paddingInlineStart: 8,
                    color: token('color.text.subtlest', '#6B778C'),
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <AkSearchIcon label="" size="small" />
                </span>
              }
              elemAfterInput={
                search ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch('')}
                    style={{
                      paddingInlineEnd: 6,
                      display: 'flex',
                      alignItems: 'center',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: token('color.text.subtlest', '#6B778C'),
                      padding: '0 8px 0 4px',
                    }}
                  >
                    <AkCloseIcon label="" size="small" />
                  </button>
                ) : undefined
              }
            />
          </div>

          {/* Filters — canonical JiraFilterAtlaskit (REUSE FIRST, 2026-06-17).
              Tasks pool the supported facets: status (lozenge chips), priority
              (fixed 5-level icon row), assignee (avatar grid), date range
              (start/due), created/updated date ranges. Workstreams ride the
              Sprint/Iteration slot since tasks don't model sprints. Reporter,
              work-type, and labels are intentionally empty — tasks don't
              model them today and the drawer surfaces "none yet" messages. */}
          <div style={{ position: 'relative' }}>
            <JiraFilterAtlaskit
              value={filters}
              onChange={setFilters}
              assignees={assigneeOptions}
              reporters={[]}
              statuses={statusOptions}
              workTypes={[]}
              sprintReleases={workstreamSprintOptions}
              labels={[]}
            />
          </div>

          {/* Avatar group — full team directory (read-only in v1).
              2026-06-16 Fix #3: avatarData was previously empty because
              useTaskUsers didn't select avatar_url. Fixed in useTaskUsers
              (added avatar_url to the SELECT + .avatarUrl field on
              PlannerUser). The AvatarGroup now renders.
              Mirrors BacklogPage activeAssignees AvatarGroup
              (BacklogPage.atlaskit.tsx:3554-3580). */}
          {avatarData.length > 0 && (
            <AvatarGroup
              appearance="stack"
              size="small"
              maxCount={5}
              label="Team members"
              data={avatarData}
            />
          )}

          {/* Saved filters — real localStorage-backed dropdown. */}
          <TasksSavedFiltersControl
            currentFilters={filters}
            saved={savedFilters}
            onSaveCurrent={handleSaveCurrent}
            onApply={setFilters}
            onDelete={handleDeleteSaved}
          />

          <div style={{ flex: 1 }} />

          {/* Group control — single button + chevron + portal dropdown.
              2026-06-16 Fix #5: replaces the old "Group by [native select]"
              pair with one Button matching BacklogPage GroupByControl
              (BacklogPage.atlaskit.tsx:5285). */}
          <TasksGroupByControl value={groupBy} onChange={setGroupBy} />

          {/* View options — row density (Comfortable / Compact). */}
          <TasksIconMenu
            icon={AkFilterIcon}
            label="View options"
            items={[
              { id: 'comfortable', label: 'Comfortable', selected: density === 'comfortable', onClick: () => setDensity('comfortable') },
              { id: 'compact', label: 'Compact', selected: density === 'compact', onClick: () => setDensity('compact') },
            ]}
          />

          {/* More actions — export the current (filtered) rows + refresh. */}
          <TasksIconMenu
            icon={AkMoreIcon}
            label="More actions"
            items={[
              { id: 'export', label: 'Export to CSV', onClick: () => exportRowsToCsv(filteredRows) },
              { id: 'refresh', label: 'Refresh', onClick: () => { void queryClient.invalidateQueries({ queryKey: ['planner-tasks'] }); } },
            ]}
          />

          {/* Item count — right-aligned. Matches Backlog L3628-3640. */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 32,
              padding: '0 12px',
              marginLeft: 8,
              color: token('color.text.subtlest', '#626F86'),
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {filteredRows.length} item{filteredRows.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* ── Table ──────────────────────────────────────────────────────── */}
        {/* Bug 2 fix (2026-06-16): mirror Project Hub backlog table+panel split.
            Outer wrapper has position:relative + flex row to anchor the panel.
            Table container shrinks via paddingRight = panelWidth so the visible
            table edge clears the right-side overlay panel. */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            minHeight: 0,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              // Fix (2026-06-16 evening): table wrap padding bumped to 32px
              // top + sides so the column header sits visibly below the
              // toolbar's bottom border (matches Backlog visual breathing).
              padding: '32px 24px 24px',
              paddingRight: panelTaskId ? panelWidth + 24 : 24,
              transition: 'padding-right 180ms ease',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <JiraTable<PlannerTask>
              data={groups ? undefined : filteredRows}
              groups={groups}
              columns={columns}
              getRowId={(r) => r.id}
              isLoading={isLoading}
              selectable
              selection={selectedIds}
              onSelectionChange={setSelectedIds}
              columnVisibility={visibleColumns}
              onColumnVisibilityChange={setVisibleColumns}
              // 2026-06-16 Fix #1: compact density = 40px row height with
              // 6px y-padding (matches Backlog. JiraTable defaults to
              // 'compact' but pass explicitly to make the intent visible
              // and prevent future config drift).
              density={density}
              totalRowCount={rows.length}
              // 2026-06-16 Fix #9: footer with + Create button (left),
              // "N of M items" + refresh (center). Mirrors BacklogPage's
              // stickyCreateFooter wiring (BacklogPage.atlaskit.tsx:3736).
              // Create is a placeholder until a Tasks create modal lands;
              // surfaces an info flag so users see the affordance. Refresh
              // invalidates ['planner-tasks'] (the canonical Tasks query
              // key — useTaskItems.ts:78).
              enableStickyCreateFooter
              stickyCreateFooter={{
                placeholder: 'Create',
                onActivate: () => setFooterCreateActive(true),
                onRefresh: async () => {
                  await queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
                },
                active: footerCreateActive ? (
                  <TasksInlineCreateRow
                    workstreams={allWorkstreams.map((w) => ({ id: w.id, name: w.name, color: w.color }))}
                    members={(users ?? []).map((u) => ({ key: u.id, name: u.name, src: u.avatarUrl }))}
                    isSubmitting={inlineCreateSubmitting}
                    onCancel={() => setFooterCreateActive(false)}
                    onSubmit={async (title, workstreamId, assignee, dueDate) => {
                      setInlineCreateSubmitting(true);
                      try {
                        await createMutation.mutateAsync({
                          title,
                          workstream_id: workstreamId,
                          assignee_id: assignee?.id,
                          priority: 'medium',
                          start_date: new Date().toISOString(),
                          due_date: dueDate ?? undefined,
                        });
                        flag.success('Task created', title);
                        setFooterCreateActive(false);
                        await queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
                      } catch (e: unknown) {
                        flag.error('Create failed', e instanceof Error ? e.message : String(e));
                      } finally {
                        setInlineCreateSubmitting(false);
                      }
                    }}
                  />
                ) : null,
              }}
            />
          </div>

          {/* ── Detail panel ──────────────────────────────────────────────── */}
          {/* Task 1.5d (2026-06-16) — canonical right-side drag-resizable panel
              (same as Project Hub backlog). Mounts CatalystDetailPanel with
              entityKind='task' so CatalystDetailRouter dispatches to
              TaskCatalystView (reads from `tasks` table). */}
          {panelTaskId && (
            <CatalystDetailPanel
              isOpen
              onClose={closePanel}
              itemId={panelTaskId}
              itemType="Task"
              typeIconLabel="Task"
              projectKey=""
              width={panelWidth}
              onResize={setPanelWidth}
              onResizeCommit={persistPanelWidth}
              minWidth={TASK_PANEL_MIN_W}
              maxWidth={TASK_PANEL_MAX_W}
              entityKind="task"
            />
          )}
        </div>
      </div>

    </div>
  );
}
