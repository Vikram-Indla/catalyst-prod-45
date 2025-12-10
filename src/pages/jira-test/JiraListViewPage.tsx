import React, { useState, useCallback } from 'react';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Button, { ButtonGroup } from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Checkbox } from '@atlaskit/checkbox';
import Textfield from '@atlaskit/textfield';
import Tabs, { Tab, TabList, TabPanel } from '@atlaskit/tabs';
import DynamicTable from '@atlaskit/dynamic-table';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ShareIcon from '@atlaskit/icon/glyph/share';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import EditorMoreIcon from '@atlaskit/icon/glyph/editor/more';
import ListIcon from '@atlaskit/icon/glyph/list';
import BoardIcon from '@atlaskit/icon/glyph/board';
import AddIcon from '@atlaskit/icon/glyph/add';

// Types
type ItemType = 'epic' | 'story' | 'subtask' | 'bug';
type StatusType = 'new' | 'backlog' | 'done' | 'inprogress';

interface WorkItem {
  id: string;
  key: string;
  type: ItemType;
  summary: string;
  status: StatusType;
  fixVersions: string;
  parent: string;
  assignee: { name: string; avatarUrl: string; initials: string };
  children?: WorkItem[];
  level: number;
}

// Mock Data
const mockData: WorkItem[] = [
  {
    id: '1',
    key: 'ESS-612',
    type: 'epic',
    summary: 'توريد وتركيب الأجهزة',
    status: 'new',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'Saud Bindakheel', avatarUrl: '', initials: 'SB' },
    level: 0,
    children: [
      {
        id: '2',
        key: 'ESS-611',
        type: 'epic',
        summary: 'توريد الرخص',
        status: 'new',
        fixVersions: 'None',
        parent: 'None',
        assignee: { name: 'Saud Bindakheel', avatarUrl: '', initials: 'SB' },
        level: 1,
      },
    ],
  },
  {
    id: '3',
    key: 'ESS-610',
    type: 'epic',
    summary: 'توريد وتركيب انظمة',
    status: 'new',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'Abdulrhman Alghiz', avatarUrl: '', initials: 'AA' },
    level: 0,
    children: [
      {
        id: '4',
        key: 'ESS-609',
        type: 'story',
        summary: 'تذكرة 3',
        status: 'backlog',
        fixVersions: 'None',
        parent: 'None',
        assignee: { name: 'Abdulrhman Alghiz', avatarUrl: '', initials: 'AA' },
        level: 1,
      },
      {
        id: '5',
        key: 'ESS-608',
        type: 'story',
        summary: 'تذكرة 2',
        status: 'backlog',
        fixVersions: 'None',
        parent: 'None',
        assignee: { name: 'Abdulrhman Alghiz', avatarUrl: '', initials: 'AA' },
        level: 1,
      },
      {
        id: '6',
        key: 'ESS-607',
        type: 'story',
        summary: 'تذكرة 1',
        status: 'backlog',
        fixVersions: 'None',
        parent: 'None',
        assignee: { name: 'Abdulrhman Alghiz', avatarUrl: '', initials: 'AA' },
        level: 1,
      },
    ],
  },
  {
    id: '7',
    key: 'ESS-606',
    type: 'story',
    summary: 'ترقية نظام الخوادم المنجية',
    status: 'backlog',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'Saud Bindakheel', avatarUrl: '', initials: 'SB' },
    level: 0,
  },
  {
    id: '8',
    key: 'ESS-599',
    type: 'bug',
    summary: 'when choose الكل in دليل المستخدم from cms and login by user Job Rank is em...',
    status: 'done',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'Hasan Elsherbiny', avatarUrl: '', initials: 'HE' },
    level: 0,
  },
  {
    id: '9',
    key: 'ESS-598',
    type: 'bug',
    summary: 'incorrect name of field وصف الخلل في السيارة in service طلب صيانة مركبة',
    status: 'done',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'Ahmed Yousry', avatarUrl: '', initials: 'AY' },
    level: 0,
  },
  {
    id: '10',
    key: 'ESS-597',
    type: 'bug',
    summary: 'after send request from مقدم الطلب and take action not found name of Action ...',
    status: 'done',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'Hasan Elsherbiny', avatarUrl: '', initials: 'HE' },
    level: 0,
  },
  {
    id: '11',
    key: 'ESS-596',
    type: 'bug',
    summary: '(CR) وضع العلامة الاجبارية في المرفقات',
    status: 'done',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'menna nasser', avatarUrl: '', initials: 'MN' },
    level: 0,
  },
  {
    id: '12',
    key: 'ESS-595',
    type: 'bug',
    summary: '(CR) اضافة حقل نوع التدريب',
    status: 'done',
    fixVersions: 'None',
    parent: 'None',
    assignee: { name: 'menna nasser', avatarUrl: '', initials: 'MN' },
    level: 0,
  },
];

