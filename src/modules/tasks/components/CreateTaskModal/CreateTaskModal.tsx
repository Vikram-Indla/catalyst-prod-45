/**
 * Create Task Modal — Slice 1 (CAT-TASKS-20260627-001)
 *
 * Refactored to exact Atlassian / Create-Story parity. Built only from
 * canonical Catalyst + @atlaskit primitives — no hand-rolled modal shell,
 * dropdowns, calendar, inputs, buttons, avatars or toast:
 *
 *   - PortalFix modal shell  (same as CreateStoryModal / CreateBusinessRequestModal;
 *     @atlaskit/modal-dialog renders empty in this Vite build — see PortalFix)
 *   - @atlaskit/form Field    (labels + required asterisk + ErrorMessage)
 *   - @atlaskit/select        (workstream, priority, assignee)
 *   - @atlaskit/textfield     (title)
 *   - @atlaskit/textarea      (description — plain text, matches the data contract)
 *   - @atlaskit/button/new    (footer Cancel / Add task, loading + disabled states)
 *   - CatalystDatePicker      (canonical @atlaskit/datetime-picker wrapper — start/due)
 *   - @atlaskit/avatar        (assignee faces — identical pattern to CreateStoryModal)
 *
 * CALLER CONTRACT — DO NOT CHANGE. Props {open,onOpenChange,defaultWorkstream,
 * onSuccess} and the useCreateTaskMutation submit path are preserved so every
 * existing call site keeps working untouched.
 *
 * Success/error feedback: owned by useCreateTaskMutation (catalystToast →
 * canonical ADS flag host). Success badges are suppressed platform-wide, so on
 * success we simply close; errors surface as an ADS error flag from the hook.
 *
 * TEMP TECH DEBT (Slice 1, amendment A4): MiniAvatar / IconOption /
 * formatIconOption are replicated from CreateStoryModal rather than shared, to
 * avoid refactoring Story and risking a Story regression. Extract to a shared
 * module in a later slice.
 */

import { useState, useEffect, useMemo, useCallback, type ReactNode, type ChangeEvent } from 'react';
import { format } from 'date-fns';
import {
  ModalDialog,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@/components/workhub/create-story/PortalFix';
import { Field, ErrorMessage } from '@atlaskit/form';
import Select from '@atlaskit/select';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Button, { IconButton } from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import { token } from '@atlaskit/tokens';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { CatalystDatePicker } from '@/components/ui/catalyst-date-picker';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { resolveAvatarUrl } from '@/lib/avatars';
import { useCreateTaskMutation, type CreateTaskInput } from './hooks/useCreateTaskMutation';
import { useTaskWorkstreams } from '../../hooks/useTaskWorkstreams';
import { useTaskUsers } from '../../hooks/useTaskUsers';
import type { TaskPriority } from '../../types';

// ============================================================================
// Public API (callers' contract — DO NOT CHANGE)
// ============================================================================

export interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultWorkstream?: string;
  onSuccess?: (taskKey: string) => void;
}

// ============================================================================
// Shared option rendering (replicated from CreateStoryModal — see header note)
// ============================================================================

interface IconOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

const formatIconOption = (option: IconOption) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: token('space.100') }}>
    {option.icon}
    <span>{option.label}</span>
  </span>
);

// Canonical @atlaskit/avatar (small, 24px) — identical to CreateStoryModal so
// assignee faces are consistent across the create surfaces.
function MiniAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  return <Avatar size="small" name={name} src={avatarUrl ?? resolveAvatarUrl(name) ?? undefined} />;
}

// Workstream colour dot — colour is workstream-owned data (DB value), not a
// hardcoded design colour. Falls back to a subtle token when absent.
function ColorDot({ color }: { color?: string | null }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: color || token('color.text.subtlest'),
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}

