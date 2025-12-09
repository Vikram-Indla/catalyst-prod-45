import React, { useState, useEffect } from 'react';
import { token } from '@atlaskit/tokens';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Select from '@atlaskit/select';
import CrossIcon from '@atlaskit/icon/glyph/cross';
import WarningIcon from '@atlaskit/icon/glyph/warning';
import { useCatalystContextOptional } from '@/contexts/CatalystContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpaceOption {
  label: string;
  value: string;
  type: 'program' | 'project';
  icon: string;
  programName?: string;
}

const workTypesBySpace: Record<string, Array<{ label: string; value: string; icon: string }>> = {
  program: [{ label: 'Epic', value: 'epic', icon: '⚡' }],
  project: [
    { label: 'Feature', value: 'feature', icon: '📦' },
    { label: 'Story', value: 'story', icon: '📗' },
    { label: 'Task', value: 'task', icon: '☑️' },
    { label: 'Bug', value: 'bug', icon: '🐛' },
    { label: 'Defect', value: 'defect', icon: '❌' },
  ],
};

const statusOptions = [
  { label: 'In Requirements', value: 'in-requirements' },
  { label: 'To Do', value: 'to-do' },
  { label: 'In Progress', value: 'in-progress' },
];

const priorityOptions = [
  { label: 'Highest', value: 'highest' },
  { label: 'High', value: 'high' },
  { label: 'Medium', value: 'medium' },
  { label: 'Low', value: 'low' },
];

