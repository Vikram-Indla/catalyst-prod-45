/**
 * MoveIssueDialog — moves an issue to a different project.
 *
 * Uses @atlaskit/modal-dialog + @atlaskit/select.
 * Queries ph_jira_projects for the list of available projects.
 * On confirm calls moveIssue() from workItemRepo then closes both
 * the dialog and the parent detail panel.
 *
 * 2026-05-10 — Row 9 (preflight plan: Clone / Archive / Move)
 */

import React, { useState } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Select from '@atlaskit/select';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { moveIssue } from '@/modules/project-work-hub/lib/workItemRepo';

interface ProjectOption {
  label: string;
  value: string;      // project_key
  projectId: string;  // ph_jira_projects.id (UUID)
}

interface MoveIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  issueKey: string;
  issueSummary?: string | null;
  currentProjectKey?: string | null;
  /** Called after a successful move so the parent can close the detail panel. */
  onMoved?: () => void;
}

export function MoveIssueDialog({
  isOpen,
  onClose,
  issueKey,
  issueSummary,
  currentProjectKey,
  onMoved,
}: MoveIssueDialogProps) {
  const [selected, setSelected] = useState<ProjectOption | null>(null);
  const [moving, setMoving] = useState(false);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['move-issue-projects'],
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
      })) as ProjectOption[];
    },
    enabled: isOpen,
  });

  const handleMove = async () => {
    if (!selected) return;
    setMoving(true);
    try {
      await moveIssue(issueKey, selected.value, selected.projectId);
      toast.success(`Moved to ${selected.label}`);
      onClose();
      onMoved?.();
    } catch (e) {
      toast.error('Move failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally {
      setMoving(false);
    }
  };

  if (!isOpen) return null;

  // Filter out the current project so user can only move to a different one
  const options = projects.filter((p) => p.value !== currentProjectKey);

  return (
    <ModalDialog onClose={onClose} width="small">
      <ModalHeader>
        <ModalTitle>Move issue</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ds-text-subtle, #44546F)' }}>
          Moving <strong>{issueKey}</strong>
          {issueSummary ? ` — ${issueSummary.slice(0, 60)}${issueSummary.length > 60 ? '…' : ''}` : ''}
        </p>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtle, #44546F)', marginBottom: 4 }}>
          Destination project
        </label>
        <Select<ProjectOption>
          inputId="move-issue-project"
          options={options}
          value={selected}
          onChange={(opt) => setSelected(opt as ProjectOption)}
          placeholder={isLoading ? 'Loading projects…' : 'Select a project'}
          isLoading={isLoading}
          menuPosition="fixed"
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={moving}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={handleMove}
          isLoading={moving}
          isDisabled={!selected || moving}
        >
          Move
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
