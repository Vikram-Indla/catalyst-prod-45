import React, { useEffect, useCallback, useMemo } from 'react';
import type { Resource360Item, Resource360Summary } from '@/types/resource360';
import { getStatusCategory, WH_HUB_COLORS } from '@/types/resource360';

interface Props {
  items: Resource360Item[];
  summary: Resource360Summary | null;
  resourceName: string;
  isOpen: boolean;
  onClose: () => void;
}

/* ═══════════════════════════════════════
   DESIGN TOKENS — V7 spec
   ═══════════════════════════════════════ */
const PURPLE = '#7C3AED';
const PRIMARY = '#2563EB';
const TEAL = '#0D9488';
const WARNING = '#D97706';
const DANGER = '#DC2626';
const SUCCESS = '#059669';
const TEXT_PRIMARY = '#0F172A';
const TEXT_SECONDARY = '#334155';
const TEXT_MUTED = '#475569';
const SURFACE_ALT = '#F1F5F9';
const BORDER_LIGHT = '#CBD5E1';
const BG = '#F8FAFC';

const HUB_TOKEN: Record<string, string> = {
  StrategyHub: '#0EA5E9', ProductHub: '#7C3AED', ProjectHub: '#2563EB',
  ReleaseHub: '#0D9488', TestHub: '#D97706', IncidentHub: '#DC2626', TaskHub: '#4F46E5',
};

const STATUS_CAT_COLORS = {
  todo: { c: DANGER, bg: '#FEE2E2', border: '#FCA5A5' },
  progress: { c: PRIMARY, bg: '#DBEAFE', border: '#93C5FD' },
  done: { c: SUCCESS, bg: '#D1FAE5', border: '#6EE7B7' },
};

const TYPE_BAR_COLORS: Record<string, string> = {
  Story: PRIMARY, Subtask: PRIMARY, Feature: PRIMARY,
  Bug: DANGER, 'QA Bug': DANGER,
  'Test Case': WARNING, Task: '#4F46E5',
  Incident: DANGER, Epic: TEAL, Initiative: '#0EA5E9',
  Release: TEAL,
};

/**
 * AI Intelligence Panel — V7 spec compliant.
 * Light-mode, prose-first, executive-grade intelligence report.
 */
