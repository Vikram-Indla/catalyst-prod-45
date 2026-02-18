import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { FILTER_CHIPS, type FilterChip } from '@/types/producthub/initiative';

interface KanbanFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilter: FilterChip;
  onFilterChange: (filter: FilterChip) => void;
}

export const KanbanFilterBar: React.FC<KanbanFilterBarProps> = ({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center gap-3 px-5 py-2 border-b border-zinc-200 bg-white">
      {/* Search */}
      <div className="relative w-56">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search initiatives…"
          className="w-full h-8 pl-8 pr-3 bg-white border border-zinc-300 rounded-md text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow"
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => onFilterChange(chip.key)}
            className={cn(
              'h-7 px-3 text-xs font-medium rounded-full border transition-colors',
              activeFilter === chip.key
                ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                : 'bg-white text-zinc-600 border-zinc-300 hover:text-zinc-700 hover:border-zinc-400'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
