/**
 * ProductNativeBoardPage — /product-hub/:key/boards
 *
 * TRUE CLONE of project-hub/KanbanBoardPage.tsx.
 * Only the data layer is swapped:
 *   ph_projects          → products  (product meta)
 *   ph_issues            → business_requests  (cards)
 *   board_columns        → demand_process_steps  (columns)
 *   issue.status         → row.process_step  (column-bucketing field)
 *   issue.issueKey       → row.request_key
 *   issue.summary        → row.title
 *   issue.issueType      → row.request_type
 *   issue.priority       → row.urgency
 * Everything else — KanbanToolbar, PragmaticBoard, SwimlaneRow, DndContext,
 * dark mode, density, group-by, filters, keyboard nav — is unchanged.
 */
import React, { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { ProjectIcon } from '@/components/shared/ProjectIcon';
import { useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Button from '@atlaskit/button/new';
import { KanbanToolbar } from '@/components/kanban/toolbar/KanbanToolbar';
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

// Kanban modules — identical to KanbanBoardPage
import {
  KANBAN_TOKENS, DENSITY_CONFIG,
  KANBAN_COLUMNS as DEFAULT_KANBAN_COLUMNS,
  COL_PRIMARY_STATUS as DEFAULT_COL_PRIMARY_STATUS,
  STATUS_TO_COL_ID as DEFAULT_STATUS_TO_COL_ID,
  COLUMN_ID_SET as DEFAULT_COLUMN_ID_SET,
} from '@/components/kanban/kanban-tokens';
import type { KanbanDensity, KanbanColumnDef } from '@/components/kanban/kanban-tokens';
import type { BoardIssue, GroupByMode, ColMap } from '@/components/kanban/kanban-types';
import { BOARD_SUBTASK_TYPES, KANBAN_BOARD_TYPES, KANBAN_STORY_TYPES } from '@/components/kanban/kanban-types';
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
import { useTypeWorkflow } from '@/hooks/useTypeWorkflow';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

// ─── Map a business_request row to the BoardIssue shape ──────────────────────
// process_step is mapped to .status so all column-bucketing logic is unchanged.

function toBoardIssue(r: any): BoardIssue {
  return {
    id: r.id,
    issueKey: r.request_key ?? r.id,
    summary: r.title ?? '',
    // LOCKED REGISTRY (CLAUDE.md): every Business Request renders the amber
    // lightbulb via JiraIssueTypeIcon type='Business Request'. request_type
    // (feature/gap/integration/data_request) is a FIELD VALUE, not a work
    // item type — passing it here produced the wrong Feature glyph.
    issueType: 'Business Request',
    priority: r.urgency ?? 'Medium',
    status: r.process_step ?? '',           // ← product status lives here
    statusCategory: 'inprogress',
    assigneeName: r._assignee_name ?? null,
    labels: [],
    sprintName: null,
    storyPoints: null,
    parentKey: null,
    parentSummary: null,
    fixVersion: null,
    isFlagged: !!(r.is_flagged),
    updatedAt: r.updated_at ?? r.created_at,
    createdAt: r.created_at ?? null,
  };
}

// ─── Resolve project_manager_user_id UUIDs → display names ───────────────────

async function resolveAssigneeNames(rows: any[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.map(r => r.project_manager_user_id).filter(Boolean))];
  if (!ids.length) return new Map();
  const { data } = await supabase.from('profiles').select('id, full_name').in('id', ids);
  const m = new Map<string, string>();
  (data ?? []).forEach((p: any) => { if (p.full_name) m.set(p.id, p.full_name); });
  return m;
}

export default function ProductNativeBoardPage() {
  const { key } = useParams<{ key: string }>();
  const { isDark } = useTheme();
  const tk = isDark ? KANBAN_TOKENS.dark : KANBAN_TOKENS.light;
  const avatarsByName = useProfileAvatarsByName();
  const qc = useQueryClient();
  const { toasts, dismissToast, success: toastSuccess, error: toastError } = usePriToast();

  /* ═══ STATE — identical to KanbanBoardPage ═══ */
  const { initial: urlInit, writeToUrl } = useBoardUrlState(ENABLE_KANBAN_V2);
  const [search, setSearch] = useState(urlInit.search);
  const [debSearch, setDebSearch] = useState(urlInit.search);
  const [selAssignees, setSelAssignees] = useState<Set<string>>(new Set(urlInit.assignees));
  const [selEpics, setSelEpics] = useState<string[]>(urlInit.epics);
  const [selTypes, setSelTypes] = useState<string[]>(urlInit.types);
  const [selPriorities, setSelPriorities] = useState<string[]>(urlInit.priorities);
  const [quickFilters, setQuickFilters] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByMode>(urlInit.group);
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
  const [showBoardSwitcher, setShowBoardSwitcher] = useState(false);
  const boardSwitcherRef = React.useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const boardScrollContainerRef = useRef<HTMLDivElement>(null);

  const d = DENSITY_CONFIG[density];
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  /* ═══ CURRENT USER ═══ */
  const { data: currentUserData } = useQuery({
    queryKey: ['current-user-id'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id ?? null;
    },
    staleTime: 300_000,
  });

  /* View settings */
  const { settings: viewSettings, updateSettings: updateViewSettings } = useKanbanViewSettings(key, currentUserData);
  const visibleFields = viewSettings.visibleFields;
  const cardColorMode = viewSettings.cardColorMode;
  const enabledQuickFilters = viewSettings.enabledQuickFilters;

  const handleExpandAll = useCallback(() => setCollapsedSwimlanes(new Set()), []);

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

  /* Realtime — reuse hook; passes product key so channel name is unique */
  useKanbanRealtime(key, currentUserData ?? null);

  /* ═══ DATA: PRODUCT META (replaces ph_projects) ═══ */
  const { data: productMeta } = useQuery({
    queryKey: ['product-meta', key],
    queryFn: async () => {
      if (!key) return null;
      const { data } = await (supabase as any)
        .from('products').select('id, name, code')
        .eq('code', key.toUpperCase()).eq('is_active', true).maybeSingle();
      return data as { id: string; name: string; code: string } | null;
    },
    enabled: !!key,
    staleTime: 60_000,
  });

  const productId = productMeta?.id ?? null;

  /* ═══ DATA: COLUMNS from ph_workflow_type_statuses — single source of truth ═══
   * useTypeWorkflow('BAU', 'Business Request') reads the same tables that
   * CatalystStatusPill and /admin/workflows manage. Any status added/removed
   * in admin automatically propagates to kanban columns here.
   */
  const { data: brWorkflow } = useTypeWorkflow('BAU', 'Business Request');

  const { KANBAN_COLUMNS, STATUS_TO_COL_ID, COL_PRIMARY_STATUS, COLUMN_ID_SET } = useMemo(() => {
    const statuses = brWorkflow?.statuses ?? [];
    if (!statuses.length) {
      return {
        KANBAN_COLUMNS: DEFAULT_KANBAN_COLUMNS,
        STATUS_TO_COL_ID: DEFAULT_STATUS_TO_COL_ID,
        COL_PRIMARY_STATUS: DEFAULT_COL_PRIMARY_STATUS,
        COLUMN_ID_SET: DEFAULT_COLUMN_ID_SET,
      };
    }
    const cols: KanbanColumnDef[] = statuses.map(s => ({
      id: s.name,
      name: s.name.toUpperCase(),
      statuses: [s.name],
      category: s.category as 'todo' | 'in_progress' | 'done',
    }));
    const sToCId = new Map<string, string>();
    const cPrimary: Record<string, string> = {};
    cols.forEach(col => {
      sToCId.set(col.id, col.id);
      cPrimary[col.id] = col.id;
    });
    return {
      KANBAN_COLUMNS: cols,
      STATUS_TO_COL_ID: sToCId,
      COL_PRIMARY_STATUS: cPrimary,
      COLUMN_ID_SET: new Set(cols.map(c => c.id)),
    };
  }, [brWorkflow?.statuses]);

  /* ═══ DATA: ISSUES from business_requests (replaces ph_issues) ═══ */
  const { data: rawIssues = [], isLoading } = useQuery({
    queryKey: ['product-kanban-issues', productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from('business_requests' as any)
        .select('*')
        .eq('product_id', productId)
        .is('deleted_at', null)
        .order('rank', { ascending: true, nullsFirst: false });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      // Resolve assignee display names
      const nameMap = await resolveAssigneeNames(rows);
      return rows.map(r => toBoardIssue({
        ...r,
        _assignee_name: r.project_manager_user_id ? nameMap.get(r.project_manager_user_id) ?? null : null,
      }));
    },
    enabled: !!productId,
    staleTime: 30_000,
  });

  const issuesById = useMemo(() => {
    const m = new Map<string, BoardIssue>();
    rawIssues.forEach(i => m.set(i.id, i));
    return m;
  }, [rawIssues]);

  /* Debounce search */
  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebSearch(search), 250);
    return () => clearTimeout(timerRef.current);
  }, [search]);

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

  // No epics in product board — kept empty for toolbar compat
  const allEpics = useMemo(() => [] as { key: string; summary: string | null; count: number }[], []);

  const allTypes = useMemo(() => {
    const m = new Map<string, number>();
    rawIssues.forEach(i => { m.set(i.issueType, (m.get(i.issueType) ?? 0) + 1); });
    return Array.from(m.entries()).map(([t, c]) => ({ type: t, count: c }));
  }, [rawIssues]);

  /* ═══ FILTER CATEGORIES ═══ */
  const filterCategories: FilterCategory[] = useMemo(() => {
    const typeOptions = allTypes.map(t => ({ id: t.type, label: t.type }));
    const priorityOptions = ['High', 'Medium', 'Low'].map(p => ({ id: p, label: p }));
    const statusOptions = KANBAN_COLUMNS.map(c => ({ id: c.name, label: c.name }));
    const assigneeOptions2 = allAssignees.map(a => ({
      id: a.name,
      label: a.name,
      avatarUrl: avatarsByName.get(a.name.toLowerCase()) || undefined,
      avatarType: (avatarsByName.get(a.name.toLowerCase()) ? 'photo' : 'person-icon') as 'photo' | 'person-icon',
    }));
    return [
      { id: 'type', label: 'Type', options: typeOptions },
      { id: 'priority', label: 'Priority', options: priorityOptions },
      { id: 'status', label: 'Status', options: statusOptions },
      { id: 'assignee', label: 'Assignee', options: assigneeOptions2, searchPlaceholder: 'Search people...' },
    ];
  }, [allTypes, allAssignees, avatarsByName, KANBAN_COLUMNS]);

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
    { key: 'priority' as GroupByMode, label: 'Priority', icon: 'priority' },
  ], []);

  /* Current user display name for "Assigned to me" quick filter */
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

  /* ═══ FILTERING — identical logic to KanbanBoardPage ═══ */
  const filtered = useMemo(() => {
    // Show all types on the product board (no Jira type restriction)
    let issues = rawIssues;
    if (debSearch.trim()) {
      const q = debSearch.trim().toLowerCase();
      issues = issues.filter(i =>
        i.summary.toLowerCase().includes(q) ||
        i.issueKey.toLowerCase().includes(q) ||
        (i.assigneeName ?? '').toLowerCase().includes(q),
      );
    }
    if (selAssignees.size > 0) issues = issues.filter(i => selAssignees.has(i.assigneeName || 'Unassigned'));
    if (selTypes.length > 0) issues = issues.filter(i => selTypes.includes(i.issueType));
    if (selPriorities.length > 0) {
      const normalised = new Set(selPriorities.map(p => p.toLowerCase()));
      issues = issues.filter(i => {
        const pri = (i.priority ?? '').toLowerCase();
        if (normalised.has('high') && (pri === 'highest' || pri === 'high' || pri === 'critical')) return true;
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

    // Advanced filters
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
      issues = issues.filter(i => aSet.has(i.assigneeName || 'Unassigned'));
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
    if (standupAssignee) {
      issues = issues.filter(i => (i.assigneeName || 'Unassigned') === standupAssignee);
    }
    return issues;
  }, [rawIssues, debSearch, selAssignees, selEpics, selTypes, selPriorities, quickFilters, currentUserName, advancedFilters, standupAssignee, groupBy]);

  /* ═══ COLUMN MAPPING — identical to KanbanBoardPage ═══ */
  useEffect(() => {
    if (dragId || groupBy !== 'none') return;
    const m: ColMap = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    filtered.forEach(i => {
      const c = STATUS_TO_COL_ID.get(i.status.toLowerCase());
      if (c && m[c]) m[c].push(i.id);
    });
    setColMap(prev => {
      const prevStr = JSON.stringify(prev);
      const newStr = JSON.stringify(m);
      return prevStr === newStr ? prev : m;
    });
  }, [filtered, dragId, groupBy, KANBAN_COLUMNS, STATUS_TO_COL_ID]);

  const groups = useMemo(() => groupBy === 'none' ? [] : groupIssues(filtered, groupBy), [filtered, groupBy]);

  const handleCollapseAll = useCallback(() => {
    setCollapsedSwimlanes(prev => {
      const next = new Set(prev);
      groups.forEach((g) => next.add(g.groupKey));
      return next;
    });
  }, [groups]);

  const total = groupBy === 'none' ? Object.values(colMap).reduce((a, ids) => a + ids.length, 0) : filtered.length;

  const prevGroupByRef = useRef<GroupByMode>(groupBy);
  useEffect(() => {
    if (prevGroupByRef.current === groupBy) return;
    prevGroupByRef.current = groupBy;
    if (groupBy === 'epic') {
      setCollapsedSwimlanes(new Set(groups.map((g: any) => g.groupKey)));
    } else {
      setCollapsedSwimlanes(new Set());
    }
  }, [groupBy, groups]);

  const hasSwimlanes = groupBy !== 'none';
  const canExpandAll = hasSwimlanes && collapsedSwimlanes.size > 0;
  const canCollapseAll = hasSwimlanes && groups.length > 0 && collapsedSwimlanes.size < groups.length;
  const pragmaticD = useMemo(() => ({ ...d, cardPad: d.cardPad === '16px' ? '8px' : d.cardPad }), [d]);

  // Suppress the assignee avatar slot on cards when no named assignees exist.
  // Without this, every card shows a "U" (Unassigned) initial circle — visual noise
  // when the entire product board has no assignee data.
  const hasNamedAssignees = useMemo(
    () => allAssignees.some(a => a.name !== 'Unassigned'),
    [allAssignees],
  );
  const effectiveVisibleFields = useMemo(
    () => hasNamedAssignees ? visibleFields : { ...visibleFields, assignee: false },
    [hasNamedAssignees, visibleFields],
  );

  /* ═══ CARD ACTIONS (data layer swapped to business_requests) ═══ */

  const handleSaveSummary = useCallback(async (issueId: string, newSummary: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const oldSummary = issue.summary;
    issue.summary = newSummary;
    try {
      await supabase.from('business_requests' as any).update({ title: newSummary } as any).eq('id', issueId);
      qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
    } catch {
      issue.summary = oldSummary;
      toastError('Failed to update title');
    }
  }, [issuesById, productId, qc, toastError]);

  const handleToggleFlag = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const newFlag = !issue.isFlagged;
    issue.isFlagged = newFlag;
    try {
      await supabase.from('business_requests' as any).update({ is_flagged: newFlag } as any).eq('id', issueId);
      toastSuccess(newFlag ? `Flagged ${issue.issueKey}` : `Unflagged ${issue.issueKey}`);
      qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
    } catch {
      issue.isFlagged = !newFlag;
      toastError('Failed to update flag');
    }
  }, [issuesById, productId, qc, toastSuccess, toastError]);

  const handleCopyLink = useCallback((issueKey: string) => {
    const url = `${window.location.origin}/product-hub/${key}/boards?issue=${issueKey}`;
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

  const assigneeOptions = useMemo(() => allAssignees
    .filter(a => a.name !== 'Unassigned')
    .map(a => ({ name: a.name, avatarUrl: avatarsByName.get(a.name.toLowerCase()) || null, email: null as string | null })),
  [allAssignees, avatarsByName]);

  const handleChangeAssignee = useCallback(async (issueId: string, newAssignee: string | null) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    const old = issue.assigneeName;
    issue.assigneeName = newAssignee;
    try {
      // Resolve name back to UUID if possible — best-effort
      qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
    } catch {
      issue.assigneeName = old;
      toastError('Failed to update assignee');
    }
  }, [issuesById, productId, qc, toastError]);

  const handleLabelsUpdated = useCallback(async (_issueId: string, _newLabels: string[]) => {
    qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
  }, [productId, qc]);

  const handleParentChange = useCallback(async (_issueId: string, _newParentKey: string | null) => {
    // No parent concept on business_requests
  }, []);

  const handleMoved = useCallback((_issueId: string, _newProjectKey: string) => {
    // No cross-product move
  }, []);

  const handleLinked = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
  }, [productId, qc]);

  const handleDelete = useCallback(async (issueId: string) => {
    const issue = issuesById.get(issueId);
    if (!issue) return;
    try {
      const { error } = await supabase.from('business_requests' as any).update({ deleted_at: new Date().toISOString() } as any).eq('id', issueId);
      if (error) throw error;
      toastSuccess(`Deleted ${issue.issueKey}`);
      if (selIssueId === issueId) setSelIssueId(null);
      qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
    } catch {
      toastError(`Failed to delete ${issue.issueKey}`);
    }
  }, [issuesById, productId, qc, toastSuccess, toastError, selIssueId]);

  const handleArchive = useCallback(async (issueId: string) => {
    // Product board: archive = soft delete
    handleDelete(issueId);
  }, [handleDelete]);

  /* ═══ DND HANDLERS — identical to KanbanBoardPage ═══ */

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
  }, [groupBy, COLUMN_ID_SET]);

  /* persistStatusChange: updates business_requests.process_step instead of ph_issues.status */
  const persistStatusChange = useCallback(async (issueId: string, newStatus: string) => {
    if (ENABLE_KANBAN_V2) {
      const parsed = statusChangeSchema.safeParse({ issueId, newStatus });
      if (!parsed.success) return;
    }
    const issue = issuesById.get(issueId);
    if (!issue || issue.status === newStatus) return;
    const oldStatus = issue.status;
    issue.status = newStatus;
    try {
      const { error } = await supabase
        .from('business_requests' as any)
        .update({ process_step: newStatus } as any)
        .eq('id', issueId);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
    } catch {
      issue.status = oldStatus;
      toastError(`Failed to move ${issue.issueKey}`);
      qc.invalidateQueries({ queryKey: ['product-kanban-issues', productId] });
    }
  }, [issuesById, productId, qc, toastSuccess, toastError]);

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
  }, [groupBy, resolveColId, persistStatusChange, colMap, COLUMN_ID_SET, COL_PRIMARY_STATUS]);

  const dragIssue = dragId ? issuesById.get(dragId) : null;

  /* ═══ ACTIVE FILTER COUNT — identical ═══ */
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

  const handleCardClick = useCallback((id: string) => setSelIssueId(id), []);

  const clearAllFilters = useCallback(() => {
    setSearch(''); setDebSearch('');
    setSelAssignees(new Set());
    setSelEpics([]);
    setSelTypes([]);
    setSelPriorities([]);
    setQuickFilters(new Set());
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  }, []);

  /* ═══ KEYBOARD NAVIGATION — identical ═══ */
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

  /* ═══ RENDER — identical structure to KanbanBoardPage ═══ */
  return (
    <div className="flex flex-col flex-1 min-h-0" style={{ background: tk.pageBg }}>
      {/* Product header chip (replaces ProjectHeaderChip) */}
      {productMeta && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px', borderBottom: `1px solid ${tk.borderSubtle}`,
          background: tk.pageBg, flexShrink: 0,
        }}>
          <ProjectIcon projectKey={productMeta.code} size="small" name={productMeta.name} />
          <span style={{ fontSize: 13, fontWeight: 500, color: tk.textSecondary, fontFamily: 'var(--cp-font-body)' }}>
            {productMeta.name}
          </span>
          <span style={{ fontSize: 11, color: tk.textMuted, fontFamily: 'var(--cp-font-mono)' }}>
            {productMeta.code}
          </span>
        </div>
      )}

      {/* ── Page header with board switcher — identical to KanbanBoardPage ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', minHeight: 48, flexShrink: 0, position: 'relative' }}>
        <span style={{ fontSize: 20, fontWeight: 600, color: tk.textPrimary, fontFamily: 'var(--cp-font-heading)' }}>
          Board
        </span>
        <div ref={boardSwitcherRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowBoardSwitcher(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              height: 32, padding: '0 8px',
              background: showBoardSwitcher ? tk.surfaceHover : 'transparent',
              border: `1px solid ${showBoardSwitcher ? tk.border : 'transparent'}`,
              borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: tk.textSecondary, fontFamily: 'var(--cp-font-body)',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { if (!showBoardSwitcher) e.currentTarget.style.background = tk.surfaceHover; }}
            onMouseLeave={e => { if (!showBoardSwitcher) e.currentTarget.style.background = 'transparent'; }}
          >
            Board
            <span style={{ fontSize: 10, marginLeft: 4 }}>▾</span>
          </button>
          {showBoardSwitcher && (
            <div
              style={{
                position: 'absolute', top: 'calc(100% + 4px)', left: 0,
                width: 220, background: tk.surfaceBg,
                border: `1px solid ${tk.border}`, borderRadius: 8,
                boxShadow: 'var(--ds-shadow-overlay, 0 8px 24px rgba(0,0,0,0.16))', zIndex: 60,
                padding: '8px 0',
              }}
              onMouseDown={e => e.stopPropagation()}
            >
              <button
                onClick={() => setShowBoardSwitcher(false)}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 16px',
                  background: 'var(--ds-background-selected, #DEEBFF)',
                  border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
                  color: 'var(--ds-link, #0052CC)', fontFamily: 'var(--cp-font-body)',
                }}
              >
                Board
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Toolbar — canonical <KanbanToolbar/> — identical props shape ── */}
      <div style={{ marginLeft: showStandup ? 'var(--standup-panel-width, 280px)' : 0, transition: 'margin-left 200ms ease' }}>
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
          hasSwimlanes={hasSwimlanes}
          canExpandAll={canExpandAll}
          canCollapseAll={canCollapseAll}
          enableDensity={ENABLE_KANBAN_V2}
          density={density}
          onDensityChange={onDensityChange}
          mapStatusesPath={`/product-hub/${key}/boards/map-statuses`}
          projectKey={key ?? ''}
          canArchive={false}
          showArchived={false}
          onShowArchivedChange={() => {}}
          onStartStandup={() => setShowStandup(true)}
          quickFilters={quickFilters}
          onQuickFiltersChange={setQuickFilters}
          enabledQuickFilters={enabledQuickFilters}
        />
      </div>

      {/* ── Board content — identical to KanbanBoardPage ── */}
      <div className="flex-1 min-h-0" style={{ overflow: 'auto', padding: '0 16px 16px 16px', marginLeft: showStandup ? 'var(--standup-panel-width, 280px)' : 0, transition: 'margin-left 200ms ease' }}>
        {groupBy !== 'none' ? (
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
            <div style={{ background: 'transparent', minWidth: KANBAN_COLUMNS.length * 267 + (KANBAN_COLUMNS.length - 1) * 8 }}>
              {/* Column headers */}
              <div className="flex sticky top-0 z-20" style={{ background: tk.pageBg, gap: 8, paddingBottom: 4 }}>
                {KANBAN_COLUMNS.map((col) => {
                  const count = groups.reduce((sum, g) => sum + g.issueIds.filter(id => {
                    const issue = issuesById.get(id);
                    return issue ? STATUS_TO_COL_ID.get(issue.status.toLowerCase()) === col.id : false;
                  }).length, 0);
                  const categoryDot = col.category === 'done'
                    ? 'var(--ds-background-success-bold, #94C748)'
                    : col.category === 'in_progress'
                    ? 'var(--ds-background-information, #669DF1)'
                    : 'var(--ds-text-subtlest, #5E6C84)';
                  return (
                    <div key={col.id} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: 267, minWidth: 267, maxWidth: 267, height: 48, flexShrink: 0,
                      padding: '0 12px',
                      background: tk.headerBg,
                      borderRadius: '6px 6px 0 0',
                    }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: categoryDot, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: tk.textMuted, flex: 1, lineHeight: '16px', fontFamily: 'var(--cp-font-body)' }}>{col.name.toUpperCase()}</span>
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
                  onCardClick={handleCardClick}
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
                  visibleFields={groupBy === 'epic' ? { ...effectiveVisibleFields, epic: false } : effectiveVisibleFields}
                  cardColorMode={cardColorMode}
                  columns={KANBAN_COLUMNS}
                  statusToColId={STATUS_TO_COL_ID}
                />
              ))}
              {groups.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0', color: tk.textDisabled, fontSize: 13 }}>
                  No items match filters
                </div>
              )}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragIssue ? <OverlayCard issue={dragIssue} avatarUrl={dragIssue.assigneeName ? avatarsByName.get(dragIssue.assigneeName.toLowerCase()) : null} d={d} tk={tk} /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <PragmaticBoard
            columns={KANBAN_COLUMNS}
            colMap={colMap}
            issuesById={issuesById}
            avatarsByName={avatarsByName}
            onCardClick={id => setSelIssueId(id)}
            d={pragmaticD}
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
            visibleFields={effectiveVisibleFields}
            cardColorMode={cardColorMode}
            onDrop={({ cardId, sourceColId, destColId, insertIndex }) => {
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
            itemType="business_request"
            projectId={productMeta?.id ?? ''}
            projectKey={key}
          />
        </Suspense>
      )}

      {showStandup && (
        <StandupModal
          issues={filtered}
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
