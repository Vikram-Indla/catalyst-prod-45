/**
 * StrategyRoomActions — Density toggle + Export button
 * Passed into CommandCenterHeader's `actions` prop for Strategy Room.
 */

import { Download } from 'lucide-react';
import type { StrategyDensity } from '@/hooks/useStrategyPreferences';

interface StrategyRoomActionsProps {
  density: StrategyDensity;
  setDensity: (d: StrategyDensity) => void;
}

/** Compact: 4 thin lines */
function CompactIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3h10M2 5.5h10M2 8h10M2 10.5h10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

/** Comfortable: 3 medium lines */
function ComfortableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 3.5h10M2 7h10M2 10.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Spacious: 2 thick lines */
function SpaciousIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 5h10M2 9h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const densityOptions: { value: StrategyDensity; label: string; icon: React.ReactNode }[] = [
  { value: 'compact', label: 'Compact', icon: <CompactIcon /> },
  { value: 'comfortable', label: 'Comfortable', icon: <ComfortableIcon /> },
  { value: 'spacious', label: 'Spacious', icon: <SpaciousIcon /> },
];

export function StrategyRoomActions({ density, setDensity }: StrategyRoomActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Density segmented control */}
      <div
        className="flex items-center rounded-md overflow-hidden"
        role="radiogroup"
        aria-label="Display density"
        style={{ border: '1px solid var(--catalyst-border-default, hsl(var(--border)))' }}
      >
        {densityOptions.map((opt) => {
          const isActive = density === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={isActive}
              aria-label={opt.label}
              onClick={() => setDensity(opt.value)}
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
          );
        })}
      </div>

      {/* Export button */}
      <button
        className="flex items-center gap-1.5 rounded-md text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          height: '32px',
          padding: '0 12px',
          fontSize: '13px',
          fontWeight: 500,
          color: 'hsl(var(--muted-foreground))',
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '6px',
          cursor: 'pointer',
        }}
      >
        <Download size={14} />
        Export
      </button>
    </div>
  );
}
