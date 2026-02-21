/**
 * AI Ideas Hub — Full-screen AI overlay for Ideation Module
 * Catalyst V11 Carbon Precision color system
 * Max 4 semantic colors: blue, teal, warning, danger. All else neutral.
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

/* ── Catalyst V5 Semantic Palette ── */
const C = {
  primary: '#2563eb',
  success: '#0d9488',
  warning: '#d97706',
  danger: '#ef4444',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textTertiary: '#475569',
  surface: '#f8fafc',
  surfaceAlt: '#f1f5f9',
  border: '#e2e8f0',
  bg: '#ffffff',
  insightBg: '#eff6ff',
  insightText: '#1e40af',
  insightBorder: '#2563eb',
  gapBg: '#fef2f2',
  gapText: '#991b1b',
  gapBody: '#7f1d1d',
  gapBorder: '#ef4444',
} as const;

const MONO = "'JetBrains Mono', monospace";

export default function IdeationIntelligenceHub({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 300, overflowY: 'auto' }}>
      {/* ══ Header ══ */}
      <div style={{
        padding: '20px 32px', borderBottom: `1px solid ${C.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: C.insightBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: C.primary,
          }}>✦</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: C.textPrimary }}>AI Ideas Hub</div>
            <div style={{ fontSize: '13px', color: C.textTertiary }}>Powered by Catalyst AI · 15 ideas analyzed</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px',
            fontSize: '14px', fontWeight: 600, color: C.textTertiary, borderRadius: '6px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = C.surfaceAlt; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <X size={16} /> Close
        </button>
      </div>

      {/* ══ KPI Stat Strip ══ */}
      <div style={{ padding: '16px 32px', display: 'flex', gap: '16px' }}>
        {[
          { value: '2', label: 'idea pairs with >80% similarity', title: 'Duplicates Detected' },
          { value: '4', label: 'trending categories', title: 'Themes Discovered' },
          { value: '73%', label: 'ideas tagged to standards', title: 'Compliance Coverage' },
          { value: '82%', label: 'ideas mapped to pillars', title: 'V2030 Alignment' },
        ].map(s => (
          <div key={s.title} style={{
            flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '16px 20px',
          }}>
            <div style={{ fontSize: '12px', fontWeight: 500, color: C.textTertiary, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{s.title}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, fontFamily: MONO, color: C.textPrimary }}>{s.value}</div>
            <div style={{ fontSize: '12px', fontWeight: 400, color: C.textTertiary, marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ══ 2×2 Content Grid ══ */}
      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* ── Card A: Duplicate Detection ── */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>🔍 Duplicate Detection</span>
            <NeutralBadge>2 pairs</NeutralBadge>
          </div>
          <DuplicatePair
            match={91}
            idea1={{ key: 'IDH-001', title: 'Unified Digital Services Portal' }}
            idea2={{ key: 'IDH-010', title: 'Stakeholder Communication Hub' }}
            signals="scope overlap (citizen services), same department family, 4 common keywords"
          />
          <DuplicatePair
            match={82}
            idea1={{ key: 'IDH-002', title: 'AI-Powered Permit Classification' }}
            idea2={{ key: 'IDH-015', title: 'Cross-Ministry Data Sharing Framework' }}
            signals="AI/ML scope, data integration, cross-ministry impact"
          />
        </div>

        {/* ── Card B: Theme Discovery ── */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>💡 Theme Discovery</span>
            <NeutralBadge>4 themes</NeutralBadge>
          </div>
          {[
            { name: 'Digital Transformation', count: 5, trend: '↑ trending', pct: 100, opacity: 1.0 },
            { name: 'AI & Automation', count: 3, trend: '↑ trending', pct: 60, opacity: 0.75 },
            { name: 'Compliance & Risk', count: 2, trend: '→ stable', pct: 40, opacity: 0.50 },
            { name: 'Sustainability', count: 2, trend: '↑ new', pct: 40, opacity: 0.35 },
          ].map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{ color: C.textPrimary, fontSize: '14px', fontWeight: 500, minWidth: '140px' }}>{t.name}</span>
              <span style={{ fontFamily: MONO, fontSize: '12px', fontWeight: 700, color: C.textSecondary, minWidth: '55px' }}>
                {t.count} ideas
              </span>
              <span style={{ fontSize: '12px', color: C.textTertiary, minWidth: '60px' }}>{t.trend}</span>
              <div style={{ flex: 1, height: '8px', background: C.surfaceAlt, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${t.pct}%`, height: '100%', background: C.primary, opacity: t.opacity, borderRadius: '4px' }} />
              </div>
            </div>
          ))}

          {/* Emerging Insight — blue tint, NOT yellow */}
          <div style={{
            marginTop: '16px', borderLeft: `3px solid ${C.insightBorder}`,
            background: C.insightBg, borderRadius: '0 8px 8px 0', padding: '12px 16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.insightText, marginBottom: '2px' }}>✦ Emerging Insight</div>
            <div style={{ fontSize: '13px', color: '#1e3a5f', lineHeight: 1.5 }}>
              3 of the last 5 submissions relate to AI & Automation — consider launching a dedicated Innovation Drive.
            </div>
          </div>
        </div>

        {/* ── Card C: Compliance Mapping ── */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>🛡️ Compliance Mapping</span>
            <NeutralBadge>4 standards</NeutralBadge>
          </div>
          {[
            { code: 'DGA-ACC-01', desc: 'Digital Accessibility', tagged: 8, gap: '✅ Good coverage', gapColor: C.success },
            { code: 'NCA-SEC-02', desc: 'Security Controls', tagged: 5, gap: '⚠️ 2 ideas untagged', gapColor: C.warning },
            { code: 'NDMO-DG-03', desc: 'Data Governance', tagged: 6, gap: '✅ Good coverage', gapColor: C.success },
            { code: 'SDAIA-AI-01', desc: 'AI Ethics', tagged: 3, gap: '🔴 Low — 4 AI ideas untagged', gapColor: C.danger },
          ].map(c => (
            <div key={c.code} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: `1px solid ${C.surfaceAlt}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 500, color: C.textPrimary }}>{c.code}</span>
                  <span style={{ fontSize: '14px', color: C.textSecondary, marginLeft: '8px' }}>· {c.desc}</span>
                </div>
                <span style={{ fontFamily: MONO, fontSize: '13px', fontWeight: 600, color: C.textSecondary }}>{c.tagged} ideas</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: c.gapColor }}>{c.gap}</div>
            </div>
          ))}
        </div>

        {/* ── Card D: V2030 Alignment ── */}
        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: C.textPrimary }}>🏛️ V2030 Alignment</span>
            <NeutralBadge>3 pillars</NeutralBadge>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { name: 'Vibrant Society', score: '3.2', ideas: 4, strongest: 'IDH-005 (4.8)' },
              { name: 'Thriving Economy', score: '4.5', ideas: 8, strongest: 'IDH-001 (5.0)' },
              { name: 'Ambitious Nation', score: '4.1', ideas: 6, strongest: 'IDH-011 (4.7)' },
            ].map(p => (
              <div key={p.name} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '8px', padding: '14px 12px', textAlign: 'center' }}>
                {/* Score bar — single blue */}
                <div style={{ height: '4px', background: C.border, borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(parseFloat(p.score) / 5) * 100}%`, background: C.primary, borderRadius: '2px' }} />
                </div>
                <div style={{ fontFamily: MONO, fontSize: '32px', fontWeight: 700, color: C.textPrimary, lineHeight: 1 }}>{p.score}</div>
                <div style={{ fontSize: '16px', fontWeight: 400, color: C.textTertiary, marginTop: '2px' }}>/5</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: C.textPrimary, marginTop: '6px' }}>{p.name}</div>
                <div style={{ fontSize: '13px', color: C.textTertiary, marginTop: '4px' }}>{p.ideas} ideas</div>
                <div style={{ fontSize: '12px', color: C.textTertiary, fontWeight: 500, marginTop: '4px' }}>Strongest: {p.strongest}</div>
              </div>
            ))}
          </div>

          {/* Gap Detected — red tint, NOT yellow */}
          <div style={{
            background: C.gapBg, borderLeft: `3px solid ${C.gapBorder}`,
            borderRadius: '0 6px 6px 0', padding: '12px 16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: C.gapText, marginBottom: '2px' }}>⚠ Gap Detected</div>
            <div style={{ fontSize: '13px', color: C.gapBody, lineHeight: 1.5 }}>
              Only 4 ideas mapped to Vibrant Society. Consider prioritizing citizen-facing submissions in the next Innovation Drive.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Neutral Badge ── */
function NeutralBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: C.surfaceAlt, color: C.textTertiary,
      fontSize: '12px', fontWeight: 500, padding: '2px 10px', borderRadius: '12px',
    }}>
      {children}
    </span>
  );
}

