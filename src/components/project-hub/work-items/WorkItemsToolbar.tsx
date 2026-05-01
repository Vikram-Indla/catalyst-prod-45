import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, X, ChevronDown, GripVertical } from 'lucide-react';
import type { FilterState, GroupByField, ColumnDef, SortColumn } from '@/hooks/useWorkItemListState';

// ─── Types ────────────────────────────────────────────────
interface WorkItemsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  totalCount: number;
  // Assignees
  assignees: { name: string; color: string }[];
  activeAssigneeFilters: Set<string>;
  onToggleAssigneeFilter: (name: string) => void;
  // Filters
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  hasActiveFilters: boolean;
  activeFilterChips: { key: string; label: string; value: string; remove: () => void }[];
  onClearAllFilters: () => void;
  // Filter options
  uniqueStatuses: string[];
  uniquePriorities: string[];
  uniqueTypes: string[];
  uniqueAssignees: string[];
  // Grouping
  groupBy: GroupByField;
  onGroupByChange: (g: GroupByField) => void;
  // Column settings
  columns: ColumnDef[];
  onColumnsChange: (cols: ColumnDef[]) => void;
}

const GROUP_OPTIONS: { value: GroupByField; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status_name', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'assignee_name', label: 'Assignee' },
  { value: 'type_name', label: 'Type' },
];

