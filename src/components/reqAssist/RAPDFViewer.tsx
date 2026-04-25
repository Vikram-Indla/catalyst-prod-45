import { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Zap, Globe, Info } from 'lucide-react';
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
  const estimatedSize = doc.page_count ? `~${(doc.page_count * 0.07).toFixed(1)}MB` : '—';

  /* INT-005: ESC handled by parent ReqAssistLibrary */

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 60 }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 860, maxWidth: '95vw', height: '90vh', background: 'var(--cp-float)', borderRadius: 8, zIndex: 70, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid rgba(15,23,42,0.08)', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg-1)', margin: 0, fontFamily: 'var(--ds-font-family-body)' }}>
              {doc.title} — {doc.jira_ticket_key}
            </h3>
            <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-monospaced)' }}>
                {doc.language === 'ar' ? 'Arabic' : 'English'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-monospaced)' }}>
                {doc.page_count ? `${doc.page_count}pp` : '—'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-monospaced)' }}>
                {estimatedSize}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {doc.pdf_url && (
              <button
                onClick={() => window.open(doc.pdf_url!, '_blank')}
                style={{ border: '1px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)', borderRadius: 'var(--ra-radius-btn)', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--fg-2)' }}
              >
                <Download size={13} /> Download
              </button>
            )}
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}><X size={18} color="var(--fg-3)" /></button>
          </div>
        </div>
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px', borderBottom: '1px solid rgba(15,23,42,0.06)', flexShrink: 0, background: 'var(--bg-app)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ border: '1px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)', borderRadius: 4, padding: '4px 6px', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft size={14} color={page <= 1 ? '#CBD5E1' : 'var(--fg-2)'} /></button>
            <span style={{ fontSize: 12, color: 'var(--fg-2)', fontFamily: 'var(--ds-font-family-monospaced)' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ border: '1px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)', borderRadius: 4, padding: '4px 6px', cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight size={14} color={page >= totalPages ? '#CBD5E1' : 'var(--fg-2)'} /></button>
            <div style={{ width: 1, height: 20, background: 'rgba(15,23,42,0.12)', margin: '0 4px' }} />
            <button onClick={() => setZoom(z => Math.max(50, z - 25))} style={{ border: '1px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}><ZoomOut size={14} color="var(--fg-2)" /></button>
            <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-monospaced)', minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(200, z + 25))} style={{ border: '1px solid rgba(15,23,42,0.12)', background: 'var(--bg-app)', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}><ZoomIn size={14} color="var(--fg-2)" /></button>
          </div>
          <button onClick={onGenerateEpics} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: 'var(--cp-blue)', color: '#FFFFFF', cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)' }}>
            <Zap size={13} /> Generate Epics from this PDF
          </button>
        </div>
        {/* Body — DA-010: shadow on white page, grey bg */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#E5E7EB', display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <div style={{
            width: 680, maxWidth: '90%', background: 'var(--bg-app)', borderRadius: 4,
            padding: '48px 56px',
            border: '0.75px solid var(--divider)',
            transform: `scale(${zoom / 100})`, transformOrigin: 'top center',
          }}>
            {doc.language === 'ar' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '6px 10px', background: '#0C66E4', borderRadius: 4, border: '1px solid #B3D4FF' }}>
                <Globe size={13} color="#FFFFFF" />
                <span style={{ fontSize: 12, color: '#FFFFFF', fontFamily: 'var(--ds-font-family-body)' }}>Original Arabic document — English translation shown</span>
              </div>
            )}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: '0 0 4px', textAlign: 'center', fontFamily: 'var(--ds-font-family-heading)' }}>{doc.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: '0 0 20px', textAlign: 'center', fontFamily: 'var(--ds-font-family-body)' }}>Business Requirements Document · {doc.jira_project}</p>
            {/* EC-008: null content_processed → info box */}
            {doc.content_processed ? (
              <p style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--fg-2)', whiteSpace: 'pre-wrap', fontFamily: 'var(--ds-font-family-body)' }}>
                {doc.content_processed.slice(0, 800)}
                {doc.content_processed.length > 800 ? '...' : ''}
              </p>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', background: 'var(--cp-primary-5)', borderRadius: 'var(--ra-radius-card)', border: '1px solid #DBEAFE' }}>
                <Info size={16} color="var(--cp-blue)" style={{ marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF', fontFamily: 'var(--ds-font-family-body)' }}>Content is being extracted</div>
                  <p style={{ fontSize: 12, color: '#3B82F6', margin: '4px 0 0', lineHeight: 1.5, fontFamily: 'var(--ds-font-family-body)' }}>
                    The document will be available shortly. Processing is underway.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
