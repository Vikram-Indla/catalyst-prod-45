import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { WorkItem, StatusCategory } from '../../types';

interface OptionType {
  label: string;
  value: string;
}

interface CreateSubtaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  stories?: WorkItem[];
}

// Mock stories for selection
const storyOptions: OptionType[] = [
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
  const [story, setStory] = useState<OptionType | null>(null);

  const handleSubmit = () => {
    if (!summary.trim() || !story) return;

    onSubmit({
      type: 'SUBTASK',
      summary: summary.trim(),
      description: description.trim(),
      status: 'TODO',
      statusCategory: 'TODO' as StatusCategory,
      parentId: story.value,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setStory(null);
    onClose();
  };

  const isValid = summary.trim() && story;

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Create Subtask</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: token('space.050', '4px'),
              fontSize: '12px',
              fontWeight: 600,
              color: token('color.text.subtle', '#626F86')
            }}>
              Summary <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
            </label>
            <Textfield
              value={summary}
              onChange={(e) => setSummary((e.target as HTMLInputElement).value)}
              placeholder="Enter subtask summary"
              isRequired
            />
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: token('space.050', '4px'),
              fontSize: '12px',
              fontWeight: 600,
              color: token('color.text.subtle', '#626F86')
            }}>
              Story <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
            </label>
            <Select
              options={storyOptions}
              value={story}
              onChange={(value) => setStory(value as OptionType)}
              placeholder="Select parent story (required)"
              isClearable
            />
            <p style={{ 
              fontSize: '11px', 
              color: token('color.text.subtlest', '#8993A4'),
              marginTop: token('space.050', '4px')
            }}>
              Subtasks must belong to a Story
            </p>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: token('space.050', '4px'),
              fontSize: '12px',
              fontWeight: 600,
              color: token('color.text.subtle', '#626F86')
            }}>
              Description
            </label>
            <TextArea
              value={description}
              onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
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
