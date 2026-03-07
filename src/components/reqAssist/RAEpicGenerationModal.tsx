import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { CheckCircle2, XCircle, Sparkles, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { sanitiseError } from '@/lib/errorUtils';

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

  // ── EFFECT 1: Visual ticker — runs independently, always
  useEffect(() => {
    if (done || hasFailed) return;
    const id = setInterval(() => {
      setStep(prev => {
        if (prev >= 3) { clearInterval(id); return 3; }
        return prev + 1;
      });
      setProgress(prev => Math.min(prev + 20, 80));
    }, 1400);
    return () => clearInterval(id);
  }, [done, hasFailed]);

  // ── Resolve brd_documents.id from ra_documents (linked via jira_key) ──
  const resolveBrdId = async (): Promise<string | null> => {
    // PATH 1: doc.id already exists in brd_documents (Generate page flow)
    const { data: directCheck } = await (supabase as any)
      .from('brd_documents')
      .select('id')
      .eq('id', doc.id)
      .maybeSingle();
    if (directCheck?.id) return directCheck.id;

    // PATH 2: resolve via jira_ticket_key → brd_documents.jira_key
    const jiraKey = (doc as any).jira_ticket_key;
    if (jiraKey) {
      const { data: existing } = await (supabase as any)
        .from('brd_documents')
        .select('id')
        .eq('jira_key', jiraKey)
        .maybeSingle();
      if (existing?.id) return existing.id;
    }

    // PATH 3: no brd_documents entry exists — seed one from ra_documents data
    console.log('[EpicModal] No brd_documents entry found — seeding from ra_document:', doc.id);

    const rawText = (doc as any).content_raw
      || (doc as any).content_processed
      || (doc as any).description
      || doc.title;

    const { data: inserted, error: insertError } = await (supabase as any)
      .from('brd_documents')
      .insert({
        title: doc.title,
        raw_text: rawText,
        jira_key: jiraKey || null,
        pipeline_stage: 'intake',
        source_type: 'jira_bulk',
        language: (doc as any).language || 'en',
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[EpicModal] Failed to seed brd_documents:', insertError.message);
      return null;
    }

    console.log('[EpicModal] Seeded brd_documents entry:', inserted.id);
    return inserted.id;
  };

  const invokeGeneration = async (brdId: string) => {
    if (!brdId || brdId.trim() === '') {
      console.error('[EpicModal] Empty brdId passed to invokeGeneration — aborting');
      setHasFailed(true);
      setErrorMsg('Could not resolve BRD document ID.');
      return;
    }

    console.log('[EpicModal] Invoking generate_epics_for_brd with brd_id:', brdId);
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
    setTimeout(() => toast.success(`Epics generated for ${doc.title}`), 600);
  };

  // ── EFFECT 2: Edge Function call — runs once only
  useEffect(() => {
    console.log('[EpicModal] brdId at mount:', doc.id);
    console.log('[EpicModal] hasStarted:', hasStarted.current);
    if (hasStarted.current) return;

    resolveBrdId().then(brdId => {
      if (!brdId || brdId.trim() === '') {
        console.error('[EpicModal] Could not resolve brd_documents.id for doc.id:', doc.id);
        setHasFailed(true);
        setErrorMsg('Could not resolve BRD document ID. Document may not have a BRD entry.');
        return;
      }

      if (hasStarted.current) return;
      hasStarted.current = true;
      setResolvedBrdId(brdId);
      invokeGeneration(brdId);
    }).catch(err => {
      console.error('[EpicModal] Resolution failed:', err?.message || err);
      setHasFailed(true);
      setErrorMsg(err?.message || String(err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRetry = () => {
    setErrorMsg('');
    setHasFailed(false);
    setStep(0);
    setProgress(0);
    setDone(false);
    hasStarted.current = false;
    resolveBrdId().then(brdId => {
      if (!brdId || brdId.trim() === '') {
        console.error('[EpicModal] Retry failed — could not resolve brd_documents.id for doc.id:', doc.id);
        setHasFailed(true);
        setErrorMsg('Could not resolve BRD document ID.');
        return;
      }
      hasStarted.current = true;
      invokeGeneration(brdId);
    }).catch(err => {
      console.error('[RAEpicModal] Retry failed:', err?.message || err);
      setHasFailed(true);
      setErrorMsg(err?.message || String(err));
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
  const progressColor = done ? '#16A34A' : step === -1 ? '#DC2626' : '#2563EB';

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60 }} onClick={onClose} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 480, background: '#FFFFFF', borderRadius: 8, zIndex: 70,
        padding: 28, border: '0.75px solid #E2E8F0',
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
              <h3 style={{ fontSize: 18, fontWeight: 650, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>
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
                  border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
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
                width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <XCircle size={32} color="#DC2626" />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 650, color: '#111827', margin: 0, fontFamily: "'Sora', sans-serif" }}>
                Generation Failed
              </h3>
            </div>

            <div style={{
              background: '#FEF2F2', border: '1.5px solid #DC2626', borderRadius: 6,
              padding: '14px 16px', marginBottom: 16, maxHeight: 120, overflowY: 'auto' as const,
            }}>
              <code style={{
                fontSize: 13, color: '#991B1B', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-all' as const,
                fontFamily: 'monospace', display: 'block',
              }}>
                {errorMsg || 'Unknown error — check browser console'}
              </code>
            </div>

            <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              Generation failed. Please try again or contact your administrator.
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
        {!done && !hasFailed && (
          <>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 8, background: '#EFF6FF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <div className="ra-epic-spinner-lg" />
              </div>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 650, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>
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
              <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>{STEPS[Math.min(step, 4)]}</span>
              <span style={{ fontSize: 12, color: '#2563EB', fontWeight: 600 }}>{progress}%</span>
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 999, background: '#F3F4F6', marginBottom: 20, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, background: '#2563EB',
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
                        background: state === 'done' ? '#DCFCE7' : state === 'active' ? '#EFF6FF' : '#F3F4F6',
                      }}>
                        {state === 'done' ? (
                          <Check size={14} color="#16A34A" strokeWidth={2.5} />
                        ) : state === 'active' ? (
                          <div className="ra-epic-spinner" />
                        ) : (
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF' }}>{i + 1}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: state === 'active' ? 600 : state === 'done' ? 500 : 400,
                        color: state === 'done' ? '#374151' : state === 'active' ? '#2563EB' : '#9CA3AF',
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
              background: '#EFF6FF', borderRadius: 6, padding: '8px 12px', marginBottom: 20,
            }}>
              <span style={{ fontSize: 12, color: '#1D4ED8' }}>
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

      <style>{`
        @keyframes ra-epic-spin { to { transform: rotate(360deg); } }
        .ra-epic-spinner {
          width: 18px !important;
          height: 18px !important;
          border-radius: 50% !important;
          border: 2px solid #2563EB !important;
          border-top-color: transparent !important;
          animation: ra-epic-spin 0.8s linear infinite !important;
          flex-shrink: 0 !important;
        }
        .ra-epic-spinner-lg {
          width: 28px !important;
          height: 28px !important;
          border-radius: 50% !important;
          border: 2.5px solid #2563EB !important;
          border-top-color: transparent !important;
          animation: ra-epic-spin 0.8s linear infinite !important;
          flex-shrink: 0 !important;
        }
      `}</style>
    </>
  );
}
