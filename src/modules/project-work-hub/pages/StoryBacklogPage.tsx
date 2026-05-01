/**
 * Story Backlog Page — CatalystTable pattern (pb-table, ResizableTableHeader, useTableColumns)
 * With Jira-style Group By dropdown + Filter
 */
import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { CatalystPageHeader } from '@/components/shared/CatalystPageHeader';
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { STORY_STATUS_LOZENGE, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';

import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, BookOpen, Search, X, Star } from 'lucide-react';
import { GroupByPopover as SharedGroupByPopover } from '@/components/shared/GroupByPopover';
import type { GroupByOption } from '@/components/shared/GroupByPopover';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogStory } from '../types/backlog.types';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader, type SortDir } from '@/components/shared/ResizableTableHeader';
import { writeTicketOrigin } from '../hooks/useTicketOrigin';
import '@/styles/product-backlog.css';
// ── V2 table (feature-flagged) — shared DynamicTable molecule
import { DynamicTable, useTablePersistence } from '@/components/shared/dynamic-table';
import type { DynamicTableColumn, DynamicTableRowGroup } from '@/components/shared/dynamic-table';
import type { RowSelectionState, SortingState } from '@tanstack/react-table';

const CatalystDetailRouter = lazy(() => import('@/components/catalyst-detail-views/CatalystDetailRouter'));

// ── Column definitions (CatalystTable pattern) ──
const STORY_COLUMNS: TColDef[] = [
  { key: 'checkbox', label: '', defaultWidth: 40, minWidth: 40, locked: true },
  { key: 'star', label: '', defaultWidth: 36, minWidth: 36, locked: true },
  { key: 'type', label: 'TYPE', defaultWidth: 56, minWidth: 44, locked: true },
  { key: 'key', label: 'KEY', defaultWidth: 120, minWidth: 80 },
  { key: 'summary', label: 'SUMMARY', defaultWidth: 380, minWidth: 150 },
  { key: 'status', label: 'STATUS', defaultWidth: 130, minWidth: 80 },
  { key: 'parent', label: 'PARENT', defaultWidth: 200, minWidth: 100 },
  { key: 'assignee', label: 'ASSIGNEE', defaultWidth: 160, minWidth: 100 },
  { key: 'priority', label: 'PRIORITY', defaultWidth: 80, minWidth: 50 },
  { key: 'updated', label: 'UPDATED', defaultWidth: 90, minWidth: 60 },
];

const SORTABLE_KEYS = new Set(['key', 'summary', 'status', 'parent', 'assignee', 'priority', 'updated']);

// ── Group By options ──
type GroupByKey = 'none' | 'status' | 'priority' | 'assignee' | 'parent';
const GROUP_OPTIONS: GroupByOption<GroupByKey>[] = [
  { key: 'status', label: 'Status', icon: 'status' },
  { key: 'priority', label: 'Priority', icon: 'priority' },
  { key: 'assignee', label: 'Assignee', icon: 'assignee' },
  { key: 'parent', label: 'Parent', icon: 'parent' },
];

const PRIORITY_ORDER = ['critical', 'highest', 'high', 'medium', 'low', 'lowest'];

const PRIORITY_ICONS: Record<string, React.ReactNode> = {
  critical: <PriorityBars priority="critical" />,
  highest: <PriorityBars priority="critical" />,
  high: <PriorityBars priority="high" />,
  medium: <PriorityBars priority="medium" />,
  low: <PriorityBars priority="low" />,
  lowest: <PriorityBars priority="low" />,
};

function getSortValue(s: BacklogStory, colKey: string): string | number {
  switch (colKey) {
    case 'key': return s.story_key || '';
    case 'summary': return (s.title || '').toLowerCase();
    case 'status': return (s.status || '').toLowerCase();
    case 'parent': return s.feature?.epic?.name?.toLowerCase() || '';
    case 'assignee': return (s.assignee_name || '').toLowerCase();
    case 'priority': {
      const idx = PRIORITY_ORDER.indexOf(s.priority || '');
      return idx >= 0 ? idx : 999;
    }
    case 'updated': return s.jira_updated_at || '';
    default: return '';
  }
}

function sortStories(items: BacklogStory[], sortKey: string | null, sortDir: SortDir): BacklogStory[] {
  if (!sortKey || !sortDir) return items;
  return [...items].sort((a, b) => {
    const aVal = getSortValue(a, sortKey);
    const bVal = getSortValue(b, sortKey);
    const cmp = typeof aVal === 'number' && typeof bVal === 'number'
      ? aVal - bVal
      : String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });
}

function groupStories(items: BacklogStory[], groupBy: GroupByKey): { label: string; items: BacklogStory[] }[] {
  if (groupBy === 'none') return [{ label: '', items }];

  const map = new Map<string, BacklogStory[]>();
  items.forEach(s => {
    let key: string;
    switch (groupBy) {
      case 'status': key = s.status || 'No Status'; break;
      case 'priority': key = s.priority || 'No Priority'; break;
      case 'assignee': key = s.assignee_name || 'Unassigned'; break;
      case 'parent': key = s.feature?.epic?.name || 'No Parent'; break;
      default: key = 'Other';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  // Sort groups
  const entries = Array.from(map.entries());
  if (groupBy === 'priority') {
    entries.sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a[0].toLowerCase());
      const bi = PRIORITY_ORDER.indexOf(b[0].toLowerCase());
      return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
    });
  } else {
    entries.sort((a, b) => a[0].localeCompare(b[0]));
  }

  return entries.map(([label, items]) => ({ label, items }));
}




