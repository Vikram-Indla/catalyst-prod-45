/**
 * MoveIssueDialog — Atlaskit modal for moving a ph_issues row to another project.
 *
 * Per BATCH-B Feature 2 spec:
 *   - Atlaskit-only UI.
 *   - Destination = projects the current user belongs to (ph_project_members),
 *     excluding the source project.
 *   - Submits to edge function `issue-move`, which generates the new issue_key
 *     via next_issue_key(p_project_id) and updates issue_key + project_key, plus
 *     sweeps parent_key references in ph_issues for child issues.
 */
import React, { useState } from 'react';
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
import Form, { Field, ErrorMessage } from '@atlaskit/form';
import Select from '@atlaskit/select';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface MoveSourceIssue {
  id: string;
  issue_key: string;
  project_key: string;
}

export interface MoveIssueDialogProps {
  open: boolean;
  onClose: () => void;
  source: MoveSourceIssue;
}

interface ProjectOption {
  label: string;
  value: string; // project key
}

interface MoveFormValues {
  destination: ProjectOption | null;
}

function useDestinationProjects(currentKey: string): ProjectOption[] {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['move-destination-projects', user?.id, currentKey],
    enabled: !!user?.id && !!currentKey,
    queryFn: async () => {
      const { data: rows } = await (supabase as any)
        .from('ph_project_members')
        .select('ph_projects:project_id ( id, key, name )')
        .eq('user_id', user!.id);

      const opts: ProjectOption[] = [];
      for (const r of (rows ?? []) as any[]) {
        const p = Array.isArray(r.ph_projects) ? r.ph_projects[0] : r.ph_projects;
        if (!p?.key || p.key === currentKey) continue;
        opts.push({ value: p.key, label: `${p.name ?? p.key} (${p.key})` });
      }
      return opts.sort((a, b) => a.label.localeCompare(b.label));
    },
  });
  return data ?? [];
}

export function MoveIssueDialog({ open, onClose, source }: MoveIssueDialogProps) {
  const navigate = useNavigate();
  const options = useDestinationProjects(source.project_key);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const onSubmit = async (values: MoveFormValues) => {
    if (!values.destination?.value) {
      toast.error('Select a destination project');
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('issue-move', {
        body: {
          issue_id: source.id,
          destination_project_key: values.destination.value,
        },
      });
      if (error || (data as any)?.error) {
        const msg = (data as any)?.error ?? error?.message ?? 'Move failed';
        toast.error(msg);
        return;
      }
      const newKey = (data as any)?.new_issue_key as string;
      toast.success(`Moved to ${newKey}`);
      onClose();
      if (newKey) navigate(`/project-hub/${values.destination.value}/issue/${newKey}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalTransition>
      <Modal onClose={onClose} width="medium">
        <ModalHeader>
          <ModalTitle>Move {source.issue_key}</ModalTitle>
        </ModalHeader>
        <Form<MoveFormValues> onSubmit={onSubmit}>
          {({ formProps, getValues }) => {
            const dest = (getValues() as MoveFormValues).destination?.value;
            return (
              <form {...formProps}>
                <ModalBody>
                  <Field<ProjectOption | null>
                    name="destination"
                    label="Destination project *"
                    isRequired
                    validate={(v) => (!v ? 'Destination is required' : undefined)}
                  >
                    {({ fieldProps, error }) => (
                      <>
                        <Select<ProjectOption>
                          {...fieldProps}
                          options={options}
                          placeholder="Select project…"
                          isSearchable
                        />
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                      </>
                    )}
                  </Field>
                  <p style={{ fontSize: 12, color: '#6B778C', marginTop: 12, lineHeight: 1.5 }}>
                    Moving will change the issue key from <strong>{source.issue_key}</strong> to{' '}
                    <strong>{dest ? `${dest}-N` : '{destination}-N'}</strong>. Links, comments,
                    attachments, and children are preserved.
                  </p>
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
                    Move
                  </Button>
                </ModalFooter>
              </form>
            );
          }}
        </Form>
      </Modal>
    </ModalTransition>
  );
}

export default MoveIssueDialog;
