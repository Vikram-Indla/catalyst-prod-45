import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FileText, FileSearch, Download, Loader2, AlertCircle, Zap, TestTube, Flag, RefreshCw, CheckCircle2, RotateCcw, Eye, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useRADocuments, useRAStats, RA_KEYS } from '@/hooks/useReqAssist';
import { syncSingleBrdToKb, fetchDocumentEpicCounts } from '@/services/reqAssistService';
import { sanitiseError } from '@/lib/errorUtils';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import type { RAFilterTab, RADocumentWithArtifacts } from '@/types/reqAssistV2';
import RAStatsBar from '@/components/reqAssist/RAStatsBar';
import RASearchToolbar from '@/components/reqAssist/RASearchToolbar';
import RAGenerationBar from '@/components/reqAssist/RAGenerationBar';
import RAJiraSidePanel from '@/components/reqAssist/RAJiraSidePanel';
import RAPDFViewer from '@/components/reqAssist/RAPDFViewer';
import RABackgroundModal from '@/components/reqAssist/RABackgroundModal';
import RAEpicGenerationModal from '@/components/reqAssist/RAEpicGenerationModal';
import RAEpicDraftDrawer from '@/components/reqAssist/RAEpicDraftDrawer';
import ImportJiraDrawer from '@/components/req-assist/ImportJiraDrawer';
import { format } from 'date-fns';

/* ── Domain lozenge mapping (neutral only) ── */
function domainLozenge() {
  return { bg: '#F3F4F6', color: '#374151' };
}

