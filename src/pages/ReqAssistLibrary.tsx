import { useState, useCallback, useMemo, useEffect } from 'react';
import { FileText, FileSearch, Download, Loader2, AlertCircle, ChevronDown, Zap, TestTube, Flag, RefreshCw, CheckCircle2, RotateCcw } from 'lucide-react';
import { useRADocuments, useRAStats } from '@/hooks/useReqAssist';
import { useNavigate } from 'react-router-dom';
import type { RAFilterTab, RADocumentWithArtifacts } from '@/types/reqAssistV2';
import RAStatsBar from '@/components/reqAssist/RAStatsBar';
import RASearchToolbar from '@/components/reqAssist/RASearchToolbar';
import RAGenerationBar from '@/components/reqAssist/RAGenerationBar';
import RAJiraSidePanel from '@/components/reqAssist/RAJiraSidePanel';
import RAPDFViewer from '@/components/reqAssist/RAPDFViewer';
import RABackgroundModal from '@/components/reqAssist/RABackgroundModal';
import ImportJiraDrawer from '@/components/req-assist/ImportJiraDrawer';
import { format } from 'date-fns';

/* ── Domain lozenge mapping (neutral only) ── */
function domainLozenge() {
  return {
    bg: '#F3F4F6',
    color: '#374151',
  };
}

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

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = () => setDropdownOpen(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [dropdownOpen]);

  /* INT-005: ESC key layering — only close topmost overlay */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pdfDoc) { setPdfDoc(null); return; }
      if (bgModal) { setBgModal(null); return; }
      if (selectedDoc) { setSelectedDoc(null); return; }
      if (importOpen) { setImportOpen(false); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [pdfDoc, bgModal, selectedDoc, importOpen]);

  const handleRowClick = useCallback((doc: RADocumentWithArtifacts, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-col="pdf"]') || target.closest('[data-col="actions"]')) return;
    setSelectedDoc(doc);
  }, []);

  const totalCount = stats?.total_documents ?? 0;
  const isFiltering = search.length > 0 || tab !== 'all';
  const hasDocuments = documents && documents.length > 0;
  const isEmpty = !isLoading && (!documents || documents.length === 0);

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100%', padding: '24px 28px' }}>
      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>
            Req Assist™
          </h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>
            BRD library — sourced from Jira, enriched by AI, WikiHub-connected · Next sync: tonight 11:00 PM
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setImportOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500,
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
              padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500,
              border: 'none', borderRadius: 'var(--ra-radius-btn)',
              background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Zap size={14} /> Generate BRD from Text
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <RAStatsBar
        totalDocuments={stats?.total_documents ?? 0}
        wikihubSynced={stats?.wikihub_synced ?? 0}
        wikihubChunks={stats?.wikihub_chunks ?? 0}
        artifactsGenerated={stats?.artifacts_generated ?? 0}
        processingCount={stats?.processing_count ?? 0}
        lastSync={stats?.last_sync ?? null}
        loading={statsLoading}
      />

      {/* EC-001: Empty library — no documents at all */}
      {!isLoading && totalCount === 0 && !isFiltering ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', border: '1px solid #E2E8F0', borderRadius: 'var(--ra-radius-card)' }}>
          <FileText size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px', fontFamily: "'Sora', sans-serif" }}>No documents yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px', fontFamily: "'Inter', sans-serif" }}>Import from Jira or generate a BRD from text to get started.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setImportOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              <Download size={14} /> Import from Jira
            </button>
            <button onClick={() => navigate('/product/req-assist/generate')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              <Zap size={14} /> Generate BRD from Text
            </button>
          </div>
        </div>
      ) : (
        /* ── SEARCH + FILTER + TABLE ── */
        <div style={{ border: '1px solid #E2E8F0', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden' }}>
          <RASearchToolbar
            tab={tab}
            onTabChange={setTab}
            search={search}
            onSearchChange={setSearch}
            resultCount={documents?.length}
            totalCount={totalCount}
            isFiltering={isFiltering}
          />

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
                      padding: 'var(--ra-hd-pad)', height: 36,
                      fontSize: 11, fontWeight: 700, color: '#6B7280',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      textAlign: 'left', width: col.w || undefined,
                      background: '#FFFFFF',
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
                  <tr key={i} style={{ height: 36, minHeight: 36, maxHeight: 36 }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: 'var(--ra-cell-pad)' }}>
                        <div className="h-3 bg-gray-200 rounded animate-pulse" style={{ width: j === 1 ? '80%' : '60%' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : hasDocuments ? (
                documents!.map(doc => {
                  const isProcessingRow = doc.status === 'processing';
                  const processingJob = (doc as any).ra_processing_jobs?.find?.((j: any) => j.status === 'processing');
                  return (
                    <tr
                      key={doc.id}
                      onClick={(e) => handleRowClick(doc, e)}
                      style={{
                        height: 36, minHeight: 36, maxHeight: 36,
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(15,23,42,0.04)',
                        background: isProcessingRow ? 'rgba(37,99,235,0.04)' : 'transparent',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={e => { if (!isProcessingRow) (e.currentTarget as HTMLElement).style.background = 'rgba(15,23,42,0.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isProcessingRow ? 'rgba(37,99,235,0.04)' : 'transparent'; }}
                    >
                      {/* Jira Ticket */}
                      <td style={{ padding: 'var(--ra-cell-pad)' }}>
                        {doc.jira_ticket_url ? (
                          <a href={doc.jira_ticket_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}>
                            {doc.jira_ticket_key}
                          </a>
                        ) : (
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                            {doc.jira_ticket_key}
                          </span>
                        )}
                      </td>
                      {/* Title */}
                      <td style={{ padding: 'var(--ra-cell-pad)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 0, height: 36, minHeight: 36, maxHeight: 36 }}>
                        <span title={doc.title} style={{ fontSize: 14, fontWeight: 500, color: '#111827', fontFamily: "'Inter', sans-serif" }}>
                          {doc.title.length > 52 ? doc.title.slice(0, 52) + '…' : doc.title}
                        </span>
                      </td>
                      {/* Domain (EC-003) */}
                      <td style={{ padding: 'var(--ra-cell-pad)', height: 36, minHeight: 36, maxHeight: 36 }}>
                        {doc.domain ? (() => {
                          const lz = domainLozenge();
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center',
                              padding: '2px 8px', borderRadius: 3,
                              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                              letterSpacing: '0.04em', whiteSpace: 'nowrap',
                              background: lz.bg, color: lz.color,
                              fontFamily: "'Inter', sans-serif",
                            }}>
                              {doc.domain}
                            </span>
                          );
                        })() : (
                          <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      {/* PDF (EC-004) */}
                      <td data-col="pdf" style={{ padding: 'var(--ra-cell-pad)' }}>
                        {doc.pdf_url ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setPdfDoc(doc); }}
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: 4,
                              padding: '3px 6px', borderRadius: 4,
                              background: '#FEF2F2', border: 'none', cursor: 'pointer',
                              fontSize: 11, color: '#DC2626', fontWeight: 500,
                              fontFamily: "'JetBrains Mono', monospace",
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#FEE2E2')}
                            onMouseLeave={e => (e.currentTarget.style.background = '#FEF2F2')}
                          >
                            <FileText size={13} strokeWidth={1.5} />
                            {doc.page_count ? `${doc.page_count}pp` : '—pp'}
                          </button>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#94A3B8', fontSize: 11 }}>
                            <FileText size={13} strokeWidth={1.5} style={{ opacity: 0.4 }} /> —
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
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                          {doc.pulled_at ? formatImported(doc.pulled_at) : '—'}
                        </span>
                      </td>
                      {/* Actions (INT-006) */}
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
                /* EC-002: Filtered empty state */
                <tr>
                  <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center' }}>
                    <FileSearch size={24} color="#9CA3AF" style={{ margin: '0 auto 8px', display: 'block' }} />
                    <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 8px', fontFamily: "'Inter', sans-serif" }}>
                      No documents match "{search || 'your search term'}"
                    </p>
                    <button onClick={() => { setSearch(''); setTab('all'); }}
                      style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                      Clear search
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Table footer */}
          {!isLoading && documents && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#FFFFFF', borderTop: '1px solid rgba(15,23,42,0.06)' }}>
              <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                Showing {documents.length} of {totalCount} documents
              </span>
              <button style={{ fontSize: 12, color: '#2563EB', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                View all →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      {selectedDoc && <RAJiraSidePanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} onOpenPdf={() => setPdfDoc(selectedDoc)} onGenerate={(type) => setBgModal({ type, doc: selectedDoc })} />}
      {pdfDoc && <RAPDFViewer doc={pdfDoc} onClose={() => setPdfDoc(null)} onGenerateEpics={() => { setPdfDoc(null); if (pdfDoc) setBgModal({ type: 'epics', doc: pdfDoc }); }} />}
      {bgModal && <RABackgroundModal type={bgModal.type} doc={bgModal.doc} onClose={() => setBgModal(null)} />}
      <ImportJiraDrawer open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}

/* ── Helpers ── */

function formatImported(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(d, 'd MMM');
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ready:      { bg: '#E3FCEF', color: '#006644', label: 'READY' },
    processing: { bg: '#DEEBFF', color: '#0747A6', label: 'PROCESSING' },
    pending:    { bg: '#DFE1E6', color: '#253858', label: 'PENDING' },
    failed:     { bg: '#FFEBE6', color: '#BF2600', label: 'FAILED' },
  };
  const s = map[status] ?? map.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 20, borderRadius: 3,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      background: s.bg, color: s.color,
      fontFamily: "'Inter', sans-serif",
    }}>
      {s.label}
    </span>
  );
}

/* INT-006: Failed rows show Retry button (red) instead of disabled Generate */
function GenerateDropdown({ doc, isOpen, onToggle, onSelect }: {
  doc: RADocumentWithArtifacts;
  isOpen: boolean;
  onToggle: (e: React.MouseEvent) => void;
  onSelect: (type: string) => void;
}) {
  const isProcessing = doc.status === 'processing';
  const isFailed = doc.status === 'failed';
  const disabled = isProcessing;
  const epicCount = doc.artifact_counts?.epics ?? 0;
  const uatCount = doc.artifact_counts?.uat ?? 0;
  const wikiChunks = doc.wikihub_chunk_count ?? 0;

  const items = [
    { key: 'epics', icon: <Zap size={13} color="#7C3AED" />, label: 'Epic Statements', desc: epicCount > 0 ? `${epicCount} already` : 'none yet' },
    { key: 'uat', icon: <TestTube size={13} color="#D97706" />, label: 'UAT Scenarios', desc: uatCount > 0 ? `${uatCount} already` : 'none yet' },
    { key: 'initiative', icon: <Flag size={13} color="#0D9488" />, label: 'Create Initiative', desc: 'Push to StrategyHub' },
    { key: 'sep', label: '', desc: '' },
    { key: 'wikihub', icon: <RefreshCw size={13} color="#0D9488" />, label: 'Re-sync WikiHub', desc: wikiChunks > 0 ? `${wikiChunks} chunks` : 'not synced' },
  ];

  /* INT-006: Failed → show Retry button */
  if (isFailed) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelect('epics'); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 4, border: 'none', cursor: 'pointer',
          background: '#2563EB', color: '#FFFFFF',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <RotateCcw size={12} /> Retry
      </button>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        disabled={disabled}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 4,
          border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          background: disabled ? '#E5E5E5' : '#2563EB',
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
