import { useState, useEffect } from 'react';
import { Check, Clock, Loader2 } from 'lucide-react';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { toast } from 'sonner';

interface Props {
  type: string;
  doc: RADocumentWithArtifacts;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { title: string; desc: string; steps: string[] }> = {
  epics: { title: 'Generating Epic Statements', desc: 'AI is extracting epics and user stories from the BRD document.', steps: ['Parsing document structure', 'Extracting requirements', 'Generating epic statements', 'Mapping acceptance criteria', 'Quality validation'] },
  uat: { title: 'Generating UAT Scenarios', desc: 'AI is creating user acceptance test scenarios from the requirements.', steps: ['Analysing requirements', 'Identifying test boundaries', 'Generating scenarios', 'Cross-referencing epics', 'Validation complete'] },
  initiative: { title: 'Creating Catalyst Initiative', desc: 'Creating a new initiative in Catalyst from the BRD document.', steps: ['Extracting metadata', 'Mapping to initiative fields', 'Creating initiative record', 'Linking artefacts'] },
  wikihub: { title: 'Re-syncing WikiHub', desc: 'Updating knowledge base with latest document content.', steps: ['Chunking content', 'Generating embeddings', 'Updating index', 'Cache warm-up'] },
};

export default function RABackgroundModal({ type, doc, onClose }: Props) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.epics;
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(p => p >= 95 ? p : p + Math.random() * 8);
      setActiveStep(s => s >= config.steps.length - 1 ? s : s + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [config.steps.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleLeave = () => {
    onClose();
    setTimeout(() => {
      toast.success('Generation Complete', { description: `Your ${type === 'epics' ? 'epic statements' : type} for ${doc.jira_ticket_key} are ready. View document →`, duration: 6000 });
    }, 2000);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 500, background: '#FFFFFF', borderRadius: 12, zIndex: 70, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <Loader2 size={22} color="#2563EB" style={{ animation: 'ra-spin 1s linear infinite' }} />
        </div>
        <h3 style={{ fontSize: 17, fontWeight: 650, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Sora', sans-serif" }}>{config.title}</h3>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          {config.desc}<br /><span style={{ color: '#94A3B8' }}>You can leave this screen — we'll notify you when done</span>
        </p>
        <div style={{ height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden', marginBottom: 20, position: 'relative' }}>
          <div style={{ height: '100%', borderRadius: 3, background: '#2563EB', width: `${Math.min(progress, 100)}%`, transition: 'width 400ms ease', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)', animation: 'ra-shimmer 1.5s ease-in-out infinite' }} />
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {config.steps.map((step, i) => {
            const isDone = i < activeStep; const isActive = i === activeStep;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDone ? '#16A34A' : isActive ? '#2563EB' : '#E2E8F0', color: isDone || isActive ? '#FFFFFF' : '#94A3B8', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                  {isDone ? <Check size={12} /> : isActive ? <Loader2 size={12} style={{ animation: 'ra-spin 1s linear infinite' }} /> : i + 1}
                </div>
                <span style={{ fontSize: 13, color: isDone ? '#16A34A' : isActive ? '#0F172A' : '#94A3B8', fontWeight: isActive ? 500 : 400, fontFamily: "'Inter', sans-serif" }}>{step}</span>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#EFF6FF', borderRadius: 'var(--ra-radius-card)', marginBottom: 20 }}>
          <Clock size={14} color="#2563EB" />
          <span style={{ fontSize: 12, color: '#1E40AF', fontFamily: "'Inter', sans-serif" }}>Estimated: ~{config.steps.length} minutes · You'll be notified</span>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Stay on this page</button>
          <button onClick={handleLeave} style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>Leave & Notify Me When Done</button>
        </div>
      </div>
      <style>{`
        @keyframes ra-spin { to { transform: rotate(360deg); } }
        @keyframes ra-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
      `}</style>
    </>
  );
}
