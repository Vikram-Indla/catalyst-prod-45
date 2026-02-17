import { useState, useCallback, useMemo } from 'react';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import { InitiativeToolbar } from '@/components/initiatives/InitiativeToolbar';
import { InitiativeTable } from '@/components/initiatives/InitiativeTable';
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

  const allInitiatives = data?.data ?? [];

  const filtered = useMemo(() => {
    let result = applyQuickFilter(allInitiatives, quickFilter);
    result = applySearch(result, searchQuery);
    return result;
  }, [allInitiatives, quickFilter, searchQuery]);

  const handleRowClick = useCallback((initiative: Initiative) => {
    console.log('Row clicked:', initiative.initiative_key);
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
        />
      ) : (
        <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">
          {activeView.charAt(0).toUpperCase() + activeView.slice(1)} View — Coming Soon
        </div>
      )}
    </div>
  );
}
