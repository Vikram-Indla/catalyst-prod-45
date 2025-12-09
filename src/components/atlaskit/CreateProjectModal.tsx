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
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import { RadioGroup } from '@atlaskit/radio';
import SectionMessage from '@atlaskit/section-message';
import CrossIcon from '@atlaskit/icon/glyph/cross';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  programs: Program[];
}

interface Program {
  id: string;
  key: string;
  name: string;
  isDefault: boolean;
}

export interface ProjectFormData {
  name: string;
  key: string;
  description: string;
  program: { label: string; value: string } | null;
  type: 'scrum' | 'kanban';
  lead: { label: string; value: string } | null;
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSubmit,
  programs,
}: CreateProjectModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  // Find default program
  const defaultProgram = programs.find(p => p.isDefault);
  const defaultProgramOption = defaultProgram ? {
    label: `${defaultProgram.name} (${defaultProgram.key})`,
    value: defaultProgram.id,
  } : null;

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSubmitting(true);
    try {
      // If no program selected, use Default
      const finalData = {
        ...data,
        program: data.program || defaultProgramOption,
      };

      if (!finalData.program) {
        alert('No Default program found. Please create a Default program first.');
        setIsSubmitting(false);
        return;
      }

      await onSubmit(finalData);
      onClose();
    } catch (error) {
      console.error('Error creating project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateKey = (name: string): string => {
    return name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 10);
  };

  const programOptions = programs.map(p => ({
    label: `${p.name} (${p.key})${p.isDefault ? ' - Default' : ''}`,
    value: p.id,
  }));

  return (
    <ModalTransition>
      {isOpen && (
        <Modal onClose={onClose} width="large">
          <ModalHeader>
            <ModalTitle>Create project</ModalTitle>
            <Button
              appearance="subtle"
              iconBefore={<CrossIcon label="Close" size="small" />}
              onClick={onClose}
            />
          </ModalHeader>

          <Form<ProjectFormData> onSubmit={handleSubmit}>
            {({ formProps, submitting }) => (
              <form {...formProps}>
                <ModalBody>
                  {/* INFO MESSAGE */}
                  <SectionMessage appearance="information" title="About projects and programs">
                    <p style={{
                      fontSize: '12px',
                      lineHeight: '16px',
                      margin: 0,
                    }}>
                      Every project must be linked to a program. Programs house all epics, 
                      and projects can link features to those epics. If you don't select a 
                      program, this project will be automatically linked to the{' '}
                      <strong>Default</strong> program.
                    </p>
                  </SectionMessage>

                  <div style={{ marginTop: '24px' }}>
                    {/* PROJECT NAME */}
                    <Field
                      name="name"
                      label="Name"
                      isRequired
                      defaultValue=""
                      validate={(value) => {
                        if (!value || value.trim().length === 0) {
                          return 'Project name is required';
                        }
                        if (value.trim().length < 3) {
                          return 'Project name must be at least 3 characters';
                        }
                        return undefined;
                      }}
                    >
                      {({ fieldProps, error }) => (
                        <>
                          <Textfield
                            {...fieldProps}
                            placeholder="e.g., Invoice Management System"
                            autoComplete="off"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              fieldProps.onChange(e);
                              setGeneratedKey(generateKey(e.target.value));
                            }}
                          />
                          {error && <ErrorMessage>{error}</ErrorMessage>}
                          <HelperMessage>
                            A descriptive name for your project
                          </HelperMessage>
                        </>
                      )}
                    </Field>

                    {/* PROJECT KEY */}
                    <Field
                      name="key"
                      label="Key"
                      isRequired
                      defaultValue=""
                      validate={(value) => {
                        if (!value || value.trim().length === 0) {
                          return 'Project key is required';
                        }
                        if (!/^[A-Z0-9]+$/.test(value)) {
                          return 'Key must contain only uppercase letters and numbers';
                        }
                        if (value.length < 2 || value.length > 10) {
                          return 'Key must be between 2 and 10 characters';
                        }
                        return undefined;
                      }}
                    >
                      {({ fieldProps, error }) => (
                        <>
                          <Textfield
                            {...fieldProps}
                            placeholder={generatedKey || 'e.g., IMS'}
                            autoComplete="off"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const value = e.target.value.toUpperCase();
                              fieldProps.onChange(value);
                            }}
                          />
                          {error && <ErrorMessage>{error}</ErrorMessage>}
                          <HelperMessage>
                            A unique identifier (2-10 uppercase letters/numbers). 
                            This will be used as the prefix for issue keys.
                            {generatedKey && ` Suggested: ${generatedKey}`}
                          </HelperMessage>
                        </>
                      )}
                    </Field>

                    <Field
                      name="description"
                      label="Description"
                      defaultValue=""
                    >
                      {({ fieldProps }) => (
                        <>
                          <TextArea
                            placeholder="Describe the purpose of this project..."
                            minimumRows={3}
                            value={fieldProps.value as string}
                            onChange={(e) => fieldProps.onChange(e.target.value)}
                            onBlur={fieldProps.onBlur}
                          />
                          <HelperMessage>
                            Optional description of what this project covers
                          </HelperMessage>
                        </>
                      )}
                    </Field>

                    {/* PROGRAM SELECTION */}
                    <Field
                      name="program"
                      label="Program"
                      defaultValue={null}
                    >
                      {({ fieldProps }) => (
                        <>
                          <Select
                            {...fieldProps}
                            inputId="project-program"
                            placeholder="Select program (optional)"
                            options={programOptions}
                            isClearable
                          />
                          <HelperMessage>
                            Link this project to a program. If not selected, will use{' '}
                            <strong>Default</strong> program. Programs house epics that 
                            features in this project can link to.
                          </HelperMessage>
                        </>
                      )}
                    </Field>

                    {/* PROJECT TYPE */}
                    <Field
                      name="type"
                      label="Project type"
                      isRequired
                      defaultValue="scrum"
                    >
                      {({ fieldProps }) => (
                        <>
                          <RadioGroup
                            {...fieldProps}
                            options={[
                              {
                                name: 'type',
                                value: 'scrum',
                                label: 'Scrum',
                              },
                              {
                                name: 'type',
                                value: 'kanban',
                                label: 'Kanban',
                              },
                            ]}
                          />
                          <HelperMessage>
                            <strong>Scrum:</strong> Sprint-based workflow with backlog and sprint planning.{' '}
                            <strong>Kanban:</strong> Continuous flow with WIP limits.
                          </HelperMessage>
                        </>
                      )}
                    </Field>

                    {/* PROJECT LEAD */}
                    <Field
                      name="lead"
                      label="Project lead"
                      isRequired
                      defaultValue={null}
                      validate={(value) => {
                        if (!value) {
                          return 'Project lead is required';
                        }
                        return undefined;
                      }}
                    >
                      {({ fieldProps, error }) => (
                        <>
                          <Select
                            {...fieldProps}
                            inputId="project-lead"
                            placeholder="Select project lead..."
                            options={mockUsers}
                            isClearable
                          />
                          {error && <ErrorMessage>{error}</ErrorMessage>}
                          <HelperMessage>
                            The person responsible for this project
                          </HelperMessage>
                        </>
                      )}
                    </Field>
                  </div>
                </ModalBody>

                <ModalFooter>
                  <Button appearance="subtle" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button
                    appearance="primary"
                    type="submit"
                    isDisabled={submitting || isSubmitting}
                  >
                    {submitting || isSubmitting ? 'Creating...' : 'Create project'}
                  </Button>
                </ModalFooter>
              </form>
            )}
          </Form>
        </Modal>
      )}
    </ModalTransition>
  );
}

// ============================================
// MOCK DATA
// ============================================

const mockUsers = [
  { label: 'John Doe', value: 'john-doe' },
  { label: 'Jane Smith', value: 'jane-smith' },
  { label: 'Bob Johnson', value: 'bob-johnson' },
  { label: 'Alice Brown', value: 'alice-brown' },
];
