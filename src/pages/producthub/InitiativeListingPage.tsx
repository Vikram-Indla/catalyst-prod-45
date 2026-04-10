/**
 * Initiative Listing Page — /producthub/backlog
 * LINEAR PRECISION Design — pb-* namespace
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useMDTBacklog } from '@/hooks/useMDTBacklog';
import type { BRDTask } from '@/hooks/useMDTBacklog';
import { useSyncMDTToInitiatives } from '@/hooks/useSyncMDTToInitiatives';
import { useProfileOptions, useDepartmentOptions } from '@/hooks/useInitiativeLookups';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { InitiativeTable } from '@/components/producthub/listing/InitiativeTable';
import { Pagination } from '@/components/producthub/listing/Pagination';
import { InitiativeDetailPanel } from '@/components/producthub/timeline/InitiativeDetailPanel';
import type { TimelineInitiative } from '@/types/producthub/initiative';
import { ContextMenu } from '@/components/initiatives/ContextMenu';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { PromoteToRoadmapDialog } from '@/components/producthub/shared/PromoteToRoadmapDialog';

import { ColumnManager, DEFAULT_COLUMNS, type ColumnConfig } from '@/components/producthub/listing/ColumnManager';
import type { GroupByField } from '@/components/producthub/listing/ListingToolbar';
import { ExportDropdown } from '@/components/producthub/listing/ExportDropdown';
import { catalystToast } from '@/lib/catalystToast';
import { JiraBulkActionBar } from '@/components/shared/JiraBulkActionBar';

import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { getPriorityLevel } from '@/types/initiative';
import { Search, X, Plus, Download } from 'lucide-react';
import { ProductHubPageHeader } from '@/components/producthub/shared/ProductHubPageHeader';
import '@/styles/product-backlog.css';

function toTimelineInitiative(i: Initiative): TimelineInitiative {
  return {
    id: i.id, initiative_key: i.initiative_key, title: i.title, description: i.description,
    status: i.status as any, assignee_id: i.assignee_id, assignee_name: i.assignee_name,
    business_owner_id: i.business_owner_id, reporter_id: i.reporter_id, reporter_name: i.reporter_name,
    department_id: i.department_id, department_name: i.department_name, department_code: null,
    target_quarter: i.target_quarter, business_ask_date: i.business_ask_date, kickoff_date: i.kickoff_date,
    target_complete: i.target_complete, progress: i.progress, sort_order: i.sort_order,
    risk_count: i.risk_count, is_archived: i.is_archived, score_strategic_alignment: i.score_strategic_alignment,
    score_business_impact: i.score_business_impact, score_time_urgency: i.score_time_urgency,
    score_resource_feasibility: i.score_resource_feasibility, computed_score: i.computed_score,
    created_at: i.created_at, updated_at: i.updated_at,
    initiative_type_key: i.initiative_type_key ?? null, initiative_type_label: i.initiative_type_label ?? null,
    initiative_type_color_hex: i.initiative_type_color_hex ?? null, health_status: i.health_status ?? null,
    business_value: i.business_value ?? null, ea_review: (i as any).ea_review ?? null,
    priority: (i as any).priority ?? null, on_roadmap: i.on_roadmap ?? false,
    source: (i as any).source ?? 'catalyst', jira_issue_key: (i as any).jira_issue_key ?? null,
  };
}

const TERMINAL_STATUSES: InitiativeStatus[] = ['done', 'cancelled'];
const COLUMN_STORAGE_KEY = 'ph-backlog-columns';
const DENSITY_STORAGE_KEY = 'ph-backlog-density';

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'my', label: 'My Items' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'high', label: 'High Priority' },
  { id: 'unscored', label: 'Unscored' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'starred', label: 'Starred' },
  { id: 'on_roadmap', label: 'On Roadmap' },
  { id: 'not_on_roadmap', label: 'Not on Roadmap' },
];

const TYPE_LEGEND = [
  { key: 'project', label: 'Project', color: '#2563EB' },
  { key: 'enhancement', label: 'Enhancement', color: '#0EA5E9' },
  { key: 'improvement', label: 'Improvement', color: '#D97706' },
  { key: 'entity_integration', label: 'Entity Integration', color: '#64748B' },
];

function loadColumns(): ColumnConfig[] {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnConfig[];
      const ids = parsed.map(c => c.id);
      if (!ids.includes('roadmap')) parsed.splice(0, 0, { id: 'roadmap', label: 'Roadmap', visible: true });
      if (!ids.includes('type')) {
        const statusIdx = parsed.findIndex(c => c.id === 'status');
        parsed.splice(statusIdx >= 0 ? statusIdx + 1 : 3, 0, { id: 'type', label: 'Type', visible: true });
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return DEFAULT_COLUMNS.map(c => ({ ...c }));
}

function loadDensity(): Density {
  try {
    const raw = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (raw && ['compact', 'standard', 'comfortable'].includes(raw)) return raw as Density;
  } catch { /* ignore */ }
  return 'standard';
}

