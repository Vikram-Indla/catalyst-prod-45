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
      className="inline-flex items-center gap-0.5 p-1 rounded-lg bg-muted/50 dark:bg-muted/30 border border-border/50"
      role="tablist"
    >
      {modes.map((mode) => (
        <button
          key={mode.value}
          role="tab"
          aria-selected={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={cn(
            "relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            value === mode.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {mode.label}
          {value === mode.value && (
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
