import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { CheckCircle2, XCircle, Sparkles, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { sanitiseError } from '@/lib/errorUtils';
import { isValidUUID } from '@/lib/utils/assertUuid';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
  onViewDrafts?: (brdId: string) => void;
}

const STEPS = [
  'Reading BRD content',
  'Identifying functional domains',
  'Drafting epic statements',
  'Mapping to Catalyst epic fields',
  'Quality validation',
];

// step: -1=error, 0-4=in progress, 5=done
export default function RAEpicGenerationModal({ doc, onClose, onViewDrafts }: Props) {
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [done, setDone] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [epicCount, setEpicCount] = useState(0);
  const [resolvedBrdId, setResolvedBrdId] = useState<string | null>(null);
  const hasStarted = useRef(false);
  const doneRef = useRef(false);
  const failedRef = useRef(false);


  // Keep refs in sync
  useEffect(() => { doneRef.current = done; }, [done]);
  useEffect(() => { failedRef.current = hasFailed; }, [hasFailed]);

  // ── EFFECT 1: Visual ticker — runs unconditionally on mount, NO dependencies
  useEffect(() => {
    const id = setInterval(() => {
      if (doneRef.current || failedRef.current) { clearInterval(id); return; }
      setStep(prev => Math.min(prev + 1, 4));
      setProgress(prev => Math.min(prev + 18, 90));
    }, 1500);
    return () => clearInterval(id);
  }, []);

  // ── Resolve brd_documents.id: jira_key lookup FIRST, then seed ──
  const resolveBrdId = async (): Promise<string | null> => {
    // STEP 1: lookup via jira_key (most reliable path)
    const jiraKey = (doc as any).jira_ticket_key
      || (doc as any).jira_key
      || (doc as any).jiraKey;

    if (jiraKey) {
      const { data } = await typedQuery('brd_documents')
        .select('id')
        .eq('jira_key', jiraKey)
        .maybeSingle();
      if (data?.id) return data.id;
    }

    // STEP 2: seed a new brd_documents row
    const rawText = (doc as any).description
      || (doc as any).content_processed
      || (doc as any).content_raw
      || doc.title + ' — placeholder content for epic generation';

    const { data: inserted, error } = await typedQuery('brd_documents')
      .insert({
        jira_key: jiraKey || null,
        title: doc.title,
        raw_text: rawText,
        source_type: 'jira_bulk',
        language: (doc as any).language || 'ar',
      })
      .select('id')
      .single();

    if (error || !inserted?.id) {
      console.error('[EpicModal] Failed to seed brd_documents:', error?.message);
      return null;
    }

    return inserted.id;
  };

  const invokeGeneration = async (brdId: string) => {
    if (!brdId || !isValidUUID(brdId)) {
      throw new Error('No brd_id');
    }

    const { data, error } = await supabase.functions.invoke('generate_epics_for_brd', { body: { brd_id: brdId } });
    if (error) {
      console.error('[RA] Generation failed');
      setHasFailed(true);
      setErrorMsg(sanitiseError(error));
      return;
    }
    if (!data || data.error) {
      const msg = data?.error || data?.message || 'Generation returned no data';
      console.error('[RA] Generation failed');
      setHasFailed(true);
      setErrorMsg(sanitiseError(msg));
      return;
    }
    setStep(5);
    setProgress(100);
    setDone(true);
    setEpicCount(data?.epic_count ?? data?.epics?.length ?? 0);

    // pipeline_stage is set by the Edge Function (sole authority) — no client update
    // ra_tag is set by the Edge Function on INSERT — no client assignment needed

    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    qc.invalidateQueries({ queryKey: ['brd_documents'] });
    qc.invalidateQueries({ queryKey: ['brd-epics'] });
    qc.invalidateQueries({ queryKey: RA_KEYS.stats() });
    qc.invalidateQueries({ queryKey: ['req-assist-stats-bar'] });
    setTimeout(() => toast.success(`Epics generated for ${doc.title}`), 600);
  };

  useEffect(() => {

    // Hard reset ref on every mount
    hasStarted.current = false;
    const run = async () => {

      if (hasStarted.current) return;
      hasStarted.current = true;

      let brdId: string | null = null;

      try {

        brdId = await resolveBrdId();

      } catch (err) {

        setHasFailed(true);

        setErrorMsg('Failed to resolve BRD document. Please retry.');

        return;

      }

      if (!brdId) {

        setHasFailed(true);

        setErrorMsg('Could not find or create BRD document entry. Check jira_ticket_key on this document.');

        return;

      }

      setResolvedBrdId(brdId);

      try {

        await invokeGeneration(brdId);

      } catch (err) {

        console.error('[EpicModal] invokeGeneration threw:', err);

        setHasFailed(true);

        setErrorMsg(sanitiseError(err) || 'Generation failed. Please retry.');

      }

    };

    run();

    // eslint-disable-next-line react-hooks/exhaustive-deps

  }, []);

  const handleRetry = () => {
    setErrorMsg('');
    setHasFailed(false);
    setStep(0);
    setProgress(0);
    setDone(false);
    hasStarted.current = true;

    resolveBrdId().then(async (brdId) => {
      if (!brdId || !isValidUUID(brdId)) {
        throw new Error('No brd_id');
      }
      setResolvedBrdId(brdId);
      await invokeGeneration(brdId);
    }).catch(err => {
      console.error('[RA] Retry failed');
      setHasFailed(true);
      setErrorMsg(sanitiseError(err));
    });
  };

  // Derive step states for rendering
  const getStepState = (i: number): 'done' | 'active' | 'pending' => {
    if (done) return 'done';
    if (step === -1) return i === 0 ? 'active' : 'pending'; // error freezes display
    if (i < Math.min(step, 4)) return 'done';
    if (i === Math.min(step, 4)) return 'active';
    return 'pending';
  };

  const nav = useNavigate();
  const progressColor = done ? 'var(--sem-success)' : step === -1 ? 'var(--sem-danger)' : 'var(--cp-blue)';

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: 'var(--cp-float)', borderRadius: 8, zIndex: 70,
        padding: 28, border: '0.75px solid var(--divider)',
        fontFamily: 'var(--cp-font-body)',
      }}>

        {/* ── SUCCESS STATE ── */}
        {done && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', background: '#F0FDF4',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={40} color="var(--sem-success)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 650, color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--cp-font-heading)' }}>
                Epics Generated Successfully
              </h3>
              <p style={{ fontSize: 14, color: 'var(--fg-3)', margin: 0, textAlign: 'center' }}>
                {epicCount} epic statement{epicCount !== 1 ? 's' : ''} created for {doc.title}
              </p>
            </div>

            {/* All steps green */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20 }}>
              {STEPS.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', background: 'var(--ds-background-success, #DCFCE7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={14} color="var(--sem-success)" strokeWidth={2.5} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-2)' }}>{s}</span>
                </div>
              ))}
            </div>

            {/* Progress full green */}
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: '100%', borderRadius: 999, background: 'var(--sem-success)', transition: 'width 0.4s ease' }} />
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '0.75px solid var(--divider)', paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  onClose();
                  if (onViewDrafts && resolvedBrdId) {
                    onViewDrafts(resolvedBrdId);
                  } else {
                    nav('/product/req-assist');
                  }
                }}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: 'none', background: 'var(--cp-blue)', color: 'var(--ds-text-inverse, #FFFFFF)', cursor: 'pointer',
                }}
              >
                View Epics →
              </button>
            </div>
          </>
        )}

        {/* ── ERROR STATE ── */}
        {hasFailed && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%', background: 'var(--ds-background-danger, #FEF2F2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={32} color="var(--sem-danger)" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 650, color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--cp-font-heading)' }}>
                Generation Failed
              </h3>
            </div>

            <div style={{
              background: 'var(--ds-background-danger, #FEF2F2)', border: '1.5px solid #DC2626', borderRadius: 6,
              padding: '14px 16px', marginBottom: 16, maxHeight: 120, overflowY: 'auto' as const,
            }}>
              <code style={{
                fontSize: 13, color: 'var(--ds-text-danger, #991B1B)', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' as const,
                fontFamily: 'monospace', display: 'block',
              }}>
                {errorMsg || 'Unknown error — check browser console'}
              </code>
            </div>

            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '0 0 20px', lineHeight: 1.5 }}>
              Generation failed. Please try again or contact your administrator.
            </p>

            {/* Progress bar red */}
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(progress, 10)}%`, borderRadius: 999, background: 'var(--sem-danger)', transition: 'width 0.4s ease' }} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '0.75px solid var(--divider)', paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                onClick={handleRetry}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                  border: 'none', background: 'var(--cp-blue)', color: 'var(--ds-text-inverse, #FFFFFF)', cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          </>
        )}

        {/* ── IN PROGRESS STATE ── */}
        {!done && !hasFailed && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 8, background: 'var(--cp-primary-5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div className="ra-epic-spinner-lg" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 650, color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--cp-font-heading)' }}>
                  Generating Epic Statements
                </h3>
                <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '2px 0 0' }}>
                  From: {doc.title}
                </p>
              </div>
            </div>

            <p style={{ fontSize: 12, color: 'var(--fg-4)', margin: '8px 0 16px', paddingLeft: 42 }}>
              This typically takes ~2 minutes. You can leave this screen.
            </p>

            {/* Progress bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--cp-blue)', fontWeight: 600 }}>{STEPS[Math.min(step, 4)]}</span>
              <span style={{ fontSize: 12, color: 'var(--cp-blue)', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, background: 'var(--cp-blue)',
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
                        background: state === 'done' ? 'var(--ds-background-success, #DCFCE7)' : state === 'active' ? 'var(--cp-primary-5)' : '#F3F4F6',
                      }}>
                        {state === 'done' ? (
                          <Check size={14} color="var(--sem-success)" strokeWidth={2.5} />
                        ) : state === 'active' ? (
                          <div className="ra-epic-spinner" />
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-4)' }}>{i + 1}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: state === 'active' ? 600 : state === 'done' ? 500 : 400,
                        color: state === 'done' ? 'var(--fg-2)' : state === 'active' ? 'var(--cp-blue)' : 'var(--fg-4)',
                      }}>
                        {s}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        width: 2, height: 10, marginLeft: 13,
                        background: state === 'done' ? 'var(--ds-background-success, #DCFCE7)' : 'var(--divider)',
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Info strip */}
            <div style={{
              background: 'var(--cp-primary-5)', borderRadius: 6, padding: '8px 12px', marginBottom: 20,
            }}>
              <span style={{ fontSize: 12, color: 'var(--ds-background-brand-bold-hovered, #1D4ED8)' }}>
                ⏱ Estimated: ~2 minutes · You'll be notified when done
              </span>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '0.75px solid var(--divider)', paddingTop: 16 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
                }}
              >
                Stay on this page
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                  border: '0.75px solid #CBD5E1', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer',
                }}
              >
                Leave & Notify Me When Done
              </button>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes ra-epic-spin { to { transform: rotate(360deg); } }
        .ra-epic-spinner {
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          border: 2px solid var(--ds-text-brand, #2563EB) !important;
          border-top-color: transparent !important;
          animation: ra-epic-spin 0.8s linear infinite !important;
          flex-shrink: 0 !important;
        }
        .ra-epic-spinner-lg {
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          border: 2.5px solid var(--ds-text-brand, #2563EB) !important;
          border-top-color: transparent !important;
          animation: ra-epic-spin 0.8s linear infinite !important;
          flex-shrink: 0 !important;
        }
        /* Rule 3 paired .dark — brand blue spinner uses lighter ADS blue in dark mode. */
        .dark .ra-epic-spinner,
        .dark .ra-epic-spinner-lg {
          border-color: #579DFF !important;
          border-top-color: transparent !important;
        }
      `}</style>
    </>
  );
}
