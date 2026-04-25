import { useState, useRef, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, List, LayoutGrid, ArrowUp, ArrowDown } from 'lucide-react';

interface FilterState {
  priorities: string[];
  statuses: string[];
  types: string[];
}

interface SortState {
  column: string;
  direction: 'asc' | 'desc';
}

interface TestCasesToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  testCaseCount: number;
  viewMode: 'list' | 'grid';
  onViewModeChange: (mode: 'list' | 'grid') => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
}

const PRIORITY_OPTIONS = ['critical', 'high', 'medium', 'low'];
const STATUS_OPTIONS = ['draft', 'ready', 'approved', 'deprecated'];
const TYPE_OPTIONS = ['functional', 'security', 'integration', 'api', 'regression'];

const SORT_OPTIONS = [
  { value: 'case_key', label: 'ID (Case Key)' },
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
  { value: 'updated_at', label: 'Updated' },
  { value: 'created_at', label: 'Created' },
];

export function TestCasesToolbar({
  searchQuery,
  onSearchChange,
  testCaseCount,
  viewMode,
  onViewModeChange,
  filters,
  onFiltersChange,
  sort,
  onSortChange,
}: TestCasesToolbarProps) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync local filters when prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const activeFilterCount = filters.priorities.length + filters.statuses.length + filters.types.length;

  const toggleFilter = (category: keyof FilterState, value: string) => {
    setLocalFilters(prev => {
      const arr = prev[category];
      if (arr.includes(value)) {
        return { ...prev, [category]: arr.filter(v => v !== value) };
      } else {
        return { ...prev, [category]: [...arr, value] };
      }
    });
  };

  const clearAllFilters = () => {
    const empty = { priorities: [], statuses: [], types: [] };
    setLocalFilters(empty);
    onFiltersChange(empty);
    setIsFilterOpen(false);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsFilterOpen(false);
  };

  const renderCheckbox = (category: keyof FilterState, value: string, label: string) => {
    const checked = localFilters[category].includes(value);
    return (
      <label key={value} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 32, cursor: 'pointer', fontSize: 13, color: 'var(--fg-2)' }}>
        <input type="checkbox" checked={checked} onChange={() => toggleFilter(category, value)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
        {label}
      </label>
    );
  };

  return (
    <div style={{
      height: 56,
      padding: '0 20px',
      backgroundColor: 'var(--cp-float)',
      borderBottom: '1px solid var(--divider)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <input
            type="text"
            placeholder="Search test cases..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              width: '100%', height: 40, padding: '0 12px 0 40px', fontSize: 14,
              fontFamily: 'var(--cp-font-body)', color: 'var(--fg-1)', backgroundColor: 'var(--cp-float)',
              border: '1.5px solid var(--divider)', borderRadius: 8, outline: 'none',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--cp-blue)'; e.target.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--divider)'; e.target.style.boxShadow = 'none'; }}
          />
          <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 17, height: 17, color: 'var(--fg-4)', pointerEvents: 'none' }} />
        </div>

        {/* Filter button */}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setIsFilterOpen(!isFilterOpen); setIsSortOpen(false); }}
            style={{
              height: 40, padding: '0 16px',
              backgroundColor: activeFilterCount > 0 ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'var(--cp-float)',
              border: `1.5px solid ${activeFilterCount > 0 ? 'var(--cp-blue)' : 'var(--divider)'}`,
              borderRadius: 8, fontSize: 14, fontFamily: 'var(--cp-font-body)', fontWeight: 500,
              color: activeFilterCount > 0 ? 'var(--cp-blue)' : 'var(--fg-2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
            }}
          >
            <Filter style={{ width: 16, height: 16, color: activeFilterCount > 0 ? 'var(--cp-blue)' : 'var(--fg-3)' }} />
            Filter {activeFilterCount > 0 && `(${activeFilterCount})`}
          </button>

          {/* Filter Dropdown */}
          {isFilterOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 320,
              backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: 16, zIndex: 100,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg-1)' }}>Filters</span>
                <button onClick={clearAllFilters} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--fg-3)', cursor: 'pointer' }}>Clear</button>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 8 }}>Priority</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{PRIORITY_OPTIONS.map(p => renderCheckbox('priorities', p, p.charAt(0).toUpperCase() + p.slice(1)))}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 8 }}>Status</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{STATUS_OPTIONS.map(s => renderCheckbox('statuses', s, s.charAt(0).toUpperCase() + s.slice(1)))}</div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--fg-3)', marginBottom: 8 }}>Type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>{TYPE_OPTIONS.map(t => renderCheckbox('types', t, t.charAt(0).toUpperCase() + t.slice(1)))}</div>
              </div>
              <button onClick={applyFilters} style={{ width: '100%', height: 50, background: 'linear-gradient(135deg, var(--cp-blue) 0%, var(--cp-primary-70) 100%)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--cp-float)', cursor: 'pointer' }}>Apply Filters</button>
            </div>
          )}
        </div>

        {/* Sort button */}
        <div ref={sortRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setIsSortOpen(!isSortOpen); setIsFilterOpen(false); }}
            style={{
              height: 40, padding: '0 16px', backgroundColor: 'var(--cp-float)',
              border: '1.5px solid var(--divider)', borderRadius: 8, fontSize: 14,
              fontFamily: 'var(--cp-font-body)', fontWeight: 500, color: 'var(--fg-2)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
            }}
          >
            <ArrowUpDown style={{ width: 16, height: 16, color: 'var(--fg-3)' }} />
            Sort
          </button>

          {/* Sort Dropdown */}
          {isSortOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 240,
              backgroundColor: 'var(--cp-float)', border: '1px solid var(--divider)', borderRadius: 12,
              boxShadow: '0 10px 40px rgba(0,0,0,0.12)', padding: 8, zIndex: 100,
            }}>
              <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', borderBottom: '1px solid var(--cp-bd-zone)' }}>Sort by</div>
              {SORT_OPTIONS.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => onSortChange({ ...sort, column: opt.value })}
                  style={{
                    height: 40, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    borderRadius: 8, backgroundColor: sort.column === opt.value ? 'color-mix(in srgb, var(--cp-blue) 8%, transparent)' : 'transparent', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="radio" checked={sort.column === opt.value} readOnly style={{ width: 16, height: 16, accentColor: 'var(--cp-blue)' }} />
                    <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{opt.label}</span>
                  </div>
                  {sort.column === opt.value && (
                    <div style={{ display: 'flex', gap: 2 }}>
                      <button onClick={(e) => { e.stopPropagation(); onSortChange({ ...sort, direction: 'asc' }); }}
                        style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, backgroundColor: sort.direction === 'asc' ? 'var(--cp-blue)' : 'transparent', color: sort.direction === 'asc' ? 'var(--cp-float)' : 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowUp size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onSortChange({ ...sort, direction: 'desc' }); }}
                        style={{ width: 24, height: 24, padding: 0, border: 'none', borderRadius: 4, backgroundColor: sort.direction === 'desc' ? 'var(--cp-blue)' : 'transparent', color: sort.direction === 'desc' ? 'var(--cp-float)' : 'var(--fg-4)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--fg-3)', fontFamily: 'var(--cp-font-body)' }}>
          <strong style={{ color: 'var(--fg-1)', fontWeight: 600 }}>{testCaseCount}</strong> test cases
        </span>

        {/* View toggle */}
        <div style={{ display: 'flex', backgroundColor: 'var(--cp-bd-zone)', borderRadius: 8, padding: 4 }}>
          <button
            onClick={() => onViewModeChange('list')}
            style={{
              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
              backgroundColor: viewMode === 'list' ? 'var(--cp-float)' : 'transparent',
              color: viewMode === 'list' ? 'var(--cp-blue)' : 'var(--fg-3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s',
            }}
          >
            <List style={{ width: 18, height: 18 }} />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            style={{
              width: 32, height: 32, padding: 0, border: 'none', borderRadius: 6,
              backgroundColor: viewMode === 'grid' ? 'var(--cp-float)' : 'transparent',
              color: viewMode === 'grid' ? 'var(--cp-blue)' : 'var(--fg-3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s',
            }}
          >
            <LayoutGrid style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TestCasesToolbar;
