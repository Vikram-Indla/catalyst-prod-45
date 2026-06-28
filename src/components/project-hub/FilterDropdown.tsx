import { useEffect, useRef, useState } from 'react';
import { Filter, X, Check } from '@/lib/atlaskit-icons';
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
        className={`flex items-center gap-1.5 rounded-[6px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ds-text-brand,var(--cp-workstream-catalyst-primary, #2563EB))] ${
          hasFilters
            ? dark ? 'bg-[var(--ds-text, #172B4D)] border-[var(--ds-text, #172B4D)] text-[var(--ds-background-information-bold, #0C66E4)]' : 'bg-[var(--ds-background-information, #E9F2FF)] border-[var(--ds-background-information, #E9F2FF)] text-[var(--cp-primary-60, #0052CC)]'
            : dark ? 'bg-transparent border-[var(--ds-border,var(--cp-ink-1, #2E2E2E))] text-[var(--ds-text-subtlest,#A1A1A1)]' : 'bg-white border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))] text-[var(--ds-text-subtle, #42526E)]'
        }`}
        style={{
          height: 32,
          padding: '0 12px',
          borderWidth: 1,
          borderStyle: 'solid',
          fontSize: 'var(--ds-font-size-300)',
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
            style={{ width: 18, height: 18, backgroundColor: 'var(--cp-primary-60, #0052CC)', color: 'var(--ds-surface, #FFF)', fontSize: 'var(--ds-font-size-50)', fontWeight: 600 }}
          >
            {filters.statuses.length + filters.healths.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full left-0 mt-1 z-50 ${dark ? 'bg-[var(--ds-surface-raised,var(--cp-ink-1, #1A1A1A))] border-[var(--ds-border,var(--cp-ink-1, #2E2E2E))]' : 'bg-white border-[var(--ds-border,var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))]'}`}
          style={{
            width: 280,
            borderRadius: 8,
            borderWidth: 1,
            borderStyle: 'solid',
            boxShadow: dark ? '0 2px 8px var(--ds-shadow-raised, rgba(0,0,0,0.4))' : '0 4px 6px -1px var(--ds-shadow-raised, rgba(0,0,0,.07)), 0 2px 4px -2px var(--ds-shadow-raised, rgba(0,0,0,.05))',
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

          <div className="flex items-center justify-between px-3 py-2" style={{ borderTop: `1px solid ${dark ? 'var(--ds-border, var(--cp-ink-1, #2E2E2E))' : 'var(--ds-border, var(--cp-border, var(--cp-bg-sunken, #E2E8F0)))'}` }}>
            <button
              onClick={() => onChange({ statuses: [], healths: [] })}
              style={{ fontSize: 'var(--ds-font-size-200)', color: dark ? 'var(--ds-text-subtlest, #626F86)' : 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              Clear all
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{
                height: 28,
                padding: '0 12px',
                color: 'var(--ds-surface, #FFF)',
                backgroundColor: 'var(--cp-primary-60, #0052CC)',
                border: 'none',
                borderRadius: 6,
                fontSize: 'var(--ds-font-size-200)',
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
    <div className="px-3 py-2" style={{ borderBottom: `1px solid ${dark ? 'var(--ds-border, var(--cp-ink-1, #292929))' : 'var(--ds-border, #DFE1E6)'}` }}>
      <div
        style={{
          fontSize: 'var(--ds-font-size-50)',
          fontWeight: 600,
          color: dark ? 'var(--ds-text-subtlest, #626F86)' : 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))',
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
            className={`flex items-center gap-2 w-full py-1.5 cursor-pointer rounded px-2 transition-colors ${dark ? 'hover:bg-[var(--ds-surface-overlay,#1F1F1F)]' : 'hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken, #F4F5F7))]'}`}
            style={{ fontSize: 'var(--ds-font-size-200)', color: dark ? 'var(--ds-text, var(--cp-bg-neutral, #EDEDED))' : 'var(--ds-text-subtle, #42526E)', background: 'transparent', border: 'none', fontFamily: 'var(--cp-font-body)', textAlign: 'left' }}
          >
            <div
              className="flex items-center justify-center rounded flex-shrink-0"
              style={{
                width: 16,
                height: 16,
                borderRadius: 3,
                border: checked ? 'none' : `1.5px solid ${dark ? 'var(--ds-border-bold, #454545)' : 'var(--ds-border-disabled, #C1C7D0)'}`,
                backgroundColor: checked ? 'var(--cp-primary-60, #0052CC)' : 'transparent',
              }}
            >
              {checked && <Check size={11} color="var(--cp-bg-elevated, var(--cp-bg-elevated, var(--cp-bg-elevated, #ffffff)))" strokeWidth={3} />}
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
          className={`inline-flex items-center gap-1 rounded-full ${dark ? 'bg-[var(--ds-text, #172B4D)] text-[var(--ds-background-information-bold, #0C66E4)]' : 'bg-[var(--ds-background-information, #E9F2FF)] text-[var(--cp-primary-60, #0052CC)]'}`}
          style={{
            fontSize: 'var(--ds-font-size-100)',
            fontWeight: 500,
            padding: '2px 8px 2px 10px',
          }}
        >
          {c.label}
          <button
            onClick={c.remove}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}
          >
            <X size={12} color={dark ? 'var(--ds-background-information-bold, #0C66E4)' : 'var(--cp-primary-60, #0052CC)'} />
          </button>
        </span>
      ))}
      <button
        onClick={() => onChange({ statuses: [], healths: [] })}
        style={{ fontSize: 'var(--ds-font-size-100)', color: dark ? 'var(--ds-text-subtlest, #626F86)' : 'var(--ds-text-subtlest, var(--cp-text-secondary, #6B778C))', background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        Clear all
      </button>
    </div>
  );
}
