/**
 * DashboardStatCards — G5-03
 * 4 KPI cards for TestHub Dashboard
 */

import { FileText, TrendingUp, Play, AlertTriangle } from 'lucide-react';

export interface DashboardStats {
  total_test_cases: number;
  total_cycles: number;
  active_cycles: number;
  completed_cycles: number;
  total_executed: number;
  total_passed: number;
  total_failed: number;
  total_blocked: number;
  total_skipped: number;
  total_not_run: number;
  overall_pass_rate: number;
  automation_coverage?: number;
}

interface Props {
  stats: DashboardStats | null;
}

const CARDS = [
  {
    label: 'Total Test Cases',
    icon: FileText,
    iconBg: '#EBF0FF',
    iconColor: 'var(--ds-text-brand, #3B82F6)',
    getValue: (s: DashboardStats) => s.total_test_cases,
    getSub: (s: DashboardStats) => `${s.total_cycles} cycles total`,
  },
  {
    label: 'Overall Pass Rate',
    icon: TrendingUp,
    iconBg: '#ECFDF5',
    iconColor: '#10B981',
    getValue: (s: DashboardStats) => `${s.overall_pass_rate}%`,
    getSub: (s: DashboardStats) => `${s.total_executed} tests executed`,
    valueColor: '#10B981',
  },
  {
    label: 'Active Cycles',
    icon: Play,
    iconBg: '#ECFFFE',
    iconColor: '#0F766E',
    getValue: (s: DashboardStats) => s.active_cycles,
    getSub: (s: DashboardStats) => `${s.completed_cycles} completed`,
  },
  {
    label: 'Blocked Tests',
    icon: AlertTriangle,
    iconBg: '#FFFBEB',
    iconColor: 'var(--ds-text-warning, #F59E0B)',
    getValue: (s: DashboardStats) => s.total_blocked,
    getSub: (s: DashboardStats) => `${s.total_failed} failed`,
    warnWhenPositive: true,
  },
] as const;

export function DashboardStatCards({ stats }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 24,
      }}
    >
      {CARDS.map((card) => {
        const Icon = card.icon;
        const value = stats ? card.getValue(stats) : '–';
        const sub = stats ? card.getSub(stats) : '…';
        const showWarn =
          'warnWhenPositive' in card &&
          card.warnWhenPositive &&
          stats &&
          (stats.total_blocked ?? 0) > 0;
        const valColor =
          'valueColor' in card
            ? card.valueColor
            : showWarn
              ? card.iconColor
              : 'var(--fg-1)';

        return (
          <div
            key={card.label}
            style={{
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--divider)',
              borderRadius: 12,
              padding: '20px 24px',
              cursor: 'default',
              transition: 'box-shadow .15s, border-color .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
              e.currentTarget.style.borderColor = 'var(--divider)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: 'var(--fg-3)',
                    margin: 0,
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                >
                  {card.label}
                </p>
                <p
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: valColor,
                    margin: '6px 0 4px',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {value}
                </p>
                <p style={{ fontSize: 12, color: 'var(--fg-3)', margin: 0 }}>
                  {sub}
                </p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  backgroundColor: card.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color={card.iconColor as string} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
