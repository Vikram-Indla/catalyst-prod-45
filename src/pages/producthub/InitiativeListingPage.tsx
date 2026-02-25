/**
 * Initiative Listing Page — /producthub/backlog
 * Catalyst V5 Data-Dense Table View — Now wired to ph_initiatives via ph_backlog_initiatives_view
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useBacklogInitiatives } from '@/hooks/useBacklogInitiatives';
import { useProfileOptions, useDepartmentOptions } from '@/hooks/useInitiativeLookups';
import { ListingToolbar } from '@/components/producthub/listing/ListingToolbar';
import { InitiativeTable } from '@/components/producthub/listing/InitiativeTable';
import { BulkActionBar } from '@/components/producthub/listing/BulkActionBar';
import { Pagination } from '@/components/producthub/listing/Pagination';
import { DetailPanel } from '@/components/initiatives/DetailPanel';
import { ContextMenu } from '@/components/initiatives/ContextMenu';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { PromoteToRoadmapDialog } from '@/components/producthub/shared/PromoteToRoadmapDialog';
import { InitiativeTypeBadge } from '@/components/producthub/shared/InitiativeTypeBadge';

import { ColumnManager, DEFAULT_COLUMNS, type ColumnConfig } from '@/components/producthub/listing/ColumnManager';
import type { GroupByField } from '@/components/producthub/listing/ListingToolbar';
import { ExportDropdown } from '@/components/producthub/listing/ExportDropdown';
import { catalystToast } from '@/lib/catalystToast';

import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { getPriorityLevel } from '@/types/initiative';

const TERMINAL_STATUSES: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];

const COLUMN_STORAGE_KEY = 'ph-backlog-columns';
const DENSITY_STORAGE_KEY = 'ph-backlog-density';

function loadColumns(): ColumnConfig[] {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ColumnConfig[];
      // Ensure new columns exist
      const ids = parsed.map(c => c.id);
      if (!ids.includes('roadmap')) parsed.splice(0, 0, { id: 'roadmap', label: '🗺️', visible: true });
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
    case 'quarter': return data.filter(i => i.target_quarter === 'Q1 2026');
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
  const { data: backlogData, isLoading } = useBacklogInitiatives();
  const { data: profiles } = useProfileOptions();
  const { data: departments } = useDepartmentOptions();

  const getProfileName = useCallback((id: string | null) => {
    if (!id || !profiles) return null;
    const profile = profiles.find(p => p.value === id);
    return profile?.label || null;
  }, [profiles]);

  const getDepartmentName = useCallback((id: string | null) => {
    if (!id || !departments) return null;
    const dept = departments.find(d => d.value === id);
    return dept?.label || null;
  }, [departments]);

  // Map ph_backlog_initiatives_view rows → Initiative shape
  const mappedInitiatives: Initiative[] = useMemo(() => {
    return (backlogData || []).map((item: any) => ({
      id: item.id,
      initiative_key: item.initiative_key || '',
      title: item.title || '',
      description: item.description || null,
      status: item.status || 'new_demand',
      assignee_id: item.assignee_id || null,
      assignee_name: getProfileName(item.assignee_id),
      assignee_avatar: null,
      business_owner_id: item.business_owner_id || null,
      business_owner_name: getProfileName(item.business_owner_id),
      reporter_id: item.reporter_id || null,
      department_id: item.department_id || null,
      department_name: getDepartmentName(item.department_id),
      target_quarter: item.target_quarter || null,
      business_ask_date: item.business_ask_date || null,
      kickoff_date: item.kickoff_date || null,
      target_complete: item.target_complete || null,
      progress: item.progress ?? 0,
      sort_order: item.sort_order ?? 0,
      risk_count: item.risk_count ?? 0,
      is_archived: item.is_archived ?? false,
      is_favorited: false,
      score_strategic_alignment: null,
      score_business_impact: null,
      score_time_urgency: null,
      score_resource_feasibility: null,
      computed_score: null,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
      on_roadmap: item.on_roadmap ?? false,
      initiative_type_key: item.initiative_type_key || null,
      initiative_type_label: item.initiative_type_label || null,
      initiative_type_color_hex: item.initiative_type_color_hex || null,
      health_status: item.health_status || null,
      business_value: item.business_value || null,
    }));
  }, [backlogData, getProfileName, getDepartmentName]);

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

  const [detailInitiative, setDetailInitiative] = useState<Initiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; initiative: Initiative } | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [promoteTarget, setPromoteTarget] = useState<Initiative | null>(null);

  // Column management
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(loadColumns);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const allInitiatives = orderedData ?? mappedInitiatives;

  // BRD tasks map — empty since we're no longer using MDT data
  const brdTasksMap = useMemo(() => {
    return {} as Record<string, any[]>;
  }, []);

  // Reset orderedData when source data changes
  useEffect(() => {
    setOrderedData(null);
  }, [mappedInitiatives]);

  // Persist columns
  useEffect(() => {
    localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(columnConfigs));
  }, [columnConfigs]);

  // Persist density
  useEffect(() => {
    localStorage.setItem(DENSITY_STORAGE_KEY, density);
  }, [density]);

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
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedRow(prev => Math.min(prev + 1, paginatedData.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedRow(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' && focusedRow >= 0 && focusedRow < paginatedData.length) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        setDetailInitiative(paginatedData[focusedRow]);
        setDetailOpen(true);
        return;
      }
      if (e.key === ' ' && focusedRow >= 0 && focusedRow < paginatedData.length) {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        e.preventDefault();
        const id = paginatedData[focusedRow].id;
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        return;
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

  const handleStatusChange = useCallback((id: string, newStatus: InitiativeStatus) => {
    setOrderedData(prev => {
      const items = prev ?? allInitiatives;
      return items.map(item => item.id === id ? { ...item, status: newStatus } : item);
    });
    catalystToast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
  }, [allInitiatives]);

  const handleFavoriteToggle = useCallback((id: string, isFavorited: boolean) => {
    setOrderedData(prev => {
      const items = prev ?? allInitiatives;
      return items.map(item => item.id === id ? { ...item, is_favorited: !isFavorited } : item);
    });
    catalystToast.success(isFavorited ? 'Removed from favorites' : 'Added to favorites');
  }, [allInitiatives]);

  const handleSortChange = useCallback((s: { id: string; desc: boolean }[]) => {
    setSorting(s);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, initiative: Initiative) => {
    setContextMenu({ pos: { x: e.clientX, y: e.clientY }, initiative });
  }, []);

  const handleContextAction = useCallback((action: string, value?: unknown) => {
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
      case 'copy_id':
        navigator.clipboard.writeText(init.initiative_key);
        catalystToast.success(`Copied ${init.initiative_key}`);
        break;
      case 'clone':
        setOrderedData(prev => {
          const items = prev ?? allInitiatives;
          const clone: Initiative = {
            ...init,
            id: `clone-${Date.now()}`,
            initiative_key: `${init.initiative_key}-C`,
            title: `${init.title} (Copy)`,
            is_favorited: false,
            progress: 0,
          };
          return [...items, clone];
        });
        catalystToast.success('Initiative cloned');
        break;
      case 'archive':
        setOrderedData(prev => (prev ?? allInitiatives).filter(i => i.id !== init.id));
        catalystToast.success('Archived');
        break;
      case 'delete':
        if (confirm(`Delete ${init.initiative_key}? This cannot be undone.`)) {
          setOrderedData(prev => (prev ?? allInitiatives).filter(i => i.id !== init.id));
          catalystToast.success('Deleted');
        }
        break;
    }
  }, [contextMenu, handleStatusChange, allInitiatives]);

  const handleInlineEdit = useCallback((id: string, field: string, value: string | number | null) => {
    setOrderedData(prev => {
      const items = prev ?? allInitiatives;
      return items.map(item => item.id === id ? { ...item, [field]: value } : item);
    });
    catalystToast.success('Updated');
  }, [allInitiatives]);

  const handleBulkAction = useCallback((action: string) => {
    switch (action) {
      case 'archive':
        setOrderedData(prev => (prev ?? allInitiatives).filter(i => !selectedIds.includes(i.id)));
        catalystToast.success(`${selectedIds.length} items archived`);
        setSelectedIds([]);
        break;
      case 'delete':
        setOrderedData(prev => (prev ?? allInitiatives).filter(i => !selectedIds.includes(i.id)));
        catalystToast.success(`${selectedIds.length} items deleted`);
        setSelectedIds([]);
        break;
      default:
        catalystToast.success(`${selectedIds.length} items — ${action}`);
        break;
    }
  }, [selectedIds, allInitiatives]);

  const handleScoreSave = useCallback((id: string, scores: { strategic_alignment: number; business_impact: number; time_urgency: number; resource_feasibility: number }) => {
    catalystToast.success('Score saved');
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Title */}
      <div className="px-6 py-4 border-b bg-card" style={{ minHeight: 72 }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: '#0F172A' }}>Product Backlog</h1>
        </div>
        <p className="text-sm mt-1" style={{ color: '#64748B' }}>
          Strategic initiative portfolio &amp; prioritization
        </p>
      </div>

      <ListingToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeQuickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        density={density}
        onDensityChange={setDensity}
        totalCount={filtered.length}
        searchInputRef={searchInputRef}
        columnsButtonRef={columnsButtonRef}
        onColumnsClick={() => setColumnManagerOpen(prev => !prev)}
        exportButtonRef={exportButtonRef}
        onExportClick={() => setExportOpen(prev => !prev)}
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        onNewInitiative={() => setShowCreateDrawer(true)}
      />

      {/* Type Legend */}
      <div className="px-6 py-1.5 flex items-center gap-3 border-b" style={{ background: '#FAFBFC', borderColor: '#F1F5F9' }}>
        <span className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>Types:</span>
        <InitiativeTypeBadge typeKey="project" />
        <InitiativeTypeBadge typeKey="enhancement" />
        <InitiativeTypeBadge typeKey="improvement" />
      </div>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onAction={handleBulkAction}
        onCancel={() => setSelectedIds([])}
      />

      <div className="flex-1 flex flex-col px-6 pb-0 min-h-0">
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
          focusedRowIndex={focusedRow}
          onFocusedRowChange={setFocusedRow}
        />
      </div>

      {/* Pagination */}
      <Pagination
        total={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />

      <DetailPanel
        initiative={detailInitiative}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
        onScoreSave={handleScoreSave}
      />

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
