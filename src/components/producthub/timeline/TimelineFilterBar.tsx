// =====================================================
// TIMELINE FILTER BAR — Search + Filter Chips
// =====================================================

import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { FILTER_CHIPS, type FilterChip } from '@/types/producthub/initiative';

export const TimelineFilterBar: React.FC = () => {
  const { activeFilter, setFilter, searchTerm, setSearch } = useTimelineState();

  return (
    <div className="h-11 bg-muted/50 border-b border-border/50 flex items-center gap-3 px-4 shrink-0">
      {/* Search */}
      <div className="relative w-60">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search initiatives…"
          className="w-full h-[30px] pl-8 pr-3 bg-card border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-shadow"
        />
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-2">
        {FILTER_CHIPS.map(chip => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            className={cn(
              'h-[26px] px-3 text-[12px] font-medium rounded-xl border transition-colors duration-150',
              activeFilter === chip.key
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'
                : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TimelineFilterBar;
