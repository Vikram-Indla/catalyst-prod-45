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

interface LogIncidentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  stories?: WorkItem[];
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

// Mock stories for selection
const storyOptions: OptionType[] = [
  { label: 'STORY-001: Implement login form', value: 'story-001' },
  { label: 'STORY-002: Create user profile page', value: 'story-002' },
  { label: 'STORY-003: Add notification system', value: 'story-003' },
];

export const LogIncidentDialog: React.FC<LogIncidentDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  stories,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState<OptionType | null>(null);
  const [quarter, setQuarter] = useState<OptionType | null>(null);
  const [release, setRelease] = useState<OptionType | null>(null);
  const [priority, setPriority] = useState<OptionType | null>(priorityOptions[0]); // Default Highest for incidents

  const handleSubmit = () => {
    if (!summary.trim() || !story || !quarter || !release || !priority) return;

    onSubmit({
      type: 'INCIDENT',
      summary: summary.trim(),
      description: description.trim(),
      status: 'OPEN',
      statusCategory: 'TODO' as StatusCategory,
      priority: priority.value as Priority,
      quarterId: quarter.value,
      releaseVersionId: release.value,
      parentId: story.value,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setStory(null);
    setQuarter(null);
    setRelease(null);
    setPriority(priorityOptions[0]);
    onClose();
  };

  const isValid = summary.trim() && story && quarter && release && priority;

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Log Incident</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
          <div style={{
            padding: token('space.150', '12px'),
            backgroundColor: token('color.background.warning', '#FFFAE6'),
            borderRadius: '4px',
            border: `1px solid ${token('color.border.warning', '#F5CD47')}`
          }}>
            <p style={{ 
              fontSize: '12px', 
              color: token('color.text.warning', '#7F5F01'),
              margin: 0
            }}>
              Incidents are production issues that require immediate attention.
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
              Summary <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
            </label>
            <Textfield
              value={summary}
              onChange={(e) => setSummary((e.target as HTMLInputElement).value)}
              placeholder="Enter incident summary"
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
              placeholder="Select related story (required)"
              isClearable
            />
            <p style={{ 
              fontSize: '11px', 
              color: token('color.text.subtlest', '#8993A4'),
              marginTop: token('space.050', '4px')
            }}>
              Incidents must be linked to a Story
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
              Priority <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
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
              placeholder="Describe the incident, impact, and any immediate actions taken"
              minimumRows={4}
            />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button appearance="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button appearance="primary" onClick={handleSubmit} isDisabled={!isValid}>
          Log Incident
        </Button>
      </ModalFooter>
    </Modal>
  );
};
