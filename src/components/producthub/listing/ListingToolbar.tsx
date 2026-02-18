/**
 * ListingToolbar — Table-specific toolbar with view switcher, density, columns, export
 * Catalyst V5 Design System
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Download, Plus } from 'lucide-react';
import type { Density } from '@/types/initiative';

type ViewMode = 'table' | 'board' | 'timeline' | 'cards';

interface Props {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeQuickFilter: string;
  onQuickFilterChange: (f: string) => void;
  density: Density;
  onDensityChange: (d: Density) => void;
  totalCount: number;
  searchInputRef?: React.RefObject<HTMLInputElement>;
  columnsButtonRef?: React.RefObject<HTMLButtonElement>;
  onColumnsClick?: () => void;
  exportButtonRef?: React.RefObject<HTMLButtonElement>;
  onExportClick?: () => void;
}

const DENSITY_CYCLE: Density[] = ['standard', 'compact', 'comfortable'];
const DENSITY_LABELS: Record<Density, string> = { compact: 'Compact', standard: 'Standard', comfortable: 'Comfortable' };
const DENSITY_ICONS: Record<Density, React.ReactNode> = {
  compact: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3h10M3 6.5h10M3 10h10M3 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  standard: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  comfortable: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M3 11h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'table', label: 'Table' },
  { id: 'board', label: 'Board' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'cards', label: 'Cards' },
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

export function ListingToolbar({
  activeView, onViewChange, searchQuery, onSearchChange,
  activeQuickFilter, onQuickFilterChange, density, onDensityChange,
  totalCount, searchInputRef, columnsButtonRef, onColumnsClick,
  exportButtonRef, onExportClick,
}: Props) {
  const navigate = useNavigate();
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { setLocalSearch(searchQuery); }, [searchQuery]);

  const handleSearch = useCallback((val: string) => {
    setLocalSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearchChange(val), 250);
  }, [onSearchChange]);

  const cycleDensity = useCallback(() => {
    const idx = DENSITY_CYCLE.indexOf(density);
    onDensityChange(DENSITY_CYCLE[(idx + 1) % DENSITY_CYCLE.length]);
  }, [density, onDensityChange]);

  const handleViewChange = useCallback((view: ViewMode) => {
    if (view === 'timeline') {
      navigate('/producthub/roadmap');
      return;
    }
    onViewChange(view);
  }, [navigate, onViewChange]);

  return (
    <div className="space-y-0 px-6 pt-4 pb-0">
      {/* Row 1: View Switcher + Actions */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: View Switcher + Density + Columns */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center bg-zinc-100 rounded-lg p-1">
            {VIEW_TABS.map(v => (
              <button
                key={v.id}
                onClick={() => handleViewChange(v.id)}
                className={`px-3 py-1.5 text-[13px] rounded-md transition-all ${
                  activeView === v.id
                    ? 'bg-white text-zinc-900 font-medium shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-zinc-200" />

          <button
            type="button"
            onClick={cycleDensity}
            className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
          >
            {DENSITY_ICONS[density]}
            {DENSITY_LABELS[density]}
          </button>

          <div className="w-px h-5 bg-zinc-200" />

          <button
            ref={columnsButtonRef}
            type="button"
            onClick={onColumnsClick}
            className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Columns
          </button>

          <button type="button" className="h-7 px-2.5 flex items-center gap-1.5 text-[12px] text-zinc-600 rounded-md hover:bg-zinc-100 transition-colors">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="2" y="10" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Group: None
          </button>
        </div>

        {/* Right: Export + New */}
        <div className="flex items-center gap-2">
          <button
            ref={exportButtonRef}
            type="button"
            onClick={onExportClick}
            className="h-8 px-3 flex items-center gap-1.5 text-[13px] text-zinc-600 border border-zinc-200 rounded-md hover:bg-zinc-50 transition-colors"
          >
            <Download size={14} />
            Export
          </button>
          <div className="w-px h-5 bg-zinc-200" />
          <button type="button" className="h-8 px-3 flex items-center gap-1.5 text-[13px] font-medium rounded-md transition-colors border"
            style={{ color: '#2563eb', borderColor: '#2563eb' }}>
            <Plus size={14} />
            New Initiative
          </button>
        </div>
      </div>

      {/* Row 2: Search + Filter Chips */}
      <div className="flex items-center gap-3 pb-3">
        <div className="relative w-60">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search initiatives…"
            className="w-full h-[30px] pl-8 pr-8 text-[13px] bg-zinc-50 border border-zinc-200 rounded-md outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          />
          {localSearch && (
            <button type="button" onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {QUICK_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => onQuickFilterChange(f.id)}
              className="h-[26px] px-3 text-[12px] font-medium rounded-full whitespace-nowrap transition-colors"
              style={
                activeQuickFilter === f.id
                  ? { background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }
                  : { background: '#f4f4f5', color: '#52525b', border: '1px solid transparent' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
