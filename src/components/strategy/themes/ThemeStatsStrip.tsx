/**
 * ThemeStatsStrip — 5 KPI cards with enterprise visual hierarchy
 * ECLIPSE D8-R4: Dark mode parity
 */
import { TrendingUp, TrendingDown, Target, DollarSign, AlertTriangle, Layers } from 'lucide-react';
import type { StrategicTheme } from '@/types/strategic-themes';
import { formatBudget, deriveHealthStatus, DK } from './theme-utils';

interface Props { themes: StrategicTheme[]; isDark?: boolean }

export function ThemeStatsStrip({ themes, isDark = false }: Props) {
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
      iconColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
      iconBg: 'var(--cp-primary-light, #EFF6FF)',
      cardBg: undefined,
    },
    {
      label: 'AVG. PROGRESS',
      value: `${avgProgress}%`,
      sub: `${progressDelta >= 0 ? '↑' : '↓'} ${Math.abs(progressDelta)}% vs target`,
      icon: progressDelta >= 0 ? TrendingUp : TrendingDown,
      iconColor: progressDelta >= 0 ? '#0D9488' : 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))',
      iconBg: isDark
        ? (progressDelta >= 0 ? 'rgba(13,148,136,0.12)' : 'rgba(220,38,38,0.12)')
        : (progressDelta >= 0 ? '#F0FDFA' : 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))'),
      subColor: progressDelta >= 0 ? '#0D9488' : 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))',
      cardBg: undefined,
    },
    {
      label: 'TOTAL GOALS',
      value: totalGoals,
      sub: themes.length ? `~${Math.round(totalGoals / themes.length)} per theme` : '—',
      icon: Target,
      iconColor: '#059669',
      iconBg: 'var(--cp-success-light, #ECFDF5)',
      cardBg: undefined,
    },
    {
      label: 'TOTAL BUDGET (SAR)',
      value: formatBudget(totalBudget),
      sub: 'FY2026 planned',
      icon: DollarSign,
      iconColor: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))',
      iconBg: 'var(--cp-primary-light, #EFF6FF)',
      cardBg: undefined,
    },
    {
      label: 'OFF TRACK / AT RISK',
      value: atRiskCount,
      sub: atRiskCount > 0 ? 'Needs attention' : 'All healthy',
      icon: AlertTriangle,
      iconColor: atRiskCount > 0 ? 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' : '#059669',
      iconBg: isDark
        ? (atRiskCount > 0 ? 'rgba(220,38,38,0.12)' : 'rgba(5,150,105,0.12)')
        : (atRiskCount > 0 ? 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))' : '#ECFDF5'),
      valueColor: atRiskCount > 0 ? 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))' : undefined,
      cardBg: undefined,
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-3" style={{ marginBottom: 16 }}>
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-xl border border-border bg-white px-[18px] py-4 transition-shadow dark:border-gray-700/50 dark:bg-transparent dark:shadow-none"
          onMouseEnter={e => { if (!isDark) e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = isDark ? 'none' : ''; }}
        >
          <div className="flex items-start justify-between mb-2">
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: isDark ? DK.t2 : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))',
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
            fontSize: 26, fontWeight: 800,
            color: (c as any).valueColor || (isDark ? DK.t1 : 'var(--ds-text, var(--ds-text, #0F172A))'),
            lineHeight: 1.1, marginBottom: 4, letterSpacing: '-0.5px',
          }}>{c.value}</p>
          <p style={{
            fontSize: 11,
            color: (c as any).subColor || (isDark ? DK.t2 : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #94A3B8))'),
          }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}
