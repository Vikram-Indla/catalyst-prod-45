import { useState, useEffect } from 'react';
import { Check, Clock, Loader2, AlertTriangle } from 'lucide-react';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { toast } from 'sonner';
import { useQueueJob, useRAJobPolling, RA_KEYS } from '@/hooks/useReqAssist';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';

interface Props {
  type: string;
  doc: RADocumentWithArtifacts;
  onClose: () => void;
}

const JOB_TYPE_MAP: Record<string, string> = {
  epics: 'generate_epics',
  uat: 'generate_uat',
  initiative: 'generate_initiative',
  wikihub: 'wikihub_sync',
};

const ETA_MAP: Record<string, number> = {
  epics: 120,
  uat: 180,
  initiative: 60,
  wikihub: 90,
};

const TYPE_CONFIG: Record<string, { title: string; desc: string; steps: string[] }> = {
  epics: { title: 'Generating Epic Statements', desc: 'AI is extracting epics and user stories from the BRD document.', steps: ['Reading BRD content', 'Identifying functional domains', 'Drafting epic statements', 'Mapping to Catalyst epic fields', 'Quality validation'] },
  uat: { title: 'Generating UAT Scenarios', desc: 'AI is creating user acceptance test scenarios from the requirements.', steps: ['Analysing requirements', 'Identifying test boundaries', 'Generating scenarios', 'Cross-referencing epics', 'Validation complete'] },
  initiative: { title: 'Creating Catalyst Initiative', desc: 'Creating a new initiative in Catalyst from the BRD document.', steps: ['Extracting metadata', 'Mapping to initiative fields', 'Creating initiative record', 'Linking artefacts'] },
  wikihub: { title: 'Re-syncing WikiHub', desc: 'Updating knowledge base with latest document content.', steps: ['Chunking content', 'Generating embeddings', 'Updating index', 'Cache warm-up'] },
};

