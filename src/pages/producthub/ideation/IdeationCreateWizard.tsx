/**
 * IdeationCreateWizard — 8-step drawer wizard for new idea submission
 */
import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { num: 1, label: 'Basics' },
  { num: 2, label: 'Classify' },
  { num: 3, label: 'Evidence' },
  { num: 4, label: 'IMPACT' },
  { num: 5, label: 'V2030' },
  { num: 6, label: 'Comply' },
  { num: 7, label: 'AI Review' },
  { num: 8, label: 'Submit' },
];

const IDEA_TYPES = [
  { key: 'problem', emoji: '🔴', label: 'Problem' },
  { key: 'opportunity', emoji: '🟢', label: 'Opportunity' },
  { key: 'feature', emoji: '🔵', label: 'Feature' },
  { key: 'solution', emoji: '🟣', label: 'Solution' },
  { key: 'improvement', emoji: '🟠', label: 'Improvement' },
];

const IMPACT_FACTORS = [
  { key: 'I', name: 'Investment Fit', weight: 25, color: '#2563EB' },
  { key: 'M', name: 'Market Size', weight: 20, color: '#0D9488' },
  { key: 'P', name: 'Problem Severity', weight: 20, color: '#D97706' },
  { key: 'A', name: 'Advantage', weight: 15, color: '#7C3AED' },
  { key: 'C', name: 'Complexity (inv.)', weight: 10, color: '#16A34A' },
  { key: 'T', name: 'Time to Value', weight: 10, color: '#EF4444' },
];