function applyQuickFilter(data: Initiative[], filter: string): Initiative[] {
  switch (filter) {
    case 'my': return data.filter(i => !!i.assignee_name);
    case 'quarter': {
      const now = new Date();
      const currentQ = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
      return data.filter(i => i.target_quarter === currentQ);
    }
    case 'high': return data.filter(i => i.computed_score !== null && i.computed_score >= 4.0);
    case 'unscored': return data.filter(i => i.computed_score === null);
    case 'overdue': return data.filter(i =>
      i.target_complete && new Date(i.target_complete) < new Date() && !TERMINAL_STATUSES.includes(i.status)
    );
    case 'starred': return data.filter(i => i.is_favorited);
    case 'on_roadmap': return data.filter(i => i.on_roadmap === true);
    case 'not_on_roadmap': return data.filter(i => !i.on_roadmap);
    default: return data;
  }
}

function applySearch(data: Initiative[], query: string): Initiative[] {
  if (!query.trim()) return data;
  const q = query.toLowerCase();
  return data.filter(i =>
    i.title.toLowerCase().includes(q) ||
    i.initiative_key.toLowerCase().includes(q) ||
    (i.assignee_name?.toLowerCase().includes(q)) ||
    (i.department_name?.toLowerCase().includes(q))
  );
}

function getGroupSortKey(item: Initiative, groupBy: GroupByField): string {
  switch (groupBy) {
    case 'status': return item.status;
    case 'priority': return getPriorityLevel(item.computed_score).level;
    case 'department': return item.department_name || 'zzz_unassigned';
    case 'quarter': return item.target_quarter || 'zzz_none';
    case 'assignee': return item.assignee_name || 'zzz_unassigned';
    default: return '';
  }
}

