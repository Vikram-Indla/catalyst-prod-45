/**
 * For You Inline Filters - Enterprise sleek filters for Project, Hub, Reported By
 */

import React, { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ForYouFilters {
  project: string | null;
  hub: string | null;
  reportedBy: string | null;
}

interface ForYouInlineFiltersProps {
  filters: ForYouFilters;
  onFiltersChange: (filters: ForYouFilters) => void;
  projectOptions: string[];
  hubOptions: string[];
  reportedByOptions: string[];
}

interface FilterDropdownProps {
  label: string;
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = options.filter(o => o.toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-[5px] rounded-[6px] text-[12px] font-medium transition-all duration-100 border",
          value
            ? "bg-[hsl(217,91%,60%)] text-white border-[hsl(217,91%,60%)] shadow-sm"
            : "bg-white text-[hsl(215,25%,37%)] border-[hsl(214,32%,91%)] hover:border-[hsl(214,32%,82%)] hover:bg-[hsl(210,40%,98%)]"
        )}
      >
        {value || label}
        {value ? (
          <X
            size={12}
            className="opacity-80 hover:opacity-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
          />
        ) : (
          <ChevronDown size={11} className="opacity-50" />
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 bg-white border border-[hsl(214,32%,91%)] rounded-[8px] shadow-[0_8px_30px_rgba(0,0,0,0.1)] min-w-[200px] max-w-[280px] z-50 overflow-hidden"
        >
          {/* Search */}
          <div className="px-2.5 pt-2.5 pb-1.5">
            <input
              type="text"
              placeholder={`Search ${label.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full px-2.5 py-[5px] text-[12px] text-[hsl(222,47%,11%)] bg-[hsl(210,40%,98%)] border border-[hsl(214,32%,91%)] rounded-[5px] outline-none placeholder:text-[hsl(215,20%,65%)] focus:border-[hsl(217,91%,60%)] focus:ring-1 focus:ring-[hsl(217,91%,60%)]/20"
            />
          </div>

          {/* Options */}
          <div className="max-h-[220px] overflow-y-auto px-1 pb-1.5">
            {/* All option */}
            <button
              onClick={() => { onChange(null); setOpen(false); setSearch(''); }}
              className={cn(
                "w-full text-left px-2.5 py-[6px] text-[12px] font-medium rounded-[5px] transition-colors",
                !value
                  ? "text-[hsl(217,91%,60%)] bg-[hsl(217,91%,95%)]"
                  : "text-[hsl(215,25%,37%)] hover:bg-[hsl(210,40%,98%)]"
              )}
            >
              All
            </button>

            {filtered.map(option => (
              <button
                key={option}
                onClick={() => { onChange(option); setOpen(false); setSearch(''); }}
                className={cn(
                  "w-full text-left px-2.5 py-[6px] text-[12px] font-medium rounded-[5px] transition-colors truncate",
                  value === option
                    ? "text-[hsl(217,91%,60%)] bg-[hsl(217,91%,95%)]"
                    : "text-[hsl(215,25%,37%)] hover:bg-[hsl(210,40%,98%)]"
                )}
                title={option}
              >
                {option}
              </button>
            ))}

            {filtered.length === 0 && (
              <div className="px-2.5 py-3 text-[11px] text-[hsl(215,20%,65%)] text-center">
                No matches
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function ForYouInlineFilters({ filters, onFiltersChange, projectOptions, hubOptions, reportedByOptions }: ForYouInlineFiltersProps) {
  const activeCount = [filters.project, filters.hub, filters.reportedBy].filter(Boolean).length;

  return (
    <div className="inline-flex items-center gap-2">
      {/* Filter icon label */}
      <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[hsl(215,16%,57%)] uppercase tracking-[0.04em] select-none">
        <Filter size={12} className="opacity-60" />
        Filters
        {activeCount > 0 && (
          <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[hsl(217,91%,60%)] text-white text-[10px] font-bold flex items-center justify-center">
            {activeCount}
          </span>
        )}
      </div>

      <div className="w-px h-4 bg-[hsl(214,32%,91%)]" />

      <FilterDropdown
        label="Project"
        value={filters.project}
        options={projectOptions}
        onChange={v => onFiltersChange({ ...filters, project: v })}
      />
      <FilterDropdown
        label="Hub"
        value={filters.hub}
        options={hubOptions}
        onChange={v => onFiltersChange({ ...filters, hub: v })}
      />
      <FilterDropdown
        label="Reported by"
        value={filters.reportedBy}
        options={reportedByOptions}
        onChange={v => onFiltersChange({ ...filters, reportedBy: v })}
      />

      {/* Clear all */}
      {activeCount > 0 && (
        <button
          onClick={() => onFiltersChange({ project: null, hub: null, reportedBy: null })}
          className="text-[11px] font-medium text-[hsl(215,16%,47%)] hover:text-[hsl(0,72%,51%)] transition-colors ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
