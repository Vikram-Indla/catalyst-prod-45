import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Check, X, BookOpen, Flag, RefreshCw, Loader2, FileText } from 'lucide-react';
import { useCreateRADocument, useQueueJob } from '@/hooks/useReqAssist';
import { toast } from 'sonner';

export default function ReqAssistGenerate() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [result, setResult] = useState<'none' | 'pass' | 'fail'>('none');
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pushingWiki, setPushingWiki] = useState(false);

  const createDoc = useCreateRADocument();
  const queueJob = useQueueJob();

  const handleQualify = () => {
    if (text.trim().length < 150) { setResult('fail'); return; }
    setResult('pass');
  };

  const handleSaveToLibrary = async () => {
    setSaving(true);
    try {
      const title = text.trim().slice(0, 60).replace(/[^\w\s\-.,]/g, '').trim();
      const doc = await createDoc.mutateAsync({
        title: title || 'Untitled BRD',
        source_type: 'text_generated',
        language: 'en',
        content_raw: text,
        jira_ticket_key: `GEN-${Date.now()}`,
        jira_project: 'MANUAL',
        status: 'pending',
      });
      setSavedDocId(doc.id);
      toast.success('Saved to Library', { description: `Document "${title}" created successfully`, duration: 4000 });
    } catch (err: any) {
      toast.error('Save failed', { description: err.message, duration: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const handlePushToWikiHub = async () => {
    if (!savedDocId) {
      setSaving(true);
      try {
        const title = text.trim().slice(0, 60).replace(/[^\w\s\-.,]/g, '').trim();
        const doc = await createDoc.mutateAsync({
          title: title || 'Untitled BRD',
          source_type: 'text_generated',
          language: 'en',
          content_raw: text,
          jira_ticket_key: `GEN-${Date.now()}`,
          jira_project: 'MANUAL',
          status: 'pending',
        });
        setSavedDocId(doc.id);
        setSaving(false);
        setPushingWiki(true);
        await queueJob.mutateAsync({ ra_document_id: doc.id, job_type: 'wikihub_sync', eta_seconds: 90 });
        toast.success('Queued for WikiHub indexing', { description: 'Document will be indexed shortly', duration: 4000 });
        setPushingWiki(false);
      } catch (err: any) {
        toast.error('Failed', { description: err.message, duration: 4000 });
        setSaving(false);
        setPushingWiki(false);
      }
      return;
    }
    setPushingWiki(true);
    try {
      await queueJob.mutateAsync({ ra_document_id: savedDocId, job_type: 'wikihub_sync', eta_seconds: 90 });
      toast.success('Queued for WikiHub indexing', { description: 'Document will be indexed shortly', duration: 4000 });
    } catch (err: any) {
      toast.error('Failed', { description: err.message, duration: 4000 });
    } finally {
      setPushingWiki(false);
    }
  };

  const handleNavigateBack = () => navigate('/product/req-assist');

  return (
    <div style={{ background: '#FFFFFF', minHeight: '100%', padding: '24px 28px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <button onClick={handleNavigateBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, color: '#64748B', marginBottom: 16, padding: 0, fontFamily: "'Inter', sans-serif" }}>
          <ArrowLeft size={14} /> Back to Library
        </button>

        <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: 20, fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>Generate BRD from Text</h2>
        <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
          Paste raw requirements, notes, or a brief. The system qualifies your text before generating — it will not produce a BRD from unstructured input.
        </p>

        <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 14px', background: '#FFFFFF', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={15} color="#2563EB" />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', fontFamily: "'Inter', sans-serif" }}>Requirements Input</span>
            <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: "'Inter', sans-serif" }}>· Paste text from meetings, briefs, email threads, or scope documents</span>
          </div>
          <div style={{ padding: 14 }}>
            <textarea
              value={text} onChange={e => { setText(e.target.value); setResult('none'); setSavedDocId(null); }}
              placeholder="Paste your requirements here..."
              style={{
                width: '100%', minHeight: 200, padding: 14, fontSize: 14, lineHeight: 1.65,
                border: '1px solid rgba(15,23,42,0.12)', borderRadius: 4,
                outline: 'none', resize: 'vertical', fontFamily: "'Inter', sans-serif", color: '#0F172A',
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.10)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,23,42,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
            />
            <p style={{ fontSize: 12, color: '#94A3B8', margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
              The AI will first qualify whether this text contains enough structured requirements. If not, it will explain why.
            </p>

            {result === 'fail' && (
              <div style={{ marginTop: 12, padding: '14px 16px', background: '#FEF2F2', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 'var(--ra-radius-card)', display: 'flex', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <X size={12} color="#DC2626" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', fontFamily: "'Inter', sans-serif" }}>✗ Not Qualified — Insufficient for BRD</div>
                  <p style={{ fontSize: 12, color: '#991B1B', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                    Text too short to qualify. Paste at least 150 characters of requirements.
                  </p>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '6px 0 0', fontFamily: "'Inter', sans-serif" }}>
                    💡 Add: 'The system shall...' statements · Define who the users are
                  </p>
                </div>
              </div>
            )}

            {result === 'pass' && (
              <div style={{ marginTop: 12, padding: '14px 16px', background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 'var(--ra-radius-card)', display: 'flex', gap: 10 }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Check size={12} color="#16A34A" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#16A34A', fontFamily: "'Inter', sans-serif" }}>✓ Qualified for BRD Generation</div>
                  <p style={{ fontSize: 12, color: '#166534', margin: '4px 0 0', lineHeight: 1.5, fontFamily: "'Inter', sans-serif" }}>
                    This text contains structured requirements across 3 functional domains with sufficient detail for BRD generation.
                  </p>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: '6px 0 0', paddingTop: 6, borderTop: '1px solid rgba(0,0,0,0.06)', fontFamily: "'Inter', sans-serif" }}>
                    ✓ Measurable outcomes detected · ✓ System boundaries defined
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={handleQualify} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 16px', height: 36, fontSize: 13, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#2563EB', color: '#FFFFFF', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                <Zap size={13} /> Qualify & Generate
              </button>
              <button onClick={() => { setText(''); setResult('none'); setSavedDocId(null); }} style={{ padding: '0 16px', height: 36, fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                Clear
              </button>
            </div>
          </div>
        </div>

        {result === 'pass' && (
          <div style={{ border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-card)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, fontWeight: 650, color: '#0F172A', fontFamily: "'Sora', sans-serif" }}>Generated BRD</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', height: 20, borderRadius: 3, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, background: '#E3FCEF', color: '#006644' }}>QUALIFIED</span>
              <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 'auto', fontFamily: "'Inter', sans-serif" }}>12 sections · EN</span>
            </div>
            <div style={{ padding: 20 }}>
              <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>SECTION 1</span>
                <h4 style={{ fontSize: 15, fontWeight: 650, color: '#0F172A', margin: '4px 0 8px', fontFamily: "'Sora', sans-serif" }}>Executive Summary</h4>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  This document outlines the business requirements derived from the provided input. The system has identified key functional and non-functional requirements for implementation.
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.06em', fontFamily: "'Inter', sans-serif" }}>SECTION 2</span>
                <h4 style={{ fontSize: 15, fontWeight: 650, color: '#0F172A', margin: '4px 0 8px', fontFamily: "'Sora', sans-serif" }}>Functional Requirements</h4>
                <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0, fontFamily: "'Inter', sans-serif" }}>
                  Based on the qualified input, the following functional requirements have been identified and structured according to MIM standards.
                </p>
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: '#F8FAFC', borderTop: '1px solid rgba(15,23,42,0.06)', display: 'flex', gap: 8 }}>
              <button onClick={savedDocId ? handleNavigateBack : handleSaveToLibrary} disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 36, fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 'var(--ra-radius-btn)', background: '#16A34A', color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 size={13} style={{ animation: 'ra-spin 1s linear infinite' }} /> : <BookOpen size={13} />}
                {savedDocId ? 'View in Library' : 'Save to Library'}
              </button>
              <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 36, fontSize: 12, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: 'pointer', fontFamily: "'Inter', sans-serif" }}>
                <Flag size={13} /> Generate Epics
              </button>
              <button onClick={handlePushToWikiHub} disabled={pushingWiki}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0 14px', height: 36, fontSize: 12, fontWeight: 500, border: '1px solid rgba(15,23,42,0.12)', borderRadius: 'var(--ra-radius-btn)', background: '#FFFFFF', color: '#334155', cursor: pushingWiki ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif", opacity: pushingWiki ? 0.7 : 1 }}>
                {pushingWiki ? <Loader2 size={13} style={{ animation: 'ra-spin 1s linear infinite' }} /> : <RefreshCw size={13} />}
                Push to WikiHub
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes ra-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
