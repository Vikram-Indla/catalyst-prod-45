import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import { InitiativeToolbar } from '@/components/initiatives/InitiativeToolbar';
import { InitiativeTable } from '@/components/initiatives/InitiativeTable';
import { DetailPanel } from '@/components/initiatives/DetailPanel';
import { BulkActionBar } from '@/components/initiatives/BulkActionBar';
import { ContextMenu } from '@/components/initiatives/ContextMenu';
import { Toaster, toast } from '@/components/ui/sonner';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import type { Initiative, InitiativeStatus, Density, ViewMode } from '@/types/initiative';

const TERMINAL_STATUSES: InitiativeStatus[] = ['delivered', 'closed', 'cancelled'];

function applyQuickFilter(data: Initiative[], filter: string): Initiative[] {
  switch (filter) {
    case 'my': return data.filter(i => ['Sarah K.', 'Fatima R.'].includes(i.assignee_name || ''));
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

  const [detailInitiative, setDetailInitiative] = useState<Initiative | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{ pos: { x: number; y: number }; initiative: Initiative } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const allInitiatives = data?.data ?? [];

  const filtered = useMemo(() => {
    let result = applyQuickFilter(allInitiatives, quickFilter);
    result = applySearch(result, searchQuery);
    return result;
  }, [allInitiatives, quickFilter, searchQuery]);

  // Keyboard shortcuts
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

  const handleStatusChange = useCallback((id: string, status: InitiativeStatus) => {
    console.log('Status change:', id, status);
    toast.success(`Status updated to ${status.replace(/_/g, ' ')}`);
  }, []);

  const handleAssigneeChange = useCallback((id: string, assigneeId: string) => {
    console.log('Assignee change:', id, assigneeId);
    toast.success('Assignee updated');
  }, []);

  const handleFavoriteToggle = useCallback((id: string, isFavorited: boolean) => {
    console.log('Favorite toggle:', id, isFavorited);
  }, []);

  const handleSortChange = useCallback((s: { id: string; desc: boolean }[]) => {
    setSorting(s);
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
      case 'copy_id':
        navigator.clipboard.writeText(init.initiative_key);
        toast.success('Copied!');
        break;
      default:
        console.log('Context action:', action, value);
    }
  }, [contextMenu, handleStatusChange]);

  const handleBulkAction = useCallback((action: string, value?: any) => {
    console.log('Bulk action:', action, selectedIds, value);
    toast.success(`${selectedIds.length} items updated`);
  }, [selectedIds]);

  const handleScoreSave = useCallback((id: string, scores: { strategic_alignment: number; business_impact: number; time_urgency: number; resource_feasibility: number }) => {
    console.log('Score save:', id, scores);
    toast.success('Score saved');
  }, []);

  return (
    <div className="flex flex-col h-full">
      <CommandCenterHeader
        title="Product Backlog"
        subtitle="Strategic demand pipeline — prioritization, scoring & lifecycle tracking"
      />
      <div className="px-6 pt-4 pb-6">
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
        searchInputRef={searchInputRef}
      />

      {activeView === 'table' ? (
        <>
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
          <div className="h-11 flex items-center justify-between px-4 border-t border-zinc-200 text-xs text-zinc-500">
            <span>Showing 1–{filtered.length} of {filtered.length}</span>
          </div>
        </>
      ) : (
        <div className="h-96 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <h3 className="text-base font-medium text-zinc-500">
            {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View
          </h3>
          <p className="text-sm">Coming Soon</p>
        </div>
      )}

      <DetailPanel
        initiative={detailInitiative}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onStatusChange={handleStatusChange}
        onScoreSave={handleScoreSave}
      />

      <BulkActionBar
        selectedCount={selectedIds.length}
        onAction={handleBulkAction}
        onCancel={() => setSelectedIds([])}
      />

      <ContextMenu
        position={contextMenu?.pos ?? null}
        initiative={contextMenu?.initiative ?? null}
        onAction={handleContextAction}
        onClose={() => setContextMenu(null)}
      />

      <Toaster position="bottom-right" />
      </div>
    </div>
  );
}