export function Resource360AIPanel({ items, summary, resourceName, isOpen, onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  // ═══ COMPUTED ANALYTICS ═══
  const analytics = useMemo(() => {
    const total = items.length;
    const todoItems = items.filter(i => getStatusCategory(i.status, i.status_category) === 'todo');
    const progressItems = items.filter(i => getStatusCategory(i.status, i.status_category) === 'progress');
    const doneItems = items.filter(i => getStatusCategory(i.status, i.status_category) === 'done');

    const byHub: Record<string, { count: number; done: number; totalAge: number }> = {};
    items.forEach(item => {
      const hub = item.hub ?? 'Other';
      if (!byHub[hub]) byHub[hub] = { count: 0, done: 0, totalAge: 0 };
      byHub[hub].count++;
      byHub[hub].totalAge += item.age_days;
      if (getStatusCategory(item.status, item.status_category) === 'done') byHub[hub].done++;
    });

    const hubDist = Object.entries(byHub)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([hub, data]) => ({
        hub,
        color: HUB_TOKEN[hub] ?? '#64748B',
        pct: total > 0 ? Math.round((data.count / total) * 100) : 0,
        items: data.count,
        closureRate: data.count > 0 ? Math.round((data.done / data.count) * 100) : 0,
        avgAge: data.count > 0 ? (data.totalAge / data.count).toFixed(1) + 'd' : '—',
      }));

    const byType: Record<string, number> = {};
    items.forEach(item => { byType[item.item_type] = (byType[item.item_type] ?? 0) + 1; });
    const typeDist = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));

    const byAssigner: Record<string, number> = {};
    items.forEach(item => {
      const name = item.assigner_name ?? 'Unknown';
      byAssigner[name] = (byAssigner[name] ?? 0) + 1;
    });
    const assignerDist = Object.entries(byAssigner).sort((a, b) => b[1] - a[1]);

    const avgAgeDone = doneItems.length > 0
      ? (doneItems.reduce((s, i) => s + i.age_days, 0) / doneItems.length).toFixed(1) : '—';
    const avgAgeProgress = progressItems.length > 0
      ? (progressItems.reduce((s, i) => s + i.age_days, 0) / progressItems.length).toFixed(1) : '—';
    const totalAge = total > 0
      ? (items.reduce((s, i) => s + i.age_days, 0) / total).toFixed(1) : '0';

    const closureRate = total > 0 ? Math.round((doneItems.length / total) * 100) : 0;

    const overdueItems = items.filter(i =>
      getStatusCategory(i.status, i.status_category) !== 'done' && i.age_days > 14
    ).sort((a, b) => b.age_days - a.age_days);

    const criticalPath = items
      .filter(i => getStatusCategory(i.status, i.status_category) === 'progress')
      .filter(i => ['Critical', 'Highest', 'High'].includes(i.priority))
      .sort((a, b) => b.age_days - a.age_days)
      .slice(0, 4);

    const weeklyCounts: number[] = [];
    const now = Date.now();
    for (let w = 11; w >= 0; w--) {
      const weekStart = now - (w + 1) * 7 * 86400000;
      const weekEnd = now - w * 7 * 86400000;
      const count = doneItems.filter(i => {
        const d = new Date(i.assigned_at).getTime();
        return d >= weekStart && d < weekEnd;
      }).length;
      weeklyCounts.push(count);
    }
    const avgWeekly = weeklyCounts.reduce((a, b) => a + b, 0) / 12;

    const releaseName = items.find(i => i.release_name)?.release_name ?? 'Current Release';
    const releaseEnd = items.find(i => i.release_end_date)?.release_end_date ?? '2026-03-30';
    const releaseDaysLeft = Math.max(0, Math.ceil((new Date(releaseEnd).getTime() - now) / 86400000));

    const primaryHub = hubDist[0]?.hub ?? 'ProjectHub';
    const primaryHubPct = hubDist[0]?.pct ?? 0;
    const primaryHubItems = hubDist[0]?.items ?? 0;

    const byProject: Record<string, { total: number; done: number }> = {};
    items.forEach(item => {
      const proj = item.project_name ?? 'Unassigned';
      if (!byProject[proj]) byProject[proj] = { total: 0, done: 0 };
      byProject[proj].total++;
      if (getStatusCategory(item.status, item.status_category) === 'done') byProject[proj].done++;
    });

    return {
      total, todoItems, progressItems, doneItems,
      hubDist, typeDist, assignerDist,
      avgAgeDone, avgAgeProgress, totalAge,
      closureRate, overdueItems, criticalPath,
      weeklyCounts, avgWeekly,
      releaseName, releaseEnd, releaseDaysLeft,
      primaryHub, primaryHubPct, primaryHubItems,
      byProject,
    };
  }, [items]);

  if (!isOpen) return null;

  const a = analytics;
  const role = summary?.role ?? 'Developer';
  const dept = summary?.department ?? 'Delivery';
  const initials = resourceName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Donut chart calculations
  const donutR = 58;
  const donutC = 2 * Math.PI * donutR;
  const donePct = a.total > 0 ? a.doneItems.length / a.total : 0;
  const progPct = a.total > 0 ? a.progressItems.length / a.total : 0;

  const isAtRisk = a.closureRate < 60 || a.overdueItems.length > 3;
  const confidenceScore = Math.min(100, Math.max(20,
    Math.round(a.closureRate * 0.6 + (100 - a.overdueItems.length * 8) * 0.4)
  ));

  const weeklyMax = Math.max(...a.weeklyCounts, 1);

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 998,
          background: 'rgba(15,23,42,.6)', backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 220,
        zIndex: 999, background: BG, overflowY: 'auto',
        animation: 'aiSlideIn 300ms ease-out forwards',
      }}>
        {/* ═══ STICKY HEADER ═══ */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10, background: '#fff',
          borderBottom: `2.5px solid ${PURPLE}`,
          padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{
            background: `linear-gradient(135deg, ${PURPLE}, #9333EA)`,
            color: '#fff', fontSize: 10, fontWeight: 800,
            padding: '4px 10px', borderRadius: 4, letterSpacing: '.06em',
            display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            ✦ AI INTELLIGENCE
          </span>

          <span style={{ fontSize: 14, fontWeight: 700, color: TEXT_PRIMARY }}>
            Resource Intelligence Profile
          </span>

          <button
            onClick={() => window.print()}
            style={{
              marginLeft: 'auto', padding: '6px 14px',
              fontSize: 11, fontWeight: 700, color: TEXT_SECONDARY,
              background: '#fff', border: `1.5px solid ${BORDER_LIGHT}`,
              borderRadius: 6, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            📤 Export PDF
          </button>

          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', fontSize: 18,
              color: '#94A3B8', cursor: 'pointer', padding: '4px 8px',
            }}
          >
            ✕
          </button>
        </div>

        {/* ═══ CONTENT ═══ */}
        <div style={{ padding: '24px 28px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ═══ PROFILE CARD ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: '#fff', borderRadius: 12, padding: '16px 20px',
            border: `1px solid ${BORDER_LIGHT}`,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: `linear-gradient(135deg, ${PURPLE}, #9333EA)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 18, fontWeight: 800,
              overflow: 'hidden', flexShrink: 0,
            }}>
              {summary?.avatar_url ? (
                <img src={summary.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY }}>{resourceName}</div>
              <div style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 2 }}>{role} · {dept}</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  `Total Items: ${a.total}`,
                  `Closure Rate: ${a.closureRate}%`,
                  `Primary Hub: ${a.primaryHub.replace('Hub', '')}`,
                  `Avg Age: ${a.totalAge}d`,
                ].map((s, i) => (
                  <span key={i} style={{
                    fontSize: 10, fontWeight: 600, color: TEXT_SECONDARY,
                    background: SURFACE_ALT, padding: '3px 8px', borderRadius: 4,
                  }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ SECTION 1: RESOURCE PATTERN ═══ */}
          <Section icon="📋" iconBg="#DBEAFE" iconColor={PRIMARY} title="Resource Pattern">
            <div style={{ fontSize: 13, lineHeight: 1.7, color: TEXT_SECONDARY }}>
              <strong style={{ color: TEXT_PRIMARY }}>{resourceName}</strong> serves as a <strong>{role}</strong> in the <strong>{dept}</strong> department.
              Over the current quarter, they have been assigned <BlueLink>{a.total} work items</BlueLink> and
              completed <BlueLink>{a.doneItems.length}</BlueLink> ({a.closureRate}% closure rate).
              Their primary operational hub is <strong>{a.primaryHub.replace('Hub', '')}</strong> ({a.primaryHubPct}%, {a.primaryHubItems} items)
              {a.hubDist.length > 1 && (<>, with secondary contributions to{' '}
                {a.hubDist.slice(1, 3).map((h, i) => (
                  <span key={h.hub}>
                    {i > 0 && ' and '}
                    <strong>{h.hub.replace('Hub', '')}</strong> ({h.pct}%, {h.items} items)
                  </span>
                ))}
              </>)}.
              <br /><br />
              The items currently in their backlog include{' '}
              <span style={{ color: STATUS_CAT_COLORS.todo.c, fontWeight: 600 }}>{a.todoItems.length} To Do</span>,{' '}
              <span style={{ color: STATUS_CAT_COLORS.progress.c, fontWeight: 600 }}>{a.progressItems.length} In Progress</span>, and{' '}
              <span style={{ color: STATUS_CAT_COLORS.done.c, fontWeight: 600 }}>{a.doneItems.length} completed</span>.
              {a.overdueItems.length > 0 && (<>
                {' '}Notable attention items: <span style={{ color: DANGER, fontWeight: 600 }}>{a.overdueItems.length} items</span> exceed the 14-day age threshold, with the oldest at {a.overdueItems[0]?.age_days}d (<BlueLink>{a.overdueItems[0]?.item_key}</BlueLink>).
              </>)}
            </div>
          </Section>

          {/* ═══ SECTION 2: DELIVERY PATTERN ═══ */}
          <Section icon="📊" iconBg="#EDE9FE" iconColor={PURPLE} title="Delivery Pattern">
            {/* 4 Metric cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
              <MetricCard value={String(a.total)} label="Total Assigned" color={PRIMARY} trend={`${a.hubDist.length} hubs`} trendColor={TEXT_MUTED} />
              <MetricCard value={String(a.doneItems.length)} label="Completed" color={SUCCESS} trend={`${a.avgAgeDone}d avg`} trendColor={SUCCESS} />
              <MetricCard value={`${a.closureRate}%`} label="Closure Rate" color={a.closureRate >= 60 ? SUCCESS : DANGER}
                trend={a.closureRate >= 70 ? '→ Strong' : a.closureRate >= 40 ? '→ Moderate' : '↓ Low'}
                trendColor={a.closureRate >= 70 ? SUCCESS : WARNING} />
              <MetricCard value={`${a.totalAge}d`} label="Avg Item Age" color={Number(a.totalAge) > 20 ? WARNING : PRIMARY}
                trend={Number(a.totalAge) > 20 ? '↑ High' : '→ Normal'} trendColor={Number(a.totalAge) > 20 ? WARNING : SUCCESS} />
            </div>

            {/* Weekly closures bar chart */}
            <div style={{
              background: SURFACE_ALT, borderRadius: 8, padding: 14,
              border: `1px solid ${BORDER_LIGHT}`, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: TEXT_PRIMARY }}>Weekly Closures (12 weeks)</span>
                <span style={{ fontSize: 10, color: TEXT_MUTED }}>Avg: {a.avgWeekly.toFixed(1)} closures/week</span>
              </div>
              <div style={{ display: 'flex', gap: 4, height: 60, alignItems: 'flex-end' }}>
                {a.weeklyCounts.map((v, i) => (
                  <div key={i} style={{
                    flex: 1, height: `${(v / weeklyMax) * 100}%`, minHeight: 2,
                    background: v >= a.avgWeekly ? PRIMARY : '#BFDBFE',
                    borderRadius: '2px 2px 0 0', transition: 'height .3s',
                  }} title={`Week ${i + 1}: ${v} items`} />
                ))}
              </div>
            </div>

            {/* Hub Contribution */}
            <div style={{ background: '#fff', borderRadius: 8, padding: 14, border: `1px solid ${BORDER_LIGHT}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 10px' }}>Hub Contribution</p>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(a.hubDist.length, 7)}, 1fr)`, gap: 8 }}>
                {a.hubDist.slice(0, 7).map(h => (
                  <div key={h.hub} style={{
                    textAlign: 'center', padding: '8px 4px',
                    borderTop: `3px solid ${h.color}`, borderRadius: 6,
                    background: SURFACE_ALT,
                  }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED, marginBottom: 4, textTransform: 'uppercase' }}>
                      {h.hub.replace('Hub', '')}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: h.color }}>{h.pct}%</div>
                    <div style={{ fontSize: 9, color: TEXT_MUTED }}>{h.items} items</div>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══ SECTION 3: ROLE EXPECTATION VS ACTUAL ═══ */}
          <Section icon="🎯" iconBg="#CCFBF1" iconColor={TEAL} title="Role Expectation vs Actual">
            {/* Hub indicators */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(a.hubDist.length, 7)}, 1fr)`, gap: 8, marginBottom: 16 }}>
              {a.hubDist.slice(0, 7).map(h => (
                <div key={h.hub} style={{
                  textAlign: 'center', padding: '6px 4px',
                  background: SURFACE_ALT, borderRadius: 6,
                  borderLeft: `3px solid ${h.color}`,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED }}>{h.hub.replace('Hub', '')}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: h.color }}>{h.pct}%</div>
                  <div style={{ fontSize: 9, color: TEXT_MUTED }}>{h.items} items</div>
                </div>
              ))}
            </div>

            {/* 2-column */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: SURFACE_ALT, borderRadius: 8, padding: 14, border: `1px solid ${BORDER_LIGHT}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 10px' }}>Expected ({role})</p>
                <div style={{ fontSize: 12, color: TEXT_SECONDARY, lineHeight: 2 }}>
                  <div>✓ Close assigned work items</div>
                  <div>✓ Fix Bugs & Defects</div>
                  <div>✓ Resolve assigned Incidents</div>
                  <div>○ Occasional Task completion</div>
                  <div>✗ Not expected to create Epics/Initiatives</div>
                </div>
              </div>

              <div style={{ background: SURFACE_ALT, borderRadius: 8, padding: 14, border: `1px solid ${BORDER_LIGHT}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 10px' }}>Actual Work Distribution</p>
                {a.typeDist.map(t => (
                  <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#E2E8F0' }}>
                      <div style={{
                        height: '100%', borderRadius: 4, width: `${t.pct}%`,
                        background: TYPE_BAR_COLORS[t.type] ?? '#64748B',
                        transition: 'width .3s',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: TEXT_PRIMARY, width: 30, textAlign: 'right' }}>{t.pct}%</span>
                    <span style={{ fontSize: 10, color: TEXT_MUTED, width: 70 }}>{t.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </Section>

          {/* ═══ SECTION 4: BEHAVIORAL PATTERN ═══ */}
          <Section icon="🧠" iconBg="#EDE9FE" iconColor={PURPLE} title="Evidence-Based Behavioral Pattern"
            subtitle={<span>Based on {a.total} items this quarter</span>}>
            <PatternRow>
              Average item age is <strong>{a.totalAge} days</strong>.
              {Number(a.totalAge) < 20
                ? ' This is within acceptable thresholds for the team.'
                : ' This exceeds the 20-day team threshold — review oldest items.'}
            </PatternRow>
            <PatternRow>
              <strong>{a.closureRate}%</strong> closure rate this quarter.
              {a.closureRate >= 70 ? ' Strong execution velocity.' :
               a.closureRate >= 40 ? ' Moderate throughput — some items may need attention.' :
               ' Low completion rate. Review workload and blockers.'}
            </PatternRow>
            {a.assignerDist.length > 0 && (
              <PatternRow>
                Primary work source: <strong>{a.assignerDist[0][0]}</strong> ({a.assignerDist[0][1]} items, {a.total > 0 ? Math.round((a.assignerDist[0][1] / a.total) * 100) : 0}% of total).
                {a.assignerDist.length > 1 && (<> Secondary: <strong>{a.assignerDist[1][0]}</strong> ({a.assignerDist[1][1]} items).</>)}
              </PatternRow>
            )}
            <PatternRow>
              Hub concentration: <strong>{a.primaryHub.replace('Hub', '')}</strong> at {a.primaryHubPct}%.
              {a.primaryHubPct > 80 ? ' Single-hub concentration risk — no cross-hub diversification.' :
               a.primaryHubPct > 50 ? ' Moderate concentration with some cross-hub activity.' :
               ' Well-distributed across multiple hubs.'}
            </PatternRow>
            {a.overdueItems.length > 0 && (
              <PatternRow>
                <span style={{ color: DANGER, fontWeight: 600 }}>{a.overdueItems.length} items</span> exceed 14-day threshold. Oldest: <BlueLink>{a.overdueItems[0]?.item_key}</BlueLink> at {a.overdueItems[0]?.age_days}d.
                Evidence: {a.overdueItems.slice(0, 4).map(i => i.item_key).join(', ')}
              </PatternRow>
            )}
            <PatternRow>
              Context switching: active across <strong>{Object.keys(a.byProject).length}</strong> project{Object.keys(a.byProject).length !== 1 ? 's' : ''} and <strong>{a.hubDist.length}</strong> hub{a.hubDist.length !== 1 ? 's' : ''}.
            </PatternRow>

            <div style={{
              marginTop: 12, padding: '8px 12px', borderRadius: 6,
              background: '#FFFBEB', border: '1px solid #FDE68A',
              fontSize: 11, color: '#92400E', fontStyle: 'italic',
            }}>
              ⓘ Pattern based on system data only. Context such as leave, meetings, and external factors is not captured.
            </div>
          </Section>

          {/* ═══ SECTION 5: CURRENT RELEASE STANDING ═══ */}
          <Section icon="🚀" iconBg="#DBEAFE" iconColor={PRIMARY} title="Current Release Standing">
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 16 }}>
              {/* Left: Donut */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 160, height: 160 }}>
                  <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%' }}>
                    <circle cx="80" cy="80" r={donutR} fill="none" stroke="#F1F5F9" strokeWidth="16" />
                    <circle cx="80" cy="80" r={donutR} fill="none" stroke={SUCCESS} strokeWidth="16"
                      strokeDasharray={`${donePct * donutC} ${donutC}`}
                      strokeDashoffset={donutC * 0.25}
                      strokeLinecap="round" style={{ transition: 'stroke-dasharray .5s' }} />
                    <circle cx="80" cy="80" r={donutR} fill="none" stroke={PRIMARY} strokeWidth="16"
                      strokeDasharray={`${progPct * donutC} ${donutC}`}
                      strokeDashoffset={donutC * 0.25 - donePct * donutC}
                      strokeLinecap="round" style={{ transition: 'stroke-dasharray .5s' }} />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: TEXT_PRIMARY }}>{a.closureRate}%</div>
                    <div style={{ fontSize: 10, color: TEXT_MUTED }}>Complete</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  {([
                    { label: 'DONE', count: a.doneItems.length, c: SUCCESS },
                    { label: 'IN PROGRESS', count: a.progressItems.length, c: PRIMARY },
                    { label: 'TO DO', count: a.todoItems.length, c: DANGER },
                  ] as const).map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: s.c }}>{s.count}</div>
                      <div style={{ fontSize: 8, fontWeight: 700, color: TEXT_MUTED, letterSpacing: '.04em' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Critical Path + Per-Project */}
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, margin: '0 0 8px' }}>Critical Path Items</p>

                {a.criticalPath.length > 0 ? a.criticalPath.map(item => (
                  <div key={item.work_item_id} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                    background: '#FEF2F2', borderRadius: 6, marginBottom: 4,
                    border: '1px solid #FECACA', fontSize: 11,
                  }}>
                    <span style={{ color: DANGER, fontWeight: 700, flexShrink: 0 }}>{item.item_key}</span>
                    <span style={{ color: TEXT_MUTED, fontSize: 9, flexShrink: 0 }}>{item.item_type}</span>
                    <span style={{ color: TEXT_SECONDARY, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                    <span style={{ color: DANGER, fontWeight: 700, flexShrink: 0 }}>{item.age_days}d</span>
                  </div>
                )) : (
                  <div style={{ fontSize: 11, color: TEXT_MUTED, padding: '8px 0' }}>No critical path items detected</div>
                )}

                <p style={{ fontSize: 12, fontWeight: 700, color: TEXT_PRIMARY, margin: '16px 0 8px' }}>Per-Project Standing</p>

                {Object.entries(a.byProject).map(([proj, data]) => {
                  const pct = data.total > 0 ? Math.round((data.done / data.total) * 100) : 0;
                  const emoji = pct >= 70 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
                  return (
                    <div key={proj} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: TEXT_SECONDARY, fontWeight: 600 }}>{proj}</span>
                        <span>{emoji}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 3, background: '#E2E8F0' }}>
                          <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: pct >= 70 ? SUCCESS : pct >= 40 ? WARNING : DANGER, transition: 'width .3s' }} />
                        </div>
                        <span style={{ fontSize: 10, color: TEXT_MUTED }}>{data.done}/{data.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* VERDICT BOX */}
            <div style={{
              borderRadius: 8, overflow: 'hidden',
              border: `1.5px solid ${isAtRisk ? '#F59E0B' : SUCCESS}`,
            }}>
              <div style={{
                padding: '10px 16px', fontWeight: 800, fontSize: 12,
                background: isAtRisk
                  ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                  : 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                color: isAtRisk ? '#92400E' : '#065F46',
              }}>
                {isAtRisk ? '⚠' : '✓'} RELEASE STANDING: {isAtRisk ? 'AT RISK' : 'ON TRACK'}
              </div>
              <div style={{ padding: '10px 16px', fontSize: 12, color: TEXT_SECONDARY, background: '#fff', lineHeight: 1.6 }}>
                Current closure rate of <strong>{a.closureRate}%</strong> with{' '}
                {a.todoItems.length + a.progressItems.length} remaining items and{' '}
                {a.releaseDaysLeft} days until release end.
                {a.overdueItems.length > 0 && (<> {a.overdueItems.length} items exceed the age threshold.</>)}
                {a.criticalPath.length > 0 && (<> Critical path: {a.criticalPath.map(i => i.item_key).join(', ')}.</>)}
              </div>
              <div style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: TEXT_MUTED, background: SURFACE_ALT, borderTop: `1px solid ${BORDER_LIGHT}` }}>
                Confidence: {confidenceScore}/100
              </div>
            </div>
          </Section>

          {/* ═══ SECTION 6: HUB CLOSURE PERFORMANCE ═══ */}
          <Section icon="📈" iconBg="#CCFBF1" iconColor={TEAL} title="Hub Closure Performance">
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(a.hubDist.length, 7)}, 1fr)`, gap: 8 }}>
              {a.hubDist.slice(0, 7).map(h => (
                <div key={h.hub} style={{
                  textAlign: 'center', padding: '12px 8px',
                  background: '#fff', borderRadius: 8,
                  border: `1px solid ${BORDER_LIGHT}`,
                  borderTop: `3px solid ${h.color}`,
                }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: TEXT_MUTED, textTransform: 'uppercase', marginBottom: 6 }}>
                    {h.hub.replace('Hub', '')}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: h.closureRate >= 70 ? SUCCESS : h.closureRate >= 40 ? WARNING : DANGER }}>
                    {h.closureRate}%
                  </div>
                  <div style={{ fontSize: 9, color: TEXT_MUTED, marginTop: 2 }}>
                    closure · {h.avgAge}
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ═══ FOOTER ═══ */}
          <div style={{
            textAlign: 'center', padding: '20px 0 32px',
            fontSize: 10, color: '#94A3B8', lineHeight: 1.8,
          }}>
            <span style={{ color: PURPLE }}>✦</span>{' '}
            Generated: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            {' '} · Next Refresh: Tomorrow ·{' '}
            <strong>Catalyst AI Intelligence Engine v2.0</strong>
            <br />
            Executive Export available via 📤 Export PDF button above
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aiSlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

/* ─── Sub-components ─── */

function Section({ icon, iconBg, iconColor, title, subtitle, children }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; subtitle?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '16px 20px',
      border: `1px solid ${BORDER_LIGHT}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{
          width: 28, height: 28, borderRadius: 6,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14,
        }}>
          {icon}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT_PRIMARY }}>{title}</span>
        {subtitle && (
          <span style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: 'auto' }}>{subtitle}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function MetricCard({ value, label, color, trend, trendColor }: {
  value: string; label: string; color: string; trend: string; trendColor: string;
}) {
  return (
    <div style={{
      background: SURFACE_ALT, borderRadius: 8, padding: '12px 14px',
      border: `1px solid ${BORDER_LIGHT}`, textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 9, color: trendColor, fontWeight: 600, marginTop: 4 }}>{trend}</div>
    </div>
  );
}

function PatternRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8, fontSize: 12, color: TEXT_SECONDARY, lineHeight: 1.6 }}>
      <span style={{ color: PURPLE, fontSize: 8, marginTop: 5, flexShrink: 0 }}>●</span>
      <div>{children}</div>
    </div>
  );
}

function BlueLink({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ color: PRIMARY, fontWeight: 600, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#93C5FD' }}>
      {children}
    </span>
  );
}
