import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, FileText, FileSearch, Download, Loader2, AlertCircle, Clock, ChevronDown, Zap, TestTube, Flag, RefreshCw, ExternalLink } from 'lucide-react';
import { useRADocuments, useRAStats } from '@/hooks/useReqAssist';
import { useNavigate } from 'react-router-dom';
import type { RAFilterTab, RADocumentWithArtifacts } from '@/types/reqAssistV2';
import RAStatsBar from '@/components/reqAssist/RAStatsBar';
import RASearchToolbar from '@/components/reqAssist/RASearchToolbar';
import RAGenerationBar from '@/components/reqAssist/RAGenerationBar';
import RAJiraSidePanel from '@/components/reqAssist/RAJiraSidePanel';
import RAPDFViewer from '@/components/reqAssist/RAPDFViewer';
import RABackgroundModal from '@/components/reqAssist/RABackgroundModal';
import RAImportDrawer from '@/components/reqAssist/RAImportDrawer';
import { formatDistanceToNow } from 'date-fns';

export default function ReqAssistLibrary() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<RAFilterTab>('all');
  const [search, setSearch] = useState('');
  const filters = useMemo(() => ({ tab, search }), [tab, search]);
  const { data: documents, isLoading } = useRADocuments(filters);
  const { data: stats, isLoading: statsLoading } = useRAStats();

  const [selectedDoc, setSelectedDoc] = useState<RADocumentWithArtifacts | null>(null);
  const [pdfDoc, setPdfDoc] = useState<RADocumentWithArtifacts | null>(null);
  const [bgModal, setBgModal] = useState<{ type: string; doc: RADocumentWithArtifacts } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  const handleRowClick = useCallback((doc: RADocumentWithArtifacts, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-col="pdf"]') || target.closest('[data-col="actions"]')) return;
    setSelectedDoc(doc);
  }, []);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100%', padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#0F172A', margin: 0 }}>
            Req Assist™
          </h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>
            AI-powered requirements engineering — import, analyse, generate
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setImportOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)',
              background: '#FFFFFF', color: '#334155', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Download size={14} /> Import from Jira
          </button>
          <button
            onClick={() => navigate('/product/req-assist/generate')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', fontSize: 13, fontWeight: 500,
              border: 'none', borderRadius: 'var(--ra-radius-btn)',
              background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Zap size={14} /> Generate BRD from Text
          </button>
        </div>
      </div>

      {/* Stats */}
      <RAStatsBar
        totalDocuments={stats?.total_documents ?? 0}
        wikihubSynced={stats?.wikihub_synced ?? 0}
        wikihubChunks={stats?.wikihub_chunks ?? 0}
        artifactsGenerated={stats?.artifacts_generated ?? 0}
        processingCount={stats?.processing_count ?? 0}
        lastSync={stats?.last_sync ?? null}
        loading={statsLoading}
      />

      {/* Search + Filter + Table container */}
      <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden' }}>
        <RASearchToolbar
          tab={tab}
          onTabChange={setTab}
          search={search}
          onSearchChange={setSearch}
          resultCount={documents?.length}
        />

        {/* Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(15,23,42,0.08)' }}>
              {[
                { label: 'Jira Ticket', w: 120 },
                { label: 'Title', w: undefined },
                { label: 'Domain', w: 130 },
                { label: 'PDF', w: 70 },
                { label: 'Status', w: 110 },
                { label: 'Generation', w: 170 },
                { label: 'Imported', w: 85 },
                { label: 'Actions', w: 110 },
              ].map((col, i) => (
                <th key={i} style={{
                  padding: 'var(--ra-hd-pad)',
                  fontSize: 10.5, fontWeight: 500, color: '#64748B',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  textAlign: 'left', width: col.w || undefined,
                  fontFamily: "'Inter', sans-serif",
                }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} style={{ padding: 'var(--ra-cell-pad)' }}>
                      <div style={{ height: 12, background: '#E2E8F0', borderRadius: 4, animation: 'ra-pulse 1.5s ease-in-out infinite', width: j === 1 ? '80%' : '60%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : documents && documents.length > 0 ? (
              documents.map(doc => {
                const isProcessingRow = doc.status === 'processing';
                const processingJob = (doc as any).ra_processing_jobs?.find?.((j: any) => j.status === 'processing');
                return (
                  <tr
                    key={doc.id}
                    onClick={(e) => handleRowClick(doc, e)}
                    style={{
                      height: 'var(--ra-row-h)', minHeight: 'var(--ra-row-h)', maxHeight: 'var(--ra-row-h)',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(15,23,42,0.04)',
                      background: isProcessingRow ? 'rgba(37,99,235,0.02)' : 'transparent',
                      transition: 'background 120ms ease',
                    }}
                    onMouseEnter={e => { if (!isProcessingRow) (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isProcessingRow ? 'rgba(37,99,235,0.02)' : 'transparent'; }}
                  >
                    {/* Jira Ticket */}
                    <td style={{ padding: 'var(--ra-cell-pad)' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                        {doc.jira_ticket_key}
                      </span>
                    </td>
                    {/* Title */}
                    <td style={{ padding: 'var(--ra-cell-pad)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0 }}>
                      <span title={doc.title} style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
                        {doc.title}
                      </span>
                    </td>
                    {/* Domain */}
                    <td style={{ padding: 'var(--ra-cell-pad)' }}>
                      {doc.domain && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '0 6px', height: 20, borderRadius: 'var(--ra-radius-lozenge)',
                          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                          letterSpacing: '0.03em', whiteSpace: 'nowrap',
                          background: '#DFE1E6', color: '#253858',
                          fontFamily: "'Inter', sans-serif",
                        }}>
                          {doc.domain}
                        </span>
                      )}
                    </td>
                    {/* PDF */}
                    <td data-col="pdf" style={{ padding: 'var(--ra-cell-pad)' }}>
                      {doc.pdf_url ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPdfDoc(doc); }}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '2px 6px', borderRadius: 4,
                            background: '#FEF2F2', border: 'none', cursor: 'pointer',
                            fontSize: 11, color: '#DC2626', fontWeight: 500,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#FEF2F2')}
                        >
                          <FileText size={13} strokeWidth={1.5} />
                          {doc.page_count ? `${doc.page_count}pp` : 'PDF'}
                        </button>
                      ) : (
                        <span style={{ color: '#94A3B8', fontSize: 12 }}>
                          <FileText size={13} strokeWidth={1.5} style={{ opacity: 0.4 }} />
                        </span>
                      )}
                    </td>
                    {/* Status */}
                    <td style={{ padding: 'var(--ra-cell-pad)' }}>
                      <StatusBadge status={doc.status} />
                    </td>
                    {/* Generation */}
                    <td style={{ padding: 'var(--ra-cell-pad)' }}>
                      <RAGenerationBar
                        slots={doc.generation_slots}
                        artifactCounts={doc.artifact_counts}
                        isProcessing={isProcessingRow}
                        etaMinutes={processingJob ? Math.ceil((processingJob.eta_seconds ?? 240) / 60) : undefined}
                      />
                    </td>
                    {/* Imported */}
                    <td style={{ padding: 'var(--ra-cell-pad)' }}>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94A3B8' }}>
                        {doc.pulled_at ? formatDistanceToNow(new Date(doc.pulled_at), { addSuffix: false }).replace('about ', '~') : '—'}
                      </span>
                    </td>
                    {/* Actions */}
                    <td data-col="actions" style={{ padding: 'var(--ra-cell-pad)', position: 'relative' }}>
                      <GenerateDropdown
                        doc={doc}
                        isOpen={dropdownOpen === doc.id}
                        onToggle={(e) => { e.stopPropagation(); setDropdownOpen(dropdownOpen === doc.id ? null : doc.id); }}
                        onSelect={(type) => { setDropdownOpen(null); setBgModal({ type, doc }); }}
                      />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center' }}>
                  <FileSearch size={28} color="#94A3B8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, color: '#94A3B8', margin: 0, fontFamily: "'Inter', sans-serif" }}>
                    No documents match your search
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Side Panel */}
      {selectedDoc && <RAJiraSidePanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} onOpenPdf={() => setPdfDoc(selectedDoc)} onGenerate={(type) => setBgModal({ type, doc: selectedDoc })} />}

      {/* PDF Viewer */}
      {pdfDoc && <RAPDFViewer doc={pdfDoc} onClose={() => setPdfDoc(null)} onGenerateEpics={() => { setPdfDoc(null); if (pdfDoc) setBgModal({ type: 'epics', doc: pdfDoc }); }} />}

      {/* Background Modal */}
      {bgModal && <RABackgroundModal type={bgModal.type} doc={bgModal.doc} onClose={() => setBgModal(null)} />}

      {/* Import Drawer */}
      {importOpen && <RAImportDrawer onClose={() => setImportOpen(false)} />}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    ready: { icon: <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A', display: 'inline-block' }} />, color: '#16A34A', label: 'Ready' },
    processing: {
      icon: <Loader2 size={12} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />,
      color: '#2563EB', label: 'Processing',
    },
    failed: { icon: <AlertCircle size={12} color="#DC2626" />, color: '#DC2626', label: 'Failed' },
    pending: { icon: null, color: '#94A3B8', label: 'Pending' },
  };
  const c = configs[status] || configs.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: c.color, fontFamily: "'Inter', sans-serif" }}>
      {c.icon}
      {c.label}
    </span>
  );
}

