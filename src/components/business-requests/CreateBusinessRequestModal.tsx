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
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

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
import CatalystAvatar from '@/components/shared/CatalystAvatar';
import Button, { IconButton } from '@atlaskit/button/new';
import { Box, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';

import { useQuery } from '@tanstack/react-query';
import { supabase, typedQuery } from '@/integrations/supabase/client';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import { flag } from '@/components/shared/JiraTable/flags';
import { useCreateBusinessRequest } from '@/hooks/useBusinessRequests';
import { TitleTranslateWrapper } from '@/components/shared/title-translate/TitleTranslateWrapper';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';
import { StatusLozengeDropdown } from '@/components/shared/StatusLozenge';
import {
  CATEGORY_OPTIONS,
  THEME_OPTIONS,
  STAKEHOLDER_OPTIONS,
  REQUEST_TYPE_OPTIONS,
} from '@/types/business-request';
// Canonical Catalyst icon — backed by useIconOverrides (admin overrides via /admin/icons).
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
// Canonical product icon — user-picked icon_key, else Saudi-landmark default by code.
import { ProductAvatar } from '@/components/icons/ProductAvatar';
import { PriorityIcon as CanonicalPriorityIcon } from '@/components/icons/PriorityIcon';
import { CATALYST_PRIORITIES } from '@/lib/catalyst-priority';

// ── ADF editor — canonical Tiptap surface (RichTextEditor), headless
// mode because the modal owns the Create / Cancel footer. ──────────
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { tiptapToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/tiptapToAdf';
import { QuarterSelect } from '@/components/shared/QuarterSelect';

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
    <CatalystAvatar
      size="small"
      name={name}
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
// xcss token styles (zero inline colour props)
// ─────────────────────────────────────────────────────────────────────────────

const headerWrapperStyles = xcss({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 'space.200' });
const headerActionsStyles = xcss({ display: 'flex', alignItems: 'center', gap: 'space.050', flexShrink: 0 });
const requiredHelperStyles = xcss({ font: 'font.body.small', color: 'color.text.subtlest', marginBottom: 'space.300' });
const fieldGroupStyles = xcss({ display: 'flex', flexDirection: 'column', gap: 'space.200' });
const dividerStyles = xcss({ borderBottomWidth: 'border.width', borderBottomStyle: 'solid', borderColor: 'color.border', marginBlock: 'space.100' });
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
  product_id: string;
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
  quarter: string | null;
  end_date: string;
  attachments: File[];
}

const INITIAL: FormState = {
  product_id: '',
  title: '', descriptionAdf: null, description: '',
  process_step: '', request_type: '', urgency: '', category: '',
  theme: '', project_manager_user_id: '', po_user_id: '', stakeholders: [],
  quarter: null, end_date: '', attachments: [],
};

// ─────────────────────────────────────────────────────────────────────────────
// Data hooks — reuse same profile pattern as CreateStoryModal useTeamMembers
// ─────────────────────────────────────────────────────────────────────────────

function useProfiles() {
  const { data = [] } = useApprovedProfiles();
  return {
    data: data.map(p => ({
      value: p.id,
      label: p.name,
      icon: <MiniAvatar name={p.name} avatarUrl={p.avatarUrl} />,
    } as IconOption)),
  };
}

// Products for the container selector — a BR resides in a product
// (business_requests.product_id). Canonical query mirrors BrMoveProductDialog.
function useProductOptions() {
  return useQuery({
    queryKey: ['br-modal-products'],
    queryFn: async (): Promise<IconOption[]> => {
      const { data, error } = await (supabase as any)
        .from('products')
        .select('id, name, code, icon_key')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []).map((p: { id: string; name: string; code: string; icon_key?: string | null }) => ({
        value: p.id,
        label: p.name,
        sublabel: p.code,
        icon: <ProductAvatar code={p.code} iconKey={p.icon_key ?? null} size={16} />,
      } as IconOption));
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current?.contains(e.target as Node) ||
        triggerRef.current?.contains(e.target as Node)
      ) return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [isOpen]);

  const getPosition = () => {
    if (!triggerRef.current) return { top: 0, right: 0 };
    const rect = triggerRef.current.getBoundingClientRect();
    return {
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    };
  };

  const pos = getPosition();

  return (
    <>
      <IconButton
        ref={triggerRef}
        appearance="subtle"
        spacing="default"
        label="More actions"
        icon={(iconProps) => <MoreIcon {...iconProps} label="" />}
        onClick={() => setIsOpen(!isOpen)}
      />
      {isOpen && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: 'fixed',
            top: pos.top,
            right: pos.right,
            background: token('elevation.surface.overlay', 'var(--ds-surface)'),
            border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
            borderRadius: 6,
            boxShadow: '0 8px 28px var(--ds-shadow-raised)',
            padding: '4px 0',
            minWidth: 180,
            zIndex: 9999,
          }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.open('https://github.com/anthropics/claude-code/issues', '_blank');
              setIsOpen(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: token('color.text', 'var(--ds-text)'),
              fontSize: 'var(--ds-font-size-400)',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)');
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'none';
            }}
          >
            Give feedback
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              window.open('https://claude.ai/help', '_blank');
              setIsOpen(false);
            }}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '8px 16px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: token('color.text', 'var(--ds-text)'),
              fontSize: 'var(--ds-font-size-400)',
              transition: 'background 120ms',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = token('color.background.neutral.subtle.hovered', 'var(--ds-background-neutral-subtle-hovered)');
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'none';
            }}
          >
            Help
          </button>
        </div>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BRD compact upload zone — button trigger + chip list (replaces tall drag-drop)
