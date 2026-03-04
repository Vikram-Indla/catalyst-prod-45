/**
 * ReqAssistIntakeDrawer — 560px right-slide drawer, 3 tabs
 * CORRECTIVE BUILD — ra-* ring-fenced CSS
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Link, Sparkles, Star, ChevronDown } from 'lucide-react';
import { useCreateBrdDocument, useEnqueueDocument, useBrdDocuments } from '@/hooks/useReqAssist';
import { toast } from 'sonner';
import type { IntakeTab, SourceType } from '@/types/reqAssist';
import '@/styles/ra-styles.css';

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: IntakeTab;
}

const TABS: { key: IntakeTab; label: string; icon: React.ReactNode }[] = [
  { key: 'upload_pdf', label: 'Upload PDF', icon: <Upload size={14} /> },
  { key: 'generate_text', label: 'Generate from Text', icon: <FileText size={14} /> },
  { key: 'import_jira', label: 'Import from Jira', icon: <Link size={14} /> },
];

const DOMAIN_OPTIONS = [
  'Auto-detect', 'Industrial Licensing', 'Customs & Trade',
  'Chemical Permits', 'Environmental Compliance', 'Mining & Mineral Resources',
];

const METHODOLOGIES = [
  { key: 'kpmg', name: 'KPMG', sub: '16 sections' },
  { key: 'mckinsey', name: 'McKinsey', sub: '14 sections' },
  { key: 'deloitte', name: 'Deloitte', sub: '15 sections' },
];

const JIRA_PROJECTS = [
  'SEN — Senaei Platform',
  'MDT — Ministry Digital Transformation',
  'SIMP — SIMP Project',
];

const IMPORT_MODES = [
  { key: 'full', name: 'Full Sync', sub: 'All PDFs' },
  { key: 'delta', name: 'Delta Only', sub: 'New since last' },
  { key: 'single', name: 'Single Issue', sub: 'By Jira key' },
];

/* ═══ Custom Dropdown ═══ */
function RaDropdown({ value, options, placeholder, onChange }: {
  value: string; options: string[]; placeholder: string; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', height: 36, borderRadius: 4,
          border: '1px solid var(--ra-border-def)', background: '#FFFFFF',
          padding: '0 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13, color: value ? 'var(--ra-text-pri)' : 'var(--ra-text-muted)', cursor: 'pointer',
        }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={14} style={{ color: 'var(--ra-text-muted)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 50,
          background: '#FFFFFF', border: '1px solid var(--ra-border-def)', borderRadius: 6,
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)', maxHeight: 200, overflowY: 'auto', padding: '4px 0',
        }}>
          {options.map(o => (
            <div key={o} onClick={() => { onChange(o); setOpen(false); }}
              style={{
                height: 32, padding: '0 12px', display: 'flex', alignItems: 'center',
                fontSize: 13, color: o === value ? 'var(--ra-blue)' : 'var(--ra-text-pri)',
                background: o === value ? 'var(--ra-selected)' : 'transparent', cursor: 'pointer',
              }}
              onMouseEnter={e => { if (o !== value) (e.currentTarget.style.background = 'var(--ra-hover)'); }}
              onMouseLeave={e => { e.currentTarget.style.background = o === value ? 'var(--ra-selected)' : 'transparent'; }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══ MAIN DRAWER ═══ */
export default function ReqAssistIntakeDrawer({ open, onClose, initialTab }: Props) {
  const [tab, setTab] = useState<IntakeTab>('upload_pdf');

  // Reset tab when drawer opens or initialTab changes
  useEffect(() => {
    if (open) setTab(initialTab || 'upload_pdf');
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open, onClose]);

  return (
    <>
      <div className={`ra-dro ${open ? 'show' : ''}`} onClick={onClose} />
      <div className={`ra-dr ${open ? 'show' : ''}`}>
        <div className="ra-dr-hd">
          <h2>New Document</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} style={{ color: 'var(--ra-text-ter)' }} />
          </button>
        </div>
        <div className="ra-dr-tabs">
          {TABS.map(t => (
            <button key={t.key} className={`ra-drt ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="ra-dr-bd">
          {tab === 'upload_pdf' && <UploadTab onClose={onClose} />}
          {tab === 'generate_text' && <GenerateTab onClose={onClose} />}
          {tab === 'import_jira' && <JiraTab onClose={onClose} />}
        </div>
      </div>
    </>
  );
}

/* ═══ TAB 1: Upload PDF ═══ */
function UploadTab({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [jiraKey, setJiraKey] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createDoc = useCreateBrdDocument();
  const enqueue = useEnqueueDocument();

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Please enter a document title'); return; }
    try {
      const doc = await createDoc.mutateAsync({
        title: title.trim(), source_type: 'manual_upload' as SourceType,
        pipeline_stage: 'intake', language: 'en',
        domain_tag: domain === 'Auto-detect' ? null : domain || null,
        jira_key: jiraKey || null, original_url: null, content_hash: null,
        raw_text: null, json_data: null, extraction_tier: null,
        quality_score: null, methodology: null, processed_at: null,
      } as any);
      await enqueue.mutateAsync(doc.id);
      toast.success('BRD queued for processing');
      onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to create document'); }
  };

  return (
    <div>
      <FieldLabel label="Document Title" hint="Optional — auto-detected from PDF">
        <input className="ra-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter document title..." />
      </FieldLabel>

      <FieldLabel label="Upload Document" style={{ marginTop: 16 }}>
        <div
          className="ra-dz"
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); }}
          onClick={() => fileRef.current?.click()}
          style={dragOver ? { borderColor: 'var(--ra-blue)', background: 'var(--ra-blue-5)' } : {}}
        >
          <Upload size={28} style={{ color: 'var(--ra-text-muted)', marginBottom: 8 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ra-text-pri)' }}>Drop PDF or DOCX here, or click to browse</div>
          <div style={{ fontSize: 12, color: 'var(--ra-text-muted)', marginTop: 4 }}>Arabic + English · Max 100 pages · Two-tier extraction</div>
          <input ref={fileRef} type="file" accept=".pdf,.docx" style={{ display: 'none' }} />
        </div>
      </FieldLabel>

      <FieldLabel label="Domain Tag" hint="Used for WikiHub categorization and RAG filtering" style={{ marginTop: 16 }}>
        <RaDropdown value={domain} options={DOMAIN_OPTIONS} placeholder="Select domain..." onChange={setDomain} />
      </FieldLabel>

      <FieldLabel label="Jira Key (optional)" style={{ marginTop: 16 }}>
        <input className="ra-input" value={jiraKey} onChange={e => setJiraKey(e.target.value)} placeholder="SEN-BRD009" />
      </FieldLabel>

      {/* Pipeline Preview */}
      <div className="ra-pip-preview" style={{ borderColor: 'var(--ra-teal-10)', background: 'var(--ra-teal-5)', marginTop: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ra-teal)', letterSpacing: '0.06em', marginBottom: 6 }}>Pipeline Preview</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--ra-text-sec)' }}>
          Upload → Extract → Translate (if Arabic) → Validate → Distribute → Complete
        </div>
        <div style={{ fontSize: 11, color: 'var(--ra-text-muted)', marginTop: 4 }}>Estimated: ~2–4 min for large documents · You'll be notified when complete</div>
      </div>

      <div className="ra-dr-ft" style={{ padding: '16px 0', borderTop: 'none' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ra-text-ter)', cursor: 'pointer' }}>Cancel</button>
        <button className="ra-btn-start" onClick={handleSubmit} disabled={createDoc.isPending}>
          <Star size={14} /> {createDoc.isPending ? 'Starting...' : 'Start Pipeline'}
        </button>
      </div>
    </div>
  );
}

/* ═══ TAB 2: Generate from Text ═══ */
function GenerateTab({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [methodology, setMethodology] = useState('kpmg');
  const [content, setContent] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const createDoc = useCreateBrdDocument();
  const enqueue = useEnqueueDocument();

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('Please enter a document title'); return; }
    try {
      const doc = await createDoc.mutateAsync({
        title: title.trim(), source_type: 'ai_generated' as SourceType,
        pipeline_stage: 'intake', language: 'en',
        domain_tag: null, jira_key: null, original_url: null, content_hash: null,
        raw_text: content || null, json_data: null, extraction_tier: null,
        quality_score: null, methodology, processed_at: null,
      } as any);
      await enqueue.mutateAsync(doc.id);
      toast.success('BRD queued for processing');
      onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to create document'); }
  };

  return (
    <div>
      <FieldLabel label="Document Title">
        <input className="ra-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Enter document title..." />
      </FieldLabel>

      <FieldLabel label="Methodology Framework" style={{ marginTop: 16 }}>
        <div className="ra-ro-group">
          {METHODOLOGIES.map(m => (
            <div key={m.key} className={`ra-ro ${methodology === m.key ? 'sel' : ''}`} onClick={() => setMethodology(m.key)}>
              <div className="ra-ro-n">{m.name}</div>
              <div className="ra-ro-s">{m.sub}</div>
            </div>
          ))}
        </div>
      </FieldLabel>

      <FieldLabel label="Requirements Input" hint="The AI will structure this into a full BRD with the selected framework" style={{ marginTop: 16 }}>
        <textarea
          className="ra-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Paste your requirements, brief, or scope document..."
          style={{ minHeight: 120 }}
        />
      </FieldLabel>

      <FieldLabel label="Or Upload Source Document" style={{ marginTop: 16 }}>
        <div className="ra-dz" onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); }}
          style={dragOver ? { borderColor: 'var(--ra-blue)', background: 'var(--ra-blue-5)' } : {}}
        >
          <Upload size={24} style={{ color: 'var(--ra-text-muted)', marginBottom: 6 }} />
          <div style={{ fontSize: 13, color: 'var(--ra-text-sec)' }}>Drop source material here</div>
          <div style={{ fontSize: 11, color: 'var(--ra-text-muted)', marginTop: 2 }}>PDF, DOCX, or TXT · Max 50 pages</div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" style={{ display: 'none' }} />
        </div>
      </FieldLabel>

      {/* AI Pipeline Preview */}
      <div className="ra-pip-preview" style={{ borderColor: 'var(--ra-purple-10)', background: 'var(--ra-purple-5)', marginTop: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ra-purple)', letterSpacing: '0.06em', marginBottom: 6 }}>AI Pipeline</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--ra-text-sec)' }}>
          REC-PARSE → REC-CONTEXT → REC-BRD-ARCH → REC-EXTRACT → REC-QA
        </div>
        <div style={{ fontSize: 11, color: 'var(--ra-text-muted)', marginTop: 4 }}>Anti-hallucination: 2 retry loops · Estimated: ~35s</div>
      </div>

      <div className="ra-dr-ft" style={{ padding: '16px 0', borderTop: 'none' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ra-text-ter)', cursor: 'pointer' }}>Cancel</button>
        <button className="ra-btn-start" onClick={handleSubmit} disabled={createDoc.isPending}>
          <Star size={14} /> {createDoc.isPending ? 'Starting...' : 'Start Pipeline'}
        </button>
      </div>
    </div>
  );
}

/* ═══ TAB 3: Import from Jira ═══ */
function JiraTab({ onClose }: { onClose: () => void }) {
  const [project, setProject] = useState('');
  const [mode, setMode] = useState('full');
  const { data: documents } = useBrdDocuments();
  const createDoc = useCreateBrdDocument();
  const enqueue = useEnqueueDocument();
  const docCount = documents?.length ?? 0;

  const handleSubmit = async () => {
    if (!project) { toast.error('Please select a Jira project'); return; }
    try {
      const doc = await createDoc.mutateAsync({
        title: `Jira Import: ${project.split(' — ')[0]}`,
        source_type: 'jira_bulk' as SourceType,
        pipeline_stage: 'intake', language: 'en',
        domain_tag: null, jira_key: project.split(' — ')[0],
        original_url: null, content_hash: null, raw_text: null,
        json_data: null, extraction_tier: null, quality_score: null,
        methodology: null, processed_at: null,
      } as any);
      await enqueue.mutateAsync(doc.id);
      toast.success('BRD queued for processing');
      onClose();
    } catch (err: any) { toast.error(err.message || 'Failed to import'); }
  };

  return (
    <div>
      <FieldLabel label="Jira Project">
        <RaDropdown value={project} options={JIRA_PROJECTS} placeholder="Select project..." onChange={setProject} />
      </FieldLabel>

      <FieldLabel label="Import Mode" style={{ marginTop: 16 }}>
        <div className="ra-ro-group">
          {IMPORT_MODES.map(m => (
            <div key={m.key} className={`ra-ro ${mode === m.key ? 'sel' : ''}`} onClick={() => setMode(m.key)}>
              <div className="ra-ro-n">{m.name}</div>
              <div className="ra-ro-s">{m.sub}</div>
            </div>
          ))}
        </div>
      </FieldLabel>

      {/* Jira Connection Preview */}
      <div className="ra-pip-preview" style={{ borderColor: 'var(--ra-blue-10)', background: 'var(--ra-blue-5)', marginTop: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--ra-blue)', letterSpacing: '0.06em', marginBottom: 6 }}>Jira Connection</div>
        <div style={{ fontSize: 13, color: 'var(--ra-text-sec)' }}>
          SEN project · {docCount} issues with PDF attachments
        </div>
        <div style={{ fontSize: 11, color: 'var(--ra-text-muted)', marginTop: 4 }}>Each PDF enters the pipeline automatically · ~1–4 min per document</div>
      </div>

      <div className="ra-dr-ft" style={{ padding: '16px 0', borderTop: 'none' }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 13, color: 'var(--ra-text-ter)', cursor: 'pointer' }}>Cancel</button>
        <button className="ra-btn-start" onClick={handleSubmit} disabled={createDoc.isPending}>
          <Star size={14} /> {createDoc.isPending ? 'Starting...' : 'Start Pipeline'}
        </button>
      </div>
    </div>
  );
}

/* ═══ Shared ═══ */
function FieldLabel({ label, hint, children, style }: { label: string; hint?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label className="ra-field-label">{label}</label>
      {children}
      {hint && <div className="ra-field-hint">{hint}</div>}
    </div>
  );
}
