import React, { useState } from 'react';
import Modal, { ModalBody, ModalFooter, ModalHeader, ModalTitle } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import { WorkItem, Priority, StatusCategory } from '../../types';

interface LogDefectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<WorkItem>) => void;
  projectId: string;
  stories?: WorkItem[];
}

const priorityOptions = [
  { label: 'Highest', value: 'HIGHEST' },
  { label: 'High', value: 'HIGH' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Low', value: 'LOW' },
  { label: 'Lowest', value: 'LOWEST' },
];

const quarterOptions = [
  { label: 'Q1 2025', value: 'q1-2025' },
  { label: 'Q2 2025', value: 'q2-2025' },
  { label: 'Q3 2025', value: 'q3-2025' },
  { label: 'Q4 2025', value: 'q4-2025' },
];

const releaseOptions = [
  { label: 'Release 1.0', value: 'rel-1.0' },
  { label: 'Release 1.1', value: 'rel-1.1' },
  { label: 'Release 2.0', value: 'rel-2.0' },
];

const storyOptions = [
  { label: 'STORY-001: Implement login form', value: 'story-001' },
  { label: 'STORY-002: Create user profile page', value: 'story-002' },
  { label: 'STORY-003: Add notification system', value: 'story-003' },
];

export const LogDefectDialog: React.FC<LogDefectDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  projectId,
  stories,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [story, setStory] = useState('');
  const [quarter, setQuarter] = useState('');
  const [release, setRelease] = useState('');
  const [priority, setPriority] = useState('HIGH');

  const handleSubmit = () => {
    if (!summary.trim() || !story || !quarter || !release || !priority) return;

    onSubmit({
      type: 'DEFECT',
      summary: summary.trim(),
      description: description.trim(),
      status: 'OPEN',
      statusCategory: 'TODO' as StatusCategory,
      priority: priority as Priority,
      quarterId: quarter,
      releaseVersionId: release,
      parentId: story,
    });

    // Reset form
    setSummary('');
    setDescription('');
    setStory('');
    setQuarter('');
    setRelease('');
    setPriority('HIGH');
    onClose();
  };

  const isValid = summary.trim() !== '' && story !== '' && quarter !== '' && release !== '' && priority !== '';

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} width="medium">
      <ModalHeader>
        <ModalTitle>Log Defect</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="summary" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Summary <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
            </label>
            <Textfield
              id="summary"
              value={summary}
              onChange={(e: any) => setSummary(e.target.value)}
              placeholder="Enter defect summary"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="story" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Story <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
            </label>
            <Select
              inputId="story"
              options={storyOptions}
              value={storyOptions.find((o) => o.value === story)}
              onChange={(opt: any) => setStory(opt ? opt.value : '')}
              placeholder="Select related story (required)"
            />
            <p style={{ fontSize: 'var(--ds-font-size-200)', color: 'var(--ds-text-subtlest, #6B778C)', marginTop: 4 }}>
              Defects must be linked to a Story
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="quarter" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                Quarter <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
              </label>
              <Select
                inputId="quarter"
                options={quarterOptions}
                value={quarterOptions.find((o) => o.value === quarter)}
                onChange={(opt: any) => setQuarter(opt ? opt.value : '')}
                placeholder="Select quarter"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="release" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
                Release Version <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
              </label>
              <Select
                inputId="release"
                options={releaseOptions}
                value={releaseOptions.find((o) => o.value === release)}
                onChange={(opt: any) => setRelease(opt ? opt.value : '')}
                placeholder="Select release"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="priority" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Priority <span style={{ color: 'var(--ds-text-danger, #DE350B)' }}>*</span>
            </label>
            <Select
              inputId="priority"
              options={priorityOptions}
              value={priorityOptions.find((o) => o.value === priority)}
              onChange={(opt: any) => setPriority(opt ? opt.value : '')}
              placeholder="Select priority"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="description" style={{ fontSize: 'var(--ds-font-size-200)', fontWeight: 600, color: 'var(--ds-text-subtlest, #6B778C)' }}>
              Description
            </label>
            <TextArea
              id="description"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              placeholder="Describe the defect, steps to reproduce, and expected behavior"
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
          Log Defect
        </Button>
      </ModalFooter>
    </Modal>
  );
};