export default function RABackgroundModal({ type, doc, onClose }: Props) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.epics;
  const queueJob = useQueueJob();
  const qc = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolvedBrdId, setResolvedBrdId] = useState<string | null>(null);

  const { data: job } = useRAJobPolling(jobId);

  // Resolve brd_documents.id for Realtime subscription
  useEffect(() => {
    const resolve = async () => {
      const jiraKey = (doc as any)?.jira_ticket_key;
      const { data: direct } = await typedQuery('brd_documents').select('id').eq('id', doc.id).maybeSingle();
      if (direct?.id) { setResolvedBrdId(direct.id); return; }
      if (jiraKey) {
        const { data: jiraMatch } = await typedQuery('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
        if (jiraMatch?.id) { setResolvedBrdId(jiraMatch.id); return; }
      }
    };
    resolve();
  }, [doc]);

  // FIX 1: Realtime listener on brd_processing_queue for background completion
  useEffect(() => {
    if (!resolvedBrdId) return;
    const channel = supabase.channel(`epic-gen-${resolvedBrdId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'brd_processing_queue',
        filter: `brd_id=eq.${resolvedBrdId}`,
      }, (payload: any) => {
        if (payload.new.status === 'completed') {
          toast.success('Generation completed successfully', {
            description: `Artifacts ready for ${(doc as any).jira_ticket_key || doc.title}`,
            duration: 6000,
          });
          qc.invalidateQueries({ queryKey: RA_KEYS.all });
          qc.invalidateQueries({ queryKey: RA_KEYS.stats() });
        }
        if (payload.new.status === 'failed') {
          toast.error('Generation failed', {
            description: payload.new.error_message || 'Check administrator logs',
          });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [resolvedBrdId, doc, qc]);

  useEffect(() => {
    const jobType = JOB_TYPE_MAP[type] || 'generate_epics';
    const etaSeconds = ETA_MAP[type] || 120;
    queueJob.mutate(
      { ra_document_id: doc.id, job_type: jobType, eta_seconds: etaSeconds },
      {
        onSuccess: (data: any) => setJobId(data.id),
        onError: (err: any) => setError(err?.message || 'Failed to queue job'),
      }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progress = job?.progress_pct ?? 0;
  const etaSeconds = job?.eta_seconds;
  /* EC-006: null eta → "Estimating..." */
  const etaLabel = etaSeconds != null ? `~${Math.max(1, Math.ceil(etaSeconds / 60))} minutes` : 'Estimating...';
  const currentStep = job?.current_step ?? null;
  const jobStatus = job?.status ?? 'queued';
  const jobError = job?.error_message ?? error;

  const activeStep = Math.min(
    Math.floor((progress / 100) * config.steps.length),
    config.steps.length - 1
  );

  useEffect(() => {
    if (jobStatus === 'done') {
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
      toast.success('Generation Complete', {
        description: `${config.title.replace('Generating ', '').replace('Creating ', '').replace('Re-syncing ', '')} ready for ${doc.jira_ticket_key}`,
        duration: 6000,
      });
    }
  }, [jobStatus, doc.jira_ticket_key, config.title, qc]);

  const handleLeave = () => {
    // Do NOT fire a fake success toast — only show informational message
    if (jobStatus !== 'done' && jobStatus !== 'failed') {
      toast.info('Generation running in background. Check back shortly.', { duration: 4000 });
    }
    onClose();
  };

  const handleRetry = () => {
    setError(null);
    setJobId(null);
    const jobType = JOB_TYPE_MAP[type] || 'generate_epics';
    const etaSec = ETA_MAP[type] || 120;
    queueJob.mutate(
      { ra_document_id: doc.id, job_type: jobType, eta_seconds: etaSec },
      {
        onSuccess: (data: any) => setJobId(data.id),
        onError: (err: any) => setError(err?.message || 'Failed to queue job'),
      }
    );
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, background: 'var(--cp-float)', borderRadius: 8, zIndex: 70, padding: 28, border: '0.75px solid var(--divider)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: jobStatus === 'failed' ? '#FEF2F2' : jobStatus === 'done' ? '#F0FDF4' : 'var(--cp-primary-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {jobStatus === 'failed' ? (
            <AlertTriangle size={22} color="var(--sem-danger)" />
          ) : jobStatus === 'done' ? (
            <Check size={22} color="var(--sem-success)" />
          ) : (
            <Loader2 size={22} color="var(--cp-blue)" style={{ animation: 'ra-spin 1s linear infinite' }} />
          )}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 650, color: 'var(--fg-1)', margin: '0 0 6px', fontFamily: 'var(--ds-font-family-heading)' }}>
          {jobStatus === 'done' ? 'Generation Complete' : jobStatus === 'failed' ? 'Generation Failed' : config.title}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '0 0 20px', lineHeight: 1.5, fontFamily: 'var(--ds-font-family-body)' }}>
          {jobStatus === 'failed' ? (
            <span style={{ color: 'var(--sem-danger)' }}>{jobError || 'An unexpected error occurred. Please try again.'}</span>
          ) : jobStatus === 'done' ? (
            <>Artifacts have been generated and are ready for review.</>
          ) : (
            <>From: {doc.jira_ticket_key} · {doc.title}<br /><span style={{ color: 'var(--fg-4)' }}>This typically takes {etaLabel}. You can leave this screen — we'll notify you when it's done.</span></>
          )}
        </p>

        {jobStatus !== 'failed' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, padding: '0 0' }}>
              <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-body)' }}>{currentStep || config.steps[activeStep]}</span>
              <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-monospaced)' }}>{jobStatus === 'done' ? '100' : Math.min(progress, 99)}%</span>
            </div>
            <div style={{ height: 6, background: 'var(--divider)', borderRadius: 4, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                background: jobStatus === 'done' ? 'var(--sem-success)' : 'var(--cp-blue)',
                width: `${jobStatus === 'done' ? 100 : Math.min(progress, 99)}%`,
                transition: 'width 800ms ease', position: 'relative', overflow: 'hidden',
              }}>
                {jobStatus !== 'done' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'ra-shimmer 1.5s ease-in-out infinite' }} />
                )}
              </div>
            </div>
          </>
        )}

        {jobStatus !== 'failed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {config.steps.map((step, i) => {
              const isDone = jobStatus === 'done' || i < activeStep;
              const isActive = jobStatus !== 'done' && i === activeStep;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? '#DCFCE7' : isActive ? '#DBEAFE' : 'var(--bg-2)', color: isDone ? 'var(--sem-success)' : isActive ? 'var(--cp-blue)' : 'var(--fg-4)', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {isDone ? <Check size={12} /> : isActive ? <Loader2 size={12} style={{ animation: 'ra-spin 1s linear infinite' }} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: isDone ? 'var(--sem-success)' : isActive ? 'var(--fg-1)' : 'var(--fg-4)', fontWeight: isActive ? 500 : 400, fontFamily: 'var(--ds-font-family-body)' }}>
                    {isActive && currentStep ? currentStep : step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {jobStatus !== 'done' && jobStatus !== 'failed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px', background: 'var(--cp-primary-5)', borderRadius: 'var(--ra-radius-card)', marginBottom: 20, borderTop: '1px solid #DBEAFE' }}>
            <Clock size={14} color="var(--cp-blue)" />
            <span style={{ fontSize: 12, color: '#1E40AF', fontFamily: 'var(--ds-font-family-body)' }}>Estimated: {etaLabel} · You'll be notified when done</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: 16 }}>
          {jobStatus === 'failed' ? (
            <>
              <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }}>Close</button>
              <button onClick={handleRetry} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: 'var(--cp-blue)', color: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }}>Retry</button>
            </>
          ) : jobStatus === 'done' ? (
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: 'var(--sem-success)', color: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }}>Done</button>
          ) : (
            <>
              <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }}>Stay on this page</button>
              <button onClick={handleLeave} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '0.75px solid #CBD5E1', borderRadius: 'var(--ra-radius-btn)', background: 'var(--bg-app)', color: 'var(--fg-2)', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-app)'}>Leave & Notify Me When Done</button>
            </>
          )}
        </div>
      </div>
      <style>{`
        @keyframes ra-spin { to { transform: rotate(360deg); } }
        @keyframes ra-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </>
  );
}
