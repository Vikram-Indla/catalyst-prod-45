import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import { Content, Main, PageLayout } from '@atlaskit/page-layout';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Form, { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import Toggle from '@atlaskit/toggle';
import SectionMessage from '@atlaskit/section-message';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ProjectSidebar from '@/components/atlaskit/ProjectSidebar';

interface Project {
  id: string;
  key: string;
  name: string;
  description: string;
  programId: string;
  programName: string;
  lead: {
    label: string;
    value: string;
  } | null;
  type: {
    label: string;
    value: string;
  };
  category: string;
}

export default function ProjectSettingsPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState(0);

  // Fetch project data
  const { data: project, isLoading } = useQuery({
    queryKey: ['project-settings', projectKey],
    queryFn: async () => {
      // For now, use mock data - in production, fetch from database
      const mockProject: Project = {
        id: '1',
        key: projectKey || 'ICP',
        name: 'ICP Project',
        description: 'Invoice and compliance platform',
        programId: 'PROD',
        programName: 'Product Program',
        lead: {
          label: 'Vikram Indla',
          value: 'vikram-indla',
        },
        type: {
          label: 'Scrum',
          value: 'scrum',
        },
        category: 'Company-managed software',
      };
      return mockProject;
    },
    enabled: !!projectKey,
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: async (data: Partial<Project>) => {
      // TODO: Implement actual API call
      console.log('Updating project:', data);
      return data;
    },
    onSuccess: () => {
      toast.success('Project settings saved');
      queryClient.invalidateQueries({ queryKey: ['project-settings', projectKey] });
    },
    onError: (error: Error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });

  if (isLoading || !project) {
    return (
      <div style={{ display: 'flex', height: '100vh' }}>
        <ProjectSidebar projectKey={projectKey || ''} currentPage="settings" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <ProjectSidebar projectKey={projectKey || ''} currentPage="settings" />

      <PageLayout>
        <Content>
          <Main>
            <div style={{
              padding: '24px 40px',
              background: '#FAFBFC',
              minHeight: '100vh',
            }}>
              {/* BREADCRUMBS */}
              <div style={{ marginBottom: '12px' }}>
                <Breadcrumbs>
                  <BreadcrumbsItem href="/projects" text="Projects" />
                  <BreadcrumbsItem href={`/projects/${projectKey}`} text={project.name} />
                  <BreadcrumbsItem text="Settings" />
                </Breadcrumbs>
              </div>

              {/* PAGE HEADER */}
              <div style={{ marginBottom: '24px' }}>
                <h1 style={{
                  fontSize: '20px',
                  fontWeight: 500,
                  lineHeight: '24px',
                  color: '#172B4D',
                  margin: '0 0 4px 0',
                }}>
                  Project settings
                </h1>
                <p style={{
                  fontSize: '12px',
                  lineHeight: '16px',
                  color: '#5E6C84',
                  margin: 0,
                }}>
                  Manage settings for {project.name}
                </p>
              </div>

              {/* TABS */}
              <Tabs
                onChange={(index) => setSelectedTab(index)}
                selected={selectedTab}
                id="settings-tabs"
              >
                <TabList>
                  <Tab>Details</Tab>
                  <Tab>Access</Tab>
                  <Tab>Notifications</Tab>
                  <Tab>Features</Tab>
                  <Tab>Advanced</Tab>
                </TabList>

                {/* DETAILS TAB */}
                <TabPanel>
                  <div style={{ marginTop: '16px' }}>
                    <DetailsTab
                      project={project}
                      onSave={(data) => updateProjectMutation.mutate(data)}
                      isSaving={updateProjectMutation.isPending}
                    />
                  </div>
                </TabPanel>

                {/* ACCESS TAB */}
                <TabPanel>
                  <div style={{ marginTop: '16px' }}>
                    <AccessTab project={project} />
                  </div>
                </TabPanel>

                {/* NOTIFICATIONS TAB */}
                <TabPanel>
                  <div style={{ marginTop: '16px' }}>
                    <NotificationsTab project={project} />
                  </div>
                </TabPanel>

                {/* FEATURES TAB */}
                <TabPanel>
                  <div style={{ marginTop: '16px' }}>
                    <FeaturesTab project={project} />
                  </div>
                </TabPanel>

                {/* ADVANCED TAB */}
                <TabPanel>
                  <div style={{ marginTop: '16px' }}>
                    <AdvancedTab project={project} />
                  </div>
                </TabPanel>
              </Tabs>
            </div>
          </Main>
        </Content>
      </PageLayout>
    </div>
  );
}

// ============================================
// DETAILS TAB
// ============================================

function DetailsTab({ project, onSave, isSaving }: { project: Project; onSave: (data: any) => void; isSaving: boolean }) {
  const mockUsers = [
    { label: 'Vikram Indla', value: 'vikram-indla' },
    { label: 'Jane Smith', value: 'jane-smith' },
    { label: 'Bob Johnson', value: 'bob-johnson' },
    { label: 'Alice Brown', value: 'alice-brown' },
  ];

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #DFE1E6',
      borderRadius: '3px',
      padding: '24px',
      maxWidth: '600px',
    }}>
      <h2 style={{
        fontSize: '14px',
        fontWeight: 600,
        color: '#172B4D',
        margin: '0 0 16px 0',
      }}>
        Project details
      </h2>

      <Form onSubmit={(data) => { onSave(data); return Promise.resolve(); }}>
        {({ formProps, submitting }) => (
          <form {...formProps}>
            {/* PROJECT KEY (READ-ONLY) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Key
              </label>
              <div style={{
                padding: '8px 12px',
                background: '#F4F5F7',
                border: '1px solid #DFE1E6',
                borderRadius: '3px',
                fontSize: '14px',
                color: '#172B4D',
              }}>
                {project.key}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
              }}>
                Project key cannot be changed
              </div>
            </div>

            {/* PROGRAM (READ-ONLY WITH LINK) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Program
              </label>
              <div style={{
                padding: '8px 12px',
                background: '#F4F5F7',
                border: '1px solid #DFE1E6',
                borderRadius: '3px',
                fontSize: '14px',
              }}>
                <a
                  href={`/programs/${project.programId}`}
                  style={{
                    color: '#0052CC',
                    textDecoration: 'none',
                  }}
                >
                  {project.programName} ({project.programId})
                </a>
              </div>
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
              }}>
                This project is linked to this program. Epics from this program can be linked to features in this project.
              </div>
            </div>

            {/* PROJECT NAME */}
            <Field
              name="name"
              label="Name"
              isRequired
              defaultValue={project.name}
              validate={(value) => {
                if (!value || value.trim().length === 0) {
                  return 'Project name is required';
                }
                if (value.trim().length < 3) {
                  return 'Name must be at least 3 characters';
                }
                return undefined;
              }}
            >
              {({ fieldProps, error }) => (
                <>
                  <Textfield
                    {...fieldProps}
                    placeholder="Enter project name"
                    autoComplete="off"
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                  <HelperMessage>
                    The display name for this project
                  </HelperMessage>
                </>
              )}
            </Field>

            {/* DESCRIPTION */}
            <Field
              name="description"
              label="Description"
              defaultValue={project.description}
            >
              {({ fieldProps }) => (
                <>
                  <TextArea
                    placeholder="Project description"
                    minimumRows={3}
                    value={fieldProps.value || ''}
                    onChange={(e) => fieldProps.onChange(e.target.value)}
                    onBlur={fieldProps.onBlur}
                  />
                  <HelperMessage>
                    A brief description of this project
                  </HelperMessage>
                </>
              )}
            </Field>

            {/* PROJECT LEAD */}
            <Field
              name="lead"
              label="Project lead"
              isRequired
              defaultValue={project.lead}
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
                    placeholder="Select project lead"
                    options={mockUsers}
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                  <HelperMessage>
                    The person responsible for this project
                  </HelperMessage>
                </>
              )}
            </Field>

            {/* PROJECT TYPE (READ-ONLY) */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Project type
              </label>
              <div style={{
                padding: '8px 12px',
                background: '#F4F5F7',
                border: '1px solid #DFE1E6',
                borderRadius: '3px',
                fontSize: '14px',
                color: '#172B4D',
              }}>
                {project.type.label}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
              }}>
                Project type cannot be changed after creation
              </div>
            </div>

            {/* CATEGORY */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#172B4D',
                display: 'block',
                marginBottom: '4px',
              }}>
                Category
              </label>
              <div style={{
                padding: '8px 12px',
                background: '#F4F5F7',
                border: '1px solid #DFE1E6',
                borderRadius: '3px',
                fontSize: '14px',
                color: '#172B4D',
              }}>
                {project.category}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
              }}>
                Project category
              </div>
            </div>

            {/* ACTIONS */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '24px',
            }}>
              <Button
                appearance="primary"
                type="submit"
                isDisabled={submitting || isSaving}
              >
                {(submitting || isSaving) ? 'Saving...' : 'Save changes'}
              </Button>
              <Button appearance="subtle">
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Form>
    </div>
  );
}

