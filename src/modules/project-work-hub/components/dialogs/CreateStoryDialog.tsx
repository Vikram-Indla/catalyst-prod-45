import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { WorkItem, Priority, StatusCategory } from '../../types';

interface OptionType {
  label: string;
  value: string;
}

interface CreateStoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  features?: WorkItem[];
}

const priorityOptions: OptionType[] = [
  { label: 'Highest', value: 'HIGHEST' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
  { label: 'Lowest', value: 'LOWEST' },
];

const quarterOptions: OptionType[] = [
  { label: 'Q1 2025', value: 'q1-2025' },
  { label: 'Q2 2025', value: 'q2-2025' },
  { label: 'Q3 2025', value: 'q3-2025' },
  { label: 'Q4 2025', value: 'q4-2025' },
];

const releaseOptions: OptionType[] = [
  { label: 'Release 1.0', value: 'rel-1.0' },
  { label: 'Release 1.1', value: 'rel-1.1' },
  { label: 'Release 2.0', value: 'rel-2.0' },
];

// Mock features for selection
const featureOptions: OptionType[] = [
  { label: 'FEAT-001: User Authentication', value: 'feat-001' },
  { label: 'FEAT-002: Dashboard Redesign', value: 'feat-002' },
  { label: 'FEAT-003: API Integration', value: 'feat-003' },
];

export const CreateStoryDialog: React.FC<CreateStoryDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  features,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [feature, setFeature] = useState<OptionType | null>(null);
  const [quarter, setQuarter] = useState<OptionType | null>(null);
  const [release, setRelease] = useState<OptionType | null>(null);
  const [priority, setPriority] = useState<OptionType | null>(priorityOptions[2]);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');

  const handleSubmit = () => {
    if (!summary.trim() || !feature || !quarter || !release) return;

    onSubmit({
      type: 'STORY',
      summary: summary.trim(),
      description: description.trim(),
      status: 'TODO',
      statusCategory: 'TODO' as StatusCategory,
      priority: (priority?.value || 'MEDIUM') as Priority,
      quarterId: quarter.value,
      releaseVersionId: release.value,
      parentId: feature.value,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setFeature(null);
    setQuarter(null);
    setRelease(null);
    setPriority(priorityOptions[2]);
    setAcceptanceCriteria('');
    onClose();
  };

  const isValid = summary.trim() && feature && quarter && release;

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Create Story</ModalTitle>
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
              placeholder="Enter story summary"
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
              Feature <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
            </label>
            <Select
              options={featureOptions}
              value={feature}
              onChange={(value) => setFeature(value as OptionType)}
              placeholder="Select parent feature (required)"
              isClearable
            />
            <p style={{ 
              fontSize: '11px', 
              color: token('color.text.subtlest', '#8993A4'),
              marginTop: token('space.050', '4px')
            }}>
              Stories must belong to a Feature
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token('space.200', '16px') }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: token('space.050', '4px'),
                fontSize: '12px',
                fontWeight: 600,
                color: token('color.text.subtle', '#626F86')
              }}>
                Quarter <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
              </label>
              <Select
                options={quarterOptions}
                value={quarter}
                onChange={(value) => setQuarter(value as OptionType)}
                placeholder="Select quarter"
                isClearable
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
                Release Version <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
              </label>
              <Select
                options={releaseOptions}
                value={release}
                onChange={(value) => setRelease(value as OptionType)}
                placeholder="Select release"
                isClearable
              />
            </div>
          </div>

          <div>
            <label style={{ 
              display: 'block', 
              marginBottom: token('space.050', '4px'),
              fontSize: '12px',
              fontWeight: 600,
              color: token('color.text.subtle', '#626F86')
            }}>
              Priority
            </label>
            <Select
              options={priorityOptions}
              value={priority}
              onChange={(value) => setPriority(value as OptionType)}
              placeholder="Select priority"
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
              Description
            </label>
            <TextArea
              value={description}
              onChange={(e) => setDescription((e.target as HTMLTextAreaElement).value)}
              placeholder="Enter story description"
              minimumRows={3}
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
              Acceptance Criteria
            </label>
            <TextArea
              value={acceptanceCriteria}
              onChange={(e) => setAcceptanceCriteria((e.target as HTMLTextAreaElement).value)}
              placeholder="Enter acceptance criteria (one per line)"
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
          Create Story
        </Button>
      </ModalFooter>
    </Modal>
  );
};
