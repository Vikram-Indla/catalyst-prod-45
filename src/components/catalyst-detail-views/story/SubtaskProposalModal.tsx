/**
 * SubtaskProposalModal — review modal for AI-suggested subtask proposals.
 *
 * Uses JiraTable (ProposalTable) for selection + assignee per row.
 * Nothing written until user clicks "Create selected".
 */
import React, { useMemo, useState, useCallback } from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import { token } from '@atlaskit/tokens';
import { ProposalTable, type ProposalRow } from '../shared/ProposalTable';
import { useProposalAssignees } from '@/hooks/useProposalAssignees';
import type { SubtaskProposal } from './useSubtaskGeneration';
import type { AssigneeChoice } from '@/components/shared/JiraTable';

interface SubtaskProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: SubtaskProposal[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateSelected: (assignees?: Record<number, AssigneeChoice | null>) => void;
  isCreating: boolean;
  existingCount: number;
  storyKey: string | null;
}

export function SubtaskProposalModal({
  isOpen,
  onClose,
  proposals,
  selectedIndices,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onCreateSelected,
  isCreating,
  existingCount,
  storyKey,
}: SubtaskProposalModalProps) {
  const { data: assigneeOptions = [] } = useProposalAssignees();
  const [assignees, setAssignees] = useState<Record<number, AssigneeChoice | null>>({});

  const tableSelection = useMemo(
    () => new Set([...selectedIndices].map(String)),
    [selectedIndices],
  );

  const handleSelectionChange = useCallback((next: Set<string>) => {
    const nextIndices = new Set([...next].map(Number));
    const added = [...nextIndices].filter((i) => !selectedIndices.has(i));
    const removed = [...selectedIndices].filter((i) => !nextIndices.has(i));
    added.forEach(onToggle);
    removed.forEach(onToggle);
  }, [selectedIndices, onToggle]);

  const handleAssigneeChange = useCallback((rowId: string, assignee: AssigneeChoice | null) => {
    setAssignees((prev) => ({ ...prev, [Number(rowId)]: assignee }));
  }, []);

  const handleBulkAssign = useCallback((assignee: AssigneeChoice | null) => {
    const next: Record<number, AssigneeChoice | null> = { ...assignees };
    selectedIndices.forEach((i) => { next[i] = assignee; });
    setAssignees(next);
  }, [assignees, selectedIndices]);

  const rows = useMemo<ProposalRow[]>(() =>
    proposals.map((subtask, i) => ({
      id: String(i),
      title: subtask.title,
      issueType: subtask.type,
      assignee: assignees[i] ?? null,
    })),
    [proposals, assignees],
  );

  if (!isOpen) return null;

  const selectedCount = selectedIndices.size;

  return (
    <ModalDialog onClose={onClose} width="x-large">
      <ModalHeader>
        <ModalTitle>
          Suggested subtasks for {storyKey ?? 'story'}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          padding: '8px 0 16px',
          borderBottom: `1px solid ${token('color.border', 'var(--ds-border, #DFE1E6)')}`,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>
            <strong>{proposals.length}</strong> subtasks suggested
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>
            <strong>{existingCount}</strong> already exist
          </div>
          <span style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtlest', 'var(--ds-text-subtlest, #6B778C)') }}>
            {selectedCount} of {proposals.length} selected
          </span>
          <Button appearance="subtle" spacing="compact" onClick={selectedCount === proposals.length ? onDeselectAll : onSelectAll}>
            {selectedCount === proposals.length ? 'Deselect all' : 'Select all'}
          </Button>
        </div>

        <ProposalTable
          rows={rows}
          selection={tableSelection}
          onSelectionChange={handleSelectionChange}
          onAssigneeChange={handleAssigneeChange}
          onBulkAssign={handleBulkAssign}
          assigneeOptions={assigneeOptions}
        />
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={isCreating}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={() => onCreateSelected(assignees)}
          isDisabled={selectedCount === 0 || isCreating}
          isLoading={isCreating}
        >
          {isCreating
            ? 'Creating…'
            : `Create ${selectedCount} subtask${selectedCount === 1 ? '' : 's'}`}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
