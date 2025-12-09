import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import { Content, Main, PageLayout } from '@atlaskit/page-layout';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Form, { Field, ErrorMessage, HelperMessage } from '@atlaskit/form';
import Textfield from '@atlaskit/textfield';
import TextArea from '@atlaskit/textarea';
import Button from '@atlaskit/button';
import Select from '@atlaskit/select';
import SectionMessage from '@atlaskit/section-message';

interface Program {
  id: string;
  key: string;
  name: string;
  description: string;
  lead: {
    label: string;
    value: string;
  };
  type: {
    label: string;
    value: string;
  };
}

export default function ProgramSettingsPage({ programKey }: { programKey: string }) {
  const [program, setProgram] = useState<Program>(mockProgram);
  const [selectedTab, setSelectedTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveDetails = async (data: any) => {
    setIsSaving(true);
    try {
      // TODO: Call API to update program
      setProgram({
        ...program,
        name: data.name,
        description: data.description,
        lead: data.lead,
        type: data.type,
      });
    } catch (error) {
      console.error('Error updating program:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
                <BreadcrumbsItem href="/programs" text="Programs" />
                <BreadcrumbsItem href={`/programs/${programKey}`} text={program.name} />
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
                Program settings
              </h1>
              <p style={{
                fontSize: '12px',
                lineHeight: '16px',
                color: '#5E6C84',
                margin: 0,
              }}>
                Manage settings for {program.name}
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
                <Tab>Permissions</Tab>
                <Tab>Notifications</Tab>
                <Tab>Advanced</Tab>
              </TabList>

              {/* DETAILS TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <DetailsTab
                    program={program}
                    onSave={handleSaveDetails}
                    isSaving={isSaving}
                  />
                </div>
              </TabPanel>

              {/* PERMISSIONS TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <h2 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#172B4D',
                    margin: '0 0 12px 0',
                  }}>
                    Program permissions
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#5E6C84',
                  }}>
                    Permissions management will be implemented in Phase 10
                  </p>
                </div>
              </TabPanel>

              {/* NOTIFICATIONS TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <h2 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#172B4D',
                    margin: '0 0 12px 0',
                  }}>
                    Notification settings
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#5E6C84',
                  }}>
                    Notification settings will be implemented in Phase 10
                  </p>
                </div>
              </TabPanel>

              {/* ADVANCED TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <AdvancedTab program={program} />
                </div>
              </TabPanel>
            </Tabs>
          </div>
        </Main>
      </Content>
    </PageLayout>
  );
}

// ============================================
// DETAILS TAB
// ============================================

function DetailsTab({ program, onSave, isSaving }: any) {
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
        Program details
      </h2>

      <Form onSubmit={onSave}>
        {({ formProps, submitting }) => (
          <form {...formProps}>
            {/* PROGRAM KEY (READ-ONLY) */}
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
                {program.key}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#5E6C84',
                marginTop: '4px',
              }}>
                Program key cannot be changed
              </div>
            </div>

            {/* PROGRAM NAME */}
            <Field
              name="name"
              label="Name"
              isRequired
              defaultValue={program.name}
              validate={(value) => {
                if (!value || value.trim().length === 0) {
                  return 'Program name is required';
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
                    placeholder="Program name"
                    autoComplete="off"
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                  <HelperMessage>
                    The display name for this program
                  </HelperMessage>
                </>
              )}
            </Field>

            {/* DESCRIPTION */}
            <Field
              name="description"
              label="Description"
              defaultValue={program.description}
            >
              {({ fieldProps }) => (
                <>
                  <TextArea
                    {...fieldProps}
                    placeholder="Program description"
                    minimumRows={3}
                  />
                  <HelperMessage>
                    A brief description of this program
                  </HelperMessage>
                </>
              )}
            </Field>

            {/* PROGRAM LEAD */}
            <Field
              name="lead"
              label="Program lead"
              isRequired
              defaultValue={program.lead}
              validate={(value) => {
                if (!value) {
                  return 'Program lead is required';
                }
                return undefined;
              }}
            >
              {({ fieldProps, error }) => (
                <>
                  <Select
                    {...fieldProps}
                    inputId="program-lead"
                    placeholder="Select program lead"
                    options={mockUsers}
                  />
                  {error && <ErrorMessage>{error}</ErrorMessage>}
                  <HelperMessage>
                    The person responsible for this program
                  </HelperMessage>
                </>
              )}
            </Field>

            {/* PROGRAM TYPE */}
            <Field
              name="type"
              label="Program type"
              isRequired
              defaultValue={program.type}
            >
              {({ fieldProps }) => (
                <>
                  <Select
                    {...fieldProps}
                    inputId="program-type"
                    options={[
                      { label: 'Standard', value: 'standard' },
                      { label: 'Portfolio', value: 'portfolio' },
                      { label: 'Initiative', value: 'initiative' },
                    ]}
                  />
                  <HelperMessage>
                    The type of program structure
                  </HelperMessage>
                </>
              )}
            </Field>

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
                {submitting || isSaving ? 'Saving...' : 'Save changes'}
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
// ADVANCED TAB
// ============================================

function AdvancedTab({ program }: { program: Program }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleArchive = () => {
    if (confirm('Are you sure you want to archive this program?')) {
      // TODO: Call API to archive program
    }
  };

  const handleDelete = () => {
    if (program.key === 'DEFAULT') {
      alert('Cannot delete the Default program');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteConfirmText === program.key) {
      // TODO: Call API to delete program
      setShowDeleteConfirm(false);
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
          Archive program
        </h2>
        <p style={{
          fontSize: '12px',
          color: '#5E6C84',
          margin: '0 0 12px 0',
        }}>
          Archived programs are hidden from the program list but can be restored later.
        </p>
        <Button appearance="warning" onClick={handleArchive}>
          Archive program
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
          Delete program
        </h2>
        <p style={{
          fontSize: '12px',
          color: '#5E6C84',
          margin: '0 0 12px 0',
        }}>
          Permanently delete this program and all its epics. This action cannot be undone.
          {program.key === 'DEFAULT' && (
            <strong> The Default program cannot be deleted.</strong>
          )}
        </p>

        {!showDeleteConfirm ? (
          <Button
            appearance="danger"
            onClick={handleDelete}
            isDisabled={program.key === 'DEFAULT'}
          >
            Delete program
          </Button>
        ) : (
          <div>
            <SectionMessage appearance="error" title="Confirm deletion">
              <p style={{ fontSize: '12px', margin: '0 0 12px 0' }}>
                Type <strong>{program.key}</strong> to confirm deletion:
              </p>
              <Textfield 
                placeholder={program.key}
                value={deleteConfirmText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDeleteConfirmText(e.target.value)}
              />
              <div style={{
                display: 'flex',
                gap: '8px',
                marginTop: '12px',
              }}>
                <Button 
                  appearance="danger"
                  onClick={confirmDelete}
                  isDisabled={deleteConfirmText !== program.key}
                >
                  Delete permanently
                </Button>
                <Button
                  appearance="subtle"
                  onClick={() => setShowDeleteConfirm(false)}
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

// ============================================
// MOCK DATA
// ============================================

const mockProgram: Program = {
  id: '1',
  key: 'PROD',
  name: 'Product Program',
  description: 'Main product program with all product-related epics and features',
  lead: {
    label: 'John Doe',
    value: 'john-doe',
  },
  type: {
    label: 'Standard',
    value: 'standard',
  },
};

const mockUsers = [
  { label: 'John Doe', value: 'john-doe' },
  { label: 'Jane Smith', value: 'jane-smith' },
  { label: 'Bob Johnson', value: 'bob-johnson' },
  { label: 'Alice Brown', value: 'alice-brown' },
];
