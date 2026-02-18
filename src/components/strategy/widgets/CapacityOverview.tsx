/**
 * CapacityOverview — Widget 6: CIO-level capacity snapshot
 * Row 3 (snapshot), span 6
 * DATA SOURCE: resource_inventory, resource_allocations, capacity_departments (LIVE)
 */

import { useNavigate } from 'react-router-dom';
import { CircularGauge } from '../shared/CircularGauge';
import { useCapacityLive } from '@/hooks/strategy/useBudgetCapacityLive';

const STATUS_COLORS = {
  available: '#64748B',
  healthy: '#0D9488',
  atCapacity: '#D97706',
  overAllocated: '#EF4444',
};

export function CapacityOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useCapacityLive();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="flex gap-5">
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'var(--catalyst-bg-hover)' }} />
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

  const statusCards = [
    { label: 'Available', value: data.available, color: STATUS_COLORS.available },
    { label: 'Healthy', value: data.healthy, color: STATUS_COLORS.healthy },
    { label: 'At Capacity', value: data.atCapacity, color: STATUS_COLORS.atCapacity },
    { label: 'Over-alloc.', value: data.overAllocated, color: STATUS_COLORS.overAllocated },
  ];

  const totalForBar = data.totalHeadcount || 1;

  return (
    <div onClick={() => navigate('/planhub/capacity')} style={{ cursor: 'pointer' }}>
      {/* Gauge + Meta */}
      <div className="flex items-center gap-5 mb-4">
        <CircularGauge
          value={data.avgUtilization}
          size={100}
          strokeWidth={10}
          color={data.avgUtilization > 90 ? '#EF4444' : data.avgUtilization > 75 ? '#D97706' : '#0D9488'}
          label="Avg Util."
          animated
        />
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--catalyst-text-primary)', letterSpacing: '-0.02em' }}>
            {data.totalHeadcount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>
            Team Members
          </div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
            {data.departments.length} departments · {data.vendorBreakdown.length} vendors
          </div>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {statusCards.map(card => (
          <div key={card.label} className="text-center" style={{ border: '1px solid var(--catalyst-border-default, #E2E8F0)', borderRadius: 6, padding: '6px 4px' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: 9, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Utilization bar */}
      <div className="flex overflow-hidden mb-2" style={{ height: 16, borderRadius: 9999 }}>
        {statusCards.map(card => {
          const pct = (card.value / totalForBar) * 100;
          return pct > 0 ? (
            <div
              key={card.label}
              title={`${card.label}: ${card.value}`}
              style={{ width: `${pct}%`, background: card.color, transition: 'width 800ms ease-out', minWidth: pct > 0 ? 2 : 0 }}
            />
          ) : null;
        })}
      </div>

      {/* Department breakdown */}
      <div className="space-y-1 mb-3">
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
          By Department
        </div>
        {data.departments.map(dept => (
          <div key={dept.did} className="flex items-center gap-2">
            <span style={{ width: 80, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, fontWeight: 500 }}>
              {dept.name}
            </span>
            <div className="flex-1 overflow-hidden" style={{ height: 10, borderRadius: 5, background: '#F1F5F9' }}>
              <div style={{
                width: `${dept.avgUtilization}%`,
                height: '100%',
                borderRadius: 5,
                background: dept.avgUtilization > 90 ? STATUS_COLORS.overAllocated : dept.avgUtilization > 75 ? STATUS_COLORS.atCapacity : STATUS_COLORS.healthy,
                transition: 'width 600ms ease-out',
              }} />
            </div>
            <span style={{ width: 28, fontSize: 10, textAlign: 'right', fontWeight: 700, color: 'var(--catalyst-text-primary)', flexShrink: 0 }}>
              {dept.avgUtilization}%
            </span>
            <span style={{ width: 20, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-tertiary)', flexShrink: 0 }}>
              {dept.headcount}
            </span>
          </div>
        ))}
      </div>

      {/* Capacity alerts */}
      <div className="flex flex-wrap" style={{ gap: 10, fontSize: 11 }}>
        {data.contractsEnding30d > 0 && (
          <span className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontWeight: 600, color: '#EF4444' }}>{data.contractsEnding30d}</span>
            <span style={{ color: 'var(--catalyst-text-secondary)' }}>Ending ≤30d</span>
          </span>
        )}
        {data.freeingSoon > 0 && (
          <span className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} />
            <span style={{ fontWeight: 600, color: '#0D9488' }}>{data.freeingSoon}</span>
            <span style={{ color: 'var(--catalyst-text-secondary)' }}>Freeing up soon</span>
          </span>
        )}
        {data.overAllocated > 0 && (
          <span className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontWeight: 600, color: '#EF4444' }}>{data.overAllocated}</span>
            <span style={{ color: 'var(--catalyst-text-secondary)' }}>Over-allocated</span>
          </span>
        )}
      </div>
    </div>
  );
}
