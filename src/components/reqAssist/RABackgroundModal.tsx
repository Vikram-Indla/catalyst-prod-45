import { useState, useEffect } from 'react';
import { Check, Clock, Loader2, AlertTriangle } from 'lucide-react';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { toast } from 'sonner';
import { useQueueJob, useRAJobPolling, RA_KEYS } from '@/hooks/useReqAssist';
import { useQueryClient } from '@tanstack/react-query';

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

  const { data: job } = useRAJobPolling(jobId);

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
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, background: '#FFFFFF', borderRadius: 12, zIndex: 70, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: jobStatus === 'failed' ? '#FEF2F2' : jobStatus === 'done' ? '#F0FDF4' : '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          {jobStatus === 'failed' ? (
            <AlertTriangle size={22} color="#DC2626" />
          ) : jobStatus === 'done' ? (
            <Check size={22} color="#16A34A" />
          ) : (
            <Loader2 size={22} color="#2563EB" style={{ animation: 'ra-spin 1s linear infinite' }} />
          )}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Sora', sans-serif" }}>
          {jobStatus === 'done' ? 'Generation Complete' : jobStatus === 'failed' ? 'Generation Failed' : config.title}
        </h3>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          {jobStatus === 'failed' ? (
            <span style={{ color: '#DC2626' }}>{jobError || 'An unexpected error occurred. Please try again.'}</span>
          ) : jobStatus === 'done' ? (
            <>Artifacts have been generated and are ready for review.</>
          ) : (
            <>From: {doc.jira_ticket_key} · {doc.title}<br /><span style={{ color: '#94A3B8' }}>This typically takes {etaLabel}. You can leave this screen — we'll notify you when it's done.</span></>
          )}
        </p>

        {jobStatus !== 'failed' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, padding: '0 0' }}>
              <span style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>{currentStep || config.steps[activeStep]}</span>
              <span style={{ fontSize: 12, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{jobStatus === 'done' ? '100' : Math.min(progress, 99)}%</span>
            </div>
            <div style={{ height: 6, background: '#E5E5E5', borderRadius: 3, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: jobStatus === 'done' ? '#16A34A' : '#2563EB',
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
                  <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? '#DCFCE7' : isActive ? '#DBEAFE' : '#F5F5F5', color: isDone ? '#16A34A' : isActive ? '#2563EB' : '#A3A3A3', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {isDone ? <Check size={12} /> : isActive ? <Loader2 size={12} style={{ animation: 'ra-spin 1s linear infinite' }} /> : i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: isDone ? '#16A34A' : isActive ? '#0F172A' : '#94A3B8', fontWeight: isActive ? 500 : 400, fontFamily: "'Inter', sans-serif" }}>
                    {isActive && currentStep ? currentStep : step}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {jobStatus !== 'done' && jobStatus !== 'failed' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 14px', background: '#EFF6FF', borderRadius: 'var(--ra-radius-card)', marginBottom: 20, borderTop: '1px solid #DBEAFE' }}>
            <Clock size={14} color="#2563EB" />
            <span style={{ fontSize: 12, color: '#1E40AF', fontFamily: "'Inter', sans-serif" }}>Estimated: {etaLabel} · You'll be notified when done</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', borderTop: '1px solid rgba(15,23,42,0.06)', paddingTop: 16 }}>
          {jobStatus === 'failed' ? (
            <>
              <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Close</button>
              <button onClick={handleRetry} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Retry</button>
            </>
          ) : jobStatus === 'done' ? (
            <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#16A34A', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Done</button>
          ) : (
            <>
              <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Stay on this page</button>
              <button onClick={handleLeave} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '0.75px solid #CBD5E1', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#374151', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'} onMouseLeave={e => e.currentTarget.style.background = '#FFFFFF'}>Leave & Notify Me When Done</button>
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
