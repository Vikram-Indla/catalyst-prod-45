/**
 * Initiative Listing Page — /producthub/backlog
 * Catalyst V5 Data-Dense Table View — Prompt 2 Enhanced
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { ListingToolbar } from '@/components/producthub/listing/ListingToolbar';
import { InitiativeTable } from '@/components/producthub/listing/InitiativeTable';
import { BulkActionBar } from '@/components/producthub/listing/BulkActionBar';
import { Pagination } from '@/components/producthub/listing/Pagination';
import { DetailPanel } from '@/components/initiatives/DetailPanel';
import { ContextMenu } from '@/components/initiatives/ContextMenu';
import { KanbanBoard } from '@/components/initiatives/KanbanBoard';
import { ColumnManager, DEFAULT_COLUMNS, type ColumnConfig } from '@/components/producthub/listing/ColumnManager';
import type { GroupByField } from '@/components/producthub/listing/ListingToolbar';
import { ExportDropdown } from '@/components/producthub/listing/ExportDropdown';
import { catalystToast } from '@/lib/catalystToast';
import { LayoutGrid, Columns3 } from 'lucide-react';

import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';
import { getPriorityLevel } from '@/types/initiative';

type ViewMode = 'table' | 'board' | 'timeline' | 'cards';

const TERMINAL_STATUSES: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];

const COLUMN_STORAGE_KEY = 'ph-backlog-columns';
const DENSITY_STORAGE_KEY = 'ph-backlog-density';

function loadColumns(): ColumnConfig[] {
  try {
    const raw = localStorage.getItem(COLUMN_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
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
    case 'my': return data.filter(i => ['Sarah K.', 'Fatima R.', 'Nora A.'].includes(i.assignee_name || ''));
    case 'quarter': return data.filter(i => i.target_quarter === 'Q1 2026');
    case 'high': return data.filter(i => i.computed_score !== null && i.computed_score >= 4.0);
    case 'unscored': return data.filter(i => i.computed_score === null);
    case 'overdue': return data.filter(i =>
      i.target_complete && new Date(i.target_complete) < new Date() && !TERMINAL_STATUSES.includes(i.status)
    );
    case 'starred': return data.filter(i => i.is_favorited);
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
  const { data, isLoading } = useInitiativesMock();
  const [density, setDensity] = useState<Density>(loadDensity);
  const [activeView, setActiveView] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [orderedData, setOrderedData] = useState<Initiative[] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [focusedRow, setFocusedRow] = useState(-1);
  const [groupBy, setGroupBy] = useState<GroupByField>('none');

  const [detailInitiative, setDetailInitiative] = useState<Initiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; initiative: Initiative } | null>(null);

  // Column management
  const [columnConfigs, setColumnConfigs] = useState<ColumnConfig[]>(loadColumns);
  const [columnManagerOpen, setColumnManagerOpen] = useState(false);
  const columnsButtonRef = useRef<HTMLButtonElement>(null);

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const allInitiatives = orderedData ?? data?.data ?? [];

  useEffect(() => {
    if (data?.data && !orderedData) setOrderedData(data.data);
  }, [data?.data, orderedData]);

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
    // Sort by group field so group headers appear contiguously
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
      // Escape cascade
      if (e.key === 'Escape') {
        if (columnManagerOpen) { setColumnManagerOpen(false); return; }
        if (exportOpen) { setExportOpen(false); return; }
        if (contextMenu) { setContextMenu(null); return; }
        if (detailOpen) { setDetailOpen(false); return; }
        if (selectedIds.length > 0) { setSelectedIds([]); return; }
      }

      // Cmd+K → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Cmd+A → select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && activeView === 'table') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        e.preventDefault();
        setSelectedIds(paginatedData.map(d => d.id));
        return;
      }

      // Arrow up/down
      if (e.key === 'ArrowDown' && activeView === 'table') {
        e.preventDefault();
        setFocusedRow(prev => Math.min(prev + 1, paginatedData.length - 1));
        return;
      }
      if (e.key === 'ArrowUp' && activeView === 'table') {
        e.preventDefault();
        setFocusedRow(prev => Math.max(prev - 1, 0));
        return;
      }

      // Enter → open detail
      if (e.key === 'Enter' && focusedRow >= 0 && focusedRow < paginatedData.length && activeView === 'table') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        setDetailInitiative(paginatedData[focusedRow]);
        setDetailOpen(true);
        return;
      }

      // Space → toggle checkbox
      if (e.key === ' ' && focusedRow >= 0 && focusedRow < paginatedData.length && activeView === 'table') {
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) return;
        e.preventDefault();
        const id = paginatedData[focusedRow].id;
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        return;
      }

      // Delete/Backspace → bulk delete confirm
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
  }, [contextMenu, detailOpen, selectedIds, columnManagerOpen, exportOpen, activeView, focusedRow, paginatedData]);

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
      <CommandCenterHeader
        title="Product Backlog"
        subtitle="Strategic initiative portfolio & prioritization"
      />

      <ListingToolbar
        activeView={activeView}
        onViewChange={setActiveView}
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
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onAction={handleBulkAction}
        onCancel={() => setSelectedIds([])}
      />

      {activeView === 'table' ? (
        <div className="flex-1 flex flex-col px-6 pb-0 min-h-0">
          <InitiativeTable
            data={paginatedData}
            loading={isLoading}
            density={density}
            columnConfigs={columnConfigs}
            groupBy={groupBy}
            onRowClick={handleRowClick}
            onStatusChange={handleStatusChange}
            onFavoriteToggle={handleFavoriteToggle}
            onSelectionChange={setSelectedIds}
            onSortChange={handleSortChange}
            onContextMenu={handleContextMenu}
            onReorder={handleReorder}
            onInlineEdit={handleInlineEdit}
            focusedRowIndex={focusedRow}
            onFocusedRowChange={setFocusedRow}
          />
        </div>
      ) : activeView === 'board' ? (
        <div className="flex-1 px-6 pt-2 overflow-auto">
          <KanbanBoard
            data={filtered}
            density={density}
            onRowClick={handleRowClick}
            onStatusChange={handleStatusChange}
            onFavoriteToggle={handleFavoriteToggle}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          {activeView === 'cards' ? <LayoutGrid size={48} className="text-zinc-300" /> : <Columns3 size={48} className="text-zinc-300" />}
          <h3 className="text-sm font-semibold mt-4" style={{ color: '#18181b' }}>
            {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View
          </h3>
          <p className="text-[13px] mt-1" style={{ color: '#71717a' }}>Coming Soon</p>
        </div>
      )}

      {/* Pagination */}
      {activeView === 'table' && (
        <Pagination
          total={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

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
    </div>
  );
}
