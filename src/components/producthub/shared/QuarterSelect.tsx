import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Calendar } from 'lucide-react';

const QUARTER_GROUPS = [
  { group: '2025', items: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'] },
  { group: '2026', items: ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'] },
  { group: '2027', items: ['Q1 2027', 'Q2 2027', 'Q3 2027', 'Q4 2027'] },
];

interface QuarterSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function QuarterSelect({ value, onChange, disabled }: QuarterSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border border-zinc-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] rounded-lg text-sm text-zinc-900 dark:text-[var(--ds-text,var(--ds-text, #EDEDED))] hover:border-zinc-300 dark:hover:border-[var(--ds-border-bold,var(--ds-border-bold, #454545))] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
          {value || 'Select quarter'}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-[var(--ds-surface-raised,var(--ds-surface-raised, #1A1A1A))] border border-zinc-200 dark:border-[var(--ds-border,var(--ds-border, #2E2E2E))] rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
          {/* Clear option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className="w-full px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-50 text-left italic"
          >
            Clear selection
          </button>
          {QUARTER_GROUPS.map((group, gi) => (
            <div key={group.group}>
              {gi > 0 && <div className="border-t border-zinc-100 my-1" />}
              <div className="px-3 py-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                {group.group}
              </div>
              {group.items.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => { onChange(item); setOpen(false); }}
                  className={`w-full px-3 py-2 pl-6 flex items-center justify-between text-sm transition-colors text-left ${
                    value === item
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {item}
                  {value === item && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
