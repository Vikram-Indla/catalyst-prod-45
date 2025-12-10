import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select, { ValueType } from '@atlaskit/select';
import { WorkItem, Priority, StatusCategory } from '../../types';

interface OptionType {
  label: string;
  value: string;
}

interface CreateFeatureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  programId?: string;
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

const epicOptions: OptionType[] = [
  { label: 'EPIC-001: Platform Migration', value: 'epic-001' },
  { label: 'EPIC-002: User Experience', value: 'epic-002' },
  { label: 'EPIC-003: Performance Optimization', value: 'epic-003' },
];

export const CreateFeatureDialog: React.FC<CreateFeatureDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  programId,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [epic, setEpic] = useState<OptionType | null>(null);
  const [quarter, setQuarter] = useState<OptionType | null>(null);
  const [release, setRelease] = useState<OptionType | null>(null);
  const [priority, setPriority] = useState<OptionType | null>(priorityOptions[2]);

  const handleSubmit = () => {
    if (!summary.trim() || !epic || !quarter || !release) return;

    onSubmit({
      type: 'FEATURE',
      summary: summary.trim(),
      description: description.trim(),
      status: 'TODO',
      statusCategory: 'TODO' as StatusCategory,
      priority: (priority?.value || 'MEDIUM') as Priority,
      quarterId: quarter.value,
      releaseVersionId: release.value,
      epicId: epic.value,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setEpic(null);
    setQuarter(null);
    setRelease(null);
    setPriority(priorityOptions[2]);
    onClose();
  };

  const isValid = summary.trim() && epic && quarter && release;

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Create Feature</ModalTitle>
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
              placeholder="Enter feature summary"
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
              Epic <span style={{ color: token('color.text.danger', '#E34935') }}>*</span>
            </label>
            <Select
              options={epicOptions}
              value={epic}
              onChange={(value) => setEpic(value as OptionType)}
              placeholder="Select parent epic"
              isClearable
            />
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
              placeholder="Enter feature description"
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
          Create Feature
        </Button>
      </ModalFooter>
    </Modal>
  );
};
