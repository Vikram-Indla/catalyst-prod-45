import React from 'react';
import { cn } from '@/lib/utils';

export type HomeRoleMode = 'ops' | 'delivery' | 'exec';

interface HomeRoleModeSelectorProps {
  value: HomeRoleMode;
  onChange: (mode: HomeRoleMode) => void;
}

const modes: { value: HomeRoleMode; label: string }[] = [
  { value: 'ops', label: 'Operations' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'exec', label: 'Executive' },
];

export function HomeRoleModeSelector({ value, onChange }: HomeRoleModeSelectorProps) {
  return (
    <div 
      className="inline-flex items-center p-0.5 rounded-md border border-[var(--border-gold)] bg-[var(--surface-champagne)]"
      role="tablist"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          role="tab"
          aria-selected={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded transition-all",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-1",
            value === mode.value
              // Active: olive green text with gold accent underline
              ? "bg-[var(--surface-1)] text-[var(--brand-primary)] shadow-sm border-b-2 border-[var(--brand-gold)]"
              : "text-[var(--text-3)] hover:text-[var(--text-2)] hover:bg-[var(--surface-2)]"
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
