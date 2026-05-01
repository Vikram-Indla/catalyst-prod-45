import React, { useState, useCallback } from 'react';
import { Upload, X, Check, FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { DomainBadge } from './WikiTokens';
import { useTheme } from '@/hooks/useTheme';
import { useWikiDocumentUpload, useWikiDocumentStatus } from '@/hooks/useWikiData';

const DOC_TYPES = ['brd', 'architecture', 'design', 'api_doc', 'user_guide', 'meeting', 'policy', 'other'] as const;
const DOMAINS = [
  { code: 'D1', name: 'Industrial Licensing' }, { code: 'D2', name: 'Customs & Trade' },
  { code: 'D3', name: 'Chemical Permits' }, { code: 'D4', name: 'Environmental Compliance' },
  { code: 'D5', name: 'Industrial Incentives' }, { code: 'D6', name: 'Fourth Industrial Revolution' },
  { code: 'D7', name: 'Workforce & Industrial Support' }, { code: 'D8', name: 'Senaei Platform' },
  { code: 'D9', name: 'Mining & Mineral Resources' },
];
const ACCEPT = '.pdf,.docx,.xlsx,.pptx,.md,.txt,.csv';

interface FileEntry {
  file: File; domain: string; docType: string; purpose: string;
  version: string; language: string; linkedEpic: string;
}

interface Props { open: boolean; onClose: () => void; }

function DocStatusPoller({ docId, fileName }: { docId: string; fileName: string }) {
  const { data: status } = useWikiDocumentStatus(docId);
  const { isDark } = useTheme();
  const isDone = status?.status === 'complete';
  const isFailed = status?.status === 'failed';

  const steps = [
    { label: 'Parsing document', done: isDone || ['chunking', 'embedding', 'complete'].includes(status?.status || '') },
    { label: 'Chunking content', done: isDone || ['embedding', 'complete'].includes(status?.status || '') },
    { label: 'Generating embeddings', done: isDone },
    { label: 'Indexing', done: isDone },
  ];

  return (
    <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)', marginBottom: 8 }}>{fileName}</div>
      {isFailed ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--cp-danger-60)' }}>
          <AlertCircle size={12} /> Processing failed: {status?.error_message || 'Unknown error'}
        </div>
      ) : (
        steps.map((s, si) => (
          <div key={si} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 11, color: s.done ? 'var(--cp-success-60)' : (isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)') }}>
            {s.done ? <Check size={12} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: si === 0 && !isDone ? 'var(--cp-primary-60)' : (isDark ? 'var(--ds-border, #2E2E2E)' : 'var(--cp-border-default)'), animation: si === 0 && !isDone ? 'wiki-pulse 1.5s ease-in-out infinite' : 'none' }} />}
            {s.label}
          </div>
        ))
      )}
      {isDone && status && (
        <div style={{ fontSize: 10, color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)', marginTop: 6, fontFamily: 'var(--cp-font-mono)' }}>
          {status.pages_extracted ?? 0} pages · {status.words_extracted ?? 0} words · {status.chunks_generated ?? 0} chunks
        </div>
      )}
    </div>
  );
}

