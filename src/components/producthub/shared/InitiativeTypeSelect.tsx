import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const TYPE_OPTIONS = [
  { key: 'project', label: 'Project' },
  { key: 'enhancement', label: 'Enhancement' },
  { key: 'improvement', label: 'Improvement' },
  { key: 'entity_integration', label: 'Entity Integration' },
];

interface InitiativeTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function InitiativeTypeSelect({ value, onChange, disabled }: InitiativeTypeSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = TYPE_OPTIONS.find(t => t.key === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          borderColor: open ? 'var(--cp-blue)' : 'var(--divider)',
          boxShadow: open ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
          color: selected ? '#09090B' : '#71717A',
          fontWeight: 500,
          fontFamily: "'Inter',-apple-system,system-ui,sans-serif",
        }}
      >
        <span>{selected?.label || 'Select type'}</span>
        <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#71717A' }} />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full bg-white border overflow-hidden py-1"
          style={{
            borderColor: 'var(--divider)',
            borderRadius: 8,
            boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
          }}
        >
          {TYPE_OPTIONS.map(option => (
            <button
              key={option.key}
              type="button"
              onClick={() => { onChange(option.key); setOpen(false); }}
              className="w-full flex items-center gap-2 text-left transition-colors"
              style={{
                padding: '7px 12px',
                fontSize: 13,
                fontWeight: value === option.key ? 600 : 500,
                color: value === option.key ? 'var(--cp-blue)' : '#09090B',
                background: value === option.key ? 'var(--cp-blue-wash)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              onMouseEnter={e => {
                if (value !== option.key) (e.currentTarget as HTMLElement).style.background = 'var(--bg-1, #1A1A1A)';
              }}
              onMouseLeave={e => {
                if (value !== option.key) (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <span className="flex-1">{option.label}</span>
              {value === option.key && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--cp-blue)' }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