// ─────────────────────────────────────────────────────────────────────────────

function BRDUploadZone({ files, onFilesChange }: { files: File[]; onFilesChange: (f: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const MAX_FILE_SIZE = 25 * 1024 * 1024;

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
  const handleInput = (e: ChangeEvent<HTMLInputElement>) => { addFiles(Array.from(e.target.files || [])); if (inputRef.current) inputRef.current.value = ''; };
  const remove = (i: number) => onFilesChange(files.filter((_, j) => j !== i));
  const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1048576 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept=".pdf,.doc,.docx,.xlsx,.xls" style={{ display: 'none' }} onChange={handleInput} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          background: 'none', border: `1px solid ${token('color.border', 'var(--ds-border)')}`,
          borderRadius: 4, padding: '5px 10px', fontSize: 'var(--ds-font-size-200)',
          color: token('color.text', 'var(--ds-text)'),
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M13.5 9.5v3a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-3M8 1v8M5 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Attach files
        {files.length > 0 && (
          <span style={{
            background: token('color.background.brand.bold', 'var(--ds-background-brand-bold)'),
            color: token('color.text.inverse', 'var(--ds-text-inverse)'),
            borderRadius: 3, padding: '1px 6px', fontSize: 'var(--ds-font-size-100)', fontWeight: 600, lineHeight: 1.4,
          }}>
            {files.length}
          </span>
        )}
      </button>
      <span style={{ marginLeft: 8, fontSize: 'var(--ds-font-size-100)', color: token('color.text.subtlest', 'var(--ds-text-subtlest)') }}>
        PDF, DOCX, XLSX — max 25 MB
      </span>
      {files.length > 0 && (
        <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {files.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '3px 8px',
              background: token('color.background.neutral.subtle', 'var(--ds-background-neutral-subtle)'),
              borderRadius: 3, fontSize: 'var(--ds-font-size-200)',
            }}>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
                <path d="M9 1.5H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5L9 1.5z" stroke={token('color.text.brand', 'var(--ds-text-brand)')} strokeWidth="1.2" fill="none"/>
                <path d="M9 1.5V5.5h4" stroke={token('color.text.brand', 'var(--ds-text-brand)')} strokeWidth="1.2" fill="none"/>
              </svg>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: token('color.text', 'var(--ds-text)') }}>{f.name}</span>
              <span style={{ color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), whiteSpace: 'nowrap', fontSize: 'var(--ds-font-size-100)' }}>{fmt(f.size)}</span>
              <button type="button" onClick={() => remove(i)} aria-label={`Remove ${f.name}`}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: token('color.text.subtlest', 'var(--ds-text-subtlest)'), padding: 2, display: 'flex', flexShrink: 0 }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
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
          <path d="M8 1l1.5 4H14l-3.5 2.5 1.5 4L8 9l-4 2.5 1.5-4L2 5h4.5L8 1z" fill={token('color.icon.brand', 'var(--ds-background-discovery-bold)')}/>
        </svg>
      )}
    />
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CreateBusinessRequestModal({ isOpen, onClose, productId, onWorkTypeChange }: CreateBusinessRequestModalProps) {
  const navigate = useNavigate();
  const createMutation = useCreateBusinessRequest();
  const { data: profiles = [] } = useProfiles();
  const { data: productOptions = [], isLoading: productsLoading } = useProductOptions();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [titleBlurred, setTitleBlurred] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Seed the container from the caller's product context (when opened from a
  // product surface). When absent, the user picks the product in-modal.
  useEffect(() => {
    if (productId && !form.product_id) {
      setForm(prev => ({ ...prev, product_id: productId }));
    }
  }, [productId, form.product_id]);

  // Seed initial process_step from ph_workflow_* config
  const { initialStatus: brInitialStatus } = useIssueTypeWorkflow('Business Request');
  useEffect(() => {
    if (!brInitialStatus) return;
    if (!form.process_step) {
      setForm(prev => ({ ...prev, process_step: brInitialStatus }));
    }
  }, [brInitialStatus, form.process_step]);

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
    if (!form.product_id) return false;
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
        quarter: form.quarter || null,
        end_date: form.end_date || null,
        impl_target_end_date: form.end_date || null,
        import_source: 'manual',
        product_id: form.product_id || productId || null,
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
      // Resolve the product code (option sublabel) for the product-hub URL.
      const productCode = productOptions.find(o => o.value === form.product_id)?.sublabel;
      setForm(INITIAL);
      setSubmitAttempted(false);
      setTitleBlurred(false);
      setTouchedFields(new Set());
      onClose();
      // Land on the created BR's detail view in product hub.
      if (productCode && (created as any)?.request_key) {
        navigate(`/product-hub/${productCode}/backlog/${(created as any).request_key}`);
      }
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
        <ModalDialog onClose={handleClose} width="large" shouldScrollInViewport autoFocus modalTitle="Create Business Request">

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

              {/* ── Product — the container a BR resides in
                  (business_requests.product_id). Locked when the caller
                  supplied product context; otherwise user-selectable. ── */}
              <Field name="product_id" label="Product" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Select<IconOption>
                      {...(fieldProps as any)}
                      inputId="br-product"
                      options={productOptions}
                      value={productOptions.find(o => o.value === form.product_id) ?? null}
                      onChange={(opt: any) => set('product_id', opt?.value ?? '')}
                      onBlur={() => markTouched('product_id')}
                      isLoading={productsLoading}
                      isDisabled={!!productId}
                      formatOptionLabel={formatIconOption}
                      placeholder="Select product"
                      isSearchable
                    />
                    {isTouched('product_id') && !form.product_id && <ErrorMessage>Product is required</ErrorMessage>}
                  </>
                )}
              </Field>

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
                      <span style={{ fontSize: 'var(--ds-font-size-100)', color: token('color.text.disabled', 'var(--ds-text-disabled)'), marginLeft: 'auto' }}>
                        {form.title.length} / {TITLE_MAX}
                      </span>
                    </div>
                  </>
                )}
              </Field>

              {/* ── Status — canonical StatusLozengeDropdown (ADS tokens, group headers, workflow links) ── */}
              <Field name="status" label="Status">
                {() => (
                  <div style={{ marginTop: 4 }}>
                    <StatusLozengeDropdown
                      issueType="Business Request"
                      status={form.process_step || brInitialStatus || ''}
                      onStatusChange={(displayName) => {
                        set('process_step', displayName);
                      }}
                    />
                  </div>
                )}
              </Field>

              {/* ── Description — canonical RichTextEditor in headless
                  mode (modal footer owns Create / Cancel). onChange
                  captures TiptapDoc → tiptapToAdf → form state. ── */}
              <Field name="description" label="Description">
                {() => (
                  <RichTextEditor
                    initialAdf={null}
                    hideActionButtons
                    minHeight={120}
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

              {/* ── Quarter — admin-managed fiscal quarters (shared with milestones) ── */}
              <Field name="quarter" label="Quarter">
                {() => (
                  <QuarterSelect
                    inputId="br-create-quarter"
                    value={form.quarter}
                    onChange={(v) => set('quarter', v)}
                    placeholder="Select quarter"
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

              {/* ── BRD / Scope documents — compact inline attach ── */}
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
