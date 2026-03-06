import { useEffect } from 'react';
import { X, ExternalLink, FileText, BookOpen } from 'lucide-react';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { formatDistanceToNow, format } from 'date-fns';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
  onOpenPdf: () => void;
  onGenerate: (type: string) => void;
}

export default function RAJiraSidePanel({ doc, onClose, onOpenPdf, onGenerate }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 48, right: 0, bottom: 0, width: 460,
        background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(15,23,42,0.12)', animation: 'ra-slide-left 200ms ease-out',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, color: '#2563EB' }}>{doc.jira_ticket_key}</span>
                {doc.jira_ticket_url && (
                  <a href={doc.jira_ticket_url} target="_blank" rel="noopener noreferrer" style={{ color: '#94A3B8' }}>
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0, fontFamily: "'Inter', sans-serif" }}>{doc.title}</h3>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
              <X size={16} color="#64748B" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {doc.wikihub_synced && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0FDF4', borderRadius: 'var(--ra-radius-card)', marginBottom: 16, border: '1px solid #BBF7D0' }}>
              <BookOpen size={14} color="#16A34A" />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#16A34A', fontFamily: "'Inter', sans-serif" }}>In Catalyst Library · {doc.wikihub_chunk_count ?? 0} chunks indexed</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', marginBottom: 16 }}>
            <FieldItem label="Created in Jira" value={doc.jira_created_at ? format(new Date(doc.jira_created_at), 'd MMM yyyy, HH:mm') : '—'} />
            <FieldItem label="Reporter" value="—" />
            <FieldItem label="Priority" value="—" />
            <FieldItem label="Status" value={doc.status} isLozenge />
            <FieldItem label="Language" value={doc.language === 'ar' ? 'Arabic' : 'English'} />
            <FieldItem label="Imported" value={doc.pulled_at ? formatDistanceToNow(new Date(doc.pulled_at), { addSuffix: true }) : '—'} />
          </div>

          <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '16px 0' }} />
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', fontFamily: "'Inter', sans-serif" }}>Description</span>
            <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
              {doc.content_processed ? doc.content_processed.slice(0, 300) + (doc.content_processed.length > 300 ? '...' : '') : 'Awaiting extraction'}
            </p>
          </div>

          <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '16px 0' }} />

          {doc.pdf_url && (
            <>
              <button onClick={onOpenPdf} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 'var(--ra-radius-card)', border: '1px solid rgba(15,23,42,0.08)', background: '#FFFFFF', cursor: 'pointer', marginBottom: 16, textAlign: 'left' as const }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>
                <div style={{ width: 36, height: 36, borderRadius: 6, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color="#DC2626" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>{doc.jira_ticket_key}.pdf</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                    {doc.page_count ? `${doc.page_count} pages` : 'PDF'} · {doc.language === 'ar' ? 'Arabic' : 'English'}
                    {doc.page_count ? ` · ~${(doc.page_count * 0.07).toFixed(1)}MB` : ''}
                  </div>
                </div>
              </button>
              <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '16px 0' }} />
            </>
          )}

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: 8, display: 'block', fontFamily: "'Inter', sans-serif" }}>Generated Artifacts</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {doc.artifact_counts.epics > 0 && <ArtifactChip label={`${doc.artifact_counts.epics} Epics`} color="#7C3AED" bg="#F5F3FF" />}
              {doc.artifact_counts.uat > 0 && <ArtifactChip label={`${doc.artifact_counts.uat} UAT`} color="#D97706" bg="#FFFBEB" />}
              {doc.wikihub_synced && doc.wikihub_chunk_count && <ArtifactChip label={`${doc.wikihub_chunk_count} Wiki chunks`} color="#0D9488" bg="#F0FDFA" />}
              {doc.artifact_counts.epics === 0 && doc.artifact_counts.uat === 0 && !doc.wikihub_synced && (
                <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>No artifacts yet</span>
              )}
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <button onClick={() => onGenerate('epics')} style={{ width: '100%', padding: '10px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
            Generate More Artifacts
          </button>
        </div>
      </div>
      <style>{`@keyframes ra-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

function FieldItem({ label, value, isLozenge }: { label: string; value: string; isLozenge?: boolean }) {
  const lc: Record<string, { bg: string; color: string }> = {
    ready: { bg: '#E3FCEF', color: '#006644' }, processing: { bg: '#DEEBFF', color: '#0747A6' },
    failed: { bg: '#FEF2F2', color: '#DC2626' }, pending: { bg: '#DFE1E6', color: '#253858' },
  };
  return (
    <div>
      <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>{label}</span>
      {isLozenge ? (
        <div style={{ marginTop: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 'var(--ra-radius-lozenge)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.03em', background: lc[value]?.bg || '#DFE1E6', color: lc[value]?.color || '#253858', fontFamily: "'Inter', sans-serif" }}>
            {value.toUpperCase()}
          </span>
        </div>
      ) : (
        <p style={{ fontSize: 13, color: '#334155', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>{value}</p>
      )}
    </div>
  );
}

function ArtifactChip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', height: 22, borderRadius: 'var(--ra-radius-card)', fontSize: 11, fontWeight: 600, background: bg, color, fontFamily: "'Inter', sans-serif" }}>{label}</span>;
}
