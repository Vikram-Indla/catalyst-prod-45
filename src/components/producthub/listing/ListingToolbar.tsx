/**
 * ListingToolbar — Table-specific toolbar with view switcher, density, columns, export, grouping
 * Catalyst V5 Design System — Enterprise contrast standards
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Download, Plus, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Density } from '@/types/initiative';

export type GroupByField = 'none' | 'status' | 'priority' | 'department' | 'quarter' | 'assignee';

interface Props {
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
  groupBy: GroupByField;
  onGroupByChange: (g: GroupByField) => void;
}

const DENSITY_CYCLE: Density[] = ['standard', 'compact', 'comfortable'];
const DENSITY_LABELS: Record<Density, string> = { compact: 'Compact', standard: 'Standard', comfortable: 'Comfortable' };
const DENSITY_ICONS: Record<Density, React.ReactNode> = {
  compact: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 3h10M3 6.5h10M3 10h10M3 13h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  standard: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h10M3 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  comfortable: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 5h10M3 11h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
};


const QUICK_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'my', label: 'My Items' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'high', label: 'High Priority' },
  { id: 'unscored', label: 'Unscored' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'starred', label: '★ Starred' },
];

const GROUP_OPTIONS: { id: GroupByField; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'status', label: 'Status' },
  { id: 'priority', label: 'Priority' },
  { id: 'department', label: 'Department' },
  { id: 'quarter', label: 'Quarter' },
  { id: 'assignee', label: 'Assignee' },
];

export function ListingToolbar({
  searchQuery, onSearchChange,
  activeQuickFilter, onQuickFilterChange, density, onDensityChange,
  totalCount, searchInputRef, columnsButtonRef, onColumnsClick,
  exportButtonRef, onExportClick, groupBy, onGroupByChange,
}: Props) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupBtnRef = useRef<HTMLButtonElement>(null);
  const groupPanelRef = useRef<HTMLDivElement>(null);

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

  // Close group dropdown on outside click
  useEffect(() => {
    if (!groupDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (groupPanelRef.current && !groupPanelRef.current.contains(e.target as Node) &&
          groupBtnRef.current && !groupBtnRef.current.contains(e.target as Node)) {
        setGroupDropdownOpen(false);
      }
    };
    const raf = requestAnimationFrame(() => document.addEventListener('mousedown', handler));
    return () => { cancelAnimationFrame(raf); document.removeEventListener('mousedown', handler); };
  }, [groupDropdownOpen]);

  const groupLabel = GROUP_OPTIONS.find(g => g.id === groupBy)?.label ?? 'None';
  const groupBtnRect = groupBtnRef.current?.getBoundingClientRect();

  /* ── Shared button style for toolbar actions ── */
  const toolbarBtnClass = 'h-8 px-3 flex items-center gap-1.5 text-[13px] font-medium rounded-md border transition-colors';
  const toolbarBtnDefault = `${toolbarBtnClass} text-zinc-700 border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400`;

  return (
    <div className="space-y-0 px-6 pt-4 pb-0">
      {/* Row 1: Actions */}
      <div className="flex items-center justify-between mb-2">
        {/* Left: Density + Columns + Group */}
        <div className="flex items-center gap-3">
          {/* ── Density ── */}
          <button
            type="button"
            onClick={cycleDensity}
            className={`${toolbarBtnClass} text-zinc-700 border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400`}
          >
            <span className="text-zinc-500">{DENSITY_ICONS[density]}</span>
            {DENSITY_LABELS[density]}
          </button>

          {/* ── Separator ── */}
          <div className="w-px h-5 bg-zinc-300" />

          {/* ── Columns ── */}
          <button
            ref={columnsButtonRef}
            type="button"
            onClick={onColumnsClick}
            className={toolbarBtnDefault}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-zinc-500"><rect x="2" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8" y="2" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Columns
          </button>

          {/* ── Group By ── */}
          <button
            ref={groupBtnRef}
            type="button"
            onClick={() => setGroupDropdownOpen(prev => !prev)}
            className={`${toolbarBtnClass} ${
              groupBy !== 'none'
                ? 'text-blue-700 bg-blue-50 border-blue-300 hover:bg-blue-100'
                : 'text-zinc-700 border-zinc-300 bg-white hover:bg-zinc-50 hover:border-zinc-400'
            }`}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className={groupBy !== 'none' ? 'text-blue-600' : 'text-zinc-500'}><rect x="2" y="2" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="2" y="10" width="12" height="4" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>
            Group: {groupLabel}
          </button>
        </div>

        {/* Right: Export + New */}
        <div className="flex items-center gap-2">
          {/* ── Export ── */}
          <button
            ref={exportButtonRef}
            type="button"
            onClick={onExportClick}
            className={toolbarBtnDefault}
          >
            <Download size={14} className="text-zinc-500" />
            Export
          </button>

          {/* ── Separator ── */}
          <div className="w-px h-5 bg-zinc-300" />

          {/* ── Primary CTA: New Initiative (Solid Blue) ── */}
          <button
            type="button"
            className="h-8 px-3 flex items-center gap-1.5 text-[13px] font-medium rounded-md bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} />
            New Initiative
          </button>
        </div>
      </div>

      {/* Row 2: Search + Filter Chips */}
      <div className="flex items-center gap-3 pb-3">
        {/* ── Search Input ── */}
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search initiatives…"
            className="w-full h-8 pl-8 pr-8 text-[13px] bg-white border border-zinc-300 rounded-md outline-none transition-all placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {localSearch && (
            <button type="button" onClick={() => handleSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── Quick Filter Chips ── */}
        <div className="flex items-center gap-1.5">
          {QUICK_FILTERS.map(f => {
            const isActive = activeQuickFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onQuickFilterChange(f.id)}
                className={`h-7 px-3 text-[12px] font-medium rounded-full whitespace-nowrap border transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                    : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50 hover:border-zinc-400 hover:text-zinc-700'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Group By Dropdown Portal */}
      {groupDropdownOpen && groupBtnRect && createPortal(
        <div
          ref={groupPanelRef}
          className="fixed rounded-lg p-1"
          style={{
            top: groupBtnRect.bottom + 4,
            left: groupBtnRect.left,
            width: 180,
            border: '1px solid #d4d4d8',
            boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
            background: '#ffffff',
            zIndex: 500,
          }}
        >
          {GROUP_OPTIONS.map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => { onGroupByChange(opt.id); setGroupDropdownOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] rounded-sm transition-colors text-left"
              style={{
                color: groupBy === opt.id ? '#2563eb' : '#3f3f46',
                background: groupBy === opt.id ? '#eff6ff' : 'transparent',
              }}
              onMouseEnter={(e) => { if (groupBy !== opt.id) (e.currentTarget).style.background = '#f4f4f5'; }}
              onMouseLeave={(e) => { if (groupBy !== opt.id) (e.currentTarget).style.background = 'transparent'; }}
            >
              <span className="w-4 flex items-center justify-center">
                {groupBy === opt.id && <Check size={13} className="text-blue-600" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
