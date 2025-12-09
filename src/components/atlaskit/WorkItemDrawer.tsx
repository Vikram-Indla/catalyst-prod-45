import React, { useState } from 'react';
import Drawer from '@atlaskit/drawer';
import Form, { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';

// ============================================
// WORK ITEM DRAWER (RIGHT SIDE)
// ============================================

interface WorkItemDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

function WorkItemDrawer({ 
  isOpen, 
  onClose 
}: WorkItemDrawerProps) {
  const [selectedWorkType, setSelectedWorkType] = useState<any>({
    label: 'Story',
    value: 'story',
    icon: '📗',
  });

  const workTypes = [
    { label: 'Epic', value: 'epic', icon: '⚡', color: '#6554C0' },
    { label: 'Feature', value: 'feature', icon: '📦', color: '#00B8D9' },
    { label: 'Story', value: 'story', icon: '📗', color: '#36B37E' },
    { label: 'Task', value: 'task', icon: '☑️', color: '#4C9AFF' },
    { label: 'Bug', value: 'bug', icon: '🐛', color: '#DE350B' },
    { label: 'Defect', value: 'defect', icon: '❌', color: '#FF5630' },
    { label: 'Incident', value: 'incident', icon: '🚨', color: '#FF991F' },
    { label: 'Change Request', value: 'change-request', icon: '📋', color: '#00875A' },
  ];

  const isEpic = selectedWorkType.value === 'epic';

  const handleSubmit = (data: any) => {
    console.log('Creating work item:', {
      ...data,
      workType: selectedWorkType.value,
    });
    onClose();
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width="wide"
    >
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFFFF',
      }}>
        {/* HEADER */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #DFE1E6',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 500,
            color: '#172B4D',
            margin: 0,
          }}>
            Create {selectedWorkType.label}
          </h2>
          <p style={{
            fontSize: '12px',
            color: '#5E6C84',
            margin: '4px 0 0 0',
          }}>
            Required fields are marked with an asterisk *
          </p>
        </div>

        {/* FORM */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
        }}>
          <Form onSubmit={handleSubmit}>
            {({ formProps, submitting }) => (
              <form {...formProps}>
                {/* DYNAMIC: PROGRAM (for Epic) OR SPACE/PROJECT (for others) */}
                {isEpic ? (
                  // PROGRAM FIELD (for Epic)
                  <Field
                    name="program"
                    label="Program"
                    isRequired
                    defaultValue={null}
                    validate={(value) => {
                      if (!value) {
                        return 'Program is required';
                      }
                      return undefined;
                    }}
                  >
                    {({ fieldProps, error }) => (
                      <>
                        <Select
                          {...fieldProps}
                          inputId="program"
                          placeholder="Select program..."
                          options={mockPrograms}
                          formatOptionLabel={(option: any) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '20px',
                                height: '20px',
                                background: '#FFC400',
                                borderRadius: '3px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                              }}>
                                📁
                              </div>
                              <span>{option.label}</span>
                            </div>
                          )}
                        />
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <HelperMessage>
                          The program this epic belongs to. Epics live in programs.
                        </HelperMessage>
                      </>
                    )}
                  </Field>
                ) : (
                  // SPACE/PROJECT FIELD (for all other work items)
                  <Field
                    name="space"
                    label="Space"
                    isRequired
                    defaultValue={null}
                    validate={(value) => {
                      if (!value) {
                        return 'Space is required';
                      }
                      return undefined;
                    }}
                  >
                    {({ fieldProps, error }) => (
                      <>
                        <Select
                          {...fieldProps}
                          inputId="space"
                          placeholder="Select project..."
                          options={mockProjects}
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
                              <span>{option.label}</span>
                            </div>
                          )}
                        />
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <HelperMessage>
                          The project this work item belongs to
                        </HelperMessage>
                      </>
                    )}
                  </Field>
                )}

                {/* WORK TYPE */}
                <Field
                  name="workType"
                  label="Work type"
                  isRequired
                  defaultValue={selectedWorkType}
                >
                  {({ fieldProps }) => (
                    <>
                      <Select
                        {...fieldProps}
                        inputId="work-type"
                        value={selectedWorkType}
                        onChange={(value) => setSelectedWorkType(value)}
                        options={workTypes}
                        formatOptionLabel={(option: any) => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '16px' }}>{option.icon}</span>
                            <span>{option.label}</span>
                          </div>
                        )}
                      />
                      <HelperMessage>
                        <a
                          href="#"
                          style={{
                            color: '#0052CC',
                            textDecoration: 'none',
                          }}
                        >
                          Learn about work types
                        </a>
                      </HelperMessage>
                    </>
                  )}
                </Field>

                {/* STATUS */}
                <Field
                  name="status"
                  label="Status"
                  defaultValue={{ label: 'In Requirements', value: 'in-requirements' }}
                >
                  {({ fieldProps }) => (
                    <>
                      <Select
                        {...fieldProps}
                        inputId="status"
                        options={[
                          { label: 'In Requirements', value: 'in-requirements' },
                          { label: 'To Do', value: 'to-do' },
                          { label: 'In Progress', value: 'in-progress' },
                          { label: 'Done', value: 'done' },
                        ]}
                      />
                      <HelperMessage>
                        This is the initial status upon creation
                      </HelperMessage>
                    </>
                  )}
                </Field>

                {/* SUMMARY */}
                <Field
                  name="summary"
                  label="Summary"
                  isRequired
                  defaultValue=""
                  validate={(value) => {
                    if (!value || (typeof value === 'string' && value.trim().length === 0)) {
                      return 'Summary is required';
                    }
                    return undefined;
                  }}
                >
                  {({ fieldProps, error }) => (
                    <>
                      <Textfield
                        {...fieldProps}
                        placeholder="What needs to be done?"
                        autoComplete="off"
                      />
                      {error && <ErrorMessage>{error}</ErrorMessage>}
                    </>
                  )}
                </Field>

                {/* PARENT (only for non-Epic items) */}
                {!isEpic && (
                  <Field
                    name="parent"
                    label="Parent"
                    defaultValue={null}
                  >
                    {({ fieldProps }) => (
                      <>
                        <Select
                          {...fieldProps}
                          inputId="parent"
                          placeholder="Select parent..."
                          options={mockParents}
                          isClearable
                          formatOptionLabel={(option: any) => (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px' }}>{option.icon}</span>
                              <span>{option.label}</span>
                            </div>
                          )}
                        />
                        <HelperMessage>
                          Your work type hierarchy determines the work items you can select here.
                        </HelperMessage>
                      </>
                    )}
                  </Field>
                )}

                {/* PRIORITY */}
                <Field
                  name="priority"
                  label="Priority"
                  defaultValue={{ label: 'Medium', value: 'medium' }}
                >
                  {({ fieldProps }) => (
                    <>
                      <Select
                        {...fieldProps}
                        inputId="priority"
                        options={[
                          { label: 'Highest', value: 'highest' },
                          { label: 'High', value: 'high' },
                          { label: 'Medium', value: 'medium' },
                          { label: 'Low', value: 'low' },
                          { label: 'Lowest', value: 'lowest' },
                        ]}
                        formatOptionLabel={(option: any) => (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '16px',
                              height: '16px',
                              display: 'inline-block',
                            }}>
                              {option.value === 'highest' && '⬆️'}
                              {option.value === 'high' && '↗️'}
                              {option.value === 'medium' && '➡️'}
                              {option.value === 'low' && '↘️'}
                              {option.value === 'lowest' && '⬇️'}
                            </span>
                            <span>{option.label}</span>
                          </div>
                        )}
                      />
                      <HelperMessage>
                        <a
                          href="#"
                          style={{
                            color: '#0052CC',
                            textDecoration: 'none',
                          }}
                        >
                          Learn about priority levels
                        </a>
                      </HelperMessage>
                    </>
                  )}
                </Field>

                {/* DESCRIPTION */}
                <Field
                  name="description"
                  label="Description"
                  defaultValue=""
                >
                  {({ fieldProps }) => (
                    <>
                      <div style={{
                        border: '1px solid #DFE1E6',
                        borderRadius: '3px',
                        padding: '8px',
                      }}>
                        {/* TOOLBAR */}
                        <div style={{
                          display: 'flex',
                          gap: '4px',
                          paddingBottom: '8px',
                          borderBottom: '1px solid #DFE1E6',
                          marginBottom: '8px',
                        }}>
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 600,
                            }}
                          >
                            B
                          </button>
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontStyle: 'italic',
                            }}
                          >
                            I
                          </button>
                          <button
                            type="button"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px 8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                            }}
                          >
                            ...
                          </button>
                        </div>

                        {/* TEXTAREA */}
                        <TextArea
                          name={fieldProps.name}
                          value={fieldProps.value as string}
                          onChange={(e) => fieldProps.onChange(e.target.value)}
                          onBlur={fieldProps.onBlur}
                          placeholder="Type /ai for Atlassian Intelligence or @ to mention and notify someone."
                          minimumRows={6}
                        />
                      </div>
                    </>
                  )}
                </Field>

                {/* ASSIGNEE */}
                <Field
                  name="assignee"
                  label="Assignee"
                  defaultValue={null}
                >
                  {({ fieldProps }) => (
                    <>
                      <Select
                        {...fieldProps}
                        inputId="assignee"
                        placeholder="Unassigned"
                        options={mockUsers}
                        isClearable
                      />
                    </>
                  )}
                </Field>

                {/* FOOTER */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '24px',
                  paddingTop: '16px',
                  borderTop: '1px solid #DFE1E6',
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
                    <Button appearance="subtle" onClick={onClose}>
                      Cancel
                    </Button>
                    <Button
                      appearance="primary"
                      type="submit"
                      isDisabled={submitting}
                    >
                      {submitting ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </Form>
        </div>
      </div>
    </Drawer>
  );
}

// ============================================
// MOCK DATA
// ============================================

const mockPrograms = [
  { label: 'Product Program (PROD)', value: 'prod' },
  { label: 'Engineering Program (ENG)', value: 'eng' },
  { label: 'Default (DEFAULT)', value: 'default' },
];

const mockProjects = [
  { label: 'ICP Project (ICP)', value: 'icp', icon: '📊', iconBg: '#FFC400' },
  { label: 'Mobile App (MOB)', value: 'mob', icon: '📱', iconBg: '#4C9AFF' },
  { label: 'Backend Services (BACK)', value: 'back', icon: '⚙️', iconBg: '#00B8D9' },
];

const mockParents = [
  { label: 'PROD-1 User Authentication System', value: 'prod-1', icon: '⚡' },
  { label: 'PROD-2 Payment Gateway', value: 'prod-2', icon: '⚡' },
  { label: 'ICP-5 Invoice Management', value: 'icp-5', icon: '📦' },
];

const mockUsers = [
  { label: 'John Doe', value: 'john-doe' },
  { label: 'Jane Smith', value: 'jane-smith' },
  { label: 'Bob Johnson', value: 'bob-johnson' },
];

export default WorkItemDrawer;
