import React, { useEffect, useCallback, useMemo } from 'react';
import type { Resource360Item, Resource360Summary } from '@/types/resource360';
import { getStatusCategory, getStaleIndicator } from '@/types/resource360';

interface Props {
  items: Resource360Item[];
  summary: Resource360Summary | null;
  resourceName: string;
  isOpen: boolean;
  onClose: () => void;
}

/* Ring-fenced tokens — warm, high-contrast, NO purple */
const C = {
  bg: '#F5F0EB', surface: '#FFFFFF', text1: '#0A0A0A', text2: '#1A1A2E',
  text3: '#3D3D56', text4: '#6B6B80', border: '#D9D2C9', borderStrong: '#C5BDB3',
  accent: '#1A1A2E', accentLight: '#2D2D4A',
  todo: '#E23636', progress: '#2563EB', done: '#0E8A5F',
  shadow: '0 2px 8px rgba(0,0,0,.12)',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  /* Warm bar colors — NO RED */
  barColors: ['#0D9488', '#1A1A2E', '#4F46E5', '#CA8A04', '#0284C7', '#7C3AED', '#57534E'],
};

export function Resource360AIPanel({ items, summary, resourceName, isOpen, onClose }: Props) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }, [onClose]);
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
      return () => { document.removeEventListener('keydown', handleKeyDown); document.body.style.overflow = ''; };
    }
  }, [isOpen, handleKeyDown]);

  const a = useMemo(() => {
    const total = items.length;
    const todoItems = items.filter(i => getStatusCategory(i.status, i.status_category) === 'todo');
    const progressItems = items.filter(i => getStatusCategory(i.status, i.status_category) === 'progress');
    const doneItems = items.filter(i => getStatusCategory(i.status, i.status_category) === 'done');

    const byHub: Record<string, { count: number; done: number }> = {};
    items.forEach(i => {
      const h = i.hub ?? 'Other';
      if (!byHub[h]) byHub[h] = { count: 0, done: 0 };
      byHub[h].count++;
      if (getStatusCategory(i.status, i.status_category) === 'done') byHub[h].done++;
    });
    const hubDist = Object.entries(byHub)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([hub, d]) => ({
        hub, pct: total > 0 ? Math.round((d.count / total) * 100) : 0,
        items: d.count, closure: d.count > 0 ? Math.round((d.done / d.count) * 100) : 0,
      }));

    const byType: Record<string, number> = {};
    items.forEach(i => { byType[i.item_type] = (byType[i.item_type] ?? 0) + 1; });
    const typeDist = Object.entries(byType)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }));

    const byAssigner: Record<string, number> = {};
    items.forEach(i => { const n = i.assigner_name ?? 'Unknown'; byAssigner[n] = (byAssigner[n] ?? 0) + 1; });
    const assignerDist = Object.entries(byAssigner).sort((a, b) => b[1] - a[1]);

    const closureRate = total > 0 ? Math.round((doneItems.length / total) * 100) : 0;
    const avgAge = total > 0 ? (items.reduce((s, i) => s + i.age_days, 0) / total).toFixed(1) : '0';

    const overdueItems = items
      .filter(i => getStatusCategory(i.status, i.status_category) !== 'done' && i.age_days > 14)
      .sort((a, b) => b.age_days - a.age_days);

    const criticalPath = items
      .filter(i => getStatusCategory(i.status, i.status_category) === 'progress')
      .filter(i => ['Critical', 'Highest', 'High'].includes(i.priority))
      .sort((a, b) => b.age_days - a.age_days).slice(0, 4);

    const releaseName = items.find(i => i.release_name)?.release_name ?? 'Current Release';
    const releaseEnd = items.find(i => i.release_end_date)?.release_end_date ?? '2026-03-30';
    const releaseDaysLeft = Math.max(0, Math.ceil((new Date(releaseEnd).getTime() - Date.now()) / 86400000));

    const byProject: Record<string, { total: number; done: number }> = {};
    items.forEach(i => {
      const p = i.project_name ?? 'Unassigned';
      if (!byProject[p]) byProject[p] = { total: 0, done: 0 };
      byProject[p].total++;
      if (getStatusCategory(i.status, i.status_category) === 'done') byProject[p].done++;
    });

    const remaining = todoItems.length + progressItems.length;
    const isAtRisk = closureRate < 60 || overdueItems.length > 3;
    const confidence = Math.min(100, Math.max(20, Math.round(closureRate * 0.6 + (100 - overdueItems.length * 8) * 0.4)));

    return {
      total, todoItems, progressItems, doneItems, hubDist, typeDist, assignerDist,
      closureRate, avgAge, overdueItems, criticalPath,
      releaseName, releaseEnd, releaseDaysLeft, byProject, remaining, isAtRisk, confidence,
    };
  }, [items]);

  if (!isOpen) return null;

  const role = summary?.role ?? 'Developer';
  const dept = summary?.department ?? 'Delivery';
  const firstName = resourceName.split(' ')[0];
  const initials = resourceName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, zIndex: 998,
        background: 'rgba(10,10,10,.55)', backdropFilter: 'blur(4px)',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, left: 220,
        zIndex: 999, background: C.bg, overflowY: 'auto',
        animation: 'aiSlide 250ms ease-out forwards',
      }}>

        {/* ═══ HEADER — DARK NAVY, NO PURPLE ═══ */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
          padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '.01em' }}>
            Resource Intelligence Profile
          </span>
          <button onClick={() => window.print()} style={{
            marginLeft: 'auto', padding: '5px 14px', fontSize: 11, fontWeight: 700,
            color: '#fff', background: 'rgba(255,255,255,.12)',
            border: '1px solid rgba(255,255,255,.2)', borderRadius: 6, cursor: 'pointer',
          }}>📤 Export</button>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 18,
            color: 'rgba(255,255,255,.7)', cursor: 'pointer', padding: '4px 8px',
          }}>✕</button>
        </div>

        <div style={{ padding: '16px 24px', maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* ═══ PROFILE CARD ═══ */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            background: C.surface, borderRadius: 12, padding: '14px 20px',
            border: `1px solid ${C.border}`, boxShadow: C.shadow,
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.accent}, ${C.accentLight})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 17, fontWeight: 800, overflow: 'hidden', flexShrink: 0,
            }}>
              {summary?.avatar_url ? (
                <img src={summary.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : initials}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: C.text1 }}>{resourceName}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text2, marginTop: 1 }}>{role} · {dept}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                {[
                  { l: 'Items', v: String(a.total), c: C.text1 },
                  { l: 'Closure', v: `${a.closureRate}%`, c: a.closureRate >= 60 ? C.done : C.todo },
                  { l: 'Pending', v: String(a.remaining), c: a.remaining > 0 ? C.todo : C.done },
                  { l: 'Avg Age', v: `${a.avgAge}d`, c: Number(a.avgAge) > 20 ? C.todo : C.text1 },
                ].map((s, i) => (
                  <div key={i} style={{
                    textAlign: 'center', padding: '4px 12px',
                    background: C.bg, borderRadius: 6, border: `1px solid ${C.border}`,
                  }}>
                    <div style={{ fontSize: 16, fontWeight: 900, color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: C.text4, textTransform: 'uppercase', letterSpacing: '.03em' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ SECTION 1: {NAME}'S PROFILE ═══ */}
          <SectionCard title={`${firstName}'s Profile`}>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: C.text2 }}>
              <strong style={{ color: C.text1 }}>{resourceName}</strong> serves as a <strong>{role}</strong> in the <strong>{dept}</strong> department.
              This quarter, they have been assigned <B>{a.total} work items</B> and
              completed <B>{a.doneItems.length}</B> ({a.closureRate}% closure rate).
              {a.hubDist.length > 0 && (<>
                {' '}Their primary hub is <strong>{a.hubDist[0].hub.replace('Hub', '')}</strong> ({a.hubDist[0].pct}%)
                {a.hubDist.length > 1 && (<>, with activity in {a.hubDist.slice(1, 3).map((h, i) => (
                  <span key={h.hub}>{i > 0 && ' and '}<strong>{h.hub.replace('Hub', '')}</strong> ({h.pct}%)</span>
                ))}</>)}.
              </>)}
              <br /><br />
              Current backlog: <span style={{ color: C.todo, fontWeight: 600 }}>{a.todoItems.length} To Do</span>,{' '}
              <span style={{ color: C.progress, fontWeight: 600 }}>{a.progressItems.length} In Progress</span>, and{' '}
              <span style={{ color: C.done, fontWeight: 600 }}>{a.doneItems.length} Completed</span>.
              {a.overdueItems.length > 0 && (<>
                {' '}<span style={{ color: C.todo, fontWeight: 600 }}>{a.overdueItems.length} items</span> exceed the 14-day threshold
                (oldest: <B>{a.overdueItems[0]?.item_key}</B> at {a.overdueItems[0]?.age_days}d).
              </>)}
            </div>
          </SectionCard>

          {/* ═══ SECTION 2: ROLE CONTRIBUTION ═══ */}
          <SectionCard title="Role Contribution">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Left: Contribution context */}
              <div style={{ background: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, margin: '0 0 8px' }}>
                  Contribution from {role}
                </p>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 2 }}>
                  <div>✓ Close assigned work items</div>
                  <div>✓ Fix Bugs & Defects</div>
                  <div>✓ Resolve assigned Incidents</div>
                  <div>○ Occasional Task completion</div>
                  <div>✗ Not expected to create Epics/Initiatives</div>
                </div>
              </div>

              {/* Right: Actual distribution — NO RED, warm colors */}
              <div style={{ background: C.bg, borderRadius: 8, padding: 12, border: `1px solid ${C.border}` }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.text1, margin: '0 0 8px' }}>
                  Actual Work Distribution
                </p>
                {a.typeDist.map((t, idx) => (
                  <div key={t.type} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border }}>
                      <div style={{
                        height: '100%', borderRadius: 4, width: `${t.pct}%`,
                        background: C.barColors[idx % C.barColors.length],
                        transition: 'width .3s',
                      }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.text1, width: 28, textAlign: 'right' }}>{t.pct}%</span>
                    <span style={{ fontSize: 10, color: C.text3, width: 70 }}>{t.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>

          {/* ═══ SECTION 3: CURRENT WORKLOAD — HORIZONTAL BAR, NO DONUT ═══ */}
          <SectionCard title="Current Workload" subtitle={`${a.releaseName} · ${a.releaseDaysLeft}d remaining`}>
            {/* Horizontal progress bar */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: C.text1 }}>Completion Progress</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: C.text1, fontFamily: C.mono }}>{a.closureRate}%</span>
              </div>
              <div style={{ height: 14, borderRadius: 8, background: C.border, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${a.total > 0 ? Math.round((a.doneItems.length / a.total) * 100) : 0}%`, background: C.done, transition: 'width .3s' }} />
                <div style={{ width: `${a.total > 0 ? Math.round((a.progressItems.length / a.total) * 100) : 0}%`, background: C.progress, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.done }}>■ Done {a.doneItems.length}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.progress }}>■ In Progress {a.progressItems.length}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: C.text4 }}>■ To Do {a.todoItems.length}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {/* Critical Path */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>Critical Path Items</p>
                {a.criticalPath.length > 0 ? a.criticalPath.map(item => (
                  <div key={item.work_item_id} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
                    background: 'var(--tint-red, #FEF2F2)', borderRadius: 6, marginBottom: 3,
                    border: '1px solid #FECACA', fontSize: 10,
                  }}>
                    <span style={{ color: C.todo, fontWeight: 700, fontFamily: C.mono, flexShrink: 0 }}>{item.item_key}</span>
                    <span style={{ color: C.text4, fontSize: 9, flexShrink: 0 }}>{item.item_type}</span>
                    <span style={{ color: C.text2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                    <span style={{ color: C.todo, fontWeight: 700, fontFamily: C.mono, flexShrink: 0 }}>
                      {item.age_days}d
                      {(() => { const s = getStaleIndicator(item.age_days, item.status, item.status_category); return s ? <span title={s.label} style={{ fontSize: 10, marginLeft: 2 }}>{s.icon}</span> : null; })()}
                    </span>
                  </div>
                )) : <p style={{ fontSize: 11, color: C.text4 }}>No critical items</p>}
              </div>

              {/* Per-Project */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: C.text1, margin: '0 0 6px' }}>Per-Project Standing</p>
                {Object.entries(a.byProject).map(([proj, d]) => {
                  const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
                  const emoji = pct >= 70 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
                  return (
                    <div key={proj} style={{ marginBottom: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                        <span style={{ color: C.text2, fontWeight: 600 }}>{proj}</span>
                        <span>{emoji}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 5, borderRadius: 4, background: C.border }}>
                          <div style={{
                            height: '100%', borderRadius: 4, width: `${pct}%`,
                            background: pct >= 70 ? C.done : pct >= 40 ? '#CA8A04' : C.todo,
                            transition: 'width .3s',
                          }} />
                        </div>
                        <span style={{ fontSize: 10, color: C.text4, fontFamily: C.mono }}>{d.done}/{d.total}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Verdict */}
            <div style={{
              borderRadius: 8, overflow: 'hidden',
              border: `1.5px solid ${a.isAtRisk ? '#CA8A04' : C.done}`,
            }}>
              <div style={{
                padding: '8px 14px', fontWeight: 800, fontSize: 12,
                background: a.isAtRisk
                  ? 'linear-gradient(135deg, #FEF3C7, #FDE68A)'
                  : 'linear-gradient(135deg, #D1FAE5, #A7F3D0)',
                color: a.isAtRisk ? '#92400E' : '#065F46',
              }}>
                {a.isAtRisk ? '⚠ AT RISK' : '✓ ON TRACK'}
              </div>
              <div style={{ padding: '8px 14px', fontSize: 12, color: C.text2, background: C.surface, lineHeight: 1.6 }}>
                Closure rate <strong>{a.closureRate}%</strong> with {a.remaining} remaining and {a.releaseDaysLeft}d left.
                {a.overdueItems.length > 0 && <> {a.overdueItems.length} items past threshold.</>}
              </div>
              <div style={{
                padding: '6px 14px', fontSize: 11, fontWeight: 700, color: C.text4,
                background: C.bg, borderTop: `1px solid ${C.border}`,
              }}>
                Confidence: {a.confidence}/100
              </div>
            </div>
          </SectionCard>

          {/* ═══ SECTION 4: BEHAVIORAL INSIGHTS (LAST) ═══ */}
          <SectionCard title="Behavioral Insights" subtitle={`Based on ${a.total} items`}>
            <Insight>
              Average item age is <strong>{a.avgAge} days</strong>. {Number(a.avgAge) < 20 ? 'Within acceptable threshold.' : 'Exceeds 20-day threshold — review oldest items.'}
            </Insight>
            <Insight>
              <strong>{a.closureRate}%</strong> closure rate this quarter. {a.closureRate >= 70 ? 'Strong velocity.' : a.closureRate >= 40 ? 'Moderate — some items may need attention.' : 'Low completion. Review blockers.'}
            </Insight>
            {a.assignerDist.length > 0 && (
              <Insight>
                Primary work source: <strong>{a.assignerDist[0][0]}</strong> ({a.assignerDist[0][1]} items, {a.total > 0 ? Math.round((a.assignerDist[0][1] / a.total) * 100) : 0}%).
                {a.assignerDist.length > 1 && <> Secondary: <strong>{a.assignerDist[1][0]}</strong> ({a.assignerDist[1][1]} items).</>}
              </Insight>
            )}
            <Insight>
              Hub focus: <strong>{a.hubDist[0]?.hub.replace('Hub', '') ?? 'N/A'}</strong> at {a.hubDist[0]?.pct ?? 0}%. {(a.hubDist[0]?.pct ?? 0) > 80 ? 'Single-hub concentration.' : 'Multi-hub distribution.'}
            </Insight>
            {a.overdueItems.length > 0 && (
              <Insight>
                <span style={{ color: C.todo, fontWeight: 600 }}>{a.overdueItems.length} items</span> past 14-day threshold. Oldest: <B>{a.overdueItems[0]?.item_key}</B> at {a.overdueItems[0]?.age_days}d.
              </Insight>
            )}
            <Insight>
              Active across <strong>{Object.keys(a.byProject).length}</strong> project{Object.keys(a.byProject).length !== 1 ? 's' : ''} and <strong>{a.hubDist.length}</strong> hub{a.hubDist.length !== 1 ? 's' : ''}.
            </Insight>
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 6,
              background: '#FFFBEB', border: '1px solid #FDE68A',
              fontSize: 10, color: '#92400E', fontStyle: 'italic',
            }}>
              ⓘ Based on system data. Leave, meetings, and external context not captured.
            </div>
          </SectionCard>

          {/* ═══ FOOTER ═══ */}
          <div style={{
            textAlign: 'center', padding: '12px 0 24px',
            fontSize: 10, color: C.text4,
          }}>
            Generated: {new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            {' · '}Catalyst Intelligence Engine v2.0
          </div>
        </div>
      </div>

      <style>{`@keyframes aiSlide { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

/* ─── Sub-components ─── */

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 12, padding: '12px 16px',
      border: `1px solid ${C.border}`, boxShadow: C.shadow,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: C.text1, margin: 0 }}>{title}</h3>
        {subtitle && <span style={{ fontSize: 10, color: C.text4 }}>{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: C.progress, fontWeight: 700 }}>{children}</strong>;
}

function Insight({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start', marginBottom: 6, fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
      <span style={{ color: C.accent, fontSize: 7, marginTop: 6, flexShrink: 0 }}>●</span>
      <div>{children}</div>
    </div>
  );
}
