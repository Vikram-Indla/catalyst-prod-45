import React, { useState, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import DynamicTable from '@atlaskit/dynamic-table';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import Textfield from '@atlaskit/textfield';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Checkbox } from '@atlaskit/checkbox';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import SearchIcon from '@atlaskit/icon/glyph/search';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import MoreIcon from '@atlaskit/icon/glyph/more';

// Types
type ItemType = 'feature' | 'story' | 'subtask';
type StatusType = 'todo' | 'inprogress' | 'done';
type PriorityType = 'high' | 'medium' | 'low';

interface WorkItem {
  id: string;
  key: string;
  type: ItemType;
  summary: string;
  status: StatusType;
  assignee: { name: string; avatarUrl: string };
  priority: PriorityType;
  created: string;
  children?: WorkItem[];
}

// Mock Data
const mockData: WorkItem[] = [
  {
    id: '1',
    key: 'FEAT-1',
    type: 'feature',
    summary: 'User Authentication System',
    status: 'inprogress',
    assignee: { name: 'John Doe', avatarUrl: 'https://i.pravatar.cc/32?u=john' },
    priority: 'high',
    created: 'Oct 22, 2024',
    children: [
      {
        id: '2',
        key: 'STORY-1',
        type: 'story',
        summary: 'Implement login page',
        status: 'done',
        assignee: { name: 'Jane Smith', avatarUrl: 'https://i.pravatar.cc/32?u=jane' },
        priority: 'high',
        created: 'Oct 23, 2024',
        children: [
          {
            id: '3',
            key: 'SUB-1',
            type: 'subtask',
            summary: 'Design login form',
            status: 'done',
            assignee: { name: 'Mike Johnson', avatarUrl: 'https://i.pravatar.cc/32?u=mike' },
            priority: 'medium',
            created: 'Oct 24, 2024',
          },
          {
            id: '4',
            key: 'SUB-2',
            type: 'subtask',
            summary: 'Implement form validation',
            status: 'done',
            assignee: { name: 'Sarah Wilson', avatarUrl: 'https://i.pravatar.cc/32?u=sarah' },
            priority: 'medium',
            created: 'Oct 24, 2024',
          },
        ],
      },
      {
        id: '5',
        key: 'STORY-2',
        type: 'story',
        summary: 'Add password reset functionality',
        status: 'inprogress',
        assignee: { name: 'John Doe', avatarUrl: 'https://i.pravatar.cc/32?u=john' },
        priority: 'medium',
        created: 'Oct 25, 2024',
      },
    ],
  },
  {
    id: '6',
    key: 'FEAT-2',
    type: 'feature',
    summary: 'Payment Gateway Integration',
    status: 'todo',
    assignee: { name: 'Emily Brown', avatarUrl: 'https://i.pravatar.cc/32?u=emily' },
    priority: 'high',
    created: 'Oct 20, 2024',
    children: [
      {
        id: '7',
        key: 'STORY-3',
        type: 'story',
        summary: 'Implement OAuth integration',
        status: 'todo',
        assignee: { name: 'David Lee', avatarUrl: 'https://i.pravatar.cc/32?u=david' },
        priority: 'low',
        created: 'Oct 27, 2024',
      },
    ],
  },
  {
    id: '8',
    key: 'FEAT-3',
    type: 'feature',
    summary: 'Dashboard Analytics Module',
    status: 'inprogress',
    assignee: { name: 'Anna Taylor', avatarUrl: 'https://i.pravatar.cc/32?u=anna' },
    priority: 'medium',
    created: 'Oct 18, 2024',
    children: [
      {
        id: '9',
        key: 'STORY-6',
        type: 'story',
        summary: 'Create chart components',
        status: 'done',
        assignee: { name: 'Chris Martin', avatarUrl: 'https://i.pravatar.cc/32?u=chris' },
        priority: 'medium',
        created: 'Oct 19, 2024',
        children: [
          {
            id: '10',
            key: 'SUB-6',
            type: 'subtask',
            summary: 'Bar chart component',
            status: 'done',
            assignee: { name: 'Lisa Anderson', avatarUrl: 'https://i.pravatar.cc/32?u=lisa' },
            priority: 'medium',
            created: 'Oct 19, 2024',
          },
          {
            id: '11',
            key: 'SUB-7',
            type: 'subtask',
            summary: 'Pie chart component',
            status: 'done',
            assignee: { name: 'Tom Harris', avatarUrl: 'https://i.pravatar.cc/32?u=tom' },
            priority: 'medium',
            created: 'Oct 19, 2024',
          },
        ],
      },
      {
        id: '12',
        key: 'STORY-7',
        type: 'story',
        summary: 'Implement data fetching',
        status: 'inprogress',
        assignee: { name: 'Nancy White', avatarUrl: 'https://i.pravatar.cc/32?u=nancy' },
        priority: 'high',
        created: 'Oct 20, 2024',
      },
    ],
  },
];

