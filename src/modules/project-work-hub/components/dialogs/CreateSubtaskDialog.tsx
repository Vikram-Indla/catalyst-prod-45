import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { WorkItem, StatusCategory } from '../../types';

interface CreateSubtaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  stories?: WorkItem[];
}

const storyOptions = [
  { label: 'STORY-001: Implement login form', value: 'story-001' },
  { label: 'STORY-002: Create user profile page', value: 'story-002' },
  { label: 'STORY-003: Add notification system', value: 'story-003' },
];

export const CreateSubtaskDialog: React.FC<CreateSubtaskDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  stories,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');

  const handleSubmit = () => {
    if (!summary.trim() || !story) return;

    onSubmit({
      type: 'SUBTASK',
      summary: summary.trim(),
      description: description.trim(),
      status: 'TODO',
      statusCategory: 'TODO' as StatusCategory,
      parentId: story,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setStory('');
    onClose();
  };

  const isValid = summary.trim() !== '' && story !== '';

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Create Subtask</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="summary" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Summary <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
            </label>
            <Textfield
              id="summary"
              value={summary}
              onChange={(e: any) => setSummary(e.target.value)}
              placeholder="Enter subtask summary"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="story" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Story <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
            </label>
            <Select
              inputId="story"
              options={storyOptions}
              value={storyOptions.find((o) => o.value === story)}
              onChange={(opt: any) => setStory(opt ? opt.value : '')}
              placeholder="Select parent story (required)"
            />
            <p style={{ fontSize: 12, color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
              Subtasks must belong to a Story
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="description" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Description
            </label>
            <TextArea
              id="description"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Enter subtask description"
              minimumRows={3}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={handleSubmit} isDisabled={!isValid}>
          Create Subtask
        </Button>
      </ModalFooter>
    </Modal>
  );
};
