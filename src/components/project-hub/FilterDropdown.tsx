import { useEffect, useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';

export interface FilterState {
  departments: string[];
  statuses: string[];
  healths: string[];
}

const STATUS_OPTIONS = ['active', 'on_hold', 'completed', 'archived'];
const HEALTH_OPTIONS = ['on_track', 'at_risk', 'off_track'];

interface FilterDropdownProps {
  departments: string[];
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterDropdown({ departments, filters, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const hasFilters = filters.departments.length + filters.statuses.length + filters.healths.length > 0;

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md transition-colors hover:bg-[#F1F5F9]"
        style={{
          height: 34,
          padding: '0 12px',
          border: hasFilters ? '1px solid #2563EB' : '1px solid #E2E8F0',
          background: hasFilters ? '#EFF6FF' : '#FFFFFF',
          color: hasFilters ? '#2563EB' : '#334155',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Filter size={14} strokeWidth={2} />
        Filter
        {hasFilters && (
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 18, height: 18, background: '#2563EB', color: '#FFF', fontSize: 10, fontWeight: 600 }}
          >
            {filters.departments.length + filters.statuses.length + filters.healths.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50"
          style={{
            width: 280,
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div className="max-h-[400px] overflow-y-auto">
            {/* Department */}
            <FilterSection
              title="Department"
              options={departments}
              selected={filters.departments}
              onToggle={v => onChange({ ...filters, departments: toggle(filters.departments, v) })}
            />
            {/* Status */}
            <FilterSection
              title="Status"
              options={STATUS_OPTIONS}
              selected={filters.statuses}
              onToggle={v => onChange({ ...filters, statuses: toggle(filters.statuses, v) })}
              formatLabel={formatStatusLabel}
            />
            {/* Health */}
            <FilterSection
              title="Health"
              options={HEALTH_OPTIONS}
              selected={filters.healths}
              onToggle={v => onChange({ ...filters, healths: toggle(filters.healths, v) })}
              formatLabel={formatHealthLabel}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: '1px solid #E2E8F0' }}>
            <button
              onClick={() => onChange({ departments: [], statuses: [], healths: [] })}
              style={{ fontSize: 12, color: '#64748B', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md"
              style={{
                height: 28,
                padding: '0 12px',
                background: '#2563EB',
                color: '#FFF',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterSection({
  title,
  options,
  selected,
  onToggle,
  formatLabel,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  formatLabel?: (v: string) => string;
}) {
  return (
    <div className="px-3 py-2" style={{ borderBottom: '1px solid #F1F5F9' }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: '#64748B',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {options.map(opt => (
        <label
          key={opt}
          className="flex items-center gap-2 py-1 cursor-pointer hover:bg-[#F8FAFC] rounded px-1"
          style={{ fontSize: 12, color: '#334155' }}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="rounded"
            style={{ accentColor: '#2563EB' }}
          />
          {formatLabel ? formatLabel(opt) : opt}
        </label>
      ))}
    </div>
  );
}

function formatStatusLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function formatHealthLabel(s: string) {
  return s.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

export function FilterChips({
  filters,
  onChange,
}: {
  filters: FilterState;
  onChange: (f: FilterState) => void;
}) {
  const chips: { label: string; remove: () => void }[] = [];
  filters.departments.forEach(d =>
    chips.push({ label: d, remove: () => onChange({ ...filters, departments: filters.departments.filter(x => x !== d) }) })
  );
  filters.statuses.forEach(s =>
    chips.push({
      label: formatStatusLabel(s),
      remove: () => onChange({ ...filters, statuses: filters.statuses.filter(x => x !== s) }),
    })
  );
  filters.healths.forEach(h =>
    chips.push({
      label: formatHealthLabel(h),
      remove: () => onChange({ ...filters, healths: filters.healths.filter(x => x !== h) }),
    })
  );

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mt-2">
      {chips.map((c, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-full"
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 8px 2px 10px',
            background: '#EFF6FF',
            color: '#2563EB',
          }}
        >
          {c.label}
          <button
            onClick={c.remove}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <X size={12} color="#2563EB" />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ departments: [], statuses: [], healths: [] })}
        style={{ fontSize: 11, color: '#64748B', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        Clear all
      </button>
    </div>
  );
}
