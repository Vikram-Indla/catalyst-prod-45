/**
 * CreateDefectModalG25 — Atlassian Design System "Create" dialog (Jira-parity).
 *
 * Rewrite per USER DIRECTIVE: replaces the bespoke shadcn shell
 * (@/components/ui/dialog + Input/Textarea/Select) with @atlaskit primitives
 * + design tokens, mirroring the canonical CreateStoryModal. Shares that
 * modal's PortalFix shell (the @atlaskit/portal renders empty in this Vite
 * build). Presentation + wiring layer only — useCreateDefect mutation and the
 * defectSchema/zod validation are preserved.
 *
 * Wiring fix: the legacy onSubmit silently dropped priority, component,
 * environment, affected_version, steps_to_reproduce, expected_result,
 * actual_result and due_date. All now persist to tm_defects.
 */
import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Bug } from '@/lib/atlaskit-icons';
// Shared canonical shell — @atlaskit/modal-dialog renders empty under this
// Vite build's portal layer; PortalFix is the blessed direct-render drop-in.
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
import { DatePicker } from '@atlaskit/datetime-picker';
import { Checkbox } from '@atlaskit/checkbox';
import Button, { IconButton } from '@atlaskit/button/new';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import { Box, xcss } from '@atlaskit/primitives';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import { PriorityIcon } from '@/components/icons/PriorityIcon';
import { defectSchema, DefectFormValues } from '@/schemas/defectSchema';
import { useCreateDefect } from '@/hooks/test-management/useDefects';
import { useApprovedProfiles } from '@/hooks/useApprovedProfiles';
import type { DefectSeverity } from '@/types/test-management';
import type { ComponentProps } from 'react';

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001';

interface Props {
  open: boolean;
  onClose: () => void;
  linkedTestCaseId?: string;
  linkedExecutionId?: string;
}

type LozengeAppearance = ComponentProps<typeof Lozenge>['appearance'];

interface SeverityOption {
  label: string;
  value: 'critical' | 'high' | 'medium' | 'low';
  appearance: LozengeAppearance;
}
const SEVERITY_OPTIONS: SeverityOption[] = [
  { label: 'Critical', value: 'critical', appearance: 'removed' },
  { label: 'High', value: 'high', appearance: 'moved' },
  { label: 'Medium', value: 'medium', appearance: 'inprogress' },
  { label: 'Low', value: 'low', appearance: 'success' },
];

interface PriorityOption {
  label: string;
  value: 'urgent' | 'high' | 'medium' | 'low';
}
const PRIORITY_OPTIONS: PriorityOption[] = [
  { label: 'Urgent', value: 'urgent' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

interface AssigneeOption {
  label: string;
  value: string;
  avatarUrl: string | null;
}

const severityMap: Record<string, DefectSeverity> = {
  critical: 'CRITICAL',
  high: 'MAJOR',
  medium: 'MINOR',
  low: 'TRIVIAL',
};

const headerWrapperStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  gap: 'space.200',
});
const headerTitleStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
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
const twoColStyles = xcss({
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 'space.200',
});
const optionRowStyles = xcss({
  display: 'flex',
  alignItems: 'center',
  gap: 'space.100',
});
const dangerIconStyles = xcss({ display: 'flex', color: 'color.icon.danger' });
const dangerTextStyles = xcss({ color: 'color.text.danger' });

