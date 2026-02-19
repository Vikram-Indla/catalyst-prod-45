/**
 * ThemeStatsStrip — 5 KPI cards computed from live theme data
 */
import { TrendingUp, TrendingDown, Target, DollarSign, AlertTriangle, Layers } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategic-themes';
import { formatBudget, deriveHealthStatus } from './theme-utils';

interface Props { themes: StrategicTheme[] }

export function ThemeStatsStrip({ themes }: Props) {
  const active = themes.filter(t => t.status === 'active');
  const avgProgress = themes.length ? Math.round(themes.reduce((s, t) => s + (t.progress_pct || 0), 0) / themes.length) : 0;
  const totalGoals = themes.reduce((s, t) => s + (t.goal_count || 0), 0);
  const totalBudget = themes.reduce((s, t) => s + (t.planned_budget || 0), 0);

  // Count active themes that are at risk or off track
  const atRiskCount = themes.filter(t => {
    if (t.status !== 'active') return false;
    const h = deriveHealthStatus(t);
    return h === 'at_risk' || h === 'off_track';
  }).length;

  const target = 55;
  const progressDelta = avgProgress - target;

  const cards = [
    {
      label: 'Active Themes',
      value: active.length,
      sub: `${themes.length} total`,
      icon: Layers,
      iconColor: '#2563EB',
      iconBg: '#DBEAFE',
    },
    {
      label: 'Avg. Progress',
      value: `${avgProgress}%`,
      sub: `${progressDelta >= 0 ? '↑' : '↓'} ${Math.abs(progressDelta)}% vs target`,
      icon: progressDelta >= 0 ? TrendingUp : TrendingDown,
      iconColor: progressDelta >= 0 ? '#16A34A' : '#DC2626',
      iconBg: progressDelta >= 0 ? '#DCFCE7' : '#FEE2E2',
      subColor: progressDelta >= 0 ? '#16A34A' : '#DC2626',
    },
    {
      label: 'Total Goals',
      value: totalGoals,
      sub: themes.length ? `~${Math.round(totalGoals / themes.length)} per theme` : '—',
      icon: Target,
      iconColor: '#0D9488',
      iconBg: '#CCFBF1',
    },
    {
      label: 'Total Budget (SAR)',
      value: formatBudget(totalBudget),
      sub: 'FY2026 planned',
      icon: DollarSign,
      iconColor: '#D97706',
      iconBg: '#FEF3C7',
    },
    {
      label: 'Off Track / At Risk',
      value: atRiskCount,
      sub: atRiskCount > 0 ? 'Needs attention' : 'All healthy',
      icon: AlertTriangle,
      iconColor: atRiskCount > 0 ? '#DC2626' : '#16A34A',
      iconBg: atRiskCount > 0 ? '#FEE2E2' : '#DCFCE7',
      valueColor: atRiskCount > 0 ? '#DC2626' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3" style={{ marginBottom: 16 }}>
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-lg border"
          style={{
            background: '#FFFFFF',
            borderColor: '#E2E8F0',
            padding: '14px 16px',
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <p style={{ fontSize: 11, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>{c.label}</p>
              <p style={{
                fontSize: 22, fontWeight: 700, color: c.valueColor || '#0F172A',
                lineHeight: 1.1, marginBottom: 2,
              }}>{c.value}</p>
              <p style={{ fontSize: 11, color: (c as any).subColor || '#94A3B8' }}>{c.sub}</p>
            </div>
            <div
              className="rounded-lg flex items-center justify-center shrink-0"
              style={{ width: 36, height: 36, background: c.iconBg }}
            >
              <c.icon size={18} color={c.iconColor} strokeWidth={1.8} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
