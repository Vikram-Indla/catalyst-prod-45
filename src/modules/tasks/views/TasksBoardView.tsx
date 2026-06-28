/**
 * TasksBoardView — Tasks Hub board view.
 *
 * Phase 2 of the Tasks Hub canonical alignment plan (2026-06-16). Replaces
 * the custom `BoardKanban` (dnd-kit) with the canonical PragmaticBoard +
 * KanbanToolbar pair that ships every other Catalyst board (project,
 * product, incident, ideas).
 *
 * REUSE FIRST (CLAUDE.md P0):
 *   - PragmaticBoard for the board grid + drag-and-drop
 *   - KanbanToolbar for the toolbar chrome
 *   - tasksKanbanSource for data adaptation (tasks -> BoardIssue/colMap)
 *   - tasksKanbanMutations for drop persistence + row-menu status change
 *   - TasksPageHeader for breadcrumb + H1 (same as TasksTaskListView)
 *   - CatalystDetailPanel (entityKind='task') for the side drawer
 *   - useKanbanViewSettings for density / visible fields persistence
 *
 * Tasks-specific decisions:
 *   - groupByOptions: 'none' | 'workstream' | 'assignee' | 'priority'
 *     (NO epic, NO type — tasks have no epic/no Jira type)
 *   - hasSwimlanes: groupBy !== 'none' (forwards to PragmaticBoard
 *     swimlaneOf). v1 uses the canonical swimlane rendering inside
 *     PragmaticBoard; only the lane resolver is task-specific.
 *   - canArchive: false (tasks have no is_archived column today)
 *   - onStartStandup / onRenameBoard / mapStatusesPath: not wired in v1
 *
 * Persistence:
 *   - density + visibleFields stored via useKanbanViewSettings keyed on
 *     ('tasks-hub' projectKey, current user). This namespace keeps tasks
 *     settings separate from any project's BAU board.
 */
import { useCallback, useMemo, useState, Suspense, lazy } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { TasksPageHeader } from '@/modules/tasks/components/TasksPageHeader';
import { PragmaticBoard } from '@/components/kanban/PragmaticBoard';
import { KanbanToolbar } from '@/components/kanban/toolbar/KanbanToolbar';
import {
  KANBAN_TOKENS,
  DENSITY_CONFIG,
  type KanbanDensity,
} from '@/components/kanban/kanban-tokens';
import { useTheme } from '@/hooks/useTheme';
import { useKanbanViewSettings } from '@/hooks/useKanbanViewSettings';
import {
  EMPTY_ADVANCED_FILTERS,
  countAdvancedFilters,
  type AdvancedFilters,
} from '@/components/kanban/AdvancedFilterPanel';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import type { GroupByOption } from '@/components/shared/GroupByPopover';
import type { BoardIssue } from '@/components/kanban/kanban-types';
import { useTasksKanbanSource, useTasksKanbanMutations, buildColMap } from '@/modules/tasks/sources/tasksKanbanSource';

const CatalystDetailPanel = lazy(() =>
  import('@/components/shared/CatalystDetailPanel').then((m) => ({
    default: m.CatalystDetailPanel,
  })),
);

/* ═══ Tasks-Hub group-by options ═══
   Tasks have no type / no epic. Options match what tasks data actually
   supports: workstream, assignee, priority — and 'none' as the default. */
type TasksGroupBy = 'none' | 'workstream' | 'assignee' | 'priority';
const GROUP_BY_OPTIONS: GroupByOption<TasksGroupBy>[] = [
  { key: 'none', label: 'None' },
  { key: 'workstream', label: 'Workstream' },
  { key: 'assignee', label: 'Assignee', icon: 'assignee' },
  { key: 'priority', label: 'Priority', icon: 'priority' },
];

/* Stable namespace for useKanbanViewSettings so tasks density/visibleFields
   are scoped per-user but don't collide with project boards. */
const TASKS_HUB_PROJECT_KEY = 'tasks-hub';

/* Detail panel sizing — mirrors TasksTaskListView. */
const TASK_PANEL_MIN_W = 400;
const TASK_PANEL_MAX_W = 900;
const TASK_PANEL_DEFAULT_W = 600;
const TASK_PANEL_LS_KEY = 'tasks-hub-board-panel-width';

