import React, { useState } from 'react';
import Modal, {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTransition,
} from '@atlaskit/modal-dialog';
import Form, { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import { X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface CreateWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateWorkItemModal({ isOpen, onClose }: CreateWorkItemModalProps) {
  const [spaceType, setSpaceType] = useState<'program' | 'project' | null>(null);
  const [selectedSpace, setSelectedSpace] = useState<any>(null);
  const [selectedWorkType, setSelectedWorkType] = useState<any>({
    label: 'Story',
    value: 'story',
    icon: '📗',
  });
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All spaces (programs + projects)
  const allSpaces = [
    // Programs
    { label: 'Product Program (PROD)', value: 'prod', type: 'program', icon: '📁', iconBg: '#FFF0B3' },
    { label: 'Engineering Program (ENG)', value: 'eng', type: 'program', icon: '📁', iconBg: '#FFF0B3' },
    // Projects
    { label: 'ICP Project (ICP)', value: 'icp', type: 'project', programKey: 'PROD', programName: 'Product Program', icon: '📊', iconBg: '#FFC400' },
    { label: 'Mobile App (MOB)', value: 'mob', type: 'project', programKey: 'PROD', programName: 'Product Program', icon: '📱', iconBg: '#4C9AFF' },
  ];

  // Work types based on space type
  const getWorkTypes = () => {
    if (spaceType === 'program') {
      return [{ label: 'Epic', value: 'epic', icon: '⚡' }];
    }
    return [
      { label: 'Feature', value: 'feature', icon: '📦' },
      { label: 'Story', value: 'story', icon: '📗' },
      { label: 'Task', value: 'task', icon: '☑️' },
      { label: 'Bug', value: 'bug', icon: '🐛' },
      { label: 'Defect', value: 'defect', icon: '❌' },
      { label: 'Incident', value: 'incident', icon: '🚨' },
    ];
  };

  const handleSpaceChange = (space: any) => {
    setSelectedSpace(space);
    setSpaceType(space?.type || null);
    
    if (space?.type === 'program') {
      setSelectedWorkType({ label: 'Epic', value: 'epic', icon: '⚡' });
    } else if (space?.type === 'project') {
      setSelectedWorkType({ label: 'Story', value: 'story', icon: '📗' });
    }
  };

  const handleSubmit = async () => {
    if (!selectedSpace || !summary.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      console.log('Creating work item:', {
        space: selectedSpace,
        workType: selectedWorkType,
        summary,
        description,
      });
      // TODO: Implement actual creation logic
      onClose();
    } catch (error) {
      console.error('Error creating work item:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setSelectedSpace(null);
    setSpaceType(null);
    setSelectedWorkType({ label: 'Story', value: 'story', icon: '📗' });
    setSummary('');
    setDescription('');
    onClose();
  };

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={handleClose} width="large">
          <ModalHeader>
            <ModalTitle>Create {selectedWorkType.label}</ModalTitle>
            <Button
              appearance="subtle"
              iconBefore={<X size={16} />}
              onClick={handleClose}
              aria-label="Close"
            />
          </ModalHeader>

          <ModalBody>
            <p style={{
              fontSize: '12px',
              color: '#5E6C84',
              margin: '0 0 20px 0',
            }}>
              Required fields are marked with an asterisk *
            </p>

            {/* SPACE */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Space <span style={{ color: '#DE350B' }}>*</span>
              </label>
              <Select
                inputId="space"
                placeholder="Select space..."
                options={allSpaces}
                value={selectedSpace}
                onChange={handleSpaceChange}
                formatOptionLabel={(option: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '20px',
                      height: '20px',
                      background: option.iconBg,
                      borderRadius: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                    }}>
                      {option.icon}
                    </div>
                    <span style={{ fontSize: '14px' }}>{option.label}</span>
                  </div>
                )}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '40px',
                    fontSize: '14px',
                    borderColor: '#DFE1E6',
                  }),
                }}
              />
            </div>

            {/* SHOW PROGRAM (if project selected) */}
            {spaceType === 'project' && selectedSpace && (
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: '#F4F5F7',
                borderRadius: '3px',
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#5E6C84',
                  marginBottom: '4px',
                }}>
                  Program
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#172B4D',
                }}>
                  {selectedSpace.programName} ({selectedSpace.programKey})
                </div>
              </div>
            )}

            {/* WORK TYPE */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Work type <span style={{ color: '#DE350B' }}>*</span>
              </label>
              <Select
                inputId="work-type"
                value={selectedWorkType}
                onChange={setSelectedWorkType}
                options={getWorkTypes()}
                formatOptionLabel={(option: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{option.icon}</span>
                    <span style={{ fontSize: '14px' }}>{option.label}</span>
                  </div>
                )}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '40px',
                    fontSize: '14px',
                    borderColor: '#DFE1E6',
                  }),
                }}
              />
              <div style={{
                fontSize: '11px',
                color: '#0052CC',
                marginTop: '4px',
              }}>
                <a href="#" style={{ color: '#0052CC', textDecoration: 'none' }}>
                  Learn about work types ↗
                </a>
              </div>
            </div>

            {/* STATUS */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Status
              </label>
              <Select
                inputId="status"
                defaultValue={{ label: 'In Requirements', value: 'in-requirements' }}
                options={[
                  { label: 'In Requirements', value: 'in-requirements' },
                  { label: 'To Do', value: 'to-do' },
                  { label: 'In Progress', value: 'in-progress' },
                ]}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '40px',
                    fontSize: '14px',
                    borderColor: '#DFE1E6',
                  }),
                }}
              />
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
              }}>
                This is the initial status upon creation
              </div>
            </div>

            {/* SUMMARY */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Summary <span style={{ color: '#DE350B' }}>*</span>
              </label>
              <Textfield
                name="summary"
                placeholder="What needs to be done?"
                value={summary}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
                autoComplete="off"
              />
              {!summary.trim() && (
                <div style={{
                  fontSize: '11px',
                  color: '#DE350B',
                  marginTop: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <span>⚠</span> Summary is required
                </div>
              )}
            </div>

            {/* PARENT (for non-Epic) */}
            {spaceType === 'project' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#172B4D',
                  display: 'block',
                  marginBottom: '4px',
                }}>
                  Parent
                </label>
                <Select
                  inputId="parent"
                  placeholder="Select parent"
                  options={[]}
                  isClearable
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: '40px',
                      fontSize: '14px',
                      borderColor: '#DFE1E6',
                    }),
                  }}
                />
                <div style={{
                  fontSize: '11px',
                  color: '#5E6C84',
                  marginTop: '4px',
                }}>
                  Your work type hierarchy determines the work items you can select here.
                </div>
              </div>
            )}

            {/* PRIORITY */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Priority
              </label>
              <Select
                inputId="priority"
                defaultValue={{ label: 'Medium', value: 'medium' }}
                options={[
                  { label: 'Highest', value: 'highest' },
                  { label: 'High', value: 'high' },
                  { label: 'Medium', value: 'medium' },
                  { label: 'Low', value: 'low' },
                ]}
                formatOptionLabel={(option: any) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>=</span>
                    <span style={{ fontSize: '14px' }}>{option.label}</span>
                  </div>
                )}
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: '40px',
                    fontSize: '14px',
                    borderColor: '#DFE1E6',
                  }),
                }}
              />
              <div style={{
                fontSize: '11px',
                color: '#0052CC',
                marginTop: '4px',
              }}>
                <a href="#" style={{ color: '#0052CC', textDecoration: 'none' }}>
                  Learn about priority levels ↗
                </a>
              </div>
            </div>

            {/* DESCRIPTION */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Description
              </label>
              <div style={{
                border: '2px solid #DFE1E6',
                borderRadius: '3px',
                padding: '8px',
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #DFE1E6',
                  marginBottom: '8px',
                }}>
                  <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}>B</button>
                  <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px', fontStyle: 'italic' }}>I</button>
                  <button type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '14px' }}>...</button>
                </div>
                <Textarea
                  placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[100px] border-none p-0 text-sm focus-visible:ring-0"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: '100%',
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#172B4D',
                cursor: 'pointer',
              }}>
                <input type="checkbox" />
                Create another
              </label>

              <div style={{ display: 'flex', gap: '8px' }}>
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
