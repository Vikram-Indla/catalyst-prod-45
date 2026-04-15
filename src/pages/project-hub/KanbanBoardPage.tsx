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
import { useState, useRef, useCallback, useMemo, useEffect, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
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
import { KANBAN_TOKENS, DENSITY_CONFIG, KANBAN_COLUMNS, COL_PRIMARY_STATUS, STATUS_TO_COL_ID, COLUMN_ID_SET } from '@/components/kanban/kanban-tokens';
import type { KanbanDensity } from '@/components/kanban/kanban-tokens';
import type { BoardIssue, GroupByMode, ColMap } from '@/components/kanban/kanban-types';
import { groupIssues, findCol } from '@/components/kanban/kanban-utils';
import { DroppableColumn } from '@/components/kanban/KanbanColumn';
import { OverlayCard } from '@/components/kanban/SortableCard';
import { SwimlaneRow } from '@/components/kanban/KanbanSwimlane';
import {
  AvatarStackFilter, EpicFilterDropdown, TypeFilterDropdown, PriorityFilterDropdown,
  QuickFilterDropdown, GroupByBtn,
} from '@/components/kanban/KanbanToolbar';
import { useKanbanRealtime } from '@/components/kanban/useKanbanRealtime';
import { useKanbanKeyboard } from '@/components/kanban/useKanbanKeyboard';

import { Search } from 'lucide-react';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

const DENSITY_STORAGE_KEY = 'kanban-density';

export default function KanbanBoardPage() {
  const { key } = useParams<{ key: string }>();
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

  const { data: rawIssues = [], isLoading } = useQuery({
    queryKey: ['kanban-issues', key],
    queryFn: async () => {
      if (!key) return [];
      const { data, error } = await supabase.from('ph_issues')
        .select('id, issue_key, summary, status, status_category, issue_type, priority, assignee_display_name, labels, sprint_name, story_points, parent_key, parent_summary, fix_versions, is_flagged, jira_updated_at')
        .eq('project_key', key.toUpperCase())
        .in('issue_type', ['Epic', 'Story'])
        .is('deleted_at', null)
        .order('jira_updated_at', { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r: any): BoardIssue => {
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
    let issues = rawIssues;
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
    return issues;
  }, [rawIssues, debSearch, selAssignees, selEpics, selTypes, selPriorities, quickFilters, currentUserName]);

  /* ═══ COLUMN MAPPING ═══ */

  useEffect(() => {
    if (dragId || groupBy !== 'none') return;
    const m: ColMap = {};
    KANBAN_COLUMNS.forEach(c => { m[c.id] = []; });
    filtered.forEach(i => {
      const c = STATUS_TO_COL_ID.get(i.status.toLowerCase());
      if (c && m[c]) m[c].push(i.id);
    });
    setColMap(m);
  }, [filtered, dragId, groupBy]);

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
  }, [issuesById, key, qc]);

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
      toastSuccess(`Assigned ${issue.issueKey} → ${newAssignee || 'Unassigned'}`);
      qc.invalidateQueries({ queryKey: ['kanban-issues', key] });
    } catch {
      issue.assigneeName = oldAssignee;
      toastError('Failed to update assignee');
    }
  }, [issuesById, key, qc, toastSuccess, toastError]);

  /* ═══ DND HANDLERS ═══ */

  const onDragStart = useCallback((e: DragStartEvent) => setDragId(String(e.active.id)), []);

  const resolveColId = useCallback((overId: string): string | null => {
    if (overId.includes('::')) return overId.split('::')[1] ?? null;
    if (COLUMN_ID_SET.has(overId)) return overId;
    return null;
  }, []);

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
      toastSuccess(`Moved ${issue.issueKey} → ${newStatus}`);
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
  const activeFilterCount = [
    selAssignees.size > 0,
    selEpics.length > 0,
    selTypes.length > 0,
    selPriorities.length > 0,
    quickFilters.size > 0,
    debSearch.trim().length > 0,
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setSearch(''); setDebSearch('');
    setSelAssignees(new Set());
    setSelEpics([]);
    setSelTypes([]);
    setSelPriorities([]);
    setQuickFilters(new Set());
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
        <div className="relative" style={{ width: 180 }}>
          <Search size={13} color={tk.textDisabled} className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text" placeholder="Search board" value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 28, paddingLeft: 24, paddingRight: 6,
              border: `1px solid ${tk.inputBorder}`, borderRadius: 3,
              fontSize: 12, color: tk.textPrimary, background: tk.inputBg,
              outline: 'none', fontFamily: "'Inter', sans-serif",
            }}
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
                  defaultOpen={true}
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
