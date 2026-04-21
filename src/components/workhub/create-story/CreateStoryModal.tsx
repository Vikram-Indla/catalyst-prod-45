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
import ModalDialog, {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Select, { AsyncSelect, CreatableSelect } from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import Button, { IconButton, LoadingButton } from '@atlaskit/button/new';
import Lozenge from '@atlaskit/lozenge';
import { Box, Stack, Inline, xcss } from '@atlaskit/primitives';
import { token } from '@atlaskit/tokens';
import Spinner from '@atlaskit/spinner';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import EditorCloseIcon from '@atlaskit/icon/glyph/editor/close';
import VidFullScreenOnIcon from '@atlaskit/icon/glyph/vid-full-screen-on';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ShortcutIcon from '@atlaskit/icon/glyph/shortcut';

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

const moreFieldsToggleStyles = xcss({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'space.100',
  paddingBlock: 'space.100',
  paddingInline: 'space.0',
  background: 'color.background.neutral.subtle',
  border: 'none',
  cursor: 'pointer',
  font: 'font.body',
  color: 'color.text',
  width: 'fit-content',
});

const moreFieldsBoxStyles = xcss({
  marginTop: 'space.200',
  padding: 'space.300',
  borderRadius: 'border.radius',
  borderWidth: 'border.width',
  borderStyle: 'solid',
  borderColor: 'color.border',
  backgroundColor: 'color.background.neutral.subtle',
});

const moreFieldsHelperStyles = xcss({
  font: 'font.body.small',
  color: 'color.text.subtlest',
  marginBottom: 'space.300',
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
function MiniAvatar({ name }: { name: string }) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() ?? '?';
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: token('color.background.neutral'),
        color: token('color.text.subtle'),
        font: token('font.body.small'),
        fontWeight: 600,
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
  const [moreFieldsOpen, setMoreFieldsOpen] = useState(false);
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
        sublabel: `(${p.key})`,
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
        icon: <MiniAvatar name={m.full_name ?? m.email ?? '?'} />,
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

  const labelOptions: IconOption[] = useMemo(
    () =>
      (form.labels ?? []).map((l) => ({
        value: l,
        label: l,
      })),
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
    setFormError(null);
    onClose();
  }, [onClose]);

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
          width="medium"
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
                <IconButton
                  appearance="subtle"
                  spacing="compact"
                  label="Minimize"
                  icon={(iconProps) => (
                    <EditorCloseIcon {...iconProps} label="" />
                  )}
                  onClick={() => undefined /* visual-only per spec */}
                  isTooltipDisabled={false}
                />
                <IconButton
                  appearance="subtle"
                  spacing="compact"
                  label="Full screen"
                  icon={(iconProps) => (
                    <VidFullScreenOnIcon {...iconProps} label="" />
                  )}
                  onClick={() => undefined /* visual-only */}
                />
                <IconButton
                  appearance="subtle"
                  spacing="compact"
                  label="More actions"
                  icon={(iconProps) => <MoreIcon {...iconProps} label="" />}
                  onClick={() => undefined /* visual-only */}
                />
                <IconButton
                  appearance="subtle"
                  spacing="compact"
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
              {/* ── Space (Project) — required ─────────────────────── */}
              <Field
                name="space"
                label="Space"
                isRequired
                defaultValue={form.projectId}
              >
                {({ fieldProps }) => (
                  <>
                    <Select<IconOption>
                      {...fieldProps}
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
                      placeholder="Select space"
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
                {({ fieldProps }) => (
                  <>
                    <Select<IconOption>
                      {...fieldProps}
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
                      target="_blank"
                      rel="noopener noreferrer"
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

              {/* ── Status (read-only Lozenge) ─────────────────────── */}
              <Field name="status" label="Status">
                {() => (
                  <>
                    <div>
                      <Lozenge appearance={statusAppearance(form.status)} isBold>
                        {form.status}
                      </Lozenge>
                    </div>
                    <HelperMessage>
                      This is the initial status upon creation
                    </HelperMessage>
                  </>
                )}
              </Field>

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
                      maxLength={200}
                    />
                    {summaryError && (
                      <ErrorMessage>{summaryError}</ErrorMessage>
                    )}
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
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Box xcss={helperLinkStyles}>
                        Learn about priority levels
                        <ShortcutIcon label="" size="small" />
                      </Box>
                    </a>
                  </>
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
                        appearance="subtle-link"
                        spacing="none"
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
                          />
                          <span>
                            {reporter.full_name ?? reporter.email ?? '—'}
                          </span>
                        </Box>
                      ) : (
                        <Select<IconOption>
                          {...fieldProps}
                          inputId="cs-reporter"
                          options={memberOptions}
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
                    options={labelOptions}
                    value={labelOptions}
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

              {/* ── More fields (4) ────────────────────────────────── */}
              <Box>
                <button
                  type="button"
                  onClick={() => setMoreFieldsOpen((v) => !v)}
                  aria-expanded={moreFieldsOpen}
                  aria-controls="cs-more-fields"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: token('space.100'),
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: token('color.text'),
                    font: token('font.body'),
                    padding: 0,
                  }}
                >
                  {moreFieldsOpen ? (
                    <ChevronDownIcon label="" size="small" />
                  ) : (
                    <ChevronRightIcon label="" size="small" />
                  )}
                  More fields (4)
                </button>

                {moreFieldsOpen && (
                  <Box xcss={moreFieldsBoxStyles} id="cs-more-fields">
                    <Box xcss={moreFieldsHelperStyles}>
                      Fields you don't use often are automatically listed here.
                    </Box>

                    <Box xcss={fieldGroupStyles}>
                      {/* Parent (lazy server-search) */}
                      <Field name="parent" label="Parent">
                        {({ fieldProps }) => (
                          <>
                            <AsyncSelect<IconOption>
                              {...fieldProps}
                              inputId="cs-parent"
                              cacheOptions
                              defaultOptions
                              loadOptions={async (input: string) => {
                                if (!resolvedKey) return [];
                                const q = supabase
                                  .from('ph_issues')
                                  .select('id, issue_key, summary, issue_type')
                                  .eq('project_key', resolvedKey)
                                  .eq('issue_type', 'Epic')
                                  .is('deleted_at', null)
                                  .neq('status_category', 'done')
                                  .order('jira_updated_at', {
                                    ascending: false,
                                  })
                                  .limit(20);
                                if (input.trim()) {
                                  q.or(
                                    `issue_key.ilike.${input}%,summary.ilike.%${input}%`,
                                  );
                                }
                                const { data, error } = await q;
                                if (error) return [];
                                return (data ?? []).map((d: any) => ({
                                  value: d.id,
                                  label: d.summary,
                                  sublabel: d.issue_key,
                                  icon: (
                                    <JiraIssueTypeIcon type="Epic" size={14} />
                                  ),
                                }));
                              }}
                              onChange={(opt) =>
                                updateField(
                                  'parentId',
                                  (opt as IconOption)?.value ?? null,
                                )
                              }
                              placeholder="Select parent"
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

                      {/* MDT Ref */}
                      <Field name="mdt_ref" label="MDT Ref">
                        {({ fieldProps }) => (
                          <Textfield
                            {...(fieldProps as any)}
                            value={(form.tags ?? []).join(',')}
                            onChange={(e: any) =>
                              updateField(
                                'tags',
                                e.target.value
                                  .split(',')
                                  .map((s: string) => s.trim())
                                  .filter(Boolean),
                              )
                            }
                            placeholder=""
                          />
                        )}
                      </Field>

                      {/* Description (Atlaskit editor — lazy) */}
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
                                workItemId="__create__"
                                initialContent={form.descriptionAdf ?? null}
                                placeholder="Type /ai to Ask Rovo or @ to mention and notify someone."
                                onSave={(adfJson: string) => {
                                  try {
                                    const parsed = JSON.parse(adfJson);
                                    updateField('descriptionAdf', parsed);
                                    updateField(
                                      'description',
                                      typeof parsed === 'object' &&
                                        parsed?.content
                                        ? JSON.stringify(parsed)
                                        : '',
                                    );
                                  } catch {
                                    /* noop */
                                  }
                                }}
                                onCancel={() => undefined}
                              />
                            </Suspense>
                          </Box>
                        )}
                      </Field>

                      {/* Fix versions (Catalyst releases) */}
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
                    </Box>
                  </Box>
                )}
              </Box>

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
              <LoadingButton
                appearance="primary"
                isLoading={createMutation.isPending}
                onClick={handleSubmit}
              >
                Create
              </LoadingButton>
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
        borderRadius: token('border.radius', '3px'),
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
