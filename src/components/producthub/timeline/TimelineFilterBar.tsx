// =====================================================
// TIMELINE FILTER BAR — Search + Filter Chips + Type Filters
// =====================================================

import React from 'react';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { useTimelineState } from '@/hooks/producthub/useTimelineState';
import { FILTER_CHIPS, type FilterChip } from '@/types/producthub/initiative';

interface TimelineFilterBarProps {
  typeFilter?: string;
  onTypeFilterChange?: (filter: string) => void;
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All Types' },
  { id: 'project', label: '📁 Projects', color: '#2563EB' },
  { id: 'enhancement', label: '⚡ Enhancements', color: '#0D9488' },
  { id: 'improvement', label: '🔧 Improvements', color: '#D97706' },
];

export const TimelineFilterBar: React.FC<TimelineFilterBarProps> = ({ typeFilter = 'all', onTypeFilterChange }) => {
  const { activeFilter, setFilter, searchTerm, setSearch } = useTimelineState();

  return (
    <div className="bg-muted/50 border-b border-border/50 flex flex-col shrink-0">
      <div className="h-11 flex items-center gap-3 px-4">
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

        {/* Quick filter chips */}
        <div className="flex items-center gap-2">
          {FILTER_CHIPS.map(chip => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={cn(
                'h-[26px] px-3 text-[12px] font-medium rounded-xl border transition-colors duration-150',
                activeFilter === chip.key
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type filter pills + Legend */}
      <div className="h-8 flex items-center gap-3 px-4 border-t border-border/30">
        <div className="flex items-center gap-1.5">
          {TYPE_FILTERS.map(tf => (
            <button
              key={tf.id}
              onClick={() => onTypeFilterChange?.(tf.id)}
              className={cn(
                'h-[22px] px-2.5 text-[11px] font-medium rounded-md border transition-colors duration-150',
                typeFilter === tf.id
                  ? 'bg-white shadow-sm border-blue-200 text-blue-700'
                  : 'bg-transparent text-muted-foreground border-transparent hover:bg-white/60'
              )}
            >
              {tf.label}
            </button>
          ))}
        </div>

        <span className="mx-2 w-px h-4 bg-border" />

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]" style={{ color: '#94A3B8' }}>
          <span className="font-semibold uppercase tracking-wider">Legend:</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2.5 rounded-sm" style={{ background: 'linear-gradient(90deg, #2563EB, #3B82F6)' }} />
            Project
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2.5 rounded-sm" style={{ background: 'linear-gradient(90deg, #0D9488, #14B8A6)' }} />
            Enhancement
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-2.5 rounded-sm" style={{ background: 'linear-gradient(90deg, #D97706, #F59E0B)' }} />
            Improvement
          </span>
        </div>
      </div>
    </div>
  );
};

export default TimelineFilterBar;
