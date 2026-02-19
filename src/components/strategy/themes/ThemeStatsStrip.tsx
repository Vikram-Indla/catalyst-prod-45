/**
 * ThemeStatsStrip — 5 KPI cards with enterprise visual hierarchy
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

  const atRiskCount = themes.filter(t => {
    if (t.status !== 'active') return false;
    const h = deriveHealthStatus(t);
    return h === 'at_risk' || h === 'off_track';
  }).length;

  const target = 55;
  const progressDelta = avgProgress - target;

  const cards = [
    {
      label: 'ACTIVE THEMES',
      value: active.length,
      sub: `${themes.length} total`,
      icon: Layers,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
    },
    {
      label: 'AVG. PROGRESS',
      value: `${avgProgress}%`,
      sub: `${progressDelta >= 0 ? '↑' : '↓'} ${Math.abs(progressDelta)}% vs target`,
      icon: progressDelta >= 0 ? TrendingUp : TrendingDown,
      iconColor: progressDelta >= 0 ? '#0D9488' : '#DC2626',
      iconBg: progressDelta >= 0 ? '#F0FDFA' : '#FEF2F2',
      subColor: progressDelta >= 0 ? '#0D9488' : '#DC2626',
    },
    {
      label: 'TOTAL GOALS',
      value: totalGoals,
      sub: themes.length ? `~${Math.round(totalGoals / themes.length)} per theme` : '—',
      icon: Target,
      iconColor: '#059669',
      iconBg: '#ECFDF5',
    },
    {
      label: 'TOTAL BUDGET (SAR)',
      value: formatBudget(totalBudget),
      sub: 'FY2026 planned',
      icon: DollarSign,
      iconColor: '#2563EB',
      iconBg: '#EFF6FF',
    },
    {
      label: 'OFF TRACK / AT RISK',
      value: atRiskCount,
      sub: atRiskCount > 0 ? 'Needs attention' : 'All healthy',
      icon: AlertTriangle,
      iconColor: atRiskCount > 0 ? '#DC2626' : '#059669',
      iconBg: atRiskCount > 0 ? '#FEF2F2' : '#ECFDF5',
      valueColor: atRiskCount > 0 ? '#DC2626' : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3" style={{ marginBottom: 16 }}>
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-xl border transition-shadow hover:shadow-md"
          style={{
            background: '#FFFFFF',
            borderColor: '#E2E8F0',
            padding: '16px 18px',
          }}
        >
          <div className="flex items-start justify-between mb-2">
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#94A3B8',
              letterSpacing: '0.5px',
            }}>{c.label}</span>
            <div
              className="rounded-lg flex items-center justify-center shrink-0"
              style={{ width: 28, height: 28, background: c.iconBg }}
            >
              <c.icon size={14} color={c.iconColor} strokeWidth={2} />
            </div>
          </div>
          <p style={{
            fontSize: 26, fontWeight: 800, color: (c as any).valueColor || '#0F172A',
            lineHeight: 1.1, marginBottom: 4, letterSpacing: '-0.5px',
          }}>{c.value}</p>
          <p style={{ fontSize: 11, color: (c as any).subColor || '#94A3B8' }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