export function WorkItemsToolbar(props: WorkItemsToolbarProps) {
  const {
    search, onSearchChange, totalCount,
    assignees, activeAssigneeFilters, onToggleAssigneeFilter,
    filters, onFiltersChange, hasActiveFilters, activeFilterChips, onClearAllFilters,
    uniqueStatuses, uniquePriorities, uniqueTypes, uniqueAssignees,
    groupBy, onGroupByChange,
    columns, onColumnsChange,
  } = props;

  const [filterOpen, setFilterOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [colSettingsOpen, setColSettingsOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const colRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
      if (colRef.current && !colRef.current.contains(e.target as Node)) setColSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shown = assignees.slice(0, 3);
  const extra = assignees.length - 3;

  return (
    <div className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center justify-between gap-3">
        {/* Left cluster */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--ds-text-subtlest, #94A3B8)]" />
            <input
              type="text"
              placeholder="Search list"
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="h-[30px] w-[160px] pl-8 pr-7 text-[11px] rounded-md border focus:outline-none focus:ring-1 focus:ring-[var(--ds-text-brand, #2563EB)] placeholder:text-[var(--ds-text-subtlest, #94A3B8)]"
              style={{ borderColor: 'var(--divider)', fontFamily: 'var(--cp-font-body)' }}
            />
            {search && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded-full hover:bg-[var(--ds-surface-sunken, #F1F5F9)]"
              >
                <X size={10} className="text-[var(--ds-text-subtlest, #94A3B8)]" />
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
                    backgroundColor: a.color,
                    zIndex: 3 - i,
                    border: isActive ? '2px solid var(--cp-blue)' : '2px solid white',
                    boxShadow: isActive ? '0 0 0 2px rgba(37,99,235,0.3)' : undefined,
                  }}
                  title={a.name}
                >
                  {a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </button>
              );
            })}
            {extra > 0 && (
              <div
                className="w-[22px] h-[22px] rounded-full border-2 border-white flex items-center justify-center text-[8px] font-semibold bg-[var(--divider)]"
                style={{ color: 'var(--fg-3)', zIndex: 0 }}
              >
                +{extra}
              </div>
            )}
          </div>

          {/* Filter button */}
          <div ref={filterRef} className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={`h-[30px] px-2.5 flex items-center gap-1.5 text-[11px] font-medium rounded-md border hover:bg-[var(--ds-surface-sunken, #F1F5F9)] transition-colors ${hasActiveFilters ? 'bg-[var(--cp-blue-wash)]' : ''}`}
              style={{
                borderColor: hasActiveFilters ? 'var(--cp-blue)' : 'var(--divider)',
                color: hasActiveFilters ? 'var(--cp-blue)' : 'var(--fg-2)',
                fontFamily: 'var(--cp-font-body)',
              }}
            >
              <Filter size={13} />
              Filter
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-[var(--ds-text-brand, #2563EB)] text-white text-[9px] flex items-center justify-center font-bold">
                  {activeFilterChips.length}
                </span>
              )}
            </button>
            {filterOpen && (
              <FilterDropdown
                filters={filters}
                onChange={onFiltersChange}
                statuses={uniqueStatuses}
                priorities={uniquePriorities}
                types={uniqueTypes}
                assignees={uniqueAssignees}
              />
            )}
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {/* Group by */}
          <div ref={groupRef} className="relative">
            <button
              onClick={() => setGroupOpen(!groupOpen)}
              className="h-[30px] px-2.5 flex items-center gap-1.5 text-[11px] font-medium rounded-md border hover:bg-[var(--ds-surface-sunken, #F1F5F9)] transition-colors"
              style={{ borderColor: 'var(--divider)', color: 'var(--fg-2)', fontFamily: 'var(--cp-font-body)' }}
            >
              Group: {GROUP_OPTIONS.find(o => o.value === groupBy)?.label}
              <ChevronDown size={11} />
            </button>
            {groupOpen && (
              <div
                className="absolute right-0 top-full mt-1 rounded-md py-1 bg-[var(--cp-float)]"
                style={{ width: 160, border: '1px solid var(--divider)', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}
              >
                {GROUP_OPTIONS.map(o => (
                  <button
                    key={o.value}
                    onClick={() => { onGroupByChange(o.value); setGroupOpen(false); }}
                    className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-[var(--ds-surface-sunken, #F8FAFC)] transition-colors flex items-center justify-between"
                    style={{ color: 'var(--fg-1)', fontWeight: groupBy === o.value ? 600 : 400 }}
                  >
                    {o.label}
                    {groupBy === o.value && <span className="text-[var(--ds-text-brand, #2563EB)]">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Column settings */}
          <div ref={colRef} className="relative">
            <button
              onClick={() => setColSettingsOpen(!colSettingsOpen)}
              className="h-[30px] w-[30px] flex items-center justify-center rounded-md border hover:bg-[var(--ds-surface-sunken, #F1F5F9)] transition-colors"
              style={{ borderColor: 'var(--divider)', color: 'var(--fg-3)' }}
              title="Column settings"
            >
              <SlidersHorizontal size={14} />
            </button>
            {colSettingsOpen && (
              <ColumnSettingsDropdown columns={columns} onChange={onColumnsChange} />
            )}
          </div>
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {activeFilterChips.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--cp-blue-wash)]"
              style={{ color: 'var(--cp-blue)', border: '1px solid var(--cp-primary-20)' }}
            >
              {chip.label}: {chip.value}
              <button onClick={chip.remove} className="hover:text-[var(--ds-text-danger, #DC2626)]"><X size={9} /></button>
            </span>
          ))}
          <button
            onClick={onClearAllFilters}
            className="text-[10px] font-medium px-1.5 py-0.5 hover:underline"
            style={{ color: 'var(--fg-3)' }}
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Filter Dropdown ──────────────────────────────────────
function FilterDropdown({ filters, onChange, statuses, priorities, types, assignees }: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  statuses: string[];
  priorities: string[];
  types: string[];
  assignees: string[];
}) {
  const toggleArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  return (
    <div
      className="absolute left-0 top-full mt-1 rounded-lg overflow-y-auto bg-[var(--cp-float)]"
      style={{ width: 240, maxHeight: 420, border: '1px solid var(--divider)', boxShadow: '0 12px 32px rgba(0,0,0,0.15)', zIndex: 9999 }}
    >
      {/* Status */}
      <FilterSection title="Status">
        {statuses.map(s => (
          <CheckboxItem key={s} label={s} checked={filters.statuses.includes(s)}
            onChange={() => onChange({ ...filters, statuses: toggleArray(filters.statuses, s) })} />
        ))}
      </FilterSection>

      {/* Priority */}
      <FilterSection title="Priority">
        {priorities.map(p => (
          <CheckboxItem key={p} label={p} checked={filters.priorities.includes(p)}
            onChange={() => onChange({ ...filters, priorities: toggleArray(filters.priorities, p) })} />
        ))}
      </FilterSection>

      {/* Type */}
      <FilterSection title="Type">
        {types.map(t => (
          <CheckboxItem key={t} label={t} checked={filters.types.includes(t)}
            onChange={() => onChange({ ...filters, types: toggleArray(filters.types, t) })} />
        ))}
      </FilterSection>

      {/* Assignee */}
      <FilterSection title="Assignee">
        {assignees.map(a => (
          <CheckboxItem key={a} label={a} checked={filters.assignees.includes(a)}
            onChange={() => onChange({ ...filters, assignees: toggleArray(filters.assignees, a) })} />
        ))}
      </FilterSection>

      {/* Flagged */}
      <FilterSection title="Flagged">
        {(['any', 'yes', 'no'] as const).map(v => (
          <label key={v} className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-[var(--ds-surface-sunken, #F8FAFC)]">
            <input
              type="radio"
              name="flagged"
              checked={filters.flagged === v}
              onChange={() => onChange({ ...filters, flagged: v })}
              className="accent-[var(--ds-text-brand, #2563EB)]"
            />
            <span className="text-[11px] capitalize" style={{ color: 'var(--fg-2)' }}>{v}</span>
          </label>
        ))}
      </FilterSection>

      {/* Due date */}
      <FilterSection title="Due Date">
        {([
          { value: 'any', label: 'Any' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'this_week', label: 'This week' },
        ] as const).map(o => (
          <label key={o.value} className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-[var(--ds-surface-sunken, #F8FAFC)]">
            <input
              type="radio"
              name="dueDate"
              checked={filters.dueDate === o.value}
              onChange={() => onChange({ ...filters, dueDate: o.value })}
              className="accent-[var(--ds-text-brand, #2563EB)]"
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>{o.label}</span>
          </label>
        ))}
      </FilterSection>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: '1px solid var(--cp-bd-zone)' }}>
      <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase" style={{ color: 'var(--fg-4)', letterSpacing: '0.06em' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function CheckboxItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 px-3 py-1 cursor-pointer hover:bg-[var(--ds-surface-sunken, #F8FAFC)]">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand, #2563EB)]" />
      <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>{label}</span>
    </label>
  );
}

// ─── Column Settings Dropdown ──────────────────────────────
function ColumnSettingsDropdown({ columns, onChange }: { columns: ColumnDef[]; onChange: (c: ColumnDef[]) => void }) {
  const toggleable = columns.filter(c => c.key !== 'checkbox' && c.key !== 'summary');
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const toggleVisibility = (key: string) => {
    onChange(columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const newCols = [...columns];
    // Find actual indices in full columns array
    const fromKey = toggleable[dragIdx].key;
    const toKey = toggleable[idx].key;
    const fromIdx = newCols.findIndex(c => c.key === fromKey);
    const toIdx = newCols.findIndex(c => c.key === toKey);
    const [moved] = newCols.splice(fromIdx, 1);
    newCols.splice(toIdx, 0, moved);
    onChange(newCols);
    setDragIdx(idx);
  };

  return (
    <div
      className="absolute right-0 top-full mt-1 rounded-lg py-2 bg-[var(--cp-float)]"
      style={{ width: 200, border: '1px solid var(--divider)', boxShadow: '0 8px 20px rgba(0,0,0,0.12)', zIndex: 9999 }}
    >
      <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase" style={{ color: 'var(--fg-4)', letterSpacing: '0.06em' }}>
        Columns
      </div>
      {toggleable.map((col, i) => (
        <div
          key={col.key}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragOver={(e) => handleDragOver(e, i)}
          onDragEnd={() => setDragIdx(null)}
          className="flex items-center gap-2 px-3 py-1.5 cursor-move hover:bg-[var(--ds-surface-sunken, #F8FAFC)]"
        >
          <GripVertical size={11} className="text-[var(--ds-text-disabled, #CBD5E1)] shrink-0" />
          <label className="flex items-center gap-2 flex-1 cursor-pointer">
            <input
              type="checkbox"
              checked={col.visible}
              onChange={() => toggleVisibility(col.key)}
              className="w-3.5 h-3.5 rounded accent-[var(--ds-text-brand, #2563EB)]"
            />
            <span className="text-[11px]" style={{ color: 'var(--fg-2)' }}>{col.label || col.key}</span>
          </label>
        </div>
      ))}
    </div>
  );
}
