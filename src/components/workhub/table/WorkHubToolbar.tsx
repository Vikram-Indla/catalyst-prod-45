/**
 * WorkHubToolbar — Filter bar, search, group-by, column toggle, view switcher, + Create
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, Settings2, LayoutList, Columns3, Table2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FilterConfig, GroupByField, ViewMode } from '@/types/workhub';
import WorkHubColumnFilter from './WorkHubColumnFilter';

interface WorkHubToolbarProps {
  filters: FilterConfig;
  onFiltersChange: (filters: FilterConfig) => void;
  groupBy: GroupByField;
  onGroupByChange: (g: GroupByField) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  onCreateClick: () => void;
  uniqueStatuses: string[];
  uniqueTypes: string[];
  uniqueAssignees: string[];
  uniquePriorities: string[];
}

const GROUP_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'status_category', label: 'Status' },
  { value: 'assignee_id', label: 'Assignee' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'parent_key', label: 'Parent' },
  { value: 'none', label: 'None' },
];

export default function WorkHubToolbar({
  filters, onFiltersChange, groupBy, onGroupByChange, viewMode, onViewModeChange,
  onCreateClick, uniqueStatuses, uniqueTypes, uniqueAssignees, uniquePriorities,
}: WorkHubToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.search_query || '');
  const debounceRef = useRef<NodeJS.Timeout>();

  const handleSearch = useCallback((val: string) => {
    setSearchValue(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search_query: val });
    }, 300);
  }, [filters, onFiltersChange]);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const activeFilterCount = (filters.statuses?.length || 0) + (filters.types?.length || 0)
    + (filters.assignee_ids?.length || 0) + (filters.priorities?.length || 0);

  const filterBtn = (label: string, count: number, children: React.ReactNode) => (
    <Popover>
      <PopoverTrigger asChild>
        <button style={{
          display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
          border: count > 0 ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
          borderRadius: 4, background: count > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
          fontSize: 12, fontWeight: 500, color: count > 0 ? '#2563EB' : '#334155', cursor: 'pointer',
        }}>
          {label} {count > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#2563EB', color: 'white', borderRadius: 10, padding: '0 5px', minWidth: 16, textAlign: 'center' }}>{count}</span>}
          <ChevronDown size={12} />
        </button>
      </PopoverTrigger>
      {children}
    </Popover>
  );

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      padding: '8px 16px', borderBottom: '0.75px solid rgba(15,23,42,0.06)',
      background: '#FFFFFF', flexShrink: 0,
    }}>
      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, width: 240, height: 32,
          padding: '0 8px', background: '#F1F5F9', borderRadius: 4,
          border: '1px solid transparent',
        }}>
          <Search size={14} style={{ color: '#94A3B8', flexShrink: 0 }} />
          <input
            value={searchValue}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search work items..."
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: '#0F172A', fontFamily: 'Inter, sans-serif' }}
          />
          {searchValue && (
            <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={12} color="#94A3B8" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <WorkHubColumnFilter
          values={uniqueStatuses}
          selected={filters.statuses as string[] || []}
          onApply={sel => onFiltersChange({ ...filters, statuses: sel as any })}
          trigger={
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
              border: (filters.statuses?.length || 0) > 0 ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
              borderRadius: 4, background: (filters.statuses?.length || 0) > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
              fontSize: 12, fontWeight: 500, color: (filters.statuses?.length || 0) > 0 ? '#2563EB' : '#334155', cursor: 'pointer',
            }}>
              Status {(filters.statuses?.length || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#2563EB', color: 'white', borderRadius: 10, padding: '0 5px' }}>{filters.statuses?.length}</span>}
              <ChevronDown size={12} />
            </button>
          }
        />

        {/* Type Filter */}
        <WorkHubColumnFilter
          values={uniqueTypes}
          selected={filters.types as string[] || []}
          onApply={sel => onFiltersChange({ ...filters, types: sel as any })}
          trigger={
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
              border: (filters.types?.length || 0) > 0 ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
              borderRadius: 4, background: (filters.types?.length || 0) > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
              fontSize: 12, fontWeight: 500, color: (filters.types?.length || 0) > 0 ? '#2563EB' : '#334155', cursor: 'pointer',
            }}>
              Type {(filters.types?.length || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#2563EB', color: 'white', borderRadius: 10, padding: '0 5px' }}>{filters.types?.length}</span>}
              <ChevronDown size={12} />
            </button>
          }
        />

        {/* Priority Filter */}
        <WorkHubColumnFilter
          values={uniquePriorities}
          selected={filters.priorities as string[] || []}
          onApply={sel => onFiltersChange({ ...filters, priorities: sel as any })}
          trigger={
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
              border: (filters.priorities?.length || 0) > 0 ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.12)',
              borderRadius: 4, background: (filters.priorities?.length || 0) > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
              fontSize: 12, fontWeight: 500, color: (filters.priorities?.length || 0) > 0 ? '#2563EB' : '#334155', cursor: 'pointer',
            }}>
              Priority {(filters.priorities?.length || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: '#2563EB', color: 'white', borderRadius: 10, padding: '0 5px' }}>{filters.priorities?.length}</span>}
              <ChevronDown size={12} />
            </button>
          }
        />

        {activeFilterCount > 0 && (
          <button onClick={() => onFiltersChange({ statuses: [], types: [], priorities: [], assignee_ids: [], has_due_date: null, search_query: '' })}
            style={{ fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
            Clear all
          </button>
        )}
      </div>

      {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Group By */}
        <Popover>
          <PopoverTrigger asChild>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 32, padding: '0 10px',
              border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4, background: 'transparent',
              fontSize: 12, fontWeight: 500, color: '#334155', cursor: 'pointer',
            }}>
              Group: {GROUP_OPTIONS.find(g => g.value === groupBy)?.label || 'Status'}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" style={{ width: 160, padding: '4px 0', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 6, zIndex: 9999 }}>
            {GROUP_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => onGroupByChange(opt.value)}
                style={{
                  width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                  background: groupBy === opt.value ? 'rgba(37,99,235,0.08)' : 'transparent',
                  color: groupBy === opt.value ? '#2563EB' : '#0F172A', cursor: 'pointer', fontWeight: groupBy === opt.value ? 600 : 400,
                }}>
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* View Switcher */}
        <div style={{ display: 'flex', border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4, overflow: 'hidden' }}>
          {([
            { mode: 'list' as ViewMode, icon: LayoutList },
            { mode: 'backlog' as ViewMode, icon: Table2 },
          ]).map(({ mode, icon: Icon }) => (
            <button key={mode} onClick={() => onViewModeChange(mode)}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                background: viewMode === mode ? 'rgba(37,99,235,0.08)' : 'transparent',
                color: viewMode === mode ? '#2563EB' : '#64748B',
              }}>
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Create */}
        <button onClick={onCreateClick} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
          background: '#2563EB', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={16} /> Create Item
        </button>
      </div>
    </div>
  );
}
