import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { FileText, FileSearch, Download, Loader2, Zap, RotateCcw, Eye, ArrowRight, Sparkles, FileUp } from 'lucide-react';
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
import { useTheme } from '@/hooks/useTheme';

export default function ReqAssistLibrary() {
  const { isDark } = useTheme();
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
  const [pipelineStages, setPipelineStages] = useState<Record<string, string | null>>({});
  const [parentKeys, setParentKeys] = useState<Record<string, string | null>>({});
  const [ticketTypes, setTicketTypes] = useState<Record<string, string | null>>({});
  const [rawTextSources, setRawTextSources] = useState<Record<string, string | null>>({});

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

  const handleOpenDrafts = useCallback(async (doc: RADocumentWithArtifacts) => {
    const brdId = await resolveBrdId(doc);
    if (brdId) {
      setDraftDrawer({ brdId, docTitle: doc.title, jiraKey: (doc as any).jira_ticket_key || null });
    }
  }, [resolveBrdId]);

  const handleOpenDraftsByBrdId = useCallback((brdId: string) => {
    const doc = documents?.find(d => d.id === brdId || (d as any).jira_ticket_key);
    setDraftDrawer({
      brdId,
      docTitle: doc?.title || 'Document',
      jiraKey: (doc as any)?.jira_ticket_key || null,
    });
  }, [documents]);

  useEffect(() => {
    if (!documents || documents.length === 0) return;
    const jiraKeys = documents
      .map(d => (d as any).jira_ticket_key)
      .filter(Boolean) as string[];
    if (!jiraKeys.length) return;
    fetchDocumentEpicCounts(jiraKeys).then(countsMap => {
      const counts: Record<string, number> = {};
      const stages: Record<string, string | null> = {};
      const parents: Record<string, string | null> = {};
      const types: Record<string, string | null> = {};
      const sources: Record<string, string | null> = {};
      for (const doc of documents) {
        const jk = (doc as any).jira_ticket_key;
        if (jk && countsMap[jk]) {
          counts[doc.id] = countsMap[jk].epicCount;
          stages[doc.id] = countsMap[jk].pipelineStage;
          parents[doc.id] = countsMap[jk].parentJiraKey;
          types[doc.id] = countsMap[jk].ticketType;
          sources[doc.id] = countsMap[jk].rawTextSource;
        }
      }
      setEpicCounts(counts);
      setPipelineStages(stages);
      setParentKeys(parents);
      setTicketTypes(types);
      setRawTextSources(sources);
    });
  }, [documents]);

  const handleSyncKb = useCallback(async (docId: string) => {
    setSyncingIds(prev => new Set(prev).add(docId));
    try {
      const doc = documents?.find(d => d.id === docId);
      const jiraKey = (doc as any)?.jira_ticket_key;
      let brdId: string | null = null;
      const { data: direct } = await (supabase as any).from('brd_documents').select('id').eq('id', docId).maybeSingle();
      if (direct?.id) brdId = direct.id;
      if (!brdId && jiraKey) {
        const { data: jiraMatch } = await (supabase as any).from('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
        if (jiraMatch?.id) brdId = jiraMatch.id;
      }
      if (!brdId) { toast.error('Document not yet processed — generate BRDs first'); return; }
      await syncSingleBrdToKb(brdId);
      await (supabase as any).from('ra_documents').update({ kb_synced: true, kb_synced_at: new Date().toISOString() }).eq('id', docId);
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
      qc.invalidateQueries({ queryKey: ['req-assist-stats-bar'] });
      toast.success('Document indexed for Knowledge Assistant');
    } catch (err: any) {
      toast.error(sanitiseError(err));
    } finally {
      setSyncingIds(prev => { const n = new Set(prev); n.delete(docId); return n; });
    }
  }, [qc, documents]);

  const handleSyncAll = useCallback(async () => {
    if (!documents) return;
    const unsyncedReady = documents.filter(d => (d.status === 'ready' || d.status === 'complete') && !(d as any).kb_synced);
    if (!unsyncedReady.length) { toast.info('All documents already indexed'); return; }
    setSyncingAll(true);
    let success = 0;
    let failed = 0;
    for (let i = 0; i < unsyncedReady.length; i++) {
      const doc = unsyncedReady[i];
      toast.loading(`Indexing ${i + 1} of ${unsyncedReady.length}...`, { id: 'sync-all-progress' });
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
        await (supabase as any).from('ra_documents').update({ kb_synced: true, kb_synced_at: new Date().toISOString() }).eq('id', doc.id);
        success++;
      } catch (err: unknown) {
        failed++;
        console.error('[RA] Sync failed for doc:', sanitiseError(err));
      }
    }
    toast.dismiss('sync-all-progress');
    if (failed > 0) {
      toast.warning(`Indexed ${success} of ${unsyncedReady.length}. ${failed} failed.`);
    } else {
      toast.success(`Indexed ${success} documents for Knowledge Assistant`);
    }
    qc.invalidateQueries({ queryKey: RA_KEYS.all });
    qc.invalidateQueries({ queryKey: ['req-assist-stats-bar'] });
    setSyncingAll(false);
  }, [documents, qc]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel1 = supabase.channel('req-assist-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'brd_processing_queue' }, () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          qc.invalidateQueries({ queryKey: RA_KEYS.stats() });
          qc.invalidateQueries({ queryKey: RA_KEYS.all });
          qc.invalidateQueries({ queryKey: ['req-assist-stats-bar'] });
        }, 2000);
      }).subscribe();
    const channel2 = supabase.channel('req-assist-docs')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'brd_documents' }, () => {
        qc.invalidateQueries({ queryKey: RA_KEYS.all });
      }).subscribe();
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [qc]);

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
    <div style={{ background: isDark ? '#0A0A0A' : '#F8FAFC', minHeight: '100%' }}>
      {/* ── ZONE 1: PAGE HEADER ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 0' }}>
        <div>
          <h1 style={{ fontFamily: "'Sora', sans-serif", fontSize: 22, fontWeight: 700, color: isDark ? '#EDEDED' : '#0F172A', margin: 0 }}>
            Req Assist™
          </h1>
          <p style={{ fontSize: 13, fontWeight: 400, color: isDark ? '#878787' : '#64748B', margin: '2px 0 0', fontFamily: "'Inter', sans-serif" }}>
            BRD library — sourced from Jira, enriched by AI, indexed for AI-powered search
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setImportOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 50, fontSize: 13, fontWeight: 500,
              border: `1px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.18)'}`, borderRadius: 6,
              background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#374151', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'background 80ms ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFFFFF')}
          >
            <Download size={14} color="#374151" /> Import from Jira
          </button>
          <button
            onClick={() => navigate('/product/req-assist/generate')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '0 14px', height: 50, fontSize: 13, fontWeight: 600,
              border: 'none', borderRadius: 6,
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
              boxShadow: '0 1px 3px rgba(37,99,235,0.35)',
              color: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif",
              transition: 'box-shadow 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(37,99,235,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(37,99,235,0.35)'; }}
          >
            <Sparkles size={14} /> Generate BRD from Text
          </button>
        </div>
      </div>

      {/* ── ZONE 2+3: STATS BAR ── */}
      <RAStatsBar
        totalDocuments={stats?.total_documents ?? 0}
        wikihubSynced={stats?.wikihub_synced ?? 0}
        wikihubChunks={stats?.wikihub_chunks ?? 0}
        artifactsGenerated={stats?.artifacts_generated ?? 0}
        processingCount={stats?.processing_count ?? 0}
        lastSync={stats?.last_sync ?? null}
        loading={statsLoading}
      />

      {/* ── ZONE 4: DOCUMENT TABLE SECTION ── */}
      <div style={{ padding: '20px 28px 28px' }}>
        {!isLoading && totalCount === 0 && !isFiltering ? (
          /* Empty state */
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 0', background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`, borderRadius: 8,
          }}>
            <FileText size={32} color="#94A3B8" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 6px', fontFamily: "'Sora', sans-serif" }}>No documents yet</p>
            <p style={{ fontSize: 14, color: isDark ? '#878787' : '#64748B', margin: '0 0 20px', fontFamily: "'Inter', sans-serif" }}>Import from Jira or generate a BRD from text to get started.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setImportOpen(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 14px', height: 50,
                fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 6,
                background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
              }}>
                <Download size={14} /> Import from Jira
              </button>
            </div>
          </div>
        ) : (
          /* Table container */
          <div style={{
            background: isDark ? '#1A1A1A' : '#FFFFFF',
            border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            {/* Toolbar */}
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

            {/* Filter info bar */}
            {isFiltering && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 28px', fontSize: 12, color: isDark ? '#878787' : '#64748B',
                background: isDark ? '#1A1A1A' : '#FFFFFF', borderBottom: `0.75px solid ${isDark ? '#292929' : 'rgba(15,23,42,0.08)'}`,
                fontFamily: "'Inter', sans-serif",
              }}>
                Showing {documents?.length ?? 0} of {totalCount} documents
                <span style={{ color: isDark ? '#878787' : '#94A3B8' }}>·</span>
                Filtered by: <strong style={{ color: isDark ? '#A1A1A1' : '#334155', fontWeight: 600 }}>{tab !== 'all' ? tab.charAt(0).toUpperCase() + tab.slice(1) : search}</strong>
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

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr style={{ borderBottom: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}` }}>
                  {[
                    { label: 'JIRA TICKET', w: 120 },
                    { label: 'TITLE', w: undefined },
                    { label: 'DOMAIN', w: 110 },
                    { label: 'PDF', w: 60 },
                    { label: 'STATUS', w: 110 },
                    { label: 'GENERATION', w: 160 },
                    { label: 'IMPORTED', w: 80 },
                    { label: 'ACTIONS', w: 220 },
                  ].map((col, i) => (
                    <th key={i} style={{
                      padding: '10px 12px', height: 50,
                      fontSize: 11, fontWeight: 600, color: isDark ? '#878787' : '#64748B',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      textAlign: 'left', width: col.w || undefined,
                      background: isDark ? '#0A0A0A' : '#F8FAFC',
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
                    <tr key={i} style={{ height: 50 }}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} style={{ padding: '8px 12px' }}>
                          <div style={{ width: j === 1 ? '80%' : '60%', height: 12, background: isDark ? '#2E2E2E' : '#E2E8F0', borderRadius: 4, animation: 'ra-pulse 1.5s ease-in-out infinite' }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : hasDocuments ? (
                  documents!.map((doc, docIdx) => {
                    const isProcessingRow = doc.status === 'processing';
                    const processingJob = (doc as any).ra_processing_jobs?.find?.((j: any) => j.status === 'processing');
                    const isLast = docIdx === documents!.length - 1;
                    return (
                      <tr
                        key={doc.id}
                        onClick={(e) => handleRowClick(doc, e)}
                        style={{
                          height: parentKeys[doc.id] ? 48 : 36, cursor: 'pointer',
                          borderBottom: isLast ? 'none' : '0.75px solid rgba(15,23,42,0.06)',
                          background: isProcessingRow ? 'rgba(37,99,235,0.04)' : isDark ? '#0A0A0A' : 'transparent',
                          transition: 'background 120ms ease',
                        }}
                        onMouseEnter={e => { if (!isProcessingRow) (e.currentTarget as HTMLElement).style.background = isDark ? '#1F1F1F' : 'rgba(15,23,42,0.02)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = isProcessingRow ? 'rgba(37,99,235,0.04)' : 'transparent'; }}
                      >
                        {/* Jira Ticket — with parent hierarchy */}
                        <td style={{ padding: '8px 12px', overflow: 'hidden' }}>
                          {parentKeys[doc.id] ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {/* Parent line */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3.5 2L6.5 5L3.5 8" stroke="#CBD5E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 500, color: isDark ? '#878787' : '#94A3B8' }}>
                                  {parentKeys[doc.id]}
                                </span>
                              </div>
                              {/* This ticket — indented */}
                              <div style={{ paddingLeft: 8 }}>
                                {doc.jira_ticket_url ? (
                                  <a href={doc.jira_ticket_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB', textDecoration: 'none' }}
                                    onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                    onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                  >
                                    {doc.jira_ticket_key}
                                  </a>
                                ) : (
                                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600, color: '#2563EB' }}>
                                    {doc.jira_ticket_key}
                                  </span>
                                )}
                                <TicketTypeBadge type={ticketTypes[doc.id]} />
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {doc.jira_ticket_url ? (
                                <a href={doc.jira_ticket_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                                  style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#2563EB', textDecoration: 'none' }}
                                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                                >
                                  {doc.jira_ticket_key}
                                </a>
                              ) : (
                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#2563EB' }}>
                                  {doc.jira_ticket_key}
                                </span>
                              )}
                              <TicketTypeBadge type={ticketTypes[doc.id]} />
                            </div>
                          )}
                        </td>
                        {/* Title */}
                        <td style={{ padding: '8px 12px', overflow: 'hidden', maxWidth: 0 }}>
                          <span title={doc.title} style={{
                            display: 'block', fontSize: 13, fontWeight: 400, color: isDark ? '#EDEDED' : '#0F172A',
                            fontFamily: "'Inter', sans-serif",
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            maxWidth: 320,
                          }}>
                            {doc.title}
                          </span>
                        </td>
                        {/* D07: Domain — derived from prefix if null */}
                        <td style={{ padding: '8px 12px', overflow: 'hidden' }}>
                          {(() => {
                            const domain = doc.domain || deriveDomainFromKey(doc.jira_ticket_key);
                            return domain ? (
                              <span style={{
                                fontSize: 12, color: isDark ? '#A1A1A1' : '#475569', fontFamily: "'Inter', sans-serif",
                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                display: 'block', maxWidth: 110,
                              }} title={domain}>
                                {domain}
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                                background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4,
                                fontSize: 11, color: isDark ? '#878787' : '#94A3B8', fontFamily: "'Inter', sans-serif",
                              }}>Uncategorised</span>
                            );
                          })()}
                        </td>
                        {/* B2: SOURCE PDF — upload or signed-URL view */}
                        <td data-col="pdf" style={{ padding: '8px 12px', overflow: 'hidden', textAlign: 'center', width: 80 }}>
                          {doc.pdf_url ? (
                            <button
                              title={(doc as any).pdf_filename || 'source.pdf'}
                              onClick={async (e) => {
                                e.stopPropagation();
                                // Generate signed URL and open in new tab
                                const path = doc.pdf_url!;
                                const { data } = await supabase.storage.from('brd-attachments').createSignedUrl(path, 3600);
                                if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                              }}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                padding: '3px 6px', borderRadius: 4,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                fontSize: 12, color: '#2563EB', fontWeight: 500,
                                fontFamily: "'Inter', sans-serif",
                              }}
                              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              <FileText size={14} color="#2563EB" />
                              PDF
                            </button>
                          ) : (
                            <PdfUploadCell brdId={brdData_forRow_id(doc)} jiraKey={doc.jira_ticket_key} />
                          )}
                        </td>
                        {/* Status — computed from epicCount + pipeline_stage */}
                        <td style={{ padding: '8px 12px', overflow: 'hidden' }}>
                          <StatusBadge status={doc.status} epicCount={epicCounts[doc.id] || 0} pipelineStage={pipelineStages[doc.id] ?? null} />
                        </td>
                        {/* Generation */}
                        <td style={{ padding: '8px 12px', overflow: 'hidden', maxWidth: 160 }}>
                          <RAGenerationBar
                            slots={doc.generation_slots}
                            artifactCounts={doc.artifact_counts}
                            isProcessing={isProcessingRow}
                            etaMinutes={processingJob ? Math.ceil((processingJob.eta_seconds ?? 240) / 60) : undefined}
                            docStatus={doc.status}
                            epicCount={epicCounts[doc.id] || 0}
                            pipelineStage={pipelineStages[doc.id] ?? null}
                          />
                        </td>
                        {/* Imported */}
                        <td style={{ padding: '8px 12px', overflow: 'hidden' }}>
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: isDark ? '#878787' : '#64748B' }}>
                            {doc.pulled_at ? formatImported(doc.pulled_at) : '—'}
                          </span>
                        </td>
                        {/* Actions */}
                        <td data-col="actions" style={{ padding: '8px 12px', overflow: 'visible', position: 'relative', minWidth: 220, whiteSpace: 'nowrap' }}>
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
                  <tr>
                    <td colSpan={8} style={{ padding: '48px 0', textAlign: 'center' }}>
                      <FileSearch size={24} color="#94A3B8" style={{ margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ fontSize: 14, color: isDark ? '#878787' : '#64748B', margin: '0 0 8px', fontFamily: "'Inter', sans-serif" }}>
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
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                height: 50, padding: '8px 12px',
                background: isDark ? '#0A0A0A' : '#FAFAFA',
                borderTop: `0.75px solid ${isDark ? '#292929' : 'rgba(15,23,42,0.08)'}`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 400, color: isDark ? '#878787' : '#64748B', fontFamily: "'Inter', sans-serif" }}>
                  Showing {documents.length} of {totalCount} documents
                </span>
                <button
                  onClick={() => { setTab('all'); setSearch(''); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    fontSize: 12, fontWeight: 500, color: '#2563EB',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                >
                  Show all {totalCount} →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overlays */}
      {selectedDoc && <RAJiraSidePanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} onOpenPdf={() => setPdfDoc(selectedDoc)} onGenerate={(type) => type === 'epics' ? handleGenerateClick(selectedDoc) : setBgModal({ type, doc: selectedDoc })} onViewDrafts={(brdId) => { setSelectedDoc(null); handleOpenDraftsByBrdId(brdId); }} onSyncKb={handleSyncKb} />}
      {pdfDoc && <RAPDFViewer doc={pdfDoc} onClose={() => setPdfDoc(null)} onGenerateEpics={() => { setPdfDoc(null); if (pdfDoc) setBgModal({ type: 'epics', doc: pdfDoc }); }} />}
      {bgModal && bgModal.type === 'epics' ? (
        <RAEpicGenerationModal
          doc={bgModal.doc}
          onClose={() => setBgModal(null)}
          onViewDrafts={(brdId) => { setBgModal(null); handleOpenDraftsByBrdId(brdId); }}
        />
      ) : bgModal ? (
        <RABackgroundModal type={bgModal.type} doc={bgModal.doc} onClose={() => setBgModal(null)} />
      ) : null}

      {draftDrawer && (
        <RAEpicDraftDrawer
          brdId={draftDrawer.brdId}
          docTitle={draftDrawer.docTitle}
          jiraKey={draftDrawer.jiraKey}
          onClose={() => { setDraftDrawer(null); qc.invalidateQueries({ queryKey: RA_KEYS.all }); }}
        />
      )}

      {/* Regen confirmation */}
      {regenConfirm && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.30)', zIndex: 80 }} onClick={() => setRegenConfirm(null)} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: 420, background: isDark ? '#1A1A1A' : '#FFFFFF', borderRadius: 8, zIndex: 90,
            padding: 24, border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.10)'}`,
            fontFamily: "'Inter', sans-serif",
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 650, color: isDark ? '#EDEDED' : '#0F172A', margin: '0 0 8px', fontFamily: "'Sora', sans-serif" }}>
              Epics Already Exist
            </h3>
            <p style={{ fontSize: 14, color: isDark ? '#878787' : '#64748B', margin: '0 0 20px', lineHeight: 1.5 }}>
              This document already has {regenConfirm.count} epic{regenConfirm.count !== 1 ? 's' : ''} generated
              {regenConfirm.generatedAt ? (() => {
                const days = Math.floor((Date.now() - new Date(regenConfirm.generatedAt!).getTime()) / 86400000);
                return days === 0 ? ' today' : days === 1 ? ' yesterday' : ` ${days} days ago`;
              })() : ''}. What would you like to do?
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setRegenConfirm(null)} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: 'none', background: 'transparent', color: isDark ? '#A1A1A1' : '#475569', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={() => {
                const brdId = regenConfirm.brdId;
                const doc = regenConfirm.doc;
                setRegenConfirm(null);
                setDraftDrawer({ brdId, docTitle: doc.title, jiraKey: (doc as any).jira_ticket_key || null });
              }} style={{
                padding: '8px 16px', fontSize: 13, fontWeight: 500, borderRadius: 6,
                border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.15)'}`, background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#334155', cursor: 'pointer',
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

      <style>{`
        @keyframes ra-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

/* ── Helpers ── */

function deriveDomainFromKey(jiraKey: string | null | undefined): string | null {
  if (!jiraKey) return null;
  const prefix = jiraKey.split('-')[0]?.toUpperCase();
  const map: Record<string, string> = {
    'MDT': 'Ministry Digital Transformation',
    'SEN': 'Senaei Platform',
    'SIMP': 'Industrial Monitoring',
  };
  return map[prefix] || null;
}

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

/* B2: PDF Upload Cell for rows without a PDF */
function PdfUploadCell({ brdId: initialBrdId, jiraKey }: { brdId: string | null; jiraKey: string }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const handleUpload = async (file: File) => {
    // Resolve brd_id from jira_key if not provided
    let brdId = initialBrdId;
    if (!brdId && jiraKey) {
      const { data } = await (supabase as any).from('brd_documents').select('id').eq('jira_key', jiraKey).maybeSingle();
      brdId = data?.id ?? null;
    }
    if (!brdId) {
      toast.error('BRD document not found — cannot attach PDF');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File too large — max 50MB');
      return;
    }
    setUploading(true);
    try {
      const path = `${brdId}/source.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from('brd-attachments')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      await (supabase as any).from('brd_documents').update({
        pdf_url: path,
        pdf_filename: file.name,
        pdf_attached_at: new Date().toISOString(),
      }).eq('id', brdId);

      toast.success('PDF attached — click to open');
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        title="Attach source PDF"
        onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
        disabled={uploading}
        style={{
          border: 'none', background: 'transparent', cursor: uploading ? 'default' : 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 4,
        }}
      >
        {uploading ? (
          <Loader2 size={14} color="#94A3B8" style={{ animation: 'ra-pulse 1s linear infinite' }} />
        ) : (
          <FileUp size={14} color="#94A3B8" />
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); }}
      />
    </>
  );
}

