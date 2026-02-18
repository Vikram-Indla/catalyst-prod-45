import { Sun, Moon, Download, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

type Density = 'compact' | 'default' | 'comfortable';

interface StrategyRoomHeaderProps {
  theme: 'light' | 'dark';
  density: Density;
  onToggleTheme: () => void;
  onDensityChange: (d: Density) => void;
}

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'default', label: 'Default' },
  { value: 'comfortable', label: 'Comfortable' },
];

export function StrategyRoomHeader({ theme, density, onToggleTheme, onDensityChange }: StrategyRoomHeaderProps) {
  return (
    <div
      className="flex items-center justify-between"
      style={{
        padding: '24px 0',
        marginBottom: '8px',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Left: Title */}
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          Strategy Room
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: '2px 0 0 0',
          }}
        >
          Executive Strategy Dashboard
        </p>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="flex items-center justify-center w-9 h-9 rounded-lg border transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--border-default)',
            background: 'var(--surface-secondary)',
            color: 'var(--text-secondary)',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Density segmented control */}
        <div
          className="flex items-center rounded-lg overflow-hidden border"
          style={{ borderColor: 'var(--border-default)', background: 'var(--surface-secondary)' }}
        >
          {DENSITY_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onDensityChange(opt.value)}
              className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: density === opt.value ? 'var(--color-primary)' : 'transparent',
                color: density === opt.value ? '#FFFFFF' : 'var(--text-secondary)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Export PDF */}
        <button
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border transition-colors hover:opacity-80"
          style={{
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
            background: 'var(--surface-primary)',
          }}
        >
          <Download className="w-3.5 h-3.5" />
          Export PDF
        </button>

        {/* Create Snapshot */}
        <button
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors hover:opacity-90"
          style={{
            background: 'var(--color-primary)',
            color: '#FFFFFF',
          }}
        >
          <Camera className="w-3.5 h-3.5" />
          Create Snapshot
        </button>
      </div>
    </div>
  );
}
