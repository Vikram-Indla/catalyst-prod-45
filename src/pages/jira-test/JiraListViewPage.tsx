import React, { useState, useCallback } from 'react';
import { token } from '@atlaskit/tokens';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Checkbox } from '@atlaskit/checkbox';
import Breadcrumbs, { BreadcrumbsItem } from '@atlaskit/breadcrumbs';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import SearchIcon from '@atlaskit/icon/glyph/search';
import ShareIcon from '@atlaskit/icon/glyph/share';
import SettingsIcon from '@atlaskit/icon/glyph/settings';
import EditorMoreIcon from '@atlaskit/icon/glyph/editor/more';

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

// Mock Data matching the screenshot
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
  const iconStyle = { width: '16px', height: '16px', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' };
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

const getStatusConfig = (status: StatusType) => {
  switch (status) {
    case 'new':
      return { label: 'NEW', appearance: 'new' as const, bgColor: '#0052CC', textColor: 'white' };
    case 'backlog':
      return { label: 'BACKLOG', appearance: 'default' as const, bgColor: '#42526E', textColor: 'white' };
    case 'done':
      return { label: 'DONE', appearance: 'success' as const, bgColor: '#00875A', textColor: 'white' };
    case 'inprogress':
      return { label: 'IN PROGRESS', appearance: 'inprogress' as const, bgColor: '#0052CC', textColor: 'white' };
  }
};

export const JiraListViewPage: React.FC = () => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set(['1', '3']));
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

  return (
    <div style={{ backgroundColor: '#FFFFFF', minHeight: '100vh' }}>
      {/* Breadcrumbs */}
      <div style={{ padding: '12px 24px 0', borderBottom: '1px solid #EBECF0' }}>
        <div style={{ marginBottom: '8px' }}>
          <span style={{ fontSize: '14px', color: '#5E6C84' }}>
            Spaces / <span style={{ color: '#0052CC' }}>Enterprise Shared Services</span>
          </span>
        </div>
        
        {/* Project Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 500, color: '#172B4D' }}>
              ESS Defects Kanban
            </span>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#5E6C84">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Button appearance="subtle" iconBefore={<ShareIcon label="Share" size="small" />} />
            <Button appearance="subtle" iconBefore={<SettingsIcon label="Settings" size="small" />} />
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '-1px' }}>
          {[
            { icon: '📋', label: 'Summary', active: false },
            { icon: '📊', label: 'Kanban board', active: false },
            { icon: '📝', label: 'List', active: false },
            { icon: '📁', label: 'All work', active: true },
            { icon: '🏷️', label: 'Releases', active: false },
            { icon: '📦', label: 'Archived work items', active: false },
          ].map((tab, index) => (
            <button
              key={tab.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: tab.active ? 600 : 400,
                color: tab.active ? '#0052CC' : '#42526E',
                background: 'none',
                border: 'none',
                borderBottom: tab.active ? '2px solid #0052CC' : '2px solid transparent',
                cursor: 'pointer',
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
          <button style={{ padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: '#42526E', fontSize: '16px' }}>
            +
          </button>
        </div>
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
        <button style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px', 
          padding: '6px 12px', 
          background: 'none', 
          border: '1px solid #DFE1E6', 
          borderRadius: '3px', 
          cursor: 'pointer',
          fontSize: '14px',
          color: '#42526E'
        }}>
          ✨ Ask AI
        </button>

        {/* Basic/JQL Toggle */}
        <div style={{ display: 'flex', border: '1px solid #DFE1E6', borderRadius: '3px', overflow: 'hidden' }}>
          <button style={{ 
            padding: '6px 12px', 
            background: '#0052CC', 
            color: 'white', 
            border: 'none', 
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer'
          }}>
            Basic
          </button>
          <button style={{ 
            padding: '6px 12px', 
            background: 'white', 
            color: '#42526E', 
            border: 'none', 
            fontSize: '14px',
            cursor: 'pointer'
          }}>
            JQL
          </button>
        </div>

        {/* Search */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '6px',
          padding: '6px 10px',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          backgroundColor: '#FAFBFC',
          width: '160px'
        }}>
          <SearchIcon label="Search" size="small" primaryColor="#5E6C84" />
          <input
            type="text"
            placeholder="Search work"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '14px',
              color: '#172B4D',
              width: '100%',
            }}
          />
        </div>

        {/* Project Filter */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: '#0052CC',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          Project = <span style={{ fontWeight: 500 }}>Enterprise Shared Services</span>
          <ChevronDownIcon label="" size="small" />
        </button>

        {/* Assignee */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: 'white',
          color: '#42526E',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          Assignee
          <ChevronDownIcon label="" size="small" />
        </button>

        {/* Type */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: 'white',
          color: '#42526E',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          Type
          <ChevronDownIcon label="" size="small" />
        </button>

        {/* Status */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: 'white',
          color: '#42526E',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          Status
          <ChevronDownIcon label="" size="small" />
        </button>

        {/* More filters */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: 'white',
          color: '#42526E',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          More filters
          <ChevronDownIcon label="" size="small" />
        </button>

        <div style={{ flex: 1 }} />

        {/* Saved filters */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: 'white',
          color: '#42526E',
          border: 'none',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          Saved filters
          <ChevronDownIcon label="" size="small" />
        </button>

        {/* Group */}
        <button style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          padding: '6px 12px',
          background: 'white',
          color: '#42526E',
          border: '1px solid #DFE1E6',
          borderRadius: '3px',
          fontSize: '14px',
          cursor: 'pointer',
        }}>
          Group
        </button>

        {/* View icons */}
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#5E6C84">
              <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
            </svg>
          </button>
          <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#5E6C84">
              <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z"/>
            </svg>
          </button>
          <button style={{ padding: '6px', background: 'none', border: 'none', cursor: 'pointer' }}>
            <EditorMoreIcon label="More" size="small" primaryColor="#5E6C84" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
          <thead>
            <tr style={{ backgroundColor: '#FAFBFC' }}>
              <th style={{ width: '40px', padding: '8px 12px', borderBottom: '2px solid #DFE1E6' }}>
                <Checkbox />
              </th>
              <th style={{ 
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '2px solid #DFE1E6',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#5E6C84',
                letterSpacing: '0.06em'
              }}>
                Work
              </th>
              <th style={{ 
                width: '140px',
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '2px solid #DFE1E6',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#5E6C84',
                letterSpacing: '0.06em'
              }}>
                Fix versions
              </th>
              <th style={{ 
                width: '120px',
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '2px solid #DFE1E6',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#5E6C84',
                letterSpacing: '0.06em'
              }}>
                Status
              </th>
              <th style={{ 
                width: '120px',
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '2px solid #DFE1E6',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#5E6C84',
                letterSpacing: '0.06em'
              }}>
                Parent
              </th>
              <th style={{ 
                width: '180px',
                textAlign: 'left', 
                padding: '8px 12px', 
                borderBottom: '2px solid #DFE1E6',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: '#5E6C84',
                letterSpacing: '0.06em'
              }}>
                Assignee
              </th>
            </tr>
          </thead>
          <tbody>
            {flatItems.map((item) => {
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedRows.has(item.id);
              const statusConfig = getStatusConfig(item.status);
              const indent = item.level * 24;

              return (
                <tr 
                  key={item.id} 
                  style={{ 
                    borderBottom: '1px solid #EBECF0',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F4F5F7'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                    <Checkbox />
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: `${indent}px` }}>
                      {hasChildren ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                          style={{ 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer', 
                            padding: '2px',
                            marginRight: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          {isExpanded ? 
                            <ChevronDownIcon label="Collapse" size="small" primaryColor="#5E6C84" /> : 
                            <ChevronRightIcon label="Expand" size="small" primaryColor="#5E6C84" />
                          }
                        </button>
                      ) : (
                        <span style={{ width: '24px' }} />
                      )}
                      <span style={{ marginRight: '8px' }}>{getTypeIcon(item.type)}</span>
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
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '14px', color: '#5E6C84' }}>
                    {item.fixVersions}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <button style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '2px 8px',
                      backgroundColor: statusConfig.bgColor,
                      color: statusConfig.textColor,
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                    }}>
                      {statusConfig.label}
                      <ChevronDownIcon label="" size="small" />
                    </button>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '14px', color: '#5E6C84' }}>
                    {item.parent}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        backgroundColor: '#6554C0',
                        color: 'white',
                        fontSize: '10px',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.assignee.initials}
                      </div>
                      <span style={{ fontSize: '14px', color: '#172B4D' }}>
                        {item.assignee.name}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JiraListViewPage;
