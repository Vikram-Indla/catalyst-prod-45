/**
 * CreateStoryModal — Atlassian Design System "Create" dialog (Jira-parity).
 *
 * 2026-04-21 — Full rewrite per USER DIRECTIVE.
 * Replaces the legacy bespoke modal (1,576 lines of hand-rolled selects,
 * dropdowns, and CSS) with @atlaskit primitives + design tokens. The
 * existing `useCreateStoryMutation` + side effects (linkedSource auto-link,
 * activity log, toast) are preserved verbatim — this rewrite is presentation
 * + form layer only.
 *
 * Stack:
 *   - @atlaskit/modal-dialog        modal shell, focus trap, Esc, scrim
 *   - @atlaskit/form                Field / ErrorMessage / HelperMessage
 *   - @atlaskit/select              single + multi + creatable
 *   - @atlaskit/textfield           Summary, MDT Ref
 *   - @atlaskit/checkbox            "Create another"
 *   - @atlaskit/button/new          IconButton + loading-capable primary
 *   - @atlaskit/lozenge             read-only Status pill
 *   - @atlaskit/primitives          Box / Stack / Inline / xcss
 *   - @atlaskit/tokens              token('space.*') / token('color.*')
 *   - EpicDescriptionEditor         Atlaskit @atlaskit/editor-core (lazy)
 *
 * Callers (unchanged contract):
 *   - src/components/ja/CreateDropdown.tsx                (top nav + Create)
 *   - src/modules/.../linked-work-items/LinkedWorkItems.tsx
 *   - src/modules/.../story-detail-modules/LinkedIssuesSection.tsx
 */
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
  lazy,
  type ReactNode,
} from 'react';
// @atlaskit/modal-dialog uses @atlaskit/portal which renders empty in this
// Vite build. Using direct-render replacements that bypass the portal layer.
import {
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
  useFullscreen,
} from './PortalFix';
import { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Select, { AsyncSelect, CreatableSelect } from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import Button, { IconButton } from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { catalystToast } from '@/lib/catalystToast';
import { useAuth } from '@/hooks/useAuth';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import {
  useCreateStoryForm,
  useProjects,
  useTeamMembers,
  useProjectReleases,
  useCreateStoryMutation,
} from './useCreateStory';

// Lazy — keeps @atlaskit/editor-core out of the modal mount path until the
// "More fields" disclosure is opened. Same pattern as EpicDescriptionEditor's
// own lazy import elsewhere in the project.
const EpicDescriptionEditor = lazy(
  () => import('@/components/shared/rich-text/atlaskit/EpicDescriptionEditor'),
);

// ─────────────────────────────────────────────────────────────────────────────
// Public API (callers' contract — DO NOT CHANGE)
// ─────────────────────────────────────────────────────────────────────────────

export interface LinkedSourceConfig {
  /** Source issue key, e.g. "BAU-4351" */
  issueKey: string;
  /** Default link type, e.g. "BRD" */
  linkType?: string;
  /** If true, the source issue token cannot be removed */
  locked?: boolean;
}

export interface CreateStoryModalProps {
  open: boolean;
  onClose: () => void;
  projectId?: string;
  projectKey?: string;
  onSuccess?: (issueKey: string) => void;
  /** When provided, modal enters "create linked" mode with pre-populated linked items */
  linkedSource?: LinkedSourceConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static option vocabularies (mirrored from legacy modal)
// ─────────────────────────────────────────────────────────────────────────────

const WORK_TYPES = [
  'Story',
  'Epic',
  'Feature',
  'Business Gap',
  'QA Bug',
  'Production Incident',
  'Change Request',
  'Task',
  'API Requirement',
] as const;

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

// Per type → which initial status appears in the read-only Status lozenge.
// Matches what the existing useCreateStoryMutation actually writes.
const INITIAL_STATUS_BY_TYPE: Record<string, string> = {
  Story: 'In Requirements',
  Epic: 'To Do',
  Feature: 'To Do',
  'Business Gap': 'Open',
  'QA Bug': 'Open',
  'Production Incident': 'Open',
  'Change Request': 'Submitted',
  Task: 'To Do',
  'API Requirement': 'To Do',
};

// Status options per work type — shown in the Status dropdown as lozenges.
const DEFAULT_STATUS_OPTIONS = [
  { value: 'To Do', label: 'To Do' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
];

const STATUS_OPTIONS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  Story: [
    { value: 'In Requirements', label: 'In Requirements' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'In QA', label: 'In QA' },
    { value: 'Done', label: 'Done' },
  ],
  Epic: DEFAULT_STATUS_OPTIONS,
  Feature: DEFAULT_STATUS_OPTIONS,
  'QA Bug': [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'In QA', label: 'In QA' },
    { value: 'Closed', label: 'Closed' },
  ],
  'Production Incident': [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Resolved', label: 'Resolved' },
  ],
  'Business Gap': [
    { value: 'Open', label: 'Open' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Closed', label: 'Closed' },
  ],
  'Change Request': [
    { value: 'Submitted', label: 'Submitted' },
    { value: 'In Review', label: 'In Review' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ],
  Task: DEFAULT_STATUS_OPTIONS,
  'API Requirement': DEFAULT_STATUS_OPTIONS,
};

// Lozenge appearance buckets — Atlaskit gives us 5 named appearances and we
// map to the 3-color status guardrail (CLAUDE.md §5):
//   default (grey)  → To Do / Backlog / Open / In Requirements / Submitted
//   inprogress (blue) → In Progress / In Review / etc.
//   success (green) → Done
function statusAppearance(
  status: string,
): 'default' | 'inprogress' | 'success' {
  const s = status.toLowerCase();
  if (s === 'done' || s === 'closed' || s === 'resolved') return 'success';
  if (
    s.startsWith('in ') &&
    s !== 'in requirements' /* requirements treated as backlog */
  ) {
    return 'inprogress';
  }
  return 'default';
}

// ─────────────────────────────────────────────────────────────────────────────
// xcss styles (token-only)
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

const helperLinkStyles = xcss({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'space.050',
  marginTop: 'space.075',
  font: 'font.body.small',
  color: 'color.link',
  textDecoration: 'none',
});


const reporterReadonlyBoxStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
  height: '40px',
  paddingInline: 'space.100',
  borderRadius: 'border.radius',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border.input',
  backgroundColor: 'elevation.surface.sunken',
  font: 'font.body',
  color: 'color.text',
});

const footerLeftStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.200',
  flex: '1',
});

const footerRightStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
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

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Select option renderers
// ─────────────────────────────────────────────────────────────────────────────

interface IconOption {
  value: string;
  label: string;
  icon?: ReactNode;
  sublabel?: string;
}

const formatIconOption = (option: IconOption) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: token('space.100'),
    }}
  >
    {option.icon}
    <span>{option.label}</span>
    {option.sublabel ? (
      <span
        style={{
          color: token('color.text.subtlest'),
          font: token('font.body.small'),
        }}
      >
        {option.sublabel}
      </span>
    ) : null}
  </span>
);

function PriorityIcon({ name }: { name: string }) {
  // Compact native SVG matching Jira's priority glyphs.
  const stroke =
    name === 'Highest' || name === 'High'
      ? token('color.icon.danger', '#C9372C')
      : name === 'Medium'
        ? token('color.icon.warning', '#B38600')
        : token('color.icon.information', '#1868DB');
  const paths: Record<string, ReactNode> = {
    Highest: (
      <>
        <path d="M3 8l5-5 5 5" />
        <path d="M3 12l5-5 5 5" />
      </>
    ),
    High: <path d="M3 10l5-5 5 5" />,
    Medium: (
      <>
        <path d="M3 6h10" />
        <path d="M3 10h10" />
      </>
    ),
    Low: <path d="M3 6l5 5 5-5" />,
    Lowest: (
      <>
        <path d="M3 4l5 5 5-5" />
        <path d="M3 8l5 5 5-5" />
      </>
    ),
  };
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// Generic Atlaskit avatar fallback — initials in a token-coloured circle.
// ── Header action buttons — read PortalFix context ──────────────────────────
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

// ── MoreActionsButton — opens a small dropdown with help/feedback actions ────
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

  const items = [
    { label: 'Give feedback', action: () => window.open('https://jira.atlassian.com/secure/CreateIssue.jspa', '_blank', 'noopener') },
    { label: 'Help', action: () => window.open('https://support.atlassian.com/jira-software-cloud/', '_blank', 'noopener') },
  ];

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
          {items.map(item => (
            <button
              key={item.label}
              role="menuitem"
              type="button"
              onClick={() => { item.action(); setOpen(false); }}
              style={{
                display: 'block',
                width: '100%',
                padding: '8px 14px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--ds-font-family-body)',
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

// ── StatusChip — Jira-parity chip button with accessible inline picker ────────
// Fixes applied:
//   VIS-001: minHeight 40px to match ADS input height
//   A11Y-002/STR-003/A11Y-004: full keyboard nav (arrows/Enter/Esc/Tab),
//     focus moves into picker on open, aria-activedescendant on listbox.
// bg token: ADS doesn't expose a public "neutral chip" token in this version;
// rgba(5,21,36,0.06) is the verified Jira value — intentional override.
const STATUS_CHIP_TRIGGER_ID = 'status-chip-trigger';

function StatusChip({
  status,
  workType,
  onChange,
}: {
  status: string;
  workType: string;
  onChange: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const options = STATUS_OPTIONS_BY_TYPE[workType] ?? DEFAULT_STATUS_OPTIONS;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Move focus into listbox when opened
  useEffect(() => {
    if (!open) return;
    const currentIdx = options.findIndex(o => o.value === status);
    setActiveIdx(currentIdx >= 0 ? currentIdx : 0);
    // Defer focus to allow DOM paint
    requestAnimationFrame(() => { listboxRef.current?.focus(); });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = (returnFocus = true) => {
    setOpen(false);
    setActiveIdx(-1);
    if (returnFocus) triggerRef.current?.focus();
  };

  const selectOption = (idx: number) => {
    onChange(options[idx].value);
    close(true);
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIdx(i => (i + 1) % options.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIdx(i => (i - 1 + options.length) % options.length);
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
        // Allow Tab to close and move focus forward naturally
        close(false);
        break;
    }
  };

  const activeOptionId = activeIdx >= 0 ? `status-option-${options[activeIdx]?.value}` : undefined;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Chip trigger — 40px min-height for ADS input parity (VIS-001) */}
      <button
        ref={triggerRef}
        id={STATUS_CHIP_TRIGGER_ID}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${status} — Change status`}
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleTriggerKeyDown}
        style={{
          background: token('color.background.neutral', 'rgba(9,30,66,0.06)'),
          border: `2px solid ${open ? token('color.border.focused', '#1868DB') : 'transparent'}`,
          borderRadius: 3,
          minHeight: 40,           // VIS-001: match ADS input height
          padding: '0 10px',
          fontSize: 14,
          fontWeight: 500,
          fontFamily: 'var(--ds-font-family-body)',
          color: token('color.text', '#172B4D'),
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          outline: 'none',
        }}
      >
        {status}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Inline picker — keyboard-accessible listbox (A11Y-002/A11Y-004) */}
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
            fontFamily: 'var(--ds-font-family-body)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: token('color.text.subtlest', '#8590A2'),
          }}>
            Change status
          </div>
          {options.map((opt, idx) => (
            <div
              key={opt.value}
              id={`status-option-${opt.value}`}
              role="option"
              aria-selected={status === opt.value}
              onClick={() => selectOption(idx)}
              onMouseEnter={() => setActiveIdx(idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                background: idx === activeIdx
                  ? token('color.background.neutral.hovered', 'rgba(9,30,66,0.06)')
                  : status === opt.value
                  ? token('color.background.selected', 'rgba(37,99,235,0.08)')
                  : 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--ds-font-family-body)',
                fontSize: 14,
                color: token('color.text', '#172B4D'),
                outline: 'none',
              }}
            >
              <Lozenge appearance={statusAppearance(opt.value)} isBold>
                {opt.label}
              </Lozenge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CreateStoryModal({
  open,
  onClose,
  projectId,
  projectKey,
  onSuccess,
  linkedSource,
}: CreateStoryModalProps) {
  const { user } = useAuth();
  const { form, updateField, reset } = useCreateStoryForm(projectId);
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useTeamMembers();
  const { data: releases = [] } = useProjectReleases(form.projectId);
  const createMutation = useCreateStoryMutation();

  const [workType, setWorkType] = useState<string>('Story');
  const [createAnother, setCreateAnother] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // BEH-003: blur-based summary validation — error shows after leaving empty field
  const [summaryBlurred, setSummaryBlurred] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isCreateLinkedMode = !!linkedSource;
  const currentProject = projects.find((p) => p.id === form.projectId);
  const resolvedKey = currentProject?.key ?? projectKey ?? '';

  // ── Default reporter to current user ─────────────────────────────────────
  useEffect(() => {
    if (open && user?.id && !form.reporterId) {
      updateField('reporterId', user.id);
    }
  }, [open, user?.id, form.reporterId, updateField]);

  // ── Default project from prop (id or key) ────────────────────────────────
  useEffect(() => {
    if (form.projectId) return;
    if (projectId) {
      updateField('projectId', projectId);
      return;
    }
    if (projectKey && projects.length > 0) {
      const match = projects.find((p) => p.key === projectKey);
      if (match) updateField('projectId', match.id);
    }
  }, [projectId, projectKey, projects, form.projectId, updateField]);

  // ── Status auto-syncs to work-type's initial status ──────────────────────
  useEffect(() => {
    const initial = INITIAL_STATUS_BY_TYPE[workType] ?? 'To Do';
    if (form.status !== initial) updateField('status', initial);
  }, [workType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Options ──────────────────────────────────────────────────────────────
  const projectOptions: IconOption[] = useMemo(
    () =>
      projects.map((p: any) => ({
        value: p.id,
        label: p.name,
        // no sublabel — ProjectKey pill already shows the key; sublabel would duplicate it
        icon: <ProjectKey k={p.key} />,
      })),
    [projects],
  );

  const workTypeOptions: IconOption[] = useMemo(
    () =>
      WORK_TYPES.map((t) => ({
        value: t,
        label: t,
        icon: <JiraIssueTypeIcon type={t} size={16} />,
      })),
    [],
  );

  const priorityOptions: IconOption[] = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        value: p,
        label: p,
        icon: <PriorityIcon name={p} />,
      })),
    [],
  );

  const memberOptions: IconOption[] = useMemo(
    () =>
      members.map((m: any) => ({
        value: m.id,
        label: m.full_name ?? m.email ?? 'Unknown',
        icon: <MiniAvatar name={m.full_name ?? m.email ?? '?'} avatarUrl={m.avatar_url ?? null} />,
      })),
    [members],
  );

  const releaseOptions: IconOption[] = useMemo(
    () => [
      { value: '', label: 'None' },
      ...releases.map((r: any) => ({ value: r.id, label: r.name })),
    ],
    [releases],
  );

  // STR-005: Fetch existing label vocabulary from catalyst_issues so users can
  // see and reuse existing labels. CreatableSelect lets them add new ones too.
  const { data: existingLabelsRaw = [] } = useQuery({
    queryKey: ['catalyst-issue-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('catalyst_issues')
        .select('labels')
        .not('labels', 'is', null);
      if (error || !data) return [];
      // Flatten nested arrays, deduplicate, sort
      const all = data.flatMap((r: any) => Array.isArray(r.labels) ? r.labels : []);
      return [...new Set(all)].sort() as string[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Vocabulary options for CreatableSelect — merges DB labels with current selection
  const labelOptions: IconOption[] = useMemo(() => {
    const vocab = new Set([...existingLabelsRaw, ...(form.labels ?? [])]);
    return [...vocab].sort().map(l => ({ value: l, label: l }));
  }, [existingLabelsRaw, form.labels]);

  // Currently selected values (subset of labelOptions)
  const labelValue: IconOption[] = useMemo(
    () => (form.labels ?? []).map(l => ({ value: l, label: l })),
    [form.labels],
  );

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setSubmitAttempted(true);
    setFormError(null);

    if (!form.projectId) {
      setFormError('Space is required');
      return;
    }
    if (!form.summary.trim()) {
      // Field-level error renders via ErrorMessage when submitAttempted=true
      return;
    }
    if (!form.reporterId) {
      setFormError('Reporter is required');
      return;
    }
    if (isCreateLinkedMode && !linkedSource) {
      setFormError('Linked source missing');
      return;
    }

    try {
      const result = await createMutation.mutateAsync({
        form,
        projectKey: resolvedKey,
        issueType: workType,
      });

      // Auto-link in createLinked mode (preserve legacy behaviour)
      if (isCreateLinkedMode && linkedSource) {
        try {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (!authUser) throw new Error('Not authenticated');
          await supabase.from('ph_issue_links').insert({
            source_id: linkedSource.issueKey,
            target_id: result.issue_key,
            link_type: linkedSource.linkType ?? 'relates to',
            created_by: authUser.id,
          } as any);
        } catch (linkErr: any) {
          catalystToast.warning(
            `${result.issue_key} created, but linking failed`,
            linkErr?.message ?? 'Please link manually',
          );
          onSuccess?.(result.issue_key);
          onClose();
          reset();
          return;
        }
      }

      catalystToast.success(`${result.issue_key} created`);
      onSuccess?.(result.issue_key);

      if (createAnother && !isCreateLinkedMode) {
        reset(true);
        setSubmitAttempted(false);
      } else {
        onClose();
        reset();
      }
    } catch (err: any) {
      setFormError(err?.message ?? 'Failed to create work item');
    }
  }, [
    form,
    resolvedKey,
    workType,
    createMutation,
    isCreateLinkedMode,
    linkedSource,
    onSuccess,
    onClose,
    reset,
    createAnother,
  ]);

  const handleClose = useCallback(() => {
    setSubmitAttempted(false);
    setSummaryBlurred(false);
    setFormError(null);
    onClose();
  }, [onClose]);

  // BEH-003: error on blur OR after submit attempt
  const summaryError =
    (submitAttempted || summaryBlurred) && !form.summary.trim()
      ? 'Summary is required'
      : undefined;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ModalTransition>
      {open && (
        <ModalDialog
          onClose={handleClose}
          width="large"
          shouldScrollInViewport
          autoFocus
        >
          <ModalHeader>
            <Box xcss={headerWrapperStyles}>
              <ModalTitle>
                {isCreateLinkedMode
                  ? 'Create linked work item'
                  : `Create ${workType}`}
              </ModalTitle>
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

          <ModalBody>
            <Box xcss={requiredHelperStyles}>
              Required fields are marked with an asterisk{' '}
              <span
                aria-hidden="true"
                style={{ color: token('color.text.danger') }}
              >
                *
              </span>
            </Box>

            <Box xcss={fieldGroupStyles}>
              {/* ── Project — required ────────────────────────────── */}
              <Field
                name="space"
                label="Project"
                isRequired
                defaultValue={form.projectId}
              >
                {({ fieldProps: { id, isRequired, isDisabled } }) => (
                  <>
                    <Select<IconOption>
                      id={id}
                      isRequired={isRequired}
                      isDisabled={isDisabled}
                      inputId="cs-space"
                      options={projectOptions}
                      value={
                        projectOptions.find(
                          (o) => o.value === form.projectId,
                        ) ?? null
                      }
                      onChange={(opt) =>
                        updateField('projectId', (opt as IconOption)?.value ?? '')
                      }
                      placeholder="Select project"
                      formatOptionLabel={formatIconOption}
                      isSearchable
                    />
                    {submitAttempted && !form.projectId && (
                      <ErrorMessage>Space is required</ErrorMessage>
                    )}
                  </>
                )}
              </Field>

              {/* ── Work type — required ───────────────────────────── */}
              <Field name="workType" label="Work type" isRequired>
                {({ fieldProps: { id, isRequired, isDisabled } }) => (
                  <>
                    <Select<IconOption>
                      id={id}
                      isRequired={isRequired}
                      isDisabled={isDisabled}
                      inputId="cs-worktype"
                      options={workTypeOptions}
                      value={
                        workTypeOptions.find((o) => o.value === workType) ??
                        null
                      }
                      onChange={(opt) =>
                        setWorkType((opt as IconOption)?.value ?? 'Story')
                      }
                      formatOptionLabel={formatIconOption}
                      isSearchable={false}
                    />
                    <a
                      href="https://support.atlassian.com/jira-software-cloud/docs/what-are-issue-types/"
                      target="jira-help"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); window.open((e.currentTarget as HTMLAnchorElement).href, 'jira-help', 'width=600,height=500,noopener,noreferrer'); }}
                    >
                      <Box xcss={helperLinkStyles}>
                        Learn about work types
                        <ShortcutIcon label="" size="small" />
                      </Box>
                    </a>
                  </>
                )}
              </Field>

              <Box xcss={dividerStyles} />

              {/* ── Status — manual label (StatusChip is not a native input;
                  ADS Field renders the label inline which breaks the layout).
                  Accessibility: chip trigger has aria-label + aria-haspopup.
                  Screen readers will announce via aria-label on the button. */}
              <div>
                {/* Label styled to match ADS Field label: 12px/600/color.text.subtle */}
                <label
                  htmlFor={STATUS_CHIP_TRIGGER_ID}
                  style={{
                    fontFamily: 'var(--ds-font-family-body)',
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
                <StatusChip
                  status={form.status}
                  workType={workType}
                  onChange={(s) => updateField('status', s)}
                />
                <p style={{
                  fontFamily: 'var(--ds-font-family-body)',
                  fontSize: 12,
                  color: token('color.text.subtlest', '#8590A2'),
                  marginTop: 4,
                  lineHeight: '16px',
                }}>
                  This is the initial status upon creation
                </p>
              </div>

              {/* ── Summary — required ─────────────────────────────── */}
              <Field name="summary" label="Summary" isRequired>
                {({ fieldProps }) => (
                  <>
                    <Textfield
                      {...(fieldProps as any)}
                      autoFocus
                      isInvalid={!!summaryError}
                      value={form.summary}
                      onChange={(e: any) =>
                        updateField('summary', e.target.value)
                      }
                      onBlur={() => setSummaryBlurred(true)}
                      maxLength={200}
                    />
                    {summaryError && (
                      <ErrorMessage>{summaryError}</ErrorMessage>
                    )}
                  </>
                )}
              </Field>

              {/* ── Parent ─────────────────────────────────────────── */}
              <Field name="parent" label="Parent">
                {({ fieldProps: { id, isDisabled } }) => (
                  <>
                    <AsyncSelect<IconOption>
                      key={`parent-${resolvedKey || 'none'}`}
                      id={id}
                      isDisabled={isDisabled || !resolvedKey}
                      inputId="cs-parent"
                      defaultOptions
                      loadOptions={async (input: string) => {
                        // Epics live in ph_issues (Jira-synced). Filter by project_key.
                        // resolvedKey = the Jira project key string e.g. "BAU"
                        if (!resolvedKey) return [];
                        const q = supabase
                          .from('ph_issues')
                          .select('id, issue_key, summary, issue_type')
                          .eq('project_key', resolvedKey)
                          .ilike('issue_type', 'Epic')
                          .order('jira_updated_at', { ascending: false })
                          .limit(30);
                        if (input.trim()) {
                          q.or(`issue_key.ilike.%${input}%,summary.ilike.%${input}%`);
                        }
                        const { data, error } = await q;
                        if (error) return [];
                        return (data ?? []).map((d: any) => ({
                          value: d.id,
                          label: d.summary,
                          sublabel: d.issue_key,
                          icon: <JiraIssueTypeIcon type="Epic" size={14} />,
                        }));
                      }}
                      onChange={(opt) =>
                        updateField(
                          'parentId',
                          (opt as IconOption)?.value ?? null,
                        )
                      }
                      placeholder={resolvedKey ? 'Select parent' : 'Select a project first'}
                      formatOptionLabel={formatIconOption}
                      isClearable
                    />
                    <HelperMessage>
                      Your work type hierarchy determines the work items
                      you can select here.
                    </HelperMessage>
                  </>
                )}
              </Field>

              {/* ── Priority ───────────────────────────────────────── */}
              <Field name="priority" label="Priority">
                {({ fieldProps }) => (
                  <>
                    <Select<IconOption>
                      {...fieldProps}
                      inputId="cs-priority"
                      options={priorityOptions}
                      value={
                        priorityOptions.find(
                          (o) => o.value === form.priority,
                        ) ?? priorityOptions[2]
                      }
                      onChange={(opt) =>
                        updateField(
                          'priority',
                          (opt as IconOption)?.value ?? 'Medium',
                        )
                      }
                      formatOptionLabel={formatIconOption}
                      isSearchable={false}
                    />
                    <a
                      href="https://support.atlassian.com/jira-software-cloud/docs/what-is-issue-priority/"
                      target="jira-help"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); window.open((e.currentTarget as HTMLAnchorElement).href, 'jira-help', 'width=600,height=500,noopener,noreferrer'); }}
                    >
                      <Box xcss={helperLinkStyles}>
                        Learn about priority levels
                        <ShortcutIcon label="" size="small" />
                      </Box>
                    </a>
                  </>
                )}
              </Field>

              {/* ── Description ─────────────────────────────────────── */}
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
                      {/* Identical pattern to StoryDetailModal — no appearance override */}
                      <EpicDescriptionEditor
                        workItemId="__create__"
                        initialContent={form.descriptionAdf ?? null}
                        placeholder="Add a description..."
                        onSave={(adfJson: string) => {
                          try {
                            const parsed = JSON.parse(adfJson);
                            updateField('descriptionAdf', parsed);
                            updateField('description', JSON.stringify(parsed));
                          } catch { /* noop */ }
                        }}
                        onCancel={() => undefined}
                      />
                    </Suspense>
                  </Box>
                )}
              </Field>

              {/* ── Fix versions ────────────────────────────────────── */}
              <Field name="fixVersions" label="Fix versions">
                {({ fieldProps }) => (
                  <Select<IconOption>
                    {...fieldProps}
                    inputId="cs-fixversions"
                    options={releaseOptions}
                    value={
                      releaseOptions.find(
                        (o) => o.value === (form.releaseId ?? ''),
                      ) ?? null
                    }
                    onChange={(opt) =>
                      updateField(
                        'releaseId',
                        (opt as IconOption)?.value || null,
                      )
                    }
                    isClearable
                    placeholder=""
                  />
                )}
              </Field>

              {/* ── Assignee + Assign to me ────────────────────────── */}
              <Field name="assignee" label="Assignee">
                {({ fieldProps }) => (
                  <>
                    <Inline alignBlock="center" spread="space-between">
                      <Box xcss={xcss({ flex: '1' })}>
                        <Select<IconOption>
                          {...fieldProps}
                          inputId="cs-assignee"
                          options={[
                            {
                              value: '__AUTOMATIC__',
                              label: 'Automatic',
                              icon: <MiniAvatar name="?" />,
                            },
                            ...memberOptions,
                          ]}
                          value={
                            form.assigneeId
                              ? memberOptions.find(
                                  (o) => o.value === form.assigneeId,
                                ) ?? null
                              : {
                                  value: '__AUTOMATIC__',
                                  label: 'Automatic',
                                  icon: <MiniAvatar name="?" />,
                                }
                          }
                          onChange={(opt) => {
                            const v = (opt as IconOption)?.value;
                            updateField(
                              'assigneeId',
                              !v || v === '__AUTOMATIC__' ? null : v,
                            );
                          }}
                          formatOptionLabel={formatIconOption}
                          isClearable
                          placeholder="Automatic"
                        />
                      </Box>
                    </Inline>
                    <Box xcss={xcss({ marginTop: 'space.075' })}>
                      <Button
                        appearance="subtle"
                        spacing="compact"
                        onClick={() => {
                          if (user?.id) updateField('assigneeId', user.id);
                        }}
                      >
                        Assign to me
                      </Button>
                    </Box>
                  </>
                )}
              </Field>

              {/* ── Reporter — required, current user ──────────────── */}
              <Field name="reporter" label="Reporter" isRequired>
                {({ fieldProps }) => {
                  const reporter = members.find(
                    (m: any) => m.id === form.reporterId,
                  );
                  return (
                    <>
                      {reporter ? (
                        <Box xcss={reporterReadonlyBoxStyles}>
                          <MiniAvatar
                            name={reporter.full_name ?? reporter.email ?? '?'}
                            avatarUrl={(reporter as any).avatar_url ?? null}
                          />
                          <span>
                            {reporter.full_name ?? reporter.email ?? '—'}
                          </span>
                        </Box>
                      ) : (
                        <Select<IconOption>
                          inputId="cs-reporter"
                          name={fieldProps.name}
                          isRequired={fieldProps.isRequired}
                          isDisabled={fieldProps.isDisabled}
                          isInvalid={fieldProps.isInvalid}
                          onBlur={fieldProps.onBlur}
                          onFocus={fieldProps.onFocus}
                          options={memberOptions}
                          value={memberOptions.find((o) => o.value === form.reporterId) ?? null}
                          onChange={(opt) =>
                            updateField(
                              'reporterId',
                              (opt as IconOption)?.value ?? null,
                            )
                          }
                          formatOptionLabel={formatIconOption}
                          placeholder="Select reporter"
                        />
                      )}
                      {submitAttempted && !form.reporterId && (
                        <ErrorMessage>Reporter is required</ErrorMessage>
                      )}
                    </>
                  );
                }}
              </Field>

              {/* ── Labels (multi, creatable) ──────────────────────── */}
              <Field name="labels" label="Labels">
                {({ fieldProps }) => (
                  <CreatableSelect<IconOption, true>
                    {...(fieldProps as any)}
                    inputId="cs-labels"
                    isMulti
                    options={labelOptions}   // vocabulary (DB + current selection)
                    value={labelValue}       // currently selected subset
                    onChange={(vals: any) =>
                      updateField(
                        'labels',
                        (vals ?? []).map((v: any) => v.value),
                      )
                    }
                    placeholder="Select label"
                    formatCreateLabel={(input: string) => `Create "${input}"`}
                  />
                )}
              </Field>


              {formError && (
                <Box
                  xcss={xcss({
                    padding: 'space.150',
                    borderRadius: 'border.radius',
                    backgroundColor: 'color.background.danger',
                    color: 'color.text.danger',
                    font: 'font.body.small',
                  })}
                >
                  {formError}
                </Box>
              )}
            </Box>
          </ModalBody>

          <ModalFooter>
            <Box xcss={footerLeftStyles}>
              <Checkbox
                label="Create another"
                isChecked={createAnother}
                onChange={(e) => setCreateAnother(e.target.checked)}
              />
            </Box>
            <Box xcss={footerRightStyles}>
              <Button appearance="subtle" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                appearance="primary"
                isLoading={createMutation.isPending}
                onClick={handleSubmit}
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

export default CreateStoryModal;

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

function ProjectKey({ k }: { k: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 22,
        height: 18,
        padding: `0 ${token('space.075')}`,
        borderRadius: '3px',
        background: token('color.background.brand.bold'),
        color: token('color.text.inverse'),
        font: token('font.body.small'),
        fontWeight: 700,
        letterSpacing: '0.02em',
      }}
    >
      {k}
    </span>
  );
}