// ============================================
// ACCESS TAB
// ============================================

function AccessTab({ project }: { project: Project }) {
  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        padding: '24px',
      }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#172B4D',
          margin: '0 0 8px 0',
        }}>
          Project access
        </h2>
        <p style={{
          fontSize: '12px',
          color: '#5E6C84',
          margin: '0 0 16px 0',
        }}>
          Manage who can access this project and what they can do.
        </p>

        <SectionMessage appearance="information">
          <p style={{ fontSize: '12px', margin: 0 }}>
            Access management will be implemented in a future phase (Permissions & Security).
          </p>
        </SectionMessage>
      </div>
    </div>
  );
}

// ============================================
// NOTIFICATIONS TAB
// ============================================

function NotificationsTab({ project }: { project: Project }) {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [slackNotifications, setSlackNotifications] = useState(false);

  const handleSave = () => {
    toast.success('Notification settings saved');
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        padding: '24px',
      }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#172B4D',
          margin: '0 0 16px 0',
        }}>
          Notification settings
        </h2>

        {/* EMAIL NOTIFICATIONS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid #DFE1E6',
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              marginBottom: '4px',
            }}>
              Email notifications
            </div>
            <div style={{
              fontSize: '12px',
              color: '#5E6C84',
            }}>
              Receive email updates for project activities
            </div>
          </div>
          <Toggle
            isChecked={emailNotifications}
            onChange={() => setEmailNotifications(!emailNotifications)}
          />
        </div>

        {/* SLACK NOTIFICATIONS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              marginBottom: '4px',
            }}>
              Slack notifications
            </div>
            <div style={{
              fontSize: '12px',
              color: '#5E6C84',
            }}>
              Send notifications to Slack channels
            </div>
          </div>
          <Toggle
            isChecked={slackNotifications}
            onChange={() => setSlackNotifications(!slackNotifications)}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Button appearance="primary" onClick={handleSave}>
            Save notification settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// FEATURES TAB
// ============================================

function FeaturesTab({ project }: { project: Project }) {
  const [issueTypes, setIssueTypes] = useState(true);
  const [sprints, setSprints] = useState(true);
  const [releases, setReleases] = useState(true);

  const handleSave = () => {
    toast.success('Feature settings saved');
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        padding: '24px',
      }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#172B4D',
          margin: '0 0 16px 0',
        }}>
          Project features
        </h2>

        {/* ISSUE TYPES */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid #DFE1E6',
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              marginBottom: '4px',
            }}>
              Issue types
            </div>
            <div style={{
              fontSize: '12px',
              color: '#5E6C84',
            }}>
              Enable custom issue types for this project
            </div>
          </div>
          <Toggle
            isChecked={issueTypes}
            onChange={() => setIssueTypes(!issueTypes)}
          />
        </div>

        {/* SPRINTS */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
          borderBottom: '1px solid #DFE1E6',
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              marginBottom: '4px',
            }}>
              Sprints
            </div>
            <div style={{
              fontSize: '12px',
              color: '#5E6C84',
            }}>
              Enable sprint planning and tracking
            </div>
          </div>
          <Toggle
            isChecked={sprints}
            onChange={() => setSprints(!sprints)}
          />
        </div>

        {/* RELEASES */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 0',
        }}>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 500,
              color: '#172B4D',
              marginBottom: '4px',
            }}>
              Releases
            </div>
            <div style={{
              fontSize: '12px',
              color: '#5E6C84',
            }}>
              Enable release management
            </div>
          </div>
          <Toggle
            isChecked={releases}
            onChange={() => setReleases(!releases)}
          />
        </div>

        <div style={{ marginTop: '16px' }}>
          <Button appearance="primary" onClick={handleSave}>
            Save feature settings
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// ADVANCED TAB
// ============================================

