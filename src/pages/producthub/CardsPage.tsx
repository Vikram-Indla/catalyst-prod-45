import React, { useState, useMemo } from 'react';
import { CommandCenterHeader } from '@/components/shared/CommandCenterHeader';
import { CardsToolbar } from '@/components/producthub/cards/CardsToolbar';
import { CardsGrid } from '@/components/producthub/cards/CardsGrid';
import { KanbanFilterBar } from '@/components/producthub/kanban/KanbanFilterBar';
import { CreateInitiativeDrawer } from '@/components/producthub/shared/CreateInitiativeDrawer';
import { useInitiativesMock } from '@/hooks/useInitiativesMock';
import type { Initiative } from '@/types/initiative';
import type { FilterChip } from '@/types/producthub/initiative';
import type { GridSize } from '@/components/producthub/cards/GridSizeToggle';
import { getPriorityLevel } from '@/types/initiative';

type GroupByOption = 'none' | 'status' | 'department' | 'quarter' | 'priority' | 'assignee';
type SortOption = 'score' | 'title' | 'created' | 'target' | 'progress';

function applyFilter(items: Initiative[], filter: FilterChip, search: string): Initiative[] {
  let filtered = items;

  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(i =>
      i.title.toLowerCase().includes(q) ||
      i.initiative_key.toLowerCase().includes(q) ||
      (i.assignee_name?.toLowerCase().includes(q))
    );
  }

  switch (filter) {
    case 'high':
      return filtered.filter(i => i.computed_score !== null && i.computed_score >= 4.0);
    case 'unscored':
      return filtered.filter(i => i.computed_score === null);
    case 'overdue':
      return filtered.filter(i => i.target_complete && new Date(i.target_complete) < new Date() && i.progress < 100);
    case 'starred':
      return filtered.filter(i => i.is_favorited);
    case 'quarter': {
      const now = new Date();
      const q = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`;
      return filtered.filter(i => i.target_quarter === q);
    }
    default:
      return filtered;
  }
}

function applySort(items: Initiative[], sort: SortOption): Initiative[] {
  const sorted = [...items];
  switch (sort) {
    case 'score':
      return sorted.sort((a, b) => (b.computed_score ?? -1) - (a.computed_score ?? -1));
    case 'title':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'created':
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'target':
      return sorted.sort((a, b) => {
        if (!a.target_complete) return 1;
        if (!b.target_complete) return -1;
        return new Date(a.target_complete).getTime() - new Date(b.target_complete).getTime();
      });
    case 'progress':
      return sorted.sort((a, b) => b.progress - a.progress);
    default:
      return sorted;
  }
}

const CardsPage: React.FC = () => {
  const { data, isLoading } = useInitiativesMock();
  const initiatives = data?.data ?? [];

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterChip>('all');
  const [groupBy, setGroupBy] = useState<GroupByOption>('none');
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [gridSize, setGridSize] = useState<GridSize>('medium');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  const filtered = useMemo(
    () => applySort(applyFilter(initiatives, activeFilter, searchTerm), sortBy),
    [initiatives, activeFilter, searchTerm, sortBy]
  );

  // Lazy-load detail panel
  const DetailPanel = React.useMemo(() => {
    return React.lazy(() => import('@/components/producthub/timeline/InitiativeDetailPanel'));
  }, []);

  const selectedInitiative = selectedId ? initiatives.find(i => i.id === selectedId) : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <CommandCenterHeader
        title="Product Cards"
        subtitle={`Visual initiative gallery for quick scanning — ${filtered.length} initiatives`}
      />

      <CardsToolbar
        groupBy={groupBy}
        onGroupByChange={setGroupBy}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        gridSize={gridSize}
        onGridSizeChange={setGridSize}
        onNewInitiative={() => setShowCreateDrawer(true)}
      />

      <KanbanFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="flex-1 overflow-y-auto p-5 bg-zinc-50">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">Loading initiatives…</div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-zinc-400 text-sm">No initiatives match your filters</div>
        ) : (
          <>
            <CardsGrid
              initiatives={filtered}
              gridSize={gridSize}
              groupBy={groupBy}
              onCardClick={setSelectedId}
            />
            <div className="text-center text-xs text-zinc-400 py-4 mt-2">
              Showing {filtered.length} of {initiatives.length} initiatives
            </div>
          </>
        )}
      </div>

      <CreateInitiativeDrawer open={showCreateDrawer} onClose={() => setShowCreateDrawer(false)} />
    </div>
  );
};

export default CardsPage;
