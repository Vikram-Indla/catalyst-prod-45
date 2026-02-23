import React, { useEffect, useCallback, useMemo } from 'react';
import type { Resource360Item } from '@/types/resource360';
import { getStatusCategory, WH_HUB_COLORS } from '@/types/resource360';

interface Props {
  items: Resource360Item[];
  resourceName: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Full-screen AI Intelligence panel.
 * 7 computed insight sections — all client-side (no API calls).
 */
export function Resource360AIPanel({ items, resourceName, isOpen, onClose }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const analytics = useMemo(() => {
    const total = items.length;
    const byStatus = { todo: 0, progress: 0, done: 0 };
    const byHub: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let totalAge = 0;
    let overdueCount = 0;

    items.forEach((item) => {
      const cat = getStatusCategory(item.status, item.status_category);
      if (cat === 'todo') byStatus.todo++;
      else if (cat === 'progress') byStatus.progress++;
      else byStatus.done++;

      byHub[item.hub] = (byHub[item.hub] ?? 0) + 1;
      byPriority[item.priority] = (byPriority[item.priority] ?? 0) + 1;
      totalAge += item.age_days;
      if (item.age_days > 30 && cat !== 'done') overdueCount++;
    });

    const avgAge = total > 0 ? Math.round(totalAge / total) : 0;
    const completionRate = total > 0 ? Math.round((byStatus.done / total) * 100) : 0;
    const velocity = byStatus.done;

    return { total, byStatus, byHub, byPriority, avgAge, overdueCount, completionRate, velocity };
  }, [items]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: '#0F172A', color: '#E2E8F0',
        display: 'flex', flexDirection: 'column',
        animation: 'aiPanelIn 200ms ease-out',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #1E293B' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, color: '#A78BFA' }}>✦</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F1F5F9' }}>
            AI Intelligence — {resourceName}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 20, cursor: 'pointer', padding: '4px 8px' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#fff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#9CA3AF'; }}
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, maxWidth: 1200, margin: '0 auto' }}>

          {/* 1. Workload Distribution */}
          <InsightCard title="Workload Distribution" icon="📊">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Object.entries(analytics.byHub).map(([hub, count]) => {
                const pct = Math.round((count / analytics.total) * 100);
                const color = WH_HUB_COLORS[hub] ?? '#64748B';
                return (
                  <div key={hub}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: '#CBD5E1' }}>{hub}</span>
                      <span style={{ color: '#94A3B8' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: '#1E293B' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: color, width: `${pct}%`, transition: 'width 300ms' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </InsightCard>

          {/* 2. Risk Radar */}
          <InsightCard title="Risk Radar" icon="🎯">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <MetricRow label="Overdue Items (>30d)" value={String(analytics.overdueCount)} color={analytics.overdueCount > 3 ? '#EF4444' : '#D97706'} />
              <MetricRow label="Average Age" value={`${analytics.avgAge}d`} color={analytics.avgAge > 25 ? '#D97706' : '#059669'} />
              <MetricRow label="Total Items" value={String(analytics.total)} color="#60A5FA" />
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, lineHeight: 1.5 }}>
                {analytics.overdueCount > 3
                  ? '🔴 Multiple items exceed 30-day threshold. Review priorities and blockers.'
                  : analytics.overdueCount > 0
                  ? '🟡 Some items aging. Monitor for potential delays.'
                  : '🟢 No significant age risks detected.'}
              </div>
            </div>
          </InsightCard>

          {/* 3. Velocity Insight */}
          <InsightCard title="Velocity Insight" icon="🚀">
            <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#60A5FA', margin: 0 }}>{analytics.velocity}</p>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>Items completed</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: 28, fontWeight: 800, color: '#34D399', margin: 0 }}>{analytics.completionRate}%</p>
                <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>Completion rate</p>
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', lineHeight: 1.5 }}>
              {analytics.completionRate >= 70
                ? '🟢 Strong execution velocity this quarter.'
                : analytics.completionRate >= 40
                ? '🟡 Moderate throughput. Some items may need attention.'
                : '🔴 Low completion rate. Review workload and blockers.'}
            </div>
          </InsightCard>

          {/* 4. Hub Deep Dive */}
          <InsightCard title="Hub Deep Dive" icon="🔍">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(analytics.byHub).sort((a, b) => b[1] - a[1]).map(([hub, count]) => (
                <div key={hub} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: WH_HUB_COLORS[hub] ?? '#64748B' }} />
                    <span style={{ fontSize: 11, color: '#CBD5E1' }}>
                      {hub}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9' }}>{count}</span>
                </div>
              ))}
            </div>
          </InsightCard>

          {/* 5. Priority Matrix */}
          <InsightCard title="Priority Matrix" icon="⚡">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['Highest', 'High', 'Medium', 'Low', 'Lowest'].map((pri) => {
                const count = analytics.byPriority[pri] ?? 0;
                if (count === 0) return null;
                const colors: Record<string, string> = { Highest: '#DC2626', High: '#EF4444', Medium: '#D97706', Low: '#2563EB', Lowest: '#6B7280' };
                return (
                  <div key={pri} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 11 }}>
                    <span style={{ color: colors[pri] }}>{pri}</span>
                    <span style={{ color: '#CBD5E1', fontWeight: 600 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </InsightCard>

          {/* 6. Collaboration Network */}
          <InsightCard title="Collaboration Network" icon="🤝">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(() => {
                const assigners: Record<string, number> = {};
                items.forEach((item) => {
                  const name = item.assigner_name ?? 'Unknown';
                  assigners[name] = (assigners[name] ?? 0) + 1;
                });
                return Object.entries(assigners)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 6)
                  .map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, padding: '3px 0' }}>
                      <span style={{ color: '#CBD5E1' }}>{name}</span>
                      <span style={{ color: '#94A3B8' }}>{count} items</span>
                    </div>
                  ));
              })()}
            </div>
          </InsightCard>

          {/* 7. Recommendations */}
          <InsightCard title="Recommendations" icon="💡" fullWidth>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {analytics.overdueCount > 0 && (
                <RecommendationRow severity="high" text={`${analytics.overdueCount} items exceed 30-day threshold. Prioritize triage and reassignment.`} />
              )}
              {analytics.byStatus.progress > analytics.byStatus.done && (
                <RecommendationRow severity="medium" text="More items in progress than completed. Consider reducing WIP limits." />
              )}
              {analytics.completionRate >= 70 && (
                <RecommendationRow severity="low" text="Strong completion rate. Consider taking on stretch goals." />
              )}
              <RecommendationRow severity="info" text="Review hub distribution for balanced workload across domains." />
            </div>
          </InsightCard>
        </div>
      </div>

      <style>{`
        @keyframes aiPanelIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ─── Sub-components ─── */

function InsightCard({
  title,
  icon,
  children,
  fullWidth = false,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      style={{
        background: '#1E293B',
        borderRadius: 12,
        padding: 16,
        border: '1px solid #334155',
        gridColumn: fullWidth ? '1 / -1' : undefined,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', letterSpacing: '.02em' }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function MetricRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0' }}>
      <span style={{ fontSize: 11, color: '#94A3B8' }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

function RecommendationRow({ severity, text }: { severity: 'high' | 'medium' | 'low' | 'info'; text: string }) {
  const icons: Record<string, string> = { high: '🔴', medium: '🟡', low: '🟢', info: 'ℹ️' };
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 11, color: '#CBD5E1', lineHeight: 1.5 }}>
      <span>{icons[severity]}</span>
      <span>{text}</span>
    </div>
  );
}
