import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Search, Sparkles, CheckCircle2, Database, Check, Loader2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { toast } from 'sonner';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
}

type StepState = 'pending' | 'active' | 'complete' | 'error';
type ModalState = 'running' | 'success' | 'error';

const STEPS = [
  { label: 'Analysing document structure', icon: FileText },
  { label: 'Extracting key themes', icon: Search },
  { label: 'Generating epic statements', icon: Sparkles },
  { label: 'Validating against BRD criteria', icon: CheckCircle2 },
  { label: 'Saving epics to workspace', icon: Database },
];

export default function RAEpicGenerationModal({ doc, onClose }: Props) {
  const qc = useQueryClient();
  const [stepStates, setStepStates] = useState<StepState[]>(
    ['active', 'pending', 'pending', 'pending', 'pending']
  );
  const [modalState, setModalState] = useState<ModalState>('running');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [epicCount, setEpicCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promiseResolved = useRef(false);
  const currentSimStep = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const advanceSimStep = useCallback(() => {
    if (promiseResolved.current) return;
    const next = currentSimStep.current + 1;
    if (next >= 4) { clearTimer(); return; }
    currentSimStep.current = next;
    setStepStates(prev => {
      const ns = [...prev];
      ns[next - 1] = 'complete';
      ns[next] = 'active';
      return ns;
    });
  }, [clearTimer]);

  const invokeGeneration = useCallback(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate_epics_for_brd', {
          body: { brd_id: doc.id },
        });

        if (error) {
          promiseResolved.current = true;
          clearTimer();
          setStepStates(prev => {
            const ns = [...prev];
            const idx = ns.findIndex(s => s === 'active');
            if (idx >= 0) ns[idx] = 'error';
            return ns;
          });
          setErrorMsg(error.message || 'Edge Function returned an error');
          setModalState('error');
          return;
        }

        if (!data || data.error) {
          promiseResolved.current = true;
          clearTimer();
          setStepStates(prev => {
            const ns = [...prev];
            const idx = ns.findIndex(s => s === 'active');
            if (idx >= 0) ns[idx] = 'error';
            return ns;
          });
          setErrorMsg(data?.error || 'No data returned from generation');
          setModalState('error');
          return;
        }

        // SUCCESS — complete all steps
        promiseResolved.current = true;
        clearTimer();
        setStepStates(['complete', 'complete', 'complete', 'complete', 'complete']);
        setEpicCount(data?.epic_count ?? 0);
        setModalState('success');
        qc.invalidateQueries({ queryKey: RA_KEYS.all });

        // Fire toast 600ms after modal success state
        setTimeout(() => {
          toast.success(`${data?.epic_count ?? 0} epics generated successfully`);
        }, 600);
      } catch (err: any) {
        promiseResolved.current = true;
        clearTimer();
        setStepStates(prev => {
          const ns = [...prev];
          const idx = ns.findIndex(s => s === 'active');
          if (idx >= 0) ns[idx] = 'error';
          return ns;
        });
        setErrorMsg(err?.message || 'An unexpected error occurred');
        setModalState('error');
      }
    })();
  }, [doc.id, qc, clearTimer]);

  useEffect(() => {
    timerRef.current = setInterval(advanceSimStep, 1200);
    invokeGeneration();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setErrorMsg(null);
    setModalState('running');
    promiseResolved.current = false;
    currentSimStep.current = 0;
    setStepStates(['active', 'pending', 'pending', 'pending', 'pending']);
    timerRef.current = setInterval(advanceSimStep, 1200);
    invokeGeneration();
  };

  // Progress bar
  const completedCount = stepStates.filter(s => s === 'complete').length;
  const progress = modalState === 'success' ? 100 : (completedCount / 5) * 100;
  const progressColor = modalState === 'success' ? '#16A34A' : modalState === 'error' ? '#DC2626' : '#7C3AED';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: '#FFFFFF', borderRadius: 6, zIndex: 70,
        padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* ═══ ERROR HEADER ═══ */}
        {modalState === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <XCircle size={32} color="#DC2626" />
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>
              Epic Generation Failed
            </h3>
          </div>
        )}

        {/* ═══ SUCCESS HEADER ═══ */}
        {modalState === 'success' && (
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
        )}

        {/* ═══ RUNNING HEADER ═══ */}
        {modalState === 'running' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Sparkles size={20} color="#7C3AED" />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                Generating Epics
              </h3>
            </div>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 20px', paddingLeft: 30 }}>
              {doc.title}
            </p>
          </>
        )}

        {/* ═══ PROGRESS BAR ═══ */}
        <div style={{
          width: '100%', height: 6, borderRadius: 999,
          background: '#F3F4F6', marginBottom: 20, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 999,
            background: progressColor,
            width: `${Math.max(progress, modalState === 'running' ? 10 : progress)}%`,
            transition: 'width 0.4s ease, background 0.3s ease',
          }} />
        </div>

        {/* ═══ ERROR BODY ═══ */}
        {modalState === 'error' && (
          <>
            <div style={{
              padding: '12px 14px', borderRadius: 6,
              background: '#FEF2F2', border: '0.75px solid #FECACA',
              marginBottom: 12,
            }}>
              <p style={{
                fontSize: 13, color: '#991B1B', margin: 0, lineHeight: 1.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              }}>
                {errorMsg}
              </p>
            </div>
            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              This is usually caused by a missing AI key, cold function start, or an invalid document. Check the Edge Function logs for details.
            </p>
          </>
        )}

        {/* ═══ STEPPER (running + success) ═══ */}
        {(modalState === 'running' || modalState === 'success') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
            {STEPS.map((step, i) => {
              const state = stepStates[i];
              const isLast = i === STEPS.length - 1;
              return (
                <div key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                      background: state === 'complete' ? '#DCFCE7'
                        : state === 'active' ? '#F5F3FF'
                        : '#F3F4F6',
                    }}>
                      {state === 'complete' ? (
                        <Check size={14} color="#16A34A" strokeWidth={2.5} />
                      ) : state === 'active' ? (
                        <Loader2 size={14} color="#7C3AED" style={{ animation: 'ra-epic-spin 1s linear infinite' }} />
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>{i + 1}</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 13,
                      fontWeight: state === 'active' ? 600 : state === 'complete' ? 500 : 400,
                      color: state === 'complete' ? '#374151'
                        : state === 'active' ? '#7C3AED'
                        : '#9CA3AF',
                    }}>
                      {step.label}
                    </span>
                  </div>
                  {!isLast && (
                    <div style={{
                      width: 2, height: 12, marginLeft: 13,
                      background: state === 'complete' ? '#DCFCE7' : '#E2E8F0',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ═══ FOOTER ═══ */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          borderTop: '0.75px solid #E2E8F0', paddingTop: 16,
        }}>
          {modalState === 'running' && (
            <button
              disabled
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                borderRadius: 6, border: '0.75px solid #E2E8F0',
                background: '#F3F4F6', color: '#94A3B8', cursor: 'not-allowed',
              }}
            >
              Cancel
            </button>
          )}
          {modalState === 'success' && (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 6, border: '0.75px solid #CBD5E1',
                  background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  borderRadius: 6, border: 'none',
                  background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                View Epics
              </button>
            </>
          )}
          {modalState === 'error' && (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 6, border: '0.75px solid #CBD5E1',
                  background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  borderRadius: 6, border: 'none',
                  background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes ra-epic-spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