export function WikiUploadWizard({ open, onClose }: Props) {
  const { isDark } = useTheme();
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ id: string; name: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadMutation = useWikiDocumentUpload();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).slice(0, 5);
    setFiles(prev => [...prev, ...dropped.map(f => ({ file: f, domain: 'D1', docType: 'other', purpose: '', version: '1.0', language: 'en', linkedEpic: '' }))].slice(0, 5));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const added = Array.from(e.target.files).slice(0, 5);
    setFiles(prev => [...prev, ...added.map(f => ({ file: f, domain: 'D1', docType: 'other', purpose: '', version: '1.0', language: 'en', linkedEpic: '' }))].slice(0, 5));
  };

  const updateFile = (idx: number, key: keyof FileEntry, val: string) => {
    setFiles(prev => prev.map((f, i) => i === idx ? { ...f, [key]: val } : f));
  };

  const removeFile = (idx: number) => setFiles(prev => prev.filter((_, i) => i !== idx));

  const handleProcess = async () => {
    setUploading(true);
    setUploadError(null);
    const results: Array<{ id: string; name: string }> = [];

    for (const f of files) {
      try {
        const doc = await uploadMutation.mutateAsync({
          file: f.file,
          domain_code: f.domain,
          doc_type: f.docType,
          purpose: f.purpose,
          version: f.version,
          language: f.language,
          linked_epic: f.linkedEpic || undefined,
        });
        results.push({ id: doc.id, name: f.file.name });
      } catch (err: any) {
        setUploadError(`Failed to upload ${f.file.name}: ${err.message}`);
        break;
      }
    }

    setUploadedDocs(results);
    setUploading(false);
  };

  const handleReset = () => {
    setStep(1);
    setFiles([]);
    setUploadedDocs([]);
    setUploadError(null);
  };

  if (!open) return null;

  const progressPct = step * 25;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998,
      background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        width: 640, maxHeight: '85vh', background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--cp-bg-elevated)',
        borderRadius: 12, boxShadow: isDark ? '0 16px 48px rgba(0,0,0,0.4)' : 'var(--cp-shadow-overlay)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)',
      }}>
        {/* Header + Progress */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 16, fontWeight: 650, fontFamily: 'var(--cp-font-body)', color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)' }}>Upload Documents</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)', padding: 4 }}><X size={16} /></button>
          </div>
          <div style={{ height: 3, background: isDark ? 'var(--cp-bg-page, #1F1F21)' : 'var(--cp-bg-sunken)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--cp-primary-60)', transition: 'width 300ms', borderRadius: 2 }} />
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 8, marginBottom: 12 }}>
            {['Select Files', 'Classify', 'Review', 'Processing'].map((label, i) => (
              <span key={i} style={{
                fontSize: 10, fontWeight: step > i ? 650 : 500, flex: 1, textAlign: 'center',
                color: step > i ? 'var(--cp-primary-60)' : step === i + 1 ? (isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)') : (isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)'),
              }}>{label}</span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {step === 1 && (
            <>
              <div
                onDragOver={e => e.preventDefault()} onDrop={handleDrop}
                style={{
                  border: isDark ? '2px dashed #2E2E2E' : '2px dashed var(--cp-border-default)', borderRadius: 6,
                  padding: 40, textAlign: 'center', cursor: 'pointer',
                  background: isDark ? 'var(--cp-bg-surface, #242528)' : 'var(--cp-bg-surface)', marginBottom: 16,
                }}
                onClick={() => document.getElementById('wiki-file-input')?.click()}
              >
                <Upload size={28} style={{ color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)' }}>Drop files here or click to browse</div>
                <div style={{ fontSize: 11, color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)', marginTop: 4 }}>PDF, DOCX, XLSX, PPTX, MD, TXT, CSV · Max 50MB · Up to 5 files</div>
                <input id="wiki-file-input" type="file" multiple accept={ACCEPT} onChange={handleFileInput} style={{ display: 'none' }} />
              </div>
              {files.map((f, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                  borderRadius: 4, border: isDark ? '1px solid #292929' : '1px solid var(--cp-border-subtle)', marginBottom: 4,
                }}>
                  <FileText size={14} style={{ color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)' }} />
                  <span style={{ flex: 1, fontSize: 12, color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.file.name}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--cp-font-mono)', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)' }}>{(f.file.size / 1024 / 1024).toFixed(1)} MB</span>
                  <button onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)' }}><X size={12} /></button>
                </div>
              ))}
            </>
          )}

          {step === 2 && files.map((f, idx) => (
            <div key={idx} style={{ marginBottom: 20, padding: 12, borderRadius: 6, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)' }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)', marginBottom: 12 }}>{f.file.name}</div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Domain</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {DOMAINS.map(d => (
                  <button key={d.code} onClick={() => updateFile(idx, 'domain', d.code)}
                    style={{
                      fontSize: 11, fontWeight: 500, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      border: f.domain === d.code ? '1.5px solid var(--cp-primary-60)' : (isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)'),
                      background: f.domain === d.code ? 'var(--cp-primary-5)' : 'transparent',
                      color: f.domain === d.code ? 'var(--cp-primary-60)' : (isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)'),
                    }}>
                    <span style={{ fontFamily: 'var(--cp-font-mono)', marginInlineEnd: 4 }}>{d.code}</span>{d.name}
                  </button>
                ))}
              </div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Document Type</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                {DOC_TYPES.map(t => (
                  <button key={t} onClick={() => updateFile(idx, 'docType', t)}
                    style={{
                      fontSize: 11, fontWeight: 500, padding: '4px 8px', borderRadius: 4, cursor: 'pointer',
                      border: f.docType === t ? '1.5px solid var(--cp-primary-60)' : (isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)'),
                      background: f.docType === t ? 'var(--cp-primary-5)' : 'transparent',
                      color: f.docType === t ? 'var(--cp-primary-60)' : (isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)'),
                      textTransform: 'capitalize',
                    }}>{t.replace(/_/g, ' ')}</button>
                ))}
              </div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Purpose</label>
              <textarea value={f.purpose} onChange={e => updateFile(idx, 'purpose', e.target.value)} rows={2}
                style={{ width: '100%', fontSize: 12, padding: 8, borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: 'transparent', color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)', resize: 'vertical', outline: 'none', marginBottom: 8 }}
                placeholder="Brief description of this document's purpose..." />
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Version</label>
                  <input value={f.version} onChange={e => updateFile(idx, 'version', e.target.value)}
                    style={{ width: '100%', fontSize: 12, padding: '6px 8px', borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: 'transparent', color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)', fontFamily: 'var(--cp-font-body)', outline: 'none' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Language</label>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <div style={{
                      flex: 1, fontSize: 11, fontWeight: 500, padding: '5px 8px', borderRadius: 4,
                      border: '1.5px solid var(--cp-primary-60)',
                      background: 'var(--cp-primary-5)',
                      color: 'var(--cp-primary-60)', textAlign: 'center',
                    }}>English</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {step === 3 && (
            <>
              <div style={{ fontSize: 12, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', marginBottom: 16 }}>
                Review your uploads before processing:
              </div>
              <div style={{ border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', borderRadius: 6, overflow: 'hidden' }}>
                {files.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    borderBottom: i < files.length - 1 ? (isDark ? '0.75px solid #292929' : '0.75px solid var(--cp-border-subtle)') : 'none',
                  }}>
                    <FileText size={14} style={{ color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)' }} />
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: isDark ? 'var(--ds-text, #EDEDED)' : 'var(--cp-text-primary)' }}>{f.file.name}</span>
                    <DomainBadge code={f.domain} />
                    <span style={{ fontSize: 10, color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)', textTransform: 'capitalize' }}>{f.docType.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, padding: 12, borderRadius: 6, background: isDark ? 'rgba(37,99,235,0.08)' : 'var(--cp-primary-5)', fontSize: 12, color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)' }}>
                <strong>What happens next:</strong> Each file will be uploaded to storage, parsed, chunked into semantic segments, and embedded into the knowledge base for AI-powered search and article generation.
              </div>
            </>
          )}

          {step === 4 && (
            <div>
              {uploading && (
                <div style={{ padding: 24, textAlign: 'center', color: isDark ? 'var(--ds-text-subtlest, #878787)' : 'var(--cp-text-muted)', fontSize: 12 }}>
                  Uploading files to storage...
                </div>
              )}

              {uploadError && (
                <div style={{ padding: 12, borderRadius: 6, background: 'var(--cp-danger-5)', color: 'var(--cp-danger-60)', fontSize: 12, marginBottom: 16 }}>
                  {uploadError}
                </div>
              )}

              {uploadedDocs.map(doc => (
                <DocStatusPoller key={doc.id} docId={doc.id} fileName={doc.name} />
              ))}

              {!uploading && uploadedDocs.length === files.length && uploadedDocs.length > 0 && (
                <div style={{ padding: 16, borderRadius: 6, background: 'var(--cp-lozenge-green-bg)', textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 650, color: 'var(--cp-lozenge-green-text)', marginBottom: 8 }}>✓ All documents uploaded</div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button onClick={onClose} style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 4, border: 'none', background: 'var(--cp-primary-60)', color: 'var(--cp-on-primary)', cursor: 'pointer' }}>View in Wiki</button>
                    <button onClick={handleReset} style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: 'transparent', color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', cursor: 'pointer' }}>Upload More</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div style={{ padding: '12px 20px', borderTop: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {step > 1 && <button onClick={() => setStep(s => s - 1)} style={{ fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 4, border: isDark ? '1px solid #2E2E2E' : '1px solid var(--cp-border-default)', background: 'transparent', color: isDark ? 'var(--ds-text-subtlest, #A1A1A1)' : 'var(--cp-text-secondary)', cursor: 'pointer' }}>Back</button>}
            <button
              disabled={step === 1 && files.length === 0}
              onClick={() => { if (step === 3) { setStep(4); handleProcess(); } else setStep(s => s + 1); }}
              style={{
                fontSize: 12, fontWeight: 600, padding: '6px 16px', borderRadius: 4, border: 'none', cursor: 'pointer',
                background: files.length === 0 && step === 1 ? (isDark ? 'var(--ds-border, #2E2E2E)' : 'var(--cp-border-default)') : 'var(--cp-primary-60)', color: 'var(--cp-on-primary)',
                display: 'flex', alignItems: 'center', gap: 4, opacity: files.length === 0 && step === 1 ? 0.5 : 1,
              }}>
              {step === 3 ? 'Start Processing' : 'Next'} <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
