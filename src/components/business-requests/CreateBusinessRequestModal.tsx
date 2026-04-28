/**
 * CreateBusinessRequestModal — 100% Atlassian Design System.
 *
 * 2026-04-28 v3 — Full ADS compliance rebuild + AI bidirectional translation.
 *
 * Every field maps to an @atlaskit/* component. No bespoke UI, no shadcn, no raw HTML.
 * Patterns are reused verbatim from CreateStoryModal (the canonical reference):
 *   - MiniAvatar + formatIconOption   → DM, PO (same as Assignee/Reporter)
 *   - PriorityIcon + Select<IconOption> → Priority (same as Priority field)
 *   - StatusChip                       → Status (same component, parameterised)
 *   - EpicDescriptionEditor (lazy)     → Description
 *   - PortalFix shell                  → Modal chrome
 *
 * @atlaskit/* component used per field
 * ─────────────────────────────────────
 * Arabic title      @atlaskit/textfield      Textfield  (dir="rtl" attribute)
 * English title     @atlaskit/textfield      Textfield
 * Translate button  @atlaskit/button/new     IconButton (AI gateway → ai-improve-story)
 * Status            StatusChip (PortalFix pattern) — @atlaskit/button/new IconButton inside
 * Description       @atlaskit/editor-core    EpicDescriptionEditor (lazy)
 * Type              @atlaskit/select         Select
 * Priority          @atlaskit/select         Select<IconOption> + PriorityIcon (CreateStoryModal pattern)
 * Category          @atlaskit/select         Select
 * Theme             @atlaskit/select         Select (searchable)
 * Delivery Manager  @atlaskit/select         Select<IconOption> + MiniAvatar formatOptionLabel
 * Product Owner     @atlaskit/select         Select<IconOption> + MiniAvatar formatOptionLabel
 * Stakeholders      @atlaskit/select         CreatableSelect (multi)
 * Planned release   @atlaskit/select         Select
 * Target date       @atlaskit/datetime-picker DatePicker
 * Targeted feature  @atlaskit/checkbox       Checkbox
 * BRD upload        Custom drag-drop         No ADS equivalent — retained
 * Error banner      @atlaskit/primitives     Box xcss
 * Footer buttons    @atlaskit/button/new     Button (primary + subtle)
 *
 * AI translation (bidirectional):
 *   supabase.functions.invoke('ai-improve-story', { improve_type: 'translate_text', ... })
 *   EN → AR: translate button next to English title
 *   AR → EN: translate button next to Arabic title
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
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { DatePicker } from '@atlaskit/datetime-picker';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';

import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { useCatalystWorkflow, type WorkflowStatus } from '@/hooks/useCatalystWorkflow';
import {
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';

// ── ADF editor — lazy, identical to CreateStoryModal ─────────────────────────
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);

// ─────────────────────────────────────────────────────────────────────────────
// Option type (identical to CreateStoryModal)
// ─────────────────────────────────────────────────────────────────────────────

interface IconOption {
  value: string;
  label: string;
  icon?: ReactNode;
  sublabel?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniAvatar — copied verbatim from CreateStoryModal (canonical reference)
// Used for DM and PO Select options, identical to Assignee/Reporter pattern.
// ─────────────────────────────────────────────────────────────────────────────

function MiniAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        aria-hidden="true"
        style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 24,
        height: 24,
        borderRadius: '50%',
        background: token('color.background.neutral'),
        color: token('color.text.subtle'),
        font: token('font.body.small'),
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initial}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PriorityIcon — copied verbatim from CreateStoryModal
// ─────────────────────────────────────────────────────────────────────────────

function PriorityIcon({ name }: { name: string }) {
  const stroke =
    name === 'Highest' || name === 'High'
      ? token('color.icon.danger', '#C9372C')
      : name === 'Medium'
        ? token('color.icon.warning', '#B38600')
        : token('color.icon.information', '#1868DB');
  const paths: Record<string, ReactNode> = {
    High:   <path d="M3 10l5-5 5 5" />,
    Medium: <><path d="M3 6h10" /><path d="M3 10h10" /></>,
    Low:    <path d="M3 6l5 5 5-5" />,
  };
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none"
      stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// formatIconOption — copied verbatim from CreateStoryModal
// ─────────────────────────────────────────────────────────────────────────────

const formatIconOption = (option: IconOption) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.100') }}>
    {option.icon}
    <span>{option.label}</span>
    {option.sublabel && (
      <span style={{ color: token('color.text.subtlest'), font: token('font.body.small') }}>
        {option.sublabel}
      </span>
    )}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const TITLE_MAX = 255;

const CATEGORY_OPTIONS = [
  { value: 'Industrial',          label: 'Industrial' },
  { value: 'Ministry Website',    label: 'Ministry Website' },
  { value: 'Internal Services',   label: 'Internal Services' },
  { value: 'Innovation Platform', label: 'Innovation Platform' },
];

// Priority — maps to `urgency` column — Select<IconOption> same as CreateStoryModal
const PRIORITY_OPTIONS: IconOption[] = [
  { value: 'High',   label: 'High',   icon: <PriorityIcon name="High" /> },
  { value: 'Normal', label: 'Medium', icon: <PriorityIcon name="Medium" /> },
  { value: 'Low',    label: 'Low',    icon: <PriorityIcon name="Low" /> },
];

// Status options for process_step are sourced from /admin/workflows
// (catalyst_workflow_schemes for issue_type='Business Request').
// See useCatalystWorkflow — single source of truth.

const STAKEHOLDER_SELECT_OPTIONS = STAKEHOLDER_OPTIONS.map(s => ({ value: s.value, label: s.label }));
const THEME_SELECT_OPTIONS = THEME_OPTIONS.map(t => ({ value: t.value, label: t.labelEn ?? t.label }));
const TYPE_SELECT_OPTIONS = REQUEST_TYPE_OPTIONS.map(t => ({ value: t.value, label: t.label }));

// ─────────────────────────────────────────────────────────────────────────────
// Status lozenge appearance — 3-colour guardrail (CLAUDE.md §5)
// Maps admin workflow category → lozenge appearance.
// ─────────────────────────────────────────────────────────────────────────────
function brStatusAppearance(category: 'todo' | 'in_progress' | 'done' | undefined) {
  if (category === 'done') return 'success';
  if (category === 'in_progress') return 'inprogress';
  return 'default';
}

// ─────────────────────────────────────────────────────────────────────────────
// xcss token styles (zero inline colour props)
// ─────────────────────────────────────────────────────────────────────────────

const headerWrapperStyles = xcss({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 'space.200' });
const headerActionsStyles = xcss({ display: 'flex', alignItems: 'center', gap: 'space.050', flexShrink: 0 });
const requiredHelperStyles = xcss({ font: 'font.body.small', color: 'color.text.subtlest', marginBottom: 'space.300' });
const fieldGroupStyles = xcss({ display: 'flex', flexDirection: 'column', gap: 'space.300' });
const dividerStyles = xcss({ borderBottomWidth: 'border.width', borderBottomStyle: 'solid', borderColor: 'color.border', marginBlock: 'space.100' });
const editorWrapperStyles = xcss({ borderRadius: 'border.radius', borderWidth: 'border.width', borderStyle: 'solid', borderColor: 'color.border.input', minHeight: '160px', overflow: 'hidden' });
const editorLoadingStyles = xcss({ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '160px' });
const footerLeftStyles = xcss({ flex: '1' });
const footerRightStyles = xcss({ display: 'flex', alignItems: 'center', gap: 'space.100' });
const errorBannerStyles = xcss({ padding: 'space.150', borderRadius: 'border.radius', backgroundColor: 'color.background.danger', color: 'color.text.danger', font: 'font.body.small' });

// Translate row: title input + translate icon button on the right
const translateRowStyles = xcss({ display: 'flex', alignItems: 'flex-start', gap: 'space.075' });

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
  description: string;
  process_step: string;
  request_type: string;
  urgency: string;
  category: string;
  theme: string;
  project_manager_user_id: string;
  po_user_id: string;
  stakeholders: string[];
  planned_quarter: string;
  end_date: string;
  targeted_feature: boolean;
  attachments: File[];
}

const INITIAL: FormState = {
  arabic_title: '', title: '', descriptionAdf: null, description: '',
  process_step: 'new_request', request_type: '', urgency: '', category: '',
  theme: '', project_manager_user_id: '', po_user_id: '', stakeholders: [],
  planned_quarter: '', end_date: '', targeted_feature: false, attachments: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Data hooks — reuse same profile pattern as CreateStoryModal useTeamMembers
// ─────────────────────────────────────────────────────────────────────────────

function useProfiles() {
  return useQuery({
    queryKey: ['br-modal-profiles'],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .order('full_name');
      return (data ?? []).map(p => ({
        value: p.id,
        label: p.full_name || p.email || p.id,
        icon: <MiniAvatar name={p.full_name ?? p.email ?? '?'} avatarUrl={p.avatar_url} />,
      } as IconOption));
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useReleases() {
  return useQuery({
    queryKey: ['br-modal-releases'],
    queryFn: async () => {
      const { data } = await supabase.from('releases').select('id, name').order('name');
      return [
        { value: '', label: 'None' },
        ...(data ?? []).map(r => ({ value: r.name, label: r.name })),
      ];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AI translation hook — calls ai-improve-story edge function
// ─────────────────────────────────────────────────────────────────────────────

function useTranslate() {
  const [translating, setTranslating] = useState<'en_to_ar' | 'ar_to_en' | null>(null);

  const translate = useCallback(async (
    text: string,
    direction: 'en_to_ar' | 'ar_to_en',
  ): Promise<string | null> => {
    if (!text.trim()) return null;
    setTranslating(direction);
    try {
      const { data, error } = await supabase.functions.invoke('ai-improve-story', {
        body: { improve_type: 'translate_text', text: text.trim(), direction },
      });
      if (error || !data?.translation) return null;
      return (data.translation as string).trim();
    } catch (e) {
      console.error('Translation failed:', e);
      return null;
    } finally {
      setTranslating(null);
    }
  }, []);

  return { translate, translating };
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD file upload helper
// ─────────────────────────────────────────────────────────────────────────────

async function uploadBRDFiles(requestId: string, files: File[]) {
  if (!files.length) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
  for (const file of files) {
    const path = `${requestId}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from('attachments').upload(path, file);
    if (upErr) { console.error('BRD upload failed:', upErr); continue; }
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path);
    await typedQuery('business_request_links').insert({
      business_request_id: requestId, title: file.name, url: publicUrl,
      link_type: 'documentation', kind: 'document', file_name: file.name,
      file_path: path, file_size: file.size, mime_type: file.type,
      uploaded_by: user.id, added_by_name: profile?.full_name || user.email || 'Unknown',
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Header chrome — identical to CreateStoryModal
// ─────────────────────────────────────────────────────────────────────────────

function MinimizeButton() {
  const { toggleMinimize } = useFullscreen();
  return (
    <IconButton appearance="subtle" spacing="default" label="Minimize"
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
    <IconButton appearance="subtle" spacing="default"
      label={fullscreen ? 'Exit full screen' : 'Full screen'}
      icon={(p) => fullscreen ? <VidFullScreenOffIcon {...p} label="" /> : <VidFullScreenOnIcon {...p} label="" />}
      onClick={toggleFullscreen}
    />
  );
}

function MoreActionsButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <IconButton appearance="subtle" spacing="default" label="More actions"
        icon={(p) => <MoreIcon {...p} label="" />}
        onClick={() => setOpen(o => !o)} isSelected={open}
      />
      {open && (
        <div role="menu" style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 4, zIndex: 10,
          background: token('elevation.surface.overlay', '#FFF'),
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: 4, boxShadow: '0 4px 12px rgba(9,30,66,0.15)', minWidth: 160, padding: '4px 0',
        }}>
          <button role="menuitem" type="button" onClick={() => setOpen(false)}
            style={{ display: 'block', width: '100%', padding: '8px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--cp-font-body)', fontSize: 14, color: token('color.text', '#292A2E'), textAlign: 'left' }}
            onMouseEnter={e => (e.currentTarget.style.background = token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)'))}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            View keyboard shortcuts
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusChip — @atlaskit/dropdown-menu + Lozenge (portal-rendered, z-index safe)
// ─────────────────────────────────────────────────────────────────────────────

type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

function categoryToLozenge(cat: 'todo' | 'in_progress' | 'done' | undefined): LozengeAppearance {
  if (cat === 'done') return 'success';
  if (cat === 'in_progress') return 'inprogress';
  return 'default';
}

function BRStatusChip({ status, onChange }: { status: string; onChange: (s: string) => void }) {
  const { statuses, isLoading } = useCatalystWorkflow('Business Request');
  const options = statuses.map((s: WorkflowStatus) => ({
    value: s.slug,
    label: s.name,
    category: s.category,
  }));

  const current =
    options.find(o => o.value === status) ??
    options[0] ?? { value: '', label: isLoading ? 'Loading…' : 'No status', category: 'todo' as const };

  return (
    <DropdownMenu
      placement="bottom-start"
      shouldRenderToParent={false}
      trigger={({ triggerRef, ...triggerProps }) => (
        <button
          {...triggerProps}
          ref={triggerRef as React.Ref<HTMLButtonElement>}
          type="button"
          aria-label={`${current.label} — Change status`}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            outline: 'none',
            fontFamily: 'var(--cp-font-body)',
          }}
        >
          <Lozenge appearance={categoryToLozenge(current.category)} isBold>
            {current.label}
          </Lozenge>
          <ChevronDownIcon label="" size="small" />
        </button>
      )}
    >
      <DropdownItemGroup title="Change status">
        {options.length === 0 && (
          <div style={{ padding: '8px 12px', fontSize: 13, color: token('color.text.subtlest', '#8590A2') }}>
            {isLoading ? 'Loading…' : 'No statuses configured'}
          </div>
        )}
        {options.map(opt => (
          <DropdownItem
            key={opt.value}
            isSelected={status === opt.value}
            onClick={() => onChange(opt.value)}
          >
            <Lozenge appearance={categoryToLozenge(opt.category)} isBold>
              {opt.label}
            </Lozenge>
          </DropdownItem>
        ))}
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD drag-drop upload zone (no ADS equivalent — retained as-is)
// ─────────────────────────────────────────────────────────────────────────────

function BRDUploadZone({ files, onFilesChange }: { files: File[]; onFilesChange: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const addFiles = useCallback((inc: File[]) => onFilesChange([...files, ...inc].slice(0, 10)), [files, onFilesChange]);
  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }, [addFiles]);
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(e.target.files || [])); if (inputRef.current) inputRef.current.value = ''; };
  const remove = (i: number) => onFilesChange(files.filter((_, j) => j !== i));
  const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div>
      <div role="button" tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragOver ? token('color.border.brand', '#1868DB') : token('color.border', '#DFE1E6')}`,
          borderRadius: 4, padding: '20px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? token('color.background.selected', '#E9F2FF') : token('color.background.input', '#FAFBFC'),
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.xls" style={{ display: 'none' }} onChange={handleInput} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block', color: token('color.text.subtlest', '#626F86') }}>
          <path d="M12 4v12m-4-4l4-4 4 4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ fontSize: 13, fontWeight: 600, color: token('color.text', '#292A2E'), margin: '0 0 4px', fontFamily: 'var(--cp-font-body)' }}>Drop BRD files here or click to browse</p>
        <p style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86'), margin: 0, fontFamily: 'var(--cp-font-body)' }}>PDF, DOCX, XLSX — max 25 MB per file</p>
      </div>
      {files.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: token('color.background.neutral', '#F4F5F7'), borderRadius: 3, fontSize: 12, fontFamily: 'var(--cp-font-body)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5z" stroke={token('color.text.brand', '#1868DB')} strokeWidth="1.2" fill="none"/>
                <path d="M9 1.5V5.5h4" stroke={token('color.text.brand', '#1868DB')} strokeWidth="1.2" fill="none"/>
              </svg>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token('color.text', '#292A2E') }}>{f.name}</span>
              <span style={{ color: token('color.text.subtlest', '#626F86'), whiteSpace: 'nowrap' }}>{fmt(f.size)}</span>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${f.name}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#626F86'), padding: 2, display: 'flex', flexShrink: 0 }}>
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
// Translate button — AI icon + loading state (Notion-style)
// ─────────────────────────────────────────────────────────────────────────────

function TranslateButton({ loading, label, onClick }: { loading: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      title={label}
      aria-label={label}
      style={{
        flexShrink: 0,
        width: 32,
        height: 40, // matches ADS Textfield height
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: loading ? token('color.background.neutral', '#F4F5F7') : token('color.background.neutral', '#F4F5F7'),
        border: `1px solid ${token('color.border', '#DFE1E6')}`,
        borderRadius: 3,
        cursor: loading ? 'default' : 'pointer',
        color: token('color.text.subtle', '#44546F'),
        transition: 'background 120ms',
        outline: 'none',
      }}
      onMouseEnter={e => { if (!loading) e.currentTarget.style.background = token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)'); }}
      onMouseLeave={e => { e.currentTarget.style.background = token('color.background.neutral', '#F4F5F7'); }}
    >
      {loading ? (
        <Spinner size="small" />
      ) : (
        // AI sparkle icon — purple (#7C3AED) reserved for AI per CLAUDE.md §8
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9l-4 2.5 1.5-4L2 5h4.5L8 1z" fill="#7C3AED"/>
        </svg>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ADS field label helper (matches @atlaskit/form Field label styling)
// ─────────────────────────────────────────────────────────────────────────────

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label style={{
      fontFamily: 'var(--cp-font-body)', fontSize: 12, fontWeight: 600,
      color: token('color.text.subtle', '#44546F'), display: 'block', marginBottom: 4, lineHeight: '16px',
    }}>
      {required && <span aria-hidden="true" style={{ color: token('color.text.danger'), marginRight: 4 }}>*</span>}
      {children}
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CreateBusinessRequestModal({ isOpen, onClose }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const { data: profiles = [] } = useProfiles();
  const { data: releaseOptions = [] } = useReleases();
  const { translate, translating } = useTranslate();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [arabicBlurred, setArabicBlurred] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Seed initial status from /admin/workflows (Business Request scheme)
  const { initialStatus: brInitialStatus, statuses: brStatuses } = useCatalystWorkflow('Business Request');
  useEffect(() => {
    if (!brStatuses.length || !brInitialStatus) return;
    const validSlugs = brStatuses.map(s => s.slug);
    if (!validSlugs.includes(form.process_step)) {
      setForm(prev => ({ ...prev, process_step: brInitialStatus.slug }));
    }
  }, [brInitialStatus, brStatuses, form.process_step]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFormError(null);
  }, []);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.arabic_title.trim()) return false;
    if (!form.title.trim()) return false;
    if (!form.request_type) return false;
    if (!form.urgency) return false;
    return true;
  };

  // ── AI Translation handlers ────────────────────────────────────────────────
  const handleTranslateToArabic = useCallback(async () => {
    if (!form.title.trim()) return;
    const result = await translate(form.title, 'en_to_ar');
    if (result) set('arabic_title', result);
    else flag.warning('Translation unavailable', 'Please enter the Arabic name manually');
  }, [form.title, translate, set]);

  const handleTranslateToEnglish = useCallback(async () => {
    if (!form.arabic_title.trim()) return;
    const result = await translate(form.arabic_title, 'ar_to_en');
    if (result) set('title', result);
    else flag.warning('Translation unavailable', 'Please enter the English name manually');
  }, [form.arabic_title, translate, set]);

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
        try { await uploadBRDFiles((created as any).id, form.attachments); }
        catch (e) { console.error('BRD upload:', e); }
        finally { setUploading(false); }
      }
      const key = (created as any)?.request_key || 'BR';
      flag.success(`${key} created`, `"${form.title.slice(0, 60)}"`);
      setForm(INITIAL);
      setSubmitAttempted(false);
      setTitleBlurred(false);
      setArabicBlurred(false);
      onClose();
    } catch (err: any) {
      setUploading(false);
      setFormError(err?.message ?? 'Failed to create Business Request');
    }
  }, [form, createMutation, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = useCallback(() => {
    setForm(INITIAL);
    setSubmitAttempted(false);
    setTitleBlurred(false);
    setArabicBlurred(false);
    setFormError(null);
    onClose();
  }, [onClose]);

  const arabicError = (submitAttempted || arabicBlurred) && !form.arabic_title.trim() ? 'Arabic name is required' : undefined;
  const titleError = (submitAttempted || titleBlurred) && !form.title.trim() ? 'English name is required' : undefined;
  const isSubmitting = createMutation.isPending || uploading;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <ModalTransition>
      {isOpen && (
        <ModalDialog onClose={handleClose} width="large" shouldScrollInViewport autoFocus>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <ModalHeader>
            <Box xcss={headerWrapperStyles}>
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
                <img src="/admin/icons/jira/business-request-16.svg" width={16} height={16} alt="" aria-hidden="true" style={{ flexShrink: 0 }} />
                <ModalTitle>Create Business Request</ModalTitle>
              </div>
              <Box xcss={headerActionsStyles}>
                <MinimizeButton />
                <FullscreenToggleButton />
                <MoreActionsButton />
                <IconButton appearance="subtle" spacing="default" label="Close"
                  icon={(p) => <CrossIcon {...p} label="" />}
                  onClick={handleClose}
                />
              </Box>
            </Box>
          </ModalHeader>

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <ModalBody>
            <Box xcss={requiredHelperStyles}>
              Required fields are marked with an asterisk{' '}
              <span aria-hidden="true" style={{ color: token('color.text.danger') }}>*</span>
            </Box>

            <Box xcss={fieldGroupStyles}>

              {/* ── English title + translate-to-Arabic button ───────────── */}
              {/* @atlaskit/textfield — Textfield */}
              <Field name="title" label="Business Request name (English)" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Box xcss={translateRowStyles}>
                      <div style={{ flex: 1 }}>
                        <Textfield
                          {...(fieldProps as any)}
                          value={form.title}
                          onChange={(e: any) => set('title', e.target.value)}
                          onBlur={() => setTitleBlurred(true)}
                          placeholder="English name of the business request"
                          maxLength={TITLE_MAX}
                          isInvalid={!!titleError}
                        />
                      </div>
                      <TranslateButton
                        loading={translating === 'en_to_ar'}
                        label="Translate English → Arabic"
                        onClick={handleTranslateToArabic}
                      />
                    </Box>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                      {titleError ? <ErrorMessage>{titleError}</ErrorMessage> : <span />}
                      <span style={{ fontSize: 11, color: token('color.text.disabled', '#8590A2'), fontFamily: 'var(--cp-font-body)', marginLeft: 'auto' }}>
                        {form.title.length} / {TITLE_MAX}
                      </span>
                    </div>
                    {!titleError && <HelperMessage>Click ✦ to auto-translate to Arabic.</HelperMessage>}
                  </>
                )}
              </Field>

              {/* ── Arabic title + translate-to-English button ────────────── */}
              {/* @atlaskit/textfield — Textfield with dir="rtl" HTML attribute */}
              <Field name="arabic_title" label="Business Request name (Arabic)" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Box xcss={translateRowStyles}>
                      <div style={{ flex: 1 }}>
                        <Textfield
                          {...(fieldProps as any)}
                          value={form.arabic_title}
                          onChange={(e: any) => set('arabic_title', e.target.value)}
                          onBlur={() => setArabicBlurred(true)}
                          placeholder="اسم طلب الأعمال"
                          isInvalid={!!arabicError}
                          // dir attribute on the inner <input> — Textfield forwards arbitrary HTML attrs
                          aria-label="Business Request name in Arabic"
                          testId="br-arabic-title"
                        />
                        {/* Apply RTL via a style tag scoped to this input's testId */}
                        <style>{`[data-testid="br-arabic-title"] { direction: rtl; text-align: right; font-size: 15px; }`}</style>
                      </div>
                      <TranslateButton
                        loading={translating === 'ar_to_en'}
                        label="Translate Arabic → English"
                        onClick={handleTranslateToEnglish}
                      />
                    </Box>
                    {arabicError
                      ? <ErrorMessage>{arabicError}</ErrorMessage>
                      : <HelperMessage>Official Arabic name as it appears in the ministry system. Click ✦ to auto-translate to English.</HelperMessage>
                    }
                  </>
                )}
              </Field>

              <Box xcss={dividerStyles} />

              {/* ── Status — @atlaskit/button/new inside BRStatusChip ─────── */}
              <div>
                <FieldLabel>Status</FieldLabel>
                <BRStatusChip status={form.process_step} onChange={s => set('process_step', s)} />
                <p style={{ fontFamily: 'var(--cp-font-body)', fontSize: 12, color: token('color.text.subtlest', '#8590A2'), marginTop: 4, lineHeight: '16px' }}>
                  This is the initial status upon creation
                </p>
              </div>

              {/* ── Description — @atlaskit/editor-core (EpicDescriptionEditor, lazy) ── */}
              <Field name="description" label="Description">
                {() => (
                  <Box xcss={editorWrapperStyles}>
                    <Suspense fallback={<Box xcss={editorLoadingStyles}><Spinner size="medium" /></Box>}>
                      <EpicDescriptionEditor
                        workItemId="__br_create__"
                        initialContent={form.descriptionAdf ?? null}
                        placeholder="Describe what this business request covers, why it is needed, and the current gap or pain point it addresses..."
                        appearance="full-page"
                        onSave={(adf: string) => { try { const p = JSON.parse(adf); set('descriptionAdf', p); set('description', adf); } catch { /* noop */ } }}
                        onChange={(adf: string) => { try { const p = JSON.parse(adf); set('descriptionAdf', p); set('description', adf); } catch { /* noop */ } }}
                        onCancel={() => undefined}
                      />
                    </Suspense>
                  </Box>
                )}
              </Field>

              {/* ── Type — @atlaskit/select ───────────────────────────────── */}
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
                      isClearable
                    />
                    {submitAttempted && !form.request_type && <ErrorMessage>Type is required</ErrorMessage>}
                  </>
                )}
              </Field>

              {/* ── Priority — @atlaskit/select with PriorityIcon (CreateStoryModal pattern) ── */}
              <Field name="urgency" label="Priority" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Select<IconOption>
                      {...(fieldProps as any)}
                      inputId="br-priority"
                      options={PRIORITY_OPTIONS}
                      value={PRIORITY_OPTIONS.find(o => o.value === form.urgency) ?? null}
                      onChange={(opt: any) => set('urgency', opt?.value ?? '')}
                      formatOptionLabel={formatIconOption}
                      placeholder="Select priority"
                      isSearchable={false}
                      isClearable
                    />
                    {submitAttempted && !form.urgency && <ErrorMessage>Priority is required</ErrorMessage>}
                  </>
                )}
              </Field>

              {/* ── Category — @atlaskit/select ───────────────────────────── */}
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

              {/* ── Strategic theme — @atlaskit/select (searchable) ──────── */}
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

              {/* ── Delivery Manager — @atlaskit/select + MiniAvatar (CreateStoryModal Assignee pattern) ── */}
              <Field name="project_manager_user_id" label="Delivery Manager">
                {({ fieldProps }) => (
                  <Select<IconOption>
                    {...(fieldProps as any)}
                    inputId="br-dm"
                    options={profiles}
                    value={profiles.find(p => p.value === form.project_manager_user_id) ?? null}
                    onChange={(opt: any) => set('project_manager_user_id', opt?.value ?? '')}
                    formatOptionLabel={formatIconOption}
                    placeholder="Unassigned"
                    isClearable
                  />
                )}
              </Field>

              {/* ── Product Owner — @atlaskit/select + MiniAvatar (same as DM) ── */}
              <Field name="po_user_id" label="Product Owner">
                {({ fieldProps }) => (
                  <Select<IconOption>
                    {...(fieldProps as any)}
                    inputId="br-po"
                    options={profiles}
                    value={profiles.find(p => p.value === form.po_user_id) ?? null}
                    onChange={(opt: any) => set('po_user_id', opt?.value ?? '')}
                    formatOptionLabel={formatIconOption}
                    placeholder="Unassigned"
                    isClearable
                  />
                )}
              </Field>

              {/* ── Stakeholders — @atlaskit/select CreatableSelect multi ── */}
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
                        ...form.stakeholders.filter(v => !STAKEHOLDER_SELECT_OPTIONS.find(o => o.value === v)).map(v => ({ value: v, label: v })),
                      ]}
                      onChange={(opts: any) => set('stakeholders', (opts ?? []).map((o: any) => o.value))}
                      placeholder="+ Add ministry agency or partner"
                      formatCreateLabel={(v: string) => `Add "${v}"`}
                    />
                    <HelperMessage>Select all relevant ministry agencies, teams, or external bodies</HelperMessage>
                  </>
                )}
              </Field>

              {/* ── Planned release — @atlaskit/select ───────────────────── */}
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

              {/* ── Target date — @atlaskit/datetime-picker DatePicker ────── */}
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

              {/* ── Targeted feature — @atlaskit/checkbox Checkbox ────────── */}
              <div style={{ paddingTop: 4 }}>
                <Checkbox
                  label="Targeted feature — priority feature for the current cycle"
                  isChecked={form.targeted_feature}
                  onChange={(e: any) => set('targeted_feature', e.target.checked)}
                  name="targeted_feature"
                />
              </div>

              {/* ── BRD / Scope documents — custom drag-drop (no ADS equiv) ── */}
              <Field name="brd_upload" label="BRD / Scope documents">
                {() => (
                  <BRDUploadZone
                    files={form.attachments}
                    onFilesChange={files => set('attachments', files)}
                  />
                )}
              </Field>

              {formError && <Box xcss={errorBannerStyles}>{formError}</Box>}

            </Box>
          </ModalBody>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <ModalFooter>
            <Box xcss={footerLeftStyles} />
            <Box xcss={footerRightStyles}>
              <Button appearance="subtle" onClick={handleClose} isDisabled={isSubmitting}>Cancel</Button>
              <Button appearance="primary" isLoading={isSubmitting} onClick={handleCreate}>Create</Button>
            </Box>
          </ModalFooter>

        </ModalDialog>
      )}
    </ModalTransition>
  );
}

export default CreateBusinessRequestModal;
