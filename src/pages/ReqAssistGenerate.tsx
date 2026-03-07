import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Check, X, BookOpen, Flag, RefreshCw, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { RA_KEYS } from '@/hooks/useReqAssist';
import ReactMarkdown from 'react-markdown';
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

export default function ReqAssistGenerate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [text, setText] = useState('');

  // Qualification state
  const [qualifying, setQualifying] = useState(false);
  const [qualifyResult, setQualifyResult] = useState<QualifyResult | null>(null);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);

  const handleQualifyAndGenerate = useCallback(async () => {
    if (!text.trim()) return;
    setQualifyResult(null);
    setGenResult(null);
    setGenError(null);

    // Step 1: Qualify
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

      if (!qResult.qualified) return; // Stop — not qualified

      // Step 2: Generate
      setGenerating(true);
      const { data: gData, error: gErr } = await supabase.functions.invoke('generate-brd-from-text', {
        body: { text: text.trim() },
      });
      if (gErr) throw new Error(gErr.message || 'Generation failed');
      if (gData?.error) throw new Error(gData.error);

      setGenResult(gData as GenerateResult);
    } catch (err: any) {
      setGenError(err.message || 'An unexpected error occurred');
      toast.error('Generation failed', { description: err.message });
    } finally {
      setQualifying(false);
      setGenerating(false);
    }
  }, [text]);

  const handleSaveToLibrary = useCallback(async () => {
    if (!genResult) return;
    setSaving(true);
    try {
      const title = text.trim().slice(0, 60).replace(/[^\w\s\-.,]/g, '').trim() || 'Untitled BRD';

      // Save to brd_documents with raw_text (NOT "content")
      const { data, error } = await (supabase as any)
        .from('brd_documents')
        .insert({
          title,
          raw_text: text.trim(),
          source_type: 'ai_generated',
          pipeline_stage: 'complete',
          language: genResult.language || 'en',
          domain_tag: genResult.domain || null,
          quality_score: qualifyResult?.score || null,
          json_data: { sections: genResult.sections, total_requirements: genResult.total_requirements },
        })
        .select()
        .single();

      if (error) throw error;
      setSavedDocId(data.id);
      qc.invalidateQueries({ queryKey: RA_KEYS.all });
      toast.success('Saved to Library', { description: `"${title}" created successfully` });
    } catch (err: any) {
      toast.error('Save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  }, [genResult, text, qualifyResult, qc]);

  const handleReset = useCallback(() => {
    setText('');
    setQualifyResult(null);
    setGenResult(null);
    setGenError(null);
    setSavedDocId(null);
  }, []);

  const handleNavigateBack = () => navigate('/product/req-assist');

  return (
    <div style={{ background: '#F8FAFC', minHeight: '100%' }}>
      {/* ── NAV CHROME ── */}
      <CatalystTopNav />

      <div style={{ padding: '24px 28px' }}>
        {/* ── BACK + HEADER ── */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={handleNavigateBack}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 14, color: '#2563EB', fontWeight: 500, marginBottom: 16, padding: 0,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <ArrowLeft size={14} /> Back to Library
          </button>

          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>
            Generate BRD from Text
          </h2>
          <p style={{ fontSize: 14, color: '#374151', margin: 0, lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
            Paste raw requirements, notes, or a brief. The system qualifies your text before generating — it will not produce a BRD from unstructured input.
          </p>
        </div>

        {/* ── INPUT CARD ── */}
        <div style={{ background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <FileText size={15} color="#7C3AED" />
            <span style={{ fontSize: 13, fontWeight: 650, color: '#111827', letterSpacing: '0.01em', fontFamily: "'Inter', sans-serif" }}>
              Requirements Input
            </span>
            <span style={{ fontSize: 13, color: '#6B7280', fontFamily: "'Inter', sans-serif" }}>
              · Paste text from meetings, briefs, email threads, or scope documents
            </span>
          </div>

          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setQualifyResult(null);
              setGenResult(null);
              setGenError(null);
              setSavedDocId(null);
            }}
            placeholder="Paste your requirements here..."
            style={{
              width: '100%', minHeight: 200, padding: 14, fontSize: 14, lineHeight: 1.65,
              border: '0.75px solid #E2E8F0', borderRadius: 4, outline: 'none', resize: 'vertical',
              fontFamily: "'Inter', sans-serif", color: '#111827',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(124,58,237,0.10)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
          />

          <p style={{ fontSize: 12, color: '#6B7280', margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
            The AI will first qualify whether this text contains enough structured requirements. If not, it will explain why.
          </p>

          {/* ── QUALIFY RESULT: FAIL ── */}
          {qualifyResult && !qualifyResult.qualified && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: '#FEF2F2', border: '0.75px solid rgba(220,38,38,0.12)', borderRadius: 6, display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <X size={12} color="#DC2626" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>✗ Not Qualified — Insufficient for BRD</div>
                {qualifyResult.reasons.map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>• {r}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── QUALIFY RESULT: PASS ── */}
          {qualifyResult && qualifyResult.qualified && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: '#F0FDF4', border: '0.75px solid #DCFCE7', borderRadius: 6, display: 'flex', gap: 10 }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={12} color="#16A34A" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', fontFamily: "'Inter', sans-serif" }}>
                  ✓ Qualified — Score {qualifyResult.score}/100
                </div>
                {qualifyResult.reasons.map((r, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#166534', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>• {r}</p>
                ))}
                <p style={{ fontSize: 11, color: '#64748B', margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
                  Domain: {qualifyResult.domain_detected} · ~{qualifyResult.requirement_count_estimate} requirements detected · Language: {qualifyResult.language.toUpperCase()}
                </p>
              </div>
            </div>
          )}

          {/* ── ERROR ── */}
          {genError && (
            <div style={{ marginTop: 12, padding: '14px 16px', background: '#FEF2F2', border: '0.75px solid rgba(220,38,38,0.12)', borderRadius: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>Generation Error</div>
              <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 0', fontFamily: "'Inter', sans-serif" }}>{genError}</p>
            </div>
          )}

          {/* ── BUTTONS ── */}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button
              onClick={handleQualifyAndGenerate}
              disabled={qualifying || generating || !text.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '0 16px', height: 36, fontSize: 13, fontWeight: 500,
                border: 'none', borderRadius: 6, cursor: (qualifying || generating || !text.trim()) ? 'not-allowed' : 'pointer',
                background: '#7C3AED', color: '#FFFFFF',
                opacity: (qualifying || generating || !text.trim()) ? 0.6 : 1,
                fontFamily: "'Inter', sans-serif",
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => { if (!qualifying && !generating && text.trim()) e.currentTarget.style.background = '#6D28D9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#7C3AED'; }}
            >
              {qualifying || generating ? (
                <Loader2 size={13} style={{ animation: 'ra-spin 1s linear infinite' }} />
              ) : (
                <Sparkles size={13} />
              )}
              {qualifying ? 'Qualifying…' : generating ? 'Generating BRD…' : 'Qualify & Generate'}
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '0 16px', height: 36, fontSize: 13, fontWeight: 500,
                border: '0.75px solid #E2E8F0', borderRadius: 6,
                background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* ── GENERATING SPINNER ── */}
        {generating && !genResult && (
          <div style={{ background: '#FFFFFF', border: '0.75px solid #E2E8F0', borderRadius: 6, padding: '40px 24px', textAlign: 'center' }}>
            <Loader2 size={24} color="#7C3AED" style={{ animation: 'ra-spin 1s linear infinite', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ fontSize: 14, fontWeight: 500, color: '#374151', margin: '0 0 4px', fontFamily: "'Inter', sans-serif" }}>Generating BRD sections from your input…</p>
            <p style={{ fontSize: 12, color: '#6B7280', margin: 0, fontFamily: "'Inter', sans-serif" }}>This typically takes 15–30 seconds</p>
          </div>
        )}

        {/* ── GENERATED BRD ── */}
        {genResult && genResult.sections.length > 0 && (
          <div style={{ border: '0.75px solid #E2E8F0', borderRadius: 6, overflow: 'hidden', background: '#FFFFFF' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.75px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>Generated BRD</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 3,
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const,
                background: '#E3FCEF', color: '#006644',
              }}>QUALIFIED</span>
              <span style={{ fontSize: 11, color: '#64748B', marginLeft: 'auto', fontFamily: "'JetBrains Mono', monospace" }}>
                {genResult.section_count} sections · {genResult.language.toUpperCase()} · {genResult.total_requirements} requirements
              </span>
            </div>
            <div style={{ padding: 20 }}>
              {genResult.sections.map((section, i) => (
                <div key={i} style={{
                  marginBottom: i < genResult.sections.length - 1 ? 20 : 0,
                  paddingBottom: i < genResult.sections.length - 1 ? 20 : 0,
                  borderBottom: i < genResult.sections.length - 1 ? '0.75px solid rgba(0,0,0,0.06)' : 'none',
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>
                    SECTION {section.sectionNumber}
                  </span>
                  <h4 style={{ fontSize: 15, fontWeight: 650, color: '#0F172A', margin: '4px 0 8px', fontFamily: "'Sora', sans-serif" }}>
                    {section.title}
                  </h4>
                  <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif", whiteSpace: 'pre-wrap' }}>
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderTop: '0.75px solid #E2E8F0', display: 'flex', gap: 8 }}>
              <button
                onClick={savedDocId ? handleNavigateBack : handleSaveToLibrary}
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '0 14px', height: 36, fontSize: 12, fontWeight: 500,
                  borderRadius: 6, cursor: saving ? 'not-allowed' : 'pointer',
                  background: '#FFFFFF', color: '#374151',
                  border: '0.75px solid #CBD5E1',
                  fontFamily: "'Inter', sans-serif",
                  opacity: saving ? 0.7 : 1,
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; }}
              >
                {saving ? <Loader2 size={13} style={{ animation: 'ra-spin 1s linear infinite' }} /> : <BookOpen size={13} />}
                {savedDocId ? 'View in Library' : 'Save to Library'}
              </button>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '0 14px', height: 36, fontSize: 12, fontWeight: 500,
                border: '0.75px solid #E2E8F0', borderRadius: 6,
                background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}>
                <Flag size={13} /> Generate Epics
              </button>
              <button style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '0 14px', height: 36, fontSize: 12, fontWeight: 500,
                border: '0.75px solid #E2E8F0', borderRadius: 6,
                background: '#FFFFFF', color: '#334155', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}>
                <RefreshCw size={13} /> Push to WikiHub
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes ra-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

/* ── Top Nav Chrome ── */
function CatalystTopNav() {
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
    <nav style={{
      height: 48, display: 'flex', alignItems: 'center', gap: 0,
      background: '#FFFFFF', borderBottom: '0.75px solid #E2E8F0',
      padding: '0 24px', fontFamily: "'Inter', sans-serif",
    }}>
      {HUBS.map(h => {
        const isActive = h.label === 'ProductHub';
        return (
          <button
            key={h.label}
            onClick={() => navigate(h.path)}
            style={{
              height: 48, padding: '0 14px', fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#2563EB' : '#64748B',
              background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: isActive ? '3px solid #2563EB' : '3px solid transparent',
              transition: 'color 120ms',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {h.label}
          </button>
        );
      })}
    </nav>
  );
}
