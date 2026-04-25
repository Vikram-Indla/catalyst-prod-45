/**
 * AllWorkToolbar — Filters, search, avatar stack, view toggle (V12 compliant)
 */
import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X, LayoutGrid, Columns2, Loader2 } from 'lucide-react';
import { useIssueTypes, useIssueStatuses } from '@/hooks/workhub/useWorkItems';
import type { AllWorkFilters } from '@/pages/workhub/AllWork';

type ViewMode = 'grid' | 'split';

interface Props {
  filters: AllWorkFilters;
  onFilterChange: (f: AllWorkFilters) => void;
  onSearch: (q: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  totalCount: number;
  isFetching: boolean;
  uniqueAssignees: string[];
}

function FilterDropdown({ label, options, selected, onToggle, isLoading }: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  isLoading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const escHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escHandler); };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 h-8 text-[13px] rounded border transition-colors duration-[80ms] hover:bg-[var(--hover, #1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
        style={{
          borderColor: selected.length > 0 ? 'var(--cp-blue)' : 'var(--bd-default, #2E2E2E)',
          color: selected.length > 0 ? 'var(--cp-blue)' : 'var(--fg-2)',
          backgroundColor: selected.length > 0 ? 'rgba(37,99,235,0.08)' : 'var(--bg-app)',
          fontWeight: selected.length > 0 ? 500 : 400,
          fontFamily: 'var(--cp-font-body)',
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {label}
        {selected.length > 0 && (
          <span className="text-[11px] font-semibold px-1.5 rounded" style={{ backgroundColor: 'var(--cp-blue)', color: 'var(--bg-app)' }}>
            {selected.length}
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 w-56 rounded-lg border shadow-lg z-50 py-1 max-h-64 bg-[var(--bg-app)] overflow-y-auto animate-scale-in"
          style={{ borderColor: 'var(--bd-default, #2E2E2E)' }}
          role="listbox"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--fg-3)' }} />
              <span className="ml-2 text-[12px]" style={{ color: 'var(--fg-3)' }}>Loading...</span>
            </div>
          ) : options.length === 0 ? (
            <div className="px-3 py-4 text-center text-[12px]" style={{ color: 'var(--fg-3)' }}>No options</div>
          ) : (
            options.map(opt => (
              <button
                key={opt}
                onClick={() => onToggle(opt)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[var(--hover, #1F1F1F)] text-left transition-colors duration-[80ms]"
                style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
                role="option"
                aria-selected={selected.includes(opt)}
              >
                <span
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{
                    borderColor: selected.includes(opt) ? 'var(--cp-blue)' : 'var(--bd-default, #2E2E2E)',
                    backgroundColor: selected.includes(opt) ? 'var(--cp-blue)' : 'var(--bg-app)',
                  }}
                >
                  {selected.includes(opt) && <Check className="w-3 h-3 text-white" />}
                </span>
                {opt}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const AVATAR_COLORS = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];

export function AllWorkToolbar({
  filters, onFilterChange, onSearch, viewMode, onViewModeChange,
  totalCount, isFetching, uniqueAssignees,
}: Props) {
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const { data: issueTypes, isLoading: typesLoading } = useIssueTypes();
  const { data: statuses, isLoading: statusesLoading } = useIssueStatuses();

  // Keep local input in sync when parent clears filters externally
  useEffect(() => {
    setSearchValue(filters.search ?? '');
  }, [filters.search]);

  // TC-G2 — debounce keystrokes (250 ms) so we don't fire a Supabase query per letter.
  useEffect(() => {
    const t = setTimeout(() => {
      onSearch(searchValue);
    }, 250);
    return () => clearTimeout(t);
  }, [searchValue, onSearch]);

  const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'];

  const toggleFilter = (key: 'types' | 'statuses' | 'priorities', value: string) => {
    const current = (filters[key] as string[] | undefined) ?? [];
    const next = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: next.length > 0 ? next : undefined });
  };

  const hasFilters = !!(filters.types?.length || filters.statuses?.length || filters.priorities?.length);

  return (
    <div className="px-8 py-3 flex items-center gap-3 flex-wrap" style={{ borderBottom: '1px solid var(--bd-subtle, #292929)' }}>
      <FilterDropdown
        label="Type"
        options={issueTypes ?? []}
        selected={filters.types ?? []}
        onToggle={(v) => toggleFilter('types', v)}
        isLoading={typesLoading}
      />
      <FilterDropdown
        label="Status"
        options={statuses ?? []}
        selected={filters.statuses ?? []}
        onToggle={(v) => toggleFilter('statuses', v)}
        isLoading={statusesLoading}
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
          className="inline-flex items-center gap-1 px-2 h-8 text-[12px] rounded hover:bg-[rgba(220,38,38,0.06)] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          style={{ color: 'var(--sem-danger)' }}
          aria-label="Clear all filters"
        >
          <X className="w-3.5 h-3.5" />
          Clear
        </button>
      )}

      {/* Search (TC-G2 — debounced + clear button) */}
      <div
        className="flex items-center gap-2 h-8 px-2.5 rounded border bg-[var(--bg-app)] focus-within:border-[#2563EB] transition-colors duration-[80ms]"
        style={{ minWidth: 180, borderColor: 'var(--bd-default, #2E2E2E)' }}
      >
        <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--fg-3)' }} />
        <input
          id="aw-search-input"
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search work items"
          className="text-[13px] border-none outline-none shadow-none bg-transparent w-full"
          style={{ color: 'var(--fg-1)', fontFamily: 'var(--cp-font-body)' }}
          aria-label="Search work items"
        />
        {searchValue && (
          <button
            onClick={() => setSearchValue('')}
            aria-label="Clear search"
            title="Clear search"
            className="shrink-0 rounded p-0.5 transition-colors duration-[80ms] hover:bg-[var(--hover,#1F1F1F)] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X className="w-3 h-3" style={{ color: 'var(--fg-3)' }} />
          </button>
        )}
      </div>

      {/* Avatar stack */}
      {uniqueAssignees.length > 0 && (
        <div className="flex items-center ml-1" style={{ marginRight: -4 }} aria-label="Team members">
          {uniqueAssignees.slice(0, 5).map((name, i) => (
            <div
              key={name}
              className="flex items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{
                width: 28, height: 28,
                backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
                border: '2px solid var(--bg-app)',
                marginLeft: i === 0 ? 0 : -4,
                zIndex: 5 - i,
              }}
              title={name}
              aria-label={name}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          ))}
        </div>
      )}

      <div className="flex-1" />

      {isFetching && (
        <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: 'var(--fg-3)' }} aria-label="Loading">
          <Loader2 className="w-3 h-3 animate-spin" />
        </span>
      )}

      <span className="text-[12px]" style={{ color: 'var(--fg-3)', fontFamily: 'var(--cp-font-mono)' }}>
        {totalCount.toLocaleString()} items
      </span>

      {/* View toggle */}
      <div className="inline-flex rounded border overflow-hidden" style={{ borderColor: 'var(--bd-default, #2E2E2E)' }} role="radiogroup" aria-label="View mode">
        {([
          { key: 'grid' as const, icon: LayoutGrid, label: 'Grid' },
          { key: 'split' as const, icon: Columns2, label: 'Split' },
        ]).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => onViewModeChange(key)}
            className="flex items-center gap-1.5 px-3 h-8 text-[12px] transition-colors duration-[80ms] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            style={{
              backgroundColor: viewMode === key ? 'rgba(37,99,235,0.08)' : 'var(--bg-app)',
              color: viewMode === key ? 'var(--cp-blue)' : 'var(--fg-3)',
              fontWeight: viewMode === key ? 500 : 400,
              borderLeft: key === 'split' ? '1px solid var(--bd-default, #2E2E2E)' : 'none',
              boxShadow: viewMode === key ? 'inset 0 1px 2px rgba(0,0,0,0.06)' : 'none',
              fontFamily: 'var(--cp-font-body)',
            }}
            role="radio"
            aria-checked={viewMode === key}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