export default function TasksBoardView() {
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;

  // ── Current user id (for kanban view settings) ──────────────────────────
  const { data: currentUserData } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 300_000,
  });

  // ── View settings (density + visibleFields) ─────────────────────────────
  const { settings: viewSettings, updateSettings: updateViewSettings } =
    useKanbanViewSettings(TASKS_HUB_PROJECT_KEY, currentUserData);

  // ── Density (driven by view settings; persisted via JSONB) ──────────────
  // The view-settings hook stores density inside visibleFields piggyback.
  // For tasks we keep density local + default to 'comfortable' until the
  // user picks one; the canonical settings hook doesn't separately track
  // density yet on the read shape.
  const [density, setDensity] = useState<KanbanDensity>('comfortable');
  const d = DENSITY_CONFIG[density];

  // ── Data source ─────────────────────────────────────────────────────────
  const {
    columns,
    issuesById,
    rawIssues,
    avatarsByName,
    allAssignees,
    assigneeOptions,
    users,
    statuses,
    isLoading,
    error,
    statusBySlug,
  } = useTasksKanbanSource();

  // ── Mutations ───────────────────────────────────────────────────────────
  const { persistDrop, persistStatusChange } = useTasksKanbanMutations(statuses);

  // ── Toolbar state ───────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<TasksGroupBy>('none');

  // Basic filter popover (status / priority / workstream / assignee).
  const [showBasicFilter, setShowBasicFilter] = useState(false);
  const [filterSelected, setFilterSelected] = useState<Record<string, string[]>>({});

  // Board chrome menus
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);

  // Selected / focused card
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focusedId] = useState<string | null>(null);

  // Detail panel width (persisted)
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

  // ── Workstreams sourced from users / issues (for the basic filter) ──────
  // Tasks reference workstream_id but the BoardIssue mapping doesn't carry
  // it. For the v1 filter we surface only the dimensions the BoardIssue
  // carries — Status, Priority, Assignee. Workstream filtering is a
  // follow-up (would need adding workstream_id to BoardIssue or routing
  // through useTaskWorkstreams here).

  // ── Filter categories (Status / Priority / Assignee) ────────────────────
  const filterCategories = useMemo<FilterCategory[]>(() => {
    const statusOpts = statuses.map((s) => ({ id: s.slug, label: s.name }));
    const priorityOpts = [
      { id: 'critical', label: 'Critical' },
      { id: 'high', label: 'High' },
      { id: 'medium', label: 'Medium' },
      { id: 'low', label: 'Low' },
    ];
    const assigneeOpts = users
      .filter((u) => u.name)
      .map((u) => ({ id: u.name, label: u.name }));
    return [
      { id: 'status', label: 'Status', options: statusOpts },
      { id: 'priority', label: 'Priority', options: priorityOpts },
      { id: 'assignee', label: 'Assignee', options: assigneeOpts },
    ];
  }, [statuses, users]);

  const basicFilterCount = useMemo(
    () =>
      Object.values(filterSelected).reduce((sum, arr) => sum + arr.length, 0) +
      selAssignees.size,
    [filterSelected, selAssignees],
  );

  const advFilterCount = useMemo(() => countAdvancedFilters(advancedFilters), [advancedFilters]);
  const activeFilterCount = basicFilterCount + advFilterCount + (search.trim() ? 1 : 0);

  // ── Filter pipeline ─────────────────────────────────────────────────────
  // Applied in order: assignee stack -> basic filter -> search.
  const filteredIssues = useMemo(() => {
    let list: BoardIssue[] = rawIssues;

    // Avatar stack selection (KanbanToolbar's AvatarStackFilter).
    if (selAssignees.size > 0) {
      list = list.filter((i) => i.assigneeName && selAssignees.has(i.assigneeName));
    }

    // Basic filter selections.
    const statusSel = filterSelected.status ?? [];
    if (statusSel.length > 0) {
      const set = new Set(statusSel.map((s) => s.toLowerCase()));
      list = list.filter((i) => set.has(i.status.toLowerCase()));
    }
    const prioritySel = filterSelected.priority ?? [];
    if (prioritySel.length > 0) {
      const set = new Set(prioritySel.map((p) => p.toLowerCase()));
      list = list.filter((i) => set.has(i.priority.toLowerCase()));
    }
    const assigneeSel = filterSelected.assignee ?? [];
    if (assigneeSel.length > 0) {
      const set = new Set(assigneeSel);
      list = list.filter((i) => i.assigneeName && set.has(i.assigneeName));
    }

    // Search (title + key, case-insensitive).
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.summary.toLowerCase().includes(q) ||
          i.issueKey.toLowerCase().includes(q),
      );
    }

    return list;
  }, [rawIssues, selAssignees, filterSelected, search]);

  // Rebuild colMap from the filtered issue set so the board only renders
  // visible cards. PragmaticBoard treats colMap as the source of truth.
  const colMapFiltered = useMemo(
    () => buildColMap(filteredIssues, statusBySlug),
    [filteredIssues, statusBySlug],
  );

  // Swimlane resolver per groupBy. PragmaticBoard takes a function that
  // returns the lane key for an issue (or null/undefined for an
  // "Unassigned" lane).
  const swimlaneOf = useMemo(() => {
    if (groupBy === 'none') return undefined;
    if (groupBy === 'priority') {
      return (issue: BoardIssue) => issue.priority || null;
    }
    if (groupBy === 'assignee') {
      return (issue: BoardIssue) => issue.assigneeName;
    }
    if (groupBy === 'workstream') {
      // The BoardIssue type doesn't carry workstream_id. For v1, swimlane
      // by workstream is a no-op (single 'All' lane). Documented as a
      // follow-up — needs workstream_id added to BoardIssue.
      return (_issue: BoardIssue) => null;
    }
    return undefined;
  }, [groupBy]);

  // ── Toolbar callbacks ───────────────────────────────────────────────────
  const handleFilterChange = useCallback((categoryKey: string, values: string[]) => {
    setFilterSelected((prev) => ({ ...prev, [categoryKey]: values }));
  }, []);
  const handleClearBasicFilters = useCallback(() => {
    setFilterSelected({});
    setSelAssignees(new Set());
  }, []);
  const handleClearAllFilters = useCallback(() => {
    setFilterSelected({});
    setSelAssignees(new Set());
    setSearch('');
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  }, []);

  // ── Card click → open detail panel ──────────────────────────────────────
  const handleCardClick = useCallback((id: string) => setSelectedId(id), []);
  const closeDetail = useCallback(() => setSelectedId(null), []);

  // ── Render ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ padding: 16, color: 'var(--ds-text-danger)' }}>
        Error loading board.
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
        background: 'var(--ds-surface)',
      }}
    >
      {/* ── Page header (breadcrumb + H1) ──────────────────────────────── */}
      <TasksPageHeader routeWord="Board" />

      {/* ── Canonical toolbar ─────────────────────────────────────────── */}
      <KanbanToolbar<TasksGroupBy>
        tk={tk}
        search={search}
        onSearchChange={setSearch}
        allAssignees={allAssignees}
        selAssignees={selAssignees}
        onSelAssigneesChange={setSelAssignees}
        avatarsByName={avatarsByName}
        basicFilterCount={basicFilterCount}
        showBasicFilter={showBasicFilter}
        onShowBasicFilterChange={setShowBasicFilter}
        filterCategories={filterCategories}
        filterSelected={filterSelected}
        onFilterChange={handleFilterChange}
        onClearBasicFilters={handleClearBasicFilters}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupByOptions={GROUP_BY_OPTIONS}
        groupByNoneKey="none"
        activeFilterCount={activeFilterCount}
        onClearAllFilters={handleClearAllFilters}
        totalIssues={filteredIssues.length}
        showBoardMenu={showBoardMenu}
        onShowBoardMenuChange={setShowBoardMenu}
        showViewSettings={showViewSettings}
        onShowViewSettingsChange={setShowViewSettings}
        showAdvancedFilter={showAdvancedFilter}
        onShowAdvancedFilterChange={setShowAdvancedFilter}
        advancedFilters={advancedFilters}
        onAdvancedFiltersChange={setAdvancedFilters}
        advFilterCount={advFilterCount}
        viewSettings={viewSettings}
        onUpdateViewSettings={updateViewSettings}
        onExpandAll={() => { /* swimlanes not collapsible in v1 */ }}
        onCollapseAll={() => { /* swimlanes not collapsible in v1 */ }}
        hasSwimlanes={groupBy !== 'none'}
        enableDensity
        density={density}
        onDensityChange={setDensity}
        projectKey={TASKS_HUB_PROJECT_KEY}
      />

      {/* ── Board ───────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'auto',
          padding: '0 16px 16px 16px',
          display: 'flex',
          minHeight: 0,
        }}
      >
        <PragmaticBoard
          columns={columns}
          colMap={colMapFiltered}
          issuesById={issuesById}
          avatarsByName={avatarsByName}
          onCardClick={handleCardClick}
          d={d}
          tk={tk}
          selectedId={selectedId}
          focusedId={focusedId}
          isLoading={isLoading}
          swimlaneOf={swimlaneOf}
          assigneeOptions={assigneeOptions}
          projectKey={TASKS_HUB_PROJECT_KEY}
          visibleFields={viewSettings.visibleFields}
          cardColorMode={viewSettings.cardColorMode}
          boardColumns={columns}
          onChangeStatus={persistStatusChange}
          onDrop={persistDrop}
        />
      </div>

      {/* ── Detail panel ──────────────────────────────────────────────── */}
      {selectedId && (
        <Suspense fallback={null}>
          <CatalystDetailPanel
            isOpen
            onClose={closeDetail}
            itemId={selectedId}
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
        </Suspense>
      )}
    </div>
  );
}