function AdvancedTab({ project }: { project: Project }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState('');
  const navigate = useNavigate();

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this project?')) {
      toast.success('Project archived');
      navigate('/projects');
    }
  };

  const handleDelete = () => {
    if (deleteConfirmKey === project.key) {
      toast.success('Project deleted permanently');
      navigate('/projects');
    } else {
      toast.error('Project key does not match');
    }
  };

  return (
    <div style={{ maxWidth: '600px' }}>
      {/* ARCHIVE SECTION */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        padding: '24px',
        marginBottom: '16px',
      }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#172B4D',
          margin: '0 0 8px 0',
        }}>
          Archive project
        </h2>
        <p style={{
          fontSize: '12px',
          color: '#5E6C84',
          margin: '0 0 12px 0',
        }}>
          Archived projects are hidden from the project list but can be restored later.
        </p>
        <Button appearance="warning" onClick={handleArchive}>
          Archive project
        </Button>
      </div>

      {/* DELETE SECTION */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #DE350B',
        borderRadius: '3px',
        padding: '24px',
      }}>
        <h2 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#DE350B',
          margin: '0 0 8px 0',
        }}>
          Delete project
        </h2>
        <p style={{
          fontSize: '12px',
          color: '#5E6C84',
          margin: '0 0 12px 0',
        }}>
          Permanently delete this project and all its issues. This action cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <Button appearance="danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete project
          </Button>
        ) : (
          <div>
            <SectionMessage appearance="error" title="Confirm deletion">
              <p style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
                Type <strong>{project.key}</strong> to confirm deletion:
              </p>
              <Textfield 
                placeholder={project.key} 
                value={deleteConfirmKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmKey(e.target.value)}
              />
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
              }}>
                <Button 
                  appearance="danger" 
                  onClick={handleDelete}
                  isDisabled={deleteConfirmKey !== project.key}
                >
                  Delete permanently
                </Button>
                <Button
                  appearance="subtle"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmKey('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </SectionMessage>
          </div>
        )}
      </div>
    </div>
  );
}
