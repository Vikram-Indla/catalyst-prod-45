/**
 * BudgetOverview — Widget 5: Budget snapshot with department bars
 * Row 3 (snapshot), span 6
 */

import { useNavigate } from 'react-router-dom';

interface DeptBar {
  name: string;
  total: string;
  segments: { pct: number; color: string }[];
}

const DEPARTMENTS: DeptBar[] = [
  { name: 'Delivery', total: '1.4M', segments: [{ pct: 42, color: '#2563EB' }, { pct: 24, color: '#0D9488' }, { pct: 22, color: '#D97706' }, { pct: 12, color: '#8B5CF6' }] },
  { name: 'Product', total: '1.1M', segments: [{ pct: 55, color: '#2563EB' }, { pct: 10, color: '#0D9488' }, { pct: 20, color: '#D97706' }, { pct: 15, color: '#8B5CF6' }] },
  { name: 'Operations', total: '860K', segments: [{ pct: 60, color: '#2563EB' }, { pct: 15, color: '#0D9488' }, { pct: 15, color: '#D97706' }, { pct: 10, color: '#8B5CF6' }] },
  { name: 'Tech Support', total: '540K', segments: [{ pct: 35, color: '#2563EB' }, { pct: 30, color: '#0D9488' }, { pct: 25, color: '#D97706' }, { pct: 10, color: '#8B5CF6' }] },
  { name: 'Governance', total: '300K', segments: [{ pct: 65, color: '#2563EB' }, { pct: 5, color: '#0D9488' }, { pct: 10, color: '#D97706' }, { pct: 20, color: '#8B5CF6' }] },
];

const LEGEND = [
  { label: 'Insourced', color: '#2563EB' },
  { label: 'Cosourced', color: '#0D9488' },
  { label: 'Outsourced', color: '#D97706' },
  { label: 'Licenses', color: '#8B5CF6' },
];

export function BudgetOverview() {
  const navigate = useNavigate();

  return (
    <div onClick={() => navigate('/planhub/budget-planner')} style={{ cursor: 'pointer' }}>
      {/* Primary amount */}
      <div className="text-center mb-4">
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>SAR 4.2M</div>
        <div style={{ fontSize: 11, color: 'var(--catalyst-text-tertiary)' }}>Total Budget</div>
        <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>FY 2026</div>
      </div>

      {/* Breakdown cards */}
      <div className="flex gap-4 mb-4 justify-center">
        {[
          { label: 'Insourced', value: '2.1M', color: '#2563EB' },
          { label: 'Fixed Contracts', value: '1.6M', color: '#D97706' },
          { label: 'Licenses', value: '480K', color: '#8B5CF6' },
        ].map(item => (
          <div key={item.label} className="text-center">
            <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.value}</div>
            <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>{item.label}</div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3 justify-center" style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
        {LEGEND.map(l => (
          <span key={l.label} className="flex items-center gap-1">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: l.color }} /> {l.label}
          </span>
        ))}
      </div>

      {/* Department stacked bars */}
      <div className="space-y-2">
        {DEPARTMENTS.map(dept => (
          <div key={dept.name} className="flex items-center gap-2">
            <span style={{ width: 72, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0 }}>
              {dept.name}
            </span>
            <div className="flex flex-1 overflow-hidden" style={{ height: 14, borderRadius: 7 }}>
              {dept.segments.map((seg, i) => (
                <div
                  key={i}
                  style={{
                    width: `${seg.pct}%`,
                    background: seg.color,
                    transition: 'width 600ms ease-out',
                  }}
                />
              ))}
            </div>
            <span style={{ width: 40, fontSize: 10, textAlign: 'right', fontWeight: 600, color: 'var(--catalyst-text-primary)', flexShrink: 0 }}>
              {dept.total}
            </span>
          </div>
        ))}
      </div>

      {/* Data quality alerts */}
      <div className="flex flex-wrap gap-3 mt-3" style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} /> Data Quality 94%</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} /> 3 Missing CTC</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} /> 2 Unpaid Invoices</span>
        <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} /> 4 Renewals ≤90d</span>
      </div>
    </div>
  );
}
