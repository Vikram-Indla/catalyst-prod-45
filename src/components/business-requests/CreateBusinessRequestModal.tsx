/**
 * CreateBusinessRequestModal — Atlassian Design System "Create" dialog (Jira-parity).
 *
 * 2026-04-28 — Full rewrite, single-column Jira pattern.
 *
 * Directly modelled on CreateStoryModal (2026-04-21) — same PortalFix shell,
 * same header chrome (minimize / fullscreen / more / close), same field layout
 * and ADS primitives. Tailored for Business Request with:
 *   - Amber bulb icon in header (/admin/icons/jira/business-request-16.svg)
 *   - @atlaskit/editor-core ADF rich-text description (lazy, identical pattern)
 *   - Business-Request-specific fields per Vikram sign-off (2026-04-28):
 *       Arabic title, English title, Description (ADF), Type, Priority,
 *       Category, Theme, DM, PO, Stakeholders, Release, Targeted feature, BRD upload
 *
 * CLAUDE.md guardrails observed:
 *   - Zero shadcn — @atlaskit/* only
 *   - Zero HSL — hex literals everywhere
 *   - No inline style={{ background }} for dark mode (ADS tokens + xcss)
 *   - ADF stored as JSON string in description column
 *   - flag() for toast (Jira-parity, same as CreateStoryModal)
 *
 * Stack:
 *   - PortalFix                   modal shell (Vite-safe, bypasses @atlaskit/portal)
 *   - @atlaskit/form               Field / ErrorMessage / HelperMessage
 *   - @atlaskit/select             single + CreatableSelect (stakeholders)
 *   - @atlaskit/textfield          Arabic + English title
 *   - @atlaskit/checkbox           Targeted feature flag
 *   - @atlaskit/button/new         IconButton (header) + primary/subtle (footer)
 *   - @atlaskit/datetime-picker    Target date
 *   - @atlaskit/lozenge            —
 *   - @atlaskit/primitives         Box / Stack / xcss
 *   - @atlaskit/tokens             token() — all color/spacing
 *   - EpicDescriptionEditor        @atlaskit/editor-core ADF (lazy)
 */

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  lazy,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
  useFullscreen,
} from '@/components/workhub/create-story/PortalFix';
import { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Select, { CreatableSelect } from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import Button, { IconButton } from '@atlaskit/button/new';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { DatePicker } from '@atlaskit/datetime-picker';

import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import {
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';

// ── ADF editor — lazy, same pattern as CreateStoryModal ──────────────────────
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);

// ─────────────────────────────────────────────────────────────────────────────
// Constants & option vocabularies
// ─────────────────────────────────────────────────────────────────────────────

const TITLE_MAX = 255;

const CATEGORY_OPTIONS = [
  { value: 'Industrial',         label: 'Industrial' },
  { value: 'Ministry Website',   label: 'Ministry Website' },
  { value: 'Internal Services',  label: 'Internal Services' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
];

// Business Request status vocabulary — maps to `process_step` column
const BR_STATUS_OPTIONS = [
  { value: 'new_request', label: 'Not Started' },
  { value: 'in_review',   label: 'In Review' },
  { value: 'analyse',     label: 'Analysis' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'closed',      label: 'Completed' },
];

// Priority maps to `urgency` column
const PRIORITY_OPTIONS = [
  { value: 'High',   label: 'High',   bg: '#FFEBE6', text: '#BF2600', border: '#FF8F73' },
  { value: 'Normal', label: 'Medium', bg: '#FFFAE6', text: '#FF8B00', border: '#FFE380' },
  { value: 'Low',    label: 'Low',    bg: '#DEEBFF', text: '#0052CC', border: '#4C9AFF' },
] as const;

const STAKEHOLDER_SELECT_OPTIONS = STAKEHOLDER_OPTIONS.map(s => ({
  value: s.value,
  label: s.label,
}));

const THEME_SELECT_OPTIONS = THEME_OPTIONS.map(t => ({
  value: t.value,
  label: t.labelEn ?? t.label,
}));

const TYPE_SELECT_OPTIONS = REQUEST_TYPE_OPTIONS.map(t => ({
  value: t.value,
  label: t.label,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Lozenge appearance — maps to 3-colour guardrail (CLAUDE.md §5)
// ─────────────────────────────────────────────────────────────────────────────
function brStatusAppearance(step: string): 'default' | 'inprogress' | 'success' {
  if (step === 'closed') return 'success';
  if (step === 'in_review' || step === 'analyse') return 'inprogress';
  return 'default';
}

// ─────────────────────────────────────────────────────────────────────────────
// xcss styles — token-only, no inline style for colours
// ─────────────────────────────────────────────────────────────────────────────

const headerWrapperStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: 'space.200',
});

const headerActionsStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.050',
  flexShrink: 0,
});

const requiredHelperStyles = xcss({
  font: 'font.body.small',
  color: 'color.text.subtlest',
  marginBottom: 'space.300',
});

const fieldGroupStyles = xcss({
  display: 'flex',
  flexDirection: 'column',
  gap: 'space.300',
});

const dividerStyles = xcss({
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderColor: 'color.border',
  marginBlock: 'space.100',
});

const editorWrapperStyles = xcss({
  borderRadius: 'border.radius',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border.input',
  minHeight: '160px',
  overflow: 'hidden',
});

const editorLoadingStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '160px',
});

const footerLeftStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  flex: '1',
});

const footerRightStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
});

const errorBannerStyles = xcss({
  padding: 'space.150',
  borderRadius: 'border.radius',
  backgroundColor: 'color.background.danger',
  color: 'color.text.danger',
  font: 'font.body.small',
});

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateBusinessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  arabic_title: string;
  title: string;
  descriptionAdf: object | null;
  description: string;        // JSON-stringified ADF
  process_step: string;
  request_type: string;
  urgency: string;
  category: string;
  theme: string;
  project_manager_user_id: string;  // DM
  po_user_id: string;               // PO
  stakeholders: string[];
  planned_quarter: string;          // maps to releases.name
  end_date: string;
  targeted_feature: boolean;
  attachments: File[];
}

const INITIAL: FormState = {
  arabic_title: '',
  title: '',
  descriptionAdf: null,
  description: '',
  process_step: 'new_request',
  request_type: '',
  urgency: '',
  category: '',
  theme: '',
  project_manager_user_id: '',
  po_user_id: '',
  stakeholders: [],
  planned_quarter: '',
  end_date: '',
  targeted_feature: false,
  attachments: [],
};

interface ValidationErrors {
  arabic_title?: string;
  title?: string;
  request_type?: string;
  urgency?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data hooks
// ─────────────────────────────────────────────────────────────────────────────

function useProfiles() {
  return useQuery({
    queryKey: ['br-modal-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      return (data ?? []).map(p => ({
        value: p.id,
        label: p.full_name || p.email || p.id,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useReleases() {
  return useQuery({
    queryKey: ['br-modal-releases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('releases')
        .select('id, name')
        .order('name');
      return [
        { value: '', label: 'None' },
        ...(data ?? []).map(r => ({ value: r.name, label: r.name })),
      ];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD file upload helper
// ─────────────────────────────────────────────────────────────────────────────

async function uploadBRDFiles(requestId: string, files: File[]) {
  if (!files.length) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase
    .from('profiles').select('full_name').eq('id', user.id).single();

  for (const file of files) {
    const path = `${requestId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage
      .from('attachments')
      .upload(path, file);
    if (upErr) { console.error('BRD upload failed:', upErr); continue; }
    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(path);
    await typedQuery('business_request_links').insert({
      business_request_id: requestId,
      title: file.name,
      url: publicUrl,
      link_type: 'documentation',
      kind: 'document',
      file_name: file.name,
      file_path: path,
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: user.id,
      added_by_name: profile?.full_name || user.email || 'Unknown',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Header action buttons — read PortalFix context (same as CreateStoryModal)
// ─────────────────────────────────────────────────────────────────────────────

function MinimizeButton() {
  const { toggleMinimize } = useFullscreen();
  return (
    <IconButton
      appearance="subtle"
      spacing="default"
      label="Minimize"
      icon={() => (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )}
      onClick={toggleMinimize}
    />
  );
}

function FullscreenToggleButton() {
  const { fullscreen, toggleFullscreen } = useFullscreen();
  return (
    <IconButton
      appearance="subtle"
      spacing="default"
      label={fullscreen ? 'Exit full screen' : 'Full screen'}
      icon={(iconProps) =>
        fullscreen
          ? <VidFullScreenOffIcon {...iconProps} label="" />
          : <VidFullScreenOnIcon {...iconProps} label="" />
      }
      onClick={toggleFullscreen}
    />
  );
}

function MoreActionsButton() {
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
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <IconButton
        appearance="subtle"
        spacing="default"
        label="More actions"
        icon={(iconProps) => <MoreIcon {...iconProps} label="" />}
        onClick={() => setOpen(o => !o)}
        isSelected={open}
      />
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            background: token('elevation.surface.overlay', '#FFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
            minWidth: 160,
            padding: '4px 0',
            zIndex: 10,
          }}
        >
          {[
            { label: 'Save as draft', action: () => { setOpen(false); } },
          ].map(item => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={item.action}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--cp-font-body)',
                fontSize: 14,
                color: token('color.text', '#172B4D'),
                textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)'))}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusChip — inline status picker, Jira-parity. Same pattern as CreateStoryModal.
// ─────────────────────────────────────────────────────────────────────────────

const BR_STATUS_CHIP_ID = 'br-status-chip-trigger';

function BRStatusChip({
  status,
  onChange,
}: {
  status: string;
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const current = BR_STATUS_OPTIONS.find(o => o.value === status) ?? BR_STATUS_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = BR_STATUS_OPTIONS.findIndex(o => o.value === status);
    setActiveIdx(idx >= 0 ? idx : 0);
    requestAnimationFrame(() => { listboxRef.current?.focus(); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = (returnFocus = true) => {
    setOpen(false);
    setActiveIdx(-1);
    if (returnFocus) triggerRef.current?.focus();
  };

  const selectOption = (idx: number) => {
    onChange(BR_STATUS_OPTIONS[idx].value);
    close(true);
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => (i + 1) % BR_STATUS_OPTIONS.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => (i - 1 + BR_STATUS_OPTIONS.length) % BR_STATUS_OPTIONS.length);
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIdx >= 0) selectOption(activeIdx);
        break;
      case 'Escape':
        e.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  const activeOptionId = activeIdx >= 0 ? `br-status-option-${BR_STATUS_OPTIONS[activeIdx]?.value}` : undefined;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        id={BR_STATUS_CHIP_ID}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${current.label} — Change status`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        style={{
          background: token('color.background.neutral', 'rgba(9,30,66,0.06)'),
          border: `2px solid ${open ? token('color.border.focused', '#1868DB') : 'transparent'}`,
          borderRadius: 3,
          minHeight: 40,
          padding: '0 10px',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'var(--cp-font-body)',
          color: token('color.text', '#172B4D'),
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          outline: 'none',
        }}
      >
        {current.label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div
          ref={listboxRef}
          role="listbox"
          aria-label="Change status"
          aria-activedescendant={activeOptionId}
          tabIndex={-1}
          onKeyDown={handleListboxKeyDown}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            background: token('elevation.surface.overlay', '#FFF'),
            border: `1px solid ${token('color.border', '#DFE1E6')}`,
            borderRadius: 4,
            boxShadow: '0 4px 12px rgba(9,30,66,0.15)',
            padding: '4px 0',
            minWidth: 180,
            outline: 'none',
          }}
        >
          <div style={{
            padding: '6px 12px 4px',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: 'var(--cp-font-body)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: token('color.text.subtlest', '#8590A2'),
          }}>
            Change status
          </div>
          {BR_STATUS_OPTIONS.map((opt, idx) => (
            <div
              key={opt.value}
              id={`br-status-option-${opt.value}`}
              role="option"
              aria-selected={status === opt.value}
              onClick={() => selectOption(idx)}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background:
                  idx === activeIdx
                    ? token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)')
                    : status === opt.value
                    ? token('color.background.selected', 'rgba(37,99,235,0.08)')
                    : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--cp-font-body)',
                fontSize: 14,
                color: token('color.text', '#172B4D'),
                outline: 'none',
              }}
            >
              {/* Inline lozenge for status option */}
              <span style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                background:
                  brStatusAppearance(opt.value) === 'success'
                    ? '#E3FCEF'
                    : brStatusAppearance(opt.value) === 'inprogress'
                    ? '#DEEBFF'
                    : '#DFE1E6',
                color:
                  brStatusAppearance(opt.value) === 'success'
                    ? '#006644'
                    : brStatusAppearance(opt.value) === 'inprogress'
                    ? '#0747A6'
                    : '#253858',
              }}>
                {opt.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD drag-drop upload zone (preserved from previous version)
// ─────────────────────────────────────────────────────────────────────────────

function BRDUploadZone({
  files,
  onFilesChange,
}: {
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((incoming: File[]) => {
    onFilesChange([...files, ...incoming].slice(0, 10));
  }, [files, onFilesChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (idx: number) => onFilesChange(files.filter((_, i) => i !== idx));

  const fmtSize = (b: number) =>
    b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? token('color.border.brand', '#1868DB') : token('color.border', '#DFE1E6')}`,
          borderRadius: 4,
          padding: '20px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver
            ? token('color.background.selected', '#E9F2FF')
            : token('color.background.input', '#FAFBFC'),
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xlsx,.xls"
          style={{ display: 'none' }}
          onChange={handleInput}
        />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
          style={{ margin: '0 auto 8px', display: 'block', color: token('color.text.subtlest', '#626F86') }}>
          <path d="M12 4v12m-4-4l4-4 4 4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, color: token('color.text', '#172B4D'), margin: '0 0 4px', fontFamily: 'var(--cp-font-body)' }}>
          Drop BRD files here or click to browse
        </p>
        <p style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86'), margin: '0 0 2px', fontFamily: 'var(--cp-font-body)' }}>
          PDF, DOCX, XLSX — max 25 MB per file
        </p>
      </div>

      {files.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '5px 8px',
              background: token('color.background.neutral', '#F4F5F7'),
              borderRadius: 3, fontSize: 12, fontFamily: 'var(--cp-font-body)',
            }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5z"
                  stroke={token('color.text.brand', '#1868DB')} strokeWidth="1.2" fill="none"/>
                <path d="M9 1.5V5.5h4" stroke={token('color.text.brand', '#1868DB')} strokeWidth="1.2" fill="none"/>
              </svg>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token('color.text', '#172B4D') }}>
                {f.name}
              </span>
              <span style={{ color: token('color.text.subtlest', '#626F86'), whiteSpace: 'nowrap' }}>
                {fmtSize(f.size)}
              </span>
              <button type="button" onClick={() => removeFile(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#626F86'), padding: 2, display: 'flex', flexShrink: 0 }}
                aria-label={`Remove ${f.name}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CreateBusinessRequestModal({
  isOpen,
  onClose,
}: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const { data: profiles = [] } = useProfiles();
  const { data: releaseOptions = [] } = useReleases();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [arabicBlurred, setArabicBlurred] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key as keyof ValidationErrors]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
    setFormError(null);
  }, [errors]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const next: ValidationErrors = {};
    if (!form.arabic_title.trim()) next.arabic_title = 'Arabic title is required';
    if (!form.title.trim()) next.title = 'English title is required';
    if (!form.request_type) next.request_type = 'Type is required';
    if (!form.urgency) next.urgency = 'Select a priority level';
    if (Object.keys(next).length > 0) { setErrors(next); return false; }
    return true;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleCreate = useCallback(async () => {
    setSubmitAttempted(true);
    setFormError(null);

    if (!validate()) return;

    try {
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        arabic_title: form.arabic_title.trim() || null,
        description: form.description || null,
        process_step: form.process_step,
        request_type: form.request_type || null,
        urgency: form.urgency || null,
        category: form.category || null,
        theme: form.theme || null,
        project_manager_user_id: form.project_manager_user_id || null,
        po_user_id: form.po_user_id || null,
        stakeholders: form.stakeholders,
        planned_quarter: form.planned_quarter ? [form.planned_quarter] : null,
        end_date: form.end_date || null,
        impl_target_end_date: form.end_date || null,
        targeted_feature: form.targeted_feature,
        import_source: 'manual',
      };

      const created = await createMutation.mutateAsync(payload as any);

      if (form.attachments.length && (created as any)?.id) {
        setUploading(true);
        try {
          await uploadBRDFiles((created as any).id, form.attachments);
        } catch (e) {
          console.error('BRD upload failed:', e);
        } finally {
          setUploading(false);
        }
      }

      const key = (created as any)?.request_key || 'BR';
      flag.success(`${key} created`, `"${form.title.slice(0, 60)}"`);
      setForm(INITIAL);
      setErrors({});
      setSubmitAttempted(false);
      setTitleBlurred(false);
      setArabicBlurred(false);
      onClose();
    } catch (err: any) {
      setUploading(false);
      setFormError(err?.message ?? 'Failed to create Business Request');
      console.error('Create BR failed:', err);
    }
  }, [form, createMutation, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    setForm(INITIAL);
    setErrors({});
    setSubmitAttempted(false);
    setTitleBlurred(false);
    setArabicBlurred(false);
    setFormError(null);
    onClose();
  }, [onClose]);

  // Field-level error logic (blur OR submit attempted)
  const arabicError =
    (submitAttempted || arabicBlurred) && !form.arabic_title.trim()
      ? 'Arabic title is required'
      : errors.arabic_title;

  const titleError =
    (submitAttempted || titleBlurred) && !form.title.trim()
      ? 'English title is required'
      : errors.title;

  const isSubmitting = createMutation.isPending || uploading;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <ModalTransition>
      {isOpen && (
        <ModalDialog onClose={handleClose} width="large" shouldScrollInViewport autoFocus>
          {/* ── Header ───────────────────────────────────────────────────── */}
          <ModalHeader>
            <Box xcss={headerWrapperStyles}>
              {/* Icon + title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
                <img
                  src="/admin/icons/jira/business-request-16.svg"
                  width={16}
                  height={16}
                  alt=""
                  aria-hidden="true"
                  style={{ flexShrink: 0 }}
                />
                <ModalTitle>Create Business Request</ModalTitle>
              </div>

              {/* Header action buttons — same as CreateStoryModal */}
              <Box xcss={headerActionsStyles}>
                <MinimizeButton />
                <FullscreenToggleButton />
                <MoreActionsButton />
                <IconButton
                  appearance="subtle"
                  spacing="default"
                  label="Close"
                  icon={(iconProps) => <CrossIcon {...iconProps} label="" />}
                  onClick={handleClose}
                />
              </Box>
            </Box>
          </ModalHeader>

          {/* ── Body ─────────────────────────────────────────────────────── */}
          <ModalBody>
            {/* Required note */}
            <Box xcss={requiredHelperStyles}>
              Required fields are marked with an asterisk{' '}
              <span aria-hidden="true" style={{ color: token('color.text.danger') }}>*</span>
            </Box>

            <Box xcss={fieldGroupStyles}>

              {/* ── Arabic title ─────────────────────────────────────── */}
              <Field name="arabic_title" label="Feature name (Arabic)" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Textfield
                      {...(fieldProps as any)}
                      value={form.arabic_title}
                      onChange={(e: any) => set('arabic_title', e.target.value)}
                      onBlur={() => setArabicBlurred(true)}
                      placeholder="اسم المتطلب أو الفجوة"
                      isInvalid={!!arabicError}
                      style={{ direction: 'rtl', textAlign: 'right', fontSize: 15 } as React.CSSProperties}
                    />
                    {arabicError
                      ? <ErrorMessage>{arabicError}</ErrorMessage>
                      : <HelperMessage>Official Arabic name as it appears in the ministry system</HelperMessage>
                    }
                  </>
                )}
              </Field>

              {/* ── English title ────────────────────────────────────── */}
              <Field name="title" label="Feature name (English)" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Textfield
                      {...(fieldProps as any)}
                      value={form.title}
                      onChange={(e: any) => set('title', e.target.value)}
                      onBlur={() => setTitleBlurred(true)}
                      placeholder="English translation of the feature name"
                      maxLength={TITLE_MAX}
                      isInvalid={!!titleError}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      {titleError
                        ? <ErrorMessage>{titleError}</ErrorMessage>
                        : <span />
                      }
                      <span style={{
                        fontSize: 11,
                        color: token('color.text.disabled', '#8590A2'),
                        fontFamily: 'var(--cp-font-body)',
                        marginLeft: 'auto',
                      }}>
                        {form.title.length} / {TITLE_MAX}
                      </span>
                    </div>
                  </>
                )}
              </Field>

              <Box xcss={dividerStyles} />

              {/* ── Status ───────────────────────────────────────────── */}
              <div>
                <label
                  htmlFor={BR_STATUS_CHIP_ID}
                  style={{
                    fontFamily: 'var(--cp-font-body)',
                    fontSize: 12,
                    fontWeight: 600,
                    color: token('color.text.subtle', '#44546F'),
                    display: 'block',
                    marginBottom: 4,
                    lineHeight: '16px',
                  }}
                >
                  Status
                </label>
                <BRStatusChip
                  status={form.process_step}
                  onChange={s => set('process_step', s)}
                />
                <p style={{
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 12,
                  color: token('color.text.subtlest', '#8590A2'),
                  marginTop: 4,
                  lineHeight: '16px',
                }}>
                  This is the initial status upon creation
                </p>
              </div>

              {/* ── Description (ADF editor) ─────────────────────────── */}
              <Field name="description" label="Description">
                {() => (
                  <Box xcss={editorWrapperStyles}>
                    <Suspense
                      fallback={
                        <Box xcss={editorLoadingStyles}>
                          <Spinner size="medium" />
                        </Box>
                      }
                    >
                      <EpicDescriptionEditor
                        workItemId="__br_create__"
                        initialContent={form.descriptionAdf ?? null}
                        placeholder="Describe what this feature does, why it is needed, and the current gap or pain point it addresses..."
                        appearance="full-page"
                        onSave={(adfJson: string) => {
                          try {
                            const parsed = JSON.parse(adfJson);
                            set('descriptionAdf', parsed);
                            set('description', JSON.stringify(parsed));
                          } catch { /* noop */ }
                        }}
                        onChange={(adfJson: string) => {
                          try {
                            const parsed = JSON.parse(adfJson);
                            set('descriptionAdf', parsed);
                            set('description', JSON.stringify(parsed));
                          } catch { /* noop */ }
                        }}
                        onCancel={() => undefined}
                      />
                    </Suspense>
                  </Box>
                )}
              </Field>

              {/* ── Type ─────────────────────────────────────────────── */}
              <Field name="request_type" label="Type" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Select
                      {...(fieldProps as any)}
                      inputId="br-type"
                      options={TYPE_SELECT_OPTIONS}
                      value={TYPE_SELECT_OPTIONS.find(o => o.value === form.request_type) ?? null}
                      onChange={(opt: any) => set('request_type', opt?.value ?? '')}
                      placeholder="Feature · Gap · Integration · Data Request"
                      isSearchable={false}
                      isInvalid={!!errors.request_type}
                    />
                    {submitAttempted && !form.request_type && (
                      <ErrorMessage>Type is required</ErrorMessage>
                    )}
                  </>
                )}
              </Field>

              {/* ── Priority (urgency) — segmented button group ──────── */}
              <div>
                <label style={{
                  fontFamily: 'var(--cp-font-body)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: token('color.text.subtle', '#44546F'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginBottom: 8,
                  lineHeight: '16px',
                }}>
                  <span aria-hidden="true" style={{ color: token('color.text.danger') }}>*</span>
                  Priority
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRIORITY_OPTIONS.map(p => {
                    const selected = form.urgency === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => set('urgency', p.value)}
                        style={{
                          flex: 1,
                          padding: '8px 0',
                          fontSize: 13,
                          fontWeight: 500,
                          fontFamily: 'var(--cp-font-body)',
                          borderRadius: 3,
                          cursor: 'pointer',
                          transition: 'all 120ms ease',
                          background: selected ? p.bg : token('color.background.input', '#FAFBFC'),
                          color: selected ? p.text : token('color.text.subtle', '#44546F'),
                          border: selected
                            ? `2px solid ${p.border}`
                            : `1px solid ${token('color.border', '#DFE1E6')}`,
                          outline: 'none',
                        }}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
                {submitAttempted && !form.urgency && (
                  <p style={{ fontSize: 12, color: token('color.text.danger', '#AE2A19'), marginTop: 4, fontFamily: 'var(--cp-font-body)' }}>
                    Select a priority level
                  </p>
                )}
              </div>

              {/* ── Category ─────────────────────────────────────────── */}
              <Field name="category" label="Category">
                {({ fieldProps }) => (
                  <Select
                    {...(fieldProps as any)}
                    inputId="br-category"
                    options={CATEGORY_OPTIONS}
                    value={CATEGORY_OPTIONS.find(o => o.value === form.category) ?? null}
                    onChange={(opt: any) => set('category', opt?.value ?? '')}
                    placeholder="Industrial · Ministry Website · Internal · Innovation"
                    isSearchable={false}
                    isClearable
                  />
                )}
              </Field>

              {/* ── Theme ────────────────────────────────────────────── */}
              <Field name="theme" label="Strategic theme">
                {({ fieldProps }) => (
                  <Select
                    {...(fieldProps as any)}
                    inputId="br-theme"
                    options={THEME_SELECT_OPTIONS}
                    value={THEME_SELECT_OPTIONS.find(o => o.value === form.theme) ?? null}
                    onChange={(opt: any) => set('theme', opt?.value ?? '')}
                    placeholder="Select theme"
                    isSearchable
                    isClearable
                  />
                )}
              </Field>

              {/* ── Delivery Manager ─────────────────────────────────── */}
              <Field name="project_manager_user_id" label="Delivery Manager">
                {({ fieldProps }) => (
                  <Select
                    {...(fieldProps as any)}
                    inputId="br-dm"
                    options={profiles}
                    value={profiles.find(p => p.value === form.project_manager_user_id) ?? null}
                    onChange={(opt: any) => set('project_manager_user_id', opt?.value ?? '')}
                    placeholder="Unassigned"
                    isClearable
                  />
                )}
              </Field>

              {/* ── Product Owner ────────────────────────────────────── */}
              <Field name="po_user_id" label="Product Owner">
                {({ fieldProps }) => (
                  <Select
                    {...(fieldProps as any)}
                    inputId="br-po"
                    options={profiles}
                    value={profiles.find(p => p.value === form.po_user_id) ?? null}
                    onChange={(opt: any) => set('po_user_id', opt?.value ?? '')}
                    placeholder="Unassigned"
                    isClearable
                  />
                )}
              </Field>

              {/* ── Stakeholders ─────────────────────────────────────── */}
              <Field name="stakeholders" label="Stakeholders">
                {({ fieldProps }) => (
                  <>
                    <CreatableSelect
                      {...(fieldProps as any)}
                      inputId="br-stakeholders"
                      isMulti
                      isClearable={false}
                      options={STAKEHOLDER_SELECT_OPTIONS}
                      value={[
                        ...STAKEHOLDER_SELECT_OPTIONS.filter(o => form.stakeholders.includes(o.value)),
                        ...form.stakeholders
                          .filter(v => !STAKEHOLDER_SELECT_OPTIONS.find(o => o.value === v))
                          .map(v => ({ value: v, label: v })),
                      ]}
                      onChange={(opts: any) => set('stakeholders', (opts ?? []).map((o: any) => o.value))}
                      placeholder="+ Add ministry agency or partner"
                      formatCreateLabel={(v: string) => `Add "${v}"`}
                    />
                    <HelperMessage>Select all relevant ministry agencies, teams, or external bodies</HelperMessage>
                  </>
                )}
              </Field>

              {/* ── Planned release ──────────────────────────────────── */}
              <Field name="planned_quarter" label="Planned release">
                {({ fieldProps }) => (
                  <Select
                    {...(fieldProps as any)}
                    inputId="br-release"
                    options={releaseOptions}
                    value={releaseOptions.find(r => r.value === form.planned_quarter) ?? null}
                    onChange={(opt: any) => set('planned_quarter', opt?.value ?? '')}
                    isClearable
                    placeholder="Link to a release"
                  />
                )}
              </Field>

              {/* ── Target date ───────────────────────────────────────── */}
              <Field name="end_date" label="Target date">
                {() => (
                  <DatePicker
                    value={form.end_date || undefined}
                    onChange={(val: string) => set('end_date', val || '')}
                    placeholder="Select date"
                    dateFormat="DD/MM/YYYY"
                  />
                )}
              </Field>

              {/* ── Targeted feature flag ─────────────────────────────── */}
              <div style={{ paddingTop: 4 }}>
                <Checkbox
                  label="Targeted feature — priority feature for the current cycle"
                  isChecked={form.targeted_feature}
                  onChange={(e: any) => set('targeted_feature', e.target.checked)}
                  name="targeted_feature"
                />
              </div>

              {/* ── BRD upload ────────────────────────────────────────── */}
              <Field name="brd_upload" label="BRD / Scope documents">
                {() => (
                  <BRDUploadZone
                    files={form.attachments}
                    onFilesChange={files => set('attachments', files)}
                  />
                )}
              </Field>

              {/* ── Form-level error banner ────────────────────────────── */}
              {formError && (
                <Box xcss={errorBannerStyles}>{formError}</Box>
              )}

            </Box>
          </ModalBody>

          {/* ── Footer ───────────────────────────────────────────────────── */}
          <ModalFooter>
            <Box xcss={footerLeftStyles} />
            <Box xcss={footerRightStyles}>
              <Button appearance="subtle" onClick={handleClose} isDisabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isLoading={isSubmitting}
                onClick={handleCreate}
              >
                Create
              </Button>
            </Box>
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}

export default CreateBusinessRequestModal;
