/**
 * Resource 360° — AI Intelligence Panel V16
 * 420px slide-over panel with burnout risk, velocity, type distribution, insights.
 * Catalyst V11 Carbon Precision — NO purple, NO donut charts.
 */
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const T = {
  bg: 'var(--bg-1, #F8FAFC)', surface: '#FFFFFF', ink1: 'var(--fg-1, #0F172A)', ink2: '#334155',
  ink3: '#64748B', ink4: 'var(--fg-3, #94A3B8)', border: 'var(--bd-default, #E2E8F0)', accent: '#2563EB',
  danger: '#EF4444', warning: '#D97706', success: '#0E8A5F',
  mono: "'JetBrains Mono', 'SF Mono', monospace",
  sora: "'Sora', 'Inter', sans-serif",
  inter: "'Inter', sans-serif",
};

// Mock computed stats
const MOCK = {
  activeCount: 13,
  closedCount: 9,
  closureRate: 41,
  avgAge: 8.2,
  staleCount: 2,
  staleRatio: 15,
  hubConcentration: 85,
  wipCount: 5,
  wipLoad: 38,
  cycleDays: 6.4,
  trend: '+12%',
  types: [
    { type: 'Bug', pct: 62, color: '#0D9488' },
    { type: 'Task', pct: 38, color: '#1E293B' },
  ],
};

interface Props {
  resourceName: string;
  onClose: () => void;
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: T.bg, borderRadius: 8, padding: '12px 14px', marginBottom: 10,
    }}>
      {title && (
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: T.ink4, letterSpacing: '0.06em', marginBottom: 8 }}>{title}</div>
      )}
      {children}
    </div>
  );
}

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: T.ink2, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ fontFamily: T.mono, color }}>{Math.round(value)}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 4, background: T.border, overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, value)}%`, background: color, transition: 'width 300ms' }} />
      </div>
    </div>
  );
}

const AiIntelligencePanelV16: React.FC<Props> = ({ resourceName, onClose }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Burnout risk computation
  const burnoutFactors = [
    { label: 'Stale Ratio', value: MOCK.staleRatio, color: MOCK.staleRatio > 20 ? T.danger : MOCK.staleRatio > 10 ? T.warning : T.success },
    { label: 'Avg Age', value: Math.min(100, (MOCK.avgAge / 30) * 100), color: MOCK.avgAge > 14 ? T.danger : MOCK.avgAge > 7 ? T.warning : T.success },
    { label: 'Hub Concentration', value: MOCK.hubConcentration, color: MOCK.hubConcentration > 80 ? T.warning : T.success },
    { label: 'WIP Load', value: MOCK.wipLoad, color: MOCK.wipLoad > 50 ? T.danger : MOCK.wipLoad > 30 ? T.warning : T.success },
  ];

  const avgBurnout = burnoutFactors.reduce((s, f) => s + f.value, 0) / burnoutFactors.length;
  const riskLevel = avgBurnout > 60 ? 'HIGH' : avgBurnout > 35 ? 'MODERATE' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? T.danger : riskLevel === 'MODERATE' ? T.warning : T.success;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', justifyContent: 'flex-end' }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.3)' }} />

      {/* Panel */}
      <div ref={panelRef} style={{
        position: 'relative', width: 420, background: T.surface, height: '100%',
        boxShadow: '-8px 0 30px rgba(0,0,0,.1)', display: 'flex', flexDirection: 'column',
        fontFamily: T.inter, animation: 'r360SlideIn 250ms ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px',
          borderBottom: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, color: T.accent }}>✦</span>
          <span style={{ fontFamily: T.sora, fontSize: 14, fontWeight: 800, color: T.ink1, flex: 1 }}>AI Intelligence</span>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, border: `1px solid ${T.border}`,
            background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} color={T.ink3} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
          {/* PROFILE */}
          <Section title="Profile">
            <p style={{ fontSize: 12, color: T.ink2, lineHeight: 1.5, margin: 0 }}>
              React Developer · PROJ ({MOCK.hubConcentration}%). {MOCK.activeCount} active, {MOCK.closedCount} closed.
              Closure rate: {MOCK.closureRate}%. Average cycle time: {MOCK.cycleDays} days.
              {MOCK.staleCount > 0 && ` ⚠ ${MOCK.staleCount} items stale (>14d without update).`}
            </p>
          </Section>

          {/* BURNOUT RISK */}
          <Section title="Burnout Risk">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{
                display: 'inline-block', padding: '2px 10px', borderRadius: 9999,
                fontSize: 10, fontWeight: 800, background: riskColor, color: '#FFFFFF',
              }}>{riskLevel}</span>
              <span style={{ fontSize: 10, color: T.ink4, fontFamily: T.mono }}>{Math.round(avgBurnout)}% composite</span>
            </div>
            {burnoutFactors.map(f => <FactorBar key={f.label} {...f} />)}
            <p style={{ fontSize: 9, fontStyle: 'italic', color: T.ink4, marginTop: 6, marginBottom: 0, lineHeight: 1.4 }}>
              Deloitte 2025 · Gallup 2025 · MS 2025 WTI
            </p>
          </Section>

          {/* VELOCITY */}
          <Section title="Velocity">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Closed', value: String(MOCK.closedCount), unit: 'items' },
                { label: 'Cycle', value: String(MOCK.cycleDays), unit: 'days' },
                { label: 'Trend', value: '▲', unit: MOCK.trend },
              ].map(m => (
                <div key={m.label} style={{
                  border: `1px solid ${T.border}`, borderRadius: 6, padding: '10px 8px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800, color: T.ink1 }}>{m.value}</div>
                  <div style={{ fontSize: 9, color: T.ink4, fontWeight: 600, marginTop: 2 }}>{m.unit}</div>
                  <div style={{ fontSize: 9, color: T.ink4, marginTop: 1 }}>{m.label}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* BY TYPE */}
          <Section title="By Type">
            {MOCK.types.map(t => (
              <div key={t.type} style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: T.ink2, marginBottom: 3 }}>
                  <span>{t.type}</span>
                  <span style={{ fontFamily: T.mono }}>{t.pct}%</span>
                </div>
                <div style={{ height: 7, borderRadius: 4, background: T.border, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 4, width: `${t.pct}%`, background: t.color }} />
                </div>
              </div>
            ))}
          </Section>

          {/* INSIGHTS */}
          <Section title="Insights">
            {[
              { emoji: '🎯', text: 'Bugs close faster than Tasks — prioritize task triage earlier.' },
              { emoji: '📊', text: 'Senaei resolves 1.4× faster than Platform — context switching drag.' },
              { emoji: '🏢', text: `Hub concentration at ${MOCK.hubConcentration}% — single-board burnout risk.` },
              { emoji: '⚡', text: `${MOCK.wipCount} WIP items — recommend 2–3 limit per developer.` },
            ].map((ins, i) => (
              <div key={i} style={{
                background: T.surface, borderRadius: 6, padding: '8px 10px', marginBottom: 6,
                border: `1px solid ${T.border}`, fontSize: 11, color: T.ink3, lineHeight: 1.4,
              }}>
                <span style={{ marginRight: 6 }}>{ins.emoji}</span>
                {ins.text}
              </div>
            ))}
          </Section>
        </div>
      </div>

      <style>{`
        @keyframes r360SlideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AiIntelligencePanelV16;