/* ── Duplicate Pair Card ── */
function DuplicatePair({ match, idea1, idea2, signals }: {
  match: number;
  idea1: { key: string; title: string };
  idea2: { key: string; title: string };
  signals: string;
}) {
  return (
    <div style={{
      background: C.bg, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.primary}`,
      borderRadius: '8px', padding: '12px 16px', marginBottom: '12px',
    }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ color: C.primary, fontSize: '13px', fontWeight: 600 }}>
          {match}% match
        </span>
      </div>
      <div style={{ fontSize: '13px', marginBottom: '2px' }}>
        <span style={{ fontFamily: MONO, fontWeight: 600, color: C.textPrimary }}>{idea1.key}</span>
        <span style={{ color: C.textSecondary, marginLeft: '6px' }}>{idea1.title}</span>
      </div>
      <div style={{ fontSize: '13px', marginBottom: '8px' }}>
        <span style={{ fontFamily: MONO, fontWeight: 600, color: C.textPrimary }}>{idea2.key}</span>
        <span style={{ color: C.textSecondary, marginLeft: '6px' }}>{idea2.title}</span>
      </div>
      <div style={{ fontSize: '13px', color: C.textTertiary, lineHeight: 1.5, marginBottom: '10px' }}>
        Shared signals: {signals}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => toast.success('Merge initiated')}
          style={{
            background: C.primary, color: '#ffffff', border: 'none', borderRadius: '6px',
            padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          🔗 Merge Ideas
        </button>
        <button
          onClick={() => toast('Kept separate')}
          style={{
            background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}`,
            borderRadius: '6px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          }}
        >
          Keep Separate
        </button>
      </div>
    </div>
  );
}
