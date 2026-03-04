/**
 * ReqAssistIntakeDrawer — Intake Drawer (GOD-TIER rebuild)
 * Right-side overlay, 480px, 3 tabs
 * All white background, custom dropdowns, enterprise labels
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Link, Sparkles, ChevronDown } from 'lucide-react';
import { useDomainTags } from '@/hooks/useReqAssist';
import type { IntakeTab } from '@/types/reqAssist';

interface Props {
  open: boolean;
  onClose: () => void;
}

const TABS: { key: IntakeTab; label: string; icon: React.ReactNode }[] = [
  { key: 'upload_pdf', label: 'Upload PDF', icon: <Upload size={14} /> },
  { key: 'generate_text', label: 'Generate from Text', icon: <FileText size={14} /> },
  { key: 'import_jira', label: 'Import from Jira', icon: <Link size={14} /> },
];

const LANGUAGES = ['English', 'Arabic'];

/* ═══════════════════════════════════════════════════════════════════
   CUSTOM DROPDOWN (replaces banned native <select>)
   ═══════════════════════════════════════════════════════════════════ */
function CustomDropdown({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%', height: 36, borderRadius: 4,
          border: '1px solid rgba(15,23,42,0.14)',
          background: '#FFFFFF', padding: '0 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontFamily: "'Inter', sans-serif", fontSize: 13,
          color: value ? '#0F172A' : '#94A3B8',
          cursor: 'pointer', transition: 'border-color 80ms',
          outline: 'none',
        }}
        onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
        onBlur={e => { if (!open) e.currentTarget.style.borderColor = 'rgba(15,23,42,0.14)'; }}
      >
        <span>{value || placeholder}</span>
        <ChevronDown size={16} style={{ color: '#94A3B8', flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0,
          marginTop: 4, zIndex: 50,
          background: '#FFFFFF',
          border: '1px solid rgba(15,23,42,0.12)',
          borderRadius: 6,
          boxShadow: '0 4px 6px rgba(0,0,0,0.07)',
          maxHeight: 200, overflowY: 'auto',
          padding: '4px 0',
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={{
                height: 32, padding: '0 12px',
                display: 'flex', alignItems: 'center',
                fontFamily: "'Inter', sans-serif", fontSize: 13,
                color: opt === value ? '#2563EB' : '#0F172A',
                background: opt === value ? 'rgba(37,99,235,0.06)' : 'transparent',
                cursor: 'pointer', transition: 'background 80ms',
              }}
              onMouseEnter={e => {
                if (opt !== value) e.currentTarget.style.background = 'rgba(15,23,42,0.04)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = opt === value ? 'rgba(37,99,235,0.06)' : 'transparent';
              }}
            >
              {opt}
            </div>
          ))}
          {options.length === 0 && (
            <div style={{
              height: 32, padding: '0 12px',
              display: 'flex', alignItems: 'center',
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#94A3B8',
            }}>
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN DRAWER
   ═══════════════════════════════════════════════════════════════════ */
export default function ReqAssistIntakeDrawer({ open, onClose }: Props) {
  const [tab, setTab] = useState<IntakeTab>('upload_pdf');
  const [dragOver, setDragOver] = useState(false);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.25)', zIndex: 399,
        }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="New Document"
        style={{
          position: 'fixed', top: 48, right: 0, bottom: 0,
          width: 480, background: '#FFFFFF',
          borderLeft: '1px solid rgba(15,23,42,0.12)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          zIndex: 400,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, padding: '0 20px',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: "'Sora', sans-serif", fontSize: 16, fontWeight: 600, color: '#0F172A',
          }}>
            New Document
          </span>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(15,23,42,0.04)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X size={18} style={{ color: '#64748B' }} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(15,23,42,0.08)',
          flexShrink: 0,
        }}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 40, padding: '0 14px', border: 'none', background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif", fontSize: 13,
                  fontWeight: isActive ? 650 : 500,
                  color: isActive ? '#2563EB' : '#64748B',
                  borderBottom: isActive ? '2px solid #2563EB' : '2px solid transparent',
                  marginBottom: -1, transition: 'all 80ms',
                }}
              >
                {t.icon}{t.label}
              </button>
            );
          })}
        </div>

        {/* Content — all white */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#FFFFFF' }}>
          {tab === 'upload_pdf' && <UploadPdfTab dragOver={dragOver} setDragOver={setDragOver} />}
          {tab === 'generate_text' && <GenerateTextTab />}
          {tab === 'import_jira' && <ImportJiraTab />}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 1: Upload PDF
   ═══════════════════════════════════════════════════════════════════ */
function UploadPdfTab({ dragOver, setDragOver }: { dragOver: boolean; setDragOver: (v: boolean) => void }) {
  const [domainTag, setDomainTag] = useState('');
  const [language, setLanguage] = useState('English');
  const { data: domainTags = [] } = useDomainTags();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convert domain tags to string array
  const domainOptions = Array.isArray(domainTags)
    ? domainTags.map((t: any) => typeof t === 'string' ? t : t.domain_tag || t.name || String(t))
    : [];

  return (
    <div>
      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); }}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: dragOver ? '2px dashed #2563EB' : '2px dashed rgba(15,23,42,0.15)',
          borderRadius: 8, padding: 36, textAlign: 'center',
          background: dragOver ? 'rgba(37,99,235,0.02)' : 'transparent',
          transition: 'all 150ms', cursor: 'pointer',
        }}
        onMouseEnter={e => {
          if (!dragOver) {
            e.currentTarget.style.borderColor = '#2563EB';
            e.currentTarget.style.background = 'rgba(37,99,235,0.02)';
          }
        }}
        onMouseLeave={e => {
          if (!dragOver) {
            e.currentTarget.style.borderColor = 'rgba(15,23,42,0.15)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        <Upload size={32} style={{ color: '#94A3B8', marginBottom: 12 }} />
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 500, color: '#0F172A',
        }}>
          Drop a PDF here or browse
        </div>
        <div style={{
          fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#94A3B8', marginTop: 4,
        }}>
          Supports BRD documents up to 50MB
        </div>
        <div
          onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
          style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#2563EB',
            cursor: 'pointer', marginTop: 8, fontWeight: 500,
          }}
        >
          Browse files
        </div>
        <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} />
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel label="Domain Tag">
          <CustomDropdown
            value={domainTag}
            options={domainOptions}
            placeholder="Select domain..."
            onChange={setDomainTag}
          />
        </FieldLabel>
        <FieldLabel label="Language">
          <CustomDropdown
            value={language}
            options={LANGUAGES}
            placeholder="Select language..."
            onChange={setLanguage}
          />
        </FieldLabel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#334155',
          }}>
            Process on upload
          </span>
          <ToggleSwitch />
        </div>
      </div>

      <PrimaryButton label="Upload & Process" style={{ marginTop: 20 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 2: Generate from Text
   ═══════════════════════════════════════════════════════════════════ */
function GenerateTextTab() {
  const [domain, setDomain] = useState('');
  const { data: domainTags = [] } = useDomainTags();
  const domainOptions = Array.isArray(domainTags)
    ? domainTags.map((t: any) => typeof t === 'string' ? t : t.domain_tag || t.name || String(t))
    : [];

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel label="Document Title">
          <input
            placeholder="Enter document title..."
            style={{
              width: '100%', height: 36, borderRadius: 4, padding: '0 12px',
              border: '1px solid rgba(15,23,42,0.14)', background: '#FFFFFF',
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#0F172A',
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(15,23,42,0.14)')}
          />
        </FieldLabel>
        <FieldLabel label="BRD Content">
          <textarea
            placeholder="Paste or type your BRD requirements here..."
            style={{
              width: '100%', height: 200, borderRadius: 4, padding: 12,
              border: '1px solid rgba(15,23,42,0.14)', background: '#FFFFFF',
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#0F172A',
              outline: 'none', resize: 'vertical',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(15,23,42,0.14)')}
          />
        </FieldLabel>
        <FieldLabel label="Domain">
          <CustomDropdown
            value={domain}
            options={domainOptions}
            placeholder="Select domain..."
            onChange={setDomain}
          />
        </FieldLabel>
      </div>

      {/* AI badge */}
      <div style={{
        marginTop: 16, padding: 12, borderRadius: 6,
        background: 'rgba(124,58,237,0.08)',
        border: '1px solid rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Sparkles size={14} style={{ color: '#7C3AED', flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Inter', sans-serif", fontSize: 12, color: '#334155',
        }}>
          AI will structure and score this document automatically
        </span>
      </div>

      <PrimaryButton label="Generate & Process" style={{ marginTop: 20 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   Tab 3: Import from Jira
   ═══════════════════════════════════════════════════════════════════ */
function ImportJiraTab() {
  const [projectKey, setProjectKey] = useState('');
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel label="Project Key or JQL">
          <input
            value={projectKey}
            onChange={e => setProjectKey(e.target.value)}
            placeholder="e.g. SEN or project = SEN AND issuetype = BRD"
            style={{
              width: '100%', height: 36, borderRadius: 4, padding: '0 12px',
              border: '1px solid rgba(15,23,42,0.14)', background: '#FFFFFF',
              fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#0F172A',
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#2563EB')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(15,23,42,0.14)')}
          />
        </FieldLabel>
        <FieldLabel label="Import Mode">
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ key: 'all', label: 'All BRDs in project' }, { key: 'selected', label: 'Selected issues only' }].map(o => (
              <button
                key={o.key}
                onClick={() => setMode(o.key as 'all' | 'selected')}
                style={{
                  flex: 1, height: 36, borderRadius: 6,
                  border: mode === o.key ? '1px solid #2563EB' : '1px solid rgba(15,23,42,0.14)',
                  background: mode === o.key ? 'rgba(37,99,235,0.06)' : '#FFFFFF',
                  fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
                  color: mode === o.key ? '#2563EB' : '#64748B',
                  cursor: 'pointer', transition: 'all 80ms',
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </FieldLabel>
      </div>

      {projectKey.length > 2 && (
        <div style={{
          marginTop: 16, padding: 12, borderRadius: 6,
          background: '#F8FAFC',
          border: '1px solid rgba(15,23,42,0.08)',
        }}>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#0F172A',
          }}>
            12 BRD documents found
          </span>
        </div>
      )}

      <PrimaryButton label="Import BRDs" style={{ marginTop: 20 }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SHARED SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 500,
        textTransform: 'uppercase' as const, letterSpacing: '0.04em',
        color: '#64748B', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleSwitch() {
  const [on, setOn] = useState(true);
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        width: 36, height: 20, borderRadius: 10, border: 'none',
        background: on ? '#2563EB' : '#CBD5E1',
        cursor: 'pointer', position: 'relative', transition: 'background 150ms',
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: '50%', background: '#FFFFFF',
        position: 'absolute', top: 2,
        left: on ? 18 : 2, transition: 'left 150ms',
        boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
      }} />
    </button>
  );
}

function PrimaryButton({ label, style }: { label: string; style?: React.CSSProperties }) {
  return (
    <button
      style={{
        width: '100%', height: 36, borderRadius: 6, border: 'none',
        background: '#2563EB', color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 500,
        cursor: 'pointer', transition: 'background 80ms', ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')}
      onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
    >
      {label}
    </button>
  );
}
