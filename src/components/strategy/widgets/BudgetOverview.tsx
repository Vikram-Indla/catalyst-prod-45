/**
 * BudgetOverview — Widget 5: CIO-level budget snapshot
 * Row 3 (snapshot), span 6
 * DATA SOURCE: resource_inventory, resource_assignments, software_licenses (LIVE)
 */

import { useNavigate } from 'react-router-dom';
import { useBudgetLive } from '@/hooks/strategy/useBudgetCapacityLive';

function formatSAR(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

const BUDGET_COLORS = {
  insourced: '#2563EB',
  outsourced: '#D97706',
  cosourced: '#0D9488',
  licenses: '#7C3AED',
};

export function BudgetOverview() {
  const navigate = useNavigate();
  const { data, isLoading } = useBudgetLive();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="text-center">
          <div style={{ height: 28, width: 140, margin: '0 auto', background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          <div style={{ height: 12, width: 80, margin: '8px auto', background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 18, background: 'var(--catalyst-bg-hover)', borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No budget data available</span>
      </div>
    );
  }

  const budgetCategories = [
    { label: 'Insourced', amount: data.totalInsourced, color: BUDGET_COLORS.insourced, pct: data.totalBudget > 0 ? Math.round(data.totalInsourced / data.totalBudget * 100) : 0 },
    { label: 'Outsourced', amount: data.totalOutsourced, color: BUDGET_COLORS.outsourced, pct: data.totalBudget > 0 ? Math.round(data.totalOutsourced / data.totalBudget * 100) : 0 },
    { label: 'Cosourced', amount: data.totalCosourced, color: BUDGET_COLORS.cosourced, pct: data.totalBudget > 0 ? Math.round(data.totalCosourced / data.totalBudget * 100) : 0 },
    { label: 'Licenses', amount: data.totalLicenses, color: BUDGET_COLORS.licenses, pct: data.totalBudget > 0 ? Math.round(data.totalLicenses / data.totalBudget * 100) : 0 },
  ];

  return (
    <div onClick={() => navigate('/planhub/budget-planner')} style={{ cursor: 'pointer' }}>
      {/* Primary amount */}
      <div className="text-center mb-3">
        <div style={{ fontSize: 24, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.02em' }}>
          SAR {formatSAR(data.totalBudget)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>
          Annual Budget · FY {new Date().getFullYear()}
        </div>
      </div>

      {/* Stacked budget bar */}
      <div className="flex overflow-hidden mb-2" style={{ height: 18, borderRadius: 9999 }}>
        {budgetCategories.map(cat => (
          cat.pct > 0 ? (
            <div
              key={cat.label}
              title={`${cat.label}: SAR ${formatSAR(cat.amount)} (${cat.pct}%)`}
              style={{
                width: `${cat.pct}%`,
                background: cat.color,
                transition: 'width 800ms ease-out',
                minWidth: cat.pct > 0 ? 4 : 0,
              }}
            />
          ) : null
        ))}
      </div>

      {/* Category legend */}
      <div className="flex flex-wrap mb-4" style={{ gap: 10, fontSize: 10 }}>
        {budgetCategories.map(cat => (
          <span key={cat.label} className="flex items-center" style={{ gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>{cat.label}</span>
            <span style={{ color: 'var(--catalyst-text-primary)', fontWeight: 700 }}>{formatSAR(cat.amount)}</span>
            <span style={{ color: 'var(--catalyst-text-tertiary)' }}>({cat.pct}%)</span>
          </span>
        ))}
      </div>

      {/* Department breakdown */}
      <div className="space-y-1.5 mb-3">
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          By Department
        </div>
        {data.departments.map(dept => {
          const pct = data.totalInsourced > 0 ? Math.round(dept.annualCTC / data.totalInsourced * 100) : 0;
          return (
            <div key={dept.did} className="flex items-center gap-2">
              <span style={{ width: 80, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, fontWeight: 500 }}>
                {dept.name}
              </span>
              <div className="flex-1 overflow-hidden" style={{ height: 12, borderRadius: 6, background: '#F1F5F9' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: BUDGET_COLORS.insourced, borderRadius: 6, transition: 'width 600ms ease-out', minWidth: pct > 0 ? 2 : 0 }} />
              </div>
              <span style={{ width: 32, fontSize: 10, textAlign: 'right', fontWeight: 700, color: 'var(--catalyst-text-primary)', flexShrink: 0 }}>
                {dept.headcount}
              </span>
              <span style={{ width: 48, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0 }}>
                {formatSAR(dept.annualCTC)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Data quality alerts */}
      <div className="flex flex-wrap" style={{ gap: 10, fontSize: 11 }}>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: data.dataQualityPct >= 80 ? '#0D9488' : '#EF4444' }} />
          <span style={{ fontWeight: 600, color: data.dataQualityPct >= 80 ? '#0D9488' : '#EF4444' }}>{data.dataQualityPct}%</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Data Quality</span>
        </span>
        {data.missingCTC > 0 && (
          <span className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
            <span style={{ fontWeight: 600, color: '#EF4444' }}>{data.missingCTC}</span>
            <span style={{ color: 'var(--catalyst-text-secondary)' }}>Missing CTC</span>
          </span>
        )}
        {data.unpaidInvoices > 0 && (
          <span className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />
            <span style={{ fontWeight: 600, color: '#D97706' }}>{data.unpaidInvoices}</span>
            <span style={{ color: 'var(--catalyst-text-secondary)' }}>Unpaid Invoices</span>
          </span>
        )}
        {data.renewals90d > 0 && (
          <span className="flex items-center gap-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />
            <span style={{ fontWeight: 600, color: '#D97706' }}>{data.renewals90d}</span>
            <span style={{ color: 'var(--catalyst-text-secondary)' }}>Renewals ≤90d</span>
          </span>
        )}
      </div>
    </div>
  );
}
