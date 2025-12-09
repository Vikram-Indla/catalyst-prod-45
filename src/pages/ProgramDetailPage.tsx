import React, { useState } from 'react';
import { Content, Main, PageLayout } from '@atlaskit/page-layout';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Button from '@atlaskit/button';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Avatar from '@atlaskit/avatar';
import Lozenge from '@atlaskit/lozenge';
import Tooltip from '@atlaskit/tooltip';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import AddIcon from '@atlaskit/icon/glyph/add';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import StarIcon from '@atlaskit/icon/glyph/star';
import StarFilledIcon from '@atlaskit/icon/glyph/star-filled';

interface Program {
  id: string;
  key: string;
  name: string;
  description: string;
  lead: {
    name: string;
    avatar?: string;
  };
  projectCount: number;
  epicCount: number;
  isDefault: boolean;
  isStarred: boolean;
}

interface Epic {
  id: string;
  key: string;
  summary: string;
  status: string;
  priority: 'highest' | 'high' | 'medium' | 'low' | 'lowest';
  assignee: {
    name: string;
    avatar?: string;
  } | null;
  linkedIssues: number;
  progress: number;
}

export default function ProgramDetailPage({ programKey }: { programKey: string }) {
  const [program, setProgram] = useState<Program>(mockProgram);
  const [epics] = useState<Epic[]>(mockEpics);
  const [selectedTab, setSelectedTab] = useState(0);

  const toggleStar = () => {
    setProgram({ ...program, isStarred: !program.isStarred });
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
                <BreadcrumbsItem text={program.name} />
              </Breadcrumbs>
            </div>

            {/* PROGRAM HEADER */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '24px',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '4px',
                }}>
                  <h1 style={{
                    fontSize: '20px',
                    fontWeight: 500,
                    lineHeight: '24px',
                    color: '#172B4D',
                    margin: 0,
                  }}>
                    {program.name}
                  </h1>
                  {program.isDefault && (
                    <Lozenge appearance="default">Default</Lozenge>
                  )}
                </div>

                <p style={{
                  fontSize: '11px',
                  lineHeight: '16px',
                  color: '#5E6C84',
                  margin: '0 0 6px 0',
                }}>
                  {program.key}
                </p>

                {program.description && (
                  <p style={{
                    fontSize: '14px',
                    lineHeight: '20px',
                    color: '#172B4D',
                    margin: '0 0 8px 0',
                  }}>
                    {program.description}
                  </p>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  fontSize: '11px',
                  color: '#5E6C84',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Lead:</span>
                    <Avatar
                      size="xsmall"
                      src={program.lead.avatar}
                      name={program.lead.name}
                    />
                    <span>{program.lead.name}</span>
                  </div>
                  <span>•</span>
                  <span>{program.projectCount} projects</span>
                  <span>•</span>
                  <span>{program.epicCount} epics</span>
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <Button
                  appearance="subtle"
                  iconBefore={
                    program.isStarred ? (
                      <StarFilledIcon 
                        label="Starred" 
                        size="small" 
                        primaryColor="#FFAB00"
                      />
                    ) : (
                      <StarIcon 
                        label="Star" 
                        size="small"
                      />
                    )
                  }
                  onClick={toggleStar}
                >
                  {program.isStarred ? 'Starred' : 'Star'}
                </Button>

                <Button
                  appearance="subtle"
                  iconBefore={<SettingsIcon label="Settings" size="small" />}
                  href={`/programs/${programKey}/settings`}
                >
                  Settings
                </Button>

                <DropdownMenu
                  trigger={({ triggerRef, ...props }) => (
                    <Button
                      {...props}
                      ref={triggerRef}
                      appearance="subtle"
                      iconBefore={<MoreIcon label="More" size="small" />}
                    />
                  )}
                >
                  <DropdownItemGroup>
                    <DropdownItem>Edit program</DropdownItem>
                    <DropdownItem>Archive program</DropdownItem>
                    <DropdownItem>Delete program</DropdownItem>
                  </DropdownItemGroup>
                </DropdownMenu>
              </div>
            </div>

            {/* TABS */}
            <Tabs
              onChange={(index) => setSelectedTab(index)}
              selected={selectedTab}
              id="program-tabs"
            >
              <TabList>
                <Tab>Epics ({epics.length})</Tab>
                <Tab>Projects ({program.projectCount})</Tab>
                <Tab>Settings</Tab>
              </TabList>

              {/* EPICS TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}>
                    <h2 style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#172B4D',
                      margin: 0,
                    }}>
                      Epics in this program
                    </h2>
                    <Button
                      appearance="primary"
                      iconBefore={<AddIcon label="Create" size="small" />}
                    >
                      Create epic
                    </Button>
                  </div>

                  <EpicsList epics={epics} programKey={programKey} />
                </div>
              </TabPanel>

              {/* PROJECTS TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <h2 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#172B4D',
                    margin: '0 0 12px 0',
                  }}>
                    Projects in this program
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#5E6C84',
                  }}>
                    Projects list will be implemented in Phase 3
                  </p>
                </div>
              </TabPanel>

              {/* SETTINGS TAB */}
              <TabPanel>
                <div style={{ marginTop: '16px' }}>
                  <h2 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#172B4D',
                    margin: '0 0 12px 0',
                  }}>
                    Program settings
                  </h2>
                  <p style={{
                    fontSize: '12px',
                    color: '#5E6C84',
                  }}>
                    Settings will be implemented in Phase 2.4
                  </p>
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
// EPICS LIST COMPONENT
// ============================================

function EpicsList({ epics, programKey }: { epics: Epic[]; programKey: string }) {
  if (epics.length === 0) {
    return (
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #DFE1E6',
        borderRadius: '3px',
        padding: '32px',
        textAlign: 'center',
      }}>
        <p style={{
          fontSize: '14px',
          color: '#5E6C84',
          margin: '0 0 12px 0',
        }}>
          No epics in this program yet
        </p>
        <Button appearance="primary">
          Create your first epic
        </Button>
      </div>
    );
  }

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #DFE1E6',
      borderRadius: '3px',
      overflow: 'hidden',
    }}>
      {epics.map((epic, index) => (
        <EpicListItem
          key={epic.id}
          epic={epic}
          programKey={programKey}
          isLast={index === epics.length - 1}
        />
      ))}
    </div>
  );
}

