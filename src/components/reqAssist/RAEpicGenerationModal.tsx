import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Search, Sparkles, CheckCircle, Database, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
}

type StepState = 'pending' | 'active' | 'complete' | 'error';

const STEPS = [
  { label: 'Analysing document structure', icon: FileText },
  { label: 'Extracting key themes', icon: Search },
  { label: 'Generating epic statements', icon: Sparkles },
  { label: 'Validating against BRD criteria', icon: CheckCircle },
  { label: 'Saving epics to workspace', icon: Database },
];

export default function RAEpicGenerationModal({ doc, onClose }: Props) {
  const qc = useQueryClient();
  const [stepStates, setStepStates] = useState<StepState[]>(
    ['active', 'pending', 'pending', 'pending', 'pending']
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<{ epic_count: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const promiseResolved = useRef(false);
  const currentSimStep = useRef(0);

  const advanceSimStep = useCallback(() => {
    if (promiseResolved.current) return;
    const next = currentSimStep.current + 1;
    if (next >= 4) {
      // Don't advance past step 4 (index 3) — step 5 is real
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    currentSimStep.current = next;
    setStepStates(prev => {
      const ns = [...prev];
      ns[next - 1] = 'complete';
      ns[next] = 'active';
      return ns;
    });
  }, []);

  useEffect(() => {
    // Start simulated step advancement
    timerRef.current = setInterval(advanceSimStep, 1200);

    // Call edge function
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate_epics_for_brd', {
          body: { brd_id: doc.id },
        });

        if (error) throw new Error(error.message || 'Edge function failed');
        if (data?.error) throw new Error(data.error);

        promiseResolved.current = true;
        if (timerRef.current) clearInterval(timerRef.current);

        // Complete all steps
        setStepStates(['complete', 'complete', 'complete', 'complete', 'complete']);
        setResult({ epic_count: data?.epic_count ?? 0 });
        qc.invalidateQueries({ queryKey: RA_KEYS.all });
      } catch (err: any) {
        promiseResolved.current = true;
        if (timerRef.current) clearInterval(timerRef.current);

        // Mark current step as error
        setStepStates(prev => {
          const ns = [...prev];
          const activeIdx = ns.findIndex(s => s === 'active');
          if (activeIdx >= 0) ns[activeIdx] = 'error';
          return ns;
        });
        setErrorMsg(err?.message || 'An unexpected error occurred');
      }
    })();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isComplete = result !== null;
  const isError = errorMsg !== null;
  const isRunning = !isComplete && !isError;

  const handleRetry = () => {
    setErrorMsg(null);
    setResult(null);
    promiseResolved.current = false;
    currentSimStep.current = 0;
    setStepStates(['active', 'pending', 'pending', 'pending', 'pending']);

    timerRef.current = setInterval(advanceSimStep, 1200);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('generate_epics_for_brd', {
          body: { brd_id: doc.id },
        });
        if (error) throw new Error(error.message || 'Edge function failed');
        if (data?.error) throw new Error(data.error);

        promiseResolved.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        setStepStates(['complete', 'complete', 'complete', 'complete', 'complete']);
        setResult({ epic_count: data?.epic_count ?? 0 });
        qc.invalidateQueries({ queryKey: RA_KEYS.all });
      } catch (err: any) {
        promiseResolved.current = true;
        if (timerRef.current) clearInterval(timerRef.current);
        setStepStates(prev => {
          const ns = [...prev];
          const activeIdx = ns.findIndex(s => s === 'active');
          if (activeIdx >= 0) ns[activeIdx] = 'error';
          return ns;
        });
        setErrorMsg(err?.message || 'An unexpected error occurred');
      }
    })();
  };

  return (
    <>
      {/* Overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 60 }} />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: '#FFFFFF', borderRadius: 6, zIndex: 70,
        padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        fontFamily: "'Inter', sans-serif",
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Sparkles size={20} color="#7C3AED" />
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>
            Generating Epics
          </h3>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 24px', paddingLeft: 30 }}>
          {doc.title}
        </p>

        {/* Stepper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          {STEPS.map((step, i) => {
            const state = stepStates[i];
            const Icon = step.icon;
            const isLast = i === STEPS.length - 1;
            return (
              <div key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                  {/* Step icon */}
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                    background: state === 'complete' ? '#E3FCEF'
                      : state === 'active' ? '#F3E8FF'
                      : state === 'error' ? '#FEF2F2'
                      : '#F3F4F6',
                  }}>
                    {state === 'complete' ? (
                      <Check size={14} color="#006644" strokeWidth={2.5} />
                    ) : state === 'active' ? (
                      <Loader2 size={14} color="#7C3AED" style={{ animation: 'ra-epic-spin 1s linear infinite' }} />
                    ) : state === 'error' ? (
                      <X size={14} color="#DC2626" strokeWidth={2.5} />
                    ) : (
                      <Icon size={14} color="#94A3B8" />
                    )}
                  </div>
                  {/* Label */}
                  <span style={{
                    fontSize: 13,
                    fontWeight: state === 'active' ? 650 : 400,
                    color: state === 'complete' ? '#64748B'
                      : state === 'active' ? '#7C3AED'
                      : state === 'error' ? '#DC2626'
                      : '#94A3B8',
                  }}>
                    {step.label}
                  </span>
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div style={{
                    width: 2, height: 12, marginLeft: 13,
                    background: state === 'complete' ? '#E3FCEF' : '#E2E8F0',
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {isError && (
          <div style={{
            padding: '10px 14px', borderRadius: 4,
            background: '#FEF2F2', border: '0.75px solid #FECACA',
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 12, color: '#DC2626', margin: 0, lineHeight: 1.5 }}>
              {errorMsg}
            </p>
          </div>
        )}

        {/* Success message */}
        {isComplete && (
          <div style={{
            padding: '10px 14px', borderRadius: 4,
            background: '#F0FDF4', border: '0.75px solid #BBF7D0',
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 12, color: '#006644', margin: 0, lineHeight: 1.5 }}>
              {result.epic_count} epic{result.epic_count !== 1 ? 's' : ''} generated successfully.
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{
          display: 'flex', gap: 8, justifyContent: 'flex-end',
          borderTop: '0.75px solid #E2E8F0', paddingTop: 16,
        }}>
          {isRunning && (
            <button
              disabled
              style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                borderRadius: 4, border: '0.75px solid #E2E8F0',
                background: '#F3F4F6', color: '#94A3B8', cursor: 'not-allowed',
              }}
            >
              Cancel
            </button>
          )}
          {isComplete && (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 4, border: '0.75px solid #E2E8F0',
                  background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 4, border: 'none',
                  background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
                }}
              >
                View Epics
              </button>
            </>
          )}
          {isError && (
            <>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 4, border: '0.75px solid #E2E8F0',
                  background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500,
                  borderRadius: 4, border: 'none',
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
