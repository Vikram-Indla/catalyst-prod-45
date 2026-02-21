/**
 * IdeationIntelligenceHub — Full-screen AI Intelligence overlay
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IdeationIntelligenceHub({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#FFFFFF', zIndex: 300, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{
        padding: '20px 32px', borderBottom: '1px solid #E2E8F0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%', background: '#F5F3FF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px', color: '#7C3AED',
          }}>✦</div>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F172A' }}>AI Intelligence Hub</div>
            <div style={{ fontSize: '12px', color: '#94A3B8' }}>Powered by Catalyst AI · 15 ideas analyzed</div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px',
            fontSize: '14px', fontWeight: 600, color: '#64748B', borderRadius: '6px',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F4F4F5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          <X size={16} /> Close
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ padding: '16px 32px', display: 'flex', gap: '16px' }}>
        {[
          { value: '2', label: 'idea pairs with >80% similarity', color: '#D97706', title: 'Duplicates Detected' },
          { value: '4', label: 'trending categories', color: '#2563EB', title: 'Themes Discovered' },
          { value: '73%', label: 'ideas tagged to standards', color: '#16A34A', title: 'Compliance Coverage' },
          { value: '82%', label: 'ideas mapped to pillars', color: '#0D9488', title: 'V2030 Alignment' },
        ].map(s => (
          <div key={s.title} style={{
            flex: 1, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '16px 20px',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', marginBottom: '2px' }}>{s.title}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '11px', fontWeight: 500, color: '#94A3B8', marginTop: '2px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 2×2 Content Grid */}
      <div style={{ padding: '0 32px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Card A — Duplicate Detection */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>🔍 Duplicate Detection</span>
            <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>2 pairs</span>
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

        {/* Card B — Theme Discovery */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>💡 Theme Discovery</span>
            <span style={{ background: '#DBEAFE', color: '#1D4ED8', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>4 themes</span>
          </div>

          {[
            { name: 'Digital Transformation', count: 5, trend: '↑ trending', color: '#2563EB', pct: 100 },
            { name: 'AI & Automation', count: 3, trend: '↑ trending', color: '#7C3AED', pct: 60 },
            { name: 'Compliance & Risk', count: 2, trend: '→ stable', color: '#D97706', pct: 40 },
            { name: 'Sustainability', count: 2, trend: '↑ new', color: '#16A34A', pct: 40 },
          ].map(t => (
            <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{
                background: `${t.color}10`, color: t.color, padding: '3px 8px', borderRadius: '4px',
                fontSize: '11px', fontWeight: 600, minWidth: '140px',
              }}>{t.name}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 700, color: '#334155', minWidth: '55px' }}>
                {t.count} ideas
              </span>
              <span style={{ fontSize: '10px', color: '#94A3B8', minWidth: '60px' }}>{t.trend}</span>
              <div style={{ flex: 1, height: '6px', background: '#E4E4E7', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${t.pct}%`, height: '100%', background: t.color, borderRadius: '3px' }} />
              </div>
            </div>
          ))}

          <div style={{ marginTop: '16px', borderLeft: '3px solid #7C3AED', background: '#F5F3FF', borderRadius: '0 8px 8px 0', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', marginBottom: '2px' }}>✦ Emerging Insight</div>
            <div style={{ fontSize: '12px', color: '#6D28D9', lineHeight: 1.5 }}>
              3 of the last 5 submissions relate to AI & Automation — consider launching a dedicated Innovation Drive.
            </div>
          </div>
        </div>

        {/* Card C — Compliance Mapping */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>🛡️ Compliance Mapping</span>
            <span style={{ background: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>4 standards</span>
          </div>

          {[
            { code: 'DGA-ACC-01', desc: 'Digital Accessibility', tagged: 8, gap: '✅ Good coverage', gapColor: '#16A34A' },
            { code: 'NCA-SEC-02', desc: 'Security Controls', tagged: 5, gap: '⚠️ 2 ideas untagged', gapColor: '#D97706' },
            { code: 'NDMO-DG-03', desc: 'Data Governance', tagged: 6, gap: '✅ Good coverage', gapColor: '#16A34A' },
            { code: 'SDAIA-AI-01', desc: 'AI Ethics', tagged: 3, gap: '🔴 Low — 4 AI ideas untagged', gapColor: '#EF4444' },
          ].map(c => (
            <div key={c.code} style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #F4F4F5' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 700, color: '#334155' }}>{c.code}</span>
                  <span style={{ fontSize: '12px', color: '#64748B', marginLeft: '8px' }}>· {c.desc}</span>
                </div>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#334155' }}>{c.tagged} ideas</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: c.gapColor }}>{c.gap}</div>
            </div>
          ))}
        </div>

        {/* Card D — V2030 Alignment */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', minHeight: '280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>🏛️ V2030 Alignment</span>
            <span style={{ background: '#CCFBF1', color: '#0F766E', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>3 pillars</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { name: 'Vibrant Society', score: '3.2', ideas: 4, strongest: 'IDH-005 (4.8)', color: '#2563EB' },
              { name: 'Thriving Economy', score: '4.5', ideas: 8, strongest: 'IDH-001 (5.0)', color: '#16A34A' },
              { name: 'Ambitious Nation', score: '4.1', ideas: 6, strongest: 'IDH-011 (4.7)', color: '#D97706' },
            ].map(p => (
              <div key={p.name} style={{ borderTop: `3px solid ${p.color}`, background: '#F8FAFC', borderRadius: '0 0 8px 8px', padding: '14px 12px', textAlign: 'center' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '24px', fontWeight: 800, color: '#0F172A' }}>{p.score}</div>
                <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>/5</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#334155', marginTop: '6px' }}>{p.name}</div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '4px' }}>{p.ideas} ideas</div>
                <div style={{ fontSize: '10px', color: p.color, fontWeight: 600, marginTop: '4px' }}>Strongest: {p.strongest}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#B45309', marginBottom: '2px' }}>⚠ Gap Detected</div>
            <div style={{ fontSize: '12px', color: '#92400E', lineHeight: 1.5 }}>
              Only 4 ideas mapped to Vibrant Society. Consider prioritizing citizen-facing submissions in the next Innovation Drive.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DuplicatePair({ match, idea1, idea2, signals }: {
  match: number;
  idea1: { key: string; title: string };
  idea2: { key: string; title: string };
  signals: string;
}) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
      <div style={{ marginBottom: '8px' }}>
        <span style={{ background: '#FEF3C7', color: '#B45309', fontSize: '12px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px' }}>
          {match}% match
        </span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '2px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB' }}>{idea1.key}</span>
        <span style={{ color: '#334155', marginLeft: '6px' }}>{idea1.title}</span>
      </div>
      <div style={{ fontSize: '12px', marginBottom: '8px' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600, color: '#2563EB' }}>{idea2.key}</span>
        <span style={{ color: '#334155', marginLeft: '6px' }}>{idea2.title}</span>
      </div>
      <div style={{ fontSize: '11px', color: '#64748B', lineHeight: 1.5, marginBottom: '10px' }}>
        Shared signals: {signals}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => toast.success('Merge initiated')}
          style={{ background: '#7C3AED', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
        >
          🔗 Merge Ideas
        </button>
        <button
          onClick={() => toast('Kept separate')}
          style={{ background: '#FFFFFF', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
        >
          Keep Separate
        </button>
      </div>
    </div>
  );
}