/**
 * KanbanBoardPage — Enterprise-grade Kanban board for ProjectHub
 * Phase 1: Modular layout + DnD + Cards + Density + Dark Mode + Filters + Context Menu
 *
 * Architecture:
 * - Modular components: KanbanColumn, WorkItemCard, KanbanToolbar, KanbanSwimlane
 * - Dynamic columns from actual issue statuses
 * - DnD with optimistic updates + rollback + toast
 * - Card density toggle (compact/dense/comfortable)
 * - Dark mode via useTheme() + Nocturne Geist hex tokens
 * - Filters: search, avatar stack, epic, type, priority, quick filters, group by
 * - Context menu on cards (⋯)
 * - Selection state with left accent bar
 * - All issue types (Story, Epic, Bug, Task, Subtask, Feature, Improvement, etc.)
 */
import React, { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';

/* ═══ Board Menu Item (enterprise styling) ═══ */
function BoardMenuItem({ icon, label, badge, onClick }: {
  icon: React.ReactNode; label: string; badge?: number; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full"
      style={{
        padding: '10px 16px', background: 'transparent', border: 'none',
        cursor: 'pointer', fontSize: 14, color: '#172B4D', fontWeight: 450,
        textAlign: 'left', fontFamily: "'Inter', sans-serif",
        transition: 'background 80ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#F4F5F7')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}
      <span style={{ flex: 1 }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#FFFFFF',
          background: '#0052CC', borderRadius: 10, padding: '1px 8px',
          lineHeight: '18px',
        }}>{badge}</span>
      )}
    </button>
  );
}
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
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
import { groupIssues, findCol } from '@/components/kanban/kanban-utils';
import { DroppableColumn } from '@/components/kanban/KanbanColumn';
import { OverlayCard } from '@/components/kanban/SortableCard';
import { SwimlaneRow } from '@/components/kanban/KanbanSwimlane';
import {
  AvatarStackFilter,
} from '@/components/kanban/KanbanToolbar';
import { useKanbanRealtime } from '@/components/kanban/useKanbanRealtime';
import { useKanbanKeyboard } from '@/components/kanban/useKanbanKeyboard';

import { Search, MoreHorizontal, Settings2, Map as MapIcon, Filter } from 'lucide-react';
import { useKanbanViewSettings } from '@/hooks/useKanbanViewSettings';
import { ViewSettingsPanel } from '@/components/kanban/ViewSettingsPanel';
import {
  AdvancedFilterPanel, type AdvancedFilters,
  EMPTY_ADVANCED_FILTERS, hasActiveAdvancedFilters, countAdvancedFilters,
} from '@/components/kanban/AdvancedFilterPanel';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { GroupByPopover } from '@/components/shared/GroupByPopover';
import type { GroupByOption } from '@/components/shared/GroupByPopover';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

const DENSITY_STORAGE_KEY = 'kanban-density';

