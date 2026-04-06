/**
 * WorkHubToolbar — Filter bar, search, group-by, columns, view switch, + Create
 * Stage E: 48px height, Cmd+K search, column toggle popover
 */
import { useState, useCallback, useRef, useEffect, RefObject } from 'react';
import { Search, ChevronDown, Plus, Settings2, LayoutList, Table2, X, Eye, EyeOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { FilterConfig, GroupByField, ViewMode, ColumnConfig } from '@/types/workhub';
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
  columns?: ColumnConfig[];
  onColumnToggle?: (columnId: string) => void;
  searchRef?: RefObject<HTMLInputElement>;
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
  columns, onColumnToggle, searchRef: externalSearchRef,
}: WorkHubToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.search_query || '');
  const debounceRef = useRef<NodeJS.Timeout>();
  const internalSearchRef = useRef<HTMLInputElement>(null);
  const sRef = externalSearchRef || internalSearchRef;

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

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
      padding: '0 16px', height: 48, minHeight: 48,
      borderBottom: '0.75px solid var(--bd-subtle, #292929)',
      background: 'var(--bg-app)', flexShrink: 0,
    }} role="toolbar" aria-label="Work items toolbar">
      {/* LEFT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, width: 240, height: 32,
          padding: '0 8px', background: 'var(--bg-1)', borderRadius: 4,
        }}>
          <Search size={14} style={{ color: 'var(--fg-4)', flexShrink: 0 }} />
          <input
            ref={sRef as any}
            value={searchValue}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search work items..."
            aria-label="Search work items"
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: 13, color: 'var(--fg-1)', fontFamily: 'Inter, sans-serif' }}
          />
          {searchValue ? (
            <button onClick={() => handleSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }} aria-label="Clear search">
              <X size={12} color="#94A3B8" />
            </button>
          ) : (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--fg-4)', fontFamily: "'JetBrains Mono', monospace", background: 'var(--divider)', borderRadius: 4, padding: '1px 4px' }}>⌘K</span>
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
              border: (filters.statuses?.length || 0) > 0 ? '1px solid #2563EB' : '1px solid var(--bd-default, #2E2E2E)',
              borderRadius: 4, background: (filters.statuses?.length || 0) > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
              fontSize: 12, fontWeight: 500, color: (filters.statuses?.length || 0) > 0 ? 'var(--cp-blue)' : 'var(--fg-2)', cursor: 'pointer',
            }}>
              Status {(filters.statuses?.length || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--cp-blue)', color: 'var(--bg-app)', borderRadius: 12, padding: '0 5px' }}>{filters.statuses?.length}</span>}
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
              border: (filters.types?.length || 0) > 0 ? '1px solid #2563EB' : '1px solid var(--bd-default, #2E2E2E)',
              borderRadius: 4, background: (filters.types?.length || 0) > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
              fontSize: 12, fontWeight: 500, color: (filters.types?.length || 0) > 0 ? 'var(--cp-blue)' : 'var(--fg-2)', cursor: 'pointer',
            }}>
              Type {(filters.types?.length || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--cp-blue)', color: 'var(--bg-app)', borderRadius: 12, padding: '0 5px' }}>{filters.types?.length}</span>}
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
              border: (filters.priorities?.length || 0) > 0 ? '1px solid #2563EB' : '1px solid var(--bd-default, #2E2E2E)',
              borderRadius: 4, background: (filters.priorities?.length || 0) > 0 ? 'rgba(37,99,235,0.08)' : 'transparent',
              fontSize: 12, fontWeight: 500, color: (filters.priorities?.length || 0) > 0 ? 'var(--cp-blue)' : 'var(--fg-2)', cursor: 'pointer',
            }}>
              Priority {(filters.priorities?.length || 0) > 0 && <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--cp-blue)', color: 'var(--bg-app)', borderRadius: 12, padding: '0 5px' }}>{filters.priorities?.length}</span>}
              <ChevronDown size={12} />
            </button>
          }
        />

        {activeFilterCount > 0 && (
          <button onClick={() => onFiltersChange({ statuses: [], types: [], priorities: [], assignee_ids: [], has_due_date: null, search_query: '' })}
            style={{ fontSize: 11, color: 'var(--sem-danger)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
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
              border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 4, background: 'transparent',
              fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
            }}>
              Group: {GROUP_OPTIONS.find(g => g.value === groupBy)?.label || 'Status'}
              <ChevronDown size={12} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" style={{ width: 160, padding: '4px 0', background: 'var(--bg-app)', border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 6, zIndex: 9999 }}>
            {GROUP_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => onGroupByChange(opt.value)}
                style={{
                  width: '100%', padding: '6px 12px', fontSize: 13, border: 'none', textAlign: 'left',
                  background: groupBy === opt.value ? 'rgba(37,99,235,0.08)' : 'transparent',
                  color: groupBy === opt.value ? 'var(--cp-blue)' : 'var(--fg-1)', cursor: 'pointer', fontWeight: groupBy === opt.value ? 600 : 400,
                }}>
                {opt.label}
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {/* Column Toggle */}
        {columns && onColumnToggle && (
          <Popover>
            <PopoverTrigger asChild>
              <button style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 4, background: 'transparent', cursor: 'pointer' }} aria-label="Toggle columns">
                <Settings2 size={16} color="#64748B" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" style={{ width: 220, padding: '8px 0', background: 'var(--bg-app)', border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 6, zIndex: 9999 }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-4)', padding: '4px 12px 6px' }}>Columns</div>
              {columns.map(col => (
                <button key={col.id} onClick={() => onColumnToggle(col.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
                  border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--fg-1)', textAlign: 'left',
                }}>
                  {col.visible ? <Eye size={14} color="#2563EB" /> : <EyeOff size={14} color="#94A3B8" />}
                  <span style={{ color: col.visible ? 'var(--fg-1)' : 'var(--fg-4)' }}>{col.label}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        )}

        {/* View Switcher */}
        <div style={{ display: 'flex', border: '1px solid var(--bd-default, #2E2E2E)', borderRadius: 4, overflow: 'hidden' }}>
          {([
            { mode: 'list' as ViewMode, icon: LayoutList },
            { mode: 'backlog' as ViewMode, icon: Table2 },
          ]).map(({ mode, icon: Icon }) => (
            <button key={mode} onClick={() => onViewModeChange(mode)} aria-label={`${mode} view`} aria-pressed={viewMode === mode}
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', cursor: 'pointer',
                background: viewMode === mode ? 'rgba(37,99,235,0.08)' : 'transparent',
                color: viewMode === mode ? 'var(--cp-blue)' : 'var(--fg-3)',
              }}>
              <Icon size={16} />
            </button>
          ))}
        </div>

        {/* Create */}
        <button onClick={onCreateClick} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px',
          background: 'var(--cp-blue)', color: 'var(--bg-app)', border: 'none', borderRadius: 6, cursor: 'pointer',
          fontSize: 13, fontWeight: 600,
        }}>
          <Plus size={16} /> Create Item
        </button>
      </div>
    </div>
  );
}
