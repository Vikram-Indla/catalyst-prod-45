import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Search, Plus, Download, LayoutList, LayoutGrid, Columns3, Package } from 'lucide-react';
import { useRequestsBacklog } from '@/hooks/useRequestsBacklog';
import { RequestDetailPanel } from '@/components/producthub/timeline/RequestDetailPanel';
import { CreateRequestDrawer } from '@/components/producthub/shared/CreateRequestDrawer';
import { PCRequestCard } from '@/components/producthub/cards/PCRequestCard';
import { useDebounce } from '@/hooks/useDebounce';
import { supabase } from '@/integrations/supabase/client';
import type { Request } from '@/types/request';
import type { FilterChip, TimelineRequest } from '@/types/producthub/request';
import { FILTER_CHIPS } from '@/types/producthub/request';
import { getPriorityLevel, STATUS_DISPLAY } from '@/types/request';
import { formatDistanceToNow } from 'date-fns';
import '@/styles/product-cards.css';
import '@/styles/product-kanban.css';

import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type GroupByOption = 'none' | 'status' | 'quarter' | 'department' | 'priority';
type SortOption = 'score' | 'priority' | 'title' | 'target' | 'updated';

const GROUP_OPTIONS: { value: GroupByOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'quarter', label: 'Quarter' },
  { value: 'department', label: 'Department' },
  { value: 'priority', label: 'Priority' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'score', label: 'Score' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
  { value: 'target', label: 'Target Date' },
  { value: 'updated', label: 'Updated' },
];

function toTimelineInitiative(i: Request): TimelineRequest {
  return {
    id: i.id, initiative_key: i.initiative_key, title: i.title, description: i.description,
    status: i.status as any, assignee_id: i.assignee_id, assignee_name: i.assignee_name,
    business_owner_id: i.business_owner_id, reporter_id: i.reporter_id, reporter_name: i.reporter_name,
    department_id: i.department_id, department_name: i.department_name, department_code: null,
    target_quarter: i.target_quarter, business_ask_date: i.business_ask_date,
    kickoff_date: i.kickoff_date, target_complete: i.target_complete, progress: i.progress,
    sort_order: i.sort_order, risk_count: i.risk_count, is_archived: i.is_archived,
    score_strategic_alignment: i.score_strategic_alignment, score_business_impact: i.score_business_impact,
    score_time_urgency: i.score_time_urgency, score_resource_feasibility: i.score_resource_feasibility,
    computed_score: i.computed_score, created_at: i.created_at, updated_at: i.updated_at,
    health_status: i.health_status ?? null,
    business_value: i.business_value ?? null, ea_review: (i as any).ea_review ?? null,
    priority: (i as any).priority ?? null, on_roadmap: i.on_roadmap ?? false,
  };
}

function applyFilter<T extends Request>(items: T[], filter: FilterChip, currentUserId: string | null): T[] {
  switch (filter) {
    case 'my': return currentUserId ? items.filter(i => i.assignee_id === currentUserId) : items;
    case 'quarter': {
      const now = new Date();
      const q = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
      return items.filter(i => i.target_quarter === q);
    }
    case 'high': return items.filter(i => i.computed_score !== null && i.computed_score >= 4.0);
    case 'unscored': return items.filter(i => i.computed_score === null);
    case 'overdue': return items.filter(i => i.target_complete && new Date(i.target_complete) < new Date() && i.status !== 'done' && i.status !== 'cancelled');
    case 'starred': return items.filter(i => i.is_favorited);
    default: return items;
  }
}

function applySort<T extends Request>(items: T[], sort: SortOption): T[] {
  const s = [...items];
  switch (sort) {
    case 'score': return s.sort((a, b) => (b.computed_score ?? -1) - (a.computed_score ?? -1));
    case 'priority': return s.sort((a, b) => (b.computed_score ?? -1) - (a.computed_score ?? -1));
    case 'title': return s.sort((a, b) => a.title.localeCompare(b.title));
    case 'target': return s.sort((a, b) => {
      if (!a.target_complete) return 1;
      if (!b.target_complete) return -1;
      return new Date(a.target_complete).getTime() - new Date(b.target_complete).getTime();
    });
    case 'updated': return s.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    default: return s;
  }
}

function groupItems<T extends Request>(items: T[], groupBy: GroupByOption): { key: string; label: string; items: T[] }[] {
  if (groupBy === 'none') return [{ key: 'all', label: '', items }];
  const map = new Map<string, T[]>();
  for (const item of items) {
    let key: string;
    switch (groupBy) {
      case 'status': key = STATUS_DISPLAY[item.status]?.label || item.status; break;
      case 'quarter': key = item.target_quarter || 'No Quarter'; break;
      case 'department': key = item.department_name || 'No Department'; break;
      case 'priority': key = getPriorityLevel(item.computed_score).level; break;
      default: key = 'Other';
    }
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([key, items]) => ({ key, label: key, items }));
}

const PAGE_SIZES = [12, 24, 48];

const CardsPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useRequestsBacklog();
  const requests = data?.data ?? [];

  const [searchRaw, setSearchRaw] = useState('');
  const searchTerm = useDebounce(searchRaw, 300);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(24);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Search + filter + sort
  const processed = useMemo(() => {
    let result = requests;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(i => i.title.toLowerCase().includes(q) || i.initiative_key.toLowerCase().includes(q));
    }
    result = applyFilter(result, activeFilter, currentUserId);
    result = applySort(result, sortBy);
    return result;
  }, [requests, searchTerm, activeFilter, sortBy, currentUserId]);

  const paged = useMemo(() => processed.slice(0, pageSize), [processed, pageSize]);
  const groups = useMemo(() => groupItems(paged, groupBy), [paged, groupBy]);

  // Filter counts
  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    counts['all'] = requests.length;
    counts['my'] = currentUserId ? requests.filter(i => i.assignee_id === currentUserId).length : 0;
    const now = new Date();
    const q = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
    counts['quarter'] = requests.filter(i => i.target_quarter === q).length;
    counts['high'] = requests.filter(i => i.computed_score !== null && i.computed_score >= 4.0).length;
    counts['unscored'] = requests.filter(i => i.computed_score === null).length;
    counts['overdue'] = requests.filter(i => i.target_complete && new Date(i.target_complete) < now && i.status !== 'done' && i.status !== 'cancelled').length;
    counts['starred'] = requests.filter(i => i.is_favorited).length;
    return counts;
  }, [requests, currentUserId]);

  const selectedInitiative = selectedId ? requests.find(i => i.id === selectedId) : null;

  const activeGroupLabel = GROUP_OPTIONS.find(o => o.value === groupBy)?.label ?? 'None';
  const activeSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Score';

  return (
    <div className="flex flex-col h-full overflow-hidden" data-module="product-cards">
      {/* Header */}
      <div className="pc-header">
        <h1 className="pc-header-title">Product Cards</h1>
        <p className="pc-header-subtitle">Visual gallery for quick scanning — {processed.length} business requests</p>
      </div>

      {/* Toolbar */}
      <div className="pc-toolbar">
        {/* Group dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="pc-dropdown-btn">Group: {activeGroupLabel} <ChevronDown /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {GROUP_OPTIONS.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => setGroupBy(o.value)}>{o.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="pc-dropdown-btn">Sort: {activeSortLabel} <ChevronDown /></button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {SORT_OPTIONS.map(o => (
              <DropdownMenuItem key={o.value} onClick={() => setSortBy(o.value)}>{o.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="pc-toolbar-divider" />

        {/* View toggle */}
        <div className="pc-view-toggle">
          <button className="pc-view-btn" onClick={() => navigate('/producthub/backlog')} title="Table view">
            <LayoutList size={16} />
          </button>
          <button className="pc-view-btn pc-view-btn--active" title="Cards view">
            <LayoutGrid size={16} />
          </button>
          <button className="pc-view-btn" onClick={() => navigate('/producthub/kanban')} title="Board view">
            <Columns3 size={16} />
          </button>
        </div>

        <div className="pc-toolbar-divider" />

        {/* Search */}
        <div className="pc-search">
          <Search className="pc-search-icon" />
          <input
            type="text"
            className="pc-search-input"
            placeholder="Search business requests…"
            value={searchRaw}
            onChange={e => setSearchRaw(e.target.value)}
          />
          <span className="pc-search-kbd">⌘K</span>
        </div>

        <div className="pc-toolbar-spacer" />

        <button className="pc-dropdown-btn" onClick={() => { /* export TODO */ }}>
          <Download size={14} /> Export
        </button>
        <button className="pc-btn-primary" onClick={() => setShowCreateDrawer(true)}>
          <Plus size={14} /> New Business Request
        </button>
      </div>

      {/* Filter Chips */}
      <div className="pc-filters">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.key}
            className={`pc-chip ${activeFilter === chip.key ? 'pc-chip--active' : ''}`}
            onClick={() => setActiveFilter(chip.key)}
          >
            {chip.label}
            {activeFilter === chip.key && filterCounts[chip.key] !== undefined && (
              <span className="pc-chip-count">{filterCounts[chip.key]}</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="pc-grid-container">
          {isLoading ? (
            <div className="pc-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="pc-skeleton" style={{ height: 280 }}>
                  <div className="pc-skeleton-line" style={{ width: '60%', height: 14, marginBottom: 12 }} />
                  <div className="pc-skeleton-line" style={{ width: '90%', height: 18, marginBottom: 8 }} />
                  <div className="pc-skeleton-line" style={{ width: '40%', height: 12, marginBottom: 16 }} />
                  <div className="pc-skeleton-line" style={{ width: '100%', height: 4, marginBottom: 12 }} />
                  <div className="pc-skeleton-line" style={{ width: '100%', height: 4, marginBottom: 24 }} />
                  <div className="pc-skeleton-line" style={{ width: '70%', height: 12, marginBottom: 6 }} />
                  <div className="pc-skeleton-line" style={{ width: '50%', height: 10 }} />
                </div>
              ))}
            </div>
          ) : processed.length === 0 ? (
            <div className="pc-empty">
              <Package className="pc-empty-icon" />
              <div className="pc-empty-text">No business requests match your filters</div>
              <button className="pc-empty-reset" onClick={() => { setActiveFilter('all'); setSearchRaw(''); }}>
                Reset filters
              </button>
            </div>
          ) : (
            groups.map(group => (
              <div key={group.key}>
                {group.label && (
                  <div className="pc-group-heading">
                    <span className="pc-group-label">{group.label}</span>
                    <span className="pc-group-count">{group.items.length}</span>
                  </div>
                )}
                <div className="pc-grid">
                  {group.items.map(init => (
                    <PCRequestCard
                      key={init.id}
                      request={init}
                      isSelected={selectedId === init.id}
                      onClick={() => setSelectedId(init.id)}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {!isLoading && processed.length > 0 && (
        <div className="pc-pagination">
          <div className="pc-pagination-left">
            Rows per page:
            <select className="pc-pagination-select" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="pc-pagination-right">
            Showing 1–{Math.min(pageSize, processed.length)} of {processed.length}
          </div>
        </div>
      )}

      {/* Detail Panel — REUSE existing */}
      {selectedInitiative && (
        <RequestDetailPanel
          request={toTimelineInitiative(selectedInitiative)}
          requests={processed.map(toTimelineInitiative)}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* Create drawer */}
      <CreateRequestDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
};

export default CardsPage;
