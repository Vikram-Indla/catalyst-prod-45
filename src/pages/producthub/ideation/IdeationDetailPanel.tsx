/**
 * IdeationDetailPanel — Slide-over panel with 5 tabs
 */
import React, { useState, useEffect } from 'react';
import { X, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { Idea, ideas, STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, IDEA_IMPACT_FACTORS, getImpactColor } from './ideation-data';

interface Props {
  ideaKey: string | null;
  onClose: () => void;
  onConvert?: (key: string) => void;
}

type Tab = 'details' | 'impact' | 'ai' | 'evidence' | 'comments';

const TABS: { key: Tab; label: string; purple?: boolean }[] = [
  { key: 'details', label: 'Details' },
  { key: 'impact', label: 'IMPACT' },
  { key: 'ai', label: '✦ AI Analysis', purple: true },
  { key: 'evidence', label: 'Evidence' },
  { key: 'comments', label: 'Comments' },
];

export default function IdeationDetailPanel({ ideaKey, onClose, onConvert }: Props) {
  const [tab, setTab] = useState<Tab>('details');
  const idea = ideas.find(i => i.key === ideaKey);

  useEffect(() => {
    if (ideaKey) setTab('details');
  }, [ideaKey]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (ideaKey) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [ideaKey, onClose]);

  if (!idea) return null;

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200,
      }} />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '680px',
        background: '#FFFFFF', zIndex: 201, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700,
            color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: '6px',
          }}>
            {idea.key}
          </span>
          <span style={{ fontSize: '17px', fontWeight: 700, flex: 1, color: '#0F172A' }}>{idea.title}</span>
          <button onClick={() => {}} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '5px 8px', cursor: 'pointer', color: '#64748B' }}>
            <Edit2 size={14} />
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#94A3B8' }}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex' }}>
          {TABS.map(t => {
            const active = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                background: active ? '#FFFFFF' : 'transparent',
                border: 'none', borderBottom: active ? `2px solid ${t.purple ? '#7C3AED' : '#2563EB'}` : '2px solid transparent',
                padding: '10px 14px', fontSize: '13px', fontWeight: active ? 600 : 500, cursor: 'pointer',
                color: active ? (t.purple ? '#7C3AED' : '#2563EB') : '#64748B',
              }}>
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {tab === 'details' && <DetailsTab idea={idea} onConvert={onConvert} />}
          {tab === 'impact' && <ImpactTab idea={idea} />}
          {tab === 'ai' && <AiTab idea={idea} />}
          {tab === 'evidence' && <EvidenceTab idea={idea} />}
          {tab === 'comments' && <CommentsTab idea={idea} />}
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

// ─── Details Tab ─────────────────────────────────────────────────
function DetailsTab({ idea, onConvert }: { idea: Idea; onConvert?: (key: string) => void }) {
  const sc = STATUS_CONFIG[idea.status];
  const tc = TYPE_CONFIG[idea.type];
  const pc = PRIORITY_CONFIG[idea.priority] || PRIORITY_CONFIG.P4;

  return (
    <div>
      {/* Convert banner for approved ideas */}
      {idea.status === 'approved' && (
        <div style={{
          background: 'linear-gradient(90deg, #F0FDF4, #EFF6FF)', border: '1px solid #86EFAC',
          borderRadius: '12px', padding: '14px 16px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>🚀</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>This idea is approved and ready for promotion</div>
            <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>Convert to an initiative to begin planning and execution.</div>
          </div>
          <button onClick={() => onConvert?.(idea.key)} style={{
            background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '8px',
            padding: '8px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>
            → Convert to Initiative
          </button>
        </div>
      )}

      {/* Field grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <FieldRow label="Status">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: sc.bg, color: sc.text, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: sc.dot }} />
            {sc.label}
          </span>
        </FieldRow>
        <FieldRow label="Priority">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 800, background: pc.bg, color: pc.text, padding: '2px 7px', borderRadius: '4px' }}>{idea.priority}</span>
        </FieldRow>
        <FieldRow label="Type">
          <span style={{ background: tc.bg, color: tc.text, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{tc.label}</span>
        </FieldRow>
        <FieldRow label="Source"><span style={{ fontSize: '13px', color: '#334155' }}>{idea.subtitle.split(' · ')[0]}</span></FieldRow>
        <FieldRow label="Department"><span style={{ fontSize: '13px', color: '#334155' }}>{idea.dept}</span></FieldRow>
        <FieldRow label="Assignee">
          {idea.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: idea.assignee.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '9px', fontWeight: 700 }}>{idea.assignee.initials}</div>
              <span style={{ fontSize: '13px', color: '#334155' }}>{idea.assignee.name}</span>
            </div>
          ) : <span style={{ fontSize: '13px', color: '#94A3B8' }}>Unassigned</span>}
        </FieldRow>
        <FieldRow label="Created"><span style={{ fontSize: '13px', color: '#334155' }}>{idea.subtitle.split(' · ')[1]}, 2026</span></FieldRow>
        <FieldRow label="Votes">
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: idea.votes > 0 ? '#16A34A' : idea.votes < 0 ? '#EF4444' : '#94A3B8' }}>
            ▲ {idea.votes}
          </span>
        </FieldRow>
      </div>

      {/* Description */}
      <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #F4F4F5', marginBottom: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '6px', textTransform: 'uppercase' }}>Description</div>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
          {idea.title} — A comprehensive initiative to streamline operations, improve efficiency, and deliver measurable outcomes aligned with organizational strategy and V2030 objectives. This idea addresses key pain points identified through stakeholder feedback and data analysis.
        </div>
      </div>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {['Digital', 'V2030', idea.dept.split(' ')[0]].map(tag => (
          <span key={tag} style={{ background: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 500 }}>{tag}</span>
        ))}
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label}</div>
      {children}
    </div>
  );
}

// ─── IMPACT Tab ──────────────────────────────────────────────────
function ImpactTab({ idea }: { idea: Idea }) {
  const factors = IDEA_IMPACT_FACTORS[idea.key] || { I: 3, M: 3, P: 3, A: 3, C: 3, T: 3 };
  const ic = getImpactColor(idea.impact);
  const ratingLabel = idea.impact >= 4.0 ? 'Excellent' : idea.impact >= 3.0 ? 'Good' : idea.impact >= 2.0 ? 'Fair' : 'Low';
  const ratingBg = idea.impact >= 4.0 ? '#DCFCE7' : idea.impact >= 3.0 ? '#DBEAFE' : idea.impact >= 2.0 ? '#FEF3C7' : '#FECACA';
  const ratingText = idea.impact >= 4.0 ? '#15803D' : idea.impact >= 3.0 ? '#1D4ED8' : idea.impact >= 2.0 ? '#B45309' : '#B91C1C';

  const FACTOR_DEFS = [
    { key: 'I', name: 'Investment Fit', weight: 25, color: '#2563EB' },
    { key: 'M', name: 'Market Size', weight: 20, color: '#0D9488' },
    { key: 'P', name: 'Problem Severity', weight: 20, color: '#D97706' },
    { key: 'A', name: 'Advantage', weight: 15, color: '#7C3AED' },
    { key: 'C', name: 'Complexity (inv.)', weight: 10, color: '#16A34A' },
    { key: 'T', name: 'Time to Value', weight: 10, color: '#EF4444' },
  ];

  return (
    <div>
      {/* Score header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '24px' }}>
        <span style={{ fontSize: '36px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-1px', color: ic.text }}>
          {idea.impact.toFixed(2)}
        </span>
        <span style={{ fontSize: '13px', color: '#94A3B8' }}>out of 5.00</span>
        <span style={{ fontSize: '11px', fontWeight: 600, background: ratingBg, color: ratingText, padding: '3px 8px', borderRadius: '10px' }}>{ratingLabel}</span>
      </div>

      {/* Factor rows */}
      {FACTOR_DEFS.map(f => {
        const val = factors[f.key as keyof typeof factors];
        return (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
              {f.key}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>{f.name}</span>
                <span style={{ fontSize: '11px', color: '#94A3B8' }}>{f.weight}%</span>
              </div>
              <div style={{ height: '8px', background: '#E4E4E7', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(val / 5) * 100}%`, height: '100%', background: f.color, borderRadius: '4px', transition: 'width 0.3s' }} />
              </div>
            </div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700, color: f.color, minWidth: '28px', textAlign: 'right' }}>
              {val.toFixed(1)}
            </span>
          </div>
        );
      })}

      {/* AI suggestion */}
      <div style={{ marginTop: '20px', background: '#F5F3FF', border: '1px solid #EDE9FE', borderRadius: '8px', padding: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: '#7C3AED', marginBottom: '4px' }}>✦ AI Score Suggestion</div>
        <div style={{ fontSize: '12px', color: '#6D28D9', lineHeight: 1.5 }}>
          Based on similar initiatives and historical data, the AI model suggests the Investment Fit score could be adjusted to {(factors.I + 0.3).toFixed(1)} given recent ministry alignment signals.
        </div>
      </div>
    </div>
  );
}

// ─── AI Analysis Tab ─────────────────────────────────────────────
function AiTab({ idea }: { idea: Idea }) {
  return (
    <div>
      {/* Summary */}
      <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EFF6FF)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#7C3AED', marginBottom: '6px' }}>✦ AI Summary</div>
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6 }}>
          This idea demonstrates strong alignment with digital transformation objectives and V2030 goals. AI analysis indicates high feasibility with existing infrastructure and team capabilities. Recommended priority: {idea.priority}.
        </div>
      </div>

      {/* Categories */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>Suggested Categories</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[{ label: '🏢 Digital Transformation', conf: 98 }, { label: '📊 Data Analytics', conf: 72 }, { label: '🤖 AI & Automation', conf: 65 }].map(c => (
            <span key={c.label} style={{ background: '#EDE9FE', color: '#7C3AED', padding: '4px 10px', borderRadius: '16px', fontSize: '11px', fontWeight: 600 }}>
              {c.label} <span style={{ opacity: 0.7 }}>{c.conf}%</span>
            </span>
          ))}
        </div>
      </div>

      {/* Similar ideas */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>Similar Ideas</div>
        {[
          { match: 87, key: 'IDH-010', title: 'Stakeholder Communication Hub', status: 'submitted' },
          { match: 62, key: 'IDH-004', title: 'Bilingual Document Generation Engine', status: 'under_review' },
        ].map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid #F4F4F5' }}>
            <span style={{ background: '#EDE9FE', color: '#7C3AED', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', fontFamily: "'JetBrains Mono', monospace" }}>{s.match}%</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', fontWeight: 600, color: '#2563EB' }}>{s.key}</span>
            <span style={{ fontSize: '12px', color: '#334155', flex: 1 }}>{s.title}</span>
            <span style={{ fontSize: '10px', color: '#94A3B8' }}>{s.status.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Compliance */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>Compliance Auto-Tags</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['DGA-ACC-01', 'NCA-SEC-02', 'NDMO-DG-03'].map(c => (
            <span key={c} style={{ background: '#F1F5F9', color: '#334155', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>
              ✓ {c}
            </span>
          ))}
        </div>
      </div>

      {/* V2030 */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '8px', textTransform: 'uppercase' }}>V2030 Mapping</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
          {[{ name: 'Vibrant Society', score: 3.2, bg: '#DBEAFE' }, { name: 'Thriving Economy', score: 4.5, bg: '#DCFCE7' }, { name: 'Ambitious Nation', score: 4.1, bg: '#FEF3C7' }].map(p => (
            <div key={p.name} style={{ background: p.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: '#0F172A' }}>{p.score}</div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748B', marginTop: '2px' }}>{p.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Evidence Tab ────────────────────────────────────────────────
function EvidenceTab({ idea }: { idea: Idea }) {
  const evidence = [
    { type: 'Document', color: '#2563EB', bg: '#EFF6FF', title: 'V2030 Digital Government Strategy — Section 4.2', desc: 'National digital transformation framework mandating unified service portals for all government entities.', uploader: 'Sarah K.', date: 'Feb 5, 2026' },
    { type: 'Data', color: '#16A34A', bg: '#F0FDF4', title: 'Citizen Service Survey Results (Q3 2025)', desc: 'Survey of 12,000 citizens showing 78% satisfaction improvement with digital-first services.', uploader: 'Ahmed M.', date: 'Feb 6, 2026' },
    { type: 'Benchmark', color: '#D97706', bg: '#FFFBEB', title: 'UAE Ministry of Economy — Unified Portal Case Study', desc: 'Benchmark analysis of UAE unified portal implementation achieving 40% efficiency gain.', uploader: 'Fatima R.', date: 'Feb 7, 2026' },
  ];

  return (
    <div>
      {evidence.map((ev, i) => (
        <div key={i} style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ background: ev.bg, color: ev.color, padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700 }}>{ev.type}</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{ev.title}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5, marginBottom: '8px' }}>{ev.desc}</div>
          <div style={{ fontSize: '11px', color: '#94A3B8' }}>Uploaded by {ev.uploader} · {ev.date}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Comments Tab ────────────────────────────────────────────────
function CommentsTab({ idea }: { idea: Idea }) {
  const [comment, setComment] = useState('');
  const comments = [
    { name: 'Sarah K.', initials: 'SK', color: '#0D9488', time: '2 days ago', text: "The Minister's directive specifically mentions this as a Q1 2026 priority. We should fast-track the evaluation.", isAi: false },
    { name: 'Ahmed M.', initials: 'AM', color: '#2563EB', time: '1 day ago', text: 'Agreed. I\'ve reviewed the technical feasibility — our current infrastructure can support this with minimal additional investment.', isAi: false },
    { name: 'AI Assistant', initials: '✦', color: '#7C3AED', time: '12 min ago', text: 'Note: IDH-013 (Integrated Payment Gateway) has an 87% similarity score with this idea. Consider merging to consolidate effort and increase impact.', isAi: true },
  ];

  return (
    <div>
      {comments.map((c, i) => (
        <div key={i} style={{
          marginBottom: '16px', padding: c.isAi ? '10px' : undefined,
          background: c.isAi ? '#F5F3FF' : undefined, borderRadius: c.isAi ? '8px' : undefined,
          border: c.isAi ? '1px solid #EDE9FE' : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '10px', fontWeight: 700 }}>
              {c.initials}
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{c.name}</span>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{c.time}</span>
          </div>
          <div style={{ fontSize: '13px', color: '#334155', lineHeight: 1.6, marginLeft: '36px' }}>{c.text}</div>
        </div>
      ))}

      {/* Comment input */}
      <div style={{ marginTop: '20px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Add a comment..."
          style={{ width: '100%', minHeight: '80px', padding: '10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', resize: 'vertical', outline: 'none' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
          <button style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>Attach</button>
          <button onClick={() => { if (comment.trim()) { setComment(''); toast.success('Comment posted'); } }} style={{
            background: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}>Post Comment</button>
        </div>
      </div>
    </div>
  );
}