// ============================================
// EPIC LIST ITEM
// ============================================

function EpicListItem({ epic, programKey, isLast }: { epic: Epic; programKey: string; isLast: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      highest: '#DE350B',
      high: '#FF5630',
      medium: '#FF991F',
      low: '#36B37E',
      lowest: '#00875A',
    };
    return colors[priority] || '#6B778C';
  };

  return (
    <a
      href={`/programs/${programKey}/epics/${epic.key}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 12px',
        background: isHovered ? '#F4F5F7' : 'transparent',
        borderBottom: isLast ? 'none' : '1px solid #DFE1E6',
        textDecoration: 'none',
        transition: 'background 150ms',
      }}
    >
      {/* PRIORITY INDICATOR */}
      <div style={{
        width: '4px',
        height: '24px',
        background: getPriorityColor(epic.priority),
        borderRadius: '2px',
        flexShrink: 0,
      }} />

      {/* EPIC INFO */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '2px',
        }}>
          <span style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#0052CC',
          }}>
            {epic.key}
          </span>
          <Lozenge appearance="default">{epic.status}</Lozenge>
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 500,
          lineHeight: '20px',
          color: '#172B4D',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {epic.summary}
        </div>
      </div>

      {/* METADATA */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: '11px',
          color: '#5E6C84',
        }}>
          {epic.linkedIssues} linked issues
        </div>

        <div style={{
          width: '60px',
          height: '6px',
          background: '#DFE1E6',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${epic.progress}%`,
            height: '100%',
            background: '#36B37E',
            transition: 'width 300ms',
          }} />
        </div>

        <div style={{
          fontSize: '11px',
          color: '#5E6C84',
          width: '32px',
          textAlign: 'right',
        }}>
          {epic.progress}%
        </div>

        {epic.assignee && (
          <Tooltip content={epic.assignee.name}>
            <Avatar
              size="xsmall"
              src={epic.assignee.avatar}
              name={epic.assignee.name}
            />
          </Tooltip>
        )}
      </div>
    </a>
  );
}

// ============================================
// MOCK DATA
// ============================================

const mockProgram: Program = {
  id: '1',
  key: 'PROD',
  name: 'Product Program',
  description: 'Main product development program with all product-related epics and features',
  lead: {
    name: 'John Doe',
    avatar: undefined,
  },
  projectCount: 5,
  epicCount: 12,
  isDefault: false,
  isStarred: false,
};

const mockEpics: Epic[] = [
  {
    id: '1',
    key: 'PROD-1',
    summary: 'User Authentication & Authorization System',
    status: 'In Progress',
    priority: 'highest',
    assignee: {
      name: 'John Doe',
      avatar: undefined,
    },
    linkedIssues: 24,
    progress: 65,
  },
  {
    id: '2',
    key: 'PROD-2',
    summary: 'Payment Gateway Integration',
    status: 'To Do',
    priority: 'high',
    assignee: {
      name: 'Jane Smith',
      avatar: undefined,
    },
    linkedIssues: 18,
    progress: 30,
  },
  {
    id: '3',
    key: 'PROD-3',
    summary: 'Mobile App Development',
    status: 'In Progress',
    priority: 'medium',
    assignee: null,
    linkedIssues: 42,
    progress: 45,
  },
];
