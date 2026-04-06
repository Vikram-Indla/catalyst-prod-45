/**
 * StrategyDashboardGrid — 12-column CSS grid layout for Strategy Room widgets
 * All 12 widgets wired in from Stage C.
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
  ShieldAlert,
  FileWarning,
} from 'lucide-react';
import { WidgetCard } from './WidgetCard';
import { StrategyPyramid } from './widgets/StrategyPyramid';
import { OkrHeatmap } from './widgets/OkrHeatmap';
import { OkrTree } from './widgets/OkrTree';
import { ExecutionDials } from './widgets/ExecutionDials';
import { BudgetOverview } from './widgets/BudgetOverview';
import { WorkforceOverview } from './widgets/WorkforceOverview';
import { ContractOverview } from './widgets/ContractOverview';
import { AiHealthScore } from './widgets/AiHealthScore';
import { InvestmentAllocation } from './widgets/InvestmentAllocation';
import { TeamSnapshot } from './widgets/TeamSnapshot';
import { AlignmentMatrix } from './widgets/AlignmentMatrix';
import { ActivityFeed } from './widgets/ActivityFeed';
import { RiskOverview } from './widgets/RiskOverview';

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
          <StrategyPyramid />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '360px' }}>
        <WidgetCard title="OKR Heatmap" icon={Grid3X3} ariaLabel="OKR Heatmap widget" className="h-full">
          <OkrHeatmap />
        </WidgetCard>
      </div>

      {/* ═══ Row 2 — 2 medium widgets ═══ */}
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '280px' }}>
        <WidgetCard title="OKR Tree" icon={GitBranch} ariaLabel="OKR Tree widget" className="h-full">
          <OkrTree />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-6" style={{ minHeight: '280px' }}>
        <WidgetCard title="Execution Dials" icon={Gauge} ariaLabel="Execution Dials widget" className="h-full">
          <ExecutionDials />
        </WidgetCard>
      </div>

      {/* ═══ Row 3 — 3 snapshot widgets (Budget + Workforce + Contracts) ═══ */}
      <div className="col-span-12 md:col-span-6 xl:col-span-4" style={{ minHeight: '280px' }}>
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
          <BudgetOverview />
        </WidgetCard>
      </div>
      <div className="col-span-12 md:col-span-6 xl:col-span-4" style={{ minHeight: '280px' }}>
        <WidgetCard
          title="Workforce Overview"
          icon={Users2}
          ariaLabel="Workforce Overview widget"
          className="h-full"
          accentGradient="linear-gradient(90deg, #2563EB, #60A5FA)"
          headerLink={{
            label: 'View Workforce →',
            onClick: () => navigate('/planhub/capacity'),
          }}
        >
          <WorkforceOverview />
        </WidgetCard>
      </div>
      <div className="col-span-12 md:col-span-12 xl:col-span-4" style={{ minHeight: '280px' }}>
        <WidgetCard
          title="Contract Radar"
          icon={FileWarning}
          ariaLabel="Contract Radar widget"
          className="h-full"
          accentGradient="linear-gradient(90deg, #D97706, #F59E0B)"
          headerLink={{
            label: 'View Details →',
            onClick: () => navigate('/planhub/capacity'),
          }}
        >
          <ContractOverview />
        </WidgetCard>
      </div>

      {/* ═══ Row 4 — 4 analytics widgets ═══ */}
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="AI Health Score" icon={Sparkles} ariaLabel="AI Health Score widget" className="h-full">
          <AiHealthScore />
        </WidgetCard>
      </div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="Investment Allocation" icon={PieChart} ariaLabel="Investment Allocation widget" className="h-full">
          <InvestmentAllocation />
        </WidgetCard>
      </div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="Strategy Snapshot" icon={Camera} ariaLabel="Strategy Snapshot widget" className="h-full">
          <TeamSnapshot />
        </WidgetCard>
      </div>
      <div className="col-span-12 sm:col-span-6 xl:col-span-3" style={{ minHeight: '240px' }}>
        <WidgetCard title="Alignment Matrix" icon={LayoutGrid} ariaLabel="Alignment Matrix widget" className="h-full">
          <AlignmentMatrix />
        </WidgetCard>
      </div>

      {/* ═══ Row 5 — Risk Radar + Activity Feed ═══ */}
      <div className="col-span-12 lg:col-span-8" style={{ minHeight: '260px' }}>
        <WidgetCard
          title="Risk Radar"
          icon={ShieldAlert}
          ariaLabel="Risk Radar widget"
          className="h-full"
          headerLink={{
            label: 'View All →',
            onClick: () => navigate('/strategyhub/risks'),
          }}
        >
          <RiskOverview />
        </WidgetCard>
      </div>
      <div className="col-span-12 lg:col-span-4" style={{ minHeight: '260px' }}>
        <WidgetCard title="Activity Feed" icon={Activity} ariaLabel="Activity Feed widget" className="h-full">
          <ActivityFeed />
        </WidgetCard>
      </div>
    </div>
  );
}