export function CreateDefectModalG25({
  open,
  onClose,
  linkedTestCaseId,
  linkedExecutionId,
}: Props) {
  const create = useCreateDefect();
  const [createAnother, setCreateAnother] = useState(false);
  const { data: approvedProfiles = [] } = useApprovedProfiles();
  const assigneeOptions: AssigneeOption[] = approvedProfiles.map((p) => ({
    label: p.name,
    value: p.id,
    avatarUrl: p.avatarUrl,
  }));

  const form = useForm<DefectFormValues>({
    resolver: zodResolver(defectSchema),
    defaultValues: {
      title: '',
      description: '',
      severity: 'medium',
      priority: 'medium',
      assigned_to: null,
      component: '',
      environment: '',
      affected_version: '',
      due_date: null,
      folder_id: null,
      steps_to_reproduce: '',
      expected_result: '',
      actual_result: '',
    },
  });

  const onSubmit = async (values: DefectFormValues, keepOpen: boolean) => {
    await create.mutateAsync({
      project_id: DEFAULT_PROJECT_ID,
      title: values.title,
      description: values.description || undefined,
      severity: severityMap[values.severity] || 'MINOR',
      priority: values.priority || undefined,
      component: values.component || undefined,
      environment: values.environment || undefined,
      affects_version: values.affected_version || undefined,
      steps_to_reproduce: values.steps_to_reproduce || undefined,
      expected_result: values.expected_result || undefined,
      actual_result: values.actual_result || undefined,
      due_date: values.due_date || undefined,
      assigned_to: values.assigned_to || undefined,
      source_test_case_id: linkedTestCaseId || undefined,
      run_id: linkedExecutionId || undefined,
    });
    form.reset();
    if (!keepOpen) onClose();
  };

  const submit = (keepOpen: boolean) =>
    form.handleSubmit((values) => onSubmit(values, keepOpen));

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <ModalTransition>
      {open && (
        <ModalDialog onClose={handleClose} width="large" shouldScrollInViewport autoFocus>
          <ModalHeader>
            <Box xcss={headerWrapperStyles}>
              <Box xcss={headerTitleStyles}>
                <Box xcss={dangerIconStyles}>
                  <Bug size={20} />
                </Box>
                <ModalTitle>New Defect</ModalTitle>
              </Box>
              <IconButton
                appearance="subtle"
                spacing="default"
                label="Close"
                icon={(iconProps) => <CrossIcon {...iconProps} label="" />}
                onClick={handleClose}
              />
            </Box>
          </ModalHeader>

          <ModalBody>
            <Box xcss={requiredHelperStyles}>
              Required fields are marked with an asterisk{' '}
              <Box as="span" xcss={dangerTextStyles} aria-hidden="true">
                *
              </Box>
            </Box>

            <form id="defect-form" onSubmit={submit(createAnother)}>
              <Box xcss={fieldGroupStyles}>
                {/* ── Title ── */}
                <Field name="title" label="Title" isRequired>
                  {({ fieldProps: { id } }) => (
                    <Controller
                      control={form.control}
                      name="title"
                      render={({ field, fieldState }) => (
                        <>
                          <Textfield
                            id={id}
                            autoFocus
                            placeholder="Brief description of the issue"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange((e.target as HTMLInputElement).value)
                            }
                            onBlur={field.onBlur}
                          />
                          {fieldState.error && (
                            <ErrorMessage>{fieldState.error.message}</ErrorMessage>
                          )}
                        </>
                      )}
                    />
                  )}
                </Field>

                {/* ── Description ── */}
                <Field name="description" label="Description">
                  {({ fieldProps: { id } }) => (
                    <Controller
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <TextArea
                          id={id}
                          placeholder="Detailed description…"
                          minimumRows={3}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange((e.target as HTMLTextAreaElement).value)
                          }
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  )}
                </Field>

                {/* ── Severity / Priority ── */}
                <Box xcss={twoColStyles}>
                  <Field name="severity" label="Severity">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="severity"
                        render={({ field }) => (
                          <Select<SeverityOption>
                            inputId={id}
                            options={SEVERITY_OPTIONS}
                            value={
                              SEVERITY_OPTIONS.find((o) => o.value === field.value) ?? null
                            }
                            onChange={(opt) => field.onChange(opt?.value ?? 'medium')}
                            isSearchable={false}
                            formatOptionLabel={(o) => (
                              <Lozenge appearance={o.appearance}>{o.label}</Lozenge>
                            )}
                          />
                        )}
                      />
                    )}
                  </Field>

                  <Field name="priority" label="Priority">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <Select<PriorityOption>
                            inputId={id}
                            options={PRIORITY_OPTIONS}
                            value={
                              PRIORITY_OPTIONS.find((o) => o.value === field.value) ?? null
                            }
                            onChange={(opt) => field.onChange(opt?.value ?? 'medium')}
                            isSearchable={false}
                            formatOptionLabel={(o) => (
                              <Box xcss={optionRowStyles}>
                                <PriorityIcon level={o.value} size={16} />
                                {o.label}
                              </Box>
                            )}
                          />
                        )}
                      />
                    )}
                  </Field>
                </Box>

                {/* ── Assignee / Environment ── */}
                <Box xcss={twoColStyles}>
                  <Field name="assigned_to" label="Assigned To">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="assigned_to"
                        render={({ field }) => (
                          <Select<AssigneeOption>
                            inputId={id}
                            options={assigneeOptions}
                            value={
                              assigneeOptions.find((o) => o.value === field.value) ?? null
                            }
                            onChange={(opt) => field.onChange(opt?.value ?? null)}
                            placeholder="Select assignee…"
                            isClearable
                            formatOptionLabel={(o) => (
                              <Box xcss={optionRowStyles}>
                                <Avatar size="xsmall" src={o.avatarUrl ?? undefined} name={o.label} />
                                {o.label}
                              </Box>
                            )}
                          />
                        )}
                      />
                    )}
                  </Field>

                  <Field name="environment" label="Environment">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="environment"
                        render={({ field }) => (
                          <Textfield
                            id={id}
                            placeholder="e.g., Production"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange((e.target as HTMLInputElement).value)
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    )}
                  </Field>
                </Box>

                {/* ── Component / Affected Version ── */}
                <Box xcss={twoColStyles}>
                  <Field name="component" label="Component">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="component"
                        render={({ field }) => (
                          <Textfield
                            id={id}
                            placeholder="e.g., Authentication"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange((e.target as HTMLInputElement).value)
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    )}
                  </Field>

                  <Field name="affected_version" label="Affected Version">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="affected_version"
                        render={({ field }) => (
                          <Textfield
                            id={id}
                            placeholder="e.g., v2.3.1"
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange((e.target as HTMLInputElement).value)
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    )}
                  </Field>
                </Box>

                {/* ── Steps to Reproduce ── */}
                <Field name="steps_to_reproduce" label="Steps to Reproduce">
                  {({ fieldProps: { id } }) => (
                    <Controller
                      control={form.control}
                      name="steps_to_reproduce"
                      render={({ field }) => (
                        <TextArea
                          id={id}
                          placeholder={'1. Go to…\n2. Click on…\n3. Observe…'}
                          minimumRows={4}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange((e.target as HTMLTextAreaElement).value)
                          }
                          onBlur={field.onBlur}
                        />
                      )}
                    />
                  )}
                </Field>

                {/* ── Expected / Actual ── */}
                <Box xcss={twoColStyles}>
                  <Field name="expected_result" label="Expected Result">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="expected_result"
                        render={({ field }) => (
                          <TextArea
                            id={id}
                            placeholder="What should happen…"
                            minimumRows={2}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange((e.target as HTMLTextAreaElement).value)
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    )}
                  </Field>

                  <Field name="actual_result" label="Actual Result">
                    {({ fieldProps: { id } }) => (
                      <Controller
                        control={form.control}
                        name="actual_result"
                        render={({ field }) => (
                          <TextArea
                            id={id}
                            placeholder="What actually happens…"
                            minimumRows={2}
                            value={field.value ?? ''}
                            onChange={(e) =>
                              field.onChange((e.target as HTMLTextAreaElement).value)
                            }
                            onBlur={field.onBlur}
                          />
                        )}
                      />
                    )}
                  </Field>
                </Box>

                {/* ── Due Date ── */}
                <Field name="due_date" label="Due Date">
                  {({ fieldProps: { id } }) => (
                    <Controller
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <DatePicker
                          id={id}
                          value={field.value ?? ''}
                          onChange={(v) => field.onChange(v || null)}
                          placeholder="dd/mm/yyyy"
                        />
                      )}
                    />
                  )}
                </Field>
              </Box>
            </form>
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
                isLoading={create.isPending}
                onClick={() => submit(createAnother)()}
              >
                Create Defect
              </Button>
            </Box>
          </ModalFooter>
        </ModalDialog>
      )}
    </ModalTransition>
  );
}

export default CreateDefectModalG25;
