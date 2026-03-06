import { useEffect, useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Zap, Globe } from 'lucide-react';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
  onGenerateEpics: () => void;
}

export default function RAPDFViewer({ doc, onClose, onGenerateEpics }: Props) {
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const totalPages = doc.page_count ?? 1;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 860, maxWidth: '95vw', height: '90vh', background: '#FFFFFF', borderRadius: 8, zIndex: 70, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', margin: 0, fontFamily: "'Inter', sans-serif" }}>{doc.title}</h3>
            <span style={{ fontSize: 12, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>{doc.jira_ticket_key}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', borderRadius: 'var(--ra-radius-btn)', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#334155' }}>
              <Download size={13} /> Download
            </button>
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><X size={18} color="#64748B" /></button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', flexShrink: 0, background: '#FAFAFA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', borderRadius: 4, padding: '4px 6px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={14} color={page <= 1 ? '#CBD5E1' : '#334155'} /></button>
            <span style={{ fontSize: 12, color: '#334155', fontFamily: "'JetBrains Mono', monospace" }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', borderRadius: 4, padding: '4px 6px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight size={14} color={page >= totalPages ? '#CBD5E1' : '#334155'} /></button>
            <div style={{ width: 1, height: 20, background: 'rgba(15,23,42,0.12)', margin: '0 4px' }} />
            <button onClick={() => setZoom(z => Math.max(50, z - 25))} style={{ border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}><ZoomOut size={14} color="#334155" /></button>
            <span style={{ fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace", minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 25))} style={{ border: '1px solid rgba(15,23,42,0.12)', background: '#FFFFFF', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}><ZoomIn size={14} color="#334155" /></button>
          </div>
          <button onClick={onGenerateEpics} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
            <Zap size={13} /> Generate Epics from this PDF
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', background: '#E5E7EB', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{ width: 680, maxWidth: '90%', background: '#FFFFFF', borderRadius: 4, padding: '40px 48px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}>
            {doc.language === 'ar' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '6px 10px', background: '#FFFBEB', borderRadius: 4, border: '1px solid #FDE68A' }}>
                <Globe size={13} color="#D97706" />
                <span style={{ fontSize: 12, color: '#92400E', fontFamily: "'Inter', sans-serif" }}>Arabic document — content may display RTL</span>
              </div>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 600, color: '#0F172A', margin: '0 0 16px', fontFamily: "'Sora', sans-serif" }}>{doc.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: '#334155', whiteSpace: 'pre-wrap', fontFamily: "'Inter', sans-serif" }}>
              {doc.content_processed ? doc.content_processed.slice(0, 600) : `${doc.title}\n\nContent being extracted — please wait for processing to complete...`}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
