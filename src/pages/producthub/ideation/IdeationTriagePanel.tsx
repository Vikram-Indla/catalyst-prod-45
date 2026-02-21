/**
 * IdeationTriagePanel — AI Triage drawer with 4 analysis cards
 */
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function IdeationTriagePanel({ open, onClose }: Props) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleEsc); return () => document.removeEventListener('keydown', handleEsc); }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 250 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '480px', background: '#FFFFFF', zIndex: 251,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #FAF5FF)', padding: '16px 20px', borderBottom: '1px solid #EDE9FE' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>✦</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#7C3AED' }}>AI Intelligence — Triage Results</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>4 ideas analyzed · 11 signals detected</div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {/* Fast-Track Alert */}
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16A34A' }}>⚡ Fast-Track Recommended (1) — Meets all approval criteria</span>
          </div>

          {/* Card 1: Fast-Track */}
          <TriageCard
            label="Fast-Track" labelBg="#DCFCE7" labelColor="#15803D"
            ideaKey="IDH-011" title="Automated Regulatory Impact Assessment"
            body="Strong V2030 Pillar 1 alignment (5/5), IMPACT 4.20, 11 votes, no duplicates detected. All approval criteria met."
            buttons={[
              { label: '⚡ Fast-Track → Approve', bg: '#16A34A', onClick: () => toast.success('IDH-011 fast-tracked to Approved') },
              { label: '🔍 Investigate', bg: '#D97706', onClick: () => toast('Investigation started for IDH-011') },
            ]}
          />

          {/* Card 2: Merge */}
          <TriageCard
            label="Merge" labelBg="#EDE9FE" labelColor="#7C3AED"
            ideaKey="IDH-010" title="Stakeholder Communication Hub"
            body="87% similarity with IDH-001 (Unified Digital Services Portal). Overlapping scope, shared stakeholders."
            aiCallout="✦ Merge IDH-010 into IDH-001 — consolidate 2 ideas into 1 initiative"
            buttons={[
              { label: '🔗 Merge & Consolidate', bg: '#7C3AED', onClick: () => toast.success('IDH-010 merged into IDH-001') },
              { label: 'Keep Separate', bg: '#64748B', onClick: () => toast('IDH-010 kept separate') },
            ]}
          />

          {/* Card 3: Investigate */}
          <TriageCard
            label="Investigate" labelBg="#FEF3C7" labelColor="#B45309"
            ideaKey="IDH-002" title="AI-Powered Permit Classification"
            body="94.2% classification accuracy in pilot. Missing formal business case document. Requires stakeholder sign-off."
            buttons={[
              { label: '🔍 Request Business Case', bg: '#D97706', onClick: () => toast('Business case requested for IDH-002') },
              { label: '⏸ Defer 30 days', bg: '#64748B', onClick: () => toast('IDH-002 deferred 30 days') },
            ]}
          />

          {/* Card 4: Defer */}
          <TriageCard
            label="Defer" labelBg="#F4F4F5" labelColor="#71717A"
            ideaKey="IDH-006" title="Predictive Maintenance for Legacy Systems"
            body="IMPACT 2.80 below threshold (3.0). Limited strategic alignment. 3 legacy systems at EOL — consider as part of infrastructure refresh."
            buttons={[
              { label: '⏸ Defer to Q2', bg: '#64748B', onClick: () => toast('IDH-006 deferred to Q2') },
              { label: '✕ Reject', bg: '#EF4444', onClick: () => toast('IDH-006 rejected') },
            ]}
          />

          {/* Footer sections */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>Compliance Scan</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[{ code: 'DGA-ACC-01', count: 8 }, { code: 'NCA-SEC-02', count: 5 }, { code: 'NDMO-DG-03', count: 6 }, { code: 'SDAIA-AI-01', count: 3 }].map(c => (
                <span key={c.code} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: '4px' }}>
                  {c.code} · {c.count}
                </span>
              ))}
            </div>

            <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '8px' }}>V2030 Alignment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[{ name: 'Vibrant Society', score: '3.2', bg: '#DBEAFE' }, { name: 'Thriving Economy', score: '4.5', bg: '#DCFCE7' }, { name: 'Ambitious Nation', score: '4.1', bg: '#FEF3C7' }].map(p => (
                <div key={p.name} style={{ background: p.bg, borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{p.score}</div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>{p.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

function TriageCard({ label, labelBg, labelColor, ideaKey, title, body, aiCallout, buttons }: {
  label: string; labelBg: string; labelColor: string;
  ideaKey: string; title: string; body: string;
  aiCallout?: string;
  buttons: { label: string; bg: string; onClick: () => void }[];
}) {
  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ background: labelBg, color: labelColor, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{ideaKey}</span>
      </div>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>{title}</div>
      <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: aiCallout ? '8px' : '12px' }}>{body}</div>
      {aiCallout && (
        <div style={{ background: '#F5F3FF', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#7C3AED', fontWeight: 600, marginBottom: '12px' }}>
          {aiCallout}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        {buttons.map(b => (
          <button key={b.label} onClick={b.onClick} style={{
            background: b.bg, color: '#FFFFFF', border: 'none', borderRadius: '6px',
            padding: '6px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
          }}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
