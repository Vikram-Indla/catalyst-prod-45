import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { CheckCircle2, XCircle, Sparkles, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
}

const STEPS = [
  'Reading BRD content',
  'Identifying functional domains',
  'Drafting epic statements',
  'Mapping to Catalyst epic fields',
  'Quality validation',
];

// step: -1=error, 0-4=in progress, 5=done
export default function RAEpicGenerationModal({ doc, onClose }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const [epicCount, setEpicCount] = useState(0);
  const invokeKey = useRef(0);

  const runGeneration = (key: number) => {
    let cancelled = false;
    let stepIndex = 0;

    const ticker = setInterval(() => {
      if (cancelled) return;
      stepIndex = Math.min(stepIndex + 1, 3);
      setStep(stepIndex);
      setProgress(Math.round((stepIndex / 5) * 80));
    }, 1400);

    supabase.functions
      .invoke('generate_epics_for_brd', { body: { brd_id: doc.id } })
      .then(({ data, error }) => {
        clearInterval(ticker);
        if (cancelled) return;

        if (error) {
          setStep(-1);
          setErrorMsg(error.message || JSON.stringify(error));
          return;
        }
        if (!data || data.error) {
          setStep(-1);
          setErrorMsg(data?.error || data?.message || 'No data returned');
          return;
        }

        // SUCCESS
        setStep(5);
        setProgress(100);
        setDone(true);
        setEpicCount(data?.epic_count ?? 0);
        qc.invalidateQueries({ queryKey: RA_KEYS.all });
        setTimeout(() => {
          toast.success(`${data?.epic_count ?? 0} epics generated successfully`);
        }, 600);
      })
      .catch((err) => {
        clearInterval(ticker);
        if (cancelled) return;
        setStep(-1);
        setErrorMsg(err?.message || String(err));
      });

    return () => {
      cancelled = true;
      clearInterval(ticker);
    };
  };

  useEffect(() => {
    const cleanup = runGeneration(invokeKey.current);
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setErrorMsg('');
    setStep(0);
    setProgress(0);
    setDone(false);
    invokeKey.current += 1;
    runGeneration(invokeKey.current);
  };

  // Derive step states for rendering
  const getStepState = (i: number): 'done' | 'active' | 'pending' => {
    if (done) return 'done';
    if (step === -1) return i === 0 ? 'active' : 'pending'; // error freezes display
    if (i < Math.min(step, 4)) return 'done';
    if (i === Math.min(step, 4)) return 'active';
    return 'pending';
  };

  const progressColor = done ? '#16A34A' : step === -1 ? '#DC2626' : '#7C3AED';

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: '#FFFFFF', borderRadius: 10, zIndex: 70,
        padding: 28, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* ── SUCCESS STATE ── */}
        {done && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={40} color="#16A34A" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                Epics Generated Successfully
              </h3>
              <p style={{ fontSize: 14, color: '#6B7280', margin: 0, textAlign: 'center' }}>
                {epicCount} epic statement{epicCount !== 1 ? 's' : ''} created for {doc.title}
              </p>
            </div>

            {/* All steps green */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: '#DCFCE7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={14} color="#16A34A" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{s}</span>
                </div>
              ))}
            </div>

            {/* Progress full green */}
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', borderRadius: 999, background: '#16A34A', transition: 'width 0.4s ease' }} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '0.75px solid #E2E8F0', paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                View Epics →
              </button>
            </div>
          </>
        )}

        {/* ── ERROR STATE ── */}
        {!done && step === -1 && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={32} color="#DC2626" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                Generation Failed
              </h3>
            </div>

            <div style={{
              padding: '12px 14px', borderRadius: 6,
              background: '#FEF2F2', border: '0.75px solid #FECACA', marginBottom: 12,
            }}>
              <code style={{
                fontSize: 13, color: '#991B1B', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}>
                {errorMsg}
              </code>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              Check Supabase Edge Function logs → generate_epics_for_brd
            </p>

            {/* Progress bar red */}
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(progress, 10)}%`, borderRadius: 999, background: '#DC2626', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '0.75px solid #E2E8F0', paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          </>
        )}

        {/* ── IN PROGRESS STATE ── */}
        {!done && step >= 0 && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#F5F3FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={16} color="#7C3AED" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                  Generating Epic Statements
                </h3>
                <p style={{ fontSize: 13, color: '#64748B', margin: '2px 0 0' }}>
                  From: {doc.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: '#94A3B8', margin: '8px 0 16px', paddingLeft: 42 }}>
              This typically takes ~2 minutes. You can leave this screen.
            </p>

            {/* Progress bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>{STEPS[Math.min(step, 4)]}</span>
              <span style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, background: '#7C3AED',
                width: `${Math.max(progress, 8)}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>

            {/* Steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              {STEPS.map((s, i) => {
                const state = getStepState(i);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 0' }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: state === 'done' ? '#DCFCE7' : state === 'active' ? '#F5F3FF' : '#F3F4F6',
                      }}>
                        {state === 'done' ? (
                          <Check size={14} color="#16A34A" strokeWidth={2.5} />
                        ) : state === 'active' ? (
                          <Loader2 size={14} color="#7C3AED" style={{ animation: 'ra-epic-spin 1s linear infinite' }} />
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>{i + 1}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: state === 'active' ? 600 : state === 'done' ? 500 : 400,
                        color: state === 'done' ? '#374151' : state === 'active' ? '#7C3AED' : '#9CA3AF',
                      }}>
                        {s}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        width: 2, height: 10, marginLeft: 13,
                        background: state === 'done' ? '#DCFCE7' : '#E2E8F0',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info strip */}
            <div style={{
              background: '#F5F3FF', borderRadius: 6, padding: '8px 12px', marginBottom: 20,
            }}>
              <span style={{ fontSize: 12, color: '#7C3AED' }}>
                ⏱ Estimated: ~2 minutes · You'll be notified when done
              </span>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '0.75px solid #E2E8F0', paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: '#FFFFFF', color: '#374151', cursor: 'pointer',
                }}
              >
                Stay on this page
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: '#FFFFFF', color: '#374151', cursor: 'pointer',
                }}
              >
                Leave & Notify Me When Done
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`@keyframes ra-epic-spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
