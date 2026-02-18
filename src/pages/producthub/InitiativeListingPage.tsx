/**
 * Initiative Listing Page — /producthub/backlog
 * Catalyst V5 Data-Dense Table View
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
import { catalystToast } from '@/lib/catalystToast';
import { LayoutGrid, Columns3 } from 'lucide-react';

import type { Initiative, InitiativeStatus, Density } from '@/types/initiative';

type ViewMode = 'table' | 'board' | 'timeline' | 'cards';

const TERMINAL_STATUSES: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];

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

export default function InitiativeListingPage() {
  const { data, isLoading } = useInitiativesMock();
  const [density, setDensity] = useState<Density>('standard');
  const [activeView, setActiveView] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sorting, setSorting] = useState<{ id: string; desc: boolean }[]>([]);
  const [orderedData, setOrderedData] = useState<Initiative[] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [detailInitiative, setDetailInitiative] = useState<Initiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; initiative: Initiative } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const allInitiatives = orderedData ?? data?.data ?? [];

  useEffect(() => {
    if (data?.data && !orderedData) setOrderedData(data.data);
  }, [data?.data, orderedData]);

  const filtered = useMemo(() => {
    let result = applyQuickFilter(allInitiatives, quickFilter);
    result = applySearch(result, searchQuery);
    return result;
  }, [allInitiatives, quickFilter, searchQuery]);

  // Pagination
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

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) { setContextMenu(null); return; }
        if (detailOpen) { setDetailOpen(false); return; }
        if (selectedIds.length > 0) { setSelectedIds([]); return; }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [contextMenu, detailOpen, selectedIds]);

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

  const handleFavoriteToggle = useCallback((id: string, _isFavorited: boolean) => {
    console.log('Favorite toggle:', id);
  }, []);

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
        setDetailInitiative(init);
        setDetailOpen(true);
        break;
      case 'change_status':
        handleStatusChange(init.id, value as InitiativeStatus);
        break;
      case 'copy_id':
        navigator.clipboard.writeText(init.initiative_key);
        catalystToast.success('Copied!');
        break;
    }
  }, [contextMenu, handleStatusChange]);

  const handleBulkAction = useCallback((action: string) => {
    catalystToast.success(`${selectedIds.length} items — ${action}`);
  }, [selectedIds]);

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
      />

      {/* Bulk Action Bar — replaces space above table when active */}
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
            onRowClick={handleRowClick}
            onStatusChange={handleStatusChange}
            onFavoriteToggle={handleFavoriteToggle}
            onSelectionChange={setSelectedIds}
            onSortChange={handleSortChange}
            onContextMenu={handleContextMenu}
            onReorder={handleReorder}
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

      {/* Pagination — only for table view */}
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
    </div>
  );
}
