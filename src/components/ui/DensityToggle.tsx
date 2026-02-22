/**
 * DensityToggle — Reusable density segmented control with tooltips
 * Shows Compact (4 lines), Comfortable (3 lines), Spacious (2 lines)
 */
import React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

export type DensityValue = 'compact' | 'comfortable' | 'spacious';

interface DensityToggleProps {
  value: DensityValue;
  onChange: (v: DensityValue) => void;
}

function CompactIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3h10M2 5.5h10M2 8h10M2 10.5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function ComfortableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SpaciousIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 5h10M2 9h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const options: { value: DensityValue; label: string; icon: React.ReactNode }[] = [
  { value: 'compact', label: 'Compact', icon: <CompactIcon /> },
  { value: 'comfortable', label: 'Comfortable', icon: <ComfortableIcon /> },
  { value: 'spacious', label: 'Spacious', icon: <SpaciousIcon /> },
];

export function DensityToggle({ value, onChange }: DensityToggleProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="flex items-center rounded-md overflow-hidden"
        role="radiogroup"
        aria-label="Display density"
        style={{ border: '1px solid hsl(var(--border))' }}
      >
        {options.map((opt) => {
          const isActive = value === opt.value;
          return (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <button
                  role="radio"
                  aria-checked={isActive}
                  aria-label={opt.label}
                  onClick={() => onChange(opt.value)}
                  className="flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: isActive ? '#2563EB' : 'hsl(var(--card))',
                    color: isActive ? '#FFFFFF' : 'hsl(var(--muted-foreground))',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {opt.icon}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">{opt.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