// Helper functions
const getTypeIcon = (type: ItemType) => {
  const iconStyle: React.CSSProperties = { 
    width: '16px', 
    height: '16px', 
    borderRadius: '3px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    fontSize: '10px',
    flexShrink: 0
  };
  switch (type) {
    case 'epic':
      return <span style={{ ...iconStyle, backgroundColor: '#6554C0', color: 'white' }}>⚡</span>;
    case 'story':
      return <span style={{ ...iconStyle, backgroundColor: '#36B37E', color: 'white' }}>📋</span>;
    case 'subtask':
      return <span style={{ ...iconStyle, backgroundColor: '#4FADE6', color: 'white' }}>☑</span>;
    case 'bug':
      return <span style={{ ...iconStyle, backgroundColor: '#FF5630', color: 'white' }}>🔴</span>;
  }
};

const getLozengeAppearance = (status: StatusType): 'new' | 'default' | 'success' | 'inprogress' => {
  switch (status) {
    case 'new': return 'new';
    case 'backlog': return 'default';
    case 'done': return 'success';
    case 'inprogress': return 'inprogress';
  }
};

const getStatusLabel = (status: StatusType): string => {
  switch (status) {
    case 'new': return 'NEW';
    case 'backlog': return 'BACKLOG';
    case 'done': return 'DONE';
    case 'inprogress': return 'IN PROGRESS';
  }
};

