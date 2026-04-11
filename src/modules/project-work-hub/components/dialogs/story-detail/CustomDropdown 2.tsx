/**
 * CustomDropdown — shadcn-style dropdown (replaces native <select>)
 */
import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { V } from './tokens';

export function CustomDropdown({ value, options, onChange, placeholder = 'Select...' }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', padding: '8px 12px', fontSize: 13,
          border: `0.75px solid ${V.border}`, borderRadius: 4,
          background: V.white, color: V.textPrimary,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span>{selected?.label || placeholder}</span>
        <ChevronDown size={14} color={V.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: V.white, border: `0.75px solid ${V.border}`, borderRadius: 6,
          boxShadow: '0 8px 12px rgba(30,31,33,0.15), 0 0 1px rgba(30,31,33,0.31)',
          maxHeight: 240, overflowY: 'auto', marginTop: 4, padding: '4px 0',
        }}>
          {options.map(o => (
            <div
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              style={{
                padding: '8px 12px', fontSize: 13, cursor: 'pointer',
                background: o.value === value ? V.selectedRow : 'transparent',
                color: V.textPrimary,
              }}
              onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = V.hoverRow; }}
              onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent'; }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
