/**
 * StrategyRoomHeader — Title + density toggle + action buttons
 */

import {
  AlignJustify,
  Menu,
  GripHorizontal,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { StrategyDensity } from '@/hooks/useStrategyPreferences';

interface StrategyRoomHeaderProps {
  density: StrategyDensity;
  onDensityChange: (density: StrategyDensity) => void;
}

const densityOptions: { value: StrategyDensity; label: string; icon: React.ReactNode }[] = [
  {
    value: 'compact',
    label: 'Compact',
    icon: <AlignJustify size={14} />,
  },
  {
    value: 'comfortable',
    label: 'Comfortable',
    icon: <Menu size={14} />,
  },
  {
    value: 'spacious',
    label: 'Spacious',
    icon: <GripHorizontal size={14} />,
  },
];

export function StrategyRoomHeader({ density, onDensityChange }: StrategyRoomHeaderProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      style={{ marginBottom: '20px' }}
    >
      {/* Left: Title */}
      <div>
        <h1
          id="dashboard-main-title"
          style={{
            fontSize: '24px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
            color: 'var(--catalyst-text-primary)',
            margin: 0,
          }}
        >
          Strategy Room
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--catalyst-text-secondary)',
            margin: '4px 0 0 0',
          }}
        >
          Executive dashboard — Ministry of Industry, Saudi Arabia
        </p>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Density segmented control */}
        <div
          className="flex items-center rounded-md overflow-hidden"
          role="radiogroup"
          aria-label="Display density"
          style={{
            border: '1px solid var(--catalyst-border-default)',
          }}
        >
          {densityOptions.map((opt) => {
            const isActive = density === opt.value;
            return (
              <button
                key={opt.value}
                role="radio"
                aria-checked={isActive}
                aria-label={opt.label}
                onClick={() => onDensityChange(opt.value)}
                className="flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  width: '32px',
                  height: '32px',
                  background: isActive ? 'var(--catalyst-primary)' : 'var(--catalyst-bg-surface-0)',
                  color: isActive ? 'var(--catalyst-text-on-primary)' : 'var(--catalyst-text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: `all var(--catalyst-duration-fast)`,
                }}
              >
                {opt.icon}
              </button>
            );
          })}
        </div>

        {/* Export button */}
        <button
          className="flex items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            height: '32px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--catalyst-text-secondary)',
            background: 'var(--catalyst-bg-surface-0)',
            border: '1px solid var(--catalyst-border-default)',
            borderRadius: 'var(--catalyst-radius-md)',
            cursor: 'pointer',
            transition: `all var(--catalyst-duration-fast)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--catalyst-border-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--catalyst-border-default)';
          }}
        >
          <Download size={14} />
          Export
        </button>

        {/* Refresh Data button */}
        <button
          className="flex items-center gap-1.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            height: '32px',
            padding: '8px 12px',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--catalyst-text-on-primary)',
            background: 'var(--catalyst-primary)',
            border: 'none',
            borderRadius: 'var(--catalyst-radius-md)',
            cursor: 'pointer',
            transition: `all var(--catalyst-duration-fast)`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--catalyst-primary-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--catalyst-primary)';
          }}
        >
          <RefreshCw size={14} />
          Refresh Data
        </button>
      </div>
    </div>
  );
}
