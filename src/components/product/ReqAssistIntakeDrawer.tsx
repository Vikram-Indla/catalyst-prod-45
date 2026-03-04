/**
 * ReqAssistIntakeDrawer — Intake Drawer (Stage C)
 * Right-side overlay, 480px, 3 tabs
 */
import React, { useState, useEffect, useCallback } from 'react';
import { X, Upload, FileText, Link, Sparkles } from 'lucide-react';
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
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 399,
        }}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-label="New Document"
        style={{
          position: 'fixed', top: 'var(--cp-layout-topnav)', right: 0, bottom: 0,
          width: 480, background: 'var(--cp-bg-elevated)',
          borderLeft: '1px solid var(--cp-border-default)',
          boxShadow: 'var(--cp-shadow-overlay)', zIndex: 400,
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 52, padding: '0 20px', borderBottom: '1px solid var(--cp-border-default)',
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: 'var(--cp-font-heading)', fontSize: 16, fontWeight: 600, color: 'var(--cp-text-primary)' }}>
            New Document
          </span>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 32, height: 32, border: 'none', background: 'transparent',
              cursor: 'pointer', borderRadius: 4,
            }}
          >
            <X size={18} style={{ color: 'var(--cp-text-tertiary)' }} />
          </button>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--cp-border-default)', flexShrink: 0 }}>
          {TABS.map(t => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  height: 40, padding: '0 14px', border: 'none', background: 'transparent',
                  cursor: 'pointer', fontFamily: 'var(--cp-font-body)', fontSize: 13,
                  fontWeight: isActive ? 650 : 500,
                  color: isActive ? 'var(--cp-primary-60)' : 'var(--cp-text-secondary)',
                  borderBottom: isActive ? '2px solid var(--cp-primary-60)' : '2px solid transparent',
                  marginBottom: -1, transition: 'background 80ms',
                }}
              >
                {t.icon}{t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {tab === 'upload_pdf' && <UploadPdfTab dragOver={dragOver} setDragOver={setDragOver} />}
          {tab === 'generate_text' && <GenerateTextTab />}
          {tab === 'import_jira' && <ImportJiraTab />}
        </div>
      </div>
    </>
  );
}

/* ── Tab 1: Upload PDF ─────────────────────────────────────────── */
function UploadPdfTab({ dragOver, setDragOver }: { dragOver: boolean; setDragOver: (v: boolean) => void }) {
  return (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); }}
        style={{
          border: dragOver ? '2px dashed var(--cp-primary-60)' : '2px dashed var(--cp-border-default)',
          borderRadius: 6, padding: 40, textAlign: 'center',
          background: dragOver ? 'rgba(37,99,235,0.04)' : 'transparent',
          transition: 'all 150ms',
        }}
      >
        <Upload size={32} style={{ color: 'var(--cp-text-muted)', marginBottom: 12 }} />
        <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 14, fontWeight: 500, color: 'var(--cp-text-primary)' }}>
          Drop a PDF here or browse
        </div>
        <div style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-tertiary)', marginTop: 4 }}>
          Supports BRD documents up to 50MB
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel label="Domain Tag">
          <StubDropdown placeholder="Select domain..." />
        </FieldLabel>
        <FieldLabel label="Language">
          <StubDropdown placeholder="English" />
        </FieldLabel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-secondary)' }}>
            Process on upload
          </span>
          <ToggleSwitch />
        </div>
      </div>

      <PrimaryButton label="Upload & Process" style={{ marginTop: 20 }} />
    </div>
  );
}

/* ── Tab 2: Generate from Text ─────────────────────────────────── */
function GenerateTextTab() {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <FieldLabel label="Document Title">
          <input
            placeholder="Enter document title..."
            style={{
              width: '100%', height: 36, borderRadius: 4, padding: '0 10px',
              border: '1px solid var(--cp-border-default)', background: 'transparent',
              fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-primary)',
              outline: 'none',
            }}
          />
        </FieldLabel>
        <FieldLabel label="BRD Content">
          <textarea
            placeholder="Paste or type your BRD requirements here..."
            style={{
              width: '100%', height: 200, borderRadius: 4, padding: 10,
              border: '1px solid var(--cp-border-default)', background: 'transparent',
              fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-primary)',
              outline: 'none', resize: 'vertical',
            }}
          />
        </FieldLabel>
        <FieldLabel label="Domain">
          <StubDropdown placeholder="Select domain..." />
        </FieldLabel>
      </div>

      {/* AI badge */}
      <div style={{
        marginTop: 16, padding: 12, borderRadius: 6,
        background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Sparkles size={14} style={{ color: 'var(--cp-purple-60)', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: 'var(--cp-text-secondary)' }}>
          AI will structure and score this document automatically
        </span>
      </div>

      <PrimaryButton label="Generate & Process" style={{ marginTop: 20 }} />
    </div>
  );
}

/* ── Tab 3: Import from Jira ───────────────────────────────────── */
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
              width: '100%', height: 36, borderRadius: 4, padding: '0 10px',
              border: '1px solid var(--cp-border-default)', background: 'transparent',
              fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-primary)',
              outline: 'none',
            }}
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
                  border: mode === o.key ? '1px solid var(--cp-primary-60)' : '1px solid var(--cp-border-default)',
                  background: mode === o.key ? 'var(--cp-interact-selected)' : 'transparent',
                  fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
                  color: mode === o.key ? 'var(--cp-primary-60)' : 'var(--cp-text-secondary)',
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
          background: 'var(--cp-bg-surface)', border: '1px solid var(--cp-border-default)',
        }}>
          <span style={{ fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-primary)' }}>
            12 BRD documents found
          </span>
        </div>
      )}

      <PrimaryButton label="Import BRDs" style={{ marginTop: 20 }} />
    </div>
  );
}

/* ── Shared sub-components ─────────────────────────────────────── */
function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block', fontFamily: 'var(--cp-font-body)', fontSize: 11,
        fontWeight: 500, textTransform: 'uppercase', color: 'var(--cp-text-tertiary)',
        marginBottom: 6, letterSpacing: '0.04em',
      }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StubDropdown({ placeholder }: { placeholder: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      height: 36, padding: '0 10px', borderRadius: 6,
      border: '1px solid var(--cp-border-default)', background: 'transparent',
      fontFamily: 'var(--cp-font-body)', fontSize: 13, color: 'var(--cp-text-tertiary)',
      cursor: 'pointer',
    }}>
      {placeholder}
      <span style={{ fontSize: 10, color: 'var(--cp-text-muted)' }}>▾</span>
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
        background: on ? 'var(--cp-primary-60)' : 'var(--cp-bg-sunken)',
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
        background: 'var(--cp-primary-60)', color: '#FFFFFF',
        fontFamily: 'var(--cp-font-body)', fontSize: 13, fontWeight: 500,
        cursor: 'pointer', transition: 'background 80ms', ...style,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cp-primary-70)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--cp-primary-60)')}
    >
      {label}
    </button>
  );
}
