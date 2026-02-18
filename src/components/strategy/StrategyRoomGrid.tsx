import {
  Pyramid,
  Grid3x3,
  GitBranch,
  Gauge,
  HeartPulse,
  PieChart,
  Clock,
  Users,
  Activity,
  Zap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  icon: LucideIcon;
  minHeight: number;
  className?: string;
}

function WidgetCard({ title, icon: Icon, minHeight, className }: WidgetCardProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--surface-primary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        padding: 'var(--density-padding)',
        minHeight: `${minHeight}px`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Icon
          className="shrink-0"
          style={{ width: '16px', height: '16px', color: 'var(--color-primary)' }}
        />
        <span
          style={{
            fontSize: `calc(14px * var(--density-font-scale))`,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </span>
      </div>

      {/* Placeholder */}
      <div
        className="flex-1 flex items-center justify-center"
        style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}
      >
        Widget content — Stage C
      </div>
    </div>
  );
}

interface GridWidget {
  title: string;
  icon: LucideIcon;
  minHeight: number;
  gridClass: string;
}

const WIDGETS: GridWidget[] = [
  // Row 1
  { title: 'Strategy Pyramid', icon: Pyramid, minHeight: 360, gridClass: 'col-span-12 lg:col-span-6' },
  { title: 'OKR Heatmap', icon: Grid3x3, minHeight: 360, gridClass: 'col-span-12 lg:col-span-6' },
  // Row 2
  { title: 'OKR Tree', icon: GitBranch, minHeight: 360, gridClass: 'col-span-12 lg:col-span-6' },
  { title: 'Execution Dials', icon: Gauge, minHeight: 360, gridClass: 'col-span-12 lg:col-span-6' },
  // Row 3
  { title: 'AI Health Score', icon: HeartPulse, minHeight: 280, gridClass: 'col-span-12 sm:col-span-6 xl:col-span-3' },
  { title: 'Investment Allocation', icon: PieChart, minHeight: 280, gridClass: 'col-span-12 sm:col-span-6 xl:col-span-3' },
  { title: 'Snapshot Timeline', icon: Clock, minHeight: 280, gridClass: 'col-span-12 sm:col-span-6 xl:col-span-3' },
  { title: 'Team Alignment', icon: Users, minHeight: 280, gridClass: 'col-span-12 sm:col-span-6 xl:col-span-3' },
  // Row 4
  { title: 'Activity Feed', icon: Activity, minHeight: 240, gridClass: 'col-span-12 xl:col-span-8' },
  { title: 'Quick Actions', icon: Zap, minHeight: 240, gridClass: 'col-span-12 xl:col-span-4' },
];

export function StrategyRoomGrid() {
  return (
    <div
      className="grid grid-cols-12 mx-auto"
      style={{
        gap: 'var(--density-gap)',
        maxWidth: '1440px',
        padding: '24px 0',
      }}
    >
      {WIDGETS.map(widget => (
        <WidgetCard
          key={widget.title}
          title={widget.title}
          icon={widget.icon}
          minHeight={widget.minHeight}
          className={widget.gridClass}
        />
      ))}
    </div>
  );
}