export default function IdeationCreateWizard({ open, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [ideaType, setIdeaType] = useState('');
  const [category, setCategory] = useState('');
  const [dept, setDept] = useState('');
  const [source, setSource] = useState('');
  const [priority, setPriority] = useState('');
  const [tags, setTags] = useState('');
  const [scores, setScores] = useState<Record<string, number>>({ I: 3, M: 3, P: 3, A: 3, C: 3, T: 3 });
  const [v2030, setV2030] = useState<string[]>(['thriving', 'ambitious']);
  const [compliance, setCompliance] = useState<string[]>([]);
  const [aiReviewDone, setAiReviewDone] = useState(false);

  useEffect(() => {
    if (open) { setStep(1); setTitle(''); setDesc(''); setIdeaType(''); setAiReviewDone(false); }
  }, [open]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) { document.addEventListener('keydown', handleEsc); return () => document.removeEventListener('keydown', handleEsc); }
  }, [open, onClose]);

  if (!open) return null;

  const impactScore = (scores.I * 0.25) + (scores.M * 0.20) + (scores.P * 0.20) + (scores.A * 0.15) + (scores.C * 0.10) + (scores.T * 0.10);

  const handleSubmit = () => {
    onClose();
    toast.success('✓ Idea submitted successfully!');
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 300 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '560px', background: '#FFFFFF', zIndex: 301,
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column',
        animation: 'slideInRight 0.25s ease forwards',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A' }}>💡 Submit New Idea</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}><X size={18} /></button>
        </div>

        {/* Step tabs */}
        <div style={{ padding: '0 16px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFA', display: 'flex', overflowX: 'auto', gap: '0', scrollbarWidth: 'none' as any, msOverflowStyle: 'none' as any }}>
          {STEPS.map(s => {
            const active = step === s.num;
            const completed = step > s.num;
            return (
              <button key={s.num} onClick={() => setStep(s.num)} style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px',
                background: 'none', border: 'none', borderBottom: active ? '2px solid #2563EB' : '2px solid transparent',
                cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                <span style={{
                  width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '10px', fontWeight: 700,
                  background: completed ? '#16A34A' : active ? '#2563EB' : 'transparent',
                  color: completed || active ? '#FFF' : '#94A3B8',
                  border: !completed && !active ? '1.5px solid #CBD5E1' : 'none',
                }}>
                  {completed ? <Check size={10} /> : s.num}
                </span>
                <span style={{ fontSize: '12px', fontWeight: active ? 600 : 500, color: completed ? '#16A34A' : active ? '#2563EB' : '#94A3B8' }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {step === 1 && (
            <div>
              {/* AI autofill bar */}
              <div style={{ background: 'linear-gradient(135deg, #F5F3FF, #EFF6FF)', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={14} style={{ color: '#7C3AED' }} />
                <span style={{ fontSize: '12px', color: '#7C3AED', fontWeight: 600, flex: 1 }}>AI can auto-fill fields from a short description</span>
                <button style={{ background: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Auto-fill</button>
              </div>
              <label style={labelStyle}>Title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter idea title..." style={inputStyle} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Description *</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the idea..." style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Idea Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                {IDEA_TYPES.map(t => (
                  <button key={t.key} onClick={() => setIdeaType(t.key)} style={{
                    background: ideaType === t.key ? '#EFF6FF' : '#FFFFFF',
                    border: `1.5px solid ${ideaType === t.key ? '#2563EB' : '#E2E8F0'}`,
                    borderRadius: '8px', padding: '10px 4px', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.emoji}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: ideaType === t.key ? '#2563EB' : '#334155' }}>{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label style={labelStyle}>Category</label>
              <CustomSelect value={category} onChange={setCategory} options={['Digital Transformation', 'Regulatory Compliance', 'AI & Automation', 'Data & Analytics', 'Citizen Services', 'Sustainability']} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Department</label>
              <CustomSelect value={dept} onChange={setDept} options={['Digital Trans.', 'IT Ops', 'Data & Analytics', 'Customer Exp.', 'Risk & Comp.', 'HR', 'Cybersecurity']} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Source</label>
              <CustomSelect value={source} onChange={setSource} options={['Ministry Directive', 'Internal', 'Stakeholder', 'Customer', 'Research']} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Priority</label>
              <CustomSelect value={priority} onChange={setPriority} options={['P1 — Critical', 'P2 — High', 'P3 — Medium', 'P4 — Low']} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Tags</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Add tags separated by commas..." style={inputStyle} />
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ border: '2px dashed #E2E8F0', borderRadius: '12px', padding: '40px 20px', textAlign: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📎</div>
                <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px' }}>Drop files or click to upload</div>
                <button style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>Browse Files</button>
              </div>
              <label style={labelStyle}>Evidence URL</label>
              <input placeholder="https://..." style={inputStyle} />
              <label style={{ ...labelStyle, marginTop: '16px' }}>Evidence Notes</label>
              <textarea placeholder="Add notes about the evidence..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
            </div>
          )}

          {step === 4 && (
            <div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '10px 14px', marginBottom: '20px', fontSize: '12px', color: '#64748B' }}>
                Rate each factor 1–5. The weighted IMPACT score will be calculated automatically.
              </div>
              {IMPACT_FACTORS.map(f => (
                <div key={f.key} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{f.key}</div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155', flex: 1 }}>{f.name}</span>
                    <span style={{ fontSize: '11px', color: '#94A3B8' }}>{f.weight}%</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: f.color, minWidth: '28px', textAlign: 'right' }}>{scores[f.key].toFixed(1)}</span>
                  </div>
                  <input type="range" min={1} max={5} step={0.5} value={scores[f.key]}
                    onChange={e => setScores(prev => ({ ...prev, [f.key]: parseFloat(e.target.value) }))}
                    style={{ width: '100%', accentColor: f.color }}
                  />
                </div>
              ))}
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px', display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>Calculated IMPACT Score</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '24px', fontWeight: 800, color: impactScore >= 4 ? '#16A34A' : impactScore >= 3 ? '#2563EB' : '#D97706' }}>
                  {impactScore.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {step === 5 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase' }}>V2030 Pillars</div>
              {[{ key: 'vibrant', emoji: '🏛️', name: 'Vibrant Society' }, { key: 'thriving', emoji: '📈', name: 'Thriving Economy' }, { key: 'ambitious', emoji: '🏆', name: 'Ambitious Nation' }].map(p => (
                <label key={p.key} style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '14px',
                  border: `1.5px solid ${v2030.includes(p.key) ? '#2563EB' : '#E2E8F0'}`,
                  borderRadius: '8px', marginBottom: '8px', cursor: 'pointer',
                  background: v2030.includes(p.key) ? '#EFF6FF' : '#FFF',
                }}>
                  <input type="checkbox" checked={v2030.includes(p.key)} onChange={() => setV2030(prev => prev.includes(p.key) ? prev.filter(v => v !== p.key) : [...prev, p.key])} style={{ accentColor: '#2563EB' }} />
                  <span style={{ fontSize: '18px' }}>{p.emoji}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>{p.name}</span>
                </label>
              ))}
            </div>
          )}

          {step === 6 && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '12px', textTransform: 'uppercase' }}>Compliance Standards</div>
              {['DGA-ACC-01', 'NCA-SEC-02', 'NDMO-DG-03', 'SDAIA-AI-01'].map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderBottom: '1px solid #F4F4F5', cursor: 'pointer' }}>
                  <input type="checkbox" checked={compliance.includes(c)} onChange={() => setCompliance(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} style={{ accentColor: '#2563EB' }} />
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', fontWeight: 600, color: '#334155' }}>{c}</span>
                </label>
              ))}
            </div>
          )}

          {step === 7 && (
            <div>
              {!aiReviewDone ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <button onClick={() => setAiReviewDone(true)} style={{
                    background: '#7C3AED', color: '#FFF', border: 'none', borderRadius: '8px', padding: '10px 20px',
                    fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Sparkles size={14} /> Run Analysis
                  </button>
                </div>
              ) : (
                <div>
                  {[
                    { icon: '✅', text: 'No duplicates found', color: '#16A34A' },
                    { icon: '💡', text: 'Category suggestion: Digital Transformation (98%)', color: '#2563EB' },
                    { icon: '🛡️', text: 'Compliance auto-tagged: DGA-ACC-01, NCA-SEC-02', color: '#0D9488' },
                    { icon: '📊', text: `Predicted IMPACT: ${impactScore.toFixed(2)}`, color: '#7C3AED' },
                  ].map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', borderBottom: '1px solid #F4F4F5' }}>
                      <span style={{ fontSize: '16px' }}>{r.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: r.color }}>{r.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 8 && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎯</div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#0F172A', marginBottom: '16px' }}>Ready to Submit</div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px', textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>IMPACT Score</span><div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', fontWeight: 800, color: impactScore >= 4 ? '#16A34A' : '#2563EB' }}>{impactScore.toFixed(2)}</div></div>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>V2030 Pillars</span><div style={{ fontWeight: 600 }}>{v2030.length} selected</div></div>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>Compliance</span><div style={{ fontWeight: 600 }}>{compliance.length} tags</div></div>
                  <div><span style={{ color: '#94A3B8', fontSize: '11px', textTransform: 'uppercase' }}>AI Review</span><div style={{ fontWeight: 600, color: aiReviewDone ? '#16A34A' : '#D97706' }}>{aiReviewDone ? '✓ Complete' : 'Pending'}</div></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>← Previous</button>
          ) : <div />}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}>Cancel</button>
            {step < 8 ? (
              <button onClick={() => setStep(step + 1)} style={{ background: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Next →</button>
            ) : (
              <button onClick={handleSubmit} style={{ background: '#16A34A', color: '#FFF', border: 'none', borderRadius: '6px', padding: '7px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>🚀 Submit Idea</button>
            )}
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

// ─── Custom select (no native <select>) ──────────────────────────
function CustomSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)} style={{
        width: '100%', textAlign: 'left', background: '#FFFFFF', border: '1px solid #E2E8F0',
        borderRadius: '8px', padding: '8px 12px', fontSize: '13px', cursor: 'pointer', color: value ? '#0F172A' : '#94A3B8',
      }}>
        {value || 'Select...'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, background: '#FFFFFF',
          border: '1px solid #E2E8F0', borderRadius: '8px', boxShadow: '0 8px 16px rgba(0,0,0,0.08)',
          zIndex: 50, marginTop: '4px', maxHeight: '200px', overflowY: 'auto',
        }}>
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', fontSize: '13px',
              border: 'none', background: value === opt ? '#EFF6FF' : 'transparent', cursor: 'pointer',
              color: value === opt ? '#2563EB' : '#334155',
            }}
              onMouseEnter={e => { if (value !== opt) e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { if (value !== opt) e.currentTarget.style.background = 'transparent'; }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', outline: 'none', background: '#FFFFFF' };
