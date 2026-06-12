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
 *   - @atlaskit/editor-core          Description field — ADF ProseMirror editor (Jira-parity)
 *
 * Callers (unchanged contract):
 *   - src/components/ja/CreateDropdown.tsx                (top nav + Create)
 *   - src/modules/.../linked-work-items/LinkedWorkItems.tsx
 *   - src/modules/.../story-detail-modules/LinkedIssuesSection.tsx
 */
import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import ReactDOM from 'react-dom';
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
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { tiptapToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/tiptapToAdf';
import { Checkbox } from '@atlaskit/checkbox';
import Avatar from '@atlaskit/avatar';
import Button, { IconButton } from '@atlaskit/button/new';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Lozenge from '@atlaskit/lozenge';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';

import './create-story.css';

import { TitleTranslateWrapper } from '@/components/shared/title-translate/TitleTranslateWrapper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// Canonical Atlaskit flag wrapper (pure @atlaskit/flag + Atlaskit icons,
// drop-in for catalystToast). Reset to Jira-canonical toast per audit.
import { flag } from '@/components/shared/JiraTable/flags';
import { useAuth } from '@/hooks/useAuth';
// WorkItemTypeIcon is the canonical Catalyst icon — backed by useIconOverrides
// so /admin/icons overrides are honoured automatically (Bucket C, 2026-05-09).
import { WorkItemTypeIcon } from '@/components/icons/WorkItemTypeIcon';
import { resolveAvatarUrl } from '@/lib/avatars';
import ProjectIcon from '@/components/shared/ProjectIcon';
// Canonical priority icon — respects admin overrides + bundled registry.
// Replaces inline custom SVG that bypassed the override system.
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import {
  useCreateStoryForm,
  useProjects,
  useTeamMembers,
  useProjectReleases,
  useCreateStoryMutation,
  useWorkflowStatuses,
} from './useCreateStory';

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
  /**
   * When provided, selecting "Business Request" as the work type will close this modal
   * and call this callback so the caller can open CreateBusinessRequestModal instead.
   */
  onOpenBusinessRequest?: () => void;
  /**
   * Optional restricted list of work-type options. When omitted, the modal
   * shows the full WORK_TYPES catalogue. Product hub passes
   * ['Business Request'] so the dropdown shows only that single option.
   */
  workTypes?: readonly string[];
  /** Initial value for the Work type field. Defaults to 'Story'. */
  defaultWorkType?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Static option vocabularies (mirrored from legacy modal)
// ─────────────────────────────────────────────────────────────────────────────

// 2026-05-09 — Task and API Requirement deprecated (Vikram directive):
//   Task → belongs to task module, not project hub.
//   API Requirement → removed entirely.
const WORK_TYPES = [
  'Story',
  'Epic',
  'Feature',
  'Business Request',
  'Business Gap',
  'QA Bug',
  'Production Incident',
  'Change Request',
] as const;

const PRIORITIES = ['Highest', 'High', 'Medium', 'Low', 'Lowest'] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Parent hierarchy rules — Vikram directive 2026-05-09.
// Maps each work type to the list of eligible parent types.
// 'Business Request' entries are resolved from business_requests table;
// all other types from ph_issues.
// Exported for unit tests.
// ─────────────────────────────────────────────────────────────────────────────
export const PARENT_TYPE_RULES: Record<string, string[]> = {
  'Story':               ['Feature', 'Epic'],
  'Epic':                ['Business Request'],
  'Feature':             ['Epic', 'Business Request'],
  'Business Request':    [],  // top-level, no parent
  'Business Gap':        ['Business Request', 'Epic'],
  'QA Bug':              ['Feature', 'Story'],
  'Production Incident': ['Business Request', 'Story', 'Feature', 'Epic'],
  'Change Request':      ['Epic', 'Business Request', 'Feature'],
};

// Per type → which initial status appears in the read-only Status lozenge.
// Matches what the existing useCreateStoryMutation actually writes.
// Minimal fallback — only shown when catalyst_workflow_schemes returns no rows
// for a work type (e.g. types not yet configured in the DB).
// Canonical source: useWorkflowStatuses (catalyst_workflow_schemes/_statuses).
// INITIAL_STATUS_BY_TYPE removed 2026-05-09 (Bucket B): canonical initial
// status comes from DB (useWorkflowStatuses.is_initial); hard fallback is 'To Do'.
const DEFAULT_STATUS_OPTIONS = [
  { value: 'To Do', label: 'To Do' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Done', label: 'Done' },
];

// Lozenge appearance buckets — Atlaskit gives us 5 named appearances and we
// map to the 3-color status guardrail (CLAUDE.md §5):
//   default (grey)  → To Do / Backlog / Open / In Requirements / Submitted
//   inprogress (blue) → In Progress / In Review / etc.
//   success (green) → Done
// Exported as `statusAppearanceForTest` for unit tests (Bucket B, 2026-05-09).
export function statusAppearanceForTest(
  status: string,
): 'default' | 'inprogress' | 'success' {
  const s = status.toLowerCase();
  if (s === 'done' || s === 'closed' || s === 'resolved') return 'success';
  if (s.startsWith('in ') || s === 'in progress' || s.includes('progress') || s.includes('review')) {
    return 'inprogress';
  }
  return 'default';
}
// Internal alias — keeps call sites unchanged.
const statusAppearance = statusAppearanceForTest;


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
  gap: 'space.200',
});

