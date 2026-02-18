/**
 * BudgetOverview — Widget 5: CIO-level budget snapshot
 * Row 3 (snapshot), span 6
 * DATA SOURCE: resource_inventory, resource_assignments, software_licenses (LIVE)
 */

import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { useBudgetLive } from '@/hooks/strategy/useBudgetCapacityLive';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatSAR(amount: number): string {
  if (amount >= 1_000_000_000) return `SAR ${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `SAR ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `SAR ${(amount / 1_000).toFixed(0)}K`;
  return `SAR ${amount.toFixed(0)}`;
}

const BUDGET_COLORS = {
  insourced: '#2563EB',
  outsourced: '#D97706',
  cosourced: '#0D9488',
  licenses: '#7C3AED',
};

function getConfidenceColor(pct: number): string {
  if (pct >= 80) return '#0D9488';
  if (pct >= 50) return '#D97706';
  return '#EF4444';
}

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

  const confidenceColor = getConfidenceColor(data.dataQualityPct);

  const budgetCategories = [
    { label: 'Insourced', amount: data.totalInsourced, color: BUDGET_COLORS.insourced },
    { label: 'Outsourced', amount: data.totalOutsourced, color: BUDGET_COLORS.outsourced },
    { label: 'Cosourced', amount: data.totalCosourced, color: BUDGET_COLORS.cosourced },
    { label: 'Licenses', amount: data.totalLicenses, color: BUDGET_COLORS.licenses },
  ];

  const totalForBar = data.totalBudget || 1;
  const categoriesWithPct = budgetCategories.map(c => ({
    ...c,
    pct: Math.round((c.amount / totalForBar) * 100),
  }));

  // Department data with max for proportional bars
  const maxDeptCost = Math.max(...data.departments.map(d => d.annualCTC), 1);

  // Risk alerts
  const alerts = [
    {
      color: confidenceColor,
      count: `${data.dataQualityPct}%`,
      label: 'Data Quality',
      show: true,
    },
    {
      color: '#EF4444',
      count: String(data.missingCTC),
      label: 'Missing CTC',
      show: data.missingCTC > 0,
    },
    {
      color: '#EF4444',
      count: String(data.unpaidInvoices),
      label: 'Unpaid Invoices',
      show: data.unpaidInvoices > 0,
    },
    {
      color: data.renewals90d > 0 ? '#D97706' : '#64748B',
      count: String(data.renewals90d),
      label: 'Renewals ≤90d',
      show: true,
    },
  ];

  return (
    <div onClick={() => navigate('/planhub/budget-planner')} style={{ cursor: 'pointer' }}>
      {/* A) Total Budget Block */}
      <div className="text-center mb-3">
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB', letterSpacing: '-0.02em' }}>
          {formatSAR(data.totalBudget)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>
          Annual Budget · FY {new Date().getFullYear()}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="inline-flex items-center gap-1 mt-1"
                style={{ fontSize: 10, color: confidenceColor, cursor: 'help' }}
                onClick={e => e.stopPropagation()}
              >
                <span style={{ fontWeight: 600 }}>
                  {data.dataQualityPct >= 80 ? '🟢' : data.dataQualityPct >= 50 ? '🟡' : '🔴'} {data.dataQualityPct}% Data Confidence
                </span>
                <Info size={10} style={{ opacity: 0.7 }} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">{data.missingCTC} of {data.totalHeadcount} resources have no CTC entered</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* B) Spend Distribution Bar */}
      <div className="flex overflow-hidden mb-2" style={{ height: 14, borderRadius: 9999 }}>
        {categoriesWithPct.map(cat => (
          cat.pct > 0 ? (
            <div
              key={cat.label}
              title={`${cat.label}: ${formatSAR(cat.amount)} (${cat.pct}%)`}
              style={{
                width: `${cat.pct}%`,
                background: cat.color,
                transition: 'width 600ms ease-out',
                minWidth: cat.pct > 0 ? 4 : 0,
              }}
            />
          ) : null
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap mb-4" style={{ gap: 10, fontSize: 10 }}>
        {categoriesWithPct.map(cat => (
          <span key={cat.label} className="flex items-center" style={{ gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--catalyst-text-secondary)', fontWeight: 500 }}>{cat.label}</span>
            <span style={{ color: 'var(--catalyst-text-primary)', fontWeight: 700 }}>{formatSAR(cat.amount)}</span>
            <span style={{ color: 'var(--catalyst-text-tertiary)' }}>({cat.pct}%)</span>
          </span>
        ))}
      </div>

      {/* C) By Department */}
      <div className="space-y-1.5 mb-3">
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--catalyst-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
          By Department
        </div>
        {data.departments.map(dept => {
          const hasCTC = dept.monthlyCTC > 0;
          const barWidth = hasCTC ? Math.round((dept.annualCTC / maxDeptCost) * 100) : 0;

          return (
            <div
              key={dept.did}
              className="flex items-center gap-2"
              style={{ transition: 'background 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ width: 80, fontSize: 11, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, fontWeight: 500 }}>
                {dept.name === 'Technical Support' ? 'Tech Support' : dept.name}
              </span>
              <div className="flex-1 overflow-hidden" style={{ height: 10, borderRadius: 5, background: hasCTC ? '#F1F5F9' : 'transparent' }}>
                {hasCTC ? (
                  <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    borderRadius: 5,
                    background: BUDGET_COLORS.insourced,
                    transition: 'width 600ms ease-out',
                    minWidth: barWidth > 0 ? 2 : 0,
                  }} />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 5,
                    border: '1px dashed #D4D4D4',
                    background: 'transparent',
                  }} />
                )}
              </div>
              <span style={{ width: 30, fontSize: 12, textAlign: 'right', fontWeight: 700, color: 'var(--catalyst-text-primary)', flexShrink: 0 }}>
                {dept.headcount}
              </span>
              <span style={{
                width: 60,
                fontSize: hasCTC ? 11 : 10,
                textAlign: 'right',
                color: hasCTC ? 'var(--catalyst-text-secondary)' : '#D97706',
                fontWeight: hasCTC ? 400 : 600,
                flexShrink: 0,
              }}>
                {hasCTC ? formatSAR(dept.annualCTC) : '⚠ No CTC'}
              </span>
            </div>
          );
        })}
      </div>

      {/* D) Risk Alerts */}
      <div className="flex flex-wrap" style={{ gap: 12, fontSize: 11 }}>
        {alerts.filter(a => a.show).map(alert => (
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
