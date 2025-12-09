import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { token } from '@atlaskit/tokens';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import { Checkbox } from '@atlaskit/checkbox';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import EmptyState from '@atlaskit/empty-state';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import CheckCircleIcon from '@atlaskit/icon/glyph/check-circle';
import EditFilledIcon from '@atlaskit/icon/glyph/edit-filled';
import DocumentIcon from '@atlaskit/icon/glyph/document';
import CalendarIcon from '@atlaskit/icon/glyph/calendar';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import MoreIcon from '@atlaskit/icon/glyph/more';
import SearchIcon from '@atlaskit/icon/glyph/search';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';

// ============================================
// HIERARCHICAL MOCK DATA
// ============================================

interface Subtask {
  key: string;
  summary: string;
  status: string;
  statusAppearance: 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';
  assignee: string;
  priority: string;
  created: string;
}

interface Story {
  key: string;
  summary: string;
  status: string;
  statusAppearance: 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';
  assignee: string;
  priority: string;
  created: string;
  subtasks: Subtask[];
}

interface Feature {
  key: string;
  summary: string;
  status: string;
  statusAppearance: 'default' | 'inprogress' | 'moved' | 'new' | 'removed' | 'success';
  assignee: string;
  priority: string;
  created: string;
  stories: Story[];
}

const mockHierarchicalData: Feature[] = [
  {
    key: 'FEAT-1',
    summary: 'User Authentication System',
    status: 'In Progress',
    statusAppearance: 'inprogress',
    assignee: 'John Doe',
    priority: 'High',
    created: 'Oct 22, 2024',
    stories: [
      {
        key: 'STORY-1',
        summary: 'Implement login page',
        status: 'Done',
        statusAppearance: 'success',
        assignee: 'Jane Smith',
        priority: 'High',
        created: 'Oct 23, 2024',
        subtasks: [
          {
            key: 'SUB-1',
            summary: 'Design login form',
            status: 'Done',
            statusAppearance: 'success',
            assignee: 'Jane Smith',
            priority: 'Medium',
            created: 'Oct 24, 2024',
          },
          {
            key: 'SUB-2',
            summary: 'Implement form validation',
            status: 'Done',
            statusAppearance: 'success',
            assignee: 'Jane Smith',
            priority: 'Medium',
            created: 'Oct 24, 2024',
          },
        ],
      },
      {
        key: 'STORY-2',
        summary: 'Add password reset functionality',
        status: 'In Progress',
        statusAppearance: 'inprogress',
        assignee: 'Bob Johnson',
        priority: 'Medium',
        created: 'Oct 25, 2024',
        subtasks: [
          {
            key: 'SUB-3',
            summary: 'Create reset password email template',
            status: 'To Do',
            statusAppearance: 'default',
            assignee: 'Bob Johnson',
            priority: 'Medium',
            created: 'Oct 26, 2024',
          },
        ],
      },
      {
        key: 'STORY-3',
        summary: 'Implement OAuth integration',
        status: 'To Do',
        statusAppearance: 'default',
        assignee: 'Alice Brown',
        priority: 'Low',
        created: 'Oct 27, 2024',
        subtasks: [],
      },
    ],
  },
  {
    key: 'FEAT-2',
    summary: 'Payment Gateway Integration',
    status: 'To Do',
    statusAppearance: 'default',
    assignee: 'Alice Brown',
    priority: 'High',
    created: 'Oct 20, 2024',
    stories: [
      {
        key: 'STORY-4',
        summary: 'Integrate Stripe API',
        status: 'To Do',
        statusAppearance: 'default',
        assignee: 'Alice Brown',
        priority: 'High',
        created: 'Oct 21, 2024',
        subtasks: [
          {
            key: 'SUB-4',
            summary: 'Set up Stripe account',
            status: 'To Do',
            statusAppearance: 'default',
            assignee: 'Alice Brown',
            priority: 'High',
            created: 'Oct 21, 2024',
          },
          {
            key: 'SUB-5',
            summary: 'Implement payment form',
            status: 'To Do',
            statusAppearance: 'default',
            assignee: 'Alice Brown',
            priority: 'High',
            created: 'Oct 21, 2024',
          },
        ],
      },
      {
        key: 'STORY-5',
        summary: 'Add PayPal support',
        status: 'To Do',
        statusAppearance: 'default',
        assignee: 'Charlie Wilson',
        priority: 'Medium',
        created: 'Oct 22, 2024',
        subtasks: [],
      },
    ],
  },
  {
    key: 'FEAT-3',
    summary: 'Dashboard Analytics Module',
    status: 'In Progress',
    statusAppearance: 'inprogress',
    assignee: 'David Lee',
    priority: 'Medium',
    created: 'Oct 18, 2024',
    stories: [
      {
        key: 'STORY-6',
        summary: 'Create chart components',
        status: 'Done',
        statusAppearance: 'success',
        assignee: 'David Lee',
        priority: 'Medium',
        created: 'Oct 19, 2024',
        subtasks: [
          {
            key: 'SUB-6',
            summary: 'Bar chart component',
            status: 'Done',
            statusAppearance: 'success',
            assignee: 'David Lee',
            priority: 'Medium',
            created: 'Oct 19, 2024',
          },
          {
            key: 'SUB-7',
            summary: 'Pie chart component',
            status: 'Done',
            statusAppearance: 'success',
            assignee: 'David Lee',
            priority: 'Medium',
            created: 'Oct 19, 2024',
          },
        ],
      },
      {
        key: 'STORY-7',
        summary: 'Implement data fetching',
        status: 'In Progress',
        statusAppearance: 'inprogress',
        assignee: 'Emma Garcia',
        priority: 'High',
        created: 'Oct 20, 2024',
        subtasks: [],
      },
    ],
  },
];

