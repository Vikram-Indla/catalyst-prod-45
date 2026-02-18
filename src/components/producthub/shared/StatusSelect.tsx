import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'new_demand', label: 'New Demand', color: '#3b82f6' },
  { value: 'under_review', label: 'Under Review', color: '#8b5cf6' },
  { value: 'approved', label: 'Approved', color: '#22c55e' },
  { value: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { value: 'on_hold', label: 'On Hold', color: '#6b7280' },
  { value: 'delivered', label: 'Delivered', color: '#10b981' },
  { value: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

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

  const selected = STATUS_OPTIONS.find(s => s.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900 hover:border-zinc-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selected?.color || '#6b7280' }} />
          {selected?.label || 'Select status'}
        </span>
        <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-zinc-200 rounded-lg shadow-lg py-1 max-h-64 overflow-y-auto">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`w-full px-3 py-2 flex items-center gap-2 text-sm transition-colors text-left ${
                value === option.value
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: option.color }} />
              <span className="flex-1">{option.label}</span>
              {value === option.value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
