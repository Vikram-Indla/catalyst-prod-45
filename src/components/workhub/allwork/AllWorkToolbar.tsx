/**
 * AllWorkToolbar — Filters, search, avatar stack, view toggle
 */
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, LayoutGrid, Columns2, Loader2 } from 'lucide-react';
import { useIssueTypes, useIssueStatuses } from '@/hooks/workhub/useWorkItems';
import type { WorkItemFilterConfig } from '@/hooks/workhub/useWorkItems';

type ViewMode = 'grid' | 'split';

interface Props {
  filters: Partial<WorkItemFilterConfig>;
  onFilterChange: (f: Partial<WorkItemFilterConfig>) => void;
  onSearch: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  totalCount: number;
  isFetching: boolean;
  uniqueAssignees: string[];
}

function FilterDropdown({ label, options, selected, onToggle }: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 h-8 text-[13px] rounded-md border transition-colors hover:bg-[#f8f8f8]"
        style={{
          borderColor: selected.length > 0 ? '#1868db' : '#DFE1E6',
          color: selected.length > 0 ? '#1868db' : '#44546f',
          backgroundColor: selected.length > 0 ? '#e9f2fe' : '#fff',
          fontWeight: selected.length > 0 ? 500 : 400,
        }}
      >
        {label}
        {selected.length > 0 && (
          <span className="text-[11px] font-semibold px-1 rounded" style={{ backgroundColor: '#1868db', color: '#fff' }}>
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-56 rounded-lg border bg-white shadow-lg z-50 py-1 max-h-64 overflow-y-auto"
          style={{ borderColor: '#DFE1E6' }}
        >
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => onToggle(opt)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f8f8f8] text-left"
              style={{ color: '#1A1D23' }}
            >
              <span
                className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                style={{
                  borderColor: selected.includes(opt) ? '#1868db' : '#DFE1E6',
                  backgroundColor: selected.includes(opt) ? '#1868db' : '#fff',
                }}
              >
                {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
              </span>
              {opt}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-4 text-center text-[12px]" style={{ color: '#8c8f96' }}>No options</div>
          )}
        </div>
      )}
    </div>
  );
}

export function AllWorkToolbar({
  filters, onFilterChange, onSearch, viewMode, onViewModeChange,
  totalCount, isFetching, uniqueAssignees,
}: Props) {
  const [searchValue, setSearchValue] = useState(filters.search_query ?? '');
  const { data: issueTypes } = useIssueTypes();
  const { data: statuses } = useIssueStatuses();

  const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

  const toggleFilter = (key: keyof WorkItemFilterConfig, value: string) => {
    const current = (filters[key] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: next.length > 0 ? next : undefined });
  };

  const hasFilters = !!(filters.types?.length || filters.statuses?.length || filters.priorities?.length);

  // Avatar colors
  const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];

  return (
    <div className="px-8 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid #E2E8F0' }}>
      {/* Filter buttons */}
      <FilterDropdown
        label="Type"
        options={issueTypes ?? []}
        selected={filters.types ?? []}
        onToggle={(v) => toggleFilter('types', v)}
      />
      <FilterDropdown
        label="Status"
        options={statuses ?? []}
        selected={filters.statuses ?? []}
        onToggle={(v) => toggleFilter('statuses', v)}
      />
      <FilterDropdown
        label="Priority"
        options={PRIORITIES}
        selected={filters.priorities ?? []}
        onToggle={(v) => toggleFilter('priorities', v)}
      />

      {hasFilters && (
        <button
          onClick={() => onFilterChange({})}
          className="inline-flex items-center gap-1 px-2 h-8 text-[12px] rounded-md hover:bg-[#fef2f2] transition-colors"
          style={{ color: '#dc2626' }}
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {/* Search */}
      <div
        className="flex items-center gap-2 h-8 px-2.5 rounded-md border bg-white"
        style={{ minWidth: 140, borderColor: '#DFE1E6' }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: '#8c8f96' }} />
        <input
          id="aw-search-input"
          type="text"
          value={searchValue}
          onChange={(e) => { setSearchValue(e.target.value); onSearch(e.target.value); }}
          placeholder="Search"
          className="text-[13px] border-none outline-none bg-transparent w-full"
          style={{ color: '#1A1D23', appearance: 'none' }}
        />
      </div>

      {/* Avatar stack */}
      <div className="flex items-center ml-1" style={{ marginRight: -4 }}>
        {uniqueAssignees.slice(0, 5).map((name, i) => (
          <div
            key={name}
            className="flex items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{
              width: 28, height: 28,
              backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
              border: '2px solid #fff',
              marginLeft: i === 0 ? 0 : -4,
              zIndex: 5 - i,
            }}
            title={name}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Fetching indicator */}
      {isFetching && (
        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: '#8c8f96' }}>
          <Loader2 className="w-3 h-3 animate-spin" />
        </span>
      )}

      {/* Count */}
      <span className="text-[12px]" style={{ color: '#6b6e76' }}>{totalCount.toLocaleString()} items</span>

      {/* View toggle */}
      <div
        className="inline-flex rounded-md border overflow-hidden"
        style={{ borderColor: '#DFE1E6' }}
      >
        <button
          onClick={() => onViewModeChange('grid')}
          className="flex items-center gap-1.5 px-3 h-8 text-[12px] transition-colors"
          style={{
            backgroundColor: viewMode === 'grid' ? '#e9f2fe' : '#fff',
            color: viewMode === 'grid' ? '#1868db' : '#6b6e76',
            fontWeight: viewMode === 'grid' ? 500 : 400,
            boxShadow: viewMode === 'grid' ? 'inset 0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Grid
        </button>
        <button
          onClick={() => onViewModeChange('split')}
          className="flex items-center gap-1.5 px-3 h-8 text-[12px] transition-colors"
          style={{
            backgroundColor: viewMode === 'split' ? '#e9f2fe' : '#fff',
            color: viewMode === 'split' ? '#1868db' : '#6b6e76',
            fontWeight: viewMode === 'split' ? 500 : 400,
            borderLeft: '1px solid #DFE1E6',
            boxShadow: viewMode === 'split' ? 'inset 0 1px 2px rgba(0,0,0,0.06)' : 'none',
          }}
        >
          <Columns2 className="w-3.5 h-3.5" />
          Split
        </button>
      </div>
    </div>
  );
}
