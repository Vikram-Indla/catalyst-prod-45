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
}

interface Props {
  stats: DashboardStats | null;
}

const CARDS = [
  {
    label: 'Total Test Cases',
    icon: FileText,
    iconBg: 'hsl(217 91% 96%)',
    iconColor: 'hsl(217 91% 60%)',
    getValue: (s: DashboardStats) => s.total_test_cases,
    getSub: (s: DashboardStats) => `${s.total_cycles} cycles total`,
  },
  {
    label: 'Overall Pass Rate',
    icon: TrendingUp,
    iconBg: 'hsl(152 81% 96%)',
    iconColor: 'hsl(160 84% 39%)',
    getValue: (s: DashboardStats) => `${s.overall_pass_rate}%`,
    getSub: (s: DashboardStats) => `${s.total_executed} tests executed`,
    valueColor: 'hsl(160 84% 39%)',
  },
  {
    label: 'Active Cycles',
    icon: Play,
    iconBg: 'hsl(174 62% 96%)',
    iconColor: 'hsl(174 62% 35%)',
    getValue: (s: DashboardStats) => s.active_cycles,
    getSub: (s: DashboardStats) => `${s.completed_cycles} completed`,
  },
  {
    label: 'Blocked Tests',
    icon: AlertTriangle,
    iconBg: 'hsl(48 96% 95%)',
    iconColor: 'hsl(38 92% 50%)',
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
              : 'hsl(var(--foreground))';

        return (
          <div
            key={card.label}
            style={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              padding: '20px 24px',
              cursor: 'default',
              transition: 'box-shadow .15s, border-color .15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = '0 4px 12px hsla(0 0% 0% / .08)';
              e.currentTarget.style.borderColor = 'hsl(var(--border))';
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
                    color: 'hsl(var(--muted-foreground))',
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
                <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', margin: 0 }}>
                  {sub}
                </p>
              </div>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 10,
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
