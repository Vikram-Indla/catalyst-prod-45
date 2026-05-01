/**
 * CloneIssueDialog — Atlaskit modal for cloning a ph_issues row.
 *
 * Per BATCH-B Feature 1 spec:
 *   - Atlaskit-only UI (Modal, Form, Field, Textfield, UserPicker, Checkbox, Button).
 *   - UI state holds Atlaskit user-picker shape ({ id, name, avatarUrl, data: { jiraAccountId } }).
 *   - At submit, we send { assignee_account_id, reporter_account_id } to the
 *     edge function, which resolves accountId → catalyst user_id via jira_identity_map.
 *   - Picker options come from ph_project_members JOIN profiles INNER JOIN
 *     jira_identity_map (so every option has a jira_account_id and is submittable).
 *   - Defaults: summary = source.summary, reporter = currentUser, assignee = source.assignee
 *     (resolved via jira_identity_map). Include flags default OFF.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Form, { Field, CheckboxField, FormFooter, ErrorMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import UserPicker, { type OptionData } from '@atlaskit/user-picker';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// ─── Types ────────────────────────────────────────────────────────
interface CloneSourceIssue {
  id: string;
  issue_key: string;
  summary: string;
  project_key: string;
  assignee_account_id: string | null;
  assignee_display_name: string | null;
}

export interface CloneIssueDialogProps {
  open: boolean;
  onClose: () => void;
  source: CloneSourceIssue;
}

interface PickerOption extends OptionData {
  id: string; // catalyst user_id (uuid)
  name: string;
  avatarUrl?: string;
  data?: { jiraAccountId: string };
}

interface CloneFormValues {
  summary: string;
  assignee: PickerOption | null;
  reporter: PickerOption | null;
  includeAttachments: boolean;
  includeSubtasks: boolean;
  includeLinks: boolean;
}

// ─── Picker query ─────────────────────────────────────────────────
function useProjectMemberPickerOptions(projectKey: string): PickerOption[] {
  const { data } = useQuery({
    queryKey: ['clone-picker-options', projectKey],
    enabled: !!projectKey,
    queryFn: async () => {
      // Resolve project_id from key
      const { data: proj } = await supabase
        .from('ph_projects')
        .select('id')
        .eq('key', projectKey)
        .maybeSingle();
      if (!proj?.id) return [];

      // Members → profiles → jira_identity_map (INNER, only mapped users)
      const { data: rows } = await (supabase as any)
        .from('ph_project_members')
        .select(`
          user_id,
          profiles:user_id ( id, full_name, avatar_url ),
          jira_identity_map!inner ( jira_account_id )
        `)
        .eq('project_id', proj.id);

      const opts: PickerOption[] = [];
      for (const r of (rows ?? []) as any[]) {
        const jim = Array.isArray(r.jira_identity_map) ? r.jira_identity_map[0] : r.jira_identity_map;
        const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        if (!jim?.jira_account_id || !prof?.id) continue;
        opts.push({
          id: prof.id,
          name: prof.full_name ?? 'Unknown',
          avatarUrl: prof.avatar_url ?? undefined,
          data: { jiraAccountId: jim.jira_account_id },
        });
      }
      return opts;
    },
  });

  return data ?? [];
}

// Resolve a single accountId → PickerOption (used for source.assignee + currentUser defaults)
function useUserOptionByAccountId(
  accountId: string | null,
  fallbackName: string | null,
): PickerOption | null {
  const { data } = useQuery({
    queryKey: ['picker-option-by-account-id', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const { data: jim } = await (supabase as any)
        .from('jira_identity_map')
        .select('catalyst_user_id, jira_account_id, display_name, avatar_url')
        .eq('jira_account_id', accountId)
        .maybeSingle();
      if (!jim?.catalyst_user_id) return null;
      return {
        id: jim.catalyst_user_id,
        name: jim.display_name ?? fallbackName ?? 'Unknown',
        avatarUrl: jim.avatar_url ?? undefined,
        data: { jiraAccountId: jim.jira_account_id },
      } as PickerOption;
    },
  });
  return data ?? null;
}

function useCurrentUserPickerOption(): PickerOption | null {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['picker-option-by-catalyst-user', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: jim } = await (supabase as any)
        .from('jira_identity_map')
        .select('catalyst_user_id, jira_account_id, display_name, avatar_url')
        .eq('catalyst_user_id', user!.id)
        .maybeSingle();
      if (!jim?.jira_account_id) return null;
      return {
        id: jim.catalyst_user_id,
        name: jim.display_name ?? user?.email ?? 'Me',
        avatarUrl: jim.avatar_url ?? undefined,
        data: { jiraAccountId: jim.jira_account_id },
      } as PickerOption;
    },
  });
  return data ?? null;
}

// ─── Component ────────────────────────────────────────────────────
export function CloneIssueDialog({ open, onClose, source }: CloneIssueDialogProps) {
  const navigate = useNavigate();
  const options = useProjectMemberPickerOptions(source.project_key);
  const sourceAssigneeOpt = useUserOptionByAccountId(
    source.assignee_account_id,
    source.assignee_display_name,
  );
  const currentUserOpt = useCurrentUserPickerOption();

  const [submitting, setSubmitting] = useState(false);

  const initialValues = useMemo<CloneFormValues>(
    () => ({
      summary: source.summary ?? '',
      assignee: sourceAssigneeOpt,
      reporter: currentUserOpt,
      includeAttachments: false,
      includeSubtasks: false,
      includeLinks: false,
    }),
    [source.summary, sourceAssigneeOpt, currentUserOpt],
  );

  // autoFocus + selectAll on summary handled by Atlaskit Textfield + key remount
  const [formKey, setFormKey] = useState(0);
  useEffect(() => {
    if (open) setFormKey((k) => k + 1);
  }, [open]);

  if (!open) return null;

  const onSubmit = async (values: CloneFormValues) => {
    const summary = (values.summary ?? '').trim();
    if (summary.length < 3 || summary.length > 255) {
      toast.error('Summary must be 3–255 characters');
      return;
    }
    if (!values.reporter?.data?.jiraAccountId) {
      toast.error('Reporter is required');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('issue-clone', {
        body: {
          source_issue_id: source.id,
          summary,
          assignee_account_id: values.assignee?.data?.jiraAccountId ?? null,
          reporter_account_id: values.reporter.data.jiraAccountId,
          include_attachments: values.includeAttachments,
          include_subtasks: values.includeSubtasks,
          include_links: values.includeLinks,
        },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error ?? error?.message ?? 'Clone failed';
        toast.error(msg);
        return;
      }
      const newKey = (data as any)?.new_issue_key as string;
      toast.success(`Cloned to ${newKey}`);
      onClose();
      if (newKey) navigate(`/project-hub/${source.project_key}/issue/${newKey}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium">
        <ModalHeader>
          <ModalTitle>Clone {source.issue_key}</ModalTitle>
        </ModalHeader>
        <Form<CloneFormValues> key={formKey} onSubmit={onSubmit}>
          {({ formProps, getValues, setFieldValue }) => (
            <form {...formProps}>
              <ModalBody>
                <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginBottom: 16 }}>
                  Required fields are marked with an asterisk *
                </p>

                <Field<string>
                  name="summary"
                  label="Summary *"
                  isRequired
                  defaultValue={initialValues.summary}
                  validate={(v) => {
                    const t = (v ?? '').trim();
                    if (t.length < 3) return 'Summary must be at least 3 characters';
                    if (t.length > 255) return 'Summary must be at most 255 characters';
                    return undefined;
                  }}
                >
                  {({ fieldProps, error }) => (
                    <>
                      <Textfield {...fieldProps} autoFocus onFocus={(e) => e.currentTarget.select()} />
                      {error && <ErrorMessage>{error}</ErrorMessage>}
                    </>
                  )}
                </Field>

                <Field<PickerOption | null>
                  name="assignee"
                  label="Assignee"
                  defaultValue={initialValues.assignee}
                >
                  {({ fieldProps }) => (
                    <div>
                      <UserPicker
                        fieldId="clone-assignee"
                        options={options}
                        value={fieldProps.value as any}
                        onChange={(v) => fieldProps.onChange(v as PickerOption | null)}
                        isClearable
                      />
                      <Button
                        appearance="subtle"
                        spacing="compact"
                        onClick={() => setFieldValue('assignee', currentUserOpt as any)}
                      >
                        Assign to me
                      </Button>
                    </div>
                  )}
                </Field>

                <Field<PickerOption | null>
                  name="reporter"
                  label="Reporter *"
                  isRequired
                  defaultValue={initialValues.reporter}
                  validate={(v) => (!v ? 'Reporter is required' : undefined)}
                >
                  {({ fieldProps, error }) => (
                    <>
                      <UserPicker
                        fieldId="clone-reporter"
                        options={options}
                        value={fieldProps.value as any}
                        onChange={(v) => fieldProps.onChange(v as PickerOption | null)}
                        isClearable={false}
                      />
                      {error && <ErrorMessage>{error}</ErrorMessage>}
                    </>
                  )}
                </Field>

                <fieldset style={{ border: 'none', padding: 0, marginTop: 12 }}>
                  <legend style={{ fontSize: 12, fontWeight: 600, color: '#42526E', marginBottom: 6 }}>
                    Include
                  </legend>
                  <CheckboxField name="includeAttachments" defaultIsChecked={false}>
                    {({ fieldProps }) => <Checkbox {...fieldProps} label="Attachments" />}
                  </CheckboxField>
                  <CheckboxField name="includeSubtasks" defaultIsChecked={false}>
                    {({ fieldProps }) => <Checkbox {...fieldProps} label="Subtasks" />}
                  </CheckboxField>
                  <CheckboxField name="includeLinks" defaultIsChecked={false}>
                    {({ fieldProps }) => <Checkbox {...fieldProps} label="Links" />}
                  </CheckboxField>
                </fieldset>
              </ModalBody>
              <ModalFooter>
                <Button appearance="subtle" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  type="submit"
                  isLoading={submitting}
                  isDisabled={submitting}
                >
                  Clone
                </Button>
              </ModalFooter>
            </form>
          )}
        </Form>
      </Modal>
    </ModalTransition>
  );
}

export default CloneIssueDialog;
