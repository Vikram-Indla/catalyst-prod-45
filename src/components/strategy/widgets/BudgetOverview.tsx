/**
 * BudgetOverview — Widget 5: Budget snapshot with theme allocation bars
 * Row 3 (snapshot), span 6
 * DATA SOURCE: es_investment_allocations + es_strategic_themes
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInvestmentAllocations, useStrategicThemes } from '@/hooks/strategy/useStrategyData';

function formatSAR(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
}

export function BudgetOverview() {
  const navigate = useNavigate();
  const { data: allocations, isLoading: aL } = useInvestmentAllocations();
  const { data: themes, isLoading: tL } = useStrategicThemes();
  const isLoading = aL || tL;

  const totalBudget = useMemo(() =>
    allocations?.reduce((sum, a) => sum + (Number(a.allocated_amount) || 0), 0) || 0,
    [allocations]
  );

  const totalSpent = useMemo(() =>
    allocations?.reduce((sum, a) => sum + (Number(a.spent_amount) || 0), 0) || 0,
    [allocations]
  );

  const themeAllocations = useMemo(() => {
    if (!allocations || !themes) return [];
    return allocations.map(alloc => {
      const theme = themes.find(t => t.id === alloc.theme_id);
      return {
        name: theme?.title || 'Unknown',
        color: theme?.color || '#2563EB',
        allocated: Number(alloc.allocated_amount) || 0,
        spent: Number(alloc.spent_amount) || 0,
        pct: Number(alloc.allocated_pct) || 0,
      };
    });
  }, [allocations, themes]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="text-center">
          <div style={{ height: 24, width: 120, margin: '0 auto', background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
          <div style={{ height: 12, width: 80, margin: '8px auto', background: 'var(--catalyst-bg-hover)', borderRadius: 4 }} />
        </div>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: 20, background: 'var(--catalyst-bg-hover)', borderRadius: 10 }} />
        ))}
      </div>
    );
  }

  if (themeAllocations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2" style={{ color: 'var(--catalyst-text-tertiary)' }}>
        <span style={{ fontSize: 12 }}>No budget data available</span>
      </div>
    );
  }

  return (
    <div onClick={() => navigate('/planhub/budget-planner')} style={{ cursor: 'pointer' }}>
      {/* Primary amount */}
      <div className="text-center mb-4">
        <div style={{ fontSize: 22, fontWeight: 800, color: '#2563EB' }}>SAR {formatSAR(totalBudget)}</div>
        <div style={{ fontSize: 11, color: 'var(--catalyst-text-tertiary)' }}>Total Budget</div>
        <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>FY {allocations?.[0]?.fiscal_year || new Date().getFullYear()}</div>
      </div>

      {/* Breakdown cards */}
      <div className="flex gap-4 mb-4 justify-center">
        <div className="text-center">
          <div style={{ fontSize: 16, fontWeight: 700, color: '#2563EB' }}>SAR {formatSAR(totalSpent)}</div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>Spent</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0D9488' }}>SAR {formatSAR(totalBudget - totalSpent)}</div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>Remaining</div>
        </div>
        <div className="text-center">
          <div style={{ fontSize: 16, fontWeight: 700, color: '#D97706' }}>
            {totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--catalyst-text-tertiary)' }}>Utilization</div>
        </div>
      </div>

      {/* Theme allocation bars */}
      <div className="space-y-2">
        {themeAllocations.map(item => {
          const spentPct = item.allocated > 0 ? Math.round((item.spent / item.allocated) * 100) : 0;
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span style={{ width: 72, fontSize: 10, textAlign: 'right', color: 'var(--catalyst-text-secondary)', flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {item.name.length > 12 ? item.name.substring(0, 11) + '.' : item.name}
              </span>
              <div className="flex flex-1 overflow-hidden" style={{ height: 14, borderRadius: 7, background: '#F1F5F9' }}>
                <div
                  style={{
                    width: `${spentPct}%`,
                    background: item.color,
                    transition: 'width 600ms ease-out',
                    borderRadius: 7,
                  }}
                />
              </div>
              <span style={{ width: 50, fontSize: 10, textAlign: 'right', fontWeight: 600, color: 'var(--catalyst-text-primary)', flexShrink: 0 }}>
                {formatSAR(item.allocated)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Allocation summary */}
      <div className="flex flex-wrap gap-3 mt-3" style={{ fontSize: 10, color: 'var(--catalyst-text-secondary)' }}>
        {themeAllocations.map(a => (
          <span key={a.name} className="flex items-center gap-1">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} /> {a.pct}%
          </span>
        ))}
      </div>

      {/* Data quality alerts */}
      <div className="flex flex-wrap gap-3 mt-3" style={{ fontSize: 11 }}>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0D9488' }} />
          <span style={{ fontWeight: 600, color: '#0D9488' }}>94%</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Data Quality</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
          <span style={{ fontWeight: 600, color: '#EF4444' }}>3</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Missing CTC</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />
          <span style={{ fontWeight: 600, color: '#D97706' }}>2</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Unpaid Invoices</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706' }} />
          <span style={{ fontWeight: 600, color: '#D97706' }}>4</span>
          <span style={{ color: 'var(--catalyst-text-secondary)' }}>Renewals ≤90d</span>
        </span>
      </div>
    </div>
  );
}
