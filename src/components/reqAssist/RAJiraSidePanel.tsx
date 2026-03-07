import { useEffect, useState } from 'react';
import { X, ExternalLink, FileText, Layers, BookOpen, TestTube, Copy, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { RADocumentWithArtifacts } from '@/types/reqAssistV2';
import { format } from 'date-fns';

interface Props {
  doc: RADocumentWithArtifacts;
  onClose: () => void;
  onOpenPdf: () => void;
  onGenerate: (type: string) => void;
  onViewDrafts?: (brdId: string) => void;
  onSyncKb?: (docId: string) => void;
}

interface PipelineState {
  imported: boolean;
  processed: boolean;
  indexed: boolean;
  epicsGenerated: boolean;
  published: boolean;
  brdId: string | null;
  rawText: string | null;
  epicCount: number;
  chunkCount: number;
  publishedCount: number;
}

export default function RAJiraSidePanel({ doc, onClose, onOpenPdf, onGenerate, onViewDrafts, onSyncKb }: Props) {
  const [pipeline, setPipeline] = useState<PipelineState>({
    imported: true, processed: false, indexed: false,
    epicsGenerated: false, published: false, brdId: null,
    rawText: null, epicCount: 0, chunkCount: 0, publishedCount: 0,
  });
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load pipeline state from DB
  useEffect(() => {
    const load = async () => {
      const jiraKey = (doc as any).jira_ticket_key;
      let brdId: string | null = null;
      let rawText: string | null = null;
      let pipelineStage: string | null = null;
      let kbSynced = false;

      // Resolve brd_documents entry
      const { data: direct } = await (supabase as any).from('brd_documents').select('id, raw_text, pipeline_stage, kb_synced').eq('id', doc.id).maybeSingle();
      if (direct?.id) {
        brdId = direct.id;
        rawText = direct.raw_text;
        pipelineStage = direct.pipeline_stage;
        kbSynced = direct.kb_synced === true;
      }
      if (!brdId && jiraKey) {
        const { data: jiraMatch } = await (supabase as any).from('brd_documents').select('id, raw_text, pipeline_stage, kb_synced').eq('jira_key', jiraKey).maybeSingle();
        if (jiraMatch?.id) {
          brdId = jiraMatch.id;
          rawText = jiraMatch.raw_text;
          pipelineStage = jiraMatch.pipeline_stage;
          kbSynced = jiraMatch.kb_synced === true;
        }
      }

      let epicCount = 0;
      let publishedCount = 0;
      let chunkCount = 0;

      if (brdId) {
        const { count: ec } = await (supabase as any).from('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', brdId);
        epicCount = ec ?? 0;

        const { count: pc } = await (supabase as any).from('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', brdId).eq('publish_status', 'published');
        publishedCount = pc ?? 0;

        // Chunk count from kb_embeddings
        const { count: cc } = await (supabase as any).from('kb_embeddings').select('id', { count: 'exact', head: true }).eq('source_id', brdId);
        chunkCount = cc ?? 0;
      }

      // Fallback chunk count from doc
      if (chunkCount === 0 && doc.wikihub_chunk_count) {
        chunkCount = doc.wikihub_chunk_count;
      }

      setPipeline({
        imported: true,
        processed: pipelineStage === 'ready' || pipelineStage === 'complete',
        indexed: kbSynced || doc.kb_synced === true,
        epicsGenerated: epicCount > 0,
        published: publishedCount > 0,
        brdId,
        rawText,
        epicCount,
        chunkCount,
        publishedCount,
      });
    };
    load();
  }, [doc]);

  const handleCopy = () => {
    if (pipeline.rawText) {
      navigator.clipboard.writeText(pipeline.rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Determine smart CTA
  const getSmartCTA = () => {
    if (!pipeline.epicsGenerated) return { label: '✦ Generate Epics for this BRD', primary: true, action: () => onGenerate('epics') };
    if (pipeline.epicsGenerated && !pipeline.published) return { label: 'Publish Epics to Project →', primary: true, action: () => { if (pipeline.brdId && onViewDrafts) onViewDrafts(pipeline.brdId); } };
    if (pipeline.published && !pipeline.indexed) return { label: 'Sync to Knowledge Base →', primary: true, action: () => { if (onSyncKb) onSyncKb(doc.id); } };
    return { label: '✦ Regenerate Artifacts', primary: false, action: () => onGenerate('epics') };
  };

  const cta = getSmartCTA();

  const STEPS = [
    { label: 'Imported', done: pipeline.imported },
    { label: 'Processed', done: pipeline.processed },
    { label: 'Indexed', done: pipeline.indexed },
    { label: 'Epics Generated', done: pipeline.epicsGenerated },
    { label: 'Published', done: pipeline.published },
  ];

  // Determine active step (first not-done)
  const activeIdx = STEPS.findIndex(s => !s.done);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 48, right: 0, bottom: 0, width: 480,
        background: '#FFFFFF', zIndex: 50, display: 'flex', flexDirection: 'column',
        borderLeft: '0.75px solid #E2E8F0', animation: 'ra-slide-left 200ms ease-out',
      }}>
        {/* HEADER */}
        <div style={{ padding: '16px 20px', borderBottom: '0.75px solid #E2E8F0', flexShrink: 0 }}>
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
              <X size={20} color="#64748B" />
            </button>
          </div>
        </div>

        {/* SECTION 1 — Pipeline Status Banner */}
        <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '0.75px solid #E2E8F0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            {STEPS.map((step, i) => {
              const isDone = step.done;
              const isActive = i === activeIdx;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: isDone ? '#16A34A' : isActive ? '#2563EB' : '#E2E8F0',
                      border: isDone || isActive ? 'none' : '1.5px solid #CBD5E1',
                      animation: isActive ? 'ra-pulse 1.5s ease-in-out infinite' : undefined,
                    }} />
                    <span style={{
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      color: isDone ? '#16A34A' : isActive ? '#2563EB' : '#94A3B8',
                      fontFamily: "'Inter', sans-serif",
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}>{step.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 20, height: 1.5,
                      background: STEPS[i + 1].done || (i + 1 === activeIdx) ? '#16A34A' : '#E2E8F0',
                      flexShrink: 0, marginTop: -14,
                    }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* BODY — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>

          {/* SECTION 2 — Document Content */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <SectionHeader>Document Content</SectionHeader>
              {pipeline.rawText && (
                <button onClick={handleCopy} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                  {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} color="#94A3B8" />}
                </button>
              )}
            </div>
            {pipeline.rawText ? (
              <>
                <div style={{
                  padding: 12, background: '#F8FAFC', border: '0.75px solid #E2E8F0', borderRadius: 4,
                  maxHeight: expanded ? 'none' : 120, overflowY: expanded ? 'auto' : 'hidden',
                  fontSize: 13, color: '#475569', lineHeight: 1.6, fontFamily: "'Inter', sans-serif",
                }}>
                  {expanded ? pipeline.rawText : pipeline.rawText.slice(0, 400) + (pipeline.rawText.length > 400 ? '...' : '')}
                </div>
                {pipeline.rawText.length > 400 && (
                  <button onClick={() => setExpanded(!expanded)} style={{
                    border: 'none', background: 'transparent', cursor: 'pointer',
                    fontSize: 12, color: '#2563EB', fontWeight: 500, padding: '4px 0', fontFamily: "'Inter', sans-serif",
                  }}>
                    {expanded ? 'Show less' : 'Show full document →'}
                  </button>
                )}
              </>
            ) : (
              <div>
                <p style={{ fontSize: 13, color: '#94A3B8', margin: '0 0 8px', fontFamily: "'Inter', sans-serif" }}>
                  Content not yet extracted.
                </p>
                <button onClick={() => onGenerate('extract')} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '6px 12px', fontSize: 13, fontWeight: 500, borderRadius: 4,
                  border: '0.75px solid #E2E8F0', background: '#FFFFFF', color: '#475569',
                  cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}>
                  Extract from PDF
                </button>
              </div>
            )}
          </div>

          {/* SECTION 3 — Generated Artifacts */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader style={{ marginBottom: 8 }}>Generated Artifacts</SectionHeader>

            {/* Epics */}
            <ArtifactRow
              icon={<Layers size={16} color="#7C3AED" />}
              label="Epics"
              count={pipeline.epicCount}
              badge={pipeline.epicCount > 0
                ? { bg: '#EDE9FE', color: '#5B21B6', text: `${pipeline.epicCount} generated` }
                : { bg: '#DFE1E6', color: '#253858', text: 'None yet' }
              }
              action={pipeline.epicCount > 0
                ? { label: 'View Drafts →', onClick: () => { if (pipeline.brdId && onViewDrafts) { onClose(); onViewDrafts(pipeline.brdId); } } }
                : { label: 'Generate Epics →', onClick: () => onGenerate('epics') }
              }
              borderBottom
            />

            {/* Wiki Chunks */}
            <ArtifactRow
              icon={<BookOpen size={16} color="#0D9488" />}
              label="Wiki Chunks"
              count={pipeline.chunkCount}
              badge={pipeline.chunkCount > 0
                ? { bg: '#CCFBF1', color: '#0F766E', text: `${pipeline.chunkCount} indexed` }
                : { bg: '#DFE1E6', color: '#253858', text: 'Not indexed' }
              }
              action={pipeline.chunkCount > 0
                ? { label: 'View in WikiHub →', onClick: () => { window.location.href = `/wiki?filter=source:${doc.jira_ticket_key}`; } }
                : { label: 'Sync to KB →', onClick: () => { if (onSyncKb) onSyncKb(doc.id); } }
              }
              borderBottom
            />

            {/* UAT Cases */}
            <ArtifactRow
              icon={<TestTube size={16} color="#64748B" />}
              label="UAT Cases"
              count={0}
              badge={{ bg: '#DFE1E6', color: '#253858', text: 'Not generated' }}
              action={{ label: 'Coming soon', onClick: () => {}, disabled: true }}
              borderBottom={false}
            />
          </div>

          {/* SECTION 4 — PDF Attachment (conditional) */}
          {doc.pdf_url && (
            <div style={{ marginBottom: 20 }}>
              <SectionHeader style={{ marginBottom: 8 }}>PDF Attachment</SectionHeader>
              <button onClick={onOpenPdf} style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
                borderRadius: 6, border: '0.75px solid #E2E8F0', background: '#FFFFFF', cursor: 'pointer', textAlign: 'left' as const,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 6, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color="#DC2626" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>{doc.jira_ticket_key}.pdf</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>
                    {doc.page_count ? `${doc.page_count} pages` : 'PDF'} · {doc.language === 'ar' ? 'AR' : 'EN'}
                  </div>
                </div>
                <ExternalLink size={14} color="#2563EB" />
              </button>
            </div>
          )}

          {/* SECTION 5 — Jira Metadata (only show fields with real data) */}
          <div style={{ marginBottom: 20 }}>
            <SectionHeader style={{ marginBottom: 10 }}>Jira Metadata</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {doc.jira_ticket_key && (
                <MetaRow label="Jira Ticket">
                  {doc.jira_ticket_url ? (
                    <a href={doc.jira_ticket_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 13, fontWeight: 500, color: '#2563EB', textDecoration: 'none', fontFamily: "'Inter', sans-serif" }}>
                      {doc.jira_ticket_key} <ExternalLink size={11} style={{ verticalAlign: 'middle' }} />
                    </a>
                  ) : (
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#475569', fontFamily: "'Inter', sans-serif" }}>{doc.jira_ticket_key}</span>
                  )}
                </MetaRow>
              )}
              {(doc as any).priority && (
                <MetaRow label="Priority">
                  <span style={{ fontSize: 13, color: '#475569', fontFamily: "'Inter', sans-serif" }}>{(doc as any).priority}</span>
                </MetaRow>
              )}
              {(doc as any).reporter && (
                <MetaRow label="Reporter">
                  <span style={{ fontSize: 13, color: '#475569', fontFamily: "'Inter', sans-serif" }}>{(doc as any).reporter}</span>
                </MetaRow>
              )}
              {doc.jira_created_at && (
                <MetaRow label="Created">
                  <span style={{ fontSize: 13, color: '#475569', fontFamily: "'Inter', sans-serif" }}>{format(new Date(doc.jira_created_at), 'd MMM yyyy')}</span>
                </MetaRow>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 6 — Footer CTA */}
        <div style={{ padding: '12px 20px', borderTop: '0.75px solid #E2E8F0', flexShrink: 0 }}>
          <button onClick={cta.action} style={{
            width: '100%', height: 44, fontSize: 13, fontWeight: 600, borderRadius: 4,
            border: cta.primary ? 'none' : '0.75px solid #E2E8F0',
            background: cta.primary ? '#2563EB' : '#FFFFFF',
            color: cta.primary ? '#FFFFFF' : '#475569',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif",
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            {cta.label}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes ra-slide-left { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes ra-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </>
  );
}

/* ── Helpers ── */

function SectionHeader({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '0.08em',
      display: 'block', fontFamily: "'Inter', sans-serif",
      ...style,
    }}>{children}</span>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <span style={{ width: 100, fontSize: 12, color: '#94A3B8', flexShrink: 0, fontFamily: "'Inter', sans-serif" }}>{label}</span>
      {children}
    </div>
  );
}

function ArtifactRow({ icon, label, badge, action, borderBottom }: {
  icon: React.ReactNode;
  label: string;
  count: number;
  badge: { bg: string; color: string; text: string };
  action: { label: string; onClick: () => void; disabled?: boolean };
  borderBottom: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, height: 40,
      borderBottom: borderBottom ? '0.75px solid #F1F5F9' : 'none',
    }}>
      {icon}
      <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: "'Inter', sans-serif", minWidth: 80 }}>{label}</span>
      <span style={{
        display: 'inline-flex', alignItems: 'center', padding: '1px 6px', borderRadius: 3,
        fontSize: 11, fontWeight: 700, background: badge.bg, color: badge.color,
        fontFamily: "'Inter', sans-serif",
      }}>{badge.text}</span>
      <button
        onClick={action.onClick}
        disabled={action.disabled}
        style={{
          marginLeft: 'auto', border: 'none', background: 'transparent', cursor: action.disabled ? 'default' : 'pointer',
          fontSize: 13, fontWeight: 500, color: action.disabled ? '#94A3B8' : '#2563EB',
          fontFamily: "'Inter', sans-serif", padding: 0,
        }}
      >
        {action.label}
      </button>
    </div>
  );
}
