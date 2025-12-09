import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button';
import EmptyState from '@atlaskit/empty-state';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import EditFilledIcon from '@atlaskit/icon/glyph/edit-filled';
import DocumentIcon from '@atlaskit/icon/glyph/document';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import MoreIcon from '@atlaskit/icon/glyph/more';

interface MetricCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  sublabel: string;
}

function MetricCard({ icon, value, label, sublabel }: MetricCardProps) {
  return (
    <div style={{
      background: token('elevation.surface', '#FFFFFF'),
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: '3px',
      padding: token('space.200', '16px'),
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
        marginBottom: token('space.100', '8px'),
      }}>
        {icon}
        <div>
          <div style={{
            fontSize: '24px',
            fontWeight: 500,
            color: token('color.text', '#172B4D'),
          }}>
            {value}
          </div>
          <div style={{
            fontSize: '14px',
            color: token('color.text', '#172B4D'),
          }}>
            {label}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: '12px',
        color: token('color.text.subtlest', '#5E6C84'),
      }}>
        {sublabel}
      </div>
    </div>
  );
}

interface WidgetProps {
  title?: string;
  description?: string;
  link?: string;
  children: React.ReactNode;
}

function Widget({ title, description, link, children }: WidgetProps) {
  return (
    <div style={{
      background: token('elevation.surface', '#FFFFFF'),
      border: `1px solid ${token('color.border', '#DFE1E6')}`,
      borderRadius: '3px',
      padding: token('space.250', '20px'),
    }}>
      {title && (
        <div style={{ marginBottom: token('space.100', '8px') }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text', '#172B4D'),
            margin: `0 0 ${token('space.050', '4px')} 0`,
          }}>
            {title}
          </h3>
          {description && (
            <p style={{
              fontSize: '12px',
              color: token('color.text.subtlest', '#5E6C84'),
              margin: `0 0 ${token('space.050', '4px')} 0`,
            }}>
              {description}{' '}
              {link && (
                <a href="#" style={{
                  color: token('color.link', '#0052CC'),
                  textDecoration: 'none',
                }}>
                  {link}
                </a>
              )}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
}

interface ProjectSummaryPageProps {
  projectKey?: string;
  projectName?: string;
}

export default function ProjectSummaryPage() {
  const { projectKey: routeProjectKey } = useParams();
  const projectKey = routeProjectKey || 'ESS';
  const projectName = 'Enterprise Shared Services';
  const [selectedTab, setSelectedTab] = useState(0);

  const metrics = {
    completed: 0,
    updated: 0,
    created: 0,
    dueSoon: 0,
  };

  const statusData = [
    { name: 'New', value: 11, color: '#4C9AFF' },
    { name: 'QA Fail', value: 3, color: '#6554C0' },
    { name: 'UAT Testing', value: 9, color: '#FF991F' },
    { name: 'In Review', value: 3, color: '#FFAB00' },
    { name: 'In Progress', value: 4, color: '#0747A6' },
    { name: 'Done', value: 8, color: '#36B37E' },
  ];

  const priorityData = [
    { name: 'Highest', value: 2 },
    { name: 'High', value: 5 },
    { name: 'Medium', value: 20 },
    { name: 'Low', value: 18 },
    { name: 'Lowest', value: 3 },
    { name: 'None', value: 38 },
  ];

  const typesData = [
    { name: 'Story', value: 57, icon: '📗' },
    { name: 'Epic', value: 22, icon: '⚡' },
    { name: 'QA Bug', value: 8, icon: '🐛' },
    { name: 'Task', value: 7, icon: '☑️' },
    { name: 'Production Incident', value: 6, icon: '🚨' },
  ];

  const totalWorkItems = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{
      padding: `${token('space.300', '24px')} ${token('space.500', '40px')}`,
      background: token('elevation.surface.sunken', '#F4F5F7'),
      minHeight: '100vh',
    }}>
      {/* BREADCRUMBS */}
      <div style={{ marginBottom: token('space.150', '12px') }}>
        <Breadcrumbs>
          <BreadcrumbsItem href="/projects" text="Projects" />
          <BreadcrumbsItem text={projectName} />
        </Breadcrumbs>
      </div>

      {/* PROJECT HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150', '12px'),
        marginBottom: token('space.200', '16px'),
      }}>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 500,
          color: token('color.text', '#172B4D'),
          margin: 0,
        }}>
          {projectKey} Defects Kanban
        </h1>
        <Button 
          appearance="subtle" 
          iconBefore={<SettingsIcon label="Settings" size="small" />} 
        />
        <Button 
          appearance="subtle" 
          iconBefore={<MoreIcon label="More" size="small" />} 
        />
      </div>

      {/* TABS */}
      <Tabs id="project-tabs" selected={selectedTab} onChange={setSelectedTab}>
        <TabList>
          <Tab>Summary</Tab>
          <Tab>Kanban board</Tab>
          <Tab>List</Tab>
          <Tab>All work</Tab>
          <Tab>Releases</Tab>
          <Tab>Archived work items</Tab>
        </TabList>

        <TabPanel>
          {/* SUMMARY TAB CONTENT */}
          <div style={{ marginTop: token('space.300', '24px') }}>
            {/* METRICS ROW */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: token('space.200', '16px'),
              marginBottom: token('space.300', '24px'),
            }}>
              <MetricCard
                icon={<CheckCircleIcon label="Completed" size="medium" primaryColor={token('color.icon.success', '#36B37E')} />}
                value={metrics.completed}
                label="completed"
                sublabel="in the last 7 days"
              />
              <MetricCard
                icon={<EditFilledIcon label="Updated" size="medium" primaryColor={token('color.icon.discovery', '#6554C0')} />}
                value={metrics.updated}
                label="updated"
                sublabel="in the last 7 days"
              />
              <MetricCard
                icon={<DocumentIcon label="Created" size="medium" primaryColor={token('color.icon.brand', '#0052CC')} />}
                value={metrics.created}
                label="created"
                sublabel="in the last 7 days"
              />
              <MetricCard
                icon={<CalendarIcon label="Due soon" size="medium" primaryColor={token('color.icon.warning', '#FF991F')} />}
                value={metrics.dueSoon}
                label="due soon"
                sublabel="in the next 7 days"
              />
            </div>

            {/* WIDGETS - 2 COLUMNS */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: token('space.200', '16px'),
            }}>
              {/* LEFT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
                {/* STATUS OVERVIEW */}
                <Widget
                  title="Status overview"
                  description="Get a snapshot of the status of your work items."
                  link="View all work items"
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: token('space.500', '40px'),
                    padding: `${token('space.250', '20px')} 0`,
                  }}>
                    <div style={{ position: 'relative', width: '200px', height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                      }}>
                        <div style={{
                          fontSize: '32px',
                          fontWeight: 500,
                          color: token('color.text', '#172B4D'),
                        }}>
                          {totalWorkItems}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: token('color.text.subtlest', '#5E6C84'),
                        }}>
                          Total work item...
                        </div>
                      </div>
                    </div>

                    <div style={{ flex: 1 }}>
                      {statusData.map((item) => (
                        <div
                          key={item.name}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: token('space.100', '8px'),
                            marginBottom: token('space.100', '8px'),
                          }}
                        >
                          <div style={{
                            width: '12px',
                            height: '12px',
                            background: item.color,
                            borderRadius: '2px',
                          }} />
                          <span style={{
                            fontSize: '14px',
                            color: token('color.text', '#172B4D'),
                          }}>
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Widget>

                {/* PRIORITY BREAKDOWN */}
                <Widget
                  title="Priority breakdown"
                  description="Get a holistic view of how your work is being prioritized."
                  link="How to manage priorities for spaces"
                >
                  <div style={{ height: '250px', padding: `${token('space.250', '20px')} 0` }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={priorityData}>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: token('color.text.subtlest', '#5E6C84') }}
                          axisLine={{ stroke: token('color.border', '#DFE1E6') }}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: token('color.text.subtlest', '#5E6C84') }}
                          axisLine={{ stroke: token('color.border', '#DFE1E6') }}
                        />
                        <Bar dataKey="value" fill={token('color.background.neutral.bold', '#8993A4')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Widget>
              </div>

              {/* RIGHT COLUMN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
                {/* NO ACTIVITY */}
                <Widget title="">
                  <EmptyState
                    header="No activity yet"
                    description="Create a few work items and invite some teammates to your space to see your space activity."
                    primaryAction={<Button appearance="primary">Create work item</Button>}
                  />
                </Widget>

                {/* TYPES OF WORK */}
                <Widget
                  title="Types of work"
                  description="Get a breakdown of work items by their types."
                  link="View all items"
                >
                  <div style={{ padding: `${token('space.250', '20px')} 0` }}>
                    {typesData.map((type) => (
                      <div
                        key={type.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: token('space.150', '12px'),
                          marginBottom: token('space.150', '12px'),
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{type.icon}</span>
                        <span style={{
                          fontSize: '14px',
                          color: token('color.text', '#172B4D'),
                          width: '120px',
                        }}>
                          {type.name}
                        </span>
                        <div style={{
                          flex: 1,
                          height: '24px',
                          background: token('color.background.neutral', '#F4F5F7'),
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${type.value}%`,
                            height: '100%',
                            background: token('color.background.neutral.bold', '#8993A4'),
                            display: 'flex',
                            alignItems: 'center',
                            paddingLeft: token('space.100', '8px'),
                          }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: token('color.text.inverse', '#FFFFFF'),
                            }}>
                              {type.value}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Widget>
              </div>
            </div>
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ padding: token('space.300', '24px') }}>
            <EmptyState
              header="Kanban board"
              description="This tab will display the Kanban board view."
            />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ padding: token('space.300', '24px') }}>
            <EmptyState
              header="List view"
              description="This tab will display the list view."
            />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ padding: token('space.300', '24px') }}>
            <EmptyState
              header="All work"
              description="This tab will display all work items."
            />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ padding: token('space.300', '24px') }}>
            <EmptyState
              header="Releases"
              description="This tab will display releases."
            />
          </div>
        </TabPanel>

        <TabPanel>
          <div style={{ padding: token('space.300', '24px') }}>
            <EmptyState
              header="Archived work items"
              description="This tab will display archived work items."
            />
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
}