export default function ReqAssistLibrary() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<RAFilterTab>('all');
  const [search, setSearch] = useState('');
  const filters = useMemo(() => ({ tab, search }), [tab, search]);
  const { data: documents, isLoading } = useRADocuments(filters);
  const { data: stats, isLoading: statsLoading } = useRAStats();

  const qc = useQueryClient();
  const [selectedDoc, setSelectedDoc] = useState<RADocumentWithArtifacts | null>(null);
  const [pdfDoc, setPdfDoc] = useState<RADocumentWithArtifacts | null>(null);
  const [bgModal, setBgModal] = useState<{ type: string; doc: RADocumentWithArtifacts } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncingAll, setSyncingAll] = useState(false);
  const [regenConfirm, setRegenConfirm] = useState<{ doc: RADocumentWithArtifacts; count: number; brdId: string; generatedAt: string | null } | null>(null);
  const [draftDrawer, setDraftDrawer] = useState<{ brdId: string; docTitle: string; jiraKey: string | null } | null>(null);
  const [epicCounts, setEpicCounts] = useState<Record<string, number>>({});

  /** FIX 3: Check for existing epics before opening modal */
  const handleGenerateClick = useCallback(async (doc: RADocumentWithArtifacts) => {
    let brdId: string | null = null;
    const { data: direct } = await (supabase as any).from('brd_documents').select('id').eq('id', doc.id).maybeSingle();
    if (direct?.id) brdId = direct.id;
    if (!brdId) {
      const jiraKey = (doc as any).jira_ticket_key;
      if (jiraKey) {
        const { data: jiraMatch } = await (supabase as any).from('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
        if (jiraMatch?.id) brdId = jiraMatch.id;
      }
    }
    if (brdId) {
      const { count, data: epicRows } = await (supabase as any)
        .from('brd_epics')
        .select('id, generated_at', { count: 'exact' })
        .eq('brd_id', brdId)
        .limit(1);
      if (count && count > 0) {
        const genAt = epicRows?.[0]?.generated_at || null;
        setRegenConfirm({ doc, count, brdId, generatedAt: genAt });
        return;
      }
    }
    setBgModal({ type: 'epics', doc });
  }, []);

  /** Resolve brdId for a doc (used by actions cell) */
  const resolveBrdId = useCallback(async (doc: RADocumentWithArtifacts): Promise<string | null> => {
    const { data: direct } = await (supabase as any).from('brd_documents').select('id').eq('id', doc.id).maybeSingle();
    if (direct?.id) return direct.id;
    const jiraKey = (doc as any).jira_ticket_key;
    if (jiraKey) {
      const { data: jiraMatch } = await (supabase as any).from('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
      if (jiraMatch?.id) return jiraMatch.id;
    }
    return null;
  }, []);

  /** Open draft drawer for a doc */
  const handleOpenDrafts = useCallback(async (doc: RADocumentWithArtifacts) => {
    const brdId = await resolveBrdId(doc);
    if (brdId) {
      setDraftDrawer({ brdId, docTitle: doc.title, jiraKey: (doc as any).jira_ticket_key || null });
    }
  }, [resolveBrdId]);

  const handleOpenDraftsByBrdId = useCallback((brdId: string) => {
    // Find doc from current documents list to get title/jiraKey
    const doc = documents?.find(d => d.id === brdId || (d as any).jira_ticket_key);
    setDraftDrawer({
      brdId,
      docTitle: doc?.title || 'Document',
      jiraKey: (doc as any)?.jira_ticket_key || null,
    });
  }, [documents]);

  // FIX 2: Batch fetch epic counts (replaces N+1 loop)
  useEffect(() => {
    if (!documents || documents.length === 0) return;
    const jiraKeys = documents
      .map(d => (d as any).jira_ticket_key)
      .filter(Boolean) as string[];
    if (!jiraKeys.length) return;

    fetchDocumentEpicCounts(jiraKeys).then(countsMap => {
      const counts: Record<string, number> = {};
      for (const doc of documents) {
        const jk = (doc as any).jira_ticket_key;
        if (jk && countsMap[jk]?.epicCount > 0) {
          counts[doc.id] = countsMap[jk].epicCount;
        }
      }
      setEpicCounts(counts);
    });
  }, [documents]);

  const handleSyncKb = useCallback(async (docId: string) => {
    setSyncingIds(prev => new Set(prev).add(docId));
    try {
      // Resolve the brd_documents.id from the ra_documents row
      const doc = documents?.find(d => d.id === docId);
      const jiraKey = (doc as any)?.jira_ticket_key;
      let brdId: string | null = null;

      // Check direct match
      const { data: direct } = await (supabase as any).from('brd_documents').select('id').eq('id', docId).maybeSingle();
      if (direct?.id) brdId = direct.id;

      // Check via jira_key
      if (!brdId && jiraKey) {
        const { data: jiraMatch } = await (supabase as any).from('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
        if (jiraMatch?.id) brdId = jiraMatch.id;
      }

      if (!brdId) {
        toast.error('Document not yet processed — generate BRDs first');
        return;
      }

      await syncSingleBrdToKb(brdId);

      // Also update ra_documents for UI consistency
      await (supabase as any)
        .from('ra_documents')
        .update({ kb_synced: true, kb_synced_at: new Date().toISOString() })
        .eq('id', docId);

      qc.invalidateQueries({ queryKey: RA_KEYS.all });
      toast.success('Document indexed for AI search');
    } catch (err: any) {
      toast.error(sanitiseError(err));
    } finally {
      setSyncingIds(prev => { const n = new Set(prev); n.delete(docId); return n; });
    }
  }, [qc, documents]);

  const handleSyncAll = useCallback(async () => {
    if (!documents) return;
    const unsyncedReady = documents.filter(d => (d.status === 'ready' || d.status === 'complete') && !(d as any).kb_synced);
    if (!unsyncedReady.length) { toast.info('All documents already synced'); return; }
    setSyncingAll(true);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < unsyncedReady.length; i++) {
      const doc = unsyncedReady[i];
      toast.loading(`Syncing ${i + 1} of ${unsyncedReady.length}...`, { id: 'sync-all-progress' });
      try {
        const jiraKey = (doc as any)?.jira_ticket_key;
        let brdId: string | null = null;
        const { data: direct } = await (supabase as any).from('brd_documents').select('id').eq('id', doc.id).maybeSingle();
        if (direct?.id) brdId = direct.id;
        if (!brdId && jiraKey) {
          const { data: jiraMatch } = await (supabase as any).from('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
          if (jiraMatch?.id) brdId = jiraMatch.id;
        }
        if (!brdId) { failed++; continue; }

        await syncSingleBrdToKb(brdId);

        // Update ra_documents for UI consistency
        await (supabase as any)
          .from('ra_documents')
          .update({ kb_synced: true, kb_synced_at: new Date().toISOString() })
          .eq('id', doc.id);

        success++;
      } catch {
        failed++;
      }
    }
    toast.dismiss('sync-all-progress');
    if (failed > 0) {
      toast.warning(`Synced ${success} of ${unsyncedReady.length}. ${failed} failed.`);
    } else {
      toast.success(`Synced ${success} documents for AI search`);
    }
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    setSyncingAll(false);
  }, [documents, qc]);

  /* Supabase Realtime subscriptions for live updates */
  useEffect(() => {
    const channel1 = supabase.channel('req-assist-queue')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'brd_processing_queue' },
        () => { qc.invalidateQueries({ queryKey: RA_KEYS.stats() }); qc.invalidateQueries({ queryKey: RA_KEYS.all }); })
      .subscribe();

    const channel2 = supabase.channel('req-assist-docs')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'brd_documents' },
        () => { qc.invalidateQueries({ queryKey: RA_KEYS.all }); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [qc]);

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

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100%', padding: '24px 28px' }}>
      {/* ── PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          {/* D19: Trademark typography */}
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 650, color: '#111827', margin: 0 }}>
            <span style={{ fontFamily: "'Sora', sans-serif" }}>Req Assist™</span>
          </h1>
          {/* D12: Remove hardcoded sync time */}
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>
            BRD library — sourced from Jira, enriched by AI, indexed for AI-powered search
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setImportOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500,
              border: '0.75px solid #E2E8F0', borderRadius: 6,
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
              border: 'none', borderRadius: 6,
              background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <Zap size={14} /> Generate BRD from Text
          </button>
        </div>
      </div>

      {/* ── STATS BAR ── D05: cards with border */}
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6 }}>
          <FileText size={32} color="#9CA3AF" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: '0 0 6px', fontFamily: "'Sora', sans-serif" }}>No documents yet</p>
          <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px', fontFamily: "'Inter', sans-serif" }}>Import from Jira or generate a BRD from text to get started.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setImportOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              <Download size={14} /> Import from Jira
            </button>
            <button onClick={() => navigate('/product/req-assist/generate')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 36, fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6, background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
              <Zap size={14} /> Generate BRD from Text
            </button>
          </div>
        </div>
      ) : (
        /* ── SEARCH + FILTER + TABLE ── */
        <div style={{ background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
          {/* D13: Sync All inside toolbar row */}
          <RASearchToolbar
            tab={tab}
            onTabChange={setTab}
            search={search}
            onSearchChange={setSearch}
            resultCount={documents?.length}
            totalCount={totalCount}
            isFiltering={isFiltering}
            onSyncAll={handleSyncAll}
            syncingAll={syncingAll}
          />

          {/* FIX 4: Filter info bar */}
          {isFiltering && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 28px', fontSize: 12, color: '#64748B',
              background: '#FFFFFF', borderBottom: '0.75px solid #E2E8F0',
              fontFamily: "'Inter', sans-serif",
            }}>
              Showing {documents?.length ?? 0} of {totalCount} documents
              <span style={{ color: '#94A3B8' }}>·</span>
              Filtered by: <strong style={{ color: '#334155', fontWeight: 600 }}>{tab !== 'all' ? tab.charAt(0).toUpperCase() + tab.slice(1) : search}</strong>
              <button
                onClick={() => { setSearch(''); setTab('all'); }}
                style={{
                  border: 'none', background: 'transparent', cursor: 'pointer',
                  fontSize: 12, color: '#2563EB', fontWeight: 500, padding: 0,
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Clear filter ×
              </button>
            </div>
          )}

          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr style={{ borderBottom: '0.75px solid #E2E8F0' }}>
                {[
                  { label: 'Jira Ticket', w: 120 },
                  { label: 'Title', w: undefined },
                  { label: 'Domain', w: 110 },
                  { label: 'PDF', w: 60 },
                  { label: 'Status', w: 110 },
                  { label: 'Generation', w: 160 },
                  { label: 'Imported', w: 80 },
                  { label: 'Actions', w: 220 },
                ].map((col, i) => (
                  <th key={i} style={{
                    padding: '0 10px', height: 36,
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
                  <tr key={i} style={{ height: 36, maxHeight: 36 }}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} style={{ padding: '0 10px' }}>
                        <div style={{ width: j === 1 ? '80%' : '60%', height: 12, background: '#E2E8F0', borderRadius: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
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
                        height: 36, maxHeight: 36,
                        cursor: 'pointer',
                        borderBottom: '0.75px solid #E2E8F0',
                        background: isProcessingRow ? 'rgba(37,99,235,0.04)' : 'transparent',
                        transition: 'background 120ms ease',
                      }}
                      onMouseEnter={e => { if (!isProcessingRow) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isProcessingRow ? 'rgba(37,99,235,0.04)' : 'transparent'; }}
                    >
                      {/* Jira Ticket */}
                      <td style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden' }}>
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
                      {/* Title — DEF-08: truncate + tooltip */}
                      <td style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden', maxWidth: 0 }}>
                        <span title={doc.title} style={{
                          display: 'block', fontSize: 14, fontWeight: 500, color: '#111827',
                          fontFamily: "'Inter', sans-serif",
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 320,
                        }}>
                          {doc.title}
                        </span>
                      </td>
                      {/* Domain — D10: standardise empty cells */}
                      <td style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden' }}>
                        {doc.domain ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center',
                            padding: '2px 8px', borderRadius: 3,
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.04em', whiteSpace: 'nowrap',
                            background: '#F3F4F6', color: '#374151',
                            fontFamily: "'Inter', sans-serif",
                          }}>
                            {doc.domain}
                          </span>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      {/* PDF — D10: remove icon from empty state */}
                      <td data-col="pdf" style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden' }}>
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
                          <span style={{ color: '#94A3B8', fontSize: 13 }}>—</span>
                        )}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden' }}>
                        <StatusBadge status={doc.status} />
                      </td>
                      {/* Generation — D07/D08/D18 */}
                      <td style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden', maxWidth: 160 }}>
                        <RAGenerationBar
                          slots={doc.generation_slots}
                          artifactCounts={doc.artifact_counts}
                          isProcessing={isProcessingRow}
                          etaMinutes={processingJob ? Math.ceil((processingJob.eta_seconds ?? 240) / 60) : undefined}
                          docStatus={doc.status}
                        />
                      </td>
                      {/* Imported */}
                      <td style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'hidden' }}>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#6B7280' }}>
                          {doc.pulled_at ? formatImported(doc.pulled_at) : '—'}
                        </span>
                      </td>
                      {/* Actions */}
                      <td data-col="actions" style={{ padding: '0 10px', height: 36, maxHeight: 36, overflow: 'visible', position: 'relative', minWidth: 220, whiteSpace: 'nowrap' }}>
                        <ActionsCell
                          doc={doc}
                          epicCount={epicCounts[doc.id] || 0}
                          onSyncKb={handleSyncKb}
                          onSelect={(type) => type === 'epics' ? handleGenerateClick(doc) : setBgModal({ type, doc })}
                          onViewDrafts={() => handleOpenDrafts(doc)}
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

          {/* Table footer — D17: ArrowRight icon */}
          {!isLoading && documents && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#FFFFFF', borderTop: '0.75px solid #E2E8F0' }}>
              <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                Showing {documents.length} of {totalCount} documents
              </span>
              <button
                onClick={() => { setTab('all'); setSearch(''); }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#2563EB', fontWeight: 500, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}
              >
                Show all {totalCount} <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Overlays */}
      {selectedDoc && <RAJiraSidePanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} onOpenPdf={() => setPdfDoc(selectedDoc)} onGenerate={(type) => type === 'epics' ? handleGenerateClick(selectedDoc) : setBgModal({ type, doc: selectedDoc })} onViewDrafts={(brdId) => { setSelectedDoc(null); handleOpenDraftsByBrdId(brdId); }} onSyncKb={handleSyncKb} />}
      {pdfDoc && <RAPDFViewer doc={pdfDoc} onClose={() => setPdfDoc(null)} onGenerateEpics={() => { setPdfDoc(null); if (pdfDoc) setBgModal({ type: 'epics', doc: pdfDoc }); }} />}
      {bgModal && bgModal.type === 'epics' ? (
        <RAEpicGenerationModal
          doc={bgModal.doc}
          onClose={() => setBgModal(null)}
          onViewDrafts={(brdId) => {
            setBgModal(null);
            handleOpenDraftsByBrdId(brdId);
          }}
        />
      ) : bgModal ? (
        <RABackgroundModal type={bgModal.type} doc={bgModal.doc} onClose={() => setBgModal(null)} />
      ) : null}

      {/* Draft drawer */}
      {draftDrawer && (
        <RAEpicDraftDrawer
          brdId={draftDrawer.brdId}
          docTitle={draftDrawer.docTitle}
          jiraKey={draftDrawer.jiraKey}
          onClose={() => { setDraftDrawer(null); qc.invalidateQueries({ queryKey: RA_KEYS.all }); }}
        />
      )}

      {/* PART 2: Regen confirmation dialog — 3 buttons */}
      {regenConfirm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 80 }} onClick={() => setRegenConfirm(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 420, background: '#FFFFFF', borderRadius: 8, zIndex: 90,
            padding: 24, border: '0.75px solid #E2E8F0',
            fontFamily: "'Inter', sans-serif",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 650, color: '#0F172A', margin: '0 0 8px', fontFamily: "'Sora', sans-serif" }}>
              Epics Already Exist
            </h3>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 20px', lineHeight: 1.5 }}>
              This document already has {regenConfirm.count} epic{regenConfirm.count !== 1 ? 's' : ''} generated
              {regenConfirm.generatedAt ? (() => {
                const days = Math.floor((Date.now() - new Date(regenConfirm.generatedAt!).getTime()) / 86400000);
                return days === 0 ? ' today' : days === 1 ? ' yesterday' : ` ${days} days ago`;
              })() : ''}. What would you like to do?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRegenConfirm(null)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => {
                const brdId = regenConfirm.brdId;
                const doc = regenConfirm.doc;
                setRegenConfirm(null);
                setDraftDrawer({ brdId, docTitle: doc.title, jiraKey: (doc as any).jira_ticket_key || null });
              }} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: '0.75px solid #CBD5E1', background: '#FFFFFF', color: '#334155', cursor: 'pointer',
              }}>View Drafts</button>
              <button onClick={() => { const d = regenConfirm.doc; setRegenConfirm(null); setBgModal({ type: 'epics', doc: d }); }} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 600, borderRadius: 6,
                border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              }}>Regenerate</button>
            </div>
          </div>
        </>
      )}

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

