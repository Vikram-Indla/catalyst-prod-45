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
  { value: 'planner', label: 'Planner' },
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
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent/10"
          )}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
