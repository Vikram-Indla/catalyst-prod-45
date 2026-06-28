/**
 * ProjectPickerModal — selects target Jira project for epic generation from a BR.
 *
 * Mirrors MoveIssueDialog pattern: @atlaskit/modal-dialog + @atlaskit/select
 * over ph_jira_projects. Created epics inherit the picked project's epic
 * numbering via the project's native sequence.
 */
import React, { useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PickedProject } from './useEpicGeneration';

interface ProjectOption {
  label: string;
  value: string;
  projectId: string;
  projectName: string;
}

interface ProjectPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  brTitle?: string | null;
  onConfirm: (project: PickedProject) => void;
}

export function ProjectPickerModal({ isOpen, onClose, brTitle, onConfirm }: ProjectPickerModalProps) {
  const [selected, setSelected] = useState<ProjectOption | null>(null);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['epic-gen-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ph_jira_projects')
        .select('id, project_key, name')
        .order('name');
      if (error) throw error;
      return (data ?? []).map((p) => ({
        label: `${p.name} (${p.project_key})`,
        value: p.project_key,
        projectId: p.id,
        projectName: p.name,
      })) as ProjectOption[];
    },
    enabled: isOpen,
  });

  const handleConfirm = () => {
    if (!selected) return;
    onConfirm({
      projectKey: selected.value,
      projectId: selected.projectId,
      projectName: selected.projectName,
    });
  };

  if (!isOpen) return null;

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Select project for epic generation</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: 'var(--ds-font-size-400)', color: 'var(--ds-text-subtle, #44546F)' }}>
          Generating epics for{brTitle ? <> <strong>{brTitle.slice(0, 80)}{brTitle.length > 80 ? '…' : ''}</strong></> : ' this business request'}.
          Epics will be created in the selected project and follow its epic numbering.
        </p>
        <label
          htmlFor="epic-gen-project"
          style={{
            display: 'block',
            fontSize: 'var(--ds-font-size-200)',
            fontWeight: 600,
            color: 'var(--ds-text-subtle, #44546F)',
            marginBottom: 4,
          }}
        >
          Destination project
        </label>
        <Select<ProjectOption>
          inputId="epic-gen-project"
          options={projects}
          value={selected}
          onChange={(opt) => setSelected(opt as ProjectOption)}
          placeholder={isLoading ? 'Loading projects…' : 'Select a project'}
          isLoading={isLoading}
          menuPosition="fixed"
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={handleConfirm} isDisabled={!selected}>
          Continue
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
