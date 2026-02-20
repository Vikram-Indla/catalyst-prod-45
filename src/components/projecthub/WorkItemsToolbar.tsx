import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, X, ChevronDown, Download } from 'lucide-react';
import { AdvancedFilterPanel } from './AdvancedFilterPanel';

interface AssigneeInfo { name: string; color: string }

interface AdvancedFilters {
  statuses: string[];
  priorities: string[];
  types: string[];
  dueDate: 'all' | 'overdue' | 'this_week' | 'this_month';
}

type GroupByField = 'none' | 'status_name' | 'priority' | 'assignee_name' | 'type_name';

const GROUP_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status_name', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee_name', label: 'Assignee' },
  { value: 'type_name', label: 'Type' },
];

interface ColumnToggle { key: string; label: string; visible: boolean }

interface Props {
  search: string;
  onSearchChange: (v: string) => void;
  assignees: AssigneeInfo[];
  activeAssigneeFilters: Set<string>;
  onToggleAssigneeFilter: (name: string) => void;
  advancedFilters: AdvancedFilters;
  onAdvancedFiltersChange: (f: AdvancedFilters) => void;
  hasActiveFilters: boolean;
  filterCount: number;
  onClearAllFilters: () => void;
  uniqueStatuses: string[];
  uniquePriorities: string[];
  uniqueTypes: string[];
  groupBy: GroupByField;
  onGroupByChange: (g: GroupByField) => void;
  columnToggles: ColumnToggle[];
  onToggleColumn: (key: string) => void;
}

export function WorkItemsToolbar(props: Props) {
  const {
    search, onSearchChange,
    assignees, activeAssigneeFilters, onToggleAssigneeFilter,
    advancedFilters, onAdvancedFiltersChange, hasActiveFilters, filterCount, onClearAllFilters,
    uniqueStatuses, uniquePriorities, uniqueTypes,
    groupBy, onGroupByChange,
    columnToggles, onToggleColumn,
  } = props;

  const [filterOpen, setFilterOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [colOpen, setColOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
      if (colRef.current && !colRef.current.contains(e.target as Node)) setColOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shown = assignees.slice(0, 3);
  const extra = assignees.length - 3;

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      {/* Left */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
          <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="h-[30px] w-[160px] pl-8 pr-7 text-[11px] rounded-md border focus:outline-none focus:ring-1 focus:ring-[#2563EB] placeholder:text-[#94A3B8]"
            style={{ borderColor: '#E2E8F0', fontFamily: 'Inter, sans-serif' }}
          />
          {search && (
            <button onClick={() => onSearchChange('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={10} className="text-[#94A3B8]" />
            </button>
          )}
        </div>

        {/* Avatar stack */}
        <div className="flex items-center -space-x-1.5 ml-1">
          {shown.map((a, i) => {
            const isActive = activeAssigneeFilters.has(a.name);
            return (
              <button
                key={a.name}
                onClick={() => onToggleAssigneeFilter(a.name)}
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[8px] font-semibold text-white transition-all"
                style={{
                  backgroundColor: a.color, zIndex: 3 - i,
                  border: isActive ? '2px solid #2563EB' : '2px solid white',
                  boxShadow: isActive ? '0 0 0 2px rgba(37,99,235,0.3)' : undefined,
                }}
                title={a.name}
              >
                {a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </button>
            );
          })}
          {extra > 0 && (
            <div className="w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center text-[8px] font-semibold"
              style={{ background: '#E2E8F0', color: '#64748B', zIndex: 0 }}>
              +{extra}
            </div>
          )}
        </div>

        {/* Filter button */}
        <div ref={filterRef} className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="h-[30px] px-2.5 flex items-center gap-1.5 text-[11px] font-medium rounded-md border hover:bg-[#F1F5F9] transition-colors"
            style={{
              borderColor: hasActiveFilters ? '#2563EB' : '#E2E8F0',
              color: hasActiveFilters ? '#2563EB' : '#475569',
              background: hasActiveFilters ? '#EFF6FF' : undefined,
            }}
          >
            <Filter size={13} />
            Filter
            {hasActiveFilters && (
              <span className="w-4 h-4 rounded-full bg-[#2563EB] text-white text-[9px] flex items-center justify-center font-bold">
                {filterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <AdvancedFilterPanel
              filters={advancedFilters}
              onChange={onAdvancedFiltersChange}
              onApply={() => setFilterOpen(false)}
              onClear={() => { onClearAllFilters(); setFilterOpen(false); }}
              uniqueStatuses={uniqueStatuses}
              uniquePriorities={uniquePriorities}
              uniqueTypes={uniqueTypes}
            />
          )}
        </div>

        {/* Group */}
        <div ref={groupRef} className="relative">
          <button
            onClick={() => setGroupOpen(!groupOpen)}
            className="h-[30px] px-2.5 flex items-center gap-1.5 text-[11px] font-medium rounded-md border hover:bg-[#F1F5F9] transition-colors"
            style={{ borderColor: '#E2E8F0', color: '#475569' }}
          >
            Group: {GROUP_OPTIONS.find(o => o.value === groupBy)?.label}
            <ChevronDown size={11} />
          </button>
          {groupOpen && (
            <div className="absolute left-0 top-full mt-1 rounded-md py-1"
              style={{ width: 160, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}>
              {GROUP_OPTIONS.map(o => (
                <button key={o.value} onClick={() => { onGroupByChange(o.value); setGroupOpen(false); }}
                  className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#F8FAFC] flex items-center justify-between"
                  style={{ color: '#0F172A', fontWeight: groupBy === o.value ? 600 : 400 }}>
                  {o.label}
                  {groupBy === o.value && <span className="text-[#2563EB]">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Columns */}
        <div ref={colRef} className="relative">
          <button onClick={() => setColOpen(!colOpen)}
            className="h-[30px] w-[30px] flex items-center justify-center rounded-md border hover:bg-[#F1F5F9]"
            style={{ borderColor: '#E2E8F0', color: '#64748B' }} title="Columns">
            <SlidersHorizontal size={14} />
          </button>
          {colOpen && (
            <div className="absolute right-0 top-full mt-1 rounded-lg py-2 max-h-[400px] overflow-y-auto"
              style={{ width: 200, background: '#FFF', border: '1px solid #E2E8F0', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase" style={{ color: '#94A3B8', letterSpacing: '0.06em' }}>Columns</div>
              {columnToggles.map(col => (
                <label key={col.key} className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[#F8FAFC]">
                  <input type="checkbox" checked={col.visible} onChange={() => onToggleColumn(col.key)} className="w-3.5 h-3.5 rounded accent-[#2563EB]" />
                  <span className="text-[11px]" style={{ color: '#334155' }}>{col.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Export placeholder */}
        <button className="h-[30px] w-[30px] flex items-center justify-center rounded-md border hover:bg-[#F1F5F9]"
          style={{ borderColor: '#E2E8F0', color: '#64748B' }} title="Export">
          <Download size={14} />
        </button>
      </div>
    </div>
  );
}
