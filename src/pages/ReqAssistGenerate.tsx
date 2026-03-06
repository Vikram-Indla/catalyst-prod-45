import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Check, X, BookOpen, Flag, RefreshCw } from 'lucide-react';

export default function ReqAssistGenerate() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [result, setResult] = useState<'none' | 'pass' | 'fail'>('none');

  const handleQualify = () => {
    if (text.trim().length < 50) { setResult('fail'); return; }
    setResult('pass');
  };

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100%', padding: '24px 28px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <button onClick={() => navigate('/product/req-assist')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#64748B', marginBottom: 16, padding: 0, fontFamily: "'Inter', sans-serif" }}>
          <ArrowLeft size={14} /> Back to Library
        </button>

        <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Generate BRD from Text</h1>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', fontFamily: "'Inter', sans-serif" }}>Paste raw requirements text below. The system qualifies content first before generating.</p>

        <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 16px', background: '#F8FAFC', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={15} color="#2563EB" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>Requirements Input</span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>· Paste or type raw requirements text</span>
          </div>
          <div style={{ padding: 16 }}>
            <textarea
              value={text} onChange={e => { setText(e.target.value); setResult('none'); }}
              placeholder="Paste your requirements text here... The system will analyse and qualify the content before generating a structured BRD."
              style={{
                width: '100%', minHeight: 200, padding: 14, fontSize: 14, lineHeight: 1.65,
                border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-input)',
                outline: 'none', resize: 'vertical', fontFamily: "'Inter', sans-serif", color: '#0F172A',
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.10)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
              Minimum 50 characters recommended for qualification
            </p>

            {result === 'fail' && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--ra-radius-card)', display: 'flex', gap: 10 }}>
                <X size={16} color="#DC2626" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>Qualification Failed</div>
                  <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                    The input text is too short or lacks sufficient requirements detail. Please provide at least 50 characters of requirements content.
                  </p>
                </div>
              </div>
            )}

            {result === 'pass' && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--ra-radius-card)', display: 'flex', gap: 10 }}>
                <Check size={16} color="#16A34A" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', fontFamily: "'Inter', sans-serif" }}>Qualification Passed</div>
                  <p style={{ fontSize: 12, color: '#166534', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                    Content qualifies for BRD generation. The system detected structured requirements with sufficient detail.
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={handleQualify} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                <Zap size={13} /> Qualify & Generate
              </button>
              <button onClick={() => { setText(''); setResult('none'); }} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {result === 'pass' && (
          <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>Generated BRD</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 'var(--ra-radius-lozenge)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, background: '#E3FCEF', color: '#006644' }}>QUALIFIED</span>
              <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto', fontFamily: "'Inter', sans-serif" }}>2 sections</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>SECTION 1</span>
                <h4 style={{ fontSize: 15, fontWeight: 650, color: '#0F172A', margin: '4px 0 8px', fontFamily: "'Sora', sans-serif" }}>Executive Summary</h4>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  This document outlines the business requirements derived from the provided input. The system has identified key functional and non-functional requirements for implementation.
                </p>
              </div>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>SECTION 2</span>
                <h4 style={{ fontSize: 15, fontWeight: 650, color: '#0F172A', margin: '4px 0 8px', fontFamily: "'Sora', sans-serif" }}>Functional Requirements</h4>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  Based on the qualified input, the following functional requirements have been identified and structured according to MIM standards.
                </p>
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', gap: 8 }}>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#16A34A', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                <BookOpen size={13} /> Save to Library
              </button>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                <Flag size={13} /> Generate Epics
              </button>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                <RefreshCw size={13} /> Push to WikiHub
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