/* D15: StatusLozenge — 700 weight, 3px radius, 20px height, no dots */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ready:      { bg: '#E3FCEF', color: '#006644', label: 'READY' },
    complete:   { bg: '#E3FCEF', color: '#006644', label: 'READY' },
    processing: { bg: '#DEEBFF', color: '#0747A6', label: 'PROCESSING' },
    pending:    { bg: '#DFE1E6', color: '#253858', label: 'PENDING' },
    failed:     { bg: '#DFE1E6', color: '#253858', label: 'FAILED' },
    intake:     { bg: '#DFE1E6', color: '#253858', label: 'INTAKE' },
    extract:    { bg: '#DEEBFF', color: '#0747A6', label: 'EXTRACTING' },
    process:    { bg: '#DEEBFF', color: '#0747A6', label: 'PROCESSING' },
    validate:   { bg: '#DEEBFF', color: '#0747A6', label: 'VALIDATING' },
    distribute: { bg: '#DEEBFF', color: '#0747A6', label: 'DISTRIBUTING' },
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
      transition: 'background-color 200ms ease, color 200ms ease',
    }}>
      {s.label}
    </span>
  );
}

/* Actions column — PART 6: lifecycle-aware actions */
function ActionsCell({ doc, epicCount, onSyncKb, onSelect, onViewDrafts }: {
  doc: RADocumentWithArtifacts;
  epicCount: number;
  onSyncKb: (docId: string) => void;
  onSelect: (type: string) => void;
  onViewDrafts: () => void;
}) {
  const isReady = doc.status === 'ready' || doc.status === 'complete';
  const isProcessing = doc.status === 'processing' || ['intake', 'extract', 'process', 'validate', 'distribute'].includes(doc.status);
  const isFailed = doc.status === 'failed';
  const kbSynced = (doc as any).kb_synced === true;

  /* Has epics generated → show View Drafts + count chip */
  if (epicCount > 0 && !isProcessing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onViewDrafts(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
            borderRadius: 4, border: '0.75px solid #E2E8F0',
            background: '#FFFFFF', color: '#253858', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
            transition: 'background 120ms ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
          onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
        >
          View Drafts
          <span style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '1px 5px', borderRadius: 3,
            fontSize: 10, fontWeight: 700,
            background: '#DEEBFF', color: '#0747A6',
            marginLeft: 6,
          }}>{epicCount}</span>
        </button>
      </div>
    );
  }

  /* READY + AI INDEXED → green lozenge + View */
  if (isReady && kbSynced) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '0 6px', height: 20, borderRadius: 3,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.03em', whiteSpace: 'nowrap',
          background: '#E3FCEF', color: '#006644',
          fontFamily: "'Inter', sans-serif",
        }}>AI INDEXED</span>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect('view'); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 28, padding: '4px 10px', fontSize: 13, fontWeight: 500,
            borderRadius: 4, border: '0.75px solid #E2E8F0',
            background: '#FFFFFF', color: '#475569', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
          }}
        >
          <Eye size={12} /> View
        </button>
      </div>
    );
  }

  /* READY + NOT SYNCED → Sync to AI */
  if (isReady && !kbSynced) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSyncKb(doc.id); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, minWidth: 96, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: '#2563EB', color: '#FFFFFF',
          fontFamily: "'Inter', sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        <Zap size={12} /> Sync to AI
      </button>
    );
  }

  /* FAILED → red outline Retry */
  if (isFailed) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelect('epics'); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 4, border: '0.75px solid #DC2626',
          background: 'transparent', color: '#DC2626', cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
        }}
      >
        <RotateCcw size={12} /> Retry
      </button>
    );
  }

  /* PROCESSING → disabled Generate */
  if (isProcessing) {
    return (
      <button
        disabled
        style={{
          display: 'inline-flex', alignItems: 'center',
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 4, border: 'none', cursor: 'not-allowed',
          background: '#E2E8F0', color: '#94A3B8',
          fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
        }}
      >
        Generate
      </button>
    );
  }

  /* PENDING / null → enabled Generate */
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSelect('epics'); }}
      style={{
        display: 'inline-flex', alignItems: 'center',
        height: 28, padding: '0 10px', fontSize: 13, fontWeight: 500,
        borderRadius: 4, border: '0.75px solid #E2E8F0', cursor: 'pointer',
        background: '#FFFFFF', color: '#253858',
        fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
        transition: 'background 120ms ease',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
      onMouseLeave={e => (e.currentTarget.style.background = '#FFFFFF')}
    >
      Generate
    </button>
  );
}
