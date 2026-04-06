import { useEffect, useRef, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface FilterState {
  statuses: string[];
  healths: string[];
}

const STATUS_OPTIONS = ['active', 'on_hold', 'completed', 'archived'];
const HEALTH_OPTIONS = ['on_track', 'at_risk', 'off_track'];

interface FilterDropdownProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
}

export function FilterDropdown({ filters, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { isDark: dark } = useTheme();
  

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

  const hasFilters = filters.statuses.length + filters.healths.length > 0;

  const toggle = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-md transition-colors ${
          hasFilters
            ? 'bg-[var(--cp-blue-wash)] dark:bg-[rgba(37,99,235,0.15)] border-[var(--cp-blue)] text-[var(--cp-blue)] dark:text-[var(--cp-blue-light)]'
            : 'bg-[var(--bg-app)] dark:bg-transparent border-[var(--divider)] dark:border-[rgba(255,255,255,0.12)] text-[var(--fg-2)] dark:text-[rgba(255,255,255,0.72)]'
        }`}
        style={{
          height: 34,
          padding: '8px 12px',
          borderWidth: 1,
          borderStyle: 'solid',
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
            className="flex items-center justify-center rounded-full bg-[var(--cp-blue)]"
            style={{ width: 18, height: 18, color: '#FFF', fontSize: 10, fontWeight: 600 }}
          >
            {filters.statuses.length + filters.healths.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1 z-50 bg-[var(--bg-app)] dark:bg-[#1A1A1A] border border-[var(--divider)] dark:border-[rgba(255,255,255,0.12)]"
          style={{
            width: 280,
            borderRadius: 8,
            boxShadow: dark ? 'none' : '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <div className="max-h-[400px] overflow-y-auto">
            <FilterSection
              title="Status"
              options={STATUS_OPTIONS}
              selected={filters.statuses}
              onToggle={v => onChange({ ...filters, statuses: toggle(filters.statuses, v) })}
              formatLabel={formatStatusLabel}
              dark={dark}
            />
            <FilterSection
              title="Health"
              options={HEALTH_OPTIONS}
              selected={filters.healths}
              onToggle={v => onChange({ ...filters, healths: toggle(filters.healths, v) })}
              formatLabel={formatHealthLabel}
              dark={dark}
            />
          </div>

          <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'var(--divider)'}` }}>
            <button
              onClick={() => onChange({ statuses: [], healths: [] })}
              style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.50)' : 'var(--fg-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md bg-[var(--cp-blue)]"
              style={{
                height: 28,
                padding: '8px 12px',
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
  dark,
}: {
  title: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  formatLabel?: (v: string) => string;
  dark: boolean;
}) {
  return (
    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'var(--cp-bd-zone)'}` }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: dark ? 'rgba(255,255,255,0.50)' : 'var(--fg-3)',
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
          className="flex items-center gap-2 py-1 cursor-pointer rounded px-1"
          style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--fg-2)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.04)' : 'var(--bg-1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; }}
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="rounded"
            style={{ accentColor: 'var(--cp-blue)' }}
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
  const { isDark: dark } = useTheme();
  
  const chips: { label: string; remove: () => void }[] = [];
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
          className="inline-flex items-center gap-1 rounded-full bg-[var(--cp-blue-wash)] dark:bg-[rgba(37,99,235,0.15)] text-[var(--cp-blue)] dark:text-[var(--cp-blue-light)]"
          style={{
            fontSize: 11,
            fontWeight: 500,
            padding: '2px 8px 2px 10px',
          }}
        >
          {c.label}
          <button
            onClick={c.remove}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <X size={12} color={dark ? 'var(--cp-blue-light)' : 'var(--cp-blue)'} />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ statuses: [], healths: [] })}
        style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.50)' : 'var(--fg-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        Clear all
      </button>
    </div>
  );
}