export default function InitiativeListingPage() {
  useSyncMDTToInitiatives();
  const { data: mdtData, isLoading } = useMDTBacklog();
  const { data: profiles } = useProfileOptions();
  const { data: departments } = useDepartmentOptions();
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mdt-backlog'] });
    queryClient.invalidateQueries({ queryKey: ['backlog-initiatives'] });
    queryClient.invalidateQueries({ queryKey: ['roadmap-initiatives'] });
  }, [queryClient]);

  const isNative = useCallback((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(id), []);

  const mappedInitiatives: Initiative[] = useMemo(() => mdtData?.data ?? [], [mdtData]);

  const brdTasksMap = useMemo<Record<string, BRDTask[]>>(() => {
    const map: Record<string, BRDTask[]> = {};
    for (const init of (mdtData?.data ?? [])) {
      if ((init as any).brd_tasks?.length) {
        map[init.id] = (init as any).brd_tasks;
      }
    }
    return map;
  }, [mdtData]);

  const [density, setDensity] = useState<Density>(loadDensity);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([{ id: 'initiative_key', desc: false }]);
  const [orderedData, setOrderedData] = useState<Initiative[] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [focusedRow, setFocusedRow] = useState(-1);
  const [groupBy, setGroupBy] = useState<GroupByField>('none');
  const [localSearch, setLocalSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [detailInitiative, setDetailInitiative] = useState<Initiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; initiative: Initiative } | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<Initiative | null>(null);

  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(loadColumns);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const allInitiatives = orderedData ?? mappedInitiatives;

  useEffect(() => { setOrderedData(null); }, [mappedInitiatives]);
  useEffect(() => { localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnConfigs)); }, [columnConfigs]);
  useEffect(() => { localStorage.setItem(DENSITY_STORAGE_KEY, density); }, [density]);

  const handleSearch = useCallback((val: string) => {
    setLocalSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearchQuery(val), 250);
  }, []);

  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  const filtered = useMemo(() => {
    let result = applyQuickFilter(allInitiatives, quickFilter);
    result = applySearch(result, searchQuery);
    if (groupBy !== 'none') {
      result = [...result].sort((a, b) => {
        const aKey = getGroupSortKey(a, groupBy);
        const bKey = getGroupSortKey(b, groupBy);
        return aKey.localeCompare(bKey);
      });
    }
    return result;
  }, [allInitiatives, quickFilter, searchQuery, groupBy]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    QUICK_FILTERS.forEach(f => {
      if (f.id === 'all') counts[f.id] = allInitiatives.length;
      else counts[f.id] = applyQuickFilter(allInitiatives, f.id).length;
    });
    return counts;
  }, [allInitiatives]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const handleReorder = useCallback((sourceIndex: number, destIndex: number) => {
    setOrderedData(prev => {
      const items = [...(prev ?? allInitiatives)];
      const [moved] = items.splice(sourceIndex, 1);
      items.splice(destIndex, 0, moved);
      return items;
    });
  }, [allInitiatives]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (columnManagerOpen) { setColumnManagerOpen(false); return; }
        if (exportOpen) { setExportOpen(false); return; }
        if (contextMenu) { setContextMenu(null); return; }
        if (detailOpen) { setDetailOpen(false); return; }
        if (selectedIds.length > 0) { setSelectedIds([]); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        e.preventDefault();
        setSelectedIds(paginatedData.map(d => d.id));
        return;
      }
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedRow(prev => Math.min(prev + 1, paginatedData.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedRow(prev => Math.max(prev - 1, 0)); }
      if (e.key === 'Enter' && focusedRow >= 0 && focusedRow < paginatedData.length) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        setDetailInitiative(paginatedData[focusedRow]);
        setDetailOpen(true);
      }
      if (e.key === ' ' && focusedRow >= 0 && focusedRow < paginatedData.length) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        e.preventDefault();
        const id = paginatedData[focusedRow].id;
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        e.preventDefault();
        if (confirm(`Delete ${selectedIds.length} initiative(s)? This cannot be undone.`)) {
          handleBulkAction('delete');
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contextMenu, detailOpen, selectedIds, columnManagerOpen, exportOpen, focusedRow, paginatedData]);

  const handleRowClick = useCallback((initiative: Initiative) => {
    setDetailInitiative(initiative);
    setDetailOpen(true);
  }, []);

  const handleStatusChange = useCallback(async (id: string, newStatus: InitiativeStatus) => {
    if (isNative(id)) {
      await (supabase as any).from('ph_initiatives').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
      invalidateAll();
    }
    catalystToast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
  }, [isNative, invalidateAll]);

  const handleFavoriteToggle = useCallback(async (id: string, isFavorited: boolean) => {
    if (isNative(id)) {
      await (supabase as any).from('ph_initiatives').update({ is_favorited: !isFavorited, updated_at: new Date().toISOString() }).eq('id', id);
      invalidateAll();
    }
    catalystToast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  }, [isNative, invalidateAll]);

  const handleSortChange = useCallback((s: { id: string; desc: boolean }[]) => { setSorting(s); }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, initiative: Initiative) => {
    setContextMenu({ pos: { x: e.clientX, y: e.clientY }, initiative });
  }, []);

  const handleContextAction = useCallback(async (action: string, value?: unknown) => {
    if (!contextMenu) return;
    const init = contextMenu.initiative;
    switch (action) {
      case 'open':
      case 'edit':
        setDetailInitiative(init);
        setDetailOpen(true);
        break;
      case 'change_status':
        handleStatusChange(init.id, value as InitiativeStatus);
        break;
      case 'assign':
        if (isNative(init.id)) {
          await (supabase as any).from('ph_initiatives').update({ assignee_id: value as string, updated_at: new Date().toISOString() }).eq('id', init.id);
          invalidateAll();
          catalystToast.success('Assignee updated');
        }
        break;
      case 'copy_id':
        navigator.clipboard.writeText(init.initiative_key);
        catalystToast.success(`Copied ${init.initiative_key}`);
        break;
      case 'clone':
        if (isNative(init.id)) {
          const { data: existing } = await (supabase as any).from('ph_initiatives').select('initiative_key').order('created_at', { ascending: false }).limit(100);
          const maxNum = (existing || []).reduce((max: number, r: any) => { const num = parseInt(r.initiative_key?.replace(/[A-Z]+-/, '') || '0'); return num > max ? num : max; }, 0);
          const prefix = init.initiative_key?.replace(/-\d+$/, '') || 'MIM';
          const nextKey = `${prefix}-${String(maxNum + 1).padStart(3, '0')}`;
          await (supabase as any).from('ph_initiatives').insert({ title: `${init.title} (Copy)`, initiative_key: nextKey, description: init.description, status: 'new_demand', progress: 0, department_id: init.department_id, assignee_id: init.assignee_id });
          invalidateAll();
          catalystToast.success(`Cloned as ${nextKey}`);
        }
        break;
      case 'archive':
        if (isNative(init.id)) {
          await (supabase as any).from('ph_initiatives').update({ is_archived: true }).eq('id', init.id);
          invalidateAll();
          catalystToast.success('Archived');
        }
        break;
      case 'delete':
        if (confirm(`Delete ${init.initiative_key}? This cannot be undone.`)) {
          if (isNative(init.id)) {
            await (supabase as any).from('ph_initiatives').update({ is_deleted: true }).eq('id', init.id);
            invalidateAll();
          }
          catalystToast.success('Deleted');
        }
        break;
    }
  }, [contextMenu, handleStatusChange, isNative, invalidateAll]);

  const handleInlineEdit = useCallback(async (id: string, field: string, value: string | number | null) => {
    if (isNative(id)) {
      await (supabase as any).from('ph_initiatives').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
      invalidateAll();
    }
    catalystToast.success('Updated');
  }, [isNative, invalidateAll]);

  const handleBulkAction = useCallback(async (action: string) => {
    const nativeIds = selectedIds.filter(id => isNative(id));
    switch (action) {
      case 'archive':
        if (nativeIds.length) {
          await (supabase as any).from('ph_initiatives').update({ is_archived: true }).in('id', nativeIds);
          invalidateAll();
        }
        catalystToast.success(`${selectedIds.length} items archived`);
        setSelectedIds([]);
        break;
      case 'delete':
        if (nativeIds.length) {
          await (supabase as any).from('ph_initiatives').update({ is_deleted: true }).in('id', nativeIds);
          invalidateAll();
        }
        catalystToast.success(`${selectedIds.length} items deleted`);
        setSelectedIds([]);
        break;
      default:
        catalystToast.success(`${selectedIds.length} items — ${action}`);
        break;
    }
  }, [selectedIds, isNative, invalidateAll]);

  const handleScoreSave = useCallback(async () => {
    invalidateAll();
  }, [invalidateAll]);

  const handleRoadmapToggle = useCallback(async (id: string, currentValue: boolean) => {
    if (isNative(id)) {
      await (supabase as any).from('ph_initiatives').update({ on_roadmap: !currentValue, updated_at: new Date().toISOString() }).eq('id', id);
      invalidateAll();
    }
    catalystToast.success(currentValue ? 'Removed from roadmap' : 'Added to roadmap');
  }, [isNative, invalidateAll]);

  return (
    <div data-module="product-backlog" className="flex flex-col h-full" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Page Header (For You pattern) ── */}
      <ProductHubPageHeader
        title="Product Backlog"
        subtitle="Strategic initiative portfolio & prioritization"
      />

      {/* ── Toolbar — FIX 5: View toggle group added ── */}
      <div className="pb-toolbar">
        {/* View toggle button group */}
        <div className="pb-view-toggle-group">
          <button className="pb-view-toggle-btn pb-view-toggle-active" title="Standard">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            Standard
          </button>
          <button
            ref={columnsButtonRef}
            className="pb-view-toggle-btn"
            onClick={() => setColumnManagerOpen(prev => !prev)}
            title="Columns"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Columns
          </button>
          <button className="pb-view-toggle-btn" title="Group" onClick={() => catalystToast.success('Grouping coming soon')}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="2" y="8" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Group: None
          </button>
        </div>

        <div className="pb-toolbar-divider" />

        {/* Search */}
        <div className="pb-search">
          <Search size={14} className="pb-search-icon" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search initiatives…"
          />
          {localSearch ? (
            <button onClick={() => handleSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--pb-ink-muted)' }}>
              <X size={14} />
            </button>
          ) : (
            <span className="pb-search-kbd">⌘K</span>
          )}
        </div>

        <div style={{ flex: 1 }} />

        <button
          ref={exportButtonRef}
          className="pb-toolbar-btn"
          onClick={() => setExportOpen(prev => !prev)}
        >
          <Download size={14} />
          Export
        </button>

        <button className="pb-toolbar-btn pb-toolbar-btn-primary" onClick={() => setShowCreateDrawer(true)}>
          <Plus size={14} />
          New Initiative
        </button>
      </div>

      {/* ── Filter Chips ── */}
      <div className="pb-filters">
        {QUICK_FILTERS.map(f => (
          <button
            key={f.id}
            className={`pb-chip ${quickFilter === f.id ? 'pb-chip-active' : ''}`}
            onClick={() => { setQuickFilter(f.id); setPage(1); }}
          >
            {f.label}
            {quickFilter === f.id && filterCounts[f.id] > 0 && (
              <span className="pb-chip-count">{filterCounts[f.id]}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Type Legend Bar ── */}
      <div className="pb-type-legend">
        <span className="pb-type-legend-label">Types:</span>
        {TYPE_LEGEND.map(t => (
          <span key={t.key} className="pb-type-legend-item">
            <span className="pb-type-dot" style={{ backgroundColor: t.color }} />
            {t.label}
          </span>
        ))}
      </div>

      {/* ── Jira-style bulk action bar ── */}
      {selectedIds.length > 0 && (
        <JiraBulkActionBar
          selectedIds={selectedIds}
          items={paginatedData.map(d => ({ id: d.id, issue_key: d.initiative_key, title: d.title, status: d.status, priority: d.priority ?? undefined, assignee_name: d.assignee_name ?? undefined }))}
          onClear={() => setSelectedIds([])}
          onDelete={(ids) => handleBulkAction('delete')}
          entityLabel="initiative"
        />
      )}

      {/* ── Table ── */}
      <div className="flex-1 flex flex-col min-h-0" style={{ padding: '0 32px' }}>
        <InitiativeTable
          data={paginatedData}
          loading={isLoading}
          density={density}
          columnConfigs={columnConfigs}
          groupBy={groupBy}
          brdTasksMap={brdTasksMap}
          onRowClick={handleRowClick}
          onStatusChange={handleStatusChange}
          onFavoriteToggle={handleFavoriteToggle}
          onSelectionChange={setSelectedIds}
          onSortChange={handleSortChange}
          onContextMenu={handleContextMenu}
          onReorder={handleReorder}
          onInlineEdit={handleInlineEdit}
          onPromote={setPromoteTarget}
          onRoadmapToggle={handleRoadmapToggle}
          focusedRowIndex={focusedRow}
          onFocusedRowChange={setFocusedRow}
        />
      </div>

      {/* ── Pagination ── */}
      <Pagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      {detailOpen && detailInitiative && (
        <InitiativeDetailPanel
          initiative={toTimelineInitiative(detailInitiative)}
          initiatives={filtered.map(toTimelineInitiative)}
          onClose={() => setDetailOpen(false)}
        />
      )}

      <ContextMenu
        position={contextMenu?.pos ?? null}
        initiative={contextMenu?.initiative ?? null}
        onAction={handleContextAction}
        onClose={() => setContextMenu(null)}
      />

      <ColumnManager
        columns={columnConfigs}
        onChange={setColumnConfigs}
        anchorRef={columnsButtonRef}
        isOpen={columnManagerOpen}
        onClose={() => setColumnManagerOpen(false)}
      />

      <ExportDropdown
        data={filtered}
        anchorRef={exportButtonRef}
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />

      <PromoteToRoadmapDialog
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        initiative={promoteTarget ? {
          id: promoteTarget.id,
          title: promoteTarget.title,
          initiative_type_key: promoteTarget.initiative_type_key,
        } : null}
      />
    </div>
  );
}
