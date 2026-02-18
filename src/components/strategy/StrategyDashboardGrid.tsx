/**
 * StrategyDashboardGrid — 12-column CSS grid layout for Strategy Room widgets
 * Matches the approved HTML demo exactly: 5 rows, 12 widgets.
 */

import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Grid3X3,
  GitBranch,
  Gauge,
  DollarSign,
  Users2,
  Sparkles,
  PieChart,
  Camera,
  LayoutGrid,
  Activity,
  Zap,
  LucideIcon,
} from 'lucide-react';
import { WidgetCard } from './WidgetCard';

function WidgetPlaceholder({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{ minHeight: '120px' }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--catalyst-bg-surface-2, #F1F5F9)',
          marginBottom: '12px',
        }}
      >
        <Icon
          size={20}
          style={{ color: 'var(--catalyst-text-tertiary, #94A3B8)' }}
        />
      </div>
      <span
        style={{
          fontSize: '12px',
          color: 'var(--catalyst-text-tertiary, #94A3B8)',
          fontWeight: 500,
        }}
      >
        Building in Stage C
      </span>
    </div>
  );
}

export function StrategyDashboardGrid() {
  const navigate = useNavigate();

  return (
    <div
      className="strategy-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 'var(--catalyst-density-grid-gutter)',
      }}
    >
      {/* ═══ Row 1 — 2 large widgets ═══ */}
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '360px' }}>
        <WidgetCard title="Strategy Pyramid" icon={TrendingUp} ariaLabel="Strategy Pyramid widget" className="h-full">
          <WidgetPlaceholder icon={TrendingUp} />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '360px' }}>
        <WidgetCard title="OKR Heatmap" icon={Grid3X3} ariaLabel="OKR Heatmap widget" className="h-full">
          <WidgetPlaceholder icon={Grid3X3} />
        </WidgetCard>
      </div>

      {/* ═══ Row 2 — 2 medium widgets ═══ */}
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '280px' }}>
        <WidgetCard title="OKR Tree" icon={GitBranch} ariaLabel="OKR Tree widget" className="h-full">
          <WidgetPlaceholder icon={GitBranch} />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '280px' }}>
        <WidgetCard title="Execution Dials" icon={Gauge} ariaLabel="Execution Dials widget" className="h-full">
          <WidgetPlaceholder icon={Gauge} />
        </WidgetCard>
      </div>

      {/* ═══ Row 3 — Snapshot widgets (Budget + Capacity) ═══ */}
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '280px' }}>
        <WidgetCard
          title="Budget Overview"
          icon={DollarSign}
          ariaLabel="Budget Overview widget"
          className="h-full"
          accentGradient="linear-gradient(90deg, #334155, #64748B)"
          headerLink={{
            label: 'View Full Planner →',
            onClick: () => navigate('/planhub/budget-planner'),
          }}
        >
          <WidgetPlaceholder icon={DollarSign} />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '280px' }}>
        <WidgetCard
          title="Capacity Overview"
          icon={Users2}
          ariaLabel="Capacity Overview widget"
          className="h-full"
          accentGradient="linear-gradient(90deg, #2563EB, #60A5FA)"
          headerLink={{
            label: 'View Capacity Planner →',
            onClick: () => navigate('/planhub/capacity'),
          }}
        >
          <WidgetPlaceholder icon={Users2} />
        </WidgetCard>
      </div>

      {/* ═══ Row 4 — 4 analytics widgets ═══ */}
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="AI Health Score" icon={Sparkles} ariaLabel="AI Health Score widget" className="h-full">
          <WidgetPlaceholder icon={Sparkles} />
        </WidgetCard>
      </div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="Investment Allocation" icon={PieChart} ariaLabel="Investment Allocation widget" className="h-full">
          <WidgetPlaceholder icon={PieChart} />
        </WidgetCard>
      </div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="Team Snapshot" icon={Camera} ariaLabel="Team Snapshot widget" className="h-full">
          <WidgetPlaceholder icon={Camera} />
        </WidgetCard>
      </div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="Alignment Matrix" icon={LayoutGrid} ariaLabel="Alignment Matrix widget" className="h-full">
          <WidgetPlaceholder icon={LayoutGrid} />
        </WidgetCard>
      </div>

      {/* ═══ Row 5 — Activity + Quick Actions ═══ */}
      <div className="col-span-12 lg:col-span-8" style={{ minHeight: '260px' }}>
        <WidgetCard title="Activity Feed" icon={Activity} ariaLabel="Activity Feed widget" className="h-full">
          <WidgetPlaceholder icon={Activity} />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-4" style={{ minHeight: '260px' }}>
        <WidgetCard title="Quick Actions" icon={Zap} ariaLabel="Quick Actions widget" className="h-full">
          <WidgetPlaceholder icon={Zap} />
        </WidgetCard>
      </div>
    </div>
  );
}
