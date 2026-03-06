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

function statusLozenge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    ready: { bg: '#E3FCEF', color: '#006644' },
    processing: { bg: '#DEEBFF', color: '#0747A6' },
    failed: { bg: '#FFEBE6', color: '#BF2600' },
    pending: { bg: '#DFE1E6', color: '#253858' },
  };
  return map[status] ?? map.pending;
}

export default function RAJiraSidePanel({ doc, onClose, onOpenPdf, onGenerate }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const slz = statusLozenge(doc.status);
  const estSize = doc.page_count ? `~${(doc.page_count * 0.07).toFixed(1)}MB` : null;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 48, right: 0, bottom: 0, width: 460,
        background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(15,23,42,0.12)', animation: 'ra-slide-left 200ms ease-out',
      }}>
        {/* HEADER */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <FileText size={14} color="#2563EB" />
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{doc.jira_ticket_key}</span>
                {doc.jira_ticket_url && (
                  <a href={doc.jira_ticket_url} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#2563EB', textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}>
                    Open in Jira <ExternalLink size={11} />
                  </a>
                )}
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0, fontFamily: "'Sora', sans-serif" }}>{doc.title}</h3>
            </div>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
              <X size={16} color="#64748B" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {doc.wikihub_synced && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#F0FDF4', borderRadius: 'var(--ra-radius-card)', marginBottom: 16, border: '1px solid #DCFCE7' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#16A34A', fontFamily: "'Inter', sans-serif" }}>
                In Catalyst Library — Imported {doc.pulled_at ? formatDistanceToNow(new Date(doc.pulled_at), { addSuffix: true }) : ''} via nightly sync · {doc.wikihub_chunk_count ?? 0} WikiHub chunks
              </span>
            </div>
          )}

          {/* DEF-04: PDF ATTACHMENT — between WikiHub banner and Jira Details */}
          <div style={{ borderTop: '0.75px solid #E5E7EB', paddingTop: 16, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>PDF Attachment</span>
            {doc.pdf_url ? (
              <button onClick={onOpenPdf} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(15,23,42,0.08)', background: '#FFFFFF', cursor: 'pointer', textAlign: 'left' as const }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color="#DC2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>{doc.jira_ticket_key}.pdf</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                    {doc.page_count ? `${doc.page_count} pages` : 'PDF'} · {doc.language === 'ar' ? 'AR' : 'EN'}{estSize ? ` · ${estSize}` : ''}
                  </div>
                </div>
                <ExternalLink size={14} color="#2563EB" />
              </button>
            ) : (
              <p style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', margin: 0, fontFamily: "'Inter', sans-serif" }}>No PDF attached</p>
            )}
          </div>

          <div style={{ height: 0.75, background: '#E5E7EB', margin: '0 0 16px' }} />

          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block', marginBottom: 10, fontFamily: "'Inter', sans-serif" }}>Jira Details</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <FieldRow label="Created in Jira" value={doc.jira_created_at ? format(new Date(doc.jira_created_at), "d MMM yyyy, hh:mm a") : '—'} />
            <FieldRow label="Reporter" value="—" />
            {/* DEF-05: Priority uses amber/grey, NOT StatusLozenge colors */}
            <FieldRow label="Priority"><PriorityPill level="HIGH" /></FieldRow>
            <FieldRow label="Status"><Lozenge bg={slz.bg} color={slz.color} text={doc.status.toUpperCase()} /></FieldRow>
          </div>

          <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '16px 0' }} />

          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Description</span>
          <div style={{ padding: '10px 12px', background: '#FFFFFF', border: '1px solid rgba(15,23,42,0.06)', borderRadius: 4, marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
              {doc.content_processed
                ? doc.content_processed.slice(0, 300) + (doc.content_processed.length > 300 ? '...' : '')
                : <em style={{ color: '#94A3B8' }}>Awaiting extraction</em>
              }
            </p>
          </div>

          <div style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '16px 0' }} />

          <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.04em', display: 'block', marginBottom: 8, fontFamily: "'Inter', sans-serif" }}>Generated Artifacts</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {doc.artifact_counts.epics > 0 && <ArtifactChip label={`${doc.artifact_counts.epics} Epics`} bg="#F5F3FF" color="#7C3AED" />}
            {doc.artifact_counts.uat > 0 && <ArtifactChip label={`${doc.artifact_counts.uat} UAT Scenarios`} bg="#F0FDFA" color="#0D9488" />}
            {doc.wikihub_synced && doc.wikihub_chunk_count && <ArtifactChip label={`${doc.wikihub_chunk_count} Wiki Chunks`} bg="#DBEAFE" color="#2563EB" />}
            {doc.artifact_counts.epics === 0 && doc.artifact_counts.uat === 0 && !doc.wikihub_synced && (
              <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>No artifacts yet</span>
            )}
          </div>
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <button onClick={() => onGenerate('epics')} style={{ width: '100%', height: 36, fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif", display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            ✦ Generate More Artifacts
          </button>
        </div>
      </div>
      <style>{`@keyframes ra-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </>
  );
}

function FieldRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ width: 110, fontSize: 12, color: '#94A3B8', flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>{label}</span>
      {children || <span style={{ fontSize: 13, fontWeight: 500, color: '#334155', fontFamily: "'Inter', sans-serif" }}>{value}</span>}
    </div>
  );
}

function Lozenge({ bg, color, text }: { bg: string; color: string; text: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.02em',
      background: bg, color, fontFamily: "'Inter', sans-serif",
    }}>
      {text}
    </span>
  );
}

function ArtifactChip({ label, bg, color }: { label: string; bg: string; color: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', height: 22, borderRadius: 6, fontSize: 11, fontWeight: 600, background: bg, color, fontFamily: "'Inter', sans-serif" }}>{label}</span>;
}

/* DEF-05: Priority pill — separate from StatusLozenge */
function PriorityPill({ level }: { level: 'HIGH' | 'MEDIUM' | 'LOW' }) {
  const map: Record<string, { bg: string; color: string }> = {
    HIGH:   { bg: '#FFF3CD', color: '#92400E' },
    MEDIUM: { bg: '#F3F4F6', color: '#374151' },
    LOW:    { bg: '#F3F4F6', color: '#6B7280' },
  };
  const s = map[level] ?? map.MEDIUM;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em',
      background: s.bg, color: s.color, fontFamily: "'Inter', sans-serif",
    }}>
      {level}
    </span>
  );
}
