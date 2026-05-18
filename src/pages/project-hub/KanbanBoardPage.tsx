/**
 * KanbanBoardPage — Enterprise-grade Kanban board for ProjectHub
 * Phase 1: Modular layout + DnD + Cards + Density + Dark Mode + Filters + Context Menu
 *
 * Architecture:
 * - Modular components: KanbanColumn, WorkItemCard, KanbanToolbar, KanbanSwimlane
 * - Dynamic columns from actual issue statuses
 * - DnD with optimistic updates + rollback + toast
 * - Card density toggle (compact/dense/comfortable)
 * - Dark mode via useTheme() + ADS dark hex tokens
 * - Filters: search, avatar stack, epic, type, priority, quick filters, group by
 * - Context menu on cards (⋯)
 * - Selection state with left accent bar
 * - All issue types (Story, Epic, Bug, Task, Subtask, Feature, Improvement, etc.)
 */
import React, { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { ProjectHeaderChip } from '@/components/layout/ProjectHeaderChip';
import { ProjectTabBar } from '@/components/layout/ProjectTabBar';
import Button from '@atlaskit/button/new';
import { KanbanToolbar } from '@/components/kanban/toolbar/KanbanToolbar';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { useProjectMemberRole } from '@/modules/project-work-hub/hooks/useProjectMemberRole';
import { useTheme } from '@/hooks/useTheme';
import { usePriToast } from '@/modules/priorities/hooks/usePriToast';
import { PriToastContainer } from '@/modules/priorities/components/PriToastContainer';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

// Kanban modules
import { KANBAN_TOKENS, DENSITY_CONFIG, KANBAN_COLUMNS as DEFAULT_KANBAN_COLUMNS, COL_PRIMARY_STATUS as DEFAULT_COL_PRIMARY_STATUS, STATUS_TO_COL_ID as DEFAULT_STATUS_TO_COL_ID, COLUMN_ID_SET as DEFAULT_COLUMN_ID_SET } from '@/components/kanban/kanban-tokens';
import type { KanbanDensity, KanbanColumnDef } from '@/components/kanban/kanban-tokens';
import type { BoardIssue, GroupByMode, ColMap } from '@/components/kanban/kanban-types';
import { BOARD_SUBTASK_TYPES } from '@/components/kanban/kanban-types';
import { groupIssues, findCol } from '@/components/kanban/kanban-utils';
import { DroppableColumn } from '@/components/kanban/KanbanColumn';
import { OverlayCard } from '@/components/kanban/SortableCard';
import { SwimlaneRow } from '@/components/kanban/KanbanSwimlane';
import { PragmaticBoard } from '@/components/kanban/PragmaticBoard';
import { StandupModal } from '@/components/kanban/StandupModal';
import { useKanbanRealtime } from '@/components/kanban/useKanbanRealtime';
import { useKanbanKeyboard } from '@/components/kanban/useKanbanKeyboard';

import { useKanbanViewSettings } from '@/hooks/useKanbanViewSettings';
import { ENABLE_KANBAN_V2 } from '@/lib/featureFlags';
import { readDensityPref, writeDensityPref } from '@/components/kanban/densityPrefs';
import { statusChangeSchema } from '@/components/kanban/kanban-schemas';
import { useBoardUrlState } from '@/components/kanban/useBoardUrlState';
import {
  type AdvancedFilters,
  EMPTY_ADVANCED_FILTERS, hasActiveAdvancedFilters, countAdvancedFilters,
} from '@/components/kanban/AdvancedFilterPanel';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import type { GroupByOption } from '@/components/shared/GroupByPopover';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

export default function KanbanBoardPage() {
  const { key } = useParams<{ key: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;
  const avatarsByName = useProfileAvatarsByName();
  const qc = useQueryClient();
  const { toasts, dismissToast, success: toastSuccess, error: toastError } = usePriToast();

  /* ═══ STATE ═══ */
  // V2: URL-backed filter hydration. When the flag is off, `initial` resolves
  // to the schema defaults so the existing behavior is preserved exactly.
  const { initial: urlInit, writeToUrl } = useBoardUrlState(ENABLE_KANBAN_V2);
  const [search, setSearch] = useState(urlInit.search);
  const [debSearch, setDebSearch] = useState(urlInit.search);
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set(urlInit.assignees));
  const [selEpics, setSelEpics] = useState<string[]>(urlInit.epics);
  const [selTypes, setSelTypes] = useState<string[]>(urlInit.types);
  const [selPriorities, setSelPriorities] = useState<string[]>(urlInit.priorities);
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByMode>(urlInit.group);
  // V2: density is user-scoped via localStorage (DENSITY_STORAGE_KEY). When
  // the flag is off, density stays hardcoded to 'comfortable' (existing behavior).
  const [density, setDensity] = useState<KanbanDensity>(
    ENABLE_KANBAN_V2 ? readDensityPref('comfortable') : 'comfortable',
  );
  const onDensityChange = useCallback((d: KanbanDensity) => {
    setDensity(d);
    writeDensityPref(d);
  }, []);
  const [selIssueId, setSelIssueId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [colMap, setColMap] = useState<ColMap>({});
  const [showViewSettings, setShowViewSettings] = useState(false);
  const [showBoardMenu, setShowBoardMenu] = useState(false);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [showBasicFilter, setShowBasicFilter] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [collapsedSwimlanes, setCollapsedSwimlanes] = useState<Set<string>>(new Set());
  const [showStandup, setShowStandup] = useState(false);
  const [standupAssignee, setStandupAssignee] = useState<string | null>(null);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');
  const boardSwitcherRef = React.useRef<HTMLDivElement>(null);
  // F3 (Archive) — Archived filter chip. When true, the kanban-issues query
  // inverts archived_at IS NULL → archived_at IS NOT NULL. Admin/owner only;
  // FE gate is cosmetic, RLS enforces server-side.
  const { isAdminOrOwner: canArchive } = useProjectMemberRole(key);
  const [showArchived, setShowArchived] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const d = DENSITY_CONFIG[density];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));


  // Current user ID for realtime suppression
  const { data: currentUserData } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 300_000,
  });

  // View settings
  const { settings: viewSettings, updateSettings: updateViewSettings } = useKanbanViewSettings(key, currentUserData);
  const visibleFields = viewSettings.visibleFields;
  const cardColorMode = viewSettings.cardColorMode;
  const enabledQuickFilters = viewSettings.enabledQuickFilters;

  // Swimlane expand/collapse all handlers
  const handleExpandAll = useCallback(() => setCollapsedSwimlanes(new Set()), []);
  const handleCollapseAll = useCallback(() => {
    // Will be populated with group keys when groups are available
    setCollapsedSwimlanes(prev => {
      const next = new Set(prev);
      groups?.forEach((g: any) => next.add(g.groupKey));
      return next;
    });
  }, []);

  /* Board switcher outside-click */
  useEffect(() => {
    if (!showBoardSwitcher) return;
    function handler(e: MouseEvent) {
      if (boardSwitcherRef.current && !boardSwitcherRef.current.contains(e.target as Node)) {
        setShowBoardSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBoardSwitcher]);

  /* Board-menu outside-click handling now owned by <KanbanToolbar>. */

  // Realtime subscription
  useKanbanRealtime(key, currentUserData ?? null);

  /* ═══ DATA QUERIES ═══ */

  const { data: projMeta } = useQuery({
    queryKey: ['ph-project-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await supabase.from('ph_projects').select('id, key, name').eq('key', key.toUpperCase()).maybeSingle();
      return data;
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  /* ═══ BOARDS LIST (multi-board support) ═══ */

  // FIX: was gated on projMeta?.id (enabled: !!projMeta?.id), forcing a 2-hop
  // waterfall: projMeta→boards. Now uses a PostgREST inner-join on key so
  // both projMeta and project-boards queries fire in parallel on mount.
  const { data: projectBoards = [], refetch: refetchBoards } = useQuery({
    queryKey: ['project-boards', key],
    queryFn: async () => {
      if (!key) return [];
      const { data } = await supabase
        .from('boards')
        .select('id, name, sort_order, ph_projects!inner(key)')
        .eq('ph_projects.key', key.toUpperCase())
        .is('deleted_at', null)
        .order('sort_order');
      return (data ?? []).map((b: any) => ({
        id: b.id, name: b.name, sort_order: b.sort_order,
      })) as { id: string; name: string; sort_order: number }[];
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  // Keep activeBoardId in sync: default to first board when list loads
  useEffect(() => {
    if (projectBoards.length > 0 && !activeBoardId) {
      setActiveBoardId(projectBoards[0].id);
    }
  }, [projectBoards, activeBoardId]);

  /* ═══ DYNAMIC BOARD COLUMNS FROM DB ═══ */

  const resolvedBoardId = activeBoardId ?? projectBoards[0]?.id ?? null;

  const { data: dynamicBoardData } = useQuery({
    queryKey: ['kanban-board-columns', resolvedBoardId],
    queryFn: async () => {
      if (!resolvedBoardId) return null;

      // Get columns
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name, position, status_ids, is_backlog, is_done')
        .eq('board_id', resolvedBoardId)
        .order('position');

      // Get status mappings
      const { data: mappings } = await supabase
        .from('board_status_mappings')
        .select('status_id, status_name, bucket_type, column_id, order_index')
        .eq('board_id', resolvedBoardId)
        .order('order_index');

      if (!cols?.length) return null;
      return { boardId: resolvedBoardId, columns: cols, mappings: mappings ?? [] };
    },
    enabled: !!resolvedBoardId,
    staleTime: 60_000,
  });

  // Build dynamic columns, falling back to hardcoded defaults
  const { KANBAN_COLUMNS, STATUS_TO_COL_ID, COL_PRIMARY_STATUS, COLUMN_ID_SET } = useMemo(() => {
    if (dynamicBoardData?.columns?.length) {
      const cols: KanbanColumnDef[] = dynamicBoardData.columns
        .filter((c: any) => !c.is_backlog)
        .map((c: any) => {
          // Build status list from mappings or status_ids
          const mappedStatuses = dynamicBoardData.mappings
            .filter((m: any) => m.bucket_type === 'column' && m.column_id === c.id)
            .map((m: any) => m.status_name);

          // Fallback to status_ids if no mappings
          let statuses = mappedStatuses.length > 0 ? mappedStatuses : [];
          if (statuses.length === 0 && c.status_ids?.length) {
            // status_ids are UUIDs, we need names — use mappings data
            statuses = dynamicBoardData.mappings
              .filter((m: any) => c.status_ids.includes(m.status_id))
              .map((m: any) => m.status_name);
          }

          const category: 'todo' | 'in_progress' | 'done' = c.is_done ? 'done' : 'in_progress';
          return {
            id: c.id,
            name: c.name.toUpperCase(),
            statuses,
            category,
          };
        });

      const sToCId = new Map<string, string>();
      const cPrimary: Record<string, string> = {};
      cols.forEach(col => {
        if (col.statuses.length > 0) cPrimary[col.id] = col.statuses[0];
        col.statuses.forEach(s => sToCId.set(s.toLowerCase(), col.id));
      });
      const cIdSet = new Set(cols.map(c => c.id));
      return { KANBAN_COLUMNS: cols, STATUS_TO_COL_ID: sToCId, COL_PRIMARY_STATUS: cPrimary, COLUMN_ID_SET: cIdSet };
    }

    // Fallback to defaults
    return {
      KANBAN_COLUMNS: DEFAULT_KANBAN_COLUMNS,
      STATUS_TO_COL_ID: DEFAULT_STATUS_TO_COL_ID,
      COL_PRIMARY_STATUS: DEFAULT_COL_PRIMARY_STATUS,
      COLUMN_ID_SET: DEFAULT_COLUMN_ID_SET,
    };
  }, [dynamicBoardData]);

  const { data: rawIssues = [], isLoading } = useQuery({
    // FIX: projMeta?.id removed from queryKey — was causing double-fetch of all
    // ph_issues (once with id=undefined on mount, again when projMeta resolved).
    // projId is read from TanStack cache inside the queryFn instead.
    queryKey: ['kanban-issues', key, showArchived],
    queryFn: async () => {
      if (!key) return [];
      const PAGE = 1000;

      // Read projMeta from cache — available without a round-trip since
      // ph-project-meta fires in parallel. By the time the first ph_issues
      // page resolves (~400ms), projMeta (~150ms) is already in cache.
      const cachedMeta = qc.getQueryData<{ id: string } | null>(['ph-project-meta', key]);

      // --- parallel fetch: ph_issues (paginated) + catalyst_issues ---
      const fetchJira = async () => {
        let all: any[] = [];
        let from = 0;
        while (true) {
          let q = supabase.from('ph_issues')
            .select('id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, fix_versions, is_flagged, jira_updated_at, jira_created_at, archived_at')
            .eq('project_key', key.toUpperCase())
            .is('deleted_at', null);
          q = showArchived ? q.not('archived_at', 'is', null) : q.is('archived_at', null);
          const { data, error } = await q
            .order('jira_updated_at', { ascending: false })
            .range(from, from + PAGE - 1);
          if (error) throw error;
          if (!data?.length) break;
          all = all.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return all;
      };

      const fetchCatalyst = async () => {
        if (!cachedMeta?.id || showArchived) return [] as any[];
        const { data } = await supabase
          .from('catalyst_issues')
          .select('id, issue_key, title, status, issue_type, priority, assignee_id, parent_key, labels, created_at, updated_at')
          .eq('project_id', cachedMeta.id)
          .order('created_at', { ascending: false });
        return data ?? [];
      };

      // Fire both in parallel — eliminates the sequential catalyst_issues wait.
      const [all, catData] = await Promise.all([fetchJira(), fetchCatalyst()]);

      const jiraIssues: BoardIssue[] = all.map((r: any): BoardIssue => {
        let fv: string | null = null;
        if (r.fix_versions && Array.isArray(r.fix_versions) && r.fix_versions.length > 0) {
          const f = r.fix_versions[0];
          fv = typeof f === 'string' ? f : f?.name ?? null;
        }
        return {
          id: r.id,
          issueKey: r.issue_key,
          summary: r.summary ?? '',
          issueType: r.issue_type ?? 'Task',
          priority: r.priority ?? 'Medium',
          status: r.status ?? 'Backlog',
          statusCategory: r.status_category ?? 'todo',
          assigneeName: r.assignee_display_name,
          labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
          sprintName: r.sprint_name,
          storyPoints: r.story_points ? Number(r.story_points) : null,
          parentKey: r.parent_key,
          parentSummary: r.parent_summary,
          fixVersion: fv,
          isFlagged: !!r.is_flagged,
          updatedAt: r.jira_updated_at,
          createdAt: r.jira_created_at ?? null,
        };
      });

      // Merge in Catalyst-native (in-app created) issues.
      // Jira-wins: skip catalyst rows whose issue_key already exists in ph_issues.
      const seen = new Set(jiraIssues.map(i => i.issueKey).filter(Boolean));
      const catIssues: BoardIssue[] = (catData || [])
        .filter((r: any) => !(r.issue_key && seen.has(r.issue_key)))
        .map((r: any): BoardIssue => ({
          id: r.id,
          issueKey: r.issue_key,
          summary: r.title ?? '',
          issueType: r.issue_type ?? 'Task',
          priority: r.priority ?? 'Medium',
          status: r.status ?? 'Backlog',
          statusCategory: 'todo',
          assigneeName: r.assignee_id ?? null,
          labels: Array.isArray(r.labels) ? (r.labels as string[]) : [],
          sprintName: null,
          storyPoints: null,
          parentKey: r.parent_key ?? null,
          parentSummary: null,
          fixVersion: null,
          isFlagged: false,
          updatedAt: r.updated_at,
          createdAt: r.created_at,
        }));
      return [...catIssues, ...jiraIssues];
    },
    enabled: !!key,
    staleTime: 30_000,
  });

  const issuesById = useMemo(() => {
    const m = new Map<string, BoardIssue>();
    rawIssues.forEach(i => m.set(i.id, i));
    return m;
  }, [rawIssues]);

  // Debounce search
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebSearch(search), 250);
    return () => clearTimeout(timerRef.current);
  }, [search]);

  // V2: sync filter state to the URL. Debounced via debSearch so typing
  // doesn't spam history. Noop when ENABLE_KANBAN_V2 is false (writeToUrl guards).
  useEffect(() => {
    if (!ENABLE_KANBAN_V2) return;
    writeToUrl({
      search: debSearch,
      group: groupBy,
      assignees: Array.from(selAssignees),
      epics: selEpics,
      types: selTypes,
      priorities: selPriorities,
    });
  }, [debSearch, groupBy, selAssignees, selEpics, selTypes, selPriorities, writeToUrl]);

  /* ═══ AGGREGATIONS ═══ */

  const allAssignees = useMemo(() => {
    const m = new Map<string, number>();
    rawIssues.forEach(i => {
      const n = i.assigneeName || 'Unassigned';
      m.set(n, (m.get(n) ?? 0) + 1);
    });
    return Array.from(m.entries()).map(([n, c]) => ({ name: n, count: c })).sort((a, b) => b.count - a.count);
  }, [rawIssues]);

  const allEpics = useMemo(() => {
    const epicSummaryMap = new Map<string, string>();
    rawIssues.forEach(i => { if (i.issueType === 'Epic') epicSummaryMap.set(i.issueKey, i.summary); });
    const m = new Map<string, number>();
    rawIssues.forEach(i => { if (i.parentKey) m.set(i.parentKey, (m.get(i.parentKey) ?? 0) + 1); });
    return Array.from(m.entries()).map(([k, c]) => ({ key: k, summary: epicSummaryMap.get(k) ?? null, count: c })).sort((a, b) => b.count - a.count);
  }, [rawIssues]);

  const allTypes = useMemo(() => {
    const m = new Map<string, number>();
    rawIssues.forEach(i => { m.set(i.issueType, (m.get(i.issueType) ?? 0) + 1); });
    return Array.from(m.entries()).map(([t, c]) => ({ type: t, count: c }));
  }, [rawIssues]);

  /* ═══ CANONICAL FILTER CATEGORIES ═══ */
  const filterCategories: FilterCategory[] = useMemo(() => {
    const epicOptions = allEpics.map(e => ({
      id: e.key,
      label: e.summary || e.key,
      // Only show the key as secondary text when a summary exists — avoids "BAU-XXX BAU-XXX" duplication
      labelExtra: e.summary ? e.key : undefined,
    }));
    const typeOptions = allTypes.map(t => ({
      id: t.type,
      label: t.type,
    }));
    const priorityOptions = ['Critical', 'High', 'Medium', 'Low'].map(p => ({
      id: p,
      label: p,
    }));
    const statusOptions = KANBAN_COLUMNS.map(c => ({
      id: c.name,
      label: c.name,
    }));
    const assigneeOptions2 = allAssignees.map(a => ({
      id: a.name,
      label: a.name,
      avatarUrl: avatarsByName.get(a.name.toLowerCase()) || undefined,
      avatarType: (avatarsByName.get(a.name.toLowerCase()) ? 'photo' : 'person-icon') as 'photo' | 'person-icon',
    }));
    return [
      { id: 'epic', label: 'Epic', options: epicOptions, searchPlaceholder: 'Search epics...' },
      { id: 'type', label: 'Type', options: typeOptions },
      { id: 'priority', label: 'Priority', options: priorityOptions },
      { id: 'status', label: 'Status', options: statusOptions },
      { id: 'assignee', label: 'Assignee', options: assigneeOptions2, searchPlaceholder: 'Search people...' },
    ];
  }, [allEpics, allTypes, allAssignees, avatarsByName, KANBAN_COLUMNS]);

  const filterSelected: Record<string, string[]> = useMemo(() => ({
    epic: selEpics,
    type: selTypes,
    priority: selPriorities,
    status: [],
    assignee: Array.from(selAssignees),
  }), [selEpics, selTypes, selPriorities, selAssignees]);

  const handleFilterChange = useCallback((categoryId: string, optionIds: string[]) => {
    switch (categoryId) {
      case 'epic': setSelEpics(optionIds); break;
      case 'type': setSelTypes(optionIds); break;
      case 'priority': setSelPriorities(optionIds); break;
      case 'assignee': setSelAssignees(new Set(optionIds)); break;
    }
  }, []);

  const basicFilterCount = selEpics.length + selTypes.length + selPriorities.length + selAssignees.size;

  const BOARD_GROUP_OPTIONS: GroupByOption<GroupByMode>[] = useMemo(() => [
    { key: 'none' as GroupByMode, label: 'None' },
    { key: 'queries' as GroupByMode, label: 'Queries' },
    { key: 'assignee' as GroupByMode, label: 'Assignee', icon: 'assignee' },
    { key: 'epic' as GroupByMode, label: 'Epic', icon: 'parent' },
    { key: 'priority' as GroupByMode, label: 'Priority', icon: 'priority' },
    { key: 'fixVersion' as GroupByMode, label: 'Fix Version' },
  ], []);

  // Current user for "Assigned to me"
  const { data: currentUserName } = useQuery({
    queryKey: ['current-user-display-name'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('full_name, jira_display_name').eq('id', user.id).maybeSingle();
      return data?.jira_display_name ?? data?.full_name ?? null;
    },
    staleTime: 300_000,
  });

  /* ═══ FILTERING ═══ */

  const filtered = useMemo(() => {
    // Jira parity: board hides Epics (swimlane metadata) and subtasks by default.
    // When advanced filter specifies issue types, honour exactly those types instead.
    let issues = advancedFilters.issueTypes.length > 0
      ? rawIssues
      : rawIssues.filter(i => i.issueType !== 'Epic' && !BOARD_SUBTASK_TYPES.has(i.issueType));
    if (debSearch.trim()) {
      const q = debSearch.trim().toLowerCase();
      issues = issues.filter(i =>
        i.summary.toLowerCase().includes(q) ||
        i.issueKey.toLowerCase().includes(q) ||
        (i.assigneeName ?? '').toLowerCase().includes(q) ||
        i.labels.some(l => l.toLowerCase().includes(q))
      );
    }
    if (selAssignees.size > 0) issues = issues.filter(i => selAssignees.has(i.assigneeName || 'Unassigned'));
    if (selEpics.length > 0) issues = issues.filter(i => i.parentKey && selEpics.includes(i.parentKey));
    if (selTypes.length > 0) issues = issues.filter(i => selTypes.includes(i.issueType));
    if (selPriorities.length > 0) {
      const normalised = new Set(selPriorities.map(p => p.toLowerCase()));
      issues = issues.filter(i => {
        const pri = (i.priority ?? '').toLowerCase();
        if (normalised.has('critical') && (pri === 'highest' || pri === 'critical')) return true;
        if (normalised.has('high') && pri === 'high') return true;
        if (normalised.has('medium') && pri === 'medium') return true;
        if (normalised.has('low') && (pri === 'low' || pri === 'lowest')) return true;
        return false;
      });
    }
    if (quickFilters.has('assigned-to-me') && currentUserName) {
      issues = issues.filter(i => i.assigneeName?.toLowerCase() === currentUserName.toLowerCase());
    }
    if (quickFilters.has('flagged')) {
      issues = issues.filter(i => i.isFlagged);
    }
    if (quickFilters.has('recently-updated')) {
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      issues = issues.filter(i => i.updatedAt && new Date(i.updatedAt).getTime() > cutoff);
    }
    if (quickFilters.has('high-priority')) {
      issues = issues.filter(i => {
        const p = (i.priority ?? '').toLowerCase();
        return p === 'highest' || p === 'high' || p === 'critical';
      });
    }
    if (quickFilters.has('unassigned')) {
      issues = issues.filter(i => !i.assigneeName);
    }
    if (quickFilters.has('in-progress')) {
      issues = issues.filter(i => i.statusCategory === 'inprogress' || i.statusCategory === 'in_progress');
    }

    // ── Advanced filters ──
    if (advancedFilters.fixVersions.length > 0) {
      const fvSet = new Set(advancedFilters.fixVersions);
      issues = issues.filter(i => i.fixVersion && fvSet.has(i.fixVersion));
    }
    if (advancedFilters.issueTypes.length > 0) {
      const tSet = new Set(advancedFilters.issueTypes);
      issues = issues.filter(i => tSet.has(i.issueType));
    }
    if (advancedFilters.statuses.length > 0) {
      const sSet = new Set(advancedFilters.statuses.map(s => s.toLowerCase()));
      issues = issues.filter(i => sSet.has(i.status.toLowerCase()));
    }
    if (advancedFilters.assignees.length > 0) {
      const aSet = new Set(advancedFilters.assignees);
      issues = issues.filter(i => {
        const name = i.assigneeName || 'Unassigned';
        return aSet.has(name);
      });
    }
    if (advancedFilters.createdAfter) {
      const afterDate = new Date(advancedFilters.createdAfter);
      issues = issues.filter(i => {
        const d = i.createdAt || i.updatedAt;
        if (!d) return false;
        return new Date(d) >= afterDate;
      });
    }
    if (advancedFilters.createdBefore) {
      const beforeDate = new Date(advancedFilters.createdBefore + 'T23:59:59');
      issues = issues.filter(i => {
        const d = i.createdAt || i.updatedAt;
        if (!d) return true;
        return new Date(d) <= beforeDate;
      });
    }

    // Standup: when a person is selected, the board shows only their issues (Jira parity)
    if (standupAssignee) {
      issues = issues.filter(i => (i.assigneeName || 'Unassigned') === standupAssignee);
    }

    return issues;
  }, [rawIssues, debSearch, selAssignees, selEpics, selTypes, selPriorities, quickFilters, currentUserName, advancedFilters, standupAssignee]);

  /* ═══ COLUMN MAPPING ═══ */

  useEffect(() => {
    if (dragId || groupBy !== 'none') return;
    const m: ColMap = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    filtered.forEach(i => {
      const c = STATUS_TO_COL_ID.get(i.status.toLowerCase());
      if (c && m[c]) m[c].push(i.id);
    });
    setColMap(prev => {
      // Only update if changed to prevent infinite loop
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(m);
      return prevStr === newStr ? prev : m;
    });
  }, [filtered, dragId, groupBy, KANBAN_COLUMNS, STATUS_TO_COL_ID]);

  const groups = useMemo(() => groupBy === 'none' ? [] : groupIssues(filtered, groupBy), [filtered, groupBy]);
  const total = groupBy === 'none' ? Object.values(colMap).reduce((a, ids) => a + ids.length, 0) : filtered.length;

  /* ═══ CARD ACTIONS ═══ */

  const handleSaveSummary = useCallback(async (issueId: string, newSummary: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldSummary = issue.summary;
    issue.summary = newSummary;
    try {
      await supabase.from('ph_issues').update({ summary: newSummary } as any).eq('id', issueId);
      await supabase.from('catalyst_issues').update({ title: newSummary } as any).eq('issue_key', issue.issueKey);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.summary = oldSummary;
      toastError('Failed to update summary');
    }
  }, [issuesById, key, qc, toastError]);

  const handleToggleFlag = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const newFlag = !issue.isFlagged;
    issue.isFlagged = newFlag;
    try {
      await supabase.from('ph_issues').update({ is_flagged: newFlag } as any).eq('id', issueId);
      toastSuccess(newFlag ? `Flagged ${issue.issueKey}` : `Unflagged ${issue.issueKey}`);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.isFlagged = !newFlag;
      toastError('Failed to update flag');
    }
  }, [issuesById, key, qc, toastSuccess, toastError]);

  const handleCopyLink = useCallback((issueKey: string) => {
    const url = `${window.location.origin}/project-hub/${key}/issue/${issueKey}`;
    navigator.clipboard.writeText(url).then(
      () => toastSuccess('Link copied'),
      () => toastError('Failed to copy link'),
    );
  }, [key, toastSuccess, toastError]);

  const handleCopyKey = useCallback((issueKey: string) => {
    navigator.clipboard.writeText(issueKey).then(
      () => toastSuccess(`Copied ${issueKey}`),
      () => toastError('Failed to copy key'),
    );
  }, [toastSuccess, toastError]);

  /* ═══ ASSIGNEE CHANGE ═══ */

  const assigneeOptions = useMemo(() => {
    return allAssignees
      .filter(a => a.name !== 'Unassigned')
      .map(a => ({
        name: a.name,
        avatarUrl: avatarsByName.get(a.name.toLowerCase()) || null,
        email: null as string | null,
      }));
  }, [allAssignees, avatarsByName]);

  const handleChangeAssignee = useCallback(async (issueId: string, newAssignee: string | null) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldAssignee = issue.assigneeName;
    issue.assigneeName = newAssignee;
    try {
      await supabase.from('ph_issues').update({ assignee_display_name: newAssignee } as any).eq('id', issueId);
      await supabase.from('catalyst_issues').update({ assignee_id: null } as any).eq('issue_key', issue.issueKey);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.assigneeName = oldAssignee;
      toastError('Failed to update assignee');
    }
  }, [issuesById, key, qc, toastError]);

  /* ═══ LABELS UPDATE ═══ */

  const handleLabelsUpdated = useCallback(async (issueId: string, newLabels: string[]) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldLabels = issue.labels;
    issue.labels = newLabels;
    qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
  }, [issuesById, key, qc]);

  /* ═══ PARENT CHANGE ═══ */

  const handleParentChange = useCallback(async (issueId: string, newParentKey: string | null) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldParentKey = issue.parentKey;
    const oldParentSummary = issue.parentSummary;
    issue.parentKey = newParentKey;
    issue.parentSummary = null;
    try {
      // Fetch parent summary if setting a parent
      let parentSummary: string | null = null;
      if (newParentKey) {
        const { data: parentData } = await supabase.from('ph_issues')
          .select('summary').eq('issue_key', newParentKey).maybeSingle();
        parentSummary = parentData?.summary ?? null;
        issue.parentSummary = parentSummary;
      }
      await supabase.from('ph_issues').update({ parent_key: newParentKey, parent_summary: parentSummary } as any).eq('id', issueId);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.parentKey = oldParentKey;
      issue.parentSummary = oldParentSummary;
      toastError('Failed to update parent');
    }
  }, [issuesById, key, qc, toastError]);

  /* ═══ MOVE WORK ITEM ═══ */

  const handleMoved = useCallback((issueId: string, newProjectKey: string) => {
    toastSuccess(`Moved ${issuesById.get(issueId)?.issueKey ?? 'item'} to ${newProjectKey}`);
    qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
  }, [issuesById, key, qc, toastSuccess]);

  /* ═══ LINK WORK ITEM ═══ */

  const handleLinked = useCallback(() => {
    toastSuccess('Work item linked');
    qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
  }, [key, qc, toastSuccess]);

  /* ═══ ARCHIVE ═══ */

  const handleArchive = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    try {
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      toastSuccess(`Archived ${issue.issueKey}`);
      if (selIssueId === issueId) setSelIssueId(null);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      toastError(`Failed to archive ${issue.issueKey}`);
    }
  }, [issuesById, key, qc, toastSuccess, toastError, selIssueId]);

  /* ═══ DELETE (soft) ═══ */

  const handleDelete = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    try {
      const { error } = await supabase.from('ph_issues').update({ deleted_at: new Date().toISOString() }).eq('id', issueId);
      if (error) throw error;
      toastSuccess(`Deleted ${issue.issueKey}`);
      if (selIssueId === issueId) setSelIssueId(null);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      toastError(`Failed to delete ${issue.issueKey}`);
    }
  }, [issuesById, key, qc, toastSuccess, toastError, selIssueId]);

  /* ═══ DND HANDLERS ═══ */

  const onDragStart = useCallback((e: DragStartEvent) => setDragId(String(e.active.id)), []);

  const resolveColId = useCallback((overId: string): string | null => {
    if (overId.includes('::')) return overId.split('::')[1] ?? null;
    if (COLUMN_ID_SET.has(overId)) return overId;
    return null;
  }, [COLUMN_ID_SET]);

  const onDragOver = useCallback((e: DragOverEvent) => {
    if (groupBy !== 'none') return;
    const aid = String(e.active.id), oid = e.over?.id ? String(e.over.id) : null;
    if (!oid) return;
    setColMap(prev => {
      const from = findCol(prev, aid);
      if (!from) return prev;
      const isCol = COLUMN_ID_SET.has(oid);
      const to = isCol ? oid : findCol(prev, oid);
      if (!to || from === to) return prev;
      const f = [...prev[from]], t = [...prev[to]], idx = f.indexOf(aid);
      if (idx < 0) return prev;
      f.splice(idx, 1);
      if (!isCol) { const oi = t.indexOf(oid); t.splice(oi >= 0 ? oi : 0, 0, aid); } else t.unshift(aid);
      return { ...prev, [from]: f, [to]: t };
    });
  }, [groupBy]);

  const persistStatusChange = useCallback(async (issueId: string, newStatus: string) => {
    // V2: Zod boundary on DnD — guards against empty/whitespace payloads from
    // aborted drags or stale overlay references. Silent noop when invalid so
    // the existing drag-stop UX is preserved.
    if (ENABLE_KANBAN_V2) {
      const parsed = statusChangeSchema.safeParse({ issueId, newStatus });
      if (!parsed.success) return;
    }
    const issue = issuesById.get(issueId);
    if (!issue || issue.status === newStatus) return;
    const oldStatus = issue.status;
    issue.status = newStatus;
    try {
      const { error } = await supabase.from('ph_issues').update({ status: newStatus }).eq('id', issueId);
      if (error) throw error;
      await supabase.from('catalyst_issues').update({ status: newStatus }).eq('issue_key', issue.issueKey);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.status = oldStatus;
      toastError(`Failed to move ${issue.issueKey}`);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    }
  }, [issuesById, key, qc, toastSuccess, toastError]);

  const onDragEnd = useCallback((e: DragEndEvent) => {
    const aid = String(e.active.id), oid = e.over?.id ? String(e.over.id) : null;
    setDragId(null);
    if (!oid) return;

    if (groupBy !== 'none') {
      const targetColId = resolveColId(oid);
      if (!targetColId) return;
      const newStatus = COL_PRIMARY_STATUS[targetColId];
      if (newStatus) persistStatusChange(aid, newStatus);
      return;
    }

    // Flat mode: reorder + persist
    setColMap(prev => {
      const c = findCol(prev, aid);
      if (!c) return prev;
      if (COLUMN_ID_SET.has(oid)) return prev;
      const ids = prev[c], oi = ids.indexOf(aid), ni = ids.indexOf(oid);
      if (oi < 0 || ni < 0 || oi === ni) return prev;
      return { ...prev, [c]: arrayMove(ids, oi, ni) };
    });
    const targetCol = findCol(colMap, aid);
    if (targetCol) {
      const ns = COL_PRIMARY_STATUS[targetCol];
      if (ns) persistStatusChange(aid, ns);
    }
  }, [groupBy, resolveColId, persistStatusChange, colMap]);

  const dragIssue = dragId ? issuesById.get(dragId) : null;

  /* ═══ ACTIVE FILTER COUNT ═══ */
  const advFilterCount = countAdvancedFilters(advancedFilters);
  const activeFilterCount = [
    selAssignees.size > 0,
    selEpics.length > 0,
    selTypes.length > 0,
    selPriorities.length > 0,
    quickFilters.size > 0,
    debSearch.trim().length > 0,
    advFilterCount > 0,
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setSearch(''); setDebSearch('');
    setSelAssignees(new Set());
    setSelEpics([]);
    setSelTypes([]);
    setSelPriorities([]);
    setQuickFilters(new Set());
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  }, []);

  /* ═══ KEYBOARD NAVIGATION ═══ */
  useKanbanKeyboard({
    enabled: !dragId,
    colMap,
    issuesById,
    selectedId: focusedId,
    onSelect: setFocusedId,
    onOpen: (id) => setSelIssueId(id),
    onToggleFlag: handleToggleFlag,
    groupByActive: groupBy !== 'none',
  });

  /* ═══ LOADING STATE ═══ */

  // FIX: removed early skeleton bailout — board chrome (header, toolbar, column
  // names) now renders immediately. Skeleton cards are injected inline per column
  // via the `isLoading` prop so users see board structure at T=0 rather than a
  // blank shell for 1-3 seconds. Jira does the same: structure first, cards hydrate.

  /* ═══ RENDER ═══ */

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: tk.pageBg }}>
      {/* jira-compare catalog item 1 cascade (2026-05-02): canonical
          project chip mounts above the page header. */}
      {key && <ProjectHeaderChip projectKey={key} />}
      {/* ProjectTabBar removed 2026-05-02 per Vikram — sidebar owns nav. */}
      {/* ── Page header with board switcher ── */}
      <div className="flex items-center gap-2" style={{ padding: '0 16px', minHeight: 48, flexShrink: 0, position: 'relative' }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)' }}>
          Board
        </span>
        {/* Board switcher — only shown when multiple boards exist or as entry point */}
        <div ref={boardSwitcherRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowBoardSwitcher(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 28, padding: '0 10px',
              background: showBoardSwitcher ? tk.surfaceHover : 'transparent',
              border: `1px solid ${showBoardSwitcher ? tk.border : 'transparent'}`,
              borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: tk.textSecondary, fontFamily: 'var(--cp-font-body)',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { if (!showBoardSwitcher) e.currentTarget.style.background = tk.surfaceHover; }}
            onMouseLeave={e => { if (!showBoardSwitcher) e.currentTarget.style.background = 'transparent'; }}
          >
            {projectBoards.find(b => b.id === resolvedBoardId)?.name ?? 'Board'}
            <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
          </button>
          {showBoardSwitcher && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                width: 220, background: tk.surfaceBg,
                border: `1px solid ${tk.border}`, borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.16)', zIndex: 60,
                padding: '6px 0',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              {projectBoards.map(b => (
                <button
                  key={b.id}
                  onClick={() => { setActiveBoardId(b.id); setShowBoardSwitcher(false); }}
                  style={{
                    width: '100%', textAlign: 'left', padding: '8px 14px',
                    background: b.id === resolvedBoardId ? 'var(--ds-background-selected, #DEEBFF)' : 'transparent',
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                    color: b.id === resolvedBoardId ? 'var(--ds-link, var(--cp-primary-60, #0052CC))' : tk.textPrimary,
                    fontFamily: 'var(--cp-font-body)',
                  }}
                  onMouseEnter={e => { if (b.id !== resolvedBoardId) e.currentTarget.style.background = tk.surfaceHover; }}
                  onMouseLeave={e => { if (b.id !== resolvedBoardId) e.currentTarget.style.background = 'transparent'; }}
                >
                  {b.name}
                </button>
              ))}
              {projectBoards.length > 0 && <div style={{ height: 1, background: tk.borderSubtle, margin: '4px 8px' }} />}
              <button
                onClick={() => { setShowBoardSwitcher(false); setNewBoardName(''); setShowCreateBoard(true); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 14px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: 500,
                  color: 'var(--ds-link, var(--cp-primary-60, #0052CC))', fontFamily: 'var(--cp-font-body)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = tk.surfaceHover)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                + Create board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Create board dialog */}
      {showCreateBoard && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(9,30,66,0.54)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setShowCreateBoard(false)}
        >
          <div
            style={{
              width: 400, background: tk.surfaceBg, borderRadius: 8,
              padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
              fontFamily: 'var(--cp-font-body)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 18, fontWeight: 600, color: tk.textPrimary, marginBottom: 16, fontFamily: 'var(--cp-font-heading)' }}>
              Create board
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: tk.textMuted, display: 'block', marginBottom: 4 }}>
              BOARD NAME
            </label>
            <input
              autoFocus
              type="text"
              value={newBoardName}
              onChange={e => setNewBoardName(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && newBoardName.trim()) {
                  e.preventDefault();
                  const trimmed = newBoardName.trim();
                  setShowCreateBoard(false);
                  const { data: userData } = await supabase.auth.getUser();
                  const userId = userData.user?.id;
                  if (!userId || !projMeta?.id) return;
                  const { data: newBoard } = await supabase
                    .from('boards')
                    .insert({
                      name: trimmed,
                      project_id: projMeta.id,
                      board_type: 'scrum',
                      created_by: userId,
                      filter_config: {},
                      filter_project_ids: [],
                      sort_order: (projectBoards.length + 1) * 10,
                    } as any)
                    .select('id')
                    .single();
                  if (newBoard?.id) {
                    // Copy columns from the current board if one exists
                    if (resolvedBoardId) {
                      const { data: srcCols } = await supabase
                        .from('board_columns')
                        .select('name, position, status_ids, is_backlog, is_done')
                        .eq('board_id', resolvedBoardId)
                        .order('position');
                      if (srcCols?.length) {
                        await supabase.from('board_columns').insert(
                          srcCols.map(c => ({ ...c, board_id: newBoard.id, id: undefined } as any))
                        );
                      }
                    }
                    await refetchBoards();
                    setActiveBoardId(newBoard.id);
                    qc.invalidateQueries({ queryKey: ['kanban-board-columns', newBoard.id] });
                  }
                }
              }}
              placeholder="e.g. Sprint board"
              style={{
                width: '100%', height: 36, padding: '0 10px',
                border: `2px solid var(--ds-border-focused, #4C9AFF)`,
                borderRadius: 4, fontSize: 14, color: tk.textPrimary,
                background: tk.surfaceBg, outline: 'none', boxSizing: 'border-box',
                fontFamily: 'var(--cp-font-body)',
              }}
            />
            <div style={{ fontSize: 11, color: tk.textMuted, marginTop: 6 }}>Press Enter to create, Escape to cancel</div>
            <div className="flex justify-end gap-2" style={{ marginTop: 20 }}>
              <button
                onClick={() => setShowCreateBoard(false)}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 3,
                  border: `1px solid ${tk.border}`, background: 'transparent',
                  fontSize: 14, cursor: 'pointer', color: tk.textSecondary,
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                Cancel
              </button>
              <button
                disabled={!newBoardName.trim()}
                onClick={async () => {
                  const trimmed = newBoardName.trim();
                  if (!trimmed) return;
                  setShowCreateBoard(false);
                  const { data: userData } = await supabase.auth.getUser();
                  const userId = userData.user?.id;
                  if (!userId || !projMeta?.id) return;
                  const { data: newBoard } = await supabase
                    .from('boards')
                    .insert({
                      name: trimmed,
                      project_id: projMeta.id,
                      board_type: 'scrum',
                      created_by: userId,
                      filter_config: {},
                      filter_project_ids: [],
                      sort_order: (projectBoards.length + 1) * 10,
                    } as any)
                    .select('id')
                    .single();
                  if (newBoard?.id) {
                    if (resolvedBoardId) {
                      const { data: srcCols } = await supabase
                        .from('board_columns')
                        .select('name, position, status_ids, is_backlog, is_done')
                        .eq('board_id', resolvedBoardId)
                        .order('position');
                      if (srcCols?.length) {
                        await supabase.from('board_columns').insert(
                          srcCols.map(c => ({ ...c, board_id: newBoard.id, id: undefined } as any))
                        );
                      }
                    }
                    await refetchBoards();
                    setActiveBoardId(newBoard.id);
                    qc.invalidateQueries({ queryKey: ['kanban-board-columns', newBoard.id] });
                  }
                }}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 3,
                  border: 'none',
                  background: newBoardName.trim() ? 'var(--ds-background-brand-bold, var(--cp-primary-60, #0052CC))' : tk.chipBg,
                  fontSize: 14, cursor: newBoardName.trim() ? 'pointer' : 'not-allowed',
                  color: newBoardName.trim() ? '#FFFFFF' : tk.textMuted,
                  fontFamily: 'var(--cp-font-body)',
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F3: "Show archived" moved into the board ••• menu — no standalone row above toolbar */}
      {showArchived && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 16px', background: 'var(--ds-background-warning-bold, #FFAB00)', color: '#172B4D' }}>
          <span style={{ fontSize: 12, fontWeight: 500, fontFamily: 'var(--cp-font-body)' }}>
            Showing archived issues — restore from the issue overflow menu.
          </span>
          <button
            onClick={() => setShowArchived(false)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#172B4D', fontFamily: 'var(--cp-font-body)', padding: '0 4px' }}
          >
            Exit
          </button>
        </div>
      )}

      {/* ── Toolbar — canonical <KanbanToolbar/> (Phase 1 extraction) ── */}
      {/* Offset matches standup panel width when open */}
      <div style={{ marginLeft: showStandup ? 280 : 0, transition: 'margin-left 200ms ease' }}>
      <KanbanToolbar<GroupByMode>
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
        onClearBasicFilters={() => {
          setSelEpics([]);
          setSelTypes([]);
          setSelPriorities([]);
          setSelAssignees(new Set());
        }}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        groupByOptions={BOARD_GROUP_OPTIONS}
        groupByNoneKey={'none' as GroupByMode}
        activeFilterCount={activeFilterCount}
        onClearAllFilters={clearAllFilters}
        totalIssues={total}
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
        onExpandAll={handleExpandAll}
        onCollapseAll={() => {
          setCollapsedSwimlanes(() => {
            const next = new Set<string>();
            groups?.forEach((g: any) => next.add(g.groupKey));
            return next;
          });
        }}
        enableDensity={ENABLE_KANBAN_V2}
        density={density}
        onDensityChange={onDensityChange}
        mapStatusesPath={`/project-hub/${key}/boards/map-statuses`}
        projectKey={key ?? ''}
        canArchive={canArchive}
        showArchived={showArchived}
        onShowArchivedChange={setShowArchived}
        onStartStandup={() => setShowStandup(true)}
        quickFilters={quickFilters}
        onQuickFiltersChange={setQuickFilters}
        enabledQuickFilters={enabledQuickFilters}
      />
      </div>

      {/* ── Board content (Jira parity: 8px inter-column gap, 16px outer padding) ── */}
      {/* When standup panel is open, offset content 280px to the right (Jira parity) */}
      <div className="flex-1 min-h-0" style={{ overflow: 'auto', padding: '0 16px 16px 16px', marginLeft: showStandup ? 280 : 0, transition: 'margin-left 200ms ease' }}>
        {groupBy !== 'none' ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div style={{ background: 'transparent', minWidth: KANBAN_COLUMNS.length * 267 + (KANBAN_COLUMNS.length - 1) * 8 }}>
              {/* Column headers for swimlane mode (Jira parity: 48h, 267w, transparent) */}
              <div className="flex sticky top-0 z-20" style={{ background: tk.pageBg, gap: 8, paddingBottom: 4 }}>
                {KANBAN_COLUMNS.map((col) => {
                  const count = groups.reduce((sum, g) => sum + g.issueIds.filter(id => {
                    const issue = issuesById.get(id);
                    return issue ? STATUS_TO_COL_ID.get(issue.status.toLowerCase()) === col.id : false;
                  }).length, 0);
                  // jira-compare 2026-05-08: fix category dot colors + column header typography to match PragmaticBoard patch
                  const categoryDot = col.category === 'done' ? '#94C748' : col.category === 'in_progress' ? '#669DF1' : '#5E6C84';
                  return (
                    <div key={col.id} className="flex items-center gap-2" style={{
                      width: 267, minWidth: 267, maxWidth: 267, height: 48, flexShrink: 0,
                      padding: '0 12px',
                      background: tk.surfaceAlt,
                      borderRadius: '6px 6px 0 0',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: tk.textMuted, flex: 1, lineHeight: '16px', fontFamily: 'var(--cp-font-body)' }}>{col.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, color: tk.textMuted, lineHeight: '16px', fontFamily: 'var(--cp-font-body)' }}>{count}</span>
                    </div>
                  );
                })}
              </div>

              {/* Swimlane rows */}
              {groups.map(g => (
                <SwimlaneRow
                  key={g.groupKey}
                  group={g}
                  mode={groupBy}
                  issuesById={issuesById}
                  avatarsByName={avatarsByName}
                  onCardClick={id => setSelIssueId(id)}
                  defaultOpen={!collapsedSwimlanes.has(g.groupKey)}
                  d={d}
                  tk={tk}
                  selectedId={selIssueId}
                  onToggleFlag={handleToggleFlag}
                  onCopyLink={handleCopyLink}
                  onCopyKey={handleCopyKey}
                  onChangeStatus={persistStatusChange}
                  onSaveSummary={handleSaveSummary}
                  onChangeAssignee={handleChangeAssignee}
                  assigneeOptions={assigneeOptions}
                  projectKey={key ?? ''}
                  onLabelsUpdated={handleLabelsUpdated}
                  onParentChange={handleParentChange}
                  onArchive={handleArchive}
                  onDelete={handleDelete}
                  onMoved={handleMoved}
                  onLinked={handleLinked}
                  visibleFields={visibleFields}
                  cardColorMode={cardColorMode}
                  columns={KANBAN_COLUMNS}
                  statusToColId={STATUS_TO_COL_ID}
                />
              ))}
              {groups.length === 0 && (
                <div className="flex items-center justify-center py-12" style={{ color: tk.textDisabled, fontSize: 13 }}>
                  No issues match filters
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragIssue ? <OverlayCard issue={dragIssue} avatarUrl={dragIssue.assigneeName ? avatarsByName.get(dragIssue.assigneeName.toLowerCase()) : null} d={d} tk={tk} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          /* Pragmatic drag-and-drop path (non-swimlane).
             Monitor-based reconciliation; host owns colMap + supabase persist. */
          <PragmaticBoard
            columns={KANBAN_COLUMNS}
            colMap={colMap}
            issuesById={issuesById}
            avatarsByName={avatarsByName}
            onCardClick={id => setSelIssueId(id)}
            d={d}
            tk={tk}
            selectedId={selIssueId}
            focusedId={focusedId}
            isLoading={isLoading}
            onToggleFlag={handleToggleFlag}
            onCopyLink={handleCopyLink}
            onCopyKey={handleCopyKey}
            onChangeStatus={persistStatusChange}
            onSaveSummary={handleSaveSummary}
            onChangeAssignee={handleChangeAssignee}
            assigneeOptions={assigneeOptions}
            projectKey={key ?? ''}
            onLabelsUpdated={handleLabelsUpdated}
            onParentChange={handleParentChange}
            onArchive={handleArchive}
            onDelete={handleDelete}
            onMoved={handleMoved}
            onLinked={handleLinked}
            visibleFields={visibleFields}
            cardColorMode={cardColorMode}
            onDrop={({ cardId, sourceColId, destColId, insertIndex }) => {
              /* 1. Optimistic local reorder. */
              setColMap(prev => {
                const next: typeof prev = { ...prev };
                const src = [...(next[sourceColId] ?? [])];
                const srcIdx = src.indexOf(cardId);
                if (srcIdx < 0) return prev;
                src.splice(srcIdx, 1);
                if (destColId === sourceColId) {
                  src.splice(insertIndex, 0, cardId);
                  next[sourceColId] = src;
                } else {
                  const dst = [...(next[destColId] ?? [])];
                  dst.splice(insertIndex, 0, cardId);
                  next[sourceColId] = src;
                  next[destColId] = dst;
                }
                return next;
              });
              /* 2. Persist status change on column switch.
                 Same-column reorders are UI-only (no status change). */
              if (destColId !== sourceColId) {
                const newStatus = COL_PRIMARY_STATUS[destColId];
                if (newStatus) persistStatusChange(cardId, newStatus);
              }
            }}
          />
        )}
      </div>

      {/* ── Detail panel ── */}
      {selIssueId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={true}
            onClose={() => setSelIssueId(null)}
            itemId={issuesById.get(selIssueId)?.issueKey ?? selIssueId}
            itemType={issuesById.get(selIssueId)?.issueType ?? undefined}
            projectId={projMeta?.id ?? ''}
            projectKey={key}
          />
        </Suspense>
      )}
      {showStandup && (
        <StandupModal
          issues={standupAssignee ? rawIssues.filter(i => i.issueType !== 'Epic' && !BOARD_SUBTASK_TYPES.has(i.issueType)) : filtered}
          avatarsByName={avatarsByName}
          tk={tk}
          onPersonChange={name => setStandupAssignee(name === 'Unassigned' ? null : name)}
          onClose={() => { setStandupAssignee(null); setShowStandup(false); }}
        />
      )}
      <PriToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
