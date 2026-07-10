import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from '@/lib/atlaskit-icons';

const STATUS_GROUPS = [
  {
    group: 'Intake',
    items: [
      { value: 'new', label: 'New', color: 'var(--ds-text-brand, var(--cp-workstream-catalyst-primary))' },
      { value: 'portfolio_review', label: 'Portfolio Review', color: 'var(--ds-text-warning, var(--cp-warning))' },
      { value: 'technical_validation', label: 'Technical Validation', color: 'var(--ds-text-warning, var(--cp-warning))' },
      { value: 'estimate', label: 'Estimate', color: 'var(--ds-text-warning, var(--cp-warning))' },
    ],
  },
  {
    group: 'Planning',
    items: [
      { value: 'demand_approved', label: 'Demand Approved', color: 'var(--ds-text-success, var(--cp-success))' },
      { value: 'analysis', label: 'Analysis', color: 'var(--ds-text-success, var(--cp-success))' },
      { value: 'ready_for_development', label: 'Ready for Dev', color: 'var(--ds-text-success, var(--cp-success))' },
    ],
  },
  {
    group: 'Execution',
    items: [
      { value: 'under_implementation', label: 'Under Implementation', color: 'var(--cp-teal-60)' },
      { value: 'on_hold', label: 'On Hold', color: 'var(--ds-text-subtlest)' },
      { value: 'implementation_review', label: 'Implementation Review', color: 'var(--cp-teal-60)' },
    ],
  },
  {
    group: 'Closure',
    items: [
      { value: 'in_support', label: 'In Support', color: 'var(--cp-purple-60)' },
      { value: 'done', label: 'Done', color: 'var(--ds-text-success, var(--cp-success))' },
      { value: 'cancelled', label: 'Cancelled', color: 'var(--ds-text-danger, var(--cp-danger))' },
    ],
  },
];

const ALL_STATUSES = STATUS_GROUPS.flatMap(g => g.items);

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = ALL_STATUSES.find(s => s.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: open ? 'var(--cp-blue)' : 'var(--divider)',
          boxShadow: open ? '0 0 0 3px var(--ds-background-information)' : 'none',
          color: selected ? 'var(--ds-text)' : 'var(--ds-text-subtlest)',
          fontWeight: 500,
          fontFamily: 'var(--cp-font-body)',
        }}
      >
        <span className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: selected?.color || 'var(--ds-text-subtlest)' }}
          />
          {selected?.label || 'Select status'}
        </span>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--ds-text-subtlest)' }} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white dark:bg-[var(--ds-surface-raised,var(--cp-ink-1))] border dark:border-[var(--ds-border,var(--cp-ink-1))] rounded-lg overflow-hidden max-h-72 overflow-y-auto"
          style={{
            borderColor: 'var(--divider)',
            boxShadow: '0 12px 40px var(--ds-shadow-raised)',
            borderRadius: 8,
          }}
        >
          {STATUS_GROUPS.map((group, gi) => (
            <div key={group.group}>
              {gi > 0 && <div style={{ borderTop: '1px solid var(--divider)' }} />}
              <div
                style={{
                  padding: '8px 12px 4px',
                  fontSize: 'var(--ds-font-size-50)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--cp-blue)',
                }}
              >
                {group.group}
              </div>
              {group.items.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => { onChange(option.value); setOpen(false); }}
                  className="w-full flex items-center gap-2 text-left transition-colors"
                  style={{
                    padding: '8px 12px',
                    fontSize: 'var(--ds-font-size-300)',
                    fontWeight: value === option.value ? 600 : 500,
                    color: value === option.value ? 'var(--cp-blue)' : 'var(--ds-text)',
                    background: value === option.value ? 'var(--cp-blue-wash)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    if (value !== option.value) (e.currentTarget as HTMLElement).style.background = 'var(--bg-1)';
                  }}
                  onMouseLeave={e => {
                    if (value !== option.value) (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                  <span className="flex-1">{option.label}</span>
                  {value === option.value && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cp-blue)' }} />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