/* Helper: resolve brd_documents.id for a given ra_documents row */
function brdData_forRow_id(doc: RADocumentWithArtifacts): string | null {
  // pdf_url is on brd_documents, not ra_documents.
  // For the upload cell we need the brd_documents id.
  // This is loaded async in the side panel but here we attempt a simpler approach:
  // We store no local cache, so we pass null and let the upload cell resolve it.
  return null;
}

/* V12 StatusLozenge — IMMUTABLE GUARDRAIL — computed from epicCount + pipeline_stage */
function StatusBadge({ status, epicCount, pipelineStage }: { status: string; epicCount: number; pipelineStage: string | null }) {
  let bg: string, color: string, label: string;

  const ps = pipelineStage ?? status;

  if (ps === 'failed') {
    bg = '#DFE1E6'; color = '#42526E'; label = 'FAILED';
  } else if (epicCount > 0) {
    // Having epics = document is usable regardless of pipeline_stage
    bg = '#1B7F37'; color = '#FFFFFF'; label = 'READY';
  } else if (ps === 'complete') {
    // pipeline complete but no epics yet → still READY
    bg = '#1B7F37'; color = '#FFFFFF'; label = 'READY';
  } else if (['extract', 'process', 'validate', 'distribute', 'processing'].includes(ps)) {
    bg = '#0C66E4'; color = '#FFFFFF'; label = 'PROCESSING';
  } else {
    // intake, pending, or unknown
    bg = '#DFE1E6'; color = '#42526E'; label = 'PENDING';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '0 6px', height: 20, borderRadius: 4,
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.03em', whiteSpace: 'nowrap',
      background: bg, color: color,
      fontFamily: "'Inter', sans-serif",
    }}>
      {label}
    </span>
  );
}

