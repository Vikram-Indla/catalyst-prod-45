// ════════════════════════════════════════════════════════════════════════════
// SPACES TOOLBAR - Search, filters, sort, view toggle
// ════════════════════════════════════════════════════════════════════════════

import { Search, LayoutGrid, List, X } from 'lucide-react';
import { useSpaceStore } from '@/stores/spaceStore';
import { cn } from '@/lib/utils';
import type { SpaceCategory, SpaceType, SpaceSortField } from '@/types/spaces';

interface SpacesToolbarProps {
  categories: SpaceCategory[];
}

export function SpacesToolbar({ categories }: SpacesToolbarProps) {
  const {
    viewMode,
    setViewMode,
    filters,
    updateFilter,
    clearFilters,
    sort,
    setSort,
  } = useSpaceStore();

  const hasActiveFilters =
    filters.search || filters.type || filters.category_id || filters.starred;

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search spaces..."
          value={filters.search || ''}
          onChange={(e) => updateFilter('search', e.target.value || undefined)}
          className="w-full pl-10 pr-8 py-2 bg-background border border-border rounded-md text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {filters.search && (
          <button
            onClick={() => updateFilter('search', undefined)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type Filter */}
      <select
        value={filters.type || ''}
        onChange={(e) =>
          updateFilter('type', (e.target.value as SpaceType) || undefined)
        }
        className="px-3 py-2 bg-background border border-border rounded-md text-sm cursor-pointer focus:border-primary focus:outline-none"
      >
        <option value="">All Types</option>
        <option value="kanban">Kanban</option>
        <option value="business">Business</option>
        <option value="service">Service</option>
      </select>

      {/* Category Filter */}
      <select
        value={filters.category_id || ''}
        onChange={(e) =>
          updateFilter('category_id', e.target.value || undefined)
        }
        className="px-3 py-2 bg-background border border-border rounded-md text-sm cursor-pointer focus:border-primary focus:outline-none"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Starred Filter */}
      <button
        onClick={() =>
          updateFilter('starred', filters.starred ? undefined : true)
        }
        className={cn(
          'px-3 py-2 border rounded-md text-sm font-medium transition-colors',
          filters.starred
            ? 'bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            : 'bg-background border-border text-muted-foreground hover:bg-muted'
        )}
      >
        ★ Starred
      </button>

      {/* Sort */}
      <select
        value={sort.field}
        onChange={(e) =>
          setSort({ ...sort, field: e.target.value as SpaceSortField })
        }
        className="px-3 py-2 bg-background border border-border rounded-md text-sm cursor-pointer focus:border-primary focus:outline-none"
      >
        <option value="name">Sort by Name</option>
        <option value="key">Sort by Key</option>
        <option value="created_at">Sort by Created</option>
        <option value="updated_at">Sort by Updated</option>
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="px-3 py-2 text-sm text-destructive hover:underline"
        >
          Clear filters
        </button>
      )}

      {/* View Toggle */}
      <div className="flex items-center ml-auto border border-border rounded-md overflow-hidden">
        <button
          onClick={() => setViewMode('grid')}
          className={cn(
            'p-2 transition-colors',
            viewMode === 'grid'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted'
          )}
          title="Grid view"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={cn(
            'p-2 transition-colors',
            viewMode === 'list'
              ? 'bg-primary text-primary-foreground'
              : 'bg-background text-muted-foreground hover:bg-muted'
          )}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
