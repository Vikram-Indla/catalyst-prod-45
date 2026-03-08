import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Zap, BookOpen, FlaskConical, Copy, Check, Paperclip, ArrowDownToLine, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { formatTimestamp } from '@/lib/formatTimestamp';
import toast from 'react-hot-toast';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
  onOpenPdf: () => void;
  onGenerate: (type: string) => void;
  onViewDrafts?: (brdId: string) => void;
  onSyncKb?: (docId: string) => void;
}

interface BrdData {
  id: string | null;
  pipeline_stage: string | null;
  raw_text: string | null;
  epicCount: number;
  wikiCount: number;
  publishedCount: number;
}

export default function RAJiraSidePanel({ doc, onClose, onOpenPdf, onGenerate, onViewDrafts, onSyncKb }: Props) {
  const navigate = useNavigate();
  const [brdData, setBrdData] = useState<BrdData>({
    id: null, pipeline_stage: null, raw_text: null,
    epicCount: 0, wikiCount: 0, publishedCount: 0,
  });
  const [contentExpanded, setContentExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load BRD data chain: ra_documents.jira_ticket_key → brd_documents.jira_key → brd_epics
  useEffect(() => {
    const load = async () => {
      const jiraKey = doc.jira_ticket_key;
      if (!jiraKey) return;

      const { data: brdRow } = await (supabase as any)
        .from('brd_documents')
        .select('id, pipeline_stage, raw_text')
        .eq('jira_key', jiraKey)
        .maybeSingle();

      if (!brdRow?.id) {
        setBrdData({ id: null, pipeline_stage: null, raw_text: null, epicCount: 0, wikiCount: 0, publishedCount: 0 });
        return;
      }

      const [epicRes, pubRes, wikiRes] = await Promise.all([
        (supabase as any).from('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', brdRow.id),
        (supabase as any).from('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', brdRow.id).not('ra_tag', 'is', null),
        (supabase as any).from('kb_embeddings').select('id', { count: 'exact', head: true }).eq('source_id', brdRow.id),
      ]);

      let finalWikiCount = wikiRes.count ?? 0;
      if (finalWikiCount === 0 && doc.wikihub_chunk_count) {
        finalWikiCount = doc.wikihub_chunk_count;
      }

      setBrdData({
        id: brdRow.id,
        pipeline_stage: brdRow.pipeline_stage,
        raw_text: brdRow.raw_text,
        epicCount: epicRes.count ?? 0,
        wikiCount: finalWikiCount,
        publishedCount: pubRes.count ?? 0,
      });
    };
    load();
  }, [doc]);

  const handleCopy = () => {
    if (brdData.raw_text) {
      navigator.clipboard.writeText(brdData.raw_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── FIX 2: Sync to KB handler with brd_id resolution ──
  const handleSyncToKB = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      // Step 1: resolve brd_id from jira_ticket_key
      const { data: brdRow, error: brdError } = await (supabase as any)
        .from('brd_documents')
        .select('id')
        .eq('jira_key', doc.jira_ticket_key)
        .maybeSingle();

      if (brdError || !brdRow?.id) {
        toast.error('Could not find BRD document to sync');
        setSyncing(false);
        return;
      }

      // Step 2: invoke kb-sync
      const { error } = await supabase.functions.invoke('kb-sync', {
        body: {
          brd_id: brdRow.id,
          source_type: 'jira_bulk',
        },
      });

      if (error) {
        toast.error('KB sync failed: ' + error.message);
        setSyncing(false);
        return;
      }

      toast.success('Sync started — KB will update shortly');
    } catch (err) {
      toast.error('Sync failed. Please try again.');
      console.error('[SyncToKB]', err);
    } finally {
      setSyncing(false);
    }
  };

  // ── Pipeline stepper logic ──
  const stage = brdData.pipeline_stage;
  const { epicCount, wikiCount, publishedCount } = brdData;

  const stepsRaw: { label: string; state: 'complete' | 'active' | 'pending' }[] = [
    { label: 'Imported', state: 'complete' },
    {
      label: 'Processed',
      state: (stage && ['extract', 'process', 'validate', 'distribute', 'complete'].includes(stage))
        ? 'complete' : 'active',
    },
    {
      label: 'Indexed',
      state: (wikiCount > 0 || (stage && ['validate', 'distribute', 'complete'].includes(stage)))
        ? 'complete' : (stage === 'process' && wikiCount === 0) ? 'active' : 'pending',
    },
    {
      label: 'Epics',
      state: epicCount > 0 ? 'complete' : (stage === 'complete' && epicCount === 0) ? 'active' : 'pending',
    },
    {
      label: 'Published',
      state: (epicCount > 0 && publishedCount > 0) ? 'complete' : (epicCount > 0 && publishedCount === 0) ? 'active' : 'pending',
    },
  ];

  // ── Status lozenge — V12 3-color guardrail ──
  const getStageLozenge = () => {
    if (!stage) return { bg: '#DFE1E6', color: '#253858', label: 'PENDING' };
    if (stage === 'complete') return { bg: '#E3FCEF', color: '#006644', label: 'COMPLETE' };
    if (stage === 'failed') return { bg: '#DFE1E6', color: '#253858', label: 'FAILED' };
    return { bg: '#DEEBFF', color: '#0747A6', label: stage.toUpperCase() };
  };
  const lozenge = getStageLozenge();

  // ── Description fallback chain ──
  const description =
    (doc as any).description
    || (doc as any).summary
    || (doc as any).body
    || (doc as any).content_raw
    || (brdData.raw_text ? brdData.raw_text.substring(0, 300) + (brdData.raw_text.length > 300 ? '…' : '') : null)
    || null;
  const descTruncated = description && description.length > 300;

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column',
        borderLeft: '0.75px solid rgba(15,23,42,0.12)',
        boxShadow: '-4px 0 24px rgba(15,23,42,0.08)',
        animation: 'ra-slide-left 200ms ease-out',
      }}>
        {/* ── HEADER ── */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '0.75px solid rgba(15,23,42,0.10)', flexShrink: 0 }}>
          {/* Row 1: Jira chip + close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <a
              href={doc.jira_ticket_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#EFF6FF', border: '0.75px solid #BFDBFE', borderRadius: 4,
                padding: '2px 8px', textDecoration: 'none', cursor: doc.jira_ticket_url ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#2563EB' }}>
                {doc.jira_ticket_key}
              </span>
              {doc.jira_ticket_url && <ExternalLink size={11} color="#2563EB" />}
            </a>
            <button onClick={onClose} style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={16} color="#64748B" />
            </button>
          </div>
          {/* Row 2: Title */}
          <h3 style={{
            fontSize: 18, fontWeight: 700, color: '#0F172A', margin: '10px 0 0', fontFamily: "'Sora', sans-serif",
            lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
          }}>{doc.title}</h3>
          {/* Row 3: Status + meta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '0 6px', borderRadius: 3, height: 20,
              lineHeight: '20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: lozenge.bg, color: lozenge.color, fontFamily: "'Inter', sans-serif",
            }}>{lozenge.label}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
              Imported {formatTimestamp(doc.created_at)}
            </span>
          </div>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── PIPELINE STEPPER ── */}
          <div style={{ padding: '16px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
            <div style={{
              background: '#F8FAFC', border: '0.75px solid rgba(15,23,42,0.08)', borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {stepsRaw.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step.state === 'complete' ? '#16A34A' : step.state === 'active' ? '#2563EB' : '#FFFFFF',
                        border: step.state === 'pending' ? '1.5px solid #CBD5E1' : 'none',
                      }}>
                        {step.state === 'complete' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        {step.state === 'active' && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
                        fontWeight: step.state === 'active' ? 600 : step.state === 'complete' ? 500 : 400,
                        color: step.state === 'complete' ? '#16A34A' : step.state === 'active' ? '#2563EB' : '#94A3B8',
                      }}>{step.label}</span>
                    </div>
                    {i < stepsRaw.length - 1 && (
                      <div style={{
                        flex: 1, height: 0, marginTop: -18,
                        borderTop: step.state === 'complete' && stepsRaw[i + 1].state === 'complete'
                          ? '2px solid #16A34A'
                          : step.state === 'complete'
                            ? '2px dashed #CBD5E1'
                            : '2px dashed #E5E7EB',
                        marginInline: 4,
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── JIRA METADATA ── */}
          <div style={{ padding: '16px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
            <SectionHeader>Jira Metadata</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <MetaRow label="Ticket">
                <a
                  href={doc.jira_ticket_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: '#EFF6FF', border: '0.75px solid #BFDBFE', borderRadius: 4,
                    padding: '1px 8px', textDecoration: 'none',
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 500, color: '#2563EB',
                    cursor: doc.jira_ticket_url ? 'pointer' : 'default',
                  }}
                >
                  {doc.jira_ticket_key}
                </a>
              </MetaRow>
              <MetaRow label="Title">
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>{doc.title}</span>
              </MetaRow>
              {/* Description with fallback chain */}
              <MetaRow label="Description">
                {description ? (
                  <div style={{ flex: 1 }}>
                    <div style={{
                      background: '#F8FAFC', border: '0.75px solid rgba(15,23,42,0.08)', borderRadius: 6,
                      padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.6,
                      fontFamily: "'Inter', sans-serif",
                      maxHeight: descExpanded ? 'none' : 100, overflow: 'hidden',
                      display: descExpanded ? 'block' : '-webkit-box',
                      WebkitLineClamp: descExpanded ? undefined : 4,
                      WebkitBoxOrient: descExpanded ? undefined : 'vertical' as any,
                    }}>
                      {description}
                    </div>
                    {descTruncated && (
                      <button onClick={() => setDescExpanded(!descExpanded)} style={{
                        border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
                        fontSize: 11, fontWeight: 500, color: '#2563EB', fontFamily: "'Inter', sans-serif",
                      }}>
                        {descExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>No description available</span>
                )}
              </MetaRow>
              <MetaRow label="Imported">
                <span style={{ fontSize: 12, color: '#64748B', fontFamily: "'Inter', sans-serif" }}>
                  {formatTimestamp(doc.created_at)}
                </span>
              </MetaRow>
              <MetaRow label="Domain">
                <span style={{ fontSize: 13, color: doc.domain ? '#475569' : '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                  {doc.domain || '—'}
                </span>
              </MetaRow>
            </div>
          </div>

          {/* ── SOURCE ATTACHMENTS ── */}
          <div style={{ padding: '16px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
            <SectionHeader>Source Attachments</SectionHeader>
            <div style={{ marginTop: 10 }}>
              {doc.pdf_url ? (
                <div style={{
                  height: 48, display: 'flex', alignItems: 'center', gap: 12,
                  background: '#FFFFFF', border: '0.75px solid rgba(15,23,42,0.10)',
                  borderRadius: 6, padding: '0 14px',
                }}>
                  <FileText size={18} color="#DC2626" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>
                      {doc.jira_ticket_key}.pdf
                    </div>
                    <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                      {doc.page_count ? `${doc.page_count} pages` : 'PDF'} · {doc.language === 'ar' ? 'AR' : 'EN'}
                    </div>
                  </div>
                  <button onClick={onOpenPdf} style={{
                    height: 26, padding: '0 10px', borderRadius: 5,
                    border: '0.75px solid rgba(15,23,42,0.15)', background: '#FFFFFF',
                    fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer',
                    fontFamily: "'Inter', sans-serif",
                  }}>View</button>
                  <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', color: '#64748B' }}>
                    <ArrowDownToLine size={14} />
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 4 }}>
                  <Paperclip size={18} color="#CBD5E1" />
                  <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>No attachments found</span>
                  <span style={{ fontSize: 11, color: '#CBD5E1', fontFamily: "'Inter', sans-serif" }}>Attachments are imported automatically from Jira</span>
                </div>
              )}
            </div>
          </div>

          {/* ── DOCUMENT CONTENT ── */}
          <div style={{ padding: '16px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionHeader>Document Content</SectionHeader>
              {brdData.raw_text && (
                <button onClick={handleCopy} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                  {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} color="#94A3B8" />}
                </button>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              {brdData.raw_text ? (
                <>
                  <div style={{
                    background: '#F8FAFC', border: '0.75px solid rgba(15,23,42,0.08)', borderRadius: 6,
                    padding: '12px 14px', fontSize: 13, color: '#374151', lineHeight: 1.6,
                    fontFamily: "'Inter', sans-serif",
                    maxHeight: contentExpanded ? 'none' : 120, overflow: 'hidden',
                  }}>
                    {contentExpanded ? brdData.raw_text : brdData.raw_text.slice(0, 400) + (brdData.raw_text.length > 400 ? '…' : '')}
                  </div>
                  {brdData.raw_text.length > 400 && (
                    <button onClick={() => setContentExpanded(!contentExpanded)} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 12, color: '#2563EB', fontWeight: 500, padding: '4px 0', fontFamily: "'Inter', sans-serif",
                    }}>
                      {contentExpanded ? 'Show less' : 'Show full content'}
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 6 }}>
                  <FileText size={20} color="#CBD5E1" />
                  <span style={{ fontSize: 13, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>Content not yet extracted</span>
                  <span style={{ fontSize: 12, color: '#CBD5E1', fontFamily: "'Inter', sans-serif" }}>Upload a PDF or extract from Jira attachments</span>
                  {doc.pdf_url && (
                    <button onClick={() => onGenerate('extract')} style={{
                      marginTop: 6, height: 28, padding: '0 12px', borderRadius: 5,
                      border: '0.75px solid rgba(15,23,42,0.15)', background: '#FFFFFF',
                      fontSize: 12, fontWeight: 500, color: '#374151', cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}>Extract from PDF</button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── GENERATED ARTIFACTS ── */}
          <div style={{ padding: '16px 20px' }}>
            <SectionHeader>Generated Artifacts</SectionHeader>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>

              {/* Epics Row — ALL BLUE, zero purple */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={15} color="#2563EB" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 40 }}>Epics</span>
                {epicCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 10,
                    background: '#EFF6FF', border: '0.75px solid #BFDBFE',
                    fontSize: 11, fontWeight: 700, color: '#1D4ED8',
                    fontFamily: "'Inter', sans-serif",
                  }}>{epicCount} generated</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 10,
                    background: '#F1F5F9', color: '#94A3B8', border: '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                  }}>None yet</span>
                )}
                <button
                  onClick={() => {
                    if (epicCount > 0 && brdData.id && onViewDrafts) {
                      onClose();
                      onViewDrafts(brdData.id);
                    } else {
                      onGenerate('epics');
                    }
                  }}
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                    color: '#2563EB', whiteSpace: 'nowrap',
                  }}
                >
                  {epicCount > 0 ? 'View Drafts →' : 'Generate Epics →'}
                </button>
              </div>

              {/* Wiki Chunks Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={16} color="#0D9488" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif", flexShrink: 0, minWidth: 80 }}>Wiki Chunks</span>
                {wikiCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 10,
                    background: '#F0FDFA', border: '0.75px solid #99F6E4',
                    fontSize: 11, fontWeight: 700, color: '#0F766E',
                    fontFamily: "'Inter', sans-serif",
                  }}>{wikiCount} indexed</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 10,
                    background: '#F1F5F9', color: '#94A3B8', border: '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                  }}>Not indexed</span>
                )}
                <button
                  disabled={syncing}
                  onClick={() => {
                    if (wikiCount > 0) {
                      navigate(`/wiki?source=${doc.jira_ticket_key}`);
                    } else {
                      handleSyncToKB();
                    }
                  }}
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'transparent', cursor: syncing ? 'default' : 'pointer', padding: 0,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                    color: '#2563EB', whiteSpace: 'nowrap',
                    opacity: syncing ? 0.6 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {syncing ? (
                    <>
                      <Loader2 size={12} color="#2563EB" style={{ animation: 'spin 1s linear infinite' }} />
                      Syncing...
                    </>
                  ) : (
                    wikiCount > 0 ? 'View in WikiHub →' : 'Sync to KB →'
                  )}
                </button>
              </div>

              {/* UAT Cases Row — single line, no wrap */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                minHeight: 40, flexWrap: 'nowrap',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FlaskConical size={15} color="#94A3B8" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', flexShrink: 0, minWidth: 70 }}>UAT Cases</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 10,
                  background: '#F1F5F9', color: '#94A3B8', border: '0.75px solid rgba(15,23,42,0.12)',
                  fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
                }}>Not generated</span>
                <span style={{
                  marginLeft: 'auto', fontSize: 11, color: '#CBD5E1', fontFamily: "'Inter', sans-serif",
                  whiteSpace: 'nowrap',
                }}>
                  Planned for future release
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* ── FOOTER CTA ── */}
        <div style={{ padding: '14px 20px', borderTop: '0.75px solid rgba(15,23,42,0.10)', flexShrink: 0, background: '#FFFFFF' }}>
          {epicCount === 0 ? (
            <button onClick={() => onGenerate('epics')} style={{
              width: '100%', height: 40, fontSize: 14, fontWeight: 600, borderRadius: 6,
              border: 'none', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", boxShadow: '0 1px 3px rgba(37,99,235,0.35)',
            }}>
              Generate Epics for this BRD
            </button>
          ) : (
            <button onClick={() => { if (brdData.id && onViewDrafts) { onClose(); onViewDrafts(brdData.id); } }} style={{
              width: '100%', height: 40, fontSize: 14, fontWeight: 600, borderRadius: 6,
              border: '0.75px solid rgba(15,23,42,0.15)', background: '#FFFFFF', color: '#374151',
              cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            }}>
              View All Epics →
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes ra-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      display: 'block', fontFamily: "'Inter', sans-serif",
      marginBottom: 0,
    }}>{children}</span>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <span style={{ width: 100, fontSize: 12, color: '#94A3B8', flexShrink: 0, fontFamily: "'Inter', sans-serif", paddingTop: 2 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
