/**
 * CapacityOverview — Widget 6: CIO-level capacity snapshot
 * Row 3 (snapshot), span 6
 * DATA SOURCE: resource_inventory, resource_allocations, capacity_departments (LIVE)
 */

import { useNavigate } from 'react-router-dom';
import { CircularGauge } from '../shared/CircularGauge';
import { useCapacityLive } from '@/hooks/strategy/useBudgetCapacityLive';

function getUtilizationColor(pct: number): string {
  if (pct === 0) return '#94A3B8';
  if (pct <= 80) return '#0D9488';
  if (pct <= 100) return '#16A34A';
  return '#EF4444';
}

function getUtilizationLabel(pct: number): string {
  if (pct === 0) return 'Available';
  if (pct <= 50) return 'Under-utilized';
  if (pct <= 80) return 'Healthy';
  if (pct <= 100) return 'Fully Committed';
  return 'Over-allocated';
}

export function CapacityOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useCapacityLive();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="flex gap-5">
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
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
        <span style={{ fontSize: 12 }}>No capacity data available</span>
      </div>
    );
  }

  // Recompute with corrected thresholds
  const available = data.available;
  // Merge old "healthy" (1-80) and "atCapacity" (81-100) into correct buckets
  const healthy = data.healthy; // 1-80%
  const fullyCommitted = data.atCapacity; // 81-100%
  const overAllocated = data.overAllocated; // >100%

  // Workforce composition
  const fixed = data.departments.reduce((s, d) => s, 0); // We'll compute from vendor breakdown
  // Since the hook doesn't expose resource_type counts, derive from total
  const totalResources = data.totalHeadcount;

  const statusCards = [
    { label: 'Available', value: available, color: '#94A3B8' },
    { label: 'Healthy', value: healthy, color: '#0D9488' },
    { label: 'Committed', value: fullyCommitted, color: '#16A34A' },
    { label: 'Over-alloc.', value: overAllocated, color: overAllocated > 0 ? '#EF4444' : '#94A3B8' },
  ];

  const totalForBar = totalResources || 1;

  // Top vendor concentration
  const topVendor = data.vendorBreakdown[0];
  const vendorConcentration = topVendor ? Math.round((topVendor.headcount / totalResources) * 100) : 0;

  // Risk alerts
  const ending30_90 = data.freeingSoon;
  const capacityAlerts = [
    {
      color: data.contractsEnding30d > 0 ? '#EF4444' : '#64748B',
      count: String(data.contractsEnding30d),
      label: 'Ending ≤30d',
      show: true,
    },
    {
      color: '#0D9488',
      count: String(ending30_90),
      label: 'Ending 30-90d',
      show: ending30_90 > 0,
    },
    {
      color: overAllocated > 0 ? '#EF4444' : '#64748B',
      count: String(overAllocated),
      label: 'Over-allocated',
      show: true,
    },
    {
      color: vendorConcentration > 50 ? '#D97706' : '#64748B',
      count: `${vendorConcentration}%`,
      label: topVendor?.name || 'Top Vendor',
      show: vendorConcentration > 30,
    },
  ];

  return (
    <div onClick={() => navigate('/planhub/capacity')} style={{ cursor: 'pointer' }}>
      {/* A) Hero Metrics */}
      <div className="flex items-center gap-5 mb-4">
        <CircularGauge
          value={data.avgUtilization}
          size={80}
          strokeWidth={8}
          color={getUtilizationColor(data.avgUtilization)}
          label="Avg Util."
          animated
        />
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--catalyst-text-primary)', letterSpacing: '-0.02em' }}>
            {totalResources}
          </div>
          <div style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>
            Team Members
          </div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
            {data.departments.length} departments · {data.vendorBreakdown.length} vendors
          </div>
          {/* Composition strip */}
          <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)' }}>
            <span><span style={{ fontWeight: 700, color: '#2563EB' }}>Fixed:</span> {data.fixedCount}</span>
            <span>·</span>
            <span><span style={{ fontWeight: 700, color: '#0D9488' }}>Variable:</span> {data.variableCount}</span>
            <span>·</span>
            <span><span style={{ fontWeight: 700, color: '#D97706' }}>Freelance:</span> {data.freelanceCount}</span>
          </div>
        </div>
      </div>

      {/* B) Status Grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {statusCards.map(card => (
          <div key={card.label} className="text-center" style={{ border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '6px 4px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 9, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div className="flex overflow-hidden mb-3" style={{ height: 14, borderRadius: 9999 }}>
        {statusCards.map(card => {
          const pct = (card.value / totalForBar) * 100;
          return pct > 0 ? (
            <div
              key={card.label}
              title={`${card.label}: ${card.value}`}
              style={{ width: `${pct}%`, background: card.color, transition: 'width 600ms ease-out', minWidth: pct > 0 ? 2 : 0 }}
            />
          ) : null;
        })}
      </div>

      {/* C) By Department */}
      <div className="space-y-1 mb-3">
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
          By Department
        </div>
        {data.departments.map(dept => {
          const utilColor = getUtilizationColor(dept.avgUtilization);
          const barWidth = Math.min(dept.avgUtilization, 100);

          return (
            <div
              key={dept.did}
              className="flex items-center gap-2"
              style={{ transition: 'background 150ms', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ width: 90, fontSize: 11, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, fontWeight: 500 }}>
                {dept.name === 'Technical Support' ? 'Tech Support' : dept.name}
              </span>
              <div className="flex-1 overflow-hidden" style={{ height: 8, borderRadius: 4, background: '#F1F5F9' }}>
                <div style={{
                  width: `${barWidth}%`,
                  height: '100%',
                  borderRadius: 4,
                  background: utilColor,
                  transition: 'width 600ms ease-out',
                  minWidth: barWidth > 0 ? 2 : 0,
                }} />
              </div>
              <span style={{ width: 40, fontSize: 11, textAlign: 'right', fontWeight: 700, color: utilColor, flexShrink: 0 }}>
                {dept.avgUtilization}%
              </span>
              <span style={{ width: 24, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-tertiary)', flexShrink: 0 }}>
                {dept.headcount}
              </span>
            </div>
          );
        })}
      </div>

      {/* D) Risk Signals */}
      <div className="flex flex-wrap" style={{ gap: 12, fontSize: 11 }}>
        {capacityAlerts.filter(a => a.show).map(alert => (
          <span key={alert.label} className="flex items-center gap-1.5">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: alert.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: alert.color }}>{alert.count}</span>
            <span style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)' }}>{alert.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
