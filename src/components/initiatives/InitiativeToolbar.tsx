import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, SlidersHorizontal, Download, MoreHorizontal, Columns3 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import type { ViewMode, Density } from '@/types/initiative';

interface InitiativeToolbarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeQuickFilter: string;
  onQuickFilterChange: (filter: string) => void;
  density: Density;
  onDensityChange: (density: Density) => void;
  filterCount: number;
  selectedCount: number;
  totalCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement>;
}

const DENSITY_CYCLE: Density[] = ['standard', 'compact', 'comfortable'];
const DENSITY_LABELS: Record<Density, string> = { compact: 'Compact', standard: 'Standard', comfortable: 'Comfortable' };

const VIEW_TABS: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  {
    id: 'table', label: 'Table',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  },
  {
    id: 'board', label: 'Board',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="10" y="2" width="4" height="8" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
  {
    id: 'timeline', label: 'Timeline',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h6M5 8h8M2 12h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    id: 'cards', label: 'Cards',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/></svg>,
  },
];

const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'my', label: 'My Items' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'high', label: 'High Priority' },
  { id: 'unscored', label: 'Unscored' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'starred', label: '★ Starred' },
];

export function InitiativeToolbar({
  activeView,
  onViewChange,
  searchQuery,
  onSearchChange,
  activeQuickFilter,
  onQuickFilterChange,
  density,
  onDensityChange,
  filterCount,
  selectedCount,
  totalCount,
  searchInputRef,
}: InitiativeToolbarProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchInput = useCallback((val: string) => {
    setLocalSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(val), 300);
  }, [onSearchChange]);

  const cycleDensity = useCallback(() => {
    const idx = DENSITY_CYCLE.indexOf(density);
    onDensityChange(DENSITY_CYCLE[(idx + 1) % DENSITY_CYCLE.length]);
  }, [density, onDensityChange]);

  return (
    <div className="space-y-0">

      {/* Row 1: Breadcrumb */}
      <div className="text-[11px] uppercase tracking-[0.05em] text-zinc-400">
        Product / <span className="text-zinc-600 font-medium">Product Backlog</span>
      </div>

      {/* Row 2: Title + Actions */}
      <div className="flex items-center justify-between mt-1 mb-3">
        <h1 className="text-xl font-semibold text-zinc-900">Product Backlog</h1>
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={cycleDensity}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </TooltipTrigger>
              <TooltipContent>Density: {DENSITY_LABELS[density]}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <button
            type="button"
            className="h-7 px-2 flex items-center gap-1 text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <Columns3 size={14} />
            Columns
          </button>

          <button
            type="button"
            className="w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Row 3: View Switcher + Search/Filters */}
      <div className="flex items-center justify-between mb-2">
        {/* View switcher */}
        <div className="inline-flex bg-zinc-100 rounded-lg p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onViewChange(tab.id)}
              className={`h-7 px-3 flex items-center gap-1.5 text-[13px] rounded-md transition-all ${
                activeView === tab.id
                  ? 'bg-white shadow-sm text-zinc-900 font-medium'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={localSearch}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="Search initiatives…"
              className="w-60 h-8 pl-8 pr-8 text-[13px] bg-zinc-50 border border-zinc-200 rounded-md outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => handleSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filters */}
          <button
            type="button"
            className="h-8 px-3 flex items-center gap-1.5 text-[13px] text-zinc-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            <SlidersHorizontal size={14} />
            Filters
            {filterCount > 0 && (
              <span className="w-4 h-4 flex items-center justify-center text-[10px] font-medium text-white bg-blue-600 rounded-full">
                {filterCount}
              </span>
            )}
          </button>

          {/* Export */}
          <button
            type="button"
            className="h-8 px-3 flex items-center gap-1.5 text-[13px] text-zinc-600 bg-white border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
        </div>
      </div>

      {/* Row 4: Quick Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onQuickFilterChange(f.id)}
            className={`h-[26px] px-3 text-xs rounded-full whitespace-nowrap transition-colors ${
              activeQuickFilter === f.id
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-zinc-100 text-zinc-600 border border-transparent hover:bg-zinc-200'
            }`}
          >
            {f.label}
          </button>
        ))}

      </div>
    </div>
  );
}
