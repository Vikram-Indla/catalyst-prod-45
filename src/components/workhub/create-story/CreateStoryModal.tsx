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
  useMemo,
  useCallback,
  useRef,
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
import { RichTextEditor } from '@/components/catalyst-detail-views/shared/sections/Description/RichTextEditor';
import { tiptapToAdf } from '@/components/catalyst-detail-views/shared/sections/Description/utils/tiptapToAdf';
import { Checkbox } from '@atlaskit/checkbox';
import Avatar from '@atlaskit/avatar';
import Button, { IconButton } from '@atlaskit/button/new';
import Spinner from '@atlaskit/spinner';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import VidFullScreenOffIcon from '@atlaskit/icon/glyph/vid-full-screen-off';
import MoreIcon from '@atlaskit/icon/glyph/more';
import { statusToLozenge } from '@/modules/project-work-hub/utils/statusToLozenge';
import { CatalystStatusPill } from '@/components/catalyst-detail-views/shared/sections/CatalystStatusPill';

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
  useReleaseSprints,
  useProjectSprints,
  useCreateStoryMutation,
  useWorkflowStatuses,
} from './useCreateStory';
import { useIssueTypeWorkflow } from '@/hooks/useIssueTypeWorkflow';
// CAT-TASKS-20260627-001 Slice 9B — this canonical modal now natively handles
// the Catalyst-native 'Task' work type (workstream instead of project, writes
// to the tasks table). Other work types are unchanged.
import { useNavigate } from 'react-router-dom';
import { useTaskWorkstreams } from '@/modules/tasks/hooks/useTaskWorkstreams';
import { useCreateTaskMutation } from '@/modules/tasks/components/CreateTaskModal/hooks/useCreateTaskMutation';
import { adfToPlainText } from '@/utils/adf';
import type { TaskPriority } from '@/modules/tasks/types';
// ── Defect (QA Bug) work type → tm_defects (TestHub) ──────────────────────────
import { DatePicker } from '@atlaskit/datetime-picker';
import { useCreateDefect, resolveTmProjectId } from '@/hooks/test-management/useDefects';
import type { DefectSeverity } from '@/types/test-management';

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
   * When provided, selecting "Task" as the work type closes this modal and
   * calls this callback so the caller can open the Tasks module's
   * CreateTaskModal (tasks are Catalyst-native, not ph_issues).
   */
  onOpenTask?: () => void;
  /**
   * Optional restricted list of work-type options. When omitted, the modal
   * shows the full WORK_TYPES catalogue. Product hub passes
   * ['Business Request'] so the dropdown shows only that single option.
   */
  workTypes?: readonly string[];
  /** Initial value for the Work type field. Defaults to 'Story'. */
  defaultWorkType?: string;
  /**
   * Slice 9C — when opening as a Task (defaultWorkType='Task'), pre-selects this
   * workstream. Lets the retired bespoke CreateTaskModal's `defaultWorkstream`
   * contract flow through unchanged.
   */
  defaultWorkstreamId?: string;
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
  // Catalyst-native task (project-less). Selecting it hands off to the Tasks
  // module's CreateTaskModal via onOpenTask — it is NOT created in ph_issues.
  'Task',
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
  'Task':                [],  // project-less; handed off to CreateTaskModal
};

// Per type → which initial status appears in the read-only Status lozenge.
// Matches what the existing useCreateStoryMutation actually writes.
// Minimal fallback — only shown when catalyst_workflow_schemes returns no rows
// for a work type (e.g. types not yet configured in the DB).
// Canonical source: useWorkflowStatuses (catalyst_workflow_schemes/_statuses).
// INITIAL_STATUS_BY_TYPE removed 2026-05-09 (Bucket B): canonical initial
// status comes from DB (useWorkflowStatuses.is_initial); hard fallback is 'To Do'.
const DEFAULT_STATUS_OPTIONS = [
  { value: 'To Do', label: 'To Do', color_category: 'todo' },
  { value: 'In Progress', label: 'In Progress', color_category: 'in_progress' },
  { value: 'Done', label: 'Done', color_category: 'done' },
];

