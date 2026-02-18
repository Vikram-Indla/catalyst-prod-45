/**
 * WorkforceOverview — Widget 6: CIO-level workforce snapshot
 * Row 3, span 4
 * DATA SOURCE: resource_inventory, resource_allocations, capacity_departments (LIVE)
 */

import { useNavigate } from 'react-router-dom';
import { CircularGauge } from '../shared/CircularGauge';
import { useCapacityLive } from '@/hooks/strategy/useBudgetCapacityLive';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function getUtilizationColor(pct: number): string {
  if (pct === 0) return '#94A3B8';
  if (pct < 100) return '#D97706';
  if (pct === 100) return '#16A34A';
  return '#EF4444';
}

function getUtilizationLabel(pct: number): string {
  if (pct === 0) return 'Unassigned';
  if (pct < 100) return 'Under-utilized';
  if (pct === 100) return 'Fully Committed';
  return 'Over-allocated';
}

export function WorkforceOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useCapacityLive();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="flex gap-4">
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
          <div className="space-y-2 flex-1">
            <div style={{ height: 24, width: 60, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
            <div style={{ height: 12, width: 100, background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ height: 50, background: 'var(--catalyst-bg-hover)', borderRadius: 6 }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No workforce data available</span>
      </div>
    );
  }

  const unassigned = data.available;
  const committed = data.atCapacity;
  const overAllocated = data.overAllocated;
  const totalResources = data.totalHeadcount;

  const statusCards = [
    { label: 'Unassigned', value: unassigned, color: '#94A3B8' },
    { label: 'Under-util.', value: data.healthy, color: '#D97706' },
    { label: 'Committed', value: committed, color: '#16A34A' },
    { label: 'Over-alloc.', value: overAllocated, color: overAllocated > 0 ? '#EF4444' : '#94A3B8' },
  ];

  const totalForBar = totalResources || 1;

  const topVendor = data.vendorBreakdown[0];
  const vendorConcentration = topVendor ? Math.round((topVendor.headcount / totalResources) * 100) : 0;

  const ending30_90 = data.freeingSoon;
  const capacityAlerts = [
    { color: data.contractsEnding30d > 0 ? '#EF4444' : '#64748B', count: String(data.contractsEnding30d), label: 'Ending ≤30d', show: true },
    { color: '#0D9488', count: String(ending30_90), label: 'Ending 30-90d', show: ending30_90 > 0 },
    { color: overAllocated > 0 ? '#EF4444' : '#64748B', count: String(overAllocated), label: 'Over-allocated', show: true },
    { color: vendorConcentration > 50 ? '#D97706' : '#64748B', count: `${vendorConcentration}%`, label: topVendor?.name || 'Top Vendor', show: vendorConcentration > 30 },
  ];

  const barSegments = [
    { label: 'Unassigned', count: unassigned, color: '#94A3B8', tooltip: `Unassigned: ${unassigned} resources\nNo project assignment.\nAction: Review bench availability.` },
    { label: 'Under-utilized', count: data.healthy, color: '#D97706', tooltip: `Under-utilized: ${data.healthy} resources\nAllocated below 100% — capacity being wasted.\nAction: Optimize allocation or assign to new projects.` },
    { label: 'Fully Committed', count: committed, color: '#16A34A', tooltip: `Fully Committed: ${committed} resources\nAll capacity assigned to active projects. ✓` },
    { label: 'Over-allocated', count: overAllocated, color: '#EF4444', tooltip: `⚠ Over-allocated: ${overAllocated} resources\nAssigned beyond 100% capacity — burnout risk.\nAction: Rebalance workload or add resources.` },
  ];

  return (
    <TooltipProvider>
      <div onClick={() => navigate('/planhub/capacity')} style={{ cursor: 'pointer' }}>
        {/* A) Hero Metrics */}
        <div className="flex items-center gap-4 mb-3">
          <CircularGauge value={data.avgUtilization} size={64} strokeWidth={7} color={getUtilizationColor(data.avgUtilization)} label="Avg Util." animated />
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--catalyst-text-primary)', letterSpacing: '-0.02em' }}>{totalResources}</div>
            <div style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>Team Members</div>
            <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>{data.departments.length} depts · {data.vendorBreakdown.length} vendors</div>
            <div className="flex items-center gap-1 mt-1" style={{ fontSize: 9, color: 'var(--catalyst-text-secondary)' }}>
              <span><span style={{ fontWeight: 700, color: '#2563EB' }}>F:</span> {data.fixedCount}</span>
              <span>·</span>
              <span><span style={{ fontWeight: 700, color: '#0D9488' }}>V:</span> {data.variableCount}</span>
              <span>·</span>
              <span><span style={{ fontWeight: 700, color: '#D97706' }}>Fr:</span> {data.freelanceCount}</span>
            </div>
          </div>
        </div>

        {/* B) Status Grid */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          {statusCards.map(card => (
            <div key={card.label} className="text-center" style={{ border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '4px 6px' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: card.color }}>{card.value}</div>
              <div style={{ fontSize: 8, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>{card.label}</div>
            </div>
          ))}
        </div>

        {/* Stacked bar with tooltips */}
        <div className="flex overflow-hidden mb-3" style={{ height: 14, borderRadius: 9999 }}>
          {barSegments.map(seg => {
            const pct = (seg.count / totalForBar) * 100;
            return pct > 0 ? (
              <Tooltip key={seg.label}>
                <TooltipTrigger asChild>
                  <div style={{ width: `${pct}%`, background: seg.color, transition: 'width 600ms ease-out', minWidth: 2, cursor: 'help' }} onClick={e => e.stopPropagation()} />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs whitespace-pre-line">{seg.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : null;
          })}
        </div>

        {/* C) By Department */}
        <div className="space-y-1 mb-3">
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>By Department</div>
          {data.departments.map(dept => {
            const utilColor = getUtilizationColor(dept.avgUtilization);
            const barWidth = Math.min(dept.avgUtilization, 100);
            const tooltipText = `${dept.name}: ${dept.headcount} resources\nAvg. utilization: ${dept.avgUtilization}%`;
            return (
              <Tooltip key={dept.did}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2" style={{ transition: 'background 150ms', cursor: 'pointer' }} onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')} onClick={e => e.stopPropagation()}>
                    <span style={{ width: 75, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, fontWeight: 500 }}>{dept.name === 'Technical Support' ? 'Tech Support' : dept.name}</span>
                    <div className="flex-1 overflow-hidden" style={{ height: 8, borderRadius: 4, background: '#F1F5F9' }}>
                      <div style={{ width: `${barWidth}%`, height: '100%', borderRadius: 4, background: utilColor, transition: 'width 600ms ease-out', minWidth: barWidth > 0 ? 2 : 0 }} />
                    </div>
                    <span style={{ width: 36, fontSize: 11, textAlign: 'right', fontWeight: 700, color: utilColor, flexShrink: 0 }}>{dept.avgUtilization}%</span>
                    <span style={{ width: 22, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-tertiary)', flexShrink: 0 }}>{dept.headcount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-xs whitespace-pre-line">{tooltipText}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* D) Risk Signals */}
        <div className="flex flex-wrap" style={{ gap: 10, fontSize: 11 }}>
          {capacityAlerts.filter(a => a.show).map(alert => (
            <span key={alert.label} className="flex items-center gap-1">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: alert.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: alert.color }}>{alert.count}</span>
              <span style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)' }}>{alert.label}</span>
            </span>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}