export default function KanbanBoardPage() {
  const { key } = useParams<{ key: string }>();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;
  const avatarsByName = useProfileAvatarsByName();
  const qc = useQueryClient();
  const { toasts, dismissToast, success: toastSuccess, error: toastError } = usePriToast();

  /* ═══ STATE ═══ */
  const [search, setSearch] = useState('');
  const [debSearch, setDebSearch] = useState('');
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set());
  const [selEpics, setSelEpics] = useState<string[]>([]);
  const [selTypes, setSelTypes] = useState<string[]>([]);
  const [selPriorities, setSelPriorities] = useState<string[]>([]);
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByMode>('none');
  const density: KanbanDensity = 'comfortable';
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

  // Close board menu on outside click
  const boardMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showBoardMenu) return;
    function handler(e: MouseEvent) {
      if (boardMenuRef.current && !boardMenuRef.current.contains(e.target as Node)) {
        setShowBoardMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showBoardMenu]);

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

  /* ═══ DYNAMIC BOARD COLUMNS FROM DB ═══ */

  const { data: dynamicBoardData } = useQuery({
    queryKey: ['kanban-board-columns', projMeta?.id],
    queryFn: async () => {
      if (!projMeta?.id) return null;
      // Find the board for this project
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('project_id', projMeta.id)
        .is('deleted_at', null)
        .limit(1);
      const boardId = boards?.[0]?.id;
      if (!boardId) return null;

      // Get columns
      const { data: cols } = await supabase
        .from('board_columns')
        .select('id, name, position, status_ids, is_backlog, is_done')
        .eq('board_id', boardId)
        .order('position');

      // Get status mappings
      const { data: mappings } = await supabase
        .from('board_status_mappings')
        .select('status_id, status_name, bucket_type, column_id, order_index')
        .eq('board_id', boardId)
        .order('order_index');

      if (!cols?.length) return null;
      return { boardId, columns: cols, mappings: mappings ?? [] };
    },
    enabled: !!projMeta?.id,
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
    queryKey: ['kanban-issues', key],
    queryFn: async () => {
      if (!key) return [];
      const PAGE = 1000;
      let all: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase.from('ph_issues')
          .select('id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, fix_versions, is_flagged, jira_updated_at, jira_created_at')
          .eq('project_key', key.toUpperCase())
          .is('deleted_at', null)
          .order('jira_updated_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        all = all.concat(data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      return all.map((r: any): BoardIssue => {
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
      labelExtra: e.key,
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
    // By default show only Stories on board; Epics are metadata for swimlane headers.
    // When advanced filter specifies issue types, use those instead of the default.
    let issues = advancedFilters.issueTypes.length > 0
      ? rawIssues
      : rawIssues.filter(i => i.issueType !== 'Epic');
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

    return issues;
  }, [rawIssues, debSearch, selAssignees, selEpics, selTypes, selPriorities, quickFilters, currentUserName, advancedFilters]);

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

  if (isLoading) return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: tk.pageBg }}>
      <div style={{ height: 44, borderBottom: `1px solid ${tk.border}`, background: tk.surfaceBg }} />
      <div className="flex flex-1">
        {KANBAN_COLUMNS.map(c => (
          <div key={c.id} className="flex-1" style={{ borderLeft: `1px solid ${tk.border}` }}>
            <div style={{ height: 32, background: tk.headerBg }} />
            <div className="p-1 flex flex-col gap-1">
              {[0, 1, 2].map(i => <div key={i} className="rounded animate-pulse" style={{ height: 56, background: tk.chipBg }} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ═══ RENDER ═══ */

  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: tk.pageBg }}>
      {/* ── Page header ── */}
      <div className="flex items-center px-6" style={{
        height: 56, background: tk.surfaceBg,
        borderBottom: `1px solid ${tk.borderSubtle}`, flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            fontSize: 18, fontWeight: 600, color: tk.textPrimary,
            lineHeight: '24px', margin: 0, fontFamily: "'Sora', sans-serif",
          }}>Board</h1>
          <p style={{
            fontSize: 12, color: tk.textMuted,
            lineHeight: '16px', margin: 0, fontFamily: "'Inter', sans-serif",
          }}>
            {projMeta?.name || key?.toUpperCase()} — All Work Items
          </p>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 px-4 flex-wrap" style={{
        minHeight: 44, background: tk.surfaceBg,
        borderBottom: `1px solid ${tk.border}`, flexShrink: 0,
        paddingTop: 6, paddingBottom: 6,
      }}>
        {/* Search */}
        <div className="relative" style={{ width: 220 }}>
          <Search size={14} color="#6B778C" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text" placeholder="Search board" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 34, paddingLeft: 30, paddingRight: 8,
              border: '1px solid #DFE1E6', borderRadius: 4,
              fontSize: 13.5, color: '#172B4D', background: '#FFFFFF',
              outline: 'none', fontFamily: "'Inter', sans-serif",
              transition: 'border-color 120ms ease',
            }}
            onFocus={e => e.currentTarget.style.borderColor = '#0052CC'}
            onBlur={e => e.currentTarget.style.borderColor = '#DFE1E6'}
          />
        </div>

        {/* Avatar stack */}
        <AvatarStackFilter allAssignees={allAssignees} selected={selAssignees} onChange={setSelAssignees} avatarsByName={avatarsByName} tk={tk} />

        {/* Filter dropdowns */}
        <EpicFilterDropdown epics={allEpics} selected={selEpics} onChange={setSelEpics} tk={tk} />
        <TypeFilterDropdown types={allTypes} selected={selTypes} onChange={setSelTypes} tk={tk} />
        <PriorityFilterDropdown selected={selPriorities} onChange={setSelPriorities} tk={tk} />
        <QuickFilterDropdown selected={quickFilters} onChange={setQuickFilters} tk={tk} />

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            style={{
              fontSize: 12, color: tk.selectedAccent, background: 'none',
              border: 'none', cursor: 'pointer', fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Clear ({activeFilterCount})
          </button>
        )}

        <div className="flex-1" />

        <span style={{ fontSize: 12, color: tk.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{total} issues</span>


        {/* Group by */}
        <GroupByBtn value={groupBy} onChange={setGroupBy} tk={tk} />

        {/* Board menu ••• */}
        <div ref={boardMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowBoardMenu(v => !v); setShowViewSettings(false); }}
            style={{
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: '1px solid #DFE1E6', background: '#FFFFFF',
              cursor: 'pointer', transition: 'all 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F4F5F7'; e.currentTarget.style.borderColor = '#C1C7D0'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#DFE1E6'; }}
            aria-label="Board menu"
          >
            <MoreHorizontal size={16} color="#42526E" />
          </button>
          {showBoardMenu && !showViewSettings && (
            <div
              style={{
                position: 'absolute', top: '100%', right: 0, marginTop: 6,
                width: 240, background: '#FFFFFF',
                border: '1px solid #DFE1E6', borderRadius: 8,
                boxShadow: '0 8px 24px rgba(9,30,66,0.15), 0 0 1px rgba(9,30,66,0.2)',
                zIndex: 50,
                padding: '6px 0', fontFamily: "'Inter', sans-serif",
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Section label */}
              <div style={{ padding: '6px 16px 4px', fontSize: 11, fontWeight: 700, color: '#6B778C', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Board Options
              </div>
              <BoardMenuItem
                icon={<Settings2 size={16} color="#42526E" />}
                label="View settings"
                onClick={() => { setShowBoardMenu(false); setShowViewSettings(true); }}
              />
              <BoardMenuItem
                icon={<MapIcon size={16} color="#42526E" />}
                label="Map statuses"
                onClick={() => { setShowBoardMenu(false); navigate(`/project-hub/${key}/boards/map-statuses`); }}
              />
              <div style={{ height: 1, background: '#EBECF0', margin: '6px 12px' }} />
              <BoardMenuItem
                icon={<Filter size={16} color="#42526E" />}
                label="Advanced filter"
                badge={advFilterCount > 0 ? advFilterCount : undefined}
                onClick={() => { setShowBoardMenu(false); setShowAdvancedFilter(true); }}
              />
            </div>
          )}
          {showViewSettings && (
            <ViewSettingsPanel
              settings={viewSettings}
              onUpdate={updateViewSettings}
              onExpandAll={handleExpandAll}
              onCollapseAll={() => {
                setCollapsedSwimlanes(() => {
                  const next = new Set<string>();
                  groups?.forEach((g: any) => next.add(g.groupKey));
                  return next;
                });
              }}
              onClose={() => setShowViewSettings(false)}
              tk={tk}
            />
          )}
          {showAdvancedFilter && (
            <AdvancedFilterPanel
              projectKey={key ?? ''}
              filters={advancedFilters}
              onChange={setAdvancedFilters}
              onClose={() => setShowAdvancedFilter(false)}
              tk={tk}
            />
          )}
        </div>
      </div>

      {/* ── Board content ── */}
      <div className="flex-1 min-h-0" style={{ overflow: 'auto' }}>
        {groupBy !== 'none' ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div style={{ background: tk.surfaceBg, minWidth: KANBAN_COLUMNS.length * 300 }}>
              {/* Column headers for swimlane mode */}
              <div className="flex sticky top-0 z-20" style={{ background: tk.headerBg, borderBottom: `1px solid ${tk.border}` }}>
                {KANBAN_COLUMNS.map((col) => {
                  const count = groups.reduce((sum, g) => sum + g.issueIds.filter(id => {
                    const issue = issuesById.get(id);
                    return issue ? STATUS_TO_COL_ID.get(issue.status.toLowerCase()) === col.id : false;
                  }).length, 0);
                  const categoryDot = col.category === 'done' ? '#006644' : col.category === 'in_progress' ? '#0747A6' : '#5E6C84';
                  return (
                    <div key={col.id} className="flex items-center gap-2 px-3" style={{
                      width: 300, minWidth: 300, maxWidth: 300, height: 36, flexShrink: 0,
                      borderRight: `1px solid ${tk.border}`,
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: tk.textMuted, letterSpacing: '0.04em' }}>{col.name}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: tk.textSecondary, background: tk.badgeBg, borderRadius: 10, padding: '1px 7px', lineHeight: '18px', minWidth: 20, textAlign: 'center' }}>{count}</span>
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
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div className="flex" style={{ minWidth: KANBAN_COLUMNS.length * 300 }}>
              {KANBAN_COLUMNS.map((col, i) => (
                <DroppableColumn
                  key={col.id}
                  column={col}
                  issueIds={colMap[col.id] ?? []}
                  issuesById={issuesById}
                  avatarsByName={avatarsByName}
                  onCardClick={id => setSelIssueId(id)}
                  isFirst={i === 0}
                  d={d}
                  tk={tk}
                  selectedId={selIssueId}
                  focusedId={focusedId}
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
                />
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragIssue ? <OverlayCard issue={dragIssue} avatarUrl={dragIssue.assigneeName ? avatarsByName.get(dragIssue.assigneeName.toLowerCase()) : null} d={d} tk={tk} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* ── Detail panel ── */}
      {selIssueId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter
            isOpen={!!selIssueId}
            onClose={() => setSelIssueId(null)}
            itemId={selIssueId}
            projectId={projMeta?.id ?? ''}
            projectKey={key}
          />
        </Suspense>
      )}
      <PriToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