const AVATAR_COLOURS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'];

// ── V2 table feature flag ──
// When localStorage.catalyst.table.v2 === '1', the backlog renders via the
// shared DynamicTable molecule (Atlaskit-API-compatible). Default OFF — the
// legacy CatalystTable path below is unchanged.
const V2_TABLE_ENABLED =
  typeof window !== 'undefined' && window.localStorage?.getItem('catalyst.table.v2') === '1';

// ── @atlaskit/* full rebuild — opt in with localStorage.setItem('catalyst.story-backlog.atlaskit', '1') ──
// NOTE 2026-04-27: this StoryBacklogPage path is reached via /program/* aliases
// only. The unified /project-hub/:key/backlog route mounts BacklogPage.atlaskit
// directly (see FullAppRoutes UnifiedBacklogPageLazy). Keep flag opt-in here.
const ATLASKIT_BACKLOG_ENABLED =
  typeof window !== 'undefined' && window.localStorage?.getItem('catalyst.story-backlog.atlaskit') === '1';
const AtlaskitStoryBacklogPage = ATLASKIT_BACKLOG_ENABLED
  ? lazy(() => import('./StoryBacklogPage.atlaskit'))
  : null;

export default function StoryBacklogPage({ projectId: propProjectId, projectKey }: { projectId?: string; projectKey?: string }) {
  // Feature-flag short-circuit: render the Atlaskit version if the flag is set.
  // Returning before any hooks is safe — React requires no hooks here.
  // The flag is read once at module load, so it's stable across renders within a session.
  if (ATLASKIT_BACKLOG_ENABLED && AtlaskitStoryBacklogPage) {
    return (
      <Suspense fallback={null}>
        <AtlaskitStoryBacklogPage projectId={propProjectId} projectKey={projectKey} />
      </Suspense>
    );
  }

  const params = useParams<{ projectId: string }>();
  const projectId = propProjectId || params.projectId;
  const queryClient = useQueryClient();
  const { data: stories, isLoading, error } = useStoryBacklog(projectId || '');
  const avatarsByName = useProfileAvatarsByName();
  const { data: starredIds } = useStarredItemIds();
  const toggleStarMutation = useToggleStar();
  const { isDark } = useTheme();
  const tk = isDark ? DK : LK;

  // ── Table columns (CatalystTable pattern) ──
  const {
    orderedColumns, columnWidths, dragKey, dragOverKey,
    onResizeStart, onDragStart, onDragOver, onDragEnd,
  } = useTableColumns('story-backlog', STORY_COLUMNS);

  // ── State ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<GroupByKey>('none');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [editStoryId, setEditStoryId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BacklogStory | null>(null);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const navigate = useNavigate();
  const openStoryDetail = useCallback((_id: string, issueKey: string | null | undefined) => {
    if (!issueKey) return;
    const origin = {
      fromUrl: `/project-hub/${projectKey}/story-backlog`,
      fromLabel: 'Story backlog',
      fromType: 'story-backlog' as const,
    };
    writeTicketOrigin(origin);
    navigate(`/project-hub/${projectKey}/issue/${issueKey}`, { state: { ticketOrigin: origin } });
  }, [projectKey, navigate]);
  const [panelMode, setPanelMode] = useState(false);
  const [panelDividerWidth, setPanelDividerWidth] = useState(55);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, string[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Resizable panel
  const containerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const isDraggingPanel = useRef(false);

  const handlePanelMouseDown = useCallback(() => {
    isDraggingPanel.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingPanel.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      setPanelDividerWidth(Math.max(25, Math.min(75, pct)));
    };
    const handleMouseUp = () => {
      if (isDraggingPanel.current) {
        isDraggingPanel.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ── Sorting ──
  const handleSort = useCallback((colKey: string) => {
    if (!SORTABLE_KEYS.has(colKey)) return;
    setSortKey(prev => {
      if (prev !== colKey) { setSortDir('asc'); return colKey; }
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      return colKey;
    });
  }, []);

  // ── Filter categories ──
  const filterCategories = useMemo<FilterCategory[]>(() => {
    const allStories = stories || [];

    const statusSet = new Map<string, string>();
    allStories.forEach(s => {
      if (s.status) {
        const cfg = STORY_STATUS_LOZENGE[s.status];
        statusSet.set(s.status, cfg?.label || s.status);
      }
    });
    const statusOptions = Array.from(statusSet.entries()).map(([id, label]) => ({
      id, label,
      iconNode: <StatusBadge status={id} />,
      hideLabel: true,
    }));

    const prioritySet = new Set<string>();
    allStories.forEach(s => { if (s.priority) prioritySet.add(s.priority); });
    const priorityOptions = PRIORITY_ORDER
      .filter(p => prioritySet.has(p))
      .map(p => ({ id: p, label: getPriorityLabel(p), iconNode: PRIORITY_ICONS[p] }));

    const assigneeMap = new Map<string, { name: string; avatarUrl?: string }>();
    allStories.forEach(s => {
      const name = s.assignee_name;
      if (name && !assigneeMap.has(name)) {
        assigneeMap.set(name, { name, avatarUrl: avatarsByName.get(name.toLowerCase()) || undefined });
      }
    });
    const assigneeOptions = Array.from(assigneeMap.values())
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(a => ({
        id: a.name, label: a.name, avatarUrl: a.avatarUrl,
        avatarInitials: !a.avatarUrl ? getInitials(a.name) : undefined,
        avatarType: (a.avatarUrl ? 'photo' : 'initials') as 'photo' | 'initials',
      }));

    const parentMap = new Map<string, { key: string; name: string; type: 'epic' | 'feature' }>();
    allStories.forEach(s => {
      const feat = s.feature;
      if (feat && !parentMap.has(`feature-${feat.id}`)) {
        parentMap.set(`feature-${feat.id}`, { key: feat.display_id || '', name: feat.name, type: 'feature' });
      }
      const epic = feat?.epic;
      if (epic && !parentMap.has(`epic-${epic.id}`)) {
        parentMap.set(`epic-${epic.id}`, { key: epic.epic_key || '', name: epic.name, type: 'epic' });
      }
    });
    const parentOptions = Array.from(parentMap.entries())
      .sort((a, b) => a[1].name.localeCompare(b[1].name))
      .map(([id, e]) => ({
        id, label: e.name, labelExtra: e.key || undefined,
        iconNode: <JiraIssueTypeIcon type={e.type === 'epic' ? 'Epic' : 'Feature'} size={16} />,
      }));

    return [
      { id: 'status', label: 'Status', options: statusOptions, searchPlaceholder: 'Search statuses' },
      { id: 'priority', label: 'Priority', options: priorityOptions, searchPlaceholder: 'Search priorities' },
      { id: 'assignee', label: 'Assignee', options: assigneeOptions, searchPlaceholder: 'Search people' },
      { id: 'parent', label: 'Parent', options: parentOptions, searchPlaceholder: 'Search epics & features' },
    ];
  }, [stories, avatarsByName]);

  const advancedFilterCount = useMemo(() => Object.values(advancedFilters).flat().length, [advancedFilters]);

  const handleFilterChange = useCallback((categoryId: string, optionIds: string[]) => {
    setAdvancedFilters(prev => ({ ...prev, [categoryId]: optionIds }));
  }, []);

  const handleClearAllFilters = useCallback(() => { setAdvancedFilters({}); }, []);

  // ── Filtered + sorted + grouped stories ──
  const filteredStories = useMemo(() => {
    let result = stories || [];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s =>
        (s.title && s.title.toLowerCase().includes(q)) ||
        (s.story_key && s.story_key.toLowerCase().includes(q)) ||
        (s.assignee_name && s.assignee_name.toLowerCase().includes(q))
      );
    }
    const f = advancedFilters;
    if (f.status?.length) result = result.filter(s => s.status && f.status.includes(s.status));
    if (f.priority?.length) result = result.filter(s => s.priority && f.priority.includes(s.priority));
    if (f.assignee?.length) result = result.filter(s => s.assignee_name && f.assignee.includes(s.assignee_name));
    if (f.parent?.length) result = result.filter(s => {
      const feat = s.feature;
      if (!feat) return false;
      return f.parent.includes(`feature-${feat.id}`) || (feat.epic ? f.parent.includes(`epic-${feat.epic.id}`) : false);
    });
    return result;
  }, [stories, advancedFilters, searchQuery]);

  const sortedStories = useMemo(() => sortStories(filteredStories, sortKey, sortDir), [filteredStories, sortKey, sortDir]);

  // Pagination
  const totalFiltered = sortedStories.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const paginatedStories = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedStories.slice(start, start + pageSize);
  }, [sortedStories, page, pageSize]);

  // Reset page when filters/search change
  useEffect(() => { setPage(1); }, [searchQuery, advancedFilters, groupBy]);

  const groups = useMemo(() => groupStories(paginatedStories, groupBy), [paginatedStories, groupBy]);

  const flatStories = useMemo(() => {
    const result: { id: string; summary: string; issue_key?: string }[] = [];
    groups.forEach(group => {
      if (!collapsed[group.label]) {
        group.items.forEach(s => {
          if (s?.id) result.push({ id: s.id, summary: s.title, issue_key: s.story_key || undefined });
        });
      }
    });
    return result;
  }, [groups, collapsed]);
  const total = totalFiltered;
  const toggleGroup = (label: string) => setCollapsed(prev => ({ ...prev, [label]: !prev[label] }));

  // ── Selection ──
  const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups]);
  const isAllSelected = flatItems.length > 0 && flatItems.every(i => selectedIds.has(i.id));
  const handleSelectAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(flatItems.map(i => i.id)) : new Set());
  }, [flatItems]);
  const handleSelectItem = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('stories').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
      toast.success('Story archived successfully');
      setDeleteTarget(null);
    },
    onError: () => toast.error('Failed to archive story'),
  });

  const handleTogglePanelMode = useCallback(() => setPanelMode(p => !p), []);
  const handleCloseDetail = useCallback(() => {
    if (panelMode) setPanelMode(false);
    setDetailItemId(null);
  }, [panelMode]);

  // ── Keyboard nav ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current?.contains(document.activeElement) && document.activeElement !== tableRef.current) return;
      switch (e.key) {
        case 'j': case 'ArrowDown': e.preventDefault(); setFocusedIndex(prev => Math.min(prev + 1, flatItems.length - 1)); break;
        case 'k': case 'ArrowUp': e.preventDefault(); setFocusedIndex(prev => Math.max(prev - 1, 0)); break;
        case 'Enter': e.preventDefault(); if (focusedIndex >= 0 && focusedIndex < flatItems.length) { const it = flatItems[focusedIndex]; openStoryDetail(it.id, it.story_key); } break;
        case 'Escape': e.preventDefault(); setSelectedIds(new Set()); setFocusedIndex(-1); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [flatItems, focusedIndex]);

  // ── Cell renderer ──
  const renderCell = (colKey: string, story: BacklogStory, isSelected: boolean, isFocused: boolean) => {
    const avatarUrl = story.assignee_name ? avatarsByName.get(story.assignee_name.toLowerCase()) : null;

    switch (colKey) {
      case 'checkbox':
        return (
          <td key={colKey} style={{ width: columnWidths.checkbox, overflow: 'visible', textOverflow: 'clip' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Checkbox checked={selectedIds.has(story.id)} onCheckedChange={(v) => handleSelectItem(story.id, !!v)} />
            </div>
          </td>
        );
      case 'star': {
        const isStarred = starredIds?.has(story.id) ?? false;
        return (
          <td key={colKey} style={{ width: columnWidths.star, overflow: 'visible', textOverflow: 'clip' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                onClick={() => toggleStarMutation.mutate({ itemId: story.id, itemType: 'story', isCurrentlyStarred: isStarred })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
              >
                <Star
                  size={14}
                  fill={isStarred ? '#F59E0B' : 'none'}
                  stroke={isStarred ? '#F59E0B' : '#94A3B8'}
                  style={{ transition: 'all 150ms' }}
                />
              </button>
            </div>
          </td>
        );
      }
      case 'type':
        return (
          <td key={colKey} style={{ width: columnWidths.type, overflow: 'visible', textOverflow: 'clip' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <JiraIssueTypeIcon type="story" size={16} />
            </div>
          </td>
        );
      case 'key':
        return (
          <td key={colKey} style={{ width: columnWidths.key }}>
            <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
              {story.story_key || '—'}
            </span>
          </td>
        );
      case 'summary':
        return (
          <td key={colKey} style={{ fontWeight: 500, width: columnWidths.summary, maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {story.title}
          </td>
        );
      case 'status':
        return (
          <td key={colKey} style={{ width: columnWidths.status }}>
            {story.status && <StatusBadge status={story.status} />}
          </td>
        );
      case 'parent':
        return (
          <td key={colKey} style={{ width: columnWidths.parent, overflow: 'hidden' }}>
            {story.feature?.epic ? (
              <ParentEpicChip epicId={story.feature.epic.id} epicKey={story.feature.epic.epic_key} epicName={story.feature.epic.name} />
            ) : (
              <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
            )}
          </td>
        );
      case 'assignee':
        return (
          <td key={colKey} style={{ width: columnWidths.assignee }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} alt="" />
              ) : (
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: AVATAR_COLOURS[(getInitials(story.assignee_name || null) || 'U').charCodeAt(0) % AVATAR_COLOURS.length],
                  color: 'var(--ds-text-inverse, #FFFFFF)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                }}>
                  {getInitials(story.assignee_name || null)}
                </div>
              )}
              <span style={{ fontSize: 13, fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {story.assignee_name || 'Unassigned'}
              </span>
            </div>
          </td>
        );
      case 'priority':
        return (
          <td key={colKey} style={{ width: columnWidths.priority }} title={getPriorityLabel(story.priority)}>
            <div style={{ display: 'flex', gap: 2 }}>
              {[1, 2, 3, 4].map(i => {
                const level = PRIORITY_ORDER.indexOf(story.priority || '') >= 0 ? PRIORITY_ORDER.length - PRIORITY_ORDER.indexOf(story.priority || '') : 0;
                const filled = i <= level;
                const fillColor = level >= 4 ? '#E5484D' : level >= 3 ? '#F59E0B' : '#22C55E';
                return <div key={i} style={{ width: 4, height: 14, borderRadius: 1, background: filled ? fillColor : '#E2E8F0' }} />;
              })}
            </div>
          </td>
        );
      case 'updated':
        return (
          <td key={colKey} style={{ width: columnWidths.updated, fontSize: 12, fontWeight: 500, color: '#64748B' }}>
            {formatDueDate(story.jira_updated_at ?? null)}
          </td>
        );
      default:
        return <td key={colKey} />;
    }
  };

  // ═════════════════════════════════════════════════════════════════════
  // V2 TABLE PATH (feature-flagged). Hooks declared unconditionally —
  // early returns for loading/error live below all hooks to satisfy the
  // Rules of Hooks (otherwise: "Rendered fewer hooks than expected").
  // ═════════════════════════════════════════════════════════════════════

  // Column sizing persistence — keyed under catalyst.dynamic-table.story-backlog
  const v2Persistence = useTablePersistence('story-backlog');

  // TanStack selection shape ↔ existing Set<string>
  const v2Selection: RowSelectionState = useMemo(() => {
    const r: RowSelectionState = {};
    selectedIds.forEach((id) => { r[id] = true; });
    return r;
  }, [selectedIds]);

  const handleV2SelectionChange = useCallback((next: RowSelectionState) => {
    const ids = new Set<string>();
    Object.entries(next).forEach(([id, on]) => { if (on) ids.add(id); });
    setSelectedIds(ids);
  }, []);

  // TanStack sorting shape ↔ existing sortKey/sortDir
  const v2Sorting: SortingState = useMemo(() => {
    if (!sortKey || !sortDir) return [];
    return [{ id: sortKey, desc: sortDir === 'desc' }];
  }, [sortKey, sortDir]);

  const handleV2SortingChange = useCallback((next: SortingState) => {
    if (!next.length) { setSortKey(null); setSortDir(null); return; }
    const s = next[0];
    setSortKey(s.id);
    setSortDir(s.desc ? 'desc' : 'asc');
  }, []);

  // Column model — mirrors STORY_COLUMNS (minus checkbox, which the molecule
  // provides via `selectable`). Cell renderers return cell CONTENT only;
  // the molecule wraps them in role="cell" divs.
  const v2Columns = useMemo<DynamicTableColumn<BacklogStory>[]>(() => [
    {
      id: 'star',
      size: 36, minSize: 36, maxSize: 36,
      align: 'center',
      alwaysVisible: true,
      disableResize: true,
      disableSort: true,
      header: () => (
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Star size={13} stroke="#94A3B8" fill="none" />
        </span>
      ),
      cell: ({ row }) => {
        const s = row.original;
        const isStarred = starredIds?.has(s.id) ?? false;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStarMutation.mutate({ itemId: s.id, itemType: 'story', isCurrentlyStarred: isStarred });
            }}
            aria-label={isStarred ? 'Unstar story' : 'Star story'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}
          >
            <Star
              size={14}
              fill={isStarred ? '#F59E0B' : 'none'}
              stroke={isStarred ? '#F59E0B' : '#94A3B8'}
              style={{ transition: 'all 150ms' }}
            />
          </button>
        );
      },
    },
    {
      id: 'type',
      size: 56, minSize: 44,
      align: 'center',
      alwaysVisible: true,
      disableResize: true,
      disableSort: true,
      label: 'Type',
      header: 'TYPE',
      cell: () => <JiraIssueTypeIcon type="story" size={16} />,
    },
    {
      id: 'key',
      size: 120, minSize: 80,
      label: 'Key',
      header: 'KEY',
      sortingFn: (a, b) => (a.original.story_key || '').localeCompare(b.original.story_key || ''),
      cell: ({ row }) => (
        <span style={{ fontFamily: 'var(--cp-font-mono)', fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
          {row.original.story_key || '—'}
        </span>
      ),
    },
    {
      id: 'summary',
      size: 380, minSize: 150,
      label: 'Summary',
      header: 'SUMMARY',
      sortingFn: (a, b) => (a.original.title || '').toLowerCase().localeCompare((b.original.title || '').toLowerCase()),
      cell: ({ row }) => (
        <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.original.title}
        </span>
      ),
    },
    {
      id: 'status',
      size: 130, minSize: 80,
      label: 'Status',
      header: 'STATUS',
      sortingFn: (a, b) => (a.original.status || '').localeCompare(b.original.status || ''),
      cell: ({ row }) => (row.original.status ? <StatusBadge status={row.original.status} /> : null),
    },
    {
      id: 'parent',
      size: 200, minSize: 100,
      label: 'Parent',
      header: 'PARENT',
      sortingFn: (a, b) =>
        (a.original.feature?.epic?.name || '').toLowerCase()
          .localeCompare((b.original.feature?.epic?.name || '').toLowerCase()),
      cell: ({ row }) => {
        const ep = row.original.feature?.epic;
        return ep
          ? <ParentEpicChip epicId={ep.id} epicKey={ep.epic_key} epicName={ep.name} />
          : <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>;
      },
    },
    {
      id: 'assignee',
      size: 160, minSize: 100,
      label: 'Assignee',
      header: 'ASSIGNEE',
      sortingFn: (a, b) =>
        (a.original.assignee_name || '').toLowerCase()
          .localeCompare((b.original.assignee_name || '').toLowerCase()),
      cell: ({ row }) => {
        const s = row.original;
        const url = s.assignee_name ? avatarsByName.get(s.assignee_name.toLowerCase()) : null;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
            {url ? (
              <img
                src={url}
                style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }}
                alt=""
              />
            ) : (
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: AVATAR_COLOURS[(getInitials(s.assignee_name || null) || 'U').charCodeAt(0) % AVATAR_COLOURS.length],
                color: 'var(--ds-text-inverse, #FFFFFF)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}>
                {getInitials(s.assignee_name || null)}
              </div>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.assignee_name || 'Unassigned'}
            </span>
          </div>
        );
      },
    },
    {
      id: 'priority',
      size: 80, minSize: 50,
      label: 'Priority',
      header: 'PRIORITY',
      sortingFn: (a, b) => {
        const ai = PRIORITY_ORDER.indexOf(a.original.priority || '');
        const bi = PRIORITY_ORDER.indexOf(b.original.priority || '');
        return (ai >= 0 ? ai : 999) - (bi >= 0 ? bi : 999);
      },
      cell: ({ row }) => {
        const s = row.original;
        const idx = PRIORITY_ORDER.indexOf(s.priority || '');
        const level = idx >= 0 ? PRIORITY_ORDER.length - idx : 0;
        return (
          <div style={{ display: 'flex', gap: 2 }} title={getPriorityLabel(s.priority)}>
            {[1, 2, 3, 4].map((i) => {
              const filled = i <= level;
              const fillColor = level >= 4 ? '#E5484D' : level >= 3 ? '#F59E0B' : '#22C55E';
              return <div key={i} style={{ width: 4, height: 14, borderRadius: 1, background: filled ? fillColor : '#E2E8F0' }} />;
            })}
          </div>
        );
      },
    },
    {
      id: 'updated',
      size: 90, minSize: 60,
      label: 'Updated',
      header: 'UPDATED',
      sortingFn: (a, b) => (a.original.jira_updated_at || '').localeCompare(b.original.jira_updated_at || ''),
      cell: ({ row }) => (
        <span style={{ fontSize: 12, fontWeight: 500, color: '#64748B' }}>
          {formatDueDate(row.original.jira_updated_at ?? null)}
        </span>
      ),
    },
  ], [starredIds, toggleStarMutation, avatarsByName]);

  // Grouped rows for molecule — builds from the same `groups` list the legacy
  // path uses, so group-by semantics are identical.
  const v2Groups: DynamicTableRowGroup<BacklogStory>[] | undefined = useMemo(() => {
    if (groupBy === 'none') return undefined;
    return groups.map((g) => ({
      id: g.label || '__ungrouped',
      label: (g.label || '').toUpperCase(),
      rows: g.items,
    }));
  }, [groups, groupBy]);

  // ── Loading / Error (after ALL hooks — Rules of Hooks) ──
  if (isLoading) {
    return (
      <div className="h-full" style={{ background: tk.pageBg }}>
        <div className="px-6 py-4"><div className="h-8 w-48 rounded" style={{ background: tk.chipBg }} /></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="px-6 py-2 flex gap-3 animate-pulse">
            <div className="h-[36px] flex-1 rounded" style={{ background: tk.chipBg }} />
          </div>
        ))}
      </div>
    );
  }

  if (error) return <div className="h-full flex items-center justify-center" style={{ background: tk.pageBg, color: '#DC2626' }}>Error loading stories</div>;

  const v2EmptyState = (
    <div className="flex flex-col items-center justify-center" style={{ padding: '64px 0' }}>
      <BookOpen className="h-12 w-12 mb-4" style={{ color: '#94A3B8' }} />
      <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No stories found</p>
      <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Try adjusting your filters or search</p>
    </div>
  );

  const renderPagination = () => (
    totalPages > 1 ? (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderTop: '0.75px solid #E2E8F0',
        fontSize: 13, color: '#64748B', fontFamily: 'var(--cp-font-body)',
      }}>
        <span style={{ fontWeight: 500 }}>
          {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalFiltered)} of {totalFiltered}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 4,
              border: '1px solid #E2E8F0', background: 'var(--ds-text-inverse, #FFFFFF)',
              cursor: page <= 1 ? 'not-allowed' : 'pointer',
              opacity: page <= 1 ? 0.4 : 1,
            }}
          >
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
              acc.push(p);
              return acc;
            }, [])
            .map((p, i) =>
              p === 'ellipsis' ? (
                <span key={`e${i}`} style={{ padding: '0 4px', color: '#94A3B8' }}>…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 28, height: 28, borderRadius: 4, padding: '0 6px',
                    border: page === p ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                    background: page === p ? 'rgba(37,99,235,0.06)' : 'var(--ds-text-inverse, #FFFFFF)',
                    color: page === p ? '#2563EB' : '#475569',
                    fontWeight: page === p ? 600 : 400,
                    fontSize: 13, cursor: 'pointer',
                    fontFamily: 'var(--cp-font-body)',
                  }}
                >
                  {p}
                </button>
              )
            )}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 28, height: 28, borderRadius: 4,
              border: '1px solid #E2E8F0', background: 'var(--ds-text-inverse, #FFFFFF)',
              cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              opacity: page >= totalPages ? 0.4 : 1,
            }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    ) : null
  );

  const renderTableV2 = () => (
    <div ref={tableRef} tabIndex={0} style={{ outline: 'none', border: '0.555556px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
      <DynamicTable<BacklogStory>
        tableId="story-backlog"
        ariaLabel="Story backlog"
        columns={v2Columns}
        data={groupBy === 'none' ? paginatedStories : undefined}
        groups={v2Groups}
        getRowId={(s) => s.id}
        onRowClick={(s) => openStoryDetail(s.id, s.story_key)}
        selectable
        selection={v2Selection}
        onSelectionChange={handleV2SelectionChange}
        sortable
        sorting={v2Sorting}
        onSortingChange={handleV2SortingChange}
        resizable
        columnSizing={v2Persistence.sizing}
        onColumnSizingChange={v2Persistence.onSizingChange}
        density="compact"
        stickyHeader
        minTableWidth={1100}
        emptyState={v2EmptyState}
      />
      {renderPagination()}
    </div>
  );

  let rowIndex = -1;

  const renderTable = () => {
    if (V2_TABLE_ENABLED) return renderTableV2();
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center" style={{ padding: '64px 0' }}>
          <BookOpen className="h-12 w-12 mb-4" style={{ color: '#94A3B8' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No stories found</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Try adjusting your filters or search</p>
        </div>
      );
    }

    return (
      <div ref={tableRef} tabIndex={0} style={{ outline: 'none', border: '0.555556px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="pb-table" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: 1100 }}>
            <colgroup>
              {orderedColumns.map(c => (
                <col key={c.key} style={{ width: columnWidths[c.key] || c.defaultWidth }} />
              ))}
            </colgroup>
            <thead>
              <tr className="group/thead">
                {orderedColumns.map(c => {
                  if (c.key === 'checkbox') {
                    return (
                      <th key={c.key} style={{ width: columnWidths.checkbox, overflow: 'visible', textOverflow: 'clip' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Checkbox checked={isAllSelected} onCheckedChange={(v) => handleSelectAll(!!v)} />
                        </div>
                      </th>
                    );
                  }
                  if (c.key === 'star') {
                    return (
                      <th key={c.key} style={{ width: columnWidths.star, overflow: 'visible', textOverflow: 'clip' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Star size={13} stroke="#94A3B8" fill="none" />
                        </div>
                      </th>
                    );
                  }
                  return (
                    <ResizableTableHeader
                      key={c.key}
                      colKey={c.key}
                      label={c.label}
                      width={columnWidths[c.key] || c.defaultWidth}
                      locked={c.locked}
                      isDragging={dragKey === c.key}
                      isDragOver={dragOverKey === c.key}
                      onResizeStart={onResizeStart}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDragEnd={onDragEnd}
                      sortDirection={sortKey === c.key ? sortDir : null}
                      onSort={SORTABLE_KEYS.has(c.key) ? handleSort : undefined}
                    />
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {groups.map(group => (
                <React.Fragment key={group.label || '__ungrouped'}>
                  {/* Group header — only show if grouping is active */}
                  {groupBy !== 'none' && (
                    <tr>
                      <td
                        colSpan={orderedColumns.length}
                        style={{
                          height: 36, padding: '0 12px', cursor: 'pointer', userSelect: 'none',
                          background: '#F7F8F9',
                          borderBottom: '0.75px solid #E2E8F0',
                          borderTop: '0.75px solid #E2E8F0',
                          fontSize: 11, fontWeight: 700, color: '#475569',
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          verticalAlign: 'middle',
                        }}
                        onClick={() => toggleGroup(group.label)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {collapsed[group.label]
                            ? <ChevronRight size={14} style={{ color: '#475569' }} />
                            : <ChevronDown size={14} style={{ color: '#475569' }} />
                          }
                          {groupBy === 'assignee' && group.label !== 'Unassigned' && (() => {
                            const url = avatarsByName.get(group.label.toLowerCase());
                            return url ? (
                              <img src={url} alt="" style={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid #E2E8F0' }} />
                            ) : (
                              <div style={{
                                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                background: AVATAR_COLOURS[(getInitials(group.label) || 'U').charCodeAt(0) % AVATAR_COLOURS.length],
                                color: 'var(--ds-text-inverse, #FFFFFF)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 9, fontWeight: 700,
                              }}>
                                {getInitials(group.label)}
                              </div>
                            );
                          })()}
                          {group.label}
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            minWidth: 20, height: 18, padding: '0 6px', borderRadius: 9,
                            background: '#DFE1E6', color: '#253858',
                            fontSize: 10, fontWeight: 700,
                          }}>
                            {group.items.length}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!collapsed[group.label] && group.items.map((story) => {
                    rowIndex++;
                    const currentRowIndex = rowIndex;
                    const isSelected = selectedIds.has(story.id);
                    const isFocused = focusedIndex === currentRowIndex;
                    const isPanelSelected = panelMode && detailItemId === story.id;

                    return (
                      <tr
                        key={story.id}
                        className={`group ${isSelected ? 'pb-row-selected' : ''}`}
                        onClick={() => { setFocusedIndex(currentRowIndex); openStoryDetail(story.id, story.story_key); }}
                        style={{
                          cursor: 'pointer',
                          background: isPanelSelected ? '#DEEBFF' : isSelected ? 'rgba(37,99,235,0.08)' : isFocused ? 'rgba(0,0,0,0.04)' : undefined,
                        }}
                      >
                        {orderedColumns.map(c => renderCell(c.key, story, isSelected, isFocused))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderTop: '0.75px solid #E2E8F0',
            fontSize: 13, color: '#64748B', fontFamily: 'var(--cp-font-body)',
          }}>
            <span style={{ fontWeight: 500 }}>
              {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalFiltered)} of {totalFiltered}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 4,
                  border: '1px solid #E2E8F0', background: 'var(--ds-text-inverse, #FFFFFF)',
                  cursor: page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: page <= 1 ? 0.4 : 1,
                }}
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
                  if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === 'ellipsis' ? (
                    <span key={`e${i}`} style={{ padding: '0 4px', color: '#94A3B8' }}>…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        minWidth: 28, height: 28, borderRadius: 4, padding: '0 6px',
                        border: page === p ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        background: page === p ? 'rgba(37,99,235,0.06)' : 'var(--ds-text-inverse, #FFFFFF)',
                        color: page === p ? '#2563EB' : '#475569',
                        fontWeight: page === p ? 600 : 400,
                        fontSize: 13, cursor: 'pointer',
                        fontFamily: 'var(--cp-font-body)',
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 4,
                  border: '1px solid #E2E8F0', background: 'var(--ds-text-inverse, #FFFFFF)',
                  cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages ? 0.4 : 1,
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="h-full flex flex-col" style={{ background: tk.pageBg }}>
      {/* ── Title ── */}
      <CatalystPageHeader title="Story Backlog" />

      {/* ── Search + Group + Filter bar ── */}
      <div className="flex items-center gap-3 px-6 py-2.5" style={{ borderColor: tk.border }}>
        {/* Search */}
        <div className="relative w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#94A3B8' }} />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, key, Jira ID..."
            className="h-9 pl-9 pr-3 text-sm"
            style={{ borderColor: '#E2E8F0', background: tk.pageBg, color: tk.t1 }}
          />
        </div>

        {/* Filter trigger */}
        <div style={{ position: 'relative', zIndex: 50 }}>
          <FilterTriggerButton
            count={advancedFilterCount}
            onClick={() => setFilterPanelOpen(p => !p)}
            isOpen={filterPanelOpen}
          />
          {filterPanelOpen && (
            <JiraBasicFilter
              categories={filterCategories}
              selected={advancedFilters}
              onSelectionChange={handleFilterChange}
              onClearAll={handleClearAllFilters}
              onClose={() => setFilterPanelOpen(false)}
            />
          )}
        </div>

        {/* Group By */}
        <SharedGroupByPopover<GroupByKey> value={groupBy} onChange={setGroupBy} options={GROUP_OPTIONS} noneKey="none" />

        <div className="flex-1" />

        {/* Total count */}
        <span style={{ fontSize: 13, color: '#64748B' }}>{total} stories</span>

      </div>

      {panelMode && detailItemId ? (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          <div style={{ width: `${panelDividerWidth}%`, flexShrink: 0, overflow: 'auto', transition: isDraggingPanel.current ? 'none' : 'width 0.15s ease' }}>
            <div style={{ padding: '0 16px 16px' }}>{renderTable()}</div>
          </div>
          <div
            onMouseDown={handlePanelMouseDown}
            style={{ width: 6, minWidth: 6, cursor: 'col-resize', flexShrink: 0, background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.15s', position: 'relative', zIndex: 10 }}
            onMouseEnter={e => (e.currentTarget.style.background = '#F1F5F9')}
            onMouseLeave={e => { if (!isDraggingPanel.current) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 1.5, height: 40, borderRadius: 1, background: '#E2E8F0' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', transition: isDraggingPanel.current ? 'none' : 'flex 0.15s ease' }}>
            <Suspense fallback={<div style={{ padding: 24, color: '#97A0AF' }}>Loading…</div>}>
              <CatalystDetailRouter
                isOpen={true}
                onClose={handleCloseDetail}
                itemId={detailItemId}
                projectId={projectId || ''}
                projectKey={projectKey || ''}
                onOpenItem={(id) => setDetailItemId(id)}
                panelMode={true}
                onTogglePanelMode={handleTogglePanelMode}
                navigationItems={flatStories}
                onNavigate={(id) => setDetailItemId(id)}
              />
            </Suspense>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-auto" style={{ padding: '16px 24px' }}>
          {renderTable()}
        </div>
      )}

      
      {editStoryId && <EditStoryDialog isOpen={!!editStoryId} onClose={() => setEditStoryId(null)} storyId={editStoryId} projectId={projectId || ''} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })} />}
      <DeleteConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} itemType="Story" itemKey={deleteTarget?.story_key || null} itemName={deleteTarget?.title || ''} isPending={deleteMutation.isPending} />
      {!panelMode && detailItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter isOpen={!!detailItemId} onClose={() => setDetailItemId(null)} itemId={detailItemId} projectId={projectId || ''} projectKey={projectKey || ''} onOpenItem={(id) => setDetailItemId(id)} onTogglePanelMode={handleTogglePanelMode} />
        </Suspense>
      )}

      {/* Jira-style bulk action bar */}
      {selectedIds.size > 0 && (() => {
        const selectedItems = flatItems.filter(s => selectedIds.has(s.id));
        const catItems = selectedItems.filter(s => (s as any).source === 'catalyst');
        const jiraItems = selectedItems.filter(s => (s as any).source === 'jira');
        return (
          <JiraBulkActionBar
            selectedIds={Array.from(selectedIds)}
            items={selectedItems.map(s => ({ id: s.id, issue_key: s.story_key, title: s.title, summary: s.title, status: s.status, priority: s.priority ?? undefined, assignee_name: s.assignee_name ?? undefined }))}
            onClear={() => setSelectedIds(new Set())}
            onDelete={catItems.length > 0 ? async (ids) => {
              // Only delete Catalyst-native items
              const catIds = catItems.map(s => s.id);
              const { error } = await supabase.from('catalyst_issues').delete().in('id', catIds);
              if (error) throw error;
              const skipped = jiraItems.length;
              const deleted = catIds.length;
              if (skipped > 0) {
                toast.success(`${deleted} item${deleted !== 1 ? 's' : ''} deleted. ${skipped} Jira-synced item${skipped !== 1 ? 's' : ''} skipped (delete in Jira).`);
              } else {
                toast.success(`${deleted} item${deleted !== 1 ? 's' : ''} deleted`);
              }
              setSelectedIds(new Set());
              queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] });
            } : async () => {
              toast.info('Jira-synced items cannot be deleted from Catalyst. Delete them in Jira instead.');
            }}
            entityLabel="work item"
          />
        );
      })()}
    </div>
  );
}
