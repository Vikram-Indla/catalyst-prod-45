/**
 * IdeationAnalyticsView — Analytics dashboard computed from real ph_ideas data
 */
import React, { useMemo } from 'react';
import { ClipboardList, BarChart3, RefreshCw, Sparkles, Rocket } from 'lucide-react';
import type { Idea } from './ideation-data';
import { useTheme } from '@/hooks/useTheme';
import { DK, LK } from '@/utils/dark-mode-styles';

const MONO = "'JetBrains Mono', monospace";

interface Props {
  ideas: Idea[];
}

// Funnel status order & colors
const FUNNEL_ORDER: { key: string; label: string; color: string }[] = [
  { key: 'draft', label: 'Draft', color: 'rgba(237,237,237,0.40)' },
  { key: 'submitted', label: 'Submitted', color: '#2563EB' },
  { key: 'under_review', label: 'Under Review', color: '#D97706' },
  { key: 'approved', label: 'Approved', color: '#16A34A' },
  { key: 'converted', label: 'Converted', color: '#0D9488' },
  { key: 'rejected', label: 'Rejected', color: '#EF4444' },
];

const DEPT_COLORS = ['#2563EB', '#0D9488', '#D97706', '#7C3AED', '#16A34A', '#EF4444', 'rgba(237,237,237,0.40)', '#0F766E', '#6366F1', '#DC2626'];

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function IdeationAnalyticsView({ ideas }: Props) {
  const { isDark } = useTheme();
  const dk = isDark ? DK : LK;

  // ── Computed metrics ──
  const stats = useMemo(() => {
    const total = ideas.length;
    const avgImpact = total > 0 ? (ideas.reduce((s, i) => s + i.impact, 0) / total) : 0;
    const converted = ideas.filter(i => i.status === 'converted').length;
    const convRate = total > 0 ? (converted / total * 100) : 0;
    const aiReady = ideas.filter(i => i.ai === 'ready').length;
    const aiPct = total > 0 ? Math.round(aiReady / total * 100) : 0;
    const pipeline = ideas.filter(i => !['rejected', 'draft'].includes(i.status)).length;
    return { total, avgImpact, converted, convRate, aiReady, aiPct, pipeline };
  }, [ideas]);

  // ── Funnel ──
  const funnel = useMemo(() => {
    const counts: Record<string, number> = {};
    ideas.forEach(i => { counts[i.status] = (counts[i.status] || 0) + 1; });
    const maxCount = Math.max(...Object.values(counts), 1);
    return FUNNEL_ORDER.map(f => ({
      ...f,
      count: counts[f.key] || 0,
      pct: Math.max(((counts[f.key] || 0) / maxCount) * 100, 0),
    }));
  }, [ideas]);

  // ── Departments ──
  const depts = useMemo(() => {
    const counts: Record<string, number> = {};
    ideas.forEach(i => {
      const d = i.dept || 'Unassigned';
      counts[d] = (counts[d] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count], idx) => ({ name, count, color: DEPT_COLORS[idx % DEPT_COLORS.length] }));
  }, [ideas]);

  // ── Weekly submissions ──
  const weeks = useMemo(() => {
    const weekCount = 8;
    const chunkSize = Math.max(1, Math.ceil(ideas.length / weekCount));
    const result: { w: string; c: number }[] = [];
    for (let i = 0; i < weekCount; i++) {
      const chunk = ideas.slice(i * chunkSize, (i + 1) * chunkSize);
      result.push({ w: `W${i + 1}`, c: chunk.length });
    }
    return result;
  }, [ideas]);

  // ── Top Contributors ──
  const contributors = useMemo(() => {
    const counts: Record<string, number> = {};
    ideas.forEach(i => {
      const name = i.assignee?.name || 'Unassigned';
      counts[name] = (counts[name] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted.length > 0 ? sorted[0][1] : 1;
    const colors = ['#0D9488', '#2563EB', '#D97706', '#7C3AED', '#16A34A'];
    return sorted.map(([name, count], idx) => ({
      name,
      initials: getInitials(name),
      count,
      pct: (count / max) * 100,
      color: colors[idx % colors.length],
    }));
  }, [ideas]);

  // ── Traceability ──
  const traces = useMemo(() => {
    return ideas
      .filter(i => i.status === 'converted' && i.initiative)
      .slice(0, 5)
      .map(i => ({ idea: i.key, ideaTitle: i.title, init: i.initiative!, status: 'Active' }));
  }, [ideas]);

  const maxDept = Math.max(...depts.map(d => d.count), 1);
  const maxWeek = Math.max(...weeks.map(w => w.c), 1);

  const cardStyle: React.CSSProperties = {
    background: isDark ? 'transparent' : '#FFFFFF',
    border: `1px solid ${dk.border}`,
    borderRadius: '12px',
    padding: '20px',
    flex: 1,
    boxShadow: isDark ? 'none' : undefined,
  };

  const barTrack = isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5';

  // ── Metric cards ──
  const METRICS = [
    { label: 'TOTAL SUBMISSIONS', value: String(stats.total), color: dk.t1, sub: `${stats.total} ideas in backlog`, subColor: dk.t3, icon: ClipboardList, iconBg: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', iconColor: '#2563EB' },
    { label: 'AVG IMPACT SCORE', value: stats.avgImpact.toFixed(2), color: '#2563EB', sub: 'across all ideas', subColor: dk.t3, icon: BarChart3, iconBg: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', iconColor: '#2563EB' },
    { label: 'CONVERSION RATE', value: `${stats.convRate.toFixed(1)}%`, color: dk.greenText, sub: `${stats.converted} ideas → initiatives`, subColor: dk.greenText, icon: RefreshCw, iconBg: isDark ? 'rgba(13,148,136,0.12)' : '#F0FDFA', iconColor: '#0D9488' },
    { label: 'AI COVERAGE', value: `${stats.aiPct}%`, color: '#3B82F6', sub: `${stats.aiReady} of ${stats.total} enriched`, subColor: dk.t3, icon: Sparkles, iconBg: isDark ? 'rgba(59,130,246,0.12)' : '#EFF6FF', iconColor: '#3B82F6' },
    { label: 'PIPELINE VALUE', value: String(stats.pipeline), color: dk.greenText, sub: 'Active ideas in pipeline', subColor: dk.greenText, icon: Rocket, iconBg: isDark ? 'rgba(22,163,74,0.12)' : '#F0FDF4', iconColor: '#16A34A' },
  ];

  return (
    <div style={{ padding: '16px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Row 1: Metric Cards */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: dk.t3 }}>{m.label}</span>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={16} style={{ color: m.iconColor }} />
                </div>
              </div>
              <div style={{ fontFamily: MONO, fontSize: '32px', fontWeight: 800, color: m.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{m.value}</div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: m.subColor, marginTop: '6px' }}>{m.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Row 2: Funnel + Departments */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: dk.t1, marginBottom: '16px' }}>Conversion Funnel</div>
          {funnel.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '100px', fontSize: '12px', fontWeight: 600, color: dk.t2, flexShrink: 0 }}>{f.label}</span>
              <div style={{ flex: 1, height: '50px', background: barTrack, borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.max(f.pct, f.count > 0 ? 8 : 0)}%`, height: '100%', background: f.color, borderRadius: '6px',
                  display: 'flex', alignItems: 'center', paddingLeft: '12px', color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
                  minWidth: f.count > 0 ? '40px' : undefined,
                }}>
                  {f.count}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: dk.t1, marginBottom: '16px' }}>Ideas by Department</div>
          {depts.length > 0 ? depts.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ width: '140px', fontSize: '12px', fontWeight: 600, color: dk.t2, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
              <div style={{ flex: 1, height: '20px', background: barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(d.count / maxDept) * 100}%`, height: '100%', background: d.color, borderRadius: '4px' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: dk.t2, minWidth: '20px', textAlign: 'right' }}>{d.count}</span>
            </div>
          )) : (
            <span style={{ fontSize: '12px', color: dk.t3 }}>No department data</span>
          )}
        </div>
      </div>

      {/* Row 3: Weekly + Contributors */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: dk.t1, marginBottom: '16px' }}>Weekly Submissions</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', height: '160px' }}>
            {weeks.map(w => (
              <div key={w.w} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: dk.t2 }}>{w.c}</span>
                <div style={{
                  width: '32px', height: `${Math.max((w.c / maxWeek) * 120, 4)}px`, background: '#2563EB',
                  borderRadius: '4px 4px 0 0',
                }} />
                <span style={{ fontSize: '11px', color: dk.t3, fontWeight: 600 }}>{w.w}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: dk.t1, marginBottom: '16px' }}>Top Contributors</div>
          {contributors.length > 0 ? contributors.map(c => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', background: c.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: '9px', fontWeight: 700,
              }}>{c.initials}</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: dk.t2, width: '100px', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
              <span style={{
                fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: dk.t3,
                background: isDark ? 'rgba(255,255,255,0.06)' : '#F8FAFC', border: `1px solid ${dk.border}`, borderRadius: '4px', padding: '1px 6px',
              }}>{c.count}</span>
              <div style={{ flex: 1, height: '6px', background: barTrack, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${c.pct}%`, height: '100%', background: '#2563EB', borderRadius: '4px' }} />
              </div>
            </div>
          )) : (
            <span style={{ fontSize: '12px', color: dk.t3 }}>No contributor data</span>
          )}
        </div>
      </div>

      {/* Row 4: Traceability */}
      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: dk.t1, marginBottom: '16px' }}>Traceability Map</div>
          {traces.length > 0 ? (
            <div style={{ border: `1px solid ${dk.border}`, borderRadius: '8px', overflow: 'hidden' }}>
              {traces.map((t, i) => (
                <div key={t.idea} style={{
                  display: 'flex', alignItems: 'center', gap: '10px', height: '44px', padding: '8px 12px',
                  borderBottom: i < traces.length - 1 ? `1px solid ${dk.divider}` : 'none',
                }}>
                  <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 600, color: dk.blueKey }}>{t.idea}</span>
                  <span style={{ fontSize: '12px', color: dk.t2, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ideaTitle}</span>
                  <span style={{ color: dk.t3, fontSize: '13px' }}>→</span>
                  <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: dk.greenText }}>{t.init}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: isDark ? 'rgba(22,163,74,0.12)' : '#DCFCE7',
                    color: isDark ? '#86EFAC' : '#15803D',
                    padding: '2px 8px', borderRadius: '20px',
                    fontSize: '11px', fontWeight: 600,
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '20px', textAlign: 'center', color: dk.t3, fontSize: '13px' }}>
              No converted ideas yet
            </div>
          )}
        </div>

        {/* Pipeline Summary */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: dk.t1, marginBottom: '16px' }}>Pipeline Summary</div>
          {funnel.filter(f => f.count > 0).map(f => (
            <div key={f.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: f.color }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: dk.t2 }}>{f.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontFamily: MONO, fontSize: '14px', fontWeight: 700, color: dk.t1 }}>{f.count}</span>
                <span style={{ fontSize: '11px', color: dk.t3 }}>
                  ({stats.total > 0 ? ((f.count / stats.total) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
