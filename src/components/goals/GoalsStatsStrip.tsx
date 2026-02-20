/**
 * GoalsStatsStrip — 5-card horizontal stats computed from goals + KRs
 */
import { Target, CheckCircle2, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import type { Goal, KeyResult } from '@/types/goals';

interface GoalsStatsStripProps {
  goals: Goal[];
  keyResults: KeyResult[];
  themes?: { id: string }[];
}

export function GoalsStatsStrip({ goals, keyResults, themes }: GoalsStatsStripProps) {
  const totalGoals = goals.length;
  const onTrackGoals = goals.filter(g => ['active', 'completed', 'on_track'].includes(g.status)).length;
  const onTrackPct = totalGoals > 0 ? Math.round((onTrackGoals / totalGoals) * 100) : 0;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress_pct || 0), 0) / totalGoals) : 0;
  const totalKRs = keyResults.length;
  const krsPerGoal = totalGoals > 0 ? (totalKRs / totalGoals).toFixed(1) : '0';
  const today = new Date().toISOString().split('T')[0];
  const overdueKRs = keyResults.filter(kr => kr.due_date && kr.due_date < today && kr.status !== 'completed').length;
  const uniqueThemes = themes?.length ?? new Set(goals.map(g => g.theme_id)).size;

  const cards = [
    {
      label: 'Total Goals',
      value: totalGoals,
      icon: Target,
      iconBg: 'rgba(37,99,235,0.08)',
      iconColor: '#2563EB',
      sub: `across ${uniqueThemes} themes`,
    },
    {
      label: 'On Track',
      value: `${onTrackPct}%`,
      icon: CheckCircle2,
      iconBg: 'rgba(22,163,74,0.08)',
      iconColor: '#16A34A',
      sub: `${onTrackGoals} of ${totalGoals} goals`,
    },
    {
      label: 'Avg Progress',
      value: `${avgProgress}%`,
      icon: Activity,
      iconBg: 'rgba(13,148,136,0.08)',
      iconColor: '#0D9488',
      sub: `${100 - avgProgress}% to target`,
    },
    {
      label: 'Total KRs',
      value: totalKRs,
      icon: BarChart3,
      iconBg: 'rgba(37,99,235,0.08)',
      iconColor: '#2563EB',
      sub: `~${krsPerGoal} per goal`,
    },
    {
      label: 'Overdue KRs',
      value: overdueKRs,
      icon: AlertTriangle,
      iconBg: overdueKRs > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(148,163,184,0.08)',
      iconColor: overdueKRs > 0 ? '#EF4444' : '#94A3B8',
      sub: overdueKRs > 0 ? 'needs attention' : 'all on schedule',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
      {cards.map(card => (
        <div
          key={card.label}
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: card.iconBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <card.icon size={14} color={card.iconColor} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: '10.5px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#94A3B8',
                marginBottom: 2,
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 800,
                letterSpacing: '-0.5px',
                color: '#0F172A',
                lineHeight: 1.1,
              }}
            >
              {card.value}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{card.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
