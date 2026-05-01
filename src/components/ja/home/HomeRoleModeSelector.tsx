import React from 'react';
import { cn } from '@/lib/utils';

export type HomeRoleMode = 'all' | 'operations' | 'delivery' | 'planner';

interface HomeRoleModeSelectorProps {
  value: HomeRoleMode;
  onChange: (mode: HomeRoleMode) => void;
}

const modes: { value: HomeRoleMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'operations', label: 'Operations' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'planner', label: 'TaskHub' },
];

export function HomeRoleModeSelector({ value, onChange }: HomeRoleModeSelectorProps) {
  return (
    <div 
      className="inline-flex items-center rounded-lg border border-border bg-card shadow-sm"
      role="tablist"
    >
      {modes.map((mode, index) => (
        <button
          key={mode.value}
          role="tab"
          aria-selected={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            "relative px-4 py-2 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:z-10",
            index === 0 && "rounded-l-lg",
            index === modes.length - 1 && "rounded-r-lg",
            index !== 0 && "border-l border-border",
            value === mode.value
              // Active state: Blue background per design system v2.0
              ? "bg-[var(--ds-text-brand, #2563eb)] text-white shadow-sm"
              : "text-foreground hover:bg-muted/50"
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
