import { useState, useCallback, useMemo } from 'react';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import { InitiativeToolbar } from '@/components/initiatives/InitiativeToolbar';
import { InitiativeTable } from '@/components/initiatives/InitiativeTable';
import { DetailPanel } from '@/components/initiatives/DetailPanel';
import { BulkActionBar } from '@/components/initiatives/BulkActionBar';
import { ContextMenu } from '@/components/initiatives/ContextMenu';
import type { Initiative, InitiativeStatus, Density, ViewMode } from '@/types/initiative';

const TERMINAL_STATUSES: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];

function applyQuickFilter(data: Initiative[], filter: string): Initiative[] {
  switch (filter) {
    case 'my': return data.filter(i => i.assignee_name === 'Sarah Chen');
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

  // Detail panel state
  const [detailInitiative, setDetailInitiative] = useState<Initiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; initiative: Initiative } | null>(null);

  const allInitiatives = data?.data ?? [];

  const filtered = useMemo(() => {
    let result = applyQuickFilter(allInitiatives, quickFilter);
    result = applySearch(result, searchQuery);
    return result;
  }, [allInitiatives, quickFilter, searchQuery]);

  const handleRowClick = useCallback((initiative: Initiative) => {
    setDetailInitiative(initiative);
    setDetailOpen(true);
  }, []);

  const handleStatusChange = useCallback((id: string, status: InitiativeStatus) => {
    console.log('Status change:', id, status);
  }, []);

  const handleAssigneeChange = useCallback((id: string, assigneeId: string) => {
    console.log('Assignee change:', id, assigneeId);
  }, []);

  const handleFavoriteToggle = useCallback((id: string, isFavorited: boolean) => {
    console.log('Favorite toggle:', id, isFavorited);
  }, []);

  const handleSortChange = useCallback((sorting: { id: string; desc: boolean }[]) => {
    console.log('Sort:', sorting);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent, initiative: Initiative) => {
    setContextMenu({ pos: { x: e.clientX, y: e.clientY }, initiative });
  }, []);

  const handleContextAction = useCallback((action: string, value?: any) => {
    if (!contextMenu) return;
    const init = contextMenu.initiative;
    switch (action) {
      case 'open':
        setDetailInitiative(init);
        setDetailOpen(true);
        break;
      case 'change_status':
        handleStatusChange(init.id, value);
        break;
      default:
        console.log('Context action:', action, value);
    }
  }, [contextMenu, handleStatusChange]);

  const handleBulkAction = useCallback((action: string, value?: any) => {
    console.log('Bulk action:', action, selectedIds, value);
  }, [selectedIds]);

  const handleBulkCancel = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleScoreSave = useCallback((id: string, scores: { strategic_alignment: number; business_impact: number; time_urgency: number; resource_feasibility: number }) => {
    console.log('Score save:', id, scores);
  }, []);

  return (
    <div className="p-6">
      <InitiativeToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeQuickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        density={density}
        onDensityChange={setDensity}
        filterCount={0}
        selectedCount={selectedIds.length}
        totalCount={filtered.length}
      />

      {activeView === 'table' ? (
        <InitiativeTable
          data={filtered}
          loading={isLoading}
          density={density}
          onRowClick={handleRowClick}
          onStatusChange={handleStatusChange}
          onAssigneeChange={handleAssigneeChange}
          onFavoriteToggle={handleFavoriteToggle}
          onSelectionChange={setSelectedIds}
          onSortChange={handleSortChange}
          onContextMenu={handleContextMenu}
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
          {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View — Coming Soon
        </div>
      )}

      {/* Detail Panel */}
      <DetailPanel
        initiative={detailInitiative}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
        onScoreSave={handleScoreSave}
      />

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={selectedIds.length}
        onAction={handleBulkAction}
        onCancel={handleBulkCancel}
      />

      {/* Context Menu */}
      <ContextMenu
        position={contextMenu?.pos ?? null}
        initiative={contextMenu?.initiative ?? null}
        onAction={handleContextAction}
        onClose={() => setContextMenu(null)}
      />
    </div>
  );
}