function GenerateDropdown({ doc, isOpen, onToggle, onSelect }: {
  doc: RADocumentWithArtifacts;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect: (type: string) => void;
}) {
  const disabled = doc.status === 'processing' || doc.status === 'failed';
  const items = [
    { key: 'epics', icon: <Zap size={13} color="#7C3AED" />, label: 'Epic Statements', desc: 'Generate user stories' },
    { key: 'uat', icon: <TestTube size={13} color="#D97706" />, label: 'UAT Scenarios', desc: 'Generate test scenarios' },
    { key: 'initiative', icon: <Flag size={13} color="#0D9488" />, label: 'Create Initiative', desc: 'Create Catalyst initiative' },
    { key: 'sep', label: '', desc: '' },
    { key: 'wikihub', icon: <RefreshCw size={13} color="#0D9488" />, label: 'Re-sync WikiHub', desc: 'Update knowledge base' },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 'var(--ra-radius-btn)',
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#E2E8F0' : '#2563EB',
          color: disabled ? '#94A3B8' : '#FFFFFF',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        Generate <ChevronDown size={12} />
      </button>
      {isOpen && !disabled && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4,
          width: 260, background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.12)',
          borderRadius: 'var(--ra-radius-card)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          zIndex: 50, overflow: 'hidden',
        }}>
          {items.map((item, i) => {
            if (item.key === 'sep') return <div key={i} style={{ height: 1, background: 'rgba(15,23,42,0.06)', margin: '4px 0' }} />;
            return (
              <button
                key={item.key}
                onClick={(e) => { e.stopPropagation(); onSelect(item.key); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  width: '100%', padding: '8px 12px', border: 'none',
                  background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  transition: 'background 100ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.03)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ marginTop: 2 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
