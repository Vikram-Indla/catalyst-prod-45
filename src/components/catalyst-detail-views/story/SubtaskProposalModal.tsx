/**
 * SubtaskProposalModal — review modal for AI-suggested subtask proposals.
 *
 * Shows each proposed subtask with checkbox, type badge, and title.
 * Nothing written until user clicks "Create selected".
 */
import React from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import { token } from '@atlaskit/tokens';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';
import type { SubtaskProposal } from './useSubtaskGeneration';

interface SubtaskProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: SubtaskProposal[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateSelected: () => void;
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
  if (!isOpen) return null;

  const selectedCount = selectedIndices.size;
  const allSelected = selectedCount === proposals.length;

  return (
    <ModalDialog onClose={onClose} width="large">
      <ModalHeader>
        <ModalTitle>
          Suggested subtasks for {storyKey ?? 'story'}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {/* Summary row */}
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '8px 0 16px',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E') }}>
            <strong>{proposals.length}</strong> subtasks suggested
          </div>
          <div style={{ fontSize: 12, color: token('color.text.subtle', '#42526E') }}>
            <strong>{existingCount}</strong> already exist
          </div>
        </div>

        {/* Select all / deselect all */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Button
            appearance="subtle"
            spacing="compact"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </Button>
          <span style={{
            fontSize: 12,
            color: token('color.text.subtlest', '#6B778C'),
            alignSelf: 'center',
          }}>
            {selectedCount} of {proposals.length} selected
          </span>
        </div>

        {/* Subtask list */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {proposals.map((subtask, index) => (
            <div
              key={index}
              style={{
                padding: '10px 8px',
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                background: selectedIndices.has(index)
                  ? token('color.background.selected', '#E9F2FE')
                  : 'transparent',
                borderRadius: 3,
                marginBottom: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Checkbox
                  isChecked={selectedIndices.has(index)}
                  onChange={() => onToggle(index)}
                />
                <JiraIssueTypeIcon type={subtask.type} size={16} />
                <span style={{
                  fontSize: 14,
                  fontWeight: 400,
                  color: token('color.text', '#172B4D'),
                  flex: 1,
                }}>
                  {subtask.title}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color: token('color.text.subtlest', '#6B778C'),
                  background: token('color.background.neutral', '#F1F2F4'),
                  borderRadius: 3,
                  padding: '2px 6px',
                  whiteSpace: 'nowrap',
                }}>
                  {subtask.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose} isDisabled={isCreating}>
          Cancel
        </Button>
        <Button
          appearance="primary"
          onClick={onCreateSelected}
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
