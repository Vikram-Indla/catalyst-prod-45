/**
 * StoryProposalModal — review modal for AI-generated story proposals.
 *
 * Shows each proposed story with checkbox, title, user story preview,
 * AC count, and coverage projection. User selects which to create.
 * Nothing written until user clicks "Create selected".
 */
import React from 'react';
import ModalDialog, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import Checkbox from '@atlaskit/checkbox';
import Spinner from '@atlaskit/spinner';
import { token } from '@atlaskit/tokens';
import type { StoryProposal } from './useStoryGeneration';

interface StoryProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposals: StoryProposal[];
  selectedIndices: Set<number>;
  onToggle: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCreateSelected: () => void;
  isCreating: boolean;
  coveragePercent: number;
  existingCount: number;
  epicKey: string | null;
}

export function StoryProposalModal({
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
  epicKey,
}: StoryProposalModalProps) {
  if (!isOpen) return null;

  const selectedCount = selectedIndices.size;
  const allSelected = selectedCount === proposals.length;

  return (
    <ModalDialog onClose={onClose} width="x-large">
      <ModalHeader>
        <ModalTitle>
          Generated stories for {epicKey ?? 'epic'}
        </ModalTitle>
      </ModalHeader>
      <ModalBody>
        {/* Coverage summary */}
        <div style={{
          display: 'flex',
          gap: 16,
          padding: '8px 0 16px',
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          marginBottom: 16,
        }}>
          <div style={{
            fontSize: 12,
            color: token('color.text.subtle', '#42526E'),
          }}>
            <strong>{proposals.length}</strong> stories proposed
          </div>
          <div style={{
            fontSize: 12,
            color: token('color.text.subtle', '#42526E'),
          }}>
            <strong>{existingCount}</strong> existing
          </div>
          <div style={{
            fontSize: 12,
            color: coveragePercent >= 80
              ? token('color.text.success', '#006644')
              : token('color.text.warning', '#FF8B00'),
          }}>
            <strong>{coveragePercent}%</strong> documentation coverage
          </div>
        </div>

        {/* Select all / deselect all */}
        <div style={{
          display: 'flex',
          gap: 8,
          marginBottom: 8,
        }}>
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

        {/* Story list */}
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {proposals.map((story, index) => (
            <div
              key={index}
              style={{
                padding: '12px 8px',
                borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                background: selectedIndices.has(index)
                  ? token('color.background.selected', '#E9F2FE')
                  : 'transparent',
                borderRadius: 3,
                marginBottom: 4,
              }}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <Checkbox
                  isChecked={selectedIndices.has(index)}
                  onChange={() => onToggle(index)}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: token('color.text', '#172B4D'),
                    marginBottom: 4,
                  }}>
                    {story.title}
                  </div>
                  <div style={{
                    fontSize: 13,
                    color: token('color.text.subtle', '#42526E'),
                    marginBottom: 4,
                    fontStyle: 'italic',
                  }}>
                    {story.userStory}
                  </div>
                  <div style={{
                    display: 'flex',
                    gap: 12,
                    fontSize: 11,
                    color: token('color.text.subtlest', '#6B778C'),
                  }}>
                    <span>{story.acceptanceCriteria.length} acceptance criteria</span>
                    {story.brdRef && <span>Ref: {story.brdRef}</span>}
                    {story.covers.length > 0 && (
                      <span>Covers: {story.covers.join(', ')}</span>
                    )}
                  </div>
                </div>
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
            : `Create ${selectedCount} stor${selectedCount === 1 ? 'y' : 'ies'}`}
        </Button>
      </ModalFooter>
    </ModalDialog>
  );
}