// ── Defect (QA Bug) option sets — tm_defects enums (CAT-TESTHUB-DEFECT-CANONICAL) ──
const DEFECT_STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color_category: 'todo' },
  { value: 'in_progress', label: 'In progress', color_category: 'in_progress' },
  { value: 'resolved', label: 'Resolved', color_category: 'done' },
  { value: 'closed', label: 'Closed', color_category: 'done' },
  { value: 'reopened', label: 'Reopened', color_category: 'todo' },
];
const DEFECT_SEVERITY_OPTIONS = [
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];
const DEFECT_ENVIRONMENT_OPTIONS = [
  { value: 'QA', label: 'QA' },
  { value: 'Staging', label: 'Staging' },
  { value: 'Beta', label: 'Beta' },
  { value: 'Prod', label: 'Prod' },
];
const DEFECT_SEVERITY_MAP: Record<string, DefectSeverity> = {
  critical: 'CRITICAL',
  high: 'MAJOR',
  medium: 'MINOR',
  low: 'TRIVIAL',
};

// Lozenge appearance buckets — Atlaskit gives us 5 named appearances and we
// map to the 3-color status guardrail (CLAUDE.md §5):
//   default (grey)  → To Do / Backlog / Open / In Requirements / Submitted
//   inprogress (blue) → In Progress / In Review / etc.
//   success (green) → Done
// Exported as `statusAppearanceForTest` for unit tests (Bucket B, 2026-05-09).
export function statusAppearanceForTest(
  status: string,
): 'default' | 'inprogress' | 'success' {
  const a = statusToLozenge(status);
  if (a === 'success') return 'success';
  if (a === 'inprogress') return 'inprogress';
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
  marginBottom: 'space.200',
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
function MiniAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return (
    <Avatar
      size="small"
      name={name}
      src={avatarUrl ?? resolveAvatarUrl(name) ?? undefined}
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
  onOpenTask,
  workTypes,
  defaultWorkType = 'Story',
  defaultWorkstreamId,
}: CreateStoryModalProps) {
  const { user } = useAuth();
  const { form, updateField, reset } = useCreateStoryForm(projectId);
  const { data: projects = [] } = useProjects();
  const { data: members = [] } = useTeamMembers();
  const { data: releases = [], isLoading: releasesLoading, error: releasesError } = useProjectReleases(form.projectId);
  // 2026-06-26: project-scope create uses sprints directly from
  // ph_jira_sprints (filtered by project_id), NOT sprints nested under a
  // release. The legacy useReleaseSprints call is kept above for back-compat
  // but the rendered Sprint dropdown now reads from sprintsByProject.
  const { data: sprintsByProject = [], isLoading: sprintsLoading } = useProjectSprints(form.projectId);
  const sprints = sprintsByProject;

  const createMutation = useCreateStoryMutation();

  const [workType, setWorkType] = useState<string>(defaultWorkType);
  // The modal is mounted persistently in the header (CreateDropdown), so its
  // work-type state would otherwise keep whatever value it had at first mount
  // and ignore the route-derived defaultWorkType. Re-sync on every open (and
  // when the prop changes, e.g. the Business Request hand-off) so the Tasks
  // module gets 'Task', product-hub backlog gets 'Business Request', etc.
  useEffect(() => {
    if (open) setWorkType(defaultWorkType);
  }, [open, defaultWorkType]);
  const [createAnother, setCreateAnother] = useState(false);
  // Incremented each time the form is reset — forces EpicDescriptionEditor to remount with empty content.
  const [editorKey, setEditorKey] = useState(0);

  // ── Slice 9B: Task work type (Catalyst-native, tasks table) ───────────────
  const isTask = workType === 'Task';
  const navigate = useNavigate();
  const { data: workstreams = [] } = useTaskWorkstreams(false);
  const createTaskMutation = useCreateTaskMutation();
  const [workstreamId, setWorkstreamId] = useState<string>(defaultWorkstreamId ?? '');
  // Pre-select the workstream when opened with one (e.g. created from a board).
  useEffect(() => {
    if (open && defaultWorkstreamId && !workstreamId) {
      setWorkstreamId(defaultWorkstreamId);
    }
  }, [open, defaultWorkstreamId, workstreamId]);
  // Task mode requires a workstream. When opened without an explicit one,
  // default to the first available workstream so the field isn't blank.
  useEffect(() => {
    if (open && isTask && !workstreamId && workstreams.length > 0) {
      setWorkstreamId(workstreams[0].id);
    }
  }, [open, isTask, workstreamId, workstreams]);
  const { data: taskStatuses = [] } = useQuery({
    queryKey: ['create-modal-task-statuses'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_statuses')
        .select('id, name, slug, is_default, position')
        .order('position');
      return (data ?? []) as Array<{ id: string; name: string; slug: string; is_default: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
  });
  const workstreamOptions: IconOption[] = useMemo(
    () => workstreams.map((w: any) => ({ value: w.id, label: w.name })),
    [workstreams],
  );
  const taskStatusOptions = useMemo(
    () => taskStatuses.map((s) => ({ value: s.name, label: s.name, color_category: s.slug })),
    [taskStatuses],
  );
  const defaultTaskStatusName = useMemo(
    () => taskStatuses.find((s) => s.is_default)?.name ?? taskStatuses[0]?.name ?? 'Backlog',
    [taskStatuses],
  );

  // ── Defect (QA Bug) work type — writes to tm_defects (TestHub) ────────────
  // The Project field always uses the canonical project list (projectOptions,
  // same as Story/Task). tm_defects.project_id FKs tm_projects, so the chosen
  // canonical project is resolved to (or provisioned as) a tm_projects row at
  // submit time via resolveTmProjectId — see handleSubmit's isDefect branch.
  const isDefect = workType === 'QA Bug';
  const createDefect = useCreateDefect();
  const [defectSeverity, setDefectSeverity] =
    useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [defectComponent, setDefectComponent] = useState('');
  const [defectEnvironment, setDefectEnvironment] = useState('');
  const [defectDueDate, setDefectDueDate] = useState('');
  const [defectExpectedAdf, setDefectExpectedAdf] = useState<unknown>(null);
  const [defectActualAdf, setDefectActualAdf] = useState<unknown>(null);
  const resetDefectState = useCallback(() => {
    setDefectSeverity('medium');
    setDefectComponent('');
    setDefectEnvironment('');
    setDefectDueDate('');
    setDefectExpectedAdf(null);
    setDefectActualAdf(null);
  }, []);

  // Primary: admin/workflows (ph_workflow_* tables) — shared canonical source.
  const {
    initialStatus: phInitialStatus,
    isLoading: phStatusesLoading,
    hasConfig: phHasConfig,
  } = useIssueTypeWorkflow(workType);

  // Secondary fallback: catalyst_workflow_schemes/_statuses (legacy per-type config).
  const { data: workflowStatuses = [], isLoading: legacyStatusesLoading } =
    useWorkflowStatuses(workType, form.projectId);

  const dbStatusOptions = useMemo(
    () => workflowStatuses.map((s) => ({ value: s.value, label: s.label, color_category: s.color_category })),
    [workflowStatuses],
  );
  const resolvedStatusOptions =
    dbStatusOptions.length > 0 ? dbStatusOptions : DEFAULT_STATUS_OPTIONS;

  // Initial status: ph_workflow_* first, legacy catalyst_workflow_* fallback, then 'To Do'
  const legacyInitialStatus = useMemo(
    () => workflowStatuses.find((s) => s.is_initial)?.value,
    [workflowStatuses],
  );
  const dbInitialStatus = phHasConfig ? phInitialStatus : legacyInitialStatus;
  const statusesLoading = phHasConfig ? phStatusesLoading : legacyStatusesLoading;
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
    if (isTask || isDefect) return; // task/defect default separately — see effects below
    if (statusesLoading) return;
    const initial = dbInitialStatus ?? 'To Do';
    if (form.status !== initial) updateField('status', initial);
  }, [isTask, isDefect, workType, dbInitialStatus, statusesLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Defect initial status = 'open' (tm_defect_status). Set when entering defect
  // mode or when the current status isn't a valid defect status.
  useEffect(() => {
    if (!isDefect) return;
    const valid = DEFECT_STATUS_OPTIONS.some((o) => o.value === form.status);
    if (!valid) updateField('status', 'open');
  }, [isDefect, form.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Task initial status = the default task status (Backlog). Set when entering
  // task mode or when the current status isn't a valid task status.
  useEffect(() => {
    if (!isTask || taskStatusOptions.length === 0) return;
    const valid = taskStatusOptions.some((o) => o.value === form.status);
    if (!valid) updateField('status', defaultTaskStatusName);
  }, [isTask, defaultTaskStatusName, taskStatusOptions]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const sprintOptions: IconOption[] = useMemo(
    () => sprints.map((s: any) => ({ value: s.id, label: s.name })),
    [sprints],
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

    // ── Slice 9B: Task writes to the tasks table (not ph_issues) ──────────
    if (isTask) {
      if (!workstreamId) {
        setFormError('Workstream is required');
        return;
      }
      if (!form.summary.trim()) return; // Summary ErrorMessage renders inline
      if (!form.reporterId) {
        setFormError('Reporter is required');
        return;
      }
      try {
        const statusId =
          taskStatuses.find((s) => s.name === form.status)?.id ??
          taskStatuses.find((s) => s.is_default)?.id;
        const adf = form.descriptionAdf ?? null;
        const result = await createTaskMutation.mutateAsync({
          title: form.summary.trim(),
          description: adf ? adfToPlainText(adf as any) : form.description || undefined,
          description_adf: adf ?? undefined,
          workstream_id: workstreamId,
          assignee_id: form.assigneeId || undefined,
          reporter_id: form.reporterId || undefined,
          labels: form.labels?.length ? form.labels : undefined,
          priority: (form.priority || 'Medium').toLowerCase() as TaskPriority,
          status_id: statusId || undefined,
          parent_work_item_key: form.parentId || undefined,
        });
        onSuccess?.(result.key); // success flag is shown by the task mutation
        if (createAnother) {
          reset(true);
          setWorkstreamId('');
          setEditorKey((k) => k + 1);
          setSubmitAttempted(false);
        } else {
          onClose();
          reset();
          setWorkstreamId('');
          setEditorKey((k) => k + 1);
          if (result.key) navigate(`/tasks/view/${result.key}`);
        }
      } catch (err: any) {
        setFormError(err?.message ?? 'Failed to create task');
      }
      return;
    }

    // ── Defect (QA Bug) writes to tm_defects (not ph_issues) ──────────────
    if (isDefect) {
      if (!form.projectId) {
        setFormError('Project is required');
        return;
      }
      if (!form.summary.trim()) return; // Summary ErrorMessage renders inline
      try {
        const descAdf = form.descriptionAdf ?? null;
        const sprintName = (form.sprintReleases ?? [])
          .map((id) => sprintOptions.find((o) => o.value === id)?.label)
          .filter(Boolean)[0] as string | undefined;
        // The dropdown holds a canonical projects.id; tm_defects.project_id FKs
        // tm_projects. Resolve (or provision) the matching tm_projects row.
        const canonicalProject = projects.find((p) => p.id === form.projectId);
        const tmProjectId = await resolveTmProjectId({
          key: (canonicalProject as any)?.key ?? null,
          name: (canonicalProject as any)?.name ?? null,
        });
        await createDefect.mutateAsync({
          project_id: tmProjectId,
          title: form.summary.trim(),
          description: descAdf ? adfToPlainText(descAdf as any) : undefined,
          description_adf: descAdf ?? undefined,
          severity: DEFECT_SEVERITY_MAP[defectSeverity] ?? 'MINOR',
          priority: (form.priority || 'Medium').toLowerCase(),
          component: defectComponent || undefined,
          environment: defectEnvironment || undefined,
          expected_result: defectExpectedAdf ? adfToPlainText(defectExpectedAdf as any) : undefined,
          expected_result_adf: defectExpectedAdf ?? undefined,
          actual_result: defectActualAdf ? adfToPlainText(defectActualAdf as any) : undefined,
          actual_result_adf: defectActualAdf ?? undefined,
          due_date: defectDueDate || undefined,
          assigned_to: form.assigneeId || undefined,
          parent_key: form.parentId || undefined,
          sprint: sprintName,
        });
        flag.success('Defect created');
        onSuccess?.('');
        if (createAnother) {
          reset(true);
          resetDefectState();
          setEditorKey((k) => k + 1);
          setSubmitAttempted(false);
        } else {
          onClose();
          reset();
          resetDefectState();
          setEditorKey((k) => k + 1);
        }
      } catch (err: any) {
        setFormError(err?.message ?? 'Failed to create defect');
      }
      return;
    }

    if (!form.projectId && workType !== 'Business Request') {
      setFormError('Project is required');
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
        // Land on the created item's detail view in its hub. Linked-create
        // (from within another item) must NOT navigate away.
        if (!isCreateLinkedMode && result.issue_key && resolvedKey) {
          navigate(`/project-hub/${resolvedKey}/backlog/${result.issue_key}`);
        }
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
    isTask,
    workstreamId,
    taskStatuses,
    createTaskMutation,
    navigate,
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

            {formError && (
              <Box xcss={errorBannerStyles}>
                {formError}
              </Box>
            )}

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
                        // Slice 9B: 'Task' is now a first-class in-modal type
                        // (workstream + tasks table). No more handoff.
                        setWorkType(selected);
                      }}
                      formatOptionLabel={formatIconOption}
                      isSearchable={false}
                    />
                  </>
                )}
              </Field>

              {/* ── Workstream (Task) — replaces Project for the task type ── */}
              {isTask ? (
                <Field name="workstream" label="Workstream" isRequired>
                  {({ fieldProps: { id, isRequired, isDisabled } }) => (
                    <>
                      <Select<IconOption>
                        id={id}
                        isRequired={isRequired}
                        isDisabled={isDisabled}
                        inputId="cs-workstream"
                        options={workstreamOptions}
                        value={
                          workstreamOptions.find((o) => o.value === workstreamId) ?? null
                        }
                        onChange={(opt) =>
                          setWorkstreamId((opt as IconOption)?.value ?? '')
                        }
                        placeholder="Select workstream"
                        formatOptionLabel={formatIconOption}
                        isSearchable
                      />
                      {submitAttempted && !workstreamId && (
                        <ErrorMessage>Workstream is required</ErrorMessage>
                      )}
                    </>
                  )}
                </Field>
              ) : workType !== 'Business Request' ? (
                /* ── Project — only shown for non-BR, non-Task types ── */
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
                        <ErrorMessage>Project is required</ErrorMessage>
                      )}
                    </>
                  )}
                </Field>
              ) : null}

              {/* ── Status — CatalystStatusPill (canonical, workflow-driven).
                   User can override the initial status before creating.
                   statusOptions=resolvedStatusOptions passes only this
                   work-type's statuses (not the 20-item global hardcoded list). */}
              <Field name="status" label="Status">
                {() => (
                  <>
                    <div style={{ display: 'block', marginTop: 4 }}>
                      {!isTask && !isDefect && statusesLoading ? (
                        <Spinner size="small" />
                      ) : (
                        <CatalystStatusPill
                          status={form.status || (isTask ? defaultTaskStatusName : isDefect ? 'open' : 'To Do')}
                          statusCategory={
                            isDefect
                              ? (DEFECT_STATUS_OPTIONS.find((s) => s.value === form.status)?.color_category ?? null)
                              : isTask
                              ? (taskStatuses.find((s) => s.name === form.status)?.slug ?? null)
                              : (workflowStatuses.find((s) => s.value === form.status)?.color_category ?? null)
                          }
                          statusOptions={isDefect ? DEFECT_STATUS_OPTIONS : isTask ? taskStatusOptions : resolvedStatusOptions}
                          onStatusChange={(newStatus) => updateField('status', newStatus)}
                          issueType={workType}
                        />
                      )}
                    </div>
                    <Box xcss={statusHelperStyles}>
                      <span style={{ fontSize: 12, color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
                        Starting status — you can change it before creating
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
                        <div data-voice-zone="true" style={{ display: 'contents' }}>
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
                        </div>
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
                      key={`parent-${isTask || isDefect ? 'anyitem' : resolvedKey || 'none'}`}
                      id={id}
                      isDisabled={isDisabled || (!isTask && !isDefect && !resolvedKey)}
                      inputId="cs-parent"
                      defaultOptions
                      loadOptions={async (input: string) => {
                        const searchTerm = input.trim();
                        const results: IconOption[] = [];

                        // Slice 9B: a Task links to ANY work item EXCEPT sub-task
                        // (not project-scoped). The link is stored in
                        // task_work_item_links on create.
                        if (isTask || isDefect) {
                          let tq = supabase
                            .from('ph_issues')
                            .select('issue_key, summary, issue_type')
                            .not('issue_type', 'ilike', 'sub-task')
                            .order('jira_updated_at', { ascending: false })
                            .limit(30);
                          if (searchTerm) {
                            tq = tq.or(`issue_key.ilike.%${searchTerm}%,summary.ilike.%${searchTerm}%`);
                          }
                          const { data: tdata } = await tq;
                          (tdata ?? []).forEach((d: any) => {
                            results.push({
                              value: d.issue_key,
                              label: d.summary,
                              sublabel: d.issue_key,
                              icon: <WorkItemTypeIcon type={d.issue_type} size={14} />,
                            });
                          });
                          return results;
                        }

                        // Bucket E (2026-05-09): parent types driven by PARENT_TYPE_RULES.
                        // All parent types — including 'Business Request' — live in ph_issues
                        // for the BAU project (source='catalyst'|'jira', issue_type='Business Request').
                        // The separate business_requests table is for the Demand Hub module and
                        // is not used here (it is empty for project-hub BAU items).
                        if (!resolvedKey) return [];
                        const eligibleTypes = PARENT_TYPE_RULES[workType] ?? [];
                        if (eligibleTypes.length === 0) return [];

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
                      placeholder={
                        isTask || isDefect
                          ? 'Link a work item (optional)'
                          : resolvedKey
                            ? 'Select parent'
                            : 'Select a project first'
                      }
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
                        ) ?? priorityOptions.find((o) => o.value === 'Medium') ?? priorityOptions[0]
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

              {/* ── Defect-only fields (QA Bug → tm_defects) ──────────── */}
              {isDefect && (
                <>
                  <Field name="severity" label="Severity">
                    {({ fieldProps }) => (
                      <Select<IconOption>
                        {...fieldProps}
                        inputId="cs-defect-severity"
                        options={DEFECT_SEVERITY_OPTIONS}
                        value={DEFECT_SEVERITY_OPTIONS.find((o) => o.value === defectSeverity) ?? null}
                        onChange={(opt) =>
                          setDefectSeverity(((opt as IconOption)?.value as any) ?? 'medium')
                        }
                        isSearchable={false}
                      />
                    )}
                  </Field>

                  <Field name="function" label="Function">
                    {({ fieldProps }) => (
                      <Textfield
                        {...(fieldProps as any)}
                        placeholder="e.g. Authentication"
                        value={defectComponent}
                        onChange={(e) => setDefectComponent((e.target as HTMLInputElement).value)}
                      />
                    )}
                  </Field>

                  <Field name="environment" label="Environment">
                    {({ fieldProps }) => (
                      <Select<IconOption>
                        {...fieldProps}
                        inputId="cs-defect-environment"
                        options={DEFECT_ENVIRONMENT_OPTIONS}
                        value={DEFECT_ENVIRONMENT_OPTIONS.find((o) => o.value === defectEnvironment) ?? null}
                        onChange={(opt) => setDefectEnvironment((opt as IconOption)?.value ?? '')}
                        placeholder="Select environment"
                        isClearable
                        isSearchable={false}
                      />
                    )}
                  </Field>

                  <Field name="dueDate" label="Due date">
                    {({ fieldProps }) => (
                      <DatePicker
                        {...(fieldProps as any)}
                        inputId="cs-defect-due"
                        value={defectDueDate}
                        onChange={(v) => setDefectDueDate(v || '')}
                        placeholder="dd/mm/yyyy"
                      />
                    )}
                  </Field>

                  <Field name="expectedResult" label="Expected result">
                    {() => (
                      <div className="cs-adf-desc-wrapper">
                        <RichTextEditor
                          key={`expected-${editorKey}`}
                          initialAdf={null}
                          hideActionButtons
                          onSave={() => {}}
                          onCancel={() => {}}
                          onChange={(tiptapJson) => {
                            try {
                              setDefectExpectedAdf(tiptapToAdf(tiptapJson));
                            } catch {
                              setDefectExpectedAdf(null);
                            }
                          }}
                        />
                      </div>
                    )}
                  </Field>

                  <Field name="actualResult" label="Actual result">
                    {() => (
                      <div className="cs-adf-desc-wrapper">
                        <RichTextEditor
                          key={`actual-${editorKey}`}
                          initialAdf={null}
                          hideActionButtons
                          onSave={() => {}}
                          onCancel={() => {}}
                          onChange={(tiptapJson) => {
                            try {
                              setDefectActualAdf(tiptapToAdf(tiptapJson));
                            } catch {
                              setDefectActualAdf(null);
                            }
                          }}
                        />
                      </div>
                    )}
                  </Field>
                </>
              )}

              {/* ── Sprint ─────────────────────────────────────────────
                  2026-06-26 (revised): always render dropdown with ALL
                  sprints (past + current + future). Searchable + multi-
                  select. No empty-state placeholder; an empty options
                  list still shows the picker so user knows the field
                  exists. */}
              {workType !== 'Business Request' && !isTask && (
                <Field name="sprints" label="Sprint">
                  {({ fieldProps }) => (
                    <Select<IconOption, true>
                      {...fieldProps}
                      inputId="cs-sprints"
                      isMulti
                      isSearchable
                      isLoading={sprintsLoading}
                      options={sprintOptions}
                      value={
                        (form.sprintReleases ?? []).map(
                          (id) =>
                            sprintOptions.find((o) => o.value === id) ??
                            null,
                        ).filter(Boolean) as IconOption[]
                      }
                      onChange={(vals) =>
                        updateField(
                          'sprintReleases',
                          (vals ?? []).map((o) => o.value),
                        )
                      }
                      placeholder="Search sprints"
                    />
                  )}
                </Field>
              )}

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
                        appearance="link"
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

              {/* Reporter + Labels are ph_issues-only; defects set reporter from
                  the auth user in useCreateDefect and omit labels here. */}
              {!isDefect && (
              <>
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
                        // Reporter defaults to current user but can be changed (Jira parity).
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
              </>
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
                isLoading={isDefect ? createDefect.isPending : isTask ? createTaskMutation.isPending : createMutation.isPending}
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