const dividerStyles = xcss({
  borderBottomWidth: 'border.width',
  borderBottomStyle: 'solid',
  borderColor: 'color.border',
  marginBlock: 'space.100',
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

const statusHelperStyles = xcss({
  marginBlockStart: 'space.025',
});

const assignToMeStyles = xcss({
  marginTop: 'space.075',
});

const flexOneStyles = xcss({
  flex: '1',
});

const errorBannerStyles = xcss({
  padding: 'space.150',
  borderRadius: 'border.radius',
  backgroundColor: 'color.background.danger',
  color: 'color.text.danger',
  font: 'font.body.small',
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

// ── MoreActionsButton — @atlaskit/dropdown-menu (canonical ADS primitive) ────
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
    >
      <DropdownItemGroup>
        <DropdownItem>Give feedback</DropdownItem>
        <DropdownItem>Help</DropdownItem>
      </DropdownItemGroup>
    </DropdownMenu>
  );
}

// ── StatusChip removed 2026-04-29 — replaced with @atlaskit/select +
//    @atlaskit/lozenge via formatOptionLabel for true Jira parity and
//    full dark-mode token resolution. See lines ~1109 for the new render.


// MiniAvatar — canonical @atlaskit/avatar xsmall (24px, ADS-compliant).
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
// MAIN
// ─────────────────────────────────────────────────────────────────────────────

export function CreateStoryModal({
  open,
  onClose,
  projectId,
  projectKey,
  onSuccess,
  linkedSource,
  onOpenBusinessRequest,
  workTypes,
  defaultWorkType = 'Story',
}: CreateStoryModalProps) {
  const { user } = useAuth();
  const { form, updateField, reset } = useCreateStoryForm(projectId);
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useTeamMembers();
  const { data: releases = [], isLoading: releasesLoading, error: releasesError } = useProjectReleases(form.projectId);

  const createMutation = useCreateStoryMutation();

  const [workType, setWorkType] = useState<string>(defaultWorkType);
  const [createAnother, setCreateAnother] = useState(false);
  // Status portal-dropdown — replaces @atlaskit/dropdown-menu (which routes
  // through @atlaskit/portal and renders at 0,0 inside this modal's
  // non-portaled build, per the comment at the top of the file).
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<{ top: number; left: number; width: number } | null>(null);
  const statusTriggerRef = useRef<HTMLButtonElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  // Incremented each time the form is reset — forces EpicDescriptionEditor to remount with empty content.
  const [editorKey, setEditorKey] = useState(0);

  // Dynamic workflow statuses from catalyst_workflow_schemes/_statuses.
  // Falls back to DEFAULT_STATUS_OPTIONS when DB returns no rows
  // (e.g. unmapped work types like Feature / API Requirement).
  const { data: workflowStatuses = [], isLoading: statusesLoading } =
    useWorkflowStatuses(workType, form.projectId);

  const dbStatusOptions = useMemo(
    () => workflowStatuses.map((s) => ({ value: s.value, label: s.label })),
    [workflowStatuses],
  );
  // DB-first: canonical statuses from catalyst_workflow_schemes.
  // Falls back to DEFAULT_STATUS_OPTIONS only when the DB returns nothing
  // (e.g. work type not yet configured in catalyst_workflow_schemes).
  const resolvedStatusOptions =
    dbStatusOptions.length > 0 ? dbStatusOptions : DEFAULT_STATUS_OPTIONS;

  const dbInitialStatus = useMemo(
    () => workflowStatuses.find((s) => s.is_initial)?.value,
    [workflowStatuses],
  );
  const [submitAttempted, setSubmitAttempted] = useState(false);
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

  // ── Status auto-syncs to work-type's initial status (DB-first, 'To Do' fallback) ──
  // Canonical source: catalyst_workflow_schemes/_statuses via useWorkflowStatuses.
  // INITIAL_STATUS_BY_TYPE removed (Bucket B, 2026-05-09) — DB is the only authority.
  useEffect(() => {
    if (statusesLoading) return;
    const initial = dbInitialStatus ?? 'To Do';
    if (form.status !== initial) updateField('status', initial);
  }, [workType, dbInitialStatus, statusesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Options ──────────────────────────────────────────────────────────────
  const projectOptions: IconOption[] = useMemo(
    () =>
      projects.map((p: any) => ({
        value: p.id,
        label: p.name,
        icon: (
          // Bucket F (2026-05-09): pass iconName + color so Lucide fallback
          // works for non-bundled-registry projects (ph_projects data joined).
          <ProjectIcon
            projectKey={p.key ?? undefined}
            avatarUrl={p.avatar_url ?? null}
            iconName={p.iconName ?? null}
            color={p.phColor ?? null}
            name={p.name}
            size="small"
          />
        ),
      })),
    [projects],
  );

  // Source list — restricted by the caller (e.g. product hub passes
  // ['Business Request']) or falls back to the full catalogue.
  const effectiveWorkTypes = workTypes ?? WORK_TYPES;
  const workTypeOptions: IconOption[] = useMemo(
    () =>
      effectiveWorkTypes.map((t) => ({
        value: t,
        label: t,
        icon: <WorkItemTypeIcon type={t} size={16} />,
      })),
    [effectiveWorkTypes],
  );

  // ── Status pill colors (token-mapped to status category) ────────────────
  // Maps the 3-bucket statusAppearance (success/inprogress/default) to ADS
  // background + text tokens so each status renders as a colored lozenge in
  // BOTH the trigger button and the dropdown options.
  const getStatusPillColors = useCallback((label: string): { background: string; color: string } => {
    const appearance = statusAppearance(label);
    if (appearance === 'success') {
      return {
        background: token('color.background.success', '#DCFFF1'),
        color: token('color.text.success', '#216E4E'),
      };
    }
    if (appearance === 'inprogress') {
      return {
        background: token('color.background.information', '#E9F2FF'),
        color: token('color.text.information', '#0055CC'),
      };
    }
    return {
      background: token('color.background.neutral', '#DCDFE4'),
      color: token('color.text', '#172B4D'),
    };
  }, []);
  const StatusPill = useCallback(({ label }: { label: string }) => {
    const c = getStatusPillColors(label);
    return (
      <span
        style={{
          display: 'inline-block',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 11,
          fontWeight: 500,
          textTransform: 'none' as const,
          letterSpacing: 'normal',
          lineHeight: '14px',
          background: c.background,
          color: c.color,
        }}
      >
        {label}
      </span>
    );
  }, [getStatusPillColors]);

  // ── Status portal-dropdown wiring ───────────────────────────────────────
  // Anchor recomputed on open AND on every scroll/resize so the menu glides
  // with the trigger when the user scrolls the modal body.
  const repositionStatusMenu = useCallback(() => {
    if (!statusTriggerRef.current) return;
    const r = statusTriggerRef.current.getBoundingClientRect();
    setStatusMenuAnchor({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);
  useLayoutEffect(() => {
    if (!statusMenuOpen) return;
    repositionStatusMenu();
  }, [statusMenuOpen, repositionStatusMenu]);
  useEffect(() => {
    if (!statusMenuOpen) return;
    // capture-phase scroll so we catch nested scroll containers (the modal body).
    window.addEventListener('scroll', repositionStatusMenu, true);
    window.addEventListener('resize', repositionStatusMenu);
    return () => {
      window.removeEventListener('scroll', repositionStatusMenu, true);
      window.removeEventListener('resize', repositionStatusMenu);
    };
  }, [statusMenuOpen, repositionStatusMenu]);
  useEffect(() => {
    if (!statusMenuOpen) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (statusTriggerRef.current?.contains(t)) return;
      if (statusMenuRef.current?.contains(t)) return;
      setStatusMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setStatusMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [statusMenuOpen]);

  const priorityOptions: IconOption[] = useMemo(
    () =>
      PRIORITIES.map((p) => ({
        value: p,
        label: p,
        icon: <PriorityIcon level={p} size={14} />,
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

    if (!form.projectId && workType !== 'Business Request') {
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
          flag.warning(
            `${result.issue_key} created, but linking failed`,
            linkErr?.message ?? 'Please link manually',
          );
          onSuccess?.(result.issue_key);
          onClose();
          reset();
          return;
        }
      }

      flag.success(`${result.issue_key} created`);
      onSuccess?.(result.issue_key);

      if (createAnother && !isCreateLinkedMode) {
        reset(true);
        setEditorKey(k => k + 1);
        setSubmitAttempted(false);
      } else {
        onClose();
        reset();
        setEditorKey(k => k + 1);
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
    setEditorKey,
  ]);

  const handleClose = useCallback(() => {
    setSubmitAttempted(false);
    setFormError(null);
    onClose();
  }, [onClose]);

  // Summary error only shows after an explicit submit attempt — never on load or blur.
  const summaryError =
    submitAttempted && !form.summary.trim() ? 'Summary is required' : undefined;

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
              {/* ── Work type — first so BR hand-off fires before Project is touched ── */}
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
                      onChange={(opt) => {
                        const selected = (opt as IconOption)?.value ?? 'Story';
                        // Business Request has its own dedicated form — hand off immediately.
                        if (selected === 'Business Request' && onOpenBusinessRequest) {
                          handleClose();
                          onOpenBusinessRequest();
                          return;
                        }
                        setWorkType(selected);
                      }}
                      formatOptionLabel={formatIconOption}
                      isSearchable={false}
                    />
                  </>
                )}
              </Field>

              {/* ── Project — only shown for non-BR types ─────────── */}
              {workType !== 'Business Request' && (
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
              )}

              {/* ── Status — clickable dropdown button (Jira-parity, 2026-05-09).
                  Jira DOM probe: BUTTON bg=rgba(5,21,36,0.06) br=3px fw=500 cursor=pointer.
                  Opens workflow status options from resolvedStatusOptions.
                  Helper text: "This is the initial status upon creation" (Jira-canonical). */}
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
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'transparent',
                          border: 'none',
                          borderRadius: 3,
                          padding: '4px 6px 4px 0',
                          cursor: 'pointer',
                          color: token('color.text.subtle', '#42526E'),
                        }}
                      >
                        <StatusPill label={form.status || 'To Do'} />
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
                        {resolvedStatusOptions.map((opt) => {
                          const selected = form.status === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                updateField('status', opt.value);
                                setStatusMenuOpen(false);
                                statusTriggerRef.current?.focus();
                              }}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                width: '100%',
                                padding: '8px 12px',
                                border: 'none',
                                outline: 'none',
                                background: 'transparent',
                                color: token('color.text', '#292A2E'),
                                fontSize: 14,
                                fontWeight: 400,
                                fontFamily: 'inherit',
                                textAlign: 'left',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = token('color.background.neutral.subtle.hovered', 'rgba(9,30,66,0.06)'); }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <StatusPill label={opt.label} />
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
                    <Box xcss={statusHelperStyles}>
                      <span style={{ fontSize: 12, color: token('color.text.subtlest', '#6B778C') }}>
                        This is the initial status upon creation
                      </span>
                    </Box>
                  </>
                )}
              </Field>

              {/* ── Summary — required, with RTL auto-detect + CATY translate ── */}
              <Field name="summary" label="Summary" isRequired>
                {({ fieldProps }) => (
                  <>
                    <TitleTranslateWrapper
                      value={form.summary}
                      onValueChange={(next) => updateField('summary', next)}
                      field="summary"
                    >
                      {({ dir }) => (
                        <Textfield
                          {...(fieldProps as any)}
                          autoFocus
                          isInvalid={!!summaryError}
                          value={form.summary}
                          onChange={(e: any) =>
                            updateField('summary', e.target.value)
                          }
                          maxLength={200}
                          dir={dir}
                        />
                      )}
                    </TitleTranslateWrapper>
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
                        // Bucket E (2026-05-09): parent types driven by PARENT_TYPE_RULES.
                        // All parent types — including 'Business Request' — live in ph_issues
                        // for the BAU project (source='catalyst'|'jira', issue_type='Business Request').
                        // The separate business_requests table is for the Demand Hub module and
                        // is not used here (it is empty for project-hub BAU items).
                        if (!resolvedKey) return [];
                        const eligibleTypes = PARENT_TYPE_RULES[workType] ?? [];
                        if (eligibleTypes.length === 0) return [];

                        const searchTerm = input.trim();
                        const results: IconOption[] = [];

                        // All eligible parent types come from ph_issues for this project
                        let q = supabase
                          .from('ph_issues')
                          .select('issue_key, summary, issue_type')
                          .eq('project_key', resolvedKey)
                          .in('issue_type', eligibleTypes)
                          .order('jira_updated_at', { ascending: false })
                          .limit(30);
                        if (searchTerm) {
                          q = q.or(`issue_key.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
                        }
                        const { data } = await q;
                        (data ?? []).forEach((d: any) => {
                          results.push({
                            value: d.issue_key,
                            label: d.summary,
                            sublabel: d.issue_key,
                            icon: <WorkItemTypeIcon type={d.issue_type} size={14} />,
                          });
                        });

                        return results;
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
                  </>
                )}
              </Field>

              {/* ── Description — ADF editor (Jira-parity, non-negotiable) ─── */}
              {/* appearance="comment" gives the Jira-grade primary toolbar (Tt/B/lists/etc.)
                  The editor's own Save/Cancel buttons are suppressed via the
                  cs-adf-desc-wrapper class — modal footer owns submission. */}
              <Field name="description" label="Description">
                {() => (
                  <div className="cs-adf-desc-wrapper">
                    {/* Canonical Tiptap surface (RichTextEditor) used
                        headless: the modal owns the Create/Cancel
                        footer, so we suppress the editor's built-in
                        Save/Cancel row via hideActionButtons and
                        capture live ADF through onChange + tiptapToAdf. */}
                    <RichTextEditor
                      key={editorKey}
                      initialAdf={null}
                      hideActionButtons
                      onSave={() => {}}
                      onCancel={() => {}}
                      onChange={(tiptapJson) => {
                        try {
                          updateField('descriptionAdf', tiptapToAdf(tiptapJson));
                        } catch {
                          updateField('descriptionAdf', null);
                        }
                      }}
                    />
                  </div>
                )}
              </Field>

              {/* ── Sprint/Iteration ────────────────────────────────────── */}
              <Field name="sprintRelease" label="Sprint/Iteration">
                {({ fieldProps }) => (
                  <Select<IconOption>
                    {...fieldProps}
                    inputId="cs-sprintrelease"
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
                      <Box xcss={flexOneStyles}>
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
                    <Box xcss={assignToMeStyles}>
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

              {/* ── Reporter — required, current user (ADS: disabled Select) ── */}
              <Field name="reporter" label="Reporter" isRequired>
                {({ fieldProps }) => {
                  const reporterOption = memberOptions.find(
                    (o) => o.value === form.reporterId,
                  ) ?? null;
                  // Reporter is pre-filled with the current user and is read-only.
                  // Render as a disabled @atlaskit/select so it matches the ADS
                  // form-field visual language without a hand-rolled Box.
                  return (
                    <>
                      <Select<IconOption>
                        inputId="cs-reporter"
                        name={fieldProps.name}
                        isRequired={fieldProps.isRequired}
                        isInvalid={fieldProps.isInvalid}
                        onBlur={fieldProps.onBlur}
                        onFocus={fieldProps.onFocus}
                        options={memberOptions}
                        value={reporterOption}
                        onChange={(opt) =>
                          updateField(
                            'reporterId',
                            (opt as IconOption)?.value ?? null,
                          )
                        }
                        formatOptionLabel={formatIconOption}
                        placeholder="Select reporter"
                        // Disable when a reporter is already set (defaults to current user).
                        // This preserves Jira's "Reporter = current user, not editable inline"
                        // pattern while using the ADS Select primitive throughout.
                        isDisabled={!!form.reporterId}
                      />
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
                <Box xcss={errorBannerStyles}>
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
