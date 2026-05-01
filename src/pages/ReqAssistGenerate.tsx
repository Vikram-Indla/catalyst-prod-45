import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Check, X, BookOpen, Flag, RefreshCw, Loader2, FileText, AlertTriangle, Eye, RotateCcw } from 'lucide-react';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import { syncSingleBrdToKb } from '@/services/reqAssistService';
import { sanitiseError } from '@/lib/errorUtils';
import ReactMarkdown from 'react-markdown';
import { useTheme } from '@/hooks/useTheme';
import RAEpicGenerationModal from '@/components/reqAssist/RAEpicGenerationModal';

interface QualifyResult {
  qualified: boolean;
  score: number;
  language: string;
  reasons: string[];
  domain_detected: string;
  requirement_count_estimate: number;
}

interface BrdSection {
  sectionNumber: string;
  title: string;
  content: string;
}

interface GenerateResult {
  sections: BrdSection[];
  section_count: number;
  language: string;
  domain: string;
  total_requirements: number;
}

type BrdState = 'fresh' | 'generated' | 'saved' | 'has_epics' | 'duplicate';

/* Simple SHA-256 hash */
async function hashText(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function ReqAssistGenerate() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');

  // Qualification
  const [qualifying, setQualifying] = useState(false);
  const [qualifyResult, setQualifyResult] = useState<QualifyResult | null>(null);

  // Generation
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Save / Epic state
  const [saving, setSaving] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [hasEpics, setHasEpics] = useState(false);
  const [epicCount, setEpicCount] = useState(0);
  const [epicModalOpen, setEpicModalOpen] = useState(false);
  const [regenConfirmOpen, setRegenConfirmOpen] = useState(false);

  // Duplicate
  const [duplicateDoc, setDuplicateDoc] = useState<{ id: string; title: string } | null>(null);
  const [dupModalOpen, setDupModalOpen] = useState(false);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);

  // WikiHub push
  const [wikiState, setWikiState] = useState<'idle' | 'pushing' | 'success' | 'failed'>('idle');

  // Success banner auto-dismiss
  const [showSavedBanner, setShowSavedBanner] = useState(false);
  useEffect(() => {
    if (showSavedBanner) {
      const t = setTimeout(() => setShowSavedBanner(false), 4000);
      return () => clearTimeout(t);
    }
  }, [showSavedBanner]);

  // Check epics when savedDocId changes
  useEffect(() => {
    if (!savedDocId) { setHasEpics(false); setEpicCount(0); return; }
    (async () => {
      const { count } = await typedQuery('brd_epics')
        .select('id', { count: 'exact', head: true })
        .eq('brd_id', savedDocId);
      if (count && count > 0) { setHasEpics(true); setEpicCount(count); }
    })();
  }, [savedDocId]);

  // Derive brdState
  const brdState: BrdState = useMemo(() => {
    if (hasEpics && savedDocId) return 'has_epics';
    if (savedDocId) return 'saved';
    if (dupModalOpen || duplicateDoc) return 'duplicate';
    if (genResult) return 'generated';
    return 'fresh';
  }, [genResult, savedDocId, hasEpics, dupModalOpen, duplicateDoc]);

  const handleQualifyAndGenerate = useCallback(async () => {
    if (!text.trim()) return;
    setQualifyResult(null);
    setGenResult(null);
    setGenError(null);
    setDuplicateDoc(null);

    setQualifying(true);
    try {
      const { data: qData, error: qErr } = await supabase.functions.invoke('qualify-brd-text', {
        body: { text: text.trim() },
      });
      if (qErr) throw new Error(qErr.message || 'Qualification failed');
      if (qData?.error) throw new Error(qData.error);

      const qResult = qData as QualifyResult;
      setQualifyResult(qResult);
      setQualifying(false);

      if (!qResult.qualified) return;

      // Check for duplicate via content_hash
      const contentHash = await hashText(text);
      const { data: existing } = await typedQuery('brd_documents')
        .select('id, title')
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle();
      if (existing) {
        setDuplicateDoc(existing);
        setDupModalOpen(true);
        return; // Don't generate yet — user must decide
      }

      // Generate
      setGenerating(true);
      const { data: gData, error: gErr } = await supabase.functions.invoke('generate-brd-from-text', {
        body: { text: text.trim() },
      });
      if (gErr) throw new Error(gErr.message || 'Generation failed');
      if (gData?.error) throw new Error(gData.error);

      setGenResult(gData as GenerateResult);
    } catch (err: any) {
      setGenError(sanitiseError(err));
      toast.error('Generation failed', { description: sanitiseError(err) });
    } finally {
      setQualifying(false);
      setGenerating(false);
    }
  }, [text]);

  const doSave = useCallback(async (titleSuffix = '') => {
    if (!genResult) return;
    setSaving(true);
    try {
      const baseTitle = text.trim().slice(0, 60).replace(/[^\w\s\-.,]/g, '').trim() || 'Untitled BRD';
      const title = baseTitle + titleSuffix;
      const contentHash = await hashText(text);

      const { data, error } = await typedQuery('brd_documents')
        .insert({
          title,
          raw_text: text.trim(),
          source_type: 'ai_generated',
          pipeline_stage: 'complete',
          language: genResult.language || 'en',
          domain_tag: genResult.domain || null,
          quality_score: qualifyResult?.score || null,
          content_hash: contentHash,
          json_data: { sections: genResult.sections, total_requirements: genResult.total_requirements },
        })
        .select()
        .single();

      if (error) throw error;
      setSavedDocId(data.id);
      setShowSavedBanner(true);
      setDuplicateDoc(null);
      setDupModalOpen(false);
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
      toast.success('Saved to Library', { description: `"${title}" created successfully` });
    } catch (err: any) {
      toast.error('Save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  }, [genResult, text, qualifyResult, qc]);

  const handleOverwrite = useCallback(async () => {
    if (!duplicateDoc || !genResult) return;
    setSaving(true);
    try {
      const { error } = await typedQuery('brd_documents')
        .update({
          raw_text: text.trim(),
          pipeline_stage: 'process',
          updated_at: new Date().toISOString(),
          json_data: { sections: genResult.sections, total_requirements: genResult.total_requirements },
        })
        .eq('id', duplicateDoc.id);
      if (error) throw error;

      // Delete existing epics
      await typedQuery('brd_epics').delete().eq('brd_id', duplicateDoc.id);

      setSavedDocId(duplicateDoc.id);
      setShowSavedBanner(true);
      setDuplicateDoc(null);
      setDupModalOpen(false);
      setOverwriteConfirmOpen(false);
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
      toast.success('Overwritten', { description: 'Existing BRD replaced and epics cleared.' });
    } catch (err: any) {
      toast.error('Overwrite failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  }, [duplicateDoc, genResult, text, qc]);

  const handlePushToWikiHub = useCallback(async () => {
    if (!savedDocId) return;
    setWikiState('pushing');
    try {
      await syncSingleBrdToKb(savedDocId);
      setWikiState('success');
      toast.success('Indexed for AI search');
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
    } catch (err: any) {
      setWikiState('failed');
      toast.error(sanitiseError(err));
    }
  }, [savedDocId, qc]);

  const handleReset = useCallback(() => {
    setText('');
    setQualifyResult(null);
    setGenResult(null);
    setGenError(null);
    setSavedDocId(null);
    setHasEpics(false);
    setEpicCount(0);
    setDuplicateDoc(null);
    setDupModalOpen(false);
    setWikiState('idle');
    setShowSavedBanner(false);
  }, []);

  return (
    <div style={{ background: 'var(--cp-bg-page, #F8FAFC)', minHeight: '100%' }}>
      <CatalystTopNav />

      <div style={{ padding: '24px 28px' }}>
        {/* HEADER */}
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => navigate('/product/req-assist')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))', fontWeight: 500, marginBottom: 16, padding: 0, fontFamily: 'var(--cp-font-body)' }}>
            <ArrowLeft size={14} /> Back to Library
          </button>
          <h2 style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 24, fontWeight: 700, color: 'var(--cp-text-primary, #111827)', margin: '0 0 6px' }}>Generate BRD from Text</h2>
          <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #374151)', margin: 0, lineHeight: 1.5, fontFamily: 'var(--cp-font-body)' }}>
            Paste raw requirements, notes, or a brief. The system qualifies your text before generating — it will not produce a BRD from unstructured input.
          </p>
        </div>

        {/* INPUT CARD */}
        <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', border: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 6, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={15} color="#7C3AED" />
            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--cp-text-primary, #111827)', fontFamily: 'var(--cp-font-body)' }}>Requirements Input</span>
            <span style={{ fontSize: 13, color: 'var(--cp-text-tertiary, #6B7280)', fontFamily: 'var(--cp-font-body)' }}>· Paste text from meetings, briefs, email threads, or scope documents</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setQualifyResult(null); setGenResult(null); setGenError(null); setSavedDocId(null); setHasEpics(false); setDuplicateDoc(null); setWikiState('idle'); setShowSavedBanner(false); }}
            placeholder="Paste your requirements here..."
            style={{ width: '100%', minHeight: 200, padding: 14, fontSize: 14, lineHeight: 1.65, border: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 4, outline: 'none', resize: 'vertical', fontFamily: 'var(--cp-font-body)', color: 'var(--cp-text-primary, #111827)', transition: 'border-color 150ms, box-shadow 150ms' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.10)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--cp-border, #E2E8F0)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
          <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #6B7280)', margin: '6px 0 0', fontFamily: 'var(--cp-font-body)' }}>The AI will first qualify whether this text contains enough structured requirements.</p>

          {/* Qualify fail */}
          {qualifyResult && !qualifyResult.qualified && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))', border: '0.75px solid rgba(220,38,38,0.12)', borderRadius: 6, display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><X size={12} color="var(--ds-text-danger, var(--ds-text-danger, #DC2626))" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', fontFamily: 'var(--cp-font-body)' }}>✗ Not Qualified</div>
                {qualifyResult.reasons.map((r, i) => <p key={i} style={{ fontSize: 12, color: 'var(--ds-text-danger, var(--ds-text-danger, #991B1B))', margin: '4px 0 0', lineHeight: 1.5, fontFamily: 'var(--cp-font-body)' }}>• {r}</p>)}
              </div>
            </div>
          )}

          {/* Qualify pass */}
          {qualifyResult && qualifyResult.qualified && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: '#F0FDF4', border: '0.75px solid #DCFCE7', borderRadius: 6, display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--ds-background-success, var(--ds-background-success, #DCFCE7))', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check size={12} color="var(--ds-text-success, var(--ds-text-success, #16A34A))" /></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-success, var(--ds-text-success, #16A34A))', fontFamily: 'var(--cp-font-body)' }}>✓ Qualified — Score {qualifyResult.score}/100</div>
                {qualifyResult.reasons.map((r, i) => <p key={i} style={{ fontSize: 12, color: '#166534', margin: '4px 0 0', lineHeight: 1.5, fontFamily: 'var(--cp-font-body)' }}>• {r}</p>)}
                <p style={{ fontSize: 11, color: 'var(--cp-text-tertiary, #64748B)', margin: '6px 0 0', fontFamily: 'var(--cp-font-body)' }}>
                  Domain: {qualifyResult.domain_detected} · ~{qualifyResult.requirement_count_estimate} requirements · {qualifyResult.language.toUpperCase()}
                </p>
              </div>
            </div>
          )}

          {/* Error */}
          {genError && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))', border: '0.75px solid rgba(220,38,38,0.12)', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', fontFamily: 'var(--cp-font-body)' }}>Generation Error</div>
              <p style={{ fontSize: 12, color: 'var(--ds-text-danger, var(--ds-text-danger, #991B1B))', margin: '4px 0 0', fontFamily: 'var(--cp-font-body)' }}>{sanitiseError(genError)}</p>
            </div>
          )}

          {/* Top action row — fresh state */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
            <BtnAI onClick={handleQualifyAndGenerate} disabled={qualifying || generating || !text.trim()}>
              {qualifying || generating ? <Loader2 size={14} style={{ animation: 'ra-spin 1s linear infinite' }} /> : <Sparkles size={14} />}
              {qualifying ? 'Qualifying…' : generating ? 'Generating BRD…' : 'Qualify & Generate'}
            </BtnAI>
            <BtnOutline onClick={handleReset}>Clear</BtnOutline>
            {brdState === 'fresh' && (
              <BtnOutline disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Generate and save a BRD first">
                <Flag size={14} /> Generate Epics
              </BtnOutline>
            )}
          </div>
        </div>

        {/* Generating spinner */}
        {generating && !genResult && (
          <div style={{ background: 'var(--cp-bg-elevated, #FFFFFF)', border: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 6, padding: '40px 24px', textAlign: 'center' }}>
            <Loader2 size={24} color="#7C3AED" style={{ animation: 'ra-spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--cp-text-secondary, #374151)', margin: '0 0 4px', fontFamily: 'var(--cp-font-body)' }}>Generating BRD sections from your input…</p>
            <p style={{ fontSize: 12, color: 'var(--cp-text-tertiary, #6B7280)', margin: 0, fontFamily: 'var(--cp-font-body)' }}>This typically takes 15–30 seconds</p>
          </div>
        )}

        {/* GENERATED BRD */}
        {genResult && genResult.sections.length > 0 && (
          <div style={{ border: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, borderRadius: 6, overflow: 'hidden', background: 'var(--cp-bg-elevated, #FFFFFF)' }}>
            {/* Header */}
            <div style={{ padding: '12px 16px', borderBottom: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)', fontFamily: 'var(--cp-font-heading)' }}>Generated BRD</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 4, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, background: '#1B7F37', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))' }}>QUALIFIED</span>
              <span style={{ fontSize: 11, color: 'var(--cp-text-tertiary, #64748B)', marginLeft: 'auto', fontFamily: 'var(--cp-font-mono)' }}>
                {genResult.section_count} sections · {genResult.language.toUpperCase()} · {genResult.total_requirements} requirements
              </span>
            </div>

            {/* Sections */}
            <div style={{ padding: 20 }}>
              {genResult.sections.map((section, i) => (
                <div key={i} style={{
                  marginBottom: i < genResult.sections.length - 1 ? 20 : 0,
                  paddingBottom: i < genResult.sections.length - 1 ? 20 : 0,
                  borderBottom: i < genResult.sections.length - 1 ? '0.75px solid rgba(0,0,0,0.06)' : 'none',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--cp-text-muted, #94A3B8)', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: 'var(--cp-font-body)' }}>SECTION {section.sectionNumber}</span>
                  <h4 style={{ fontSize: 15, fontWeight: 650, color: 'var(--cp-text-primary, #0F172A)', margin: '4px 0 8px', fontFamily: 'var(--cp-font-heading)' }}>{section.title}</h4>
                  <div className="ra-brd-markdown">
                    <ReactMarkdown components={{
                      p: ({ children }) => <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #374151)', lineHeight: 1.6, marginBottom: 12, fontFamily: 'var(--cp-font-body)' }}>{children}</p>,
                      strong: ({ children }) => <strong style={{ fontWeight: 650, color: 'var(--cp-text-primary, #111827)' }}>{children}</strong>,
                      ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 12 }}>{children}</ol>,
                      li: ({ children }) => <li style={{ fontSize: 14, color: 'var(--cp-text-secondary, #374151)', lineHeight: 1.6, marginBottom: 4, listStyleType: 'disc', fontFamily: 'var(--cp-font-body)' }}>{children}</li>,
                      h3: ({ children }) => <h3 style={{ fontSize: 13, fontFamily: 'var(--cp-font-heading)', fontWeight: 650, color: 'var(--cp-text-tertiary, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 16 }}>{children}</h3>,
                      h4: ({ children }) => <h4 style={{ fontSize: 13, fontFamily: 'var(--cp-font-heading)', fontWeight: 650, color: 'var(--cp-text-tertiary, #6B7280)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: 16 }}>{children}</h4>,
                    }}>{section.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>

            {/* STATE BANNERS */}
            {brdState === 'generated' && (
              <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: 'var(--ds-background-danger, var(--ds-background-danger, #FEF2F2))', border: '0.75px solid #FECACA', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={15} color="var(--ds-text-danger, var(--ds-text-danger, #DC2626))" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', fontFamily: 'var(--cp-font-body)' }}>
                  This BRD has not been saved yet. Save to Library to enable Epics generation and WikiHub sync.
                </span>
              </div>
            )}
            {showSavedBanner && brdState === 'saved' && (
              <div style={{ margin: '0 16px 12px', padding: '10px 14px', background: '#F0FDF4', border: '0.75px solid #BBF7D0', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={15} color="#166534" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#166534', fontFamily: 'var(--cp-font-body)' }}>Saved to Library. Ready to generate Epics.</span>
              </div>
            )}

            {/* ACTION BAR */}
            <div style={{ padding: '12px 16px', background: 'var(--cp-bg-elevated, #FFFFFF)', borderTop: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, display: 'flex', gap: 8, alignItems: 'center' }}>
              {brdState === 'generated' && (
                <>
                  <BtnPrimary onClick={() => doSave()} disabled={saving}>
                    {saving ? <Loader2 size={14} style={{ animation: 'ra-spin 1s linear infinite' }} /> : <BookOpen size={14} />}
                    Save to Library
                  </BtnPrimary>
                  <BtnOutline disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Save to Library first">
                    <Flag size={14} /> Generate Epics
                  </BtnOutline>
                  <BtnOutline disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} title="Save to Library first">
                    <RefreshCw size={14} /> Push to WikiHub
                  </BtnOutline>
                </>
              )}

              {brdState === 'saved' && (
                <>
                  <BtnAI onClick={() => setEpicModalOpen(true)}>
                    <Sparkles size={14} /> Generate Epics
                  </BtnAI>
                  <BtnOutline onClick={() => navigate('/product/req-assist')}>
                    <Eye size={14} /> View in Library
                  </BtnOutline>
                  {wikiState === 'idle' && (
                    <BtnOutline onClick={handlePushToWikiHub}>
                      <RefreshCw size={14} /> Push to WikiHub
                    </BtnOutline>
                  )}
                  {wikiState === 'pushing' && (
                    <BtnOutline disabled style={{ opacity: 0.6, cursor: 'not-allowed' }}>
                      <Loader2 size={14} style={{ animation: 'ra-spin 1s linear infinite' }} /> Pushing…
                    </BtnOutline>
                  )}
                  {wikiState === 'success' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 6, background: '#1B7F37', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', fontSize: 14, fontWeight: 600, fontFamily: 'var(--cp-font-body)' }}>
                      <Check size={14} /> In WikiHub
                    </span>
                  )}
                  {wikiState === 'failed' && (
                    <BtnDanger onClick={handlePushToWikiHub}>
                      Push Failed — Retry
                    </BtnDanger>
                  )}
                </>
              )}

              {brdState === 'has_epics' && (
                <>
                  <BtnPrimary onClick={() => navigate('/product/req-assist')}>
                    <Eye size={14} /> View Epics
                  </BtnPrimary>
                  <BtnOutline onClick={() => navigate('/product/req-assist')}>
                    <BookOpen size={14} /> View in Library
                  </BtnOutline>
                  <BtnAI onClick={() => setRegenConfirmOpen(true)}>
                    <RotateCcw size={14} /> Regenerate Epics
                  </BtnAI>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EPIC GENERATION MODAL */}
      {epicModalOpen && savedDocId && (
        <RAEpicGenerationModalWrapper
          savedDocId={savedDocId}
          fallbackTitle={text.trim().slice(0, 60) || 'Untitled BRD'}
          onClose={() => { setEpicModalOpen(false); if (savedDocId) { (async () => { const { count } = await typedQuery('brd_epics').select('id', { count: 'exact', head: true }).eq('brd_id', savedDocId); if (count && count > 0) { setHasEpics(true); setEpicCount(count); } })(); } }}
        />
      )}

      {/* DUPLICATE MODAL */}
      {dupModalOpen && duplicateDoc && (
        <ModalOverlay>
          <div style={{ width: 480, background: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 6, padding: 24, fontFamily: 'var(--cp-font-body)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <AlertTriangle size={20} color="var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))" />
              <span style={{ fontSize: 16, fontWeight: 650, color: 'var(--cp-text-primary, #111827)', fontFamily: 'var(--cp-font-heading)' }}>Document Already Exists</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #374151)', lineHeight: 1.6, margin: '0 0 20px' }}>
              A BRD with identical content already exists in your library: <strong style={{ fontWeight: 650, color: 'var(--cp-text-primary, #111827)' }}>"{duplicateDoc.title}"</strong>. What would you like to do?
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <BtnOutline onClick={() => { setDupModalOpen(false); navigate('/product/req-assist'); }}>
                <Eye size={14} /> View Existing
              </BtnOutline>
              <BtnPrimary onClick={async () => {
                setDupModalOpen(false);
                // Generate then save as copy
                setGenerating(true);
                try {
                  const { data: gData, error: gErr } = await supabase.functions.invoke('generate-brd-from-text', { body: { text: text.trim() } });
                  if (gErr) throw new Error(gErr.message);
                  if (gData?.error) throw new Error(gData.error);
                  setGenResult(gData as GenerateResult);
                  // Auto-save as copy
                  const baseTitle = text.trim().slice(0, 60).replace(/[^\w\s\-.,]/g, '').trim() || 'Untitled BRD';
                  const contentHash = await hashText(text + Date.now()); // unique hash for copy
                  const { data, error } = await typedQuery('brd_documents').insert({
                    title: baseTitle + ' (Copy)', raw_text: text.trim(), source_type: 'ai_generated', pipeline_stage: 'complete',
                    language: gData.language || 'en', domain_tag: gData.domain || null, quality_score: qualifyResult?.score || null,
                    content_hash: contentHash, json_data: { sections: gData.sections, total_requirements: gData.total_requirements },
                  }).select().single();
                  if (error) throw error;
                  setSavedDocId(data.id);
                  setShowSavedBanner(true);
                  setDuplicateDoc(null);
                  qc.invalidateQueries({ queryKey: RA_KEYS.all });
                  toast.success('Saved as new copy');
                } catch (err: any) { setGenError(err.message); toast.error('Failed', { description: err.message }); } finally { setGenerating(false); }
              }}>
                Save as New Copy
              </BtnPrimary>
              <button onClick={() => setOverwriteConfirmOpen(true)} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 500,
                border: '0.75px solid #DC2626', borderRadius: 6, background: 'transparent', color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
              }}>Overwrite</button>
              <BtnGhost onClick={() => { setDupModalOpen(false); setDuplicateDoc(null); }}>Cancel</BtnGhost>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* OVERWRITE CONFIRM */}
      {overwriteConfirmOpen && (
        <ModalOverlay>
          <div style={{ width: 440, background: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 6, padding: 24, fontFamily: 'var(--cp-font-body)' }}>
            <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #374151)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Are you sure? This will replace the existing BRD and clear any generated Epics for that document.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={async () => {
                // Generate then overwrite
                setGenerating(true);
                try {
                  const { data: gData, error: gErr } = await supabase.functions.invoke('generate-brd-from-text', { body: { text: text.trim() } });
                  if (gErr) throw new Error(gErr.message);
                  if (gData?.error) throw new Error(gData.error);
                  setGenResult(gData as GenerateResult);
                  await handleOverwrite();
                } catch (err: any) { setGenError(err.message); } finally { setGenerating(false); setOverwriteConfirmOpen(false); }
              }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 600,
                border: 'none', borderRadius: 6, background: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))', cursor: 'pointer', fontFamily: 'var(--cp-font-body)',
              }}>Yes, Overwrite</button>
              <BtnGhost onClick={() => setOverwriteConfirmOpen(false)}>Go Back</BtnGhost>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* REGEN EPICS CONFIRM */}
      {regenConfirmOpen && (
        <ModalOverlay>
          <div style={{ width: 440, background: 'var(--cp-bg-elevated, #FFFFFF)', borderRadius: 6, padding: 24, fontFamily: 'var(--cp-font-body)' }}>
            <p style={{ fontSize: 14, color: 'var(--cp-text-secondary, #374151)', lineHeight: 1.6, margin: '0 0 16px' }}>
              Regenerating will replace all {epicCount} existing epics for this document. This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <BtnAI onClick={async () => {
                setRegenConfirmOpen(false);
                if (savedDocId) {
                  await typedQuery('brd_epics').delete().eq('brd_id', savedDocId);
                  setHasEpics(false);
                  setEpicCount(0);
                  setEpicModalOpen(true);
                }
              }}>Regenerate</BtnAI>
              <BtnGhost onClick={() => setRegenConfirmOpen(false)}>Keep Existing</BtnGhost>
            </div>
          </div>
        </ModalOverlay>
      )}

      <style>{`@keyframes ra-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── BUTTON COMPONENTS ── */

function BtnPrimary({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 600,
      border: 'none', borderRadius: 4, cursor: props.disabled ? 'not-allowed' : 'pointer',
      background: 'linear-gradient(135deg, var(--ds-text-brand, #2563EB) 0%, var(--ds-background-brand-bold-hovered, #1D4ED8) 100%)', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
      fontFamily: 'var(--cp-font-body)',
      opacity: props.disabled ? 0.6 : 1, transition: 'filter 120ms',
      ...props.style,
    }}>{children}</button>
  );
}

function BtnAI({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 600,
      border: 'none', borderRadius: 4, cursor: props.disabled ? 'not-allowed' : 'pointer',
      background: '#7C3AED', color: 'var(--ds-surface, var(--ds-surface, #FFFFFF))',
      fontFamily: 'var(--cp-font-body)',
      opacity: props.disabled ? 0.6 : 1, transition: 'background 120ms',
      ...props.style,
    }}>{children}</button>
  );
}

function BtnOutline({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isDark } = useTheme();
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 500,
      border: `0.75px solid ${'var(--cp-border-strong, #CBD5E1)'}`, borderRadius: 6, cursor: props.disabled ? 'not-allowed' : 'pointer',
      background: 'var(--cp-bg-elevated, #FFFFFF)', color: 'var(--cp-text-secondary, #374151)', fontFamily: 'var(--cp-font-body)',
      transition: 'background 120ms',
      ...props.style,
    }}>{children}</button>
  );
}

function BtnGhost({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { isDark } = useTheme();
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 500,
      border: 'none', borderRadius: 6, cursor: 'pointer',
      background: 'transparent', color: 'var(--cp-text-tertiary, #64748B)', fontFamily: 'var(--cp-font-body)',
      ...props.style,
    }}>{children}</button>
  );
}

function BtnDanger({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 14, fontWeight: 500,
      border: '0.75px solid #DC2626', borderRadius: 6, cursor: 'pointer',
      background: 'transparent', color: 'var(--ds-text-danger, var(--ds-text-danger, #DC2626))', fontFamily: 'var(--cp-font-body)',
      ...props.style,
    }}>{children}</button>
  );
}

function ModalOverlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
      {children}
    </div>
  );
}

/* ── Top Nav Chrome ── */
function CatalystTopNav() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const HUBS = [
    { label: 'Home', path: '/for-you' },
    { label: 'StrategyHub', path: '/strategy' },
    { label: 'ProductHub', path: '/producthub' },
    { label: 'ProjectHub', path: '/projecthub' },
    { label: 'ReleaseHub', path: '/releases' },
    { label: 'TestHub', path: '/testhub' },
    { label: 'IncidentHub', path: '/incidents' },
    { label: 'TaskHub', path: '/tasks' },
    { label: 'PlanHub', path: '/planhub' },
    { label: 'WikiHub', path: '/wikihub' },
  ];
  return (
    <nav style={{ height: 48, display: 'flex', alignItems: 'center', gap: 0, background: 'var(--cp-bg-elevated, #FFFFFF)', borderBottom: `0.75px solid ${'var(--cp-border, #E2E8F0)'}`, padding: '0 24px', fontFamily: 'var(--cp-font-body)' }}>
      {HUBS.map(h => {
        const isActive = h.label === 'ProductHub';
        return (
          <button key={h.label} onClick={() => navigate(h.path)} style={{
            height: 48, padding: '0 14px', fontSize: 13, fontWeight: isActive ? 600 : 400,
            color: isActive ? 'var(--ds-text-brand, var(--ds-text-brand, #2563EB))' : 'var(--ds-text-subtlest, var(--ds-text-subtlest, #64748B))', background: 'transparent', border: 'none', cursor: 'pointer',
            borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent', transition: 'color 120ms', fontFamily: 'var(--cp-font-body)',
          }}>{h.label}</button>
        );
      })}
    </nav>
  );
}

/** Wrapper that fetches full brd_documents row before opening EpicGenerationModal */
function RAEpicGenerationModalWrapper({ savedDocId, fallbackTitle, onClose }: { savedDocId: string; fallbackTitle: string; onClose: () => void }) {
  const [doc, setDoc] = useState<any>(null);
  useEffect(() => {
    (async () => {
      const { data } = await typedQuery('brd_documents')
        .select('id, title, jira_key, language, pipeline_stage')
        .eq('id', savedDocId)
        .single();
      setDoc(data ? { ...data, jira_ticket_key: data.jira_key } : { id: savedDocId, title: fallbackTitle });
    })();
  }, [savedDocId, fallbackTitle]);
  if (!doc) return null;
  return <RAEpicGenerationModal doc={doc} onClose={onClose} />;
}