// Helper functions
const getTypeIcon = (type: ItemType): string => {
  switch (type) {
    case 'feature': return '📦';
    case 'story': return '📗';
    case 'subtask': return '☑️';
  }
};

const getStatusAppearance = (status: StatusType): 'inprogress' | 'success' | 'default' => {
  switch (status) {
    case 'inprogress': return 'inprogress';
    case 'done': return 'success';
    case 'todo': return 'default';
  }
};

const getStatusLabel = (status: StatusType): string => {
  switch (status) {
    case 'inprogress': return 'IN PROGRESS';
    case 'done': return 'DONE';
    case 'todo': return 'TO DO';
  }
};

const getPriorityLabel = (priority: PriorityType): string => {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

const getIndentLevel = (type: ItemType): number => {
  switch (type) {
    case 'feature': return 0;
    case 'story': return 24;
    case 'subtask': return 48;
  }
};

export const JiraListViewPage: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(
    new Set(['1', '2', '8', '9']) // FEAT-1, STORY-1, FEAT-3, STORY-6 expanded by default
  );
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = useCallback((id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Flatten hierarchical data based on expanded state
  const flattenItems = useCallback((items: WorkItem[], parentExpanded: boolean = true): WorkItem[] => {
    const result: WorkItem[] = [];
    
    items.forEach(item => {
      if (parentExpanded) {
        result.push(item);
        if (item.children && expandedRows.has(item.id)) {
          result.push(...flattenItems(item.children, true));
        }
      }
    });
    
    return result;
  }, [expandedRows]);

  const flatItems = flattenItems(mockData);

  // Table head
  const head = {
    cells: [
      { 
        key: 'checkbox', 
        content: <Checkbox />,
        width: 40,
      },
      { 
        key: 'type', 
        content: 'TYPE',
        width: 60,
      },
      { 
        key: 'key', 
        content: 'KEY',
        width: 120,
      },
      { 
        key: 'summary', 
        content: 'SUMMARY',
        width: undefined, // flexible
      },
      { 
        key: 'status', 
        content: 'STATUS',
        width: 140,
      },
      { 
        key: 'assignee', 
        content: 'ASSIGNEE',
        width: 120,
      },
      { 
        key: 'priority', 
        content: 'PRIORITY',
        width: 100,
      },
      { 
        key: 'created', 
        content: 'CREATED',
        width: 140,
      },
      { 
        key: 'actions', 
        content: '',
        width: 60,
      },
    ],
  };

  // Table rows
  const rows = flatItems.map((item) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedRows.has(item.id);
    const indent = getIndentLevel(item.type);

    return {
      key: item.id,
      cells: [
        {
          key: 'checkbox',
          content: (
            <div onClick={(e) => e.stopPropagation()}>
              <Checkbox />
            </div>
          ),
        },
        {
          key: 'type',
          content: (
            <span style={{ fontSize: '16px' }}>{getTypeIcon(item.type)}</span>
          ),
        },
        {
          key: 'key',
          content: (
            <a
              href="#"
              style={{
                color: token('color.link', '#0052CC'),
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
              onClick={(e) => e.preventDefault()}
            >
              {item.key}
            </a>
          ),
        },
        {
          key: 'summary',
          content: (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                paddingLeft: `${indent}px`,
                minWidth: '300px',
              }}
            >
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(item.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    marginRight: token('space.050', '4px'),
                    display: 'flex',
                    alignItems: 'center',
                    color: token('color.text.subtlest', '#5E6C84'),
                  }}
                >
                  {isExpanded ? (
                    <ChevronDownIcon label="Collapse" size="small" />
                  ) : (
                    <ChevronRightIcon label="Expand" size="small" />
                  )}
                </button>
              )}
              {!hasChildren && <span style={{ width: '20px', display: 'inline-block' }} />}
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: token('color.text', '#172B4D'),
                }}
              >
                {item.summary}
              </span>
            </div>
          ),
        },
        {
          key: 'status',
          content: (
            <Lozenge appearance={getStatusAppearance(item.status)}>
              {getStatusLabel(item.status)}
            </Lozenge>
          ),
        },
        {
          key: 'assignee',
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
              <Avatar size="small" src={item.assignee.avatarUrl} name={item.assignee.name} />
              <span
                style={{
                  fontSize: '14px',
                  color: token('color.text', '#172B4D'),
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.assignee.name.split(' ')[0]}
              </span>
            </div>
          ),
        },
        {
          key: 'priority',
          content: (
            <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
              {getPriorityLabel(item.priority)}
            </span>
          ),
        },
        {
          key: 'created',
          content: (
            <span style={{ fontSize: '14px', color: token('color.text.subtlest', '#5E6C84') }}>
              {item.created}
            </span>
          ),
        },
        {
          key: 'actions',
          content: (
            <DropdownMenu
              trigger={({ triggerRef, ...props }) => (
                <Button
                  {...props}
                  ref={triggerRef}
                  appearance="subtle"
                  iconBefore={<MoreIcon label="More actions" size="small" />}
                />
              )}
            >
              <DropdownItemGroup>
                <DropdownItem>Edit</DropdownItem>
                <DropdownItem>Clone</DropdownItem>
                <DropdownItem>Move</DropdownItem>
                <DropdownItem>Delete</DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          ),
        },
      ],
    };
  });

  return (
    <div
      style={{
        backgroundColor: token('elevation.surface', '#FFFFFF'),
        minHeight: '100vh',
        padding: token('space.300', '24px'),
      }}
    >
      {/* Breadcrumbs */}
      <div style={{ marginBottom: token('space.200', '16px') }}>
        <Breadcrumbs>
          <BreadcrumbsItem text="Projects" href="#" />
          <BreadcrumbsItem text="Test Project" href="#" />
        </Breadcrumbs>
      </div>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: token('space.300', '24px'),
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '3px',
              background: 'linear-gradient(135deg, #6554C0 0%, #8777D9 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: '18px',
            }}
          >
            TP
          </div>
          <div>
            <h1
              style={{
                fontSize: '24px',
                fontWeight: 500,
                color: token('color.text', '#172B4D'),
                margin: 0,
              }}
            >
              Test Project
            </h1>
            <span
              style={{
                fontSize: '12px',
                color: token('color.text.subtlest', '#5E6C84'),
              }}
            >
              :projectKey
            </span>
          </div>
        </div>
        <Button appearance="subtle" iconBefore={<SettingsIcon label="Settings" />}>
          Settings
        </Button>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `2px solid ${token('color.border', '#DFE1E6')}`,
          marginBottom: token('space.300', '24px'),
        }}
      >
        {['Summary', 'List', 'Kanban board', 'All work'].map((tab, index) => (
          <button
            key={tab}
            style={{
              padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
              fontSize: '14px',
              fontWeight: index === 1 ? 600 : 400,
              color: index === 1 ? token('color.text.selected', '#0052CC') : token('color.text', '#172B4D'),
              background: 'none',
              border: 'none',
              borderBottom: index === 1 ? `2px solid ${token('color.border.selected', '#0052CC')}` : '2px solid transparent',
              marginBottom: '-2px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
          marginBottom: token('space.200', '16px'),
        }}
      >
        <div style={{ width: '300px' }}>
          <Textfield
            placeholder="Search issues..."
            elemAfterInput={
              <div style={{ paddingRight: token('space.100', '8px'), display: 'flex', alignItems: 'center' }}>
                <SearchIcon label="Search" size="small" primaryColor={token('color.icon', '#5E6C84')} />
              </div>
            }
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button appearance="subtle" iconBefore={<FilterIcon label="Filter" />}>
          Filter
        </Button>
      </div>

      {/* Table */}
      <div
        style={{
          border: `1px solid ${token('color.border', '#DFE1E6')}`,
          borderRadius: '3px',
          overflow: 'hidden',
        }}
      >
        <style>
          {`
            .jira-list-table [data-testid="dynamic-table--head-cell"] {
              font-size: 11px !important;
              font-weight: 600 !important;
              text-transform: uppercase !important;
              color: ${token('color.text.subtlest', '#5E6C84')} !important;
              padding: ${token('space.100', '8px')} ${token('space.150', '12px')} !important;
              background: ${token('elevation.surface', '#FFFFFF')} !important;
              border-bottom: 2px solid ${token('color.border', '#DFE1E6')} !important;
            }
            .jira-list-table [data-testid="dynamic-table--row"] {
              height: 48px !important;
              border-bottom: 1px solid ${token('color.border', '#EBECF0')} !important;
            }
            .jira-list-table [data-testid="dynamic-table--row"]:hover {
              background: ${token('color.background.neutral.subtle.hovered', '#F4F5F7')} !important;
            }
            .jira-list-table [data-testid="dynamic-table--cell"] {
              padding: ${token('space.100', '8px')} ${token('space.150', '12px')} !important;
              font-size: 14px !important;
              vertical-align: middle !important;
            }
          `}
        </style>
        <div className="jira-list-table">
          <DynamicTable
            head={head}
            rows={rows}
            isFixedSize
            defaultSortKey="key"
            defaultSortOrder="ASC"
          />
        </div>
      </div>
    </div>
  );
};

export default JiraListViewPage;
