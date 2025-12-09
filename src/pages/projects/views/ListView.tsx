import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import DynamicTable from '@atlaskit/dynamic-table';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import { Checkbox } from '@atlaskit/checkbox';
import Lozenge from '@atlaskit/lozenge';
import Avatar from '@atlaskit/avatar';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import SearchIcon from '@atlaskit/icon/glyph/search';
import FilterIcon from '@atlaskit/icon/glyph/filter';
import MoreIcon from '@atlaskit/icon/glyph/more';
import ChevronRightIcon from '@atlaskit/icon/glyph/chevron-right';
import ChevronDownIcon from '@atlaskit/icon/glyph/chevron-down';
import { ProjectData } from '../../../types/project.types';

interface ListViewProps {
  project: ProjectData;
}

export default function ListView({ project }: ListViewProps) {
  const [expandedRows, setExpandedRows] = useState<string[]>(['FEAT-1', 'FEAT-2', 'FEAT-3']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleExpand = (key: string) => {
    setExpandedRows(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const getLozengeAppearance = (status: string): 'success' | 'inprogress' | 'default' => {
    switch (status) {
      case 'DONE': return 'success';
      case 'IN PROGRESS': return 'inprogress';
      default: return 'default';
    }
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

  const rows = project.features.flatMap((feature) => {
    const isExpanded = expandedRows.includes(feature.key);
    
    const featureRow = {
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
                onClick={() => toggleExpand(feature.key)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                }}
              >
                {isExpanded ? (
                  <ChevronDownIcon label="Collapse" size="small" />
                ) : (
                  <ChevronRightIcon label="Expand" size="small" />
                )}
              </button>
              <span style={{ fontSize: '14px', fontWeight: 500 }}>{feature.summary}</span>
            </div>
          ),
        },
        { key: 'status', content: <Lozenge appearance={getLozengeAppearance(feature.status)}>{feature.status}</Lozenge> },
        { key: 'assignee', content: <Avatar size="small" name={feature.assignee} /> },
        { key: 'priority', content: <span style={{ fontSize: '14px' }}>{feature.priority}</span> },
        { key: 'created', content: <span style={{ fontSize: '14px' }}>{feature.created}</span> },
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
    };

    if (!isExpanded) return [featureRow];

    const storyRows = feature.stories.flatMap((story) => {
      const isStoryExpanded = expandedRows.includes(story.key);
      
      const storyRow = {
        key: story.key,
        cells: [
          { key: 'checkbox', content: <Checkbox /> },
          { key: 'type', content: <span style={{ fontSize: '16px', marginLeft: '24px' }}>📗</span> },
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
              <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100'), marginLeft: '24px' }}>
                {story.subtasks.length > 0 && (
                  <button
                    onClick={() => toggleExpand(story.key)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                    }}
                  >
                    {isStoryExpanded ? (
                      <ChevronDownIcon label="Collapse" size="small" />
                    ) : (
                      <ChevronRightIcon label="Expand" size="small" />
                    )}
                  </button>
                )}
                <span style={{ fontSize: '14px' }}>{story.summary}</span>
              </div>
            ),
          },
          { key: 'status', content: <Lozenge appearance={getLozengeAppearance(story.status)}>{story.status}</Lozenge> },
          { key: 'assignee', content: <Avatar size="small" name={story.assignee} /> },
          { key: 'priority', content: <span style={{ fontSize: '14px' }}>{story.priority}</span> },
          { key: 'created', content: <span style={{ fontSize: '14px' }}>{story.created}</span> },
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
      };

      if (!isStoryExpanded || story.subtasks.length === 0) return [storyRow];

      const subtaskRows = story.subtasks.map((subtask) => ({
        key: subtask.key,
        cells: [
          { key: 'checkbox', content: <Checkbox /> },
          { key: 'type', content: <span style={{ fontSize: '16px', marginLeft: '48px' }}>☑️</span> },
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
              <span style={{ fontSize: '14px', marginLeft: '48px' }}>{subtask.summary}</span>
            ),
          },
          { key: 'status', content: <Lozenge appearance={getLozengeAppearance(subtask.status)}>{subtask.status}</Lozenge> },
          { key: 'assignee', content: <Avatar size="small" name={subtask.assignee} /> },
          { key: 'priority', content: <span style={{ fontSize: '14px' }}>{subtask.priority}</span> },
          { key: 'created', content: <span style={{ fontSize: '14px' }}>{subtask.created}</span> },
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
      }));

      return [storyRow, ...subtaskRows];
    });

    return [featureRow, ...storyRows];
  });

  return (
    <div style={{ padding: token('space.300'), overflow: 'auto' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: token('space.100'),
        marginBottom: token('space.200'),
      }}>
        <div style={{ maxWidth: '400px', flex: 1 }}>
          <Textfield
            placeholder="Search list..."
            elemBeforeInput={<SearchIcon label="Search" size="small" />}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button appearance="subtle" iconBefore={<FilterIcon label="Filter" size="small" />}>
          Filter
        </Button>
      </div>

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
