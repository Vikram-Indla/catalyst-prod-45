/**
 * IdeationTriagePanel — AI Triage drawer with monochrome authority design
 */
import React, { useEffect } from 'react';
import { X, Sparkles, Zap, Eye, GitMerge, FileSearch, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
  onMerge?: (primaryKey: string, mergeKey: string) => void;
  onConvert?: (key: string) => void;
}

const DOT_COLORS: Record<string, string> = {
  'Fast-Track': '#16A34A',
  'Merge': '#2563EB',
  'Investigate': '#D97706',
  'Defer': '#94A3B8',
};

const CATEGORY_TEXT_COLORS: Record<string, string> = {
  'FAST-TRACK RECOMMENDED': '#16A34A',
  'MERGE CANDIDATES': '#2563EB',
  'NEEDS INVESTIGATION': '#D97706',
  'RECOMMENDED TO DEFER': '#64748B',
};

export default function IdeationTriagePanel({ open, onClose, onMerge, onConvert }: Props) {
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
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#7C3AED" strokeWidth={2} />
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#0F172A' }}>AI Intelligence — Triage Results</span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}><X size={18} /></button>
          </div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#64748B', marginTop: '4px' }}>4 ideas analyzed · 11 recommendations</div>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: '16px 20px',
          scrollbarWidth: 'thin', scrollbarColor: '#CBD5E1 transparent',
        }}>
          {/* Fast-Track Section */}
          <CategoryHeader label="FAST-TRACK RECOMMENDED" sub="1 idea meets all approval criteria" />
          <TriageCard
            badge="Fast-Track" ideaKey="IDH-011"
            title="Automated Regulatory Impact Assessment"
            body="Strong V2030 Pillar 1 alignment (5/5), IMPACT 4.20, 11 votes, no duplicates detected. All approval criteria met."
            aiSuggestion="All approval criteria met — recommended for immediate fast-track to Approved status."
            primary={{ label: 'Fast-Track to Approved', icon: <Zap size={14} color="#FFFFFF" strokeWidth={2} />, onClick: () => { onConvert?.('IDH-011'); toast.success('IDH-011 fast-tracked to Approved'); } }}
            secondary={{ label: 'Review First', icon: <Eye size={14} strokeWidth={2} />, onClick: () => toast('Review started for IDH-011') }}
          />

          {/* Merge Section */}
          <CategoryHeader label="MERGE CANDIDATES" sub="1 pair with high similarity detected" />
          <TriageCard
            badge="Merge" ideaKey="IDH-010"
            title="Stakeholder Communication Hub"
            body="87% similarity with IDH-001 (Unified Digital Services Portal). Overlapping scope, shared stakeholders."
            aiSuggestion="Consolidate IDH-010 into IDH-001 — merge 2 ideas into 1 initiative for stronger impact."
            primary={{ label: 'Merge & Consolidate', icon: <GitMerge size={14} color="#FFFFFF" strokeWidth={2} />, onClick: () => { onMerge?.('IDH-001', 'IDH-010'); } }}
            secondary={{ label: 'Keep Separate', icon: <X size={14} strokeWidth={2} />, onClick: () => toast('IDH-010 kept separate') }}
          />

          {/* Investigate Section */}
          <CategoryHeader label="NEEDS INVESTIGATION" sub="1 idea requires additional documentation" />
          <TriageCard
            badge="Investigate" ideaKey="IDH-002"
            title="AI-Powered Permit Classification"
            body="94.2% classification accuracy in pilot. Missing formal business case document. Requires stakeholder sign-off."
            aiSuggestion="Strong technical merit but incomplete business justification — request formal business case before approval."
            primary={{ label: 'Request Business Case', icon: <FileSearch size={14} color="#FFFFFF" strokeWidth={2} />, onClick: () => toast('Business case requested for IDH-002') }}
            secondary={{ label: 'Defer 30 Days', icon: <Clock size={14} strokeWidth={2} />, onClick: () => toast('IDH-002 deferred 30 days') }}
          />

          {/* Defer Section */}
          <CategoryHeader label="RECOMMENDED TO DEFER" sub="1 idea below threshold" />
          <TriageCard
            badge="Defer" ideaKey="IDH-006"
            title="Predictive Maintenance for Legacy Systems"
            body="IMPACT 2.80 below threshold (3.0). Limited strategic alignment. 3 legacy systems at EOL — consider as part of infrastructure refresh."
            aiSuggestion="Below minimum IMPACT threshold. Recommend deferral to Q2 infrastructure planning cycle."
            primary={{ label: 'Defer to Q2', icon: <Clock size={14} color="#FFFFFF" strokeWidth={2} />, onClick: () => toast('IDH-006 deferred to Q2') }}
            secondary={{ label: 'Reject', icon: <X size={14} strokeWidth={2} />, onClick: () => toast('IDH-006 rejected') }}
          />

          {/* Compliance Scan */}
          <div style={{ marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Compliance Scan</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {[{ code: 'DGA-ACC-01', count: 8 }, { code: 'NCA-SEC-02', count: 5 }, { code: 'NDMO-DG-03', count: 6 }, { code: 'SDAIA-AI-01', count: 3 }].map(c => (
                <span key={c.code} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  fontFamily: "'Inter', monospace", fontSize: '11px', fontWeight: 600,
                  background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569',
                  padding: '4px 10px', borderRadius: '4px',
                }}>
                  {c.code} <span style={{ fontWeight: 700, color: '#0F172A' }}>{c.count}</span>
                </span>
              ))}
            </div>

            {/* V2030 Alignment */}
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>V2030 Alignment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[{ name: 'Vibrant Society', score: '3.2' }, { name: 'Thriving Economy', score: '4.5' }, { name: 'Ambitious Nation', score: '4.1' }].map(p => (
                <div key={p.name} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Inter', monospace", fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{p.score}</div>
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

/* Category section header */
function CategoryHeader({ label, sub }: { label: string; sub: string }) {
  const color = CATEGORY_TEXT_COLORS[label] || '#64748B';
  return (
    <div style={{ marginBottom: '12px', marginTop: '8px' }}>
      <div style={{ borderTop: '1px solid #E2E8F0', marginBottom: '16px' }} />
      <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', color, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{sub}</div>
    </div>
  );
}

/* Unified triage card */
function TriageCard({ badge, ideaKey, title, body, aiSuggestion, primary, secondary }: {
  badge: string;
  ideaKey: string;
  title: string;
  body: string;
  aiSuggestion?: string;
  primary: { label: string; icon: React.ReactNode; onClick: () => void };
  secondary: { label: string; icon: React.ReactNode; onClick: () => void };
}) {
  const dotColor = DOT_COLORS[badge] || '#94A3B8';

  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '10px',
      padding: '16px', marginBottom: '10px',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
    }}>
      {/* Badge + Key */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          background: '#F1F5F9', color: '#475569',
          padding: '3px 10px', borderRadius: '4px',
          fontSize: '11px', fontWeight: 600, letterSpacing: '0.02em', textTransform: 'uppercase',
        }}>
          <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
          {badge}
        </span>
        <span style={{ fontFamily: "'Inter', monospace", fontSize: '12px', fontWeight: 600, color: '#64748B' }}>{ideaKey}</span>
      </div>

      {/* Title */}
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A', marginTop: '8px', lineHeight: 1.4 }}>{title}</div>

      {/* Body */}
      <div style={{ fontSize: '13px', fontWeight: 400, color: '#64748B', lineHeight: 1.5, marginTop: '4px' }}>{body}</div>

      {/* AI Suggestion */}
      {aiSuggestion && (
        <div style={{
          background: '#F8FAFC', borderLeft: '2px solid #CBD5E1',
          borderRadius: '0 6px 6px 0', padding: '8px 12px', marginTop: '10px',
          fontSize: '12px', fontWeight: 500, color: '#475569', lineHeight: 1.4,
        }}>
          {aiSuggestion}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {/* Primary */}
        <button onClick={primary.onClick} style={{
          background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px',
          padding: '7px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'background 150ms',
          fontFamily: 'Inter',
        }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')}
          onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
        >
          {primary.icon} {primary.label}
        </button>

        {/* Secondary */}
        <button onClick={secondary.onClick} style={{
          background: '#FFFFFF', color: '#475569', border: '1.5px solid #E2E8F0', borderRadius: '6px',
          padding: '7px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: '6px', transition: 'all 150ms',
          fontFamily: 'Inter',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569'; }}
        >
          {secondary.icon} {secondary.label}
        </button>
      </div>
    </div>
  );
}
