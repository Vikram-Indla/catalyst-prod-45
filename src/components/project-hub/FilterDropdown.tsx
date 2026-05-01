import { useEffect, useRef, useState } from 'react';
import { Filter, X, Check } from 'lucide-react';
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
        className={`flex items-center gap-1.5 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
          hasFilters
            ? dark ? 'bg-[#0D1526] border-[#1E3A5F] text-[#4C9AFF]' : 'bg-[#DEEBFF] border-[#B3D4FF] text-[#0052CC]'
            : dark ? 'bg-transparent border-[#2E2E2E] text-[#A1A1A1]' : 'bg-white border-[#E2E8F0] text-[#42526E]'
        }`}
        style={{
          height: 32,
          padding: '0 12px',
          borderWidth: 1,
          borderStyle: 'solid',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        <Filter size={14} strokeWidth={2} />
        Filter
        {hasFilters && (
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 18, height: 18, backgroundColor: '#0052CC', color: '#FFF', fontSize: 10, fontWeight: 600 }}
          >
            {filters.statuses.length + filters.healths.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-1 z-50 ${dark ? 'bg-[#1A1A1A] border-[#2E2E2E]' : 'bg-white border-[#E2E8F0]'}`}
          style={{
            width: 280,
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: 'solid',
            boxShadow: dark ? '0 2px 8px rgba(0,0,0,0.4)' : '0 4px 6px -1px rgba(0,0,0,.07), 0 2px 4px -2px rgba(0,0,0,.05)',
            fontFamily: 'var(--cp-font-body)',
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

          <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${dark ? '#2E2E2E' : '#E2E8F0'}` }}>
            <button
              onClick={() => onChange({ statuses: [], healths: [] })}
              style={{ fontSize: 12, color: dark ? '#7D7D7D' : '#6B778C', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                height: 28,
                padding: '0 12px',
                color: '#FFF',
                backgroundColor: '#0052CC',
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
    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${dark ? '#292929' : '#EBECF0'}` }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: dark ? '#7D7D7D' : '#6B778C',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      {options.map(opt => {
        const checked = selected.includes(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={`flex items-center gap-2 w-full py-1.5 cursor-pointer rounded px-2 transition-colors ${dark ? 'hover:bg-[#1F1F1F]' : 'hover:bg-[#F4F5F7]'}`}
            style={{ fontSize: 12, color: dark ? '#EDEDED' : '#42526E', background: 'transparent', border: 'none', fontFamily: 'var(--cp-font-body)', textAlign: 'left' }}
          >
            <div
              className="flex items-center justify-center rounded flex-shrink-0"
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                border: checked ? 'none' : `1.5px solid ${dark ? '#454545' : '#C1C7D0'}`,
                backgroundColor: checked ? '#0052CC' : 'transparent',
              }}
            >
              {checked && <Check size={11} color="var(--ds-text-inverse, #FFFFFF)" strokeWidth={3} />}
            </div>
            {formatLabel ? formatLabel(opt) : opt}
          </button>
        );
      })}
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
          className={`inline-flex items-center gap-1 rounded-full ${dark ? 'bg-[#0D1526] text-[#4C9AFF]' : 'bg-[#DEEBFF] text-[#0052CC]'}`}
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
            <X size={12} color={dark ? '#4C9AFF' : '#0052CC'} />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ statuses: [], healths: [] })}
        style={{ fontSize: 11, color: dark ? '#7D7D7D' : '#6B778C', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        Clear all
      </button>
    </div>
  );
}