// ============================================
// HELPER COMPONENTS
// ============================================

interface MetricCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  sublabel: string;
}

function MetricCard({ icon, value, label, sublabel }: MetricCardProps) {
  return (
    <div style={{
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: '3px',
      padding: token('space.200'),
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150'),
        marginBottom: token('space.100'),
      }}>
        {icon}
        <div>
          <div style={{
            fontSize: '24px',
            fontWeight: 500,
            color: token('color.text'),
          }}>
            {value}
          </div>
          <div style={{
            fontSize: '14px',
            color: token('color.text'),
          }}>
            {label}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: '12px',
        color: token('color.text.subtlest'),
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
      background: token('elevation.surface'),
      border: `1px solid ${token('color.border')}`,
      borderRadius: '3px',
      padding: token('space.250'),
    }}>
      {title && (
        <div style={{ marginBottom: token('space.100') }}>
          <h3 style={{
            fontSize: '14px',
            fontWeight: 600,
            color: token('color.text'),
            margin: `0 0 ${token('space.050')} 0`,
          }}>
            {title}
          </h3>
          {description && (
            <p style={{
              fontSize: '12px',
              color: token('color.text.subtlest'),
              margin: `0 0 ${token('space.050')} 0`,
            }}>
              {description}{' '}
              {link && (
                <a href="#" style={{
                  color: token('color.link'),
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

// ============================================
// SUMMARY VIEW
// ============================================

function SummaryView() {
  const metrics = {
    completed: 4,
    updated: 8,
    created: 12,
    dueSoon: 3,
  };

  const statusData = [
    { name: 'To Do', value: 8, color: '#4C9AFF' },
    { name: 'In Progress', value: 5, color: '#0747A6' },
    { name: 'Done', value: 4, color: '#36B37E' },
  ];

  const priorityData = [
    { name: 'High', value: 5 },
    { name: 'Medium', value: 7 },
    { name: 'Low', value: 5 },
  ];

  const typesData = [
    { name: 'Feature', value: 18, icon: '📦' },
    { name: 'Story', value: 41, icon: '📗' },
    { name: 'Subtask', value: 41, icon: '☑️' },
  ];

  const totalWorkItems = statusData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={{ marginTop: token('space.300') }}>
      {/* METRICS ROW */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: token('space.200'),
        marginBottom: token('space.300'),
      }}>
        <MetricCard
          icon={<CheckCircleIcon label="Completed" size="medium" primaryColor={token('color.icon.success')} />}
          value={metrics.completed}
          label="completed"
          sublabel="in the last 7 days"
        />
        <MetricCard
          icon={<EditFilledIcon label="Updated" size="medium" primaryColor={token('color.icon.discovery')} />}
          value={metrics.updated}
          label="updated"
          sublabel="in the last 7 days"
        />
        <MetricCard
          icon={<DocumentIcon label="Created" size="medium" primaryColor={token('color.icon.brand')} />}
          value={metrics.created}
          label="created"
          sublabel="in the last 7 days"
        />
        <MetricCard
          icon={<CalendarIcon label="Due soon" size="medium" primaryColor={token('color.icon.warning')} />}
          value={metrics.dueSoon}
          label="due soon"
          sublabel="in the next 7 days"
        />
      </div>

      {/* WIDGETS - 2 COLUMNS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: token('space.200'),
      }}>
        {/* STATUS OVERVIEW */}
        <Widget
          title="Status overview"
          description="Get a snapshot of the status of your work items."
          link="View all work items"
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: token('space.500'),
            padding: `${token('space.250')} 0`,
          }}>
            <div style={{ position: 'relative', width: '180px', height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
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
                  fontSize: '28px',
                  fontWeight: 500,
                  color: token('color.text'),
                }}>
                  {totalWorkItems}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: token('color.text.subtlest'),
                }}>
                  Total items
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
                    gap: token('space.100'),
                    marginBottom: token('space.100'),
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
                    color: token('color.text'),
                  }}>
                    {item.name}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        {/* TYPES OF WORK */}
        <Widget
          title="Types of work"
          description="Get a breakdown of work items by their types."
          link="View all items"
        >
          <div style={{ padding: `${token('space.200')} 0` }}>
            {typesData.map((type) => (
              <div
                key={type.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: token('space.150'),
                  marginBottom: token('space.150'),
                }}
              >
                <span style={{ fontSize: '16px' }}>{type.icon}</span>
                <span style={{
                  fontSize: '14px',
                  color: token('color.text'),
                  width: '80px',
                }}>
                  {type.name}
                </span>
                <div style={{
                  flex: 1,
                  height: '24px',
                  background: token('color.background.neutral'),
                  borderRadius: '3px',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    width: `${type.value}%`,
                    height: '100%',
                    background: token('color.background.neutral.bold'),
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: token('space.100'),
                  }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      color: token('color.text.inverse'),
                    }}>
                      {type.value}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Widget>

        {/* PRIORITY BREAKDOWN */}
        <Widget
          title="Priority breakdown"
          description="Get a holistic view of how your work is being prioritized."
        >
          <div style={{ height: '200px', padding: `${token('space.200')} 0` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: token('color.text.subtlest') }}
                  axisLine={{ stroke: token('color.border') }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: token('color.text.subtlest') }}
                  axisLine={{ stroke: token('color.border') }}
                />
                <Bar dataKey="value" fill={token('color.background.neutral.bold')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Widget>

        {/* ACTIVITY */}
        <Widget title="Recent activity">
          <EmptyState
            header="No recent activity"
            description="Activity will appear here as work progresses."
          />
        </Widget>
      </div>
    </div>
  );
}

// ============================================
// LIST VIEW - HIERARCHICAL TABLE
// ============================================

function ListView() {
  const [expandedFeatures, setExpandedFeatures] = useState<string[]>(['FEAT-1', 'FEAT-3']);
  const [expandedStories, setExpandedStories] = useState<string[]>(['STORY-1', 'STORY-6']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleFeature = (key: string) => {
    setExpandedFeatures(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleStory = (key: string) => {
    setExpandedStories(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const head = {
    cells: [
      { key: 'checkbox', content: <Checkbox />, width: 3 },
      { key: 'type', content: 'Type', width: 5 },
      { key: 'key', content: 'Key', isSortable: true, width: 10 },
      { key: 'summary', content: 'Summary', isSortable: true, width: 35 },
      { key: 'status', content: 'Status', isSortable: true, width: 12 },
      { key: 'assignee', content: 'Assignee', width: 12 },
      { key: 'priority', content: 'Priority', width: 10 },
      { key: 'created', content: 'Created', isSortable: true, width: 10 },
      { key: 'actions', content: '', width: 3 },
    ],
  };

  const rows: any[] = [];

  mockHierarchicalData.forEach((feature) => {
    const isFeatureExpanded = expandedFeatures.includes(feature.key);

    // Feature row
    rows.push({
      key: feature.key,
      cells: [
        { key: 'checkbox', content: <Checkbox /> },
        { key: 'type', content: <span style={{ fontSize: '16px' }}>📦</span> },
        {
          key: 'key',
          content: (
            <a href={`/browse/${feature.key}`} style={{
              fontSize: '14px',
              fontWeight: 500,
              color: token('color.link'),
              textDecoration: 'none',
            }}>
              {feature.key}
            </a>
          ),
        },
        {
          key: 'summary',
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100') }}>
              <button
                onClick={() => toggleFeature(feature.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {isFeatureExpanded ? (
                  <ChevronDownIcon label="Collapse" size="small" primaryColor={token('color.icon')} />
                ) : (
                  <ChevronRightIcon label="Expand" size="small" primaryColor={token('color.icon')} />
                )}
              </button>
              <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text') }}>
                {feature.summary}
              </span>
            </div>
          ),
        },
        { key: 'status', content: <Lozenge appearance={feature.statusAppearance}>{feature.status}</Lozenge> },
        { key: 'assignee', content: <Avatar size="small" name={feature.assignee} /> },
        { key: 'priority', content: <span style={{ fontSize: '14px', color: token('color.text') }}>{feature.priority}</span> },
        { key: 'created', content: <span style={{ fontSize: '14px', color: token('color.text.subtlest') }}>{feature.created}</span> },
        {
          key: 'actions',
          content: (
            <DropdownMenu trigger={({ triggerRef, ...props }) => (
              <Button {...props} ref={triggerRef} appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
            )}>
              <DropdownItemGroup>
                <DropdownItem>Edit</DropdownItem>
                <DropdownItem>Delete</DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          ),
        },
      ],
    });

    // Stories under feature
    if (isFeatureExpanded) {
      feature.stories.forEach((story) => {
        const isStoryExpanded = expandedStories.includes(story.key);
        const hasSubtasks = story.subtasks.length > 0;

        rows.push({
          key: story.key,
          cells: [
            { key: 'checkbox', content: <Checkbox /> },
            { key: 'type', content: <span style={{ fontSize: '16px', marginLeft: '20px' }}>📗</span> },
            {
              key: 'key',
              content: (
                <a href={`/browse/${story.key}`} style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: token('color.link'),
                  textDecoration: 'none',
                }}>
                  {story.key}
                </a>
              ),
            },
            {
              key: 'summary',
              content: (
                <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100'), marginLeft: '20px' }}>
                  {hasSubtasks && (
                    <button
                      onClick={() => toggleStory(story.key)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                      }}
                    >
                      {isStoryExpanded ? (
                        <ChevronDownIcon label="Collapse" size="small" primaryColor={token('color.icon')} />
                      ) : (
                        <ChevronRightIcon label="Expand" size="small" primaryColor={token('color.icon')} />
                      )}
                    </button>
                  )}
                  <span style={{ fontSize: '14px', color: token('color.text') }}>
                    {story.summary}
                  </span>
                </div>
              ),
            },
            { key: 'status', content: <Lozenge appearance={story.statusAppearance}>{story.status}</Lozenge> },
            { key: 'assignee', content: <Avatar size="small" name={story.assignee} /> },
            { key: 'priority', content: <span style={{ fontSize: '14px', color: token('color.text') }}>{story.priority}</span> },
            { key: 'created', content: <span style={{ fontSize: '14px', color: token('color.text.subtlest') }}>{story.created}</span> },
            {
              key: 'actions',
              content: (
                <DropdownMenu trigger={({ triggerRef, ...props }) => (
                  <Button {...props} ref={triggerRef} appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
                )}>
                  <DropdownItemGroup>
                    <DropdownItem>Edit</DropdownItem>
                    <DropdownItem>Delete</DropdownItem>
                  </DropdownItemGroup>
                </DropdownMenu>
              ),
            },
          ],
        });

        // Subtasks under story
        if (isStoryExpanded && hasSubtasks) {
          story.subtasks.forEach((subtask) => {
            rows.push({
              key: subtask.key,
              cells: [
                { key: 'checkbox', content: <Checkbox /> },
                { key: 'type', content: <span style={{ fontSize: '16px', marginLeft: '40px' }}>☑️</span> },
                {
                  key: 'key',
                  content: (
                    <a href={`/browse/${subtask.key}`} style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: token('color.link'),
                      textDecoration: 'none',
                    }}>
                      {subtask.key}
                    </a>
                  ),
                },
                {
                  key: 'summary',
                  content: (
                    <span style={{ fontSize: '14px', color: token('color.text'), marginLeft: '40px' }}>
                      {subtask.summary}
                    </span>
                  ),
                },
                { key: 'status', content: <Lozenge appearance={subtask.statusAppearance}>{subtask.status}</Lozenge> },
                { key: 'assignee', content: <Avatar size="small" name={subtask.assignee} /> },
                { key: 'priority', content: <span style={{ fontSize: '14px', color: token('color.text') }}>{subtask.priority}</span> },
                { key: 'created', content: <span style={{ fontSize: '14px', color: token('color.text.subtlest') }}>{subtask.created}</span> },
                {
                  key: 'actions',
                  content: (
                    <DropdownMenu trigger={({ triggerRef, ...props }) => (
                      <Button {...props} ref={triggerRef} appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
                    )}>
                      <DropdownItemGroup>
                        <DropdownItem>Edit</DropdownItem>
                        <DropdownItem>Delete</DropdownItem>
                      </DropdownItemGroup>
                    </DropdownMenu>
                  ),
                },
              ],
            });
          });
        }
      });
    }
  });

  return (
    <div style={{ marginTop: token('space.200') }}>
      {/* TOOLBAR */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100'),
        marginBottom: token('space.200'),
      }}>
        <div style={{ maxWidth: '280px' }}>
          <Textfield
            placeholder="Search..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            elemBeforeInput={
              <div style={{ paddingLeft: token('space.100') }}>
                <SearchIcon label="Search" size="small" primaryColor={token('color.icon.subtle')} />
              </div>
            }
          />
        </div>
        <Button appearance="subtle" iconBefore={<FilterIcon label="Filter" size="small" />}>
          Filter
        </Button>
      </div>

      {/* TABLE */}
      <DynamicTable
        head={head}
        rows={rows}
        rowsPerPage={50}
        defaultPage={1}
        isFixedSize
      />
    </div>
  );
}

