/**
 * GoalsStatsStrip — 5-card horizontal stats computed from goals + KRs
 * ECLIPSE D8: Dark mode parity
 */
import { Target, CheckCircle2, Activity, BarChart3, AlertTriangle } from 'lucide-react';
import type { Goal, KeyResult } from '@/types/goals';

interface GoalsStatsStripProps {
  goals: Goal[];
  keyResults: KeyResult[];
  themes?: { id: string }[];
  isDark?: boolean;
}

const DK = {
  t1: 'var(--cp-t1)',
  t2: 'var(--cp-t2)',
  t3: 'var(--cp-t3)',
  border: 'rgba(248,244,240,0.10)',
  cardBg: 'transparent',
};

export function GoalsStatsStripSkeleton({ isDark = false }: { isDark?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="ph-shimmer"
          style={{
            background: isDark ? 'rgba(248,244,240,0.04)' : '#F1F5F9',
            border: `1px solid ${isDark ? DK.border : '#E2E8F0'}`,
            borderRadius: 12,
            height: 96,
          }}
        />
      ))}
      <style>{`
        @keyframes phShimmer { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
        .ph-shimmer { animation: phShimmer 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export function GoalsStatsStrip({ goals, keyResults, themes, isDark = false }: GoalsStatsStripProps) {
  const totalGoals = goals.length;
  const onTrackGoals = goals.filter(g => ['active', 'on_track'].includes(g.status) && (g.progress_pct || 0) >= 60).length;
  const onTrackPct = totalGoals > 0 ? Math.round((onTrackGoals / totalGoals) * 100) : 0;
  const avgProgress = totalGoals > 0 ? Math.round(goals.reduce((s, g) => s + (g.progress_pct || 0), 0) / totalGoals) : 0;
  const totalKRs = keyResults.length;
  const krsPerGoal = totalGoals > 0 ? (totalKRs / totalGoals).toFixed(1) : '0';
  const today = new Date().toISOString().split('T')[0];
  const overdueKRs = keyResults.filter(kr => kr.due_date && kr.due_date < today && kr.status !== 'completed').length;
  const uniqueThemes = themes?.length ?? new Set(goals.map(g => g.theme_id)).size;

  const cards = [
    { label: 'Total Goals', value: totalGoals, icon: Target, iconBg: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', iconColor: '#2563EB', sub: `across ${uniqueThemes} themes` },
    { label: 'On Track', value: `${onTrackPct}%`, icon: CheckCircle2, iconBg: isDark ? 'rgba(22,163,74,0.12)' : '#DCFCE7', iconColor: '#16A34A', sub: `${onTrackGoals} of ${totalGoals} goals` },
    { label: 'Avg Progress', value: `${avgProgress}%`, icon: Activity, iconBg: isDark ? 'rgba(217,119,6,0.12)' : '#FEF3C7', iconColor: '#D97706', sub: `${100 - avgProgress}% to target` },
    { label: 'Total KRs', value: totalKRs, icon: BarChart3, iconBg: isDark ? 'rgba(124,58,237,0.12)' : '#EDE9FE', iconColor: '#7C3AED', sub: `~${krsPerGoal} per goal` },
    { label: 'Overdue KRs', value: overdueKRs, icon: AlertTriangle, iconBg: isDark ? (overdueKRs > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(248,244,240,0.04)') : (overdueKRs > 0 ? '#FEE2E2' : '#F1F5F9'), iconColor: overdueKRs > 0 ? '#EF4444' : '#94A3B8', sub: overdueKRs > 0 ? 'needs attention' : 'all on schedule' },
  ];

  return (
    <div className="goals-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
      {cards.map(card => (
        <div
          key={card.label}
          style={{
            background: isDark ? 'transparent' : '#FFFFFF',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
            borderRadius: 12,
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            boxShadow: 'none',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: 10, background: card.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <card.icon size={18} color={card.iconColor} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? DK.t2 : '#64748B', marginBottom: 4 }}>
              {card.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: isDark ? DK.t1 : '#0F172A', lineHeight: 1.2 }}>
              {card.value}
            </div>
            <div style={{ fontSize: 12, color: isDark ? DK.t3 : '#94A3B8', marginTop: 2 }}>{card.sub}</div>
          </div>
        </div>
      ))}
      <style>{`
        @media (max-width: 1279px) { .goals-stats-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 767px) { .goals-stats-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  );
}
