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
import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Button, { IconButton } from '@atlaskit/button/new';
import Textfield from '@atlaskit/textfield';
import AvatarGroup from '@atlaskit/avatar-group';
import AkSearchIcon from '@atlaskit/icon/core/search';
import AkCloseIcon from '@atlaskit/icon/core/close';
import AkMoreIcon from '@atlaskit/icon/glyph/more';
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
const GROUP_BY_OPTIONS = [
  { value: 'none', label: 'No grouping' },
  { value: 'status', label: 'Status' },
  { value: 'workstream', label: 'Workstream' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
] as const;

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
  const [groupBy, setGroupBy] = useState<(typeof GROUP_BY_OPTIONS)[number]['value']>('none');

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

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '16px 24px',
          marginBottom: 4,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
        }}
      >
        {/* Search list — Atlaskit Textfield (matches Project Hub). */}
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
                <AkSearchIcon label="" />
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
                  <AkCloseIcon label="" />
                </button>
              ) : undefined
            }
          />
        </div>

        {/* Filters — PLACEHOLDER. Non-functional in v1. */}
        <Button appearance="subtle" onClick={() => { /* TODO Task 1.5c */ }}>
          Filters
        </Button>

        {/* Avatar group — full team directory (read-only in v1). */}
        {avatarData.length > 0 && (
          <AvatarGroup
            appearance="stack"
            size="small"
            maxCount={5}
            label="Team members"
            data={avatarData}
          />
        )}

        {/* Saved filters — PLACEHOLDER. */}
        <Button appearance="subtle" onClick={() => { /* TODO Task 1.5c */ }}>
          Saved filters
        </Button>

        <div style={{ flex: 1 }} />

        {/* Group by — PLACEHOLDER native <select> (visual parity, no functional
            grouping wired yet). Project Hub uses GroupByControl portal pattern
            (overflow-hidden bug workaround). Tasks v1 doesn't need grouping. */}
        <label
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            color: token('color.text.subtlest', '#6B778C'),
          }}
        >
          <span>Group by</span>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as typeof groupBy)}
            style={{
              border: `1px solid ${token('color.border', '#DFE1E6')}`,
              borderRadius: 3,
              padding: '4px 8px',
              fontSize: 13,
              background: token('color.background.input', '#FFFFFF'),
              color: token('color.text', '#172B4D'),
              cursor: 'pointer',
            }}
          >
            {GROUP_BY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        {/* More actions ⋯ — PLACEHOLDER (toolbar-level). The row-level ⋯ menu
            is wired in Task 1.5c via the __actions column. Toolbar-level
            actions (Apply old List settings, Export, Bulk change, etc.) are a
            follow-up. */}
        <IconButton
          appearance="subtle"
          icon={AkMoreIcon}
          label="More actions"
          onClick={() => { /* TODO future task */ }}
        />

        {/* Item count — right-aligned. */}
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
  );
}
