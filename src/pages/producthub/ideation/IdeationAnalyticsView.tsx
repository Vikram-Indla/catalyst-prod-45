/**
 * IdeationAnalyticsView — Full analytics dashboard for Ideation module
 */
import React from 'react';
import { ClipboardList, BarChart3, RefreshCw, Sparkles, Rocket } from 'lucide-react';

const MONO = "'JetBrains Mono', monospace";

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', flex: 1,
};

// ── Row 1: Metric Cards ──
const METRICS = [
  { label: 'TOTAL SUBMISSIONS', value: '15', color: '#0F172A', sub: '+3 this week', subColor: '#16A34A', icon: ClipboardList, iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { label: 'AVG IMPACT SCORE', value: '3.72', color: '#2563EB', sub: '+0.4 improvement', subColor: '#16A34A', icon: BarChart3, iconBg: '#EFF6FF', iconColor: '#2563EB' },
  { label: 'CONVERSION RATE', value: '13.3%', color: '#0D9488', sub: '2 ideas → initiatives', subColor: '#0D9488', icon: RefreshCw, iconBg: '#F0FDFA', iconColor: '#0D9488' },
  { label: 'AI COVERAGE', value: '73%', color: '#7C3AED', sub: '11 of 15 enriched', subColor: '#7C3AED', icon: Sparkles, iconBg: '#F5F3FF', iconColor: '#7C3AED' },
  { label: 'PIPELINE VALUE', value: '12', color: '#16A34A', sub: 'Active ideas in pipeline', subColor: '#16A34A', icon: Rocket, iconBg: '#F0FDF4', iconColor: '#16A34A' },
];

// ── Row 2A: Funnel ──
const FUNNEL = [
  { label: 'Draft', count: 2, pct: 30, color: '#94A3B8' },
  { label: 'Submitted', count: 4, pct: 55, color: '#2563EB' },
  { label: 'Under Review', count: 5, pct: 70, color: '#D97706' },
  { label: 'Approved', count: 1, pct: 20, color: '#16A34A' },
  { label: 'Converted', count: 2, pct: 30, color: '#0D9488' },
  { label: 'Rejected', count: 1, pct: 15, color: '#EF4444' },
];

// ── Row 2B: Departments ──
const DEPTS = [
  { name: 'Digital Transformation', count: 4, color: '#2563EB' },
  { name: 'IT Operations', count: 4, color: '#0D9488' },
  { name: 'Data & Analytics', count: 2, color: '#D97706' },
  { name: 'Customer Experience', count: 2, color: '#7C3AED' },
  { name: 'Risk & Compliance', count: 1, color: '#16A34A' },
  { name: 'Cybersecurity', count: 1, color: '#EF4444' },
  { name: 'HR', count: 1, color: '#94A3B8' },
];

// ── Row 3A: Weekly ──
const WEEKS = [
  { w: 'W1', c: 1 }, { w: 'W2', c: 2 }, { w: 'W3', c: 1 }, { w: 'W4', c: 3 },
  { w: 'W5', c: 2 }, { w: 'W6', c: 1 }, { w: 'W7', c: 3 }, { w: 'W8', c: 2 },
];

// ── Row 3B: Contributors ──
const CONTRIBUTORS = [
  { rank: 1, name: 'Sarah K.', initials: 'SK', color: '#0D9488', ideas: 3, pct: 60, barColor: '#2563EB' },
  { rank: 2, name: 'Ahmed M.', initials: 'AM', color: '#2563EB', ideas: 3, pct: 60, barColor: '#2563EB' },
  { rank: 3, name: 'Fatima R.', initials: 'FR', color: '#D97706', ideas: 2, pct: 40, barColor: '#2563EB' },
  { rank: 4, name: 'Layla S.', initials: 'LS', color: '#0D9488', ideas: 2, pct: 40, barColor: '#2563EB' },
  { rank: 5, name: 'Khalid B.', initials: 'KB', color: '#7C3AED', ideas: 2, pct: 40, barColor: '#2563EB' },
];

// ── Row 4A: Traceability ──
const TRACES = [
  { idea: 'IDH-001', ideaTitle: 'Unified Digital Services Portal', init: 'INIT-2026-001', status: 'Active' },
  { idea: 'IDH-013', ideaTitle: 'Integrated Payment Gateway', init: 'INIT-2026-002', status: 'Active' },
];

// ── Row 4B: SLA ──
const SLA = [
  { label: 'Avg. Review Time', target: '≤5 days', actual: '3.2 days', pct: 64, status: 'on-track', color: '#16A34A' },
  { label: 'Approval Turnaround', target: '≤10 days', actual: '8.5 days', pct: 85, status: 'on-track', color: '#16A34A' },
  { label: 'Conversion Time', target: '≤15 days', actual: '14.2 days', pct: 95, status: 'at-risk', color: '#D97706' },
];

export default function IdeationAnalyticsView() {
  const maxDept = Math.max(...DEPTS.map(d => d.count));
  const maxWeek = Math.max(...WEEKS.map(w => w.c));

  return (
    <div style={{ padding: '16px 28px 32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Row 1: Metric Cards */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {METRICS.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px', color: '#94A3B8' }}>{m.label}</span>
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
        {/* Funnel */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Conversion Funnel</div>
          {FUNNEL.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ width: '100px', fontSize: '12px', fontWeight: 600, color: '#334155', flexShrink: 0 }}>{f.label}</span>
              <div style={{ flex: 1, height: '36px', background: '#F4F4F5', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{
                  width: `${f.pct}%`, height: '100%', background: f.color, borderRadius: '6px',
                  display: 'flex', alignItems: 'center', paddingLeft: '12px', color: '#FFFFFF', fontSize: '12px', fontWeight: 700,
                  minWidth: f.pct > 10 ? undefined : '40px',
                }}>
                  {f.count}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Departments */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Ideas by Department</div>
          {DEPTS.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{ width: '140px', fontSize: '12px', fontWeight: 600, color: '#334155', flexShrink: 0 }}>{d.name}</span>
              <div style={{ flex: 1, height: '20px', background: '#F4F4F5', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(d.count / maxDept) * 100}%`, height: '100%', background: d.color, borderRadius: '4px' }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '20px', textAlign: 'right' }}>{d.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 3: Weekly + Contributors */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Weekly Submissions */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Weekly Submissions</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '8px', height: '160px' }}>
            {WEEKS.map(w => (
              <div key={w.w} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: '#334155' }}>{w.c}</span>
                <div style={{
                  width: '32px', height: `${(w.c / maxWeek) * 120}px`, background: '#2563EB',
                  borderRadius: '4px 4px 0 0',
                }} />
                <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>{w.w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Contributors */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Top Contributors</div>
          {CONTRIBUTORS.map(c => (
            <div key={c.rank} style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '40px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%', background: c.color, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#FFFFFF', fontSize: '9px', fontWeight: 700,
              }}>{c.initials}</div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', width: '80px', flexShrink: 0 }}>{c.name}</span>
              <span style={{
                fontFamily: MONO, fontSize: '11px', fontWeight: 700, color: '#64748B',
                background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '1px 6px',
              }}>{c.ideas}</span>
              <div style={{ flex: 1, height: '6px', background: '#E4E4E7', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${c.pct}%`, height: '100%', background: c.barColor, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 4: Traceability + SLA */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {/* Traceability */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Traceability Map</div>
          <div style={{ border: '1px solid #F4F4F5', borderRadius: '8px', overflow: 'hidden' }}>
            {TRACES.map((t, i) => (
              <div key={t.idea} style={{
                display: 'flex', alignItems: 'center', gap: '10px', height: '44px', padding: '0 12px',
                borderBottom: i < TRACES.length - 1 ? '1px solid #F4F4F5' : 'none',
              }}>
                <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 600, color: '#2563EB' }}>{t.idea}</span>
                <span style={{ fontSize: '12px', color: '#334155', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ideaTitle}</span>
                <span style={{ color: '#94A3B8', fontSize: '13px' }}>→</span>
                <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: '#0D9488' }}>{t.init}</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '20px',
                  fontSize: '11px', fontWeight: 600,
                }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16A34A' }} />
                  {t.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* SLA */}
        <div style={{ ...cardStyle, flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Processing SLA</div>
          {SLA.map(s => (
            <div key={s.label} style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{s.label}</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>Target: {s.target}</span>
              </div>
              <div style={{ height: '6px', background: '#E4E4E7', borderRadius: '3px', overflow: 'hidden', marginBottom: '4px' }}>
                <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '3px' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 700, color: s.color }}>{s.actual}</span>
                <span style={{
                  fontSize: '11px', fontWeight: 600,
                  color: s.status === 'on-track' ? '#16A34A' : '#D97706',
                }}>
                  {s.status === 'on-track' ? '✅ On Track' : '⚠️ At Risk'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
