import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Zap, BookOpen, TestTube, Copy, Check, Paperclip, ArrowDownToLine, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { formatTimestamp } from '@/lib/formatTimestamp';

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

      // Step 1 — resolve brd_id via jira_key
      const { data: brdRow } = await (supabase as any)
        .from('brd_documents')
        .select('id, pipeline_stage, raw_text')
        .eq('jira_key', jiraKey)
        .maybeSingle();

      if (!brdRow?.id) {
        setBrdData({ id: null, pipeline_stage: null, raw_text: null, epicCount: 0, wikiCount: 0, publishedCount: 0 });
        return;
      }

      // Step 2 — count epics
      const { count: epicCount } = await (supabase as any)
        .from('brd_epics')
        .select('id', { count: 'exact', head: true })
        .eq('brd_id', brdRow.id);

      // Step 2b — count published epics (ra_tag IS NOT NULL)
      const { count: publishedCount } = await (supabase as any)
        .from('brd_epics')
        .select('id', { count: 'exact', head: true })
        .eq('brd_id', brdRow.id)
        .not('ra_tag', 'is', null);

      // Step 3 — count wiki chunks
      const { count: wikiCount } = await (supabase as any)
        .from('kb_embeddings')
        .select('id', { count: 'exact', head: true })
        .eq('source_id', brdRow.id);

      // Fallback wiki count
      let finalWikiCount = wikiCount ?? 0;
      if (finalWikiCount === 0 && doc.wikihub_chunk_count) {
        finalWikiCount = doc.wikihub_chunk_count;
      }

      setBrdData({
        id: brdRow.id,
        pipeline_stage: brdRow.pipeline_stage,
        raw_text: brdRow.raw_text,
        epicCount: epicCount ?? 0,
        wikiCount: finalWikiCount,
        publishedCount: publishedCount ?? 0,
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

  // Pipeline stepper logic
  const stage = brdData.pipeline_stage;
  const steps = [
    {
      label: 'Imported',
      state: 'complete' as const, // always complete if ra_documents row exists
    },
    {
      label: 'Processed',
      state: (stage && ['extract', 'process', 'validate', 'distribute', 'complete'].includes(stage))
        ? 'complete' as const : (stage === 'intake' ? 'active' as const : 'pending' as const),
    },
    {
      label: 'Indexed',
      state: (stage && ['validate', 'distribute', 'complete'].includes(stage)) || brdData.wikiCount > 0
        ? 'complete' as const : 'pending' as const,
    },
    {
      label: 'Epics',
      state: brdData.epicCount > 0 ? 'complete' as const : 'pending' as const,
    },
    {
      label: 'Published',
      state: brdData.epicCount > 0 && brdData.publishedCount > 0 ? 'complete' as const : 'pending' as const,
    },
  ];

  // Determine active step (first pending becomes active)
  const activeIdx = steps.findIndex(s => s.state === 'pending');
  const computedSteps = steps.map((s, i) => ({
    ...s,
    state: s.state === 'pending' && i === activeIdx ? 'active' as const : s.state,
  }));

  // Status lozenge from pipeline_stage
  const getStageLozenge = () => {
    if (!stage) return { bg: '#DFE1E6', color: '#253858', label: 'PENDING' };
    if (stage === 'complete') return { bg: '#E3FCEF', color: '#006644', label: 'COMPLETE' };
    if (stage === 'failed') return { bg: '#DFE1E6', color: '#253858', label: 'FAILED' };
    // intake, extract, process, validate, distribute → BLUE
    return { bg: '#DEEBFF', color: '#0747A6', label: stage.toUpperCase() };
  };
  const lozenge = getStageLozenge();

  const description = (doc as any).description || doc.content_raw || null;
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
            <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 4 }}>
              <X size={18} color="#64748B" />
            </button>
          </div>
          <h3 style={{
            fontSize: 17, fontWeight: 700, color: '#0F172A', margin: '6px 0 0', fontFamily: "'Sora', sans-serif",
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
          }}>{doc.title}</h3>
          <div style={{ marginTop: 8 }}>
            <span style={{
              display: 'inline-block', padding: '0 6px', borderRadius: 3, height: 20,
              lineHeight: '20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: lozenge.bg, color: lozenge.color, fontFamily: "'Inter', sans-serif",
            }}>{lozenge.label}</span>
          </div>
        </div>

        {/* ── BODY (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── PIPELINE STEPPER ── */}
          <div style={{ padding: '16px 20px', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
            <div style={{
              background: '#FAFAFA', border: '0.75px solid rgba(15,23,42,0.08)', borderRadius: 8,
              padding: '14px 20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {computedSteps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step.state === 'complete' ? '#16A34A' : step.state === 'active' ? '#2563EB' : 'transparent',
                        border: step.state === 'pending' ? '1.5px solid #CBD5E1' : 'none',
                      }}>
                        {step.state === 'complete' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        {step.state === 'active' && (
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'white' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif",
                        fontWeight: step.state === 'active' ? 600 : 500,
                        color: step.state === 'complete' ? '#16A34A' : step.state === 'active' ? '#2563EB' : '#94A3B8',
                      }}>{step.label}</span>
                    </div>
                    {i < computedSteps.length - 1 && (
                      <div style={{
                        flex: 1, height: 0, marginTop: -16,
                        borderTop: step.state === 'complete' && computedSteps[i + 1].state !== 'pending'
                          ? '1.5px solid #16A34A'
                          : '1.5px dashed #E5E7EB',
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
              <MetaRow label="Description">
                {description ? (
                  <div style={{ flex: 1 }}>
                    <div style={{
                      background: '#F8FAFC', border: '0.75px solid rgba(15,23,42,0.08)', borderRadius: 6,
                      padding: '10px 12px', fontSize: 13, color: '#374151', lineHeight: 1.6,
                      fontFamily: "'Inter', sans-serif",
                      display: '-webkit-box', WebkitLineClamp: descExpanded ? 999 : 4,
                      WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
                    }}>
                      {description}
                    </div>
                    {descTruncated && (
                      <button onClick={() => setDescExpanded(!descExpanded)} style={{
                        border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px 0',
                        fontSize: 12, fontWeight: 500, color: '#2563EB', fontFamily: "'Inter', sans-serif",
                        display: 'flex', alignItems: 'center', gap: 4,
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

              {/* Epics Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={16} color="#7C3AED" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>Epics</span>
                {brdData.epicCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 10,
                    background: '#7C3AED', color: 'white', fontSize: 11, fontWeight: 700,
                    fontFamily: "'Inter', sans-serif",
                  }}>{brdData.epicCount} generated</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 10,
                    background: '#F1F5F9', color: '#64748B', border: '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                  }}>None yet</span>
                )}
                <button
                  onClick={() => {
                    if (brdData.epicCount > 0 && brdData.id && onViewDrafts) {
                      onClose();
                      onViewDrafts(brdData.id);
                    } else {
                      onGenerate('epics');
                    }
                  }}
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                    color: brdData.epicCount > 0 ? '#7C3AED' : '#2563EB',
                  }}
                >
                  {brdData.epicCount > 0 ? 'View Drafts →' : 'Generate Epics →'}
                </button>
              </div>

              {/* Wiki Chunks Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '0.75px solid rgba(15,23,42,0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={16} color="#0D9488" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>Wiki Chunks</span>
                {brdData.wikiCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 10,
                    background: '#CCFBF1', color: '#0F766E', border: '0.75px solid #99F6E4',
                    fontSize: 11, fontWeight: 600, fontFamily: "'Inter', sans-serif",
                  }}>{brdData.wikiCount} indexed</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 10,
                    background: '#F1F5F9', color: '#64748B', border: '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                  }}>Not indexed</span>
                )}
                <button
                  onClick={() => {
                    if (brdData.wikiCount > 0) {
                      navigate(`/wiki?source=${doc.jira_ticket_key}`);
                    } else if (onSyncKb) {
                      onSyncKb(doc.id);
                    }
                  }}
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0,
                    fontSize: 12, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                    color: brdData.wikiCount > 0 ? '#0D9488' : '#2563EB',
                  }}
                >
                  {brdData.wikiCount > 0 ? 'View in WikiHub →' : 'Sync to KB →'}
                </button>
              </div>

              {/* UAT Cases Row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <TestTube size={16} color="#64748B" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>UAT Cases</span>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', padding: '1px 8px', borderRadius: 10,
                  background: '#F1F5F9', color: '#94A3B8',
                  fontSize: 11, fontWeight: 500, fontFamily: "'Inter', sans-serif",
                }}>Not generated</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#CBD5E1', fontFamily: "'Inter', sans-serif" }}>
                  UAT generation coming in a future release
                </span>
              </div>

            </div>
          </div>
        </div>

        {/* ── FOOTER CTA ── */}
        <div style={{ padding: '14px 20px', borderTop: '0.75px solid rgba(15,23,42,0.10)', flexShrink: 0, background: '#FFFFFF' }}>
          {brdData.epicCount === 0 ? (
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
      `}</style>
    </>
  );
}

/* ── Helpers ── */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: '#64748B',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      display: 'block', fontFamily: "'Inter', sans-serif",
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