export const JiraListViewPage: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['1', '3']));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState(3);

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

  // Create table head
  const head = {
    cells: [
      { key: 'checkbox', content: <Checkbox />, width: 5 },
      { key: 'work', content: 'WORK', isSortable: true, width: 40 },
      { key: 'fixVersions', content: 'FIX VERSIONS', isSortable: true, width: 15 },
      { key: 'status', content: 'STATUS', isSortable: true, width: 15 },
      { key: 'parent', content: 'PARENT', isSortable: true, width: 12 },
      { key: 'assignee', content: 'ASSIGNEE', isSortable: true, width: 18 },
    ],
  };

  // Create table rows
  const rows = flatItems.map((item) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedRows.has(item.id);
    const indent = item.level * 24;

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
          key: 'work',
          content: (
            <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px` }}>
              {hasChildren ? (
                <Button
                  appearance="subtle"
                  spacing="none"
                  onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                  iconBefore={isExpanded ? 
                    <ChevronDownIcon label="Collapse" size="small" /> : 
                    <ChevronRightIcon label="Expand" size="small" />
                  }
                />
              ) : (
                <span style={{ width: '24px' }} />
              )}
              <span style={{ marginRight: '8px', marginLeft: '4px' }}>{getTypeIcon(item.type)}</span>
              <a 
                href="#" 
                onClick={(e) => e.preventDefault()}
                style={{ 
                  color: '#0052CC', 
                  fontSize: '14px', 
                  fontWeight: 500, 
                  textDecoration: 'none',
                  marginRight: '8px',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.key}
              </a>
              <span style={{ 
                fontSize: '14px', 
                color: '#172B4D',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {item.summary}
              </span>
            </div>
          ),
        },
        {
          key: 'fixVersions',
          content: <span style={{ fontSize: '14px', color: '#5E6C84' }}>{item.fixVersions}</span>,
        },
        {
          key: 'status',
          content: (
            <DropdownMenu
              trigger={({ triggerRef, ...props }) => (
                <Button
                  {...props}
                  ref={triggerRef}
                  appearance="subtle"
                  spacing="compact"
                  iconAfter={<ChevronDownIcon label="" size="small" />}
                >
                  <Lozenge appearance={getLozengeAppearance(item.status)} isBold>
                    {getStatusLabel(item.status)}
                  </Lozenge>
                </Button>
              )}
            >
              <DropdownItemGroup>
                <DropdownItem>NEW</DropdownItem>
                <DropdownItem>BACKLOG</DropdownItem>
                <DropdownItem>IN PROGRESS</DropdownItem>
                <DropdownItem>DONE</DropdownItem>
              </DropdownItemGroup>
            </DropdownMenu>
          ),
        },
        {
          key: 'parent',
          content: <span style={{ fontSize: '14px', color: '#5E6C84' }}>{item.parent}</span>,
        },
        {
          key: 'assignee',
          content: (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Avatar size="small" name={item.assignee.name} />
              <span style={{ fontSize: '14px', color: '#172B4D' }}>
                {item.assignee.name}
              </span>
            </div>
          ),
        },
      ],
    };
  });

  const tabs = [
    { label: 'Summary', icon: '📋' },
    { label: 'Kanban board', icon: '📊' },
    { label: 'List', icon: '📝' },
    { label: 'All work', icon: '📁' },
    { label: 'Releases', icon: '🏷️' },
    { label: 'Archived work items', icon: '📦' },
  ];

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      {/* Breadcrumbs & Header */}
      <div style={{ padding: '12px 24px 0', borderBottom: '1px solid #EBECF0' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#5E6C84' }}>
            Spaces / <a href="#" style={{ color: '#0052CC', textDecoration: 'none' }}>Enterprise Shared Services</a>
          </span>
        </div>
        
        {/* Project Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 500, color: '#172B4D' }}>
              ESS Defects Kanban
            </span>
            <Button appearance="subtle" iconBefore={<EditorMoreIcon label="More" size="small" />} />
          </div>
          <ButtonGroup>
            <Button appearance="subtle" iconBefore={<ShareIcon label="Share" size="small" />} />
            <Button appearance="subtle" iconBefore={<SettingsIcon label="Settings" size="small" />} />
          </ButtonGroup>
        </div>

        {/* Tabs using Atlaskit */}
        <Tabs id="project-tabs" onChange={(index) => setSelectedTab(index)} selected={selectedTab}>
          <TabList>
            {tabs.map((tab, index) => (
              <Tab key={index}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{tab.icon}</span>
                  {tab.label}
                </span>
              </Tab>
            ))}
            <Tab>
              <AddIcon label="Add tab" size="small" />
            </Tab>
          </TabList>
        </Tabs>
      </div>

      {/* Filter Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '12px 24px',
        borderBottom: '1px solid #EBECF0',
        flexWrap: 'wrap'
      }}>
        {/* Ask AI */}
        <Button appearance="default">✨ Ask AI</Button>

        {/* Basic/JQL Toggle */}
        <ButtonGroup>
          <Button appearance="primary">Basic</Button>
          <Button appearance="default">JQL</Button>
        </ButtonGroup>

        {/* Search using Atlaskit Textfield */}
        <div style={{ width: '180px' }}>
          <Textfield
            placeholder="Search work"
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            elemBeforeInput={
              <div style={{ paddingLeft: '8px', display: 'flex', alignItems: 'center' }}>
                <SearchIcon label="Search" size="small" primaryColor="#5E6C84" />
              </div>
            }
          />
        </div>

        {/* Filter Dropdowns */}
        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <Button {...props} ref={triggerRef} appearance="primary" iconAfter={<ChevronDownIcon label="" size="small" />}>
              Project = Enterprise Shared Services
            </Button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>Enterprise Shared Services</DropdownItem>
            <DropdownItem>Other Project</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <Button {...props} ref={triggerRef} appearance="default" iconAfter={<ChevronDownIcon label="" size="small" />}>
              Assignee
            </Button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>Unassigned</DropdownItem>
            <DropdownItem>Saud Bindakheel</DropdownItem>
            <DropdownItem>Ahmed Yousry</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <Button {...props} ref={triggerRef} appearance="default" iconAfter={<ChevronDownIcon label="" size="small" />}>
              Type
            </Button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>Epic</DropdownItem>
            <DropdownItem>Story</DropdownItem>
            <DropdownItem>Bug</DropdownItem>
            <DropdownItem>Sub-task</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <Button {...props} ref={triggerRef} appearance="default" iconAfter={<ChevronDownIcon label="" size="small" />}>
              Status
            </Button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>New</DropdownItem>
            <DropdownItem>Backlog</DropdownItem>
            <DropdownItem>In Progress</DropdownItem>
            <DropdownItem>Done</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <Button {...props} ref={triggerRef} appearance="default" iconAfter={<ChevronDownIcon label="" size="small" />}>
              More filters
            </Button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>Priority</DropdownItem>
            <DropdownItem>Labels</DropdownItem>
            <DropdownItem>Sprint</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        <div style={{ flex: 1 }} />

        {/* Right side actions */}
        <DropdownMenu
          trigger={({ triggerRef, ...props }) => (
            <Button {...props} ref={triggerRef} appearance="subtle" iconAfter={<ChevronDownIcon label="" size="small" />}>
              Saved filters
            </Button>
          )}
        >
          <DropdownItemGroup>
            <DropdownItem>My open issues</DropdownItem>
            <DropdownItem>All bugs</DropdownItem>
          </DropdownItemGroup>
        </DropdownMenu>

        <Button appearance="default">Group</Button>

        <ButtonGroup>
          <Button appearance="subtle" iconBefore={<ListIcon label="List view" size="small" />} />
          <Button appearance="subtle" iconBefore={<BoardIcon label="Board view" size="small" />} />
          <Button appearance="subtle" iconBefore={<EditorMoreIcon label="More" size="small" />} />
        </ButtonGroup>
      </div>

      {/* Table using DynamicTable */}
      <div style={{ padding: '0 24px' }}>
        <DynamicTable
          head={head}
          rows={rows}
          rowsPerPage={20}
          defaultPage={1}
          isFixedSize
          defaultSortKey="work"
          defaultSortOrder="ASC"
          onSort={() => {}}
          emptyView={<p>No work items found</p>}
        />
      </div>
    </div>
  );
};

export default JiraListViewPage;
