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
import AvatarGroup from '@atlaskit/avatar-group';
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
import { JiraTable, flag, type RowAction } from '@/components/shared/JiraTable';
import { AIIntelligenceButton } from '@/components/ui/AIIntelligenceButton';
import { supabase } from '@/integrations/supabase/client';
import { useTasksTableData } from '@/modules/tasks/hooks/useTasksTableData';
import { useDeletePlannerTask } from '@/modules/tasks/hooks/useTaskItems';
import { DEFAULT_VISIBLE_COLUMNS } from '@/modules/tasks/columns/tasksListColumns';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import { CatalystDetailPanel } from '@/components/shared/CatalystDetailPanel';
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

  // 2026-06-16 Fix #6: Saved filters count placeholder. Real wiring lands when
  // Tasks Hub gets filter persistence (BacklogSavedFiltersDropdown reads from
  // `filters` table scoped to project). For now omit suffix when 0.
  const savedFiltersCount = 0;

  // ── JiraTable state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    () => new Set<string>(DEFAULT_VISIBLE_COLUMNS),
  );

  // ── Client-side filter: title/key substring match (case-insensitive) ─────
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      r.title.toLowerCase().includes(q) || r.key.toLowerCase().includes(q),
    );
  }, [rows, search]);

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

          {/* Filters — PLACEHOLDER. Non-functional in v1.
              2026-06-16 Fix #4: chevron caret after the label matches
              BacklogPage's JiraFilterAtlaskit trigger which uses an
              iconAfter glyph (BacklogPage.atlaskit.tsx:3521). */}
          <Button
            appearance="subtle"
            iconAfter={(iconProps) => <AkChevronDownIcon {...iconProps} label="" size="small" />}
            onClick={() => { /* TODO */ }}
          >
            Filters
          </Button>

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

          {/* Saved filters — PLACEHOLDER.
              2026-06-16 Fix #6: show `Saved filters (N)` when N > 0; omit
              the suffix at 0 to avoid the always-on "Saved filters (0)"
              noise. Mirrors BacklogSavedFiltersDropdown's label format
              (BacklogPage.atlaskit.tsx:7598-7600). */}
          <Button appearance="subtle" onClick={() => { /* TODO */ }}>
            {savedFiltersCount > 0 ? `Saved filters (${savedFiltersCount})` : 'Saved filters'}
          </Button>

          <div style={{ flex: 1 }} />

          {/* Group control — single button + chevron + portal dropdown.
              2026-06-16 Fix #5: replaces the old "Group by [native select]"
              pair with one Button matching BacklogPage GroupByControl
              (BacklogPage.atlaskit.tsx:5285). */}
          <TasksGroupByControl value={groupBy} onChange={setGroupBy} />

          {/* View options (sort/density) — PLACEHOLDER. Matches Backlog's
              `toolbarViewOptionsButton` icon (AkFilterIcon). */}
          <IconButton
            appearance="subtle"
            icon={AkFilterIcon}
            label="View options"
            onClick={() => { /* TODO future task */ }}
          />

          {/* More actions ⋯ — PLACEHOLDER (toolbar-level). The row-level ⋯
              menu is wired via the __actions column. */}
          <IconButton
            appearance="subtle"
            icon={AkMoreIcon}
            label="More actions"
            onClick={() => { /* TODO future task */ }}
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
              paddingRight: panelTaskId ? panelWidth : 0,
              transition: 'padding-right 180ms ease',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <JiraTable<PlannerTask>
              data={filteredRows}
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
              density="compact"
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
                onActivate: () => flag.info('Create task', 'Inline task create lands in a follow-up.'),
                onRefresh: async () => {
                  await queryClient.invalidateQueries({ queryKey: ['planner-tasks'] });
                },
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