/* Actions column — V12 restyled */
function ActionsCell({ doc, epicCount, onSyncKb, onSelect, onViewDrafts }: {
  doc: RADocumentWithArtifacts;
  epicCount: number;
  onSyncKb: (docId: string) => void;
  onSelect: (type: string) => void;
  onViewDrafts: () => void;
}) {
  const { isDark } = useTheme();
  const isReady = doc.status === 'ready' || doc.status === 'complete';
  const isProcessing = doc.status === 'processing' || ['intake', 'extract', 'process', 'validate', 'distribute'].includes(doc.status);
  const isFailed = doc.status === 'failed';
  const kbSynced = (doc as any).kb_synced === true;

  /* Has epics → View Drafts (purple) + count badge */
  if (epicCount > 0 && !isProcessing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={(e) => { e.stopPropagation(); onViewDrafts(); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
            borderRadius: 6, border: '0.75px solid #BFDBFE',
            background: isDark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: '#1D4ED8', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
            transition: 'background 80ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#DBEAFE'; e.currentTarget.style.borderColor = '#93C5FD'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
        >
          View Drafts
        </button>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 18, height: 18, borderRadius: 8,
          background: '#2563EB', color: '#FFFFFF',
          fontSize: 11, fontWeight: 700,
          fontFamily: "'Inter', sans-serif",
        }}>{epicCount}</span>
      </div>
    );
  }

  /* READY + AI INDEXED */
  if (isReady && kbSynced) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '0 6px', height: 20, borderRadius: 4,
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.03em', whiteSpace: 'nowrap',
          background: '#1B7F37', color: '#FFFFFF',
          fontFamily: "'Inter', sans-serif",
        }}>AI INDEXED</span>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect('view'); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
            borderRadius: 6, border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.15)'}`,
            background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#374151', cursor: 'pointer',
            fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
          }}
        >
          <Eye size={12} /> View
        </button>
      </div>
    );
  }

  /* READY + NOT SYNCED */
  if (isReady && !kbSynced) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSyncKb(doc.id); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 6, border: 'none', cursor: 'pointer',
          background: '#2563EB', color: '#FFFFFF',
          fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
        }}
      >
        <Zap size={12} /> Index to KA
      </button>
    );
  }

  /* FAILED → Retry */
  if (isFailed) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); onSelect('epics'); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
          borderRadius: 6, border: '0.75px solid #DC2626',
          background: 'transparent', color: '#DC2626', cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
        }}
      >
        <RotateCcw size={12} /> Retry
      </button>
    );
  }

  /* PROCESSING → disabled */
  if (isProcessing) {
    return (
      <button disabled style={{
        display: 'inline-flex', alignItems: 'center',
        height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
        borderRadius: 6, border: 'none', cursor: 'not-allowed',
        background: isDark ? '#2E2E2E' : '#E2E8F0', color: isDark ? '#878787' : '#94A3B8',
        fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
      }}>
        Generate
      </button>
    );
  }

  /* PENDING → Generate with Zap icon */
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onSelect('epics'); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        height: 28, padding: '0 10px', fontSize: 12, fontWeight: 500,
        borderRadius: 6, border: `0.75px solid ${isDark ? '#2E2E2E' : 'rgba(15,23,42,0.15)'}`,
        background: isDark ? '#1A1A1A' : '#FFFFFF', color: isDark ? '#A1A1A1' : '#374151', cursor: 'pointer',
        fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap',
        transition: 'all 80ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(37,99,235,0.04)';
        e.currentTarget.style.borderColor = '#BFDBFE';
        e.currentTarget.style.color = '#1D4ED8';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = isDark ? '#1A1A1A' : '#FFFFFF';
        e.currentTarget.style.borderColor = 'rgba(15,23,42,0.15)';
        e.currentTarget.style.color = '#374151';
      }}
    >
      <Zap size={12} /> Generate
    </button>
  );
}

/* ── Ticket Type Badge ── */
const TICKET_TYPE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  subtask: { bg: '#FEF3C7', color: '#92400E', label: 'SUBTASK' },
  story:   { bg: '#EFF6FF', color: '#1D4ED8', label: 'STORY' },
  epic:    { bg: '#F3E8FF', color: '#6B21A8', label: 'EPIC' },
  task:    { bg: '#F1F5F9', color: '#475569', label: 'TASK' },
};

function TicketTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const s = TICKET_TYPE_STYLES[type.toLowerCase()] || TICKET_TYPE_STYLES.task;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', marginLeft: 4,
      padding: '0 5px', height: 18, borderRadius: 4,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      background: s.bg, color: s.color,
      fontFamily: "'Inter', sans-serif",
    }}>{s.label}</span>
  );
}