// Task priorities are 4-level (critical|high|medium|low); PriorityIcon's
// normalizePriority maps 'critical' → 'highest' glyph.
const PRIORITY_OPTIONS: IconOption[] = [
  { value: 'critical', label: 'Critical', icon: <PriorityIcon level="critical" size={14} /> },
  { value: 'high', label: 'High', icon: <PriorityIcon level="high" size={14} /> },
  { value: 'medium', label: 'Medium', icon: <PriorityIcon level="medium" size={14} /> },
  { value: 'low', label: 'Low', icon: <PriorityIcon level="low" size={14} /> },
];

// ============================================================================
// CreateTaskModal
// ============================================================================

export function CreateTaskModal({
  open,
  onOpenChange,
  defaultWorkstream,
  onSuccess,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [workstreamId, setWorkstreamId] = useState(defaultWorkstream || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [startDate, setStartDate] = useState<Date | null>(() => new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { mutate: createTask, isPending } = useCreateTaskMutation();
  const { data: workstreams = [] } = useTaskWorkstreams();
  const { data: users = [] } = useTaskUsers();

  // Reset form each time the modal opens.
  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setWorkstreamId(defaultWorkstream || '');
      setAssigneeId('');
      setPriority('medium');
      setStartDate(new Date());
      setDueDate(null);
      setErrors({});
    }
  }, [open, defaultWorkstream]);

  const workstreamOptions = useMemo<IconOption[]>(
    () =>
      workstreams.map((w: { id: string; name: string; color?: string | null }) => ({
        value: w.id,
        label: w.name,
        icon: <ColorDot color={w.color ?? null} />,
      })),
    [workstreams],
  );

  const assigneeOptions = useMemo<IconOption[]>(
    () =>
      users.map((u: { id: string; name: string; avatarUrl?: string | null }) => ({
        value: u.id,
        label: u.name,
        icon: <MiniAvatar name={u.name} avatarUrl={u.avatarUrl ?? null} />,
      })),
    [users],
  );

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Title is required';
    if (!workstreamId) next.workstream = 'Workstream is required';
    if (!startDate) next.startDate = 'Start date is required';
    if (!dueDate) next.dueDate = 'Due date is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [title, workstreamId, startDate, dueDate]);

  const handleClose = useCallback(() => {
    if (!isPending) onOpenChange(false);
  }, [isPending, onOpenChange]);

  const handleSubmit = useCallback(() => {
    if (!validate()) return;

    // status is resolved to the 'backlog' status_id inside the mutation hook.
    const input: CreateTaskInput = {
      title: title.trim(),
      description: description.trim() || undefined,
      workstream_id: workstreamId,
      assignee_id: assigneeId || undefined,
      priority,
      start_date: startDate ? format(startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      due_date: dueDate ? format(dueDate, 'yyyy-MM-dd') : undefined,
    };

    createTask(input, {
      onSuccess: (result) => {
        onSuccess?.(result.key);
        onOpenChange(false);
      },
    });
  }, [
    validate,
    title,
    description,
    workstreamId,
    assigneeId,
    priority,
    startDate,
    dueDate,
    createTask,
    onSuccess,
    onOpenChange,
  ]);

  return (
    <ModalTransition>
      {open && (
        <ModalDialog width="medium" onClose={handleClose} modalTitle="Create task">
          <ModalHeader>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <ModalTitle>Create task</ModalTitle>
              <IconButton
                appearance="subtle"
                spacing="default"
                label="Close"
                icon={(iconProps) => <CrossIcon {...iconProps} label="" />}
                onClick={handleClose}
                isDisabled={isPending}
              />
            </div>
          </ModalHeader>

          <ModalBody>
            <div
              style={{
                font: token('font.body.small'),
                color: token('color.text.subtlest'),
                marginBottom: token('space.150'),
              }}
            >
              Required fields are marked with an asterisk{' '}
              <span aria-hidden="true" style={{ color: token('color.text.danger') }}>
                *
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200') }}>
              {/* Title */}
              <Field name="title" label="Title" isRequired>
                {({ fieldProps: { id } }) => (
                  <>
                    <Textfield
                      id={id}
                      autoFocus
                      placeholder="Enter task title…"
                      value={title}
                      isInvalid={!!errors.title}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                    />
                    {errors.title && <ErrorMessage>{errors.title}</ErrorMessage>}
                  </>
                )}
              </Field>

              {/* Description */}
              <Field name="description" label="Description">
                {({ fieldProps: { id } }) => (
                  <TextArea
                    id={id}
                    placeholder="Add details, context, or requirements…"
                    value={description}
                    minimumRows={3}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                  />
                )}
              </Field>

              {/* Workstream + Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token('space.200') }}>
                <Field name="workstream" label="Workstream" isRequired>
                  {({ fieldProps: { id } }) => (
                    <>
                      <Select<IconOption>
                        id={id}
                        inputId={`${id}-input`}
                        options={workstreamOptions}
                        value={workstreamOptions.find((o) => o.value === workstreamId) ?? null}
                        onChange={(opt) => setWorkstreamId((opt as IconOption)?.value ?? '')}
                        formatOptionLabel={formatIconOption}
                        placeholder="Select workstream…"
                        isInvalid={!!errors.workstream}
                        noOptionsMessage={() => 'No workstreams yet'}
                      />
                      {errors.workstream && <ErrorMessage>{errors.workstream}</ErrorMessage>}
                    </>
                  )}
                </Field>

                <Field name="priority" label="Priority">
                  {({ fieldProps: { id } }) => (
                    <Select<IconOption>
                      id={id}
                      inputId={`${id}-input`}
                      options={PRIORITY_OPTIONS}
                      value={PRIORITY_OPTIONS.find((o) => o.value === priority) ?? PRIORITY_OPTIONS[2]}
                      onChange={(opt) =>
                        setPriority(((opt as IconOption)?.value as TaskPriority) ?? 'medium')
                      }
                      formatOptionLabel={formatIconOption}
                      isSearchable={false}
                    />
                  )}
                </Field>
              </div>

              {/* Assignee + Start date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token('space.200') }}>
                <Field name="assignee" label="Assignee">
                  {({ fieldProps: { id } }) => (
                    <Select<IconOption>
                      id={id}
                      inputId={`${id}-input`}
                      options={assigneeOptions}
                      value={assigneeOptions.find((o) => o.value === assigneeId) ?? null}
                      onChange={(opt) => setAssigneeId((opt as IconOption)?.value ?? '')}
                      formatOptionLabel={formatIconOption}
                      placeholder="Select assignee…"
                      isClearable
                      noOptionsMessage={() => 'No users found'}
                    />
                  )}
                </Field>

                <Field name="startDate" label="Start date" isRequired>
                  {() => (
                    <>
                      <CatalystDatePicker
                        value={startDate}
                        onChange={setStartDate}
                        placeholder="Select date…"
                      />
                      {errors.startDate && <ErrorMessage>{errors.startDate}</ErrorMessage>}
                    </>
                  )}
                </Field>
              </div>

              {/* Due date */}
              <Field name="dueDate" label="Due date" isRequired>
                {() => (
                  <>
                    <CatalystDatePicker
                      value={dueDate}
                      onChange={setDueDate}
                      placeholder="Select date…"
                      minDate={startDate ?? undefined}
                    />
                    {errors.dueDate && <ErrorMessage>{errors.dueDate}</ErrorMessage>}
                  </>
                )}
              </Field>
            </div>
          </ModalBody>

          <ModalFooter>
            <div style={{ flex: 1 }} />
            <Button appearance="subtle" onClick={handleClose} isDisabled={isPending}>
              Cancel
            </Button>
            <Button
              appearance="primary"
              onClick={handleSubmit}
              isLoading={isPending}
              isDisabled={isPending || !title.trim()}
            >
              Add task
            </Button>
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}

export default CreateTaskModal;
