/**
 * Story Backlog Page — CatalystTable pattern (pb-table, ResizableTableHeader, useTableColumns)
 * With Jira-style Group By dropdown + Filter
 */
import React, { useState, useMemo, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { useStarredItemIds, useToggleStar } from '@/hooks/home/useStarredItems';
import { useParams } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStoryBacklog } from '../hooks/useBacklogData';
import { STORY_STATUS_LOZENGE, formatDueDate, getPriorityLabel, getPriorityColor, getInitials } from '../utils/backlog.utils';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import { useProfileAvatarsByName } from '@/hooks/useProfileAvatars';
import { ParentEpicChip } from '../components/shared/ParentEpicChip';
import { DeleteConfirmDialog } from '../components/dialogs/DeleteConfirmDialog';
import { CreateStoryDialog } from '../components/dialogs/CreateStoryDialog';
import { EditStoryDialog } from '../components/dialogs/EditStoryDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ChevronDown, ChevronRight, ChevronLeft, Plus, Pencil, Trash2, BookOpen, Search, Layers, Check, X, Star } from 'lucide-react';
import { PriorityBars, normalisePriority } from '@/components/shared/PriorityIndicator';
import { toast } from 'sonner';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';
import type { BacklogStory } from '../types/backlog.types';
import { FilterTriggerButton, JiraBasicFilter } from '@/components/shared/JiraBasicFilter';
import type { FilterCategory } from '@/components/shared/JiraBasicFilter';
import { useTableColumns, type ColumnDef as TColDef } from '@/hooks/useTableColumns';
import { ResizableTableHeader, type SortDir } from '@/components/shared/ResizableTableHeader';
import '@/styles/product-backlog.css';

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
const GROUP_OPTIONS: { key: GroupByKey; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'parent', label: 'Parent' },
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

// ── Group By Popover ──
function GroupByPopover({
  value, onChange,
}: { value: GroupByKey; onChange: (v: GroupByKey) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = GROUP_OPTIONS.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const isActive = value !== 'none';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(p => !p)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          height: 32, padding: '0 10px', borderRadius: 6,
          border: isActive ? '1.5px solid #2563EB' : '1.5px solid #E2E8F0',
          background: isActive ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
          color: isActive ? '#2563EB' : '#0F172A',
          fontSize: 13, fontWeight: 500, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
          transition: 'all 150ms',
        }}
      >
        <Layers size={14} />
        Group
        {isActive && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minWidth: 18, height: 18, borderRadius: 9,
            background: '#2563EB', color: '#FFFFFF', fontSize: 10, fontWeight: 700,
          }}>1</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          width: 280, background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search grouping options"
                autoFocus
                style={{
                  width: '100%', height: 32, paddingLeft: 28, paddingRight: 8,
                  border: '1.5px solid #E2E8F0', borderRadius: 6,
                  fontSize: 13, color: '#0F172A', background: '#FFFFFF',
                  outline: 'none', fontFamily: "'Inter', sans-serif",
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
              />
            </div>
          </div>

          {/* Options */}
          <div style={{ padding: '4px 0', maxHeight: 240, overflowY: 'auto' }}>
            <div style={{ padding: '4px 12px 2px', fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              All fields
            </div>
            {filtered.map(opt => {
              const isSelected = value === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => { onChange(opt.key); setOpen(false); setSearch(''); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    height: 36, padding: '0 12px',
                    border: 'none', background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent',
                    color: isSelected ? '#2563EB' : '#0F172A',
                    fontSize: 14, fontWeight: isSelected ? 500 : 400,
                    cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                    borderLeft: isSelected ? '3px solid #2563EB' : '3px solid transparent',
                    transition: 'background 100ms',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                  {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: '#2563EB' }} />}
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No results</div>
            )}
          </div>

          {/* Clear */}
          {isActive && (
            <div style={{ padding: '6px 12px', borderTop: '1px solid #F1F5F9' }}>
              <button
                onClick={() => { onChange('none'); setOpen(false); }}
                style={{
                  border: 'none', background: 'transparent', color: '#94A3B8',
                  fontSize: 13, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  padding: '4px 0',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
                onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const AVATAR_COLOURS = ['#2563EB', '#0D9488', '#0284C7', '#DC2626', '#DB2777'];

export default function StoryBacklogPage({ projectId: propProjectId, projectKey }: { projectId?: string; projectKey?: string }) {
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
        case 'Enter': e.preventDefault(); if (focusedIndex >= 0 && focusedIndex < flatItems.length) setDetailItemId(flatItems[focusedIndex].id); break;
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
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
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
                  color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
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

  // ── Loading / Error ──
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

  let rowIndex = -1;

  const renderTable = () => {
    if (total === 0) {
      return (
        <div className="flex flex-col items-center justify-center" style={{ padding: '64px 0' }}>
          <BookOpen className="h-12 w-12 mb-4" style={{ color: '#94A3B8' }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>No stories found</p>
          <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 16 }}>Try adjusting your filters or search</p>
          <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Story
          </Button>
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
                                color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                        onClick={() => { setFocusedIndex(currentRowIndex); setDetailItemId(story.id); }}
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
            fontSize: 13, color: '#64748B', fontFamily: "'Inter', sans-serif",
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
                  border: '1px solid #E2E8F0', background: '#FFFFFF',
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
                        background: page === p ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
                        color: page === p ? '#2563EB' : '#475569',
                        fontWeight: page === p ? 600 : 400,
                        fontSize: 13, cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
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
                  border: '1px solid #E2E8F0', background: '#FFFFFF',
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
      {/* ── Title + Subtitle ── */}
      <div className="px-6 pt-5 pb-3 border-b" style={{ borderColor: tk.border }}>
        <h1 className="text-xl font-semibold" style={{ color: tk.t1, fontFamily: "'Sora', sans-serif", fontWeight: 650 }}>Story Backlog</h1>
        <p className="text-sm mt-0.5" style={{ color: tk.t2 }}>Track and manage user stories across your project</p>
      </div>

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
        <GroupByPopover value={groupBy} onChange={setGroupBy} />

        <div className="flex-1" />

        {/* Total count */}
        <span style={{ fontSize: 13, color: '#64748B' }}>{total} stories</span>

        {/* Create button */}
        <Button onClick={() => setShowCreate(true)} size="sm" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', borderRadius: 6 }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Story
        </Button>
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

      <CreateStoryDialog isOpen={showCreate} onClose={() => setShowCreate(false)} projectId={projectId || ''} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })} />
      {editStoryId && <EditStoryDialog isOpen={!!editStoryId} onClose={() => setEditStoryId(null)} storyId={editStoryId} projectId={projectId || ''} onSuccess={() => queryClient.invalidateQueries({ queryKey: ['backlog-stories', projectId] })} />}
      <DeleteConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)} itemType="Story" itemKey={deleteTarget?.story_key || null} itemName={deleteTarget?.title || ''} isPending={deleteMutation.isPending} />
      {!panelMode && detailItemId && (
        <Suspense fallback={null}>
          <CatalystDetailRouter isOpen={!!detailItemId} onClose={() => setDetailItemId(null)} itemId={detailItemId} projectId={projectId || ''} projectKey={projectKey || ''} onOpenItem={(id) => setDetailItemId(id)} onTogglePanelMode={handleTogglePanelMode} />
        </Suspense>
      )}
    </div>
  );
}