export function CreateWorkItemModal({ isOpen, onClose }: CreateWorkItemModalProps) {
  const context = useCatalystContextOptional();
  const workspaceType = context?.workspaceType;
  const programId = context?.programId;
  const projectId = context?.projectId;

  const [selectedSpace, setSelectedSpace] = useState<SpaceOption | null>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<{ label: string; value: string; icon: string } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState(statusOptions[0]);
  const [selectedPriority, setSelectedPriority] = useState(priorityOptions[2]);
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch programs
  const { data: programs = [] } = useQuery({
    queryKey: ['programs-for-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .select('id, name')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch projects
  const { data: projects = [] } = useQuery({
    queryKey: ['projects-for-create'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('id, name, portfolio_id, portfolios(name)')
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Build space options
  const spaceOptions: SpaceOption[] = [
    ...programs.map(p => ({
      label: p.name,
      value: `program-${p.id}`,
      type: 'program' as const,
      icon: '📁',
    })),
    ...projects.map(p => ({
      label: p.name,
      value: `project-${p.id}`,
      type: 'project' as const,
      icon: '📊',
      programName: (p.portfolios as any)?.name || 'Unknown Program',
    })),
  ];

  // Pre-select based on context
  useEffect(() => {
    if (isOpen && spaceOptions.length > 0) {
      let defaultSpace: SpaceOption | undefined;
      if (workspaceType === 'program' && programId) {
        defaultSpace = spaceOptions.find(s => s.value === `program-${programId}`);
      } else if (workspaceType === 'project' && projectId) {
        defaultSpace = spaceOptions.find(s => s.value === `project-${projectId}`);
      }
      if (!defaultSpace) defaultSpace = spaceOptions[0];

      setSelectedSpace(defaultSpace);
      const workTypes = workTypesBySpace[defaultSpace.type];
      setSelectedWorkType(workTypes[0]);
    }
  }, [isOpen, spaceOptions.length]);

  const handleSpaceChange = (option: SpaceOption | null) => {
    setSelectedSpace(option);
    if (option) {
      const workTypes = workTypesBySpace[option.type];
      setSelectedWorkType(workTypes[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSpace || !summary.trim()) return;
    setIsSubmitting(true);
    try {
      console.log('Creating work item:', {
        space: selectedSpace,
        workType: selectedWorkType,
        summary,
        description,
        status: selectedStatus,
        priority: selectedPriority,
      });
      handleClose();
    } catch (error) {
      console.error('Error creating work item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedSpace(null);
    setSelectedWorkType(null);
    setSummary('');
    setDescription('');
    setSelectedStatus(statusOptions[0]);
    setSelectedPriority(priorityOptions[2]);
    onClose();
  };

  const workTypes = selectedSpace ? workTypesBySpace[selectedSpace.type] : [];

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="large">
          <ModalHeader>
            <ModalTitle>Create {selectedWorkType?.label || 'Work Item'}</ModalTitle>
            <Button
              appearance="subtle"
              iconBefore={<CrossIcon label="Close" size="small" />}
              onClick={handleClose}
            />
          </ModalHeader>

          <ModalBody>
            <p style={{
              fontSize: '12px',
              color: token('color.text.subtlest', '#6B778C'),
              margin: `0 0 ${token('space.300', '24px')} 0`,
            }}>
              Required fields are marked with an asterisk *
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
              {/* Space */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: token('space.050', '4px'),
                }}>
                  Space <span style={{ color: token('color.text.danger', '#DE350B') }}>*</span>
                </label>
                <Select
                  inputId="space"
                  value={selectedSpace}
                  onChange={handleSpaceChange}
                  options={spaceOptions}
                  placeholder="Select space..."
                  formatOptionLabel={(option: SpaceOption) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  )}
                />
              </div>

              {/* Work Type */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: token('space.050', '4px'),
                }}>
                  Work type <span style={{ color: token('color.text.danger', '#DE350B') }}>*</span>
                </label>
                <Select
                  inputId="workType"
                  value={selectedWorkType}
                  onChange={(option) => setSelectedWorkType(option)}
                  options={workTypes}
                  formatOptionLabel={(option: any) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                    </div>
                  )}
                />
                <a href="#" style={{
                  display: 'block',
                  marginTop: token('space.050', '4px'),
                  fontSize: '12px',
                  color: token('color.link', '#0052CC'),
                  textDecoration: 'none',
                }}>
                  Learn about work types →
                </a>
              </div>

              {/* Status */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: token('space.050', '4px'),
                }}>
                  Status
                </label>
                <Select
                  inputId="status"
                  value={selectedStatus}
                  onChange={(option) => option && setSelectedStatus(option)}
                  options={statusOptions}
                />
                <p style={{
                  marginTop: token('space.050', '4px'),
                  fontSize: '12px',
                  color: token('color.text.subtlest', '#6B778C'),
                }}>
                  This is the initial status upon creation
                </p>
              </div>

              {/* Summary */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: token('space.050', '4px'),
                }}>
                  Summary <span style={{ color: token('color.text.danger', '#DE350B') }}>*</span>
                </label>
                <Textfield
                  value={summary}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
                  placeholder="What needs to be done?"
                />
                {!summary.trim() && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: token('space.050', '4px'),
                    marginTop: token('space.050', '4px'),
                    fontSize: '12px',
                    color: token('color.text.danger', '#DE350B'),
                  }}>
                    <WarningIcon label="Warning" size="small" primaryColor={token('color.icon.danger', '#DE350B')} />
                    Summary is required
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: token('space.050', '4px'),
                }}>
                  Priority
                </label>
                <Select
                  inputId="priority"
                  value={selectedPriority}
                  onChange={(option) => option && setSelectedPriority(option)}
                  options={priorityOptions}
                />
                <a href="#" style={{
                  display: 'block',
                  marginTop: token('space.050', '4px'),
                  fontSize: '12px',
                  color: token('color.link', '#0052CC'),
                  textDecoration: 'none',
                }}>
                  Learn about priority levels →
                </a>
              </div>

              {/* Description */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: token('color.text', '#172B4D'),
                  marginBottom: token('space.050', '4px'),
                }}>
                  Description
                </label>
                <div style={{
                  border: `2px solid ${token('color.border.input', '#DFE1E6')}`,
                  borderRadius: '3px',
                }}>
                  <div style={{
                    display: 'flex',
                    gap: token('space.100', '8px'),
                    padding: token('space.100', '8px'),
                    borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
                    background: token('color.background.neutral', '#F4F5F7'),
                  }}>
                    <button type="button" style={{ background: 'transparent', border: 'none', fontWeight: 700, cursor: 'pointer' }}>B</button>
                    <button type="button" style={{ background: 'transparent', border: 'none', fontStyle: 'italic', cursor: 'pointer' }}>I</button>
                    <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>⋯</button>
                  </div>
                  <TextArea
                    value={description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                    placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
                    minimumRows={4}
                  />
                </div>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: token('space.100', '8px'),
                fontSize: '12px',
                color: token('color.text', '#172B4D'),
                cursor: 'pointer',
              }}>
                <input type="checkbox" />
                Create another
              </label>
              <div style={{ display: 'flex', gap: token('space.100', '8px') }}>
                <Button appearance="subtle" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  appearance="primary"
                  onClick={handleSubmit}
                  isDisabled={!selectedSpace || !summary.trim() || isSubmitting}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </ModalFooter>
        </Modal>
      )}
    </ModalTransition>
  );
}
