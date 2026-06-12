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
 * Target date       CatalystDatePicker         (canonical form-context date)
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
  type ChangeEvent,
  type ReactNode,
} from 'react';
import ReactDOM from 'react-dom';
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
import Avatar from '@atlaskit/avatar';
import Button, { IconButton } from '@atlaskit/button/new';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import DropdownMenu, { DropdownItemGroup, DropdownItem } from '@atlaskit/dropdown-menu';

import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { flag } from '@/components/shared/JiraTable/flags';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { TitleTranslateWrapper } from '@/components/shared/title-translate/TitleTranslateWrapper';
import { useActiveDemandProcessSteps, stepToLozengeAppearance } from '@/hooks/useDemandProcessSteps';
import {
  CATEGORY_OPTIONS,
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
// Canonical Catalyst icon — backed by useIconOverrides (admin overrides via /admin/icons).
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { resolveAvatarUrl } from '@/lib/avatars';
import { PriorityIcon as CanonicalPriorityIcon } from '@/components/icons/PriorityIcon';
import { CATALYST_PRIORITIES } from '@/lib/catalyst-priority';

// ── ADF editor — canonical Tiptap surface (RichTextEditor), headless
// mode because the modal owns the Create / Cancel footer. ──────────
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { tiptapToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/tiptapToAdf';
import { ProductReleasePicker } from '@/components/product/ProductReleasePicker';

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

function MiniAvatar({ name }: { name: string; avatarUrl?: string | null }) {
  return (
    <Avatar
      size="small"
      name={name}
      src={resolveAvatarUrl(name) ?? undefined}
    />
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

// CATEGORY_OPTIONS imported from @/types/business-request

// Priority — canonical 5-level scale from catalyst-priority.ts
const PRIORITY_OPTIONS: IconOption[] = CATALYST_PRIORITIES.map((p) => ({
  value: p,
  label: p,
  icon: <CanonicalPriorityIcon level={p} size={14} />,
}));

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
const fieldGroupStyles = xcss({ display: 'flex', flexDirection: 'column', gap: 'space.200' });
const dividerStyles = xcss({ borderBottomWidth: 'border.width', borderBottomStyle: 'solid', borderColor: 'color.border', marginBlock: 'space.100' });
const editorWrapperStyles = xcss({ borderRadius: 'border.radius', borderWidth: 'border.width', borderStyle: 'solid', borderColor: 'color.border.input', minHeight: '160px', overflow: 'hidden' });
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
  productId?: string;
  /** Called when user switches to a different work type — passes the selected type string. */
  onWorkTypeChange?: (type: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Form state
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
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
  release_id: string | null;
  end_date: string;
  targeted_feature: boolean;
  attachments: File[];
}

const INITIAL: FormState = {
  title: '', descriptionAdf: null, description: '',
  process_step: 'new_request', request_type: '', urgency: '', category: '',
  theme: '', project_manager_user_id: '', po_user_id: '', stakeholders: [],
  planned_quarter: '', release_id: null, end_date: '', targeted_feature: false, attachments: [],
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
  return (
    <DropdownMenu
      trigger={({ triggerRef, ...triggerProps }) => (
        <IconButton
          {...triggerProps}
          ref={triggerRef}
          appearance="subtle"
          spacing="default"
          label="More actions"
          icon={(iconProps) => <MoreIcon {...iconProps} label="" />}
        />
      )}
      placement="bottom-end"
      shouldRenderToParent
    >
      <DropdownItemGroup>
        <DropdownItem>Give feedback</DropdownItem>
        <DropdownItem>Help</DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusChip — @atlaskit/dropdown-menu + inline ADS-token spans (sentence-case, no uppercase)
// ─────────────────────────────────────────────────────────────────────────────

type LozengeAppearance = 'default' | 'inprogress' | 'success' | 'removed' | 'moved' | 'new';

// Canonical colors — probed from Catalyst Storybook Pages/Business Request (2026-06-12)
const STATUS_BG: Record<string, string> = {
  success:    '#94C748',
  inprogress: '#8FB8F6',
  default:    '#DDDEE1',
  moved:      '#DDDEE1',
  removed:    '#DDDEE1',
  new:        '#DDDEE1',
};
const STATUS_COLOR: Record<string, string> = {
  success:    '#292A2E',
  inprogress: '#292A2E',
  default:    '#292A2E',
  moved:      '#292A2E',
  removed:    '#292A2E',
  new:        '#292A2E',
};

function StatusSpan({ appearance, label }: { appearance: LozengeAppearance; label: string }) {
  const bg = STATUS_BG[appearance] ?? STATUS_BG.default;
  const color = STATUS_COLOR[appearance] ?? STATUS_COLOR.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      height: 20, padding: '0 7px', borderRadius: 3,
      fontSize: 11, fontWeight: 700,
      textTransform: 'none', letterSpacing: 'normal',
      background: bg, color,
    }}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD drag-drop upload zone (no ADS equivalent — retained as-is)
// ─────────────────────────────────────────────────────────────────────────────

function BRDUploadZone({ files, onFilesChange }: { files: File[]; onFilesChange: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

  const addFiles = useCallback((inc: File[]) => {
    const validFiles = inc.filter(f => {
      if (f.size > MAX_FILE_SIZE) {
        flag.warning(`File too large: ${f.name}`, `Max 25 MB per file (${(f.size / 1048576).toFixed(1)} MB)`);
        return false;
      }
      return true;
    });
    onFilesChange([...files, ...validFiles].slice(0, 10));
  }, [files, onFilesChange]);
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
          borderRadius: 4, padding: '24px 16px', textAlign: 'center', cursor: 'pointer',
          background: dragOver ? token('color.background.selected', '#E9F2FF') : token('color.background.input', '#FAFBFC'),
          transition: 'border-color 120ms, background 120ms',
        }}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.xls" style={{ display: 'none' }} onChange={handleInput} />
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ margin: '0 auto 8px', display: 'block', color: token('color.text.subtlest', '#626F86') }}>
          <path d="M12 4v12m-4-4l4-4 4 4M4 20h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <p style={{ fontSize: 12, fontWeight: 600, color: token('color.text', '#292A2E'), margin: '0 0 4px' }}>Drop BRD files here or click to browse</p>
        <p style={{ fontSize: 12, color: token('color.text.subtlest', '#626F86'), margin: 0 }}>PDF, DOCX, XLSX — max 25 MB per file</p>
      </div>
      {files.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', background: token('color.background.neutral', '#F4F5F7'), borderRadius: 3, fontSize: 12 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5z" stroke={token('color.text.brand', '#1868DB')} strokeWidth="1.2" fill="none"/>
                <path d="M9 1.5V5.5h4" stroke={token('color.text.brand', '#1868DB')} strokeWidth="1.2" fill="none"/>
              </svg>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token('color.text', '#292A2E') }}>{f.name}</span>
              <span style={{ color: token('color.text.subtlest', '#626F86'), whiteSpace: 'nowrap' }}>{fmt(f.size)}</span>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${f.name}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', '#626F86'), padding: 4, display: 'flex', flexShrink: 0 }}>
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
    <IconButton
      appearance="subtle"
      spacing="default"
      label={label}
      isLoading={loading}
      onClick={onClick}
      icon={() => (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9l-4 2.5 1.5-4L2 5h4.5L8 1z" fill={token('color.icon.brand', '#7C3AED')}/>
        </svg>
      )}
    />
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CreateBusinessRequestModal({ isOpen, onClose, productId, onWorkTypeChange }: CreateBusinessRequestModalProps) {
  const createMutation = useCreateBusinessRequest();
  const { data: profiles = [] } = useProfiles();
  const { data: releaseOptions = [] } = useReleases();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Status portal-dropdown — mirrors CreateStoryModal pattern exactly
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const repositionStatusMenu = useCallback(() => {
    if (!statusTriggerRef.current) return;
    const r = statusTriggerRef.current.getBoundingClientRect();
    setStatusMenuAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);
  useEffect(() => {
    if (!statusMenuOpen) return;
    repositionStatusMenu();
  }, [statusMenuOpen, repositionStatusMenu]);
  useEffect(() => {
    if (!statusMenuOpen) return;
    window.addEventListener('scroll', repositionStatusMenu, true);
    window.addEventListener('resize', repositionStatusMenu);
    return () => { window.removeEventListener('scroll', repositionStatusMenu, true); window.removeEventListener('resize', repositionStatusMenu); };
  }, [statusMenuOpen, repositionStatusMenu]);
  useEffect(() => {
    if (!statusMenuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (statusTriggerRef.current?.contains(t)) return;
      if (statusMenuRef.current?.contains(t)) return;
      setStatusMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusMenuOpen]);

  // Seed initial status from /admin/workflows (Business Request scheme)
  const { data: brSteps = [] } = useActiveDemandProcessSteps();
  useEffect(() => {
    if (!brSteps.length) return;
    const validValues = brSteps.map(s => s.value);
    if (!validValues.includes(form.process_step)) {
      setForm(prev => ({ ...prev, process_step: brSteps[0].value }));
    }
  }, [brSteps, form.process_step]);

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setFormError(null);
  }, []);

  const markTouched = useCallback((field: string) => {
    setTouchedFields(prev => new Set(prev).add(field));
  }, []);

  const isTouched = (field: string) => touchedFields.has(field) || submitAttempted;

  // ── Validation ─────────────────────────────────────────────────────────────
  // 2026-06-01: arabic_title deprecated. Single English title required.
  const validate = () => {
    if (!form.title.trim()) return false;
    if (!form.request_type) return false;
    if (!form.urgency) return false;
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
        release_id: form.release_id || null,
        end_date: form.end_date || null,
        impl_target_end_date: form.end_date || null,
        targeted_feature: form.targeted_feature,
        import_source: 'manual',
        product_id: productId || null,
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
      setTouchedFields(new Set());
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
    setTouchedFields(new Set());
    setFormError(null);
    onClose();
  }, [onClose]);

  // 2026-06-01: titleError checks form.title (canonical English). If user
  // typed only Arabic without translating, form.title is empty → blocks submit.
  const titleError = (submitAttempted || titleBlurred) && !form.title.trim() ? 'Business request name is required (English)' : undefined;
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
                {/* WorkItemTypeIcon is canonical — respects /admin/icons overrides (G, 2026-05-09) */}
                <WorkItemTypeIcon type="Business Request" size={16} label="" />
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

              {/* ── Work type — always visible so user can switch without closing ── */}
              {onWorkTypeChange && (
                <Field name="workType" label="Work type" isRequired>
                  {({ fieldProps: { id } }) => (
                    <Select<IconOption>
                      inputId={id}
                      options={[
                        { value: 'Story', label: 'Story', icon: <WorkItemTypeIcon type="Story" size={16} label="" /> },
                        { value: 'Epic', label: 'Epic', icon: <WorkItemTypeIcon type="Epic" size={16} label="" /> },
                        { value: 'Feature', label: 'Feature', icon: <WorkItemTypeIcon type="Feature" size={16} label="" /> },
                        { value: 'Business Request', label: 'Business Request', icon: <WorkItemTypeIcon type="Business Request" size={16} label="" /> },
                        { value: 'Business Gap', label: 'Business Gap', icon: <WorkItemTypeIcon type="Business Gap" size={16} label="" /> },
                        { value: 'QA Bug', label: 'QA Bug', icon: <WorkItemTypeIcon type="QA Bug" size={16} label="" /> },
                        { value: 'Production Incident', label: 'Production Incident', icon: <WorkItemTypeIcon type="Production Incident" size={16} label="" /> },
                        { value: 'Change Request', label: 'Change Request', icon: <WorkItemTypeIcon type="Change Request" size={16} label="" /> },
                      ]}
                      value={{ value: 'Business Request', label: 'Business Request', icon: <WorkItemTypeIcon type="Business Request" size={16} label="" /> }}
                      onChange={(opt) => {
                        const selected = (opt as IconOption | null)?.value;
                        if (selected && selected !== 'Business Request') {
                          handleClose();
                          onWorkTypeChange(selected);
                        }
                      }}
                      formatOptionLabel={formatIconOption}
                      isSearchable={false}
                    />
                  )}
                </Field>
              )}

              {/* ── 2026-06-01: Single English title field — Arabic title
                  deprecated. The bilingual TitleTranslateWrapper pattern
                  collapsed when arabic_title was dropped from the DB. */}
              <Field name="title" label="Business request name" isRequired>
                {({ fieldProps }) => (
                  <>
                    <TitleTranslateWrapper
                      value={form.title}
                      onValueChange={(next) => set('title', next)}
                      field="summary"
                    >
                      {({ dir }) => (
                        <Textfield
                          {...(fieldProps as any)}
                          value={form.title}
                          onChange={(e: any) => set('title', e.target.value)}
                          onBlur={() => setTitleBlurred(true)}
                          placeholder="Name of the business request"
                          maxLength={TITLE_MAX}
                          isInvalid={!!titleError}
                          testId="br-title"
                          aria-label="Business Request name"
                          dir={dir}
                        />
                      )}
                    </TitleTranslateWrapper>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      {titleError ? <ErrorMessage>{titleError}</ErrorMessage> : <span />}
                      <span style={{ fontSize: 11, color: token('color.text.disabled', '#8590A2'), marginLeft: 'auto' }}>
                        {form.title.length} / {TITLE_MAX}
                      </span>
                    </div>
                  </>
                )}
              </Field>

              {/* ── Status — portal dropdown, mirrors CreateStoryModal ── */}
              <Field name="status" label="Status">
                {() => (
                  <>
                    <div style={{ display: 'block', marginTop: 4 }}>
                      <button
                        ref={statusTriggerRef}
                        type="button"
                        aria-haspopup="listbox"
                        aria-expanded={statusMenuOpen}
                        onClick={() => setStatusMenuOpen((v) => !v)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: 'transparent', border: 'none', borderRadius: 3,
                          padding: '4px 6px 4px 0', cursor: 'pointer',
                          color: token('color.text.subtle', '#42526E'),
                        }}
                      >
                        {(() => {
                          const step = brSteps.find(s => s.value === form.process_step);
                          return (
                            <StatusSpan
                              appearance={step ? stepToLozengeAppearance(step) : 'default'}
                              label={step?.label ?? form.process_step ?? 'New'}
                            />
                          );
                        })()}
                        <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true" style={{ flexShrink: 0 }}>
                          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                    {statusMenuOpen && statusMenuAnchor && ReactDOM.createPortal(
                      <div
                        ref={statusMenuRef}
                        role="listbox"
                        aria-label="Select status"
                        style={{
                          position: 'fixed',
                          top: statusMenuAnchor.top,
                          left: statusMenuAnchor.left,
                          minWidth: Math.max(160, statusMenuAnchor.width),
                          maxHeight: '50vh',
                          overflowY: 'auto',
                          background: token('elevation.surface.overlay', '#FFFFFF'),
                          border: `1px solid ${token('color.border', '#DFE1E6')}`,
                          borderRadius: 4,
                          boxShadow: token('elevation.shadow.overlay', '0 8px 16px rgba(9,30,66,0.15)'),
                          padding: '4px 0',
                          zIndex: 9999,
                          fontFamily: 'inherit',
                          fontSize: 14,
                        }}
                      >
                        {brSteps.map((step) => {
                          const selected = form.process_step === step.value;
                          return (
                            <button
                              key={step.value}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => { set('process_step', step.value); setStatusMenuOpen(false); statusTriggerRef.current?.focus(); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 8,
                                width: '100%', padding: '8px 12px',
                                border: 'none', outline: 'none',
                                background: 'transparent',
                                color: token('color.text', '#292A2E'),
                                fontSize: 14, fontWeight: 400,
                                fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <StatusSpan appearance={stepToLozengeAppearance(step)} label={step.label} />
                              {selected && (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', color: token('color.text.brand', '#0C66E4') }} aria-hidden="true">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>,
                      document.body,
                    )}
                    <HelperMessage>This is the initial status upon creation</HelperMessage>
                  </>
                )}
              </Field>

              {/* ── Description — canonical RichTextEditor in headless
                  mode (modal footer owns Create / Cancel). onChange
                  captures TiptapDoc → tiptapToAdf → form state. ── */}
              <Field name="description" label="Description">
                {() => (
                  <Box xcss={editorWrapperStyles}>
                    <RichTextEditor
                      initialAdf={form.descriptionAdf ?? null}
                      hideActionButtons
                      onSave={() => {}}
                      onCancel={() => {}}
                      onChange={(tiptapJson) => {
                        try {
                          const adf = tiptapToAdf(tiptapJson);
                          set('descriptionAdf', adf);
                          set('description', JSON.stringify(adf));
                        } catch {
                          /* noop */
                        }
                      }}
                    />
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
                      onBlur={() => markTouched('request_type')}
                      placeholder="Feature · Gap · Integration · Data Request"
                      isSearchable={false}
                      isClearable
                    />
                    {isTouched('request_type') && !form.request_type && <ErrorMessage>Type is required</ErrorMessage>}
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
                      onBlur={() => markTouched('urgency')}
                      formatOptionLabel={formatIconOption}
                      placeholder="Select priority"
                      isSearchable={false}
                      isClearable
                    />
                    {isTouched('urgency') && !form.urgency && <ErrorMessage>Priority is required</ErrorMessage>}
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

              {/* ── Release — ProductReleasePicker (inline create) ────────── */}
              <Field name="release_id" label="Release">
                {() => (
                  <ProductReleasePicker
                    inputId="br-create-release"
                    productId={productId ?? null}
                    value={form.release_id}
                    onChange={(id) => set('release_id', id)}
                    placeholder="Link to a release"
                    appearance="default"
                  />
                )}
              </Field>

              {/* ── Target date — CatalystDatePicker (canonical form-context date) ── */}
              <Field name="end_date" label="Target date">
                {() => (
                  <CatalystDatePicker
                    value={form.end_date || null}
                    onChange={(val: any) => set('end_date', val || '')}
                    placeholder="Select date"
                  />
                )}
              </Field>

              {/* ── Targeted feature — @atlaskit/checkbox Checkbox ────────── */}
              <div style={{ padding: '4px 0' }}>
                <Checkbox
                  label="Targeted feature"
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

          {/* Translation preview modal removed 2026-06-01 — TitleTranslateWrapper
              applies translations inline (with a "↩ Show original" revert
              affordance), matching the view surface (image 2). */}

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <ModalFooter>
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
