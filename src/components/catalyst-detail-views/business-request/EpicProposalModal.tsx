/**
 * EpicProposalModal — review modal for AI-generated epic proposals.
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
import type { EpicProposal } from './useEpicGeneration';
import type { AssigneeChoice } from '@/components/shared/JiraTable';

interface EpicProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: EpicProposal[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateSelected: (assignees?: Record<number, AssigneeChoice | null>) => void;
  isCreating: boolean;
  coveragePercent: number;
  existingCount: number;
  projectName: string | null;
}

export function EpicProposalModal({
  isOpen,
  onClose,
  proposals,
  selectedIndices,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onCreateSelected,
  isCreating,
  coveragePercent,
  existingCount,
  projectName,
}: EpicProposalModalProps) {
  const { data: assigneeOptions = [] } = useProposalAssignees();
  const [assignees, setAssignees] = useState<Record<number, AssigneeChoice | null>>({});

  // Convert Set<number> ↔ Set<string> for JiraTable
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
    proposals.map((epic, i) => ({
      id: String(i),
      title: epic.title,
      issueType: 'Epic',
      meta: [
        epic.acceptanceCriteria.length > 0 ? `${epic.acceptanceCriteria.length} AC` : null,
        epic.brdRef ? `Ref: ${epic.brdRef}` : null,
        epic.covers.length > 0 ? `Covers: ${epic.covers.join(', ')}` : null,
      ].filter(Boolean).join(' · '),
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
          Generated epics{projectName ? ` for ${projectName}` : ''}
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
            <strong>{proposals.length}</strong> epics proposed
          </div>
          <div style={{ fontSize: 'var(--ds-font-size-200)', color: token('color.text.subtle', 'var(--ds-text-subtle, #42526E)') }}>
            <strong>{existingCount}</strong> existing
          </div>
          <div style={{
            fontSize: 'var(--ds-font-size-200)',
            color: coveragePercent >= 80
              ? token('color.text.success', 'var(--ds-text-success, #006644)')
              : token('color.text.warning', 'var(--ds-background-warning-bold, #E2B203)'),
          }}>
            <strong>{coveragePercent}%</strong> coverage
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
            : `Create ${selectedCount} epic${selectedCount === 1 ? '' : 's'}`}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