// ============================================
// KANBAN VIEW
// ============================================

function KanbanView() {
  const columns = [
    { id: 'todo', name: 'To Do', items: mockHierarchicalData.filter(f => f.status === 'To Do') },
    { id: 'inprogress', name: 'In Progress', items: mockHierarchicalData.filter(f => f.status === 'In Progress') },
    { id: 'done', name: 'Done', items: [] },
  ];

  return (
    <div style={{
      marginTop: token('space.200'),
      display: 'flex',
      gap: token('space.200'),
      overflowX: 'auto',
      paddingBottom: token('space.200'),
    }}>
      {columns.map((column) => (
        <div
          key={column.id}
          style={{
            minWidth: '280px',
            maxWidth: '280px',
            background: token('color.background.neutral'),
            borderRadius: '3px',
            padding: token('space.100'),
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: token('space.100'),
            marginBottom: token('space.100'),
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: 600,
              color: token('color.text.subtlest'),
              textTransform: 'uppercase',
            }}>
              {column.name}
            </span>
            <span style={{
              fontSize: '12px',
              color: token('color.text.subtlest'),
            }}>
              {column.items.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.100') }}>
            {column.items.map((item) => (
              <div
                key={item.key}
                style={{
                  background: token('elevation.surface'),
                  border: `1px solid ${token('color.border')}`,
                  borderRadius: '3px',
                  padding: token('space.150'),
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  fontSize: '14px',
                  color: token('color.text'),
                  marginBottom: token('space.100'),
                }}>
                  {item.summary}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <a href={`/browse/${item.key}`} style={{
                    fontSize: '12px',
                    color: token('color.link'),
                    textDecoration: 'none',
                  }}>
                    {item.key}
                  </a>
                  <Avatar size="xsmall" name={item.assignee} />
                </div>
              </div>
            ))}

            {column.items.length === 0 && (
              <div style={{
                padding: token('space.200'),
                textAlign: 'center',
                fontSize: '12px',
                color: token('color.text.subtlest'),
              }}>
                No items
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function ProjectSummaryPage() {
  const { projectKey: routeProjectKey } = useParams();
  const projectKey = routeProjectKey || 'TEST';
  const projectName = 'Test Project';
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div style={{
      padding: `${token('space.300')} ${token('space.400')}`,
      background: token('elevation.surface.sunken'),
      minHeight: '100vh',
    }}>
      {/* BREADCRUMBS */}
      <div style={{ marginBottom: token('space.150') }}>
        <Breadcrumbs>
          <BreadcrumbsItem href="/projects" text="Projects" />
          <BreadcrumbsItem text={projectName} />
        </Breadcrumbs>
      </div>

      {/* PROJECT HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.150'),
        marginBottom: token('space.200'),
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: token('color.background.discovery'),
          borderRadius: '3px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
        }}>
          📊
        </div>
        <h1 style={{
          fontSize: '20px',
          fontWeight: 500,
          color: token('color.text'),
          margin: 0,
        }}>
          {projectName}
        </h1>
        <span style={{
          fontSize: '14px',
          color: token('color.text.subtlest'),
        }}>
          {projectKey}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: token('space.100') }}>
          <Button appearance="subtle" iconBefore={<SettingsIcon label="Settings" size="small" />} />
          <Button appearance="subtle" iconBefore={<MoreIcon label="More" size="small" />} />
        </div>
      </div>

      {/* TABS - 4 TABS ONLY */}
      <Tabs id="project-tabs" selected={selectedTab} onChange={setSelectedTab}>
        <TabList>
          <Tab>Summary</Tab>
          <Tab>List</Tab>
          <Tab>Kanban board</Tab>
          <Tab>All work</Tab>
        </TabList>

        <TabPanel>
          <SummaryView />
        </TabPanel>

        <TabPanel>
          <ListView />
        </TabPanel>

        <TabPanel>
          <KanbanView />
        </TabPanel>

        <TabPanel>
          <ListView />
        </TabPanel>
      </Tabs>
    </div>
  );
}
