import { useEffect, useState, useRef } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Zap, BookOpen, FlaskConical, Copy, Check, Paperclip, ArrowDownToLine, ExternalLink, Loader2, FileUp, ChevronRight, RefreshCw } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
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
  uatCount: number;
  parentJiraKey: string | null;
  ticketType: string | null;
  rawTextSource: string | null;
}

// D13: Pluralisation helper
const pluralise = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

// D07: Domain derivation from jira_ticket_key prefix
function deriveDomain(jiraKey: string | null | undefined, docDomain: string | null | undefined): string | null {
  if (docDomain) return docDomain;
  if (!jiraKey) return null;
  const prefix = jiraKey.split('-')[0]?.toUpperCase();
  const map: Record<string, string> = {
    'MDT': 'Ministry Digital Transformation',
    'SEN': 'Senaei Platform',
    'SIMP': 'Industrial Monitoring',
  };
  return map[prefix] || null;
}

export default function RAJiraSidePanel({ doc, onClose, onOpenPdf, onGenerate, onViewDrafts, onSyncKb }: Props) {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [brdData, setBrdData] = useState<BrdData>({
    id: null, pipeline_stage: null, raw_text: null,
    epicCount: 0, wikiCount: 0, publishedCount: 0, uatCount: 0,
    parentJiraKey: null, ticketType: null, rawTextSource: null,
  });
  const [contentExpanded, setContentExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [generatingUat, setGeneratingUat] = useState(false);
  const [uatScenarios, setUatScenarios] = useState<any[]>([]);
  const [showUatPanel, setShowUatPanel] = useState(false);
  // D08: PDF upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [reimporting, setReimporting] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load BRD data chain
  useEffect(() => {
    const load = async () => {
      const jiraKey = doc.jira_ticket_key;
      if (!jiraKey) return;

      const { data: brdRow } = await typedQuery('brd_documents')
        .select('id, pipeline_stage, raw_text, parent_jira_key, ticket_type, raw_text_source')
        .eq('jira_key', jiraKey)
        .maybeSingle();

      if (!brdRow?.id) {
        setBrdData({ id: null, pipeline_stage: null, raw_text: null, epicCount: 0, wikiCount: 0, publishedCount: 0, uatCount: 0, parentJiraKey: null, ticketType: null, rawTextSource: null });
        return;
      }

      const [epicRes, pubRes, wikiRes, uatRes] = await Promise.all([
        typedQuery('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', brdRow.id),
        typedQuery('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', brdRow.id).not('ra_tag', 'is', null),
        typedQuery('kb_embeddings').select('id', { count: 'exact', head: true }).eq('source_id', brdRow.id),
        typedQuery('brd_uat_scenarios').select('id', { count: 'exact', head: true }).eq('brd_id', brdRow.id),
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
        uatCount: uatRes.count ?? 0,
        parentJiraKey: brdRow.parent_jira_key ?? null,
        ticketType: brdRow.ticket_type ?? null,
        rawTextSource: brdRow.raw_text_source ?? null,
      });

      // Fetch UAT scenarios if they exist
      if ((uatRes.count ?? 0) > 0) {
        const { data: scenarios } = await typedQuery('brd_uat_scenarios')
          .select('*')
          .eq('brd_id', brdRow.id)
          .order('created_at', { ascending: true });
        if (scenarios) setUatScenarios(scenarios);
      }
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

  // D04: Renamed handler + D05: loading state
  const handleIndexToKA = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { data: brdRow, error: brdError } = await typedQuery('brd_documents')
        .select('id')
        .eq('jira_key', doc.jira_ticket_key)
        .maybeSingle();

      if (brdError || !brdRow?.id) {
        toast.error('Could not find BRD document to index');
        setSyncing(false);
        return;
      }

      const { error } = await supabase.functions.invoke('kb-sync', {
        body: { brd_id: brdRow.id, source_type: 'jira_bulk' },
      });

      if (error) {
        toast.error('Indexing failed: ' + error.message);
        setSyncing(false);
        return;
      }

      // Log activity
      await typedQuery('ra_activity_log').insert({
        brd_id: brdRow.id,
        event_type: 'index_start',
        message: `Indexing started for ${doc.jira_ticket_key}`,
      });

      toast.success('Indexing started — documents will be searchable shortly');
    } catch (err) {
      toast.error('Indexing failed. Please try again.');
      console.error('[IndexToKA]', err);
    } finally {
      setSyncing(false);
    }
  };

  // D06: Generate UAT scenarios
  const handleGenerateUAT = async () => {
    if (!brdData.id || !brdData.raw_text) {
      toast.error('No BRD content to generate UAT scenarios from');
      return;
    }
    setGeneratingUat(true);
    try {
      // Generate simple UAT scenarios from BRD content
      const scenarios = generateUATFromText(brdData.raw_text, doc.jira_ticket_key);
      
      const inserts = scenarios.map((s, i) => ({
        brd_id: brdData.id!,
        scenario_key: `${doc.jira_ticket_key}-UAT-${String(i + 1).padStart(2, '0')}`,
        title: s.title,
        steps: s.steps,
        expected_result: s.expected_result,
        status: 'draft',
      }));

      const { error } = await typedQuery('brd_uat_scenarios').insert(inserts);
      if (error) throw error;

      // Log activity
      await typedQuery('ra_activity_log').insert({
        brd_id: brdData.id,
        event_type: 'uat_generated',
        message: `UAT scenarios generated for ${doc.jira_ticket_key}`,
      });

      setBrdData(prev => ({ ...prev, uatCount: inserts.length }));
      setUatScenarios(inserts.map((s, i) => ({ ...s, id: `temp-${i}` })));
      toast.success(`Generated ${inserts.length} UAT scenarios`);
    } catch (err: any) {
      toast.error('UAT generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingUat(false);
    }
  };

  // D08: PDF upload handler
  const handlePdfUpload = async (file: File) => {
    if (!brdData.id) {
      toast.error('BRD document not found — cannot attach PDF');
      return;
    }
    setUploadingPdf(true);
    try {
      const path = `${brdData.id}/source.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from('brd-attachments')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('brd-attachments').getPublicUrl(path);
      
      await typedQuery('brd_documents').update({ pdf_url: urlData.publicUrl }).eq('id', brdData.id);
      toast.success('PDF attached successfully');
    } catch (err: any) {
      toast.error('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploadingPdf(false);
    }
  };

  // Pipeline stepper logic
  const stage = brdData.pipeline_stage;
  const { epicCount, wikiCount, publishedCount, uatCount } = brdData;

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

  const getStageLozenge = () => {
    if (!stage) return { bg: '#DFE1E6', color: '#42526E', label: 'PENDING' };
    if (stage === 'complete') return { bg: '#1B7F37', color: '#FFFFFF', label: 'COMPLETE' };
    if (stage === 'failed') return { bg: '#DFE1E6', color: '#42526E', label: 'FAILED' };
    return { bg: '#0C66E4', color: '#FFFFFF', label: stage.toUpperCase() };
  };
  const lozenge = getStageLozenge();

  const description =
    (doc as any).description || (doc as any).summary || (doc as any).body || (doc as any).content_raw
    || (brdData.raw_text ? brdData.raw_text.substring(0, 300) + (brdData.raw_text.length > 300 ? '…' : '') : null)
    || null;
  const descTruncated = description && description.length > 300;

  const domain = deriveDomain(doc.jira_ticket_key, doc.domain);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: isDark ? 'rgba(0,0,0,0.50)' : 'rgba(0,0,0,0.3)', zIndex: 40 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
        background: 'var(--cp-float)', zIndex: 50, display: 'flex', flexDirection: 'column',
        borderLeft: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.12)',
        boxShadow: isDark ? '-4px 0 24px rgba(0,0,0,0.30)' : '-4px 0 24px rgba(15,23,42,0.08)',
        animation: 'ra-slide-left 200ms ease-out',
      }}>
        {/* ── HEADER ── */}
        <div style={{ padding: '16px 20px 14px', borderBottom: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.10)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <a
                href={doc.jira_ticket_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--cp-primary-5)', border: isDark ? '0.75px solid rgba(37,99,235,0.30)' : '0.75px solid #BFDBFE', borderRadius: 4,
                  padding: '2px 8px', textDecoration: 'none', cursor: doc.jira_ticket_url ? 'pointer' : 'default',
                }}
              >
                <span style={{ fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)' }}>
                  {doc.jira_ticket_key}
                </span>
                {doc.jira_ticket_url && <ExternalLink size={11} color="var(--cp-blue)" />}
              </a>
              <TicketTypeBadgeDrawer type={brdData.ticketType} />
            </div>
            <button onClick={onClose} style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <X size={16} color="var(--fg-3)" />
            </button>
          </div>
          <h3 style={{
            fontSize: 18, fontWeight: 700, color: 'var(--fg-1)', margin: '10px 0 0', fontFamily: 'var(--ds-font-family-heading)',
            lineHeight: 1.3,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
          }}>{doc.title}</h3>
          {/* HL-01: Parent hierarchy breadcrumb */}
          {brdData.parentJiraKey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-4)', marginTop: 2, fontFamily: 'var(--ds-font-family-body)' }}>
              <span
                style={{ color: 'var(--cp-blue)', cursor: 'pointer' }}
                onClick={() => {
                  // Try to open parent drawer or Jira URL
                  const prefix = brdData.parentJiraKey!.split('-')[0];
                  window.open(`https://jira.example.com/browse/${brdData.parentJiraKey}`, '_blank');
                }}
              >{brdData.parentJiraKey}</span>
              <ChevronRight size={10} color="#CBD5E1" />
              <span style={{ color: 'var(--fg-2)', fontWeight: 600 }}>{doc.jira_ticket_key}</span>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', padding: '0 6px', borderRadius: 4, height: 20,
              lineHeight: '20px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              background: lozenge.bg, color: lozenge.color, fontFamily: 'var(--ds-font-family-body)',
            }}>{lozenge.label}</span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#CBD5E1', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>
              Imported {formatTimestamp(doc.created_at)}
            </span>
          </div>
        </div>

        {/* ── Warning: title_only content ── */}
        {brdData.rawTextSource === 'title_only' && (
          <div style={{
            margin: '0 20px', marginTop: 12, padding: '8px 12px', borderRadius: 6,
            background: isDark ? 'rgba(217,119,6,0.10)' : '#FFFBEB', border: isDark ? '0.75px solid rgba(217,119,6,0.25)' : '0.75px solid #FDE68A',
            fontSize: 12, color: isDark ? '#FBBF24' : '#92400E', fontFamily: 'var(--ds-font-family-body)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            ⚠ No BRD content found — attach PDF for accurate epic generation
          </div>
        )}

        {/* ── Re-import from Jira button ── */}
        {brdData.id && (
          <div style={{ padding: '8px 20px 0' }}>
            <button
              onClick={async () => {
                if (reimporting) return;
                setReimporting(true);
                try {
                  const { data, error } = await supabase.functions.invoke('ra-jira-proxy', {
                    body: { action: 'import_single', payload: { issueKey: doc.jira_ticket_key, brdId: brdData.id } },
                  });
                  if (error) throw error;
                  if (data?.error) throw new Error(data.message || data.error);
                  toast.success(`Re-imported ${doc.jira_ticket_key} (source: ${data.raw_text_source}${data.pdf_attached ? ', PDF attached' : ''})`);
                  // Reload brd data
                  const { data: brdRow } = await typedQuery('brd_documents')
                    .select('id, pipeline_stage, raw_text, parent_jira_key, ticket_type, raw_text_source')
                    .eq('jira_key', doc.jira_ticket_key)
                    .maybeSingle();
                  if (brdRow) {
                    setBrdData(prev => ({
                      ...prev,
                      raw_text: brdRow.raw_text,
                      parentJiraKey: brdRow.parent_jira_key ?? null,
                      ticketType: brdRow.ticket_type ?? null,
                      rawTextSource: brdRow.raw_text_source ?? null,
                    }));
                  }
                } catch (err: any) {
                  toast.error('Re-import failed: ' + (err.message || 'Unknown error'));
                } finally {
                  setReimporting(false);
                }
              }}
              disabled={reimporting}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 12px', height: 28, borderRadius: 6,
                border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.15)', background: isDark ? '#1A1A1A' : 'var(--bg-app)',
                fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', cursor: reimporting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--ds-font-family-body)', opacity: reimporting ? 0.6 : 1,
              }}
            >
              {reimporting ? <Loader2 size={13} color="var(--fg-4)" style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={13} color="var(--fg-4)" />}
              {reimporting ? 'Re-importing…' : 'Re-import from Jira'}
            </button>
          </div>
        )}

        {/* ── BODY (scrollable) ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* ── PIPELINE STEPPER ── */}
          <div style={{ padding: '16px 20px', borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)' }}>
            <div style={{
              background: isDark ? '#1A1A1A' : 'var(--bg-1)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.08)', borderRadius: 8,
              padding: '14px 16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                {stepsRaw.map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: step.state === 'complete' ? 'var(--sem-success)' : step.state === 'active' ? 'var(--cp-blue)' : 'var(--bg-app)',
                        border: step.state === 'pending' ? (isDark ? '1.5px solid #292929' : '1.5px solid #CBD5E1') : 'none',
                      }}>
                        {step.state === 'complete' && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        )}
                        {step.state === 'active' && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: 11, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-family-body)',
                        fontWeight: step.state === 'active' ? 600 : step.state === 'complete' ? 500 : 400,
                        color: step.state === 'complete' ? 'var(--sem-success)' : step.state === 'active' ? 'var(--cp-blue)' : 'var(--fg-4)',
                      }}>{step.label}</span>
                    </div>
                    {i < stepsRaw.length - 1 && (
                      <div style={{
                        flex: 1, height: 0, marginTop: -18,
                        borderTop: step.state === 'complete' && stepsRaw[i + 1].state === 'complete'
                          ? '2px solid #16A34A'
                          : step.state === 'complete'
                            ? (isDark ? '2px dashed #292929' : '2px dashed #CBD5E1')
                            : (isDark ? '2px dashed #1A1A1A' : '2px dashed #E5E7EB'),
                        marginInline: 4,
                      }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── JIRA METADATA ── */}
          <div style={{ padding: '16px 20px', borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)' }}>
            <SectionHeader>Jira Metadata</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <MetaRow label="Ticket">
                <a
                  href={doc.jira_ticket_url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'var(--cp-primary-5)', border: isDark ? '0.75px solid rgba(37,99,235,0.30)' : '0.75px solid #BFDBFE', borderRadius: 4,
                    padding: '1px 8px', textDecoration: 'none',
                    fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)',
                    cursor: doc.jira_ticket_url ? 'pointer' : 'default',
                  }}
                >
                  {doc.jira_ticket_key}
                </a>
              </MetaRow>
              <MetaRow label="Title">
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-body)' }}>{doc.title}</span>
              </MetaRow>
              {description && (
                <MetaRow label="Description">
                  <div style={{ flex: 1 }}>
                    <div style={{
                      background: isDark ? '#1A1A1A' : 'var(--bg-1)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.08)', borderRadius: 6,
                      padding: '10px 12px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6,
                      fontFamily: 'var(--ds-font-family-body)',
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
                        fontSize: 11, fontWeight: 500, color: 'var(--cp-blue)', fontFamily: 'var(--ds-font-family-body)',
                      }}>
                        {descExpanded ? 'Show less' : 'Show more'}
                      </button>
                    )}
                  </div>
                </MetaRow>
              )}
              <MetaRow label="Imported">
                <span style={{ fontSize: 12, color: 'var(--fg-3)', fontFamily: 'var(--ds-font-family-body)' }}>
                  {formatTimestamp(doc.created_at)}
                </span>
              </MetaRow>
              {/* D07: Domain populated */}
              <MetaRow label="Domain">
                <span style={{ fontSize: 13, color: domain ? 'var(--fg-2)' : 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>
                  {domain || (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '1px 6px',
                      background: isDark ? '#1A1A1A' : '#F1F5F9', borderRadius: 4, fontSize: 11, color: 'var(--fg-4)',
                      fontFamily: 'var(--ds-font-family-body)',
                    }}>Uncategorised</span>
                  )}
                </span>
              </MetaRow>
              {/* D08/B2: Source PDF in metadata — signed URL */}
              <MetaRow label="Source PDF">
                {doc.pdf_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      onClick={async () => {
                        const path = doc.pdf_url!;
                        const { data } = await supabase.storage.from('brd-attachments').createSignedUrl(path, 3600);
                        if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                      }}
                      style={{
                        fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)', background: 'transparent',
                        border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'var(--ds-font-family-body)',
                        display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      <FileText size={12} color="var(--cp-blue)" />
                      {(doc as any).pdf_filename || 'source.pdf'}
                    </button>
                    {(doc as any).pdf_attached_at && (
                      <span style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>
                        Attached {formatTimestamp((doc as any).pdf_attached_at)}
                      </span>
                    )}
                  </div>
                ) : (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPdf} style={{
                      fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', background: 'transparent',
                      border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid #CBD5E1', borderRadius: 6, cursor: 'pointer', padding: '4px 10px',
                      fontFamily: 'var(--ds-font-family-body)',
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                    }}>
                      {uploadingPdf ? <Loader2 size={14} color="var(--fg-4)" style={{ animation: 'spin 1s linear infinite' }} /> : <FileUp size={14} color="var(--fg-4)" />}
                      {uploadingPdf ? 'Uploading...' : 'Attach PDF'}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      style={{ display: 'none' }}
                      onChange={e => { if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]); }}
                    />
                  </>
                )}
              </MetaRow>
            </div>
          </div>

          {/* ── SOURCE ATTACHMENTS ── */}
          <div style={{ padding: '16px 20px', borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)' }}>
            <SectionHeader>Source Attachments</SectionHeader>
            <div style={{ marginTop: 10 }}>
              {doc.pdf_url ? (
                <div style={{
                  height: 48, display: 'flex', alignItems: 'center', gap: 12,
                  background: isDark ? '#1A1A1A' : 'var(--bg-app)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.10)',
                  borderRadius: 6, padding: '0 14px',
                }}>
                  <FileText size={18} color="var(--sem-danger)" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-body)' }}>
                      {doc.jira_ticket_key}.pdf
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>
                      {doc.page_count ? `${doc.page_count} pages` : 'PDF'} · {doc.language === 'ar' ? 'AR' : 'EN'}
                    </div>
                  </div>
                  <button onClick={onOpenPdf} style={{
                    height: 26, padding: '0 10px', borderRadius: 6,
                    border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.15)', background: isDark ? '#1A1A1A' : 'var(--bg-app)',
                    fontSize: 12, fontWeight: 500, color: 'var(--fg-2)', cursor: 'pointer',
                    fontFamily: 'var(--ds-font-family-body)',
                  }}>View</button>
                  <a href={doc.pdf_url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', color: 'var(--fg-3)' }}>
                    <ArrowDownToLine size={14} />
                  </a>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 4 }}>
                  <Paperclip size={18} color={isDark ? '#292929' : '#CBD5E1'} />
                  <span style={{ fontSize: 13, color: 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>No attachments found</span>
                  <span style={{ fontSize: 11, color: isDark ? '#878787' : '#CBD5E1', fontFamily: 'var(--ds-font-family-body)' }}>Attachments are imported automatically from Jira</span>
                </div>
              )}
            </div>
          </div>

          {/* ── DOCUMENT CONTENT ── */}
          <div style={{ padding: '16px 20px', borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <SectionHeader>Document Content</SectionHeader>
              {brdData.raw_text && (
                <button onClick={handleCopy} style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                  {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} color="var(--fg-4)" />}
                </button>
              )}
            </div>
            <div style={{ marginTop: 10 }}>
              {brdData.raw_text ? (
                <>
                  <div style={{
                    background: isDark ? '#1A1A1A' : 'var(--bg-1)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.08)', borderRadius: 6,
                    padding: '12px 14px', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6,
                    fontFamily: 'var(--ds-font-family-body)',
                    maxHeight: contentExpanded ? 'none' : 120, overflow: 'hidden',
                  }}>
                    {contentExpanded ? brdData.raw_text : brdData.raw_text.slice(0, 400) + (brdData.raw_text.length > 400 ? '…' : '')}
                  </div>
                  {brdData.raw_text.length > 400 && (
                    <button onClick={() => setContentExpanded(!contentExpanded)} style={{
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: 12, color: 'var(--cp-blue)', fontWeight: 500, padding: '4px 0', fontFamily: 'var(--ds-font-family-body)',
                    }}>
                      {contentExpanded ? 'Show less' : 'Show full content'}
                    </button>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0', gap: 6 }}>
                  <FileText size={20} color={isDark ? '#292929' : '#CBD5E1'} />
                  <span style={{ fontSize: 13, color: 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>Content not yet extracted</span>
                  <span style={{ fontSize: 12, color: isDark ? '#878787' : '#CBD5E1', fontFamily: 'var(--ds-font-family-body)' }}>Upload a PDF or extract from Jira attachments</span>
                </div>
              )}
            </div>
          </div>

          {/* ── GENERATED ARTIFACTS ── */}
          <div style={{ padding: '16px 20px' }}>
            <SectionHeader>Generated Artifacts</SectionHeader>
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column' }}>

              {/* Epics Row — ALL BLUE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--cp-primary-5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Zap size={15} color="var(--cp-blue)" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-body)', flexShrink: 0, minWidth: 40 }}>Epics</span>
                {epicCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 12,
                    background: 'var(--cp-primary-5)', border: '0.75px solid #BFDBFE',
                    fontSize: 11, fontWeight: 700, color: '#1D4ED8',
                    fontFamily: 'var(--ds-font-family-body)',
                  }}>{pluralise(epicCount, 'epic', 'epics')} generated</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 12,
                    background: isDark ? '#1A1A1A' : '#F1F5F9', color: 'var(--fg-4)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: 'var(--ds-font-family-body)',
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
                    fontSize: 12, fontWeight: 500, fontFamily: 'var(--ds-font-family-body)',
                    color: 'var(--cp-blue)', whiteSpace: 'nowrap',
                  }}
                >
                  {epicCount > 0 ? 'View Drafts →' : 'Generate Epics →'}
                </button>
              </div>

              {/* Wiki Chunks Row — D04: renamed link */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)' }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: isDark ? 'rgba(13,148,136,0.12)' : '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <BookOpen size={16} color="#0D9488" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-body)', flexShrink: 0, minWidth: 80 }}>Wiki Chunks</span>
                {wikiCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 12,
                    background: isDark ? 'rgba(13,148,136,0.12)' : '#F0FDFA', border: isDark ? '0.75px solid rgba(13,148,136,0.25)' : '0.75px solid #99F6E4',
                    fontSize: 11, fontWeight: 700, color: '#0F766E',
                    fontFamily: 'var(--ds-font-family-body)',
                  }}>{pluralise(wikiCount, 'chunk', 'chunks')} indexed</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 12,
                    background: isDark ? '#1A1A1A' : '#F1F5F9', color: 'var(--fg-4)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: 'var(--ds-font-family-body)',
                  }}>Not indexed</span>
                )}
                <button
                  disabled={syncing}
                  onClick={() => {
                    if (wikiCount > 0) {
                      navigate(`/wiki?source=${doc.jira_ticket_key}`);
                    } else {
                      handleIndexToKA();
                    }
                  }}
                  style={{
                    marginLeft: 'auto', border: 'none', background: 'transparent', cursor: syncing ? 'default' : 'pointer', padding: 0,
                    fontSize: 12, fontWeight: 500, fontFamily: 'var(--ds-font-family-body)',
                    color: 'var(--cp-blue)', whiteSpace: 'nowrap',
                    opacity: syncing ? 0.6 : 1,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}
                >
                  {syncing ? (
                    <>
                      <Loader2 size={12} color="var(--cp-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                      Indexing...
                    </>
                  ) : (
                    wikiCount > 0 ? 'View in WikiHub →' : 'Index to Knowledge Assistant →'
                  )}
                </button>
              </div>

              {/* D06: UAT Scenarios Row — real generate action */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                minHeight: 40, flexWrap: 'nowrap',
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 6, background: isDark ? '#1A1A1A' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FlaskConical size={15} color="var(--fg-3)" />
                </div>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg-1)', fontFamily: 'var(--ds-font-family-body)', whiteSpace: 'nowrap', flexShrink: 0, minWidth: 70 }}>UAT Scenarios</span>
                {uatCount > 0 ? (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 12,
                    background: isDark ? 'rgba(22,163,74,0.12)' : '#F0FDF4', border: isDark ? '0.75px solid rgba(22,163,74,0.25)' : '0.75px solid #BBF7D0',
                    fontSize: 11, fontWeight: 700, color: 'var(--sem-success)',
                    fontFamily: 'var(--ds-font-family-body)',
                  }}>{pluralise(uatCount, 'scenario', 'scenarios')}</span>
                ) : (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 12,
                    background: isDark ? '#1A1A1A' : '#F1F5F9', color: 'var(--fg-4)', border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.12)',
                    fontSize: 11, fontWeight: 500, fontFamily: 'var(--ds-font-family-body)', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>Not generated</span>
                )}
                <button
                  disabled={generatingUat}
                  onClick={() => {
                    if (uatCount > 0) {
                      setShowUatPanel(!showUatPanel);
                    } else {
                      handleGenerateUAT();
                    }
                  }}
                  style={{
                    marginLeft: 'auto', border: uatCount > 0 ? 'none' : '0.75px solid #2563EB',
                    background: 'transparent', cursor: generatingUat ? 'default' : 'pointer', padding: uatCount > 0 ? 0 : '0 10px',
                    fontSize: 12, fontWeight: 500, fontFamily: 'var(--ds-font-family-body)',
                    color: 'var(--cp-blue)', whiteSpace: 'nowrap', height: uatCount > 0 ? 'auto' : 28,
                    borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 4,
                    opacity: generatingUat ? 0.6 : 1,
                  }}
                >
                  {generatingUat ? (
                    <>
                      <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                      Generating...
                    </>
                  ) : uatCount > 0 ? (
                    `${showUatPanel ? 'Hide' : 'View'} →`
                  ) : (
                    'Generate UAT →'
                  )}
                </button>
              </div>

              {/* D12: UAT Scenarios inline panel */}
              {showUatPanel && (
                <div style={{ padding: '8px 0 0 40px' }}>
                  {uatScenarios.length === 0 ? (
                    <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--fg-4)', fontFamily: 'var(--ds-font-family-body)' }}>No UAT scenarios generated yet</span>
                      <button onClick={handleGenerateUAT} disabled={generatingUat} style={{
                        border: '0.75px solid #2563EB', background: 'transparent', borderRadius: 6,
                        padding: '4px 12px', fontSize: 12, fontWeight: 500, color: 'var(--cp-blue)',
                        cursor: generatingUat ? 'default' : 'pointer', fontFamily: 'var(--ds-font-family-body)',
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                        {generatingUat ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Generating...</> : 'Generate UAT →'}
                      </button>
                    </div>
                  ) : (
                    uatScenarios.map((s, i) => {
                      const uatStatusStyle = s.status === 'pass'
                        ? { bg: '#1B7F37', color: '#FFFFFF' }
                        : s.status === 'fail'
                          ? { bg: '#FFEBE6', color: '#BF2600' }
                          : { bg: '#DFE1E6', color: '#42526E' };
                      return (
                        <div key={s.id || i} style={{
                          display: 'flex', alignItems: 'center', gap: 8, height: 50,
                          borderBottom: i < uatScenarios.length - 1 ? (isDark ? '0.75px solid #292929' : '0.75px solid rgba(15,23,42,0.06)') : 'none',
                          padding: '8px 12px',
                        }}>
                          <span style={{
                            fontFamily: 'var(--ds-font-family-monospaced)', fontSize: 11, color: 'var(--fg-4)', flexShrink: 0,
                          }}>{s.scenario_key}</span>
                          <span style={{
                            fontSize: 13, color: isDark ? '#EDEDED' : '#1E293B', fontFamily: 'var(--ds-font-family-body)',
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{s.title}</span>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', padding: '0 6px', borderRadius: 4, height: 20,
                            fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                            background: uatStatusStyle.bg, color: uatStatusStyle.color,
                            fontFamily: 'var(--ds-font-family-body)', flexShrink: 0,
                          }}>{(s.status || 'pending').toUpperCase()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* ── FOOTER CTA ── */}
        <div style={{ padding: '14px 20px', borderTop: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.10)', flexShrink: 0, background: isDark ? '#0A0A0A' : 'var(--bg-app)' }}>
          {epicCount === 0 ? (
            <button onClick={() => onGenerate('epics')} style={{
              width: '100%', height: 40, fontSize: 14, fontWeight: 600, borderRadius: 6,
              border: 'none', background: 'var(--cp-blue)', color: '#FFFFFF', cursor: 'pointer',
              fontFamily: 'var(--ds-font-family-body)', boxShadow: '0 1px 3px rgba(37,99,235,0.35)',
            }}>
              Generate Epics for this BRD
            </button>
          ) : (
            <button onClick={() => { if (brdData.id && onViewDrafts) { onClose(); onViewDrafts(brdData.id); } }} style={{
              width: '100%', height: 40, fontSize: 14, fontWeight: 600, borderRadius: 6,
              border: isDark ? '0.75px solid #2E2E2E' : '0.75px solid rgba(15,23,42,0.15)', background: isDark ? '#1A1A1A' : 'var(--bg-app)', color: 'var(--fg-2)',
              cursor: 'pointer', fontFamily: 'var(--ds-font-family-body)',
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

// D06: Simple UAT scenario generation from text
function generateUATFromText(rawText: string, jiraKey: string | null): { title: string; steps: string; expected_result: string }[] {
  const sentences = rawText.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 8);
  return sentences.map((sentence, i) => ({
    title: `Verify: ${sentence.trim().substring(0, 80)}${sentence.trim().length > 80 ? '...' : ''}`,
    steps: `1. Navigate to the relevant module\n2. Verify the described functionality\n3. Confirm expected behavior`,
    expected_result: `The system should correctly implement: ${sentence.trim().substring(0, 120)}`,
  }));
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, color: 'var(--fg-4)',
      textTransform: 'uppercase', letterSpacing: '0.06em',
      display: 'block', fontFamily: 'var(--ds-font-family-body)',
      marginBottom: 0,
    }}>{children}</span>
  );
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
      <span style={{ width: 100, fontSize: 12, color: 'var(--fg-4)', flexShrink: 0, fontFamily: 'var(--ds-font-family-body)', paddingTop: 2 }}>{label}</span>
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}

function TicketTypeBadgeDrawer({ type }: { type: string | null }) {
  if (!type) return null;
  const dark = document.documentElement.classList.contains('dark');
  const map: Record<string, { bg: string; color: string; label: string }> = {
    subtask: { bg: dark ? 'rgba(217,119,6,0.15)' : '#FEF3C7', color: dark ? '#FBBF24' : '#92400E', label: 'SUBTASK' },
    story: { bg: dark ? 'rgba(37,99,235,0.12)' : '#EFF6FF', color: dark ? '#60A5FA' : '#1D4ED8', label: 'STORY' },
    epic: { bg: dark ? 'rgba(124,58,237,0.15)' : '#F3E8FF', color: dark ? '#A78BFA' : '#6B21A8', label: 'EPIC' },
    task: { bg: dark ? '#1A1A1A' : '#F1F5F9', color: 'var(--fg-2)', label: 'TASK' },
  };
  const s = map[type] || map['task']!;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '0 5px', borderRadius: 4, height: 18,
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      background: s.bg, color: s.color, fontFamily: 'var(--ds-font-family-body)',
    }}>{s.label}</span>
  );
}
