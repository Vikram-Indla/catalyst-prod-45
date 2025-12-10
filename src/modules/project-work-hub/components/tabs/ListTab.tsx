import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Avatar from '@atlaskit/avatar';
import Checkbox from '@atlaskit/checkbox';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import { Search, Filter, ChevronDown, ChevronRight, MessageSquare, Settings2 } from 'lucide-react';
import { useWorkItemsHierarchy } from '../../hooks/useWorkItems';
import { WorkItemWithChildren, WorkItem, ListViewMode } from '../../types';
import { WorkTypeIcon } from '../WorkTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { StatusLozenge } from '../StatusLozenge';
import { format } from 'date-fns';

interface ListTabProps {
  projectId: string;
  onItemClick: (item: WorkItem) => void;
  onFilterClick: () => void;
}

export const ListTab: React.FC<ListTabProps> = ({ projectId, onItemClick, onFilterClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ListViewMode>('HIERARCHY');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [groupBy, setGroupBy] = useState<string>('none');
  
  const { data: hierarchyData, flat: flatData, isLoading } = useWorkItemsHierarchy(projectId);

  const toggleRow = (id: string) => {
    const next = new Set(expandedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRows(next);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedRows);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedRows(next);
  };

  // Get unique assignees for avatar group
  const assignees = [...new Map(flatData?.filter(i => i.assigneeAvatar).map(i => [i.assigneeName, i]) || []).values()].slice(0, 4);

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: token('elevation.surface', '#FFFFFF'),
    }}>
      {/* Top Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
      }}>
        {/* Left side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.150', '12px') }}>
          {/* Search */}
          <div style={{ position: 'relative', width: 180 }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: 8, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: token('color.icon.subtle', '#5E6C84'),
              }} 
            />
            <input
              type="text"
              placeholder="Search list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: `${token('space.075', '6px')} ${token('space.100', '8px')} ${token('space.075', '6px')} 32px`,
                border: `1px solid ${token('color.border', '#DFE1E6')}`,
                borderRadius: '3px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Assignee Avatars */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {assignees.map((item, idx) => (
              <div 
                key={item.assigneeName}
                style={{ 
                  marginLeft: idx > 0 ? '-8px' : 0,
                  zIndex: assignees.length - idx,
                }}
              >
                <Avatar 
                  size="small" 
                  src={item.assigneeAvatar}
                  name={item.assigneeName}
                />
              </div>
            ))}
            {flatData && flatData.length > 4 && (
              <span style={{
                marginLeft: token('space.050', '4px'),
                fontSize: '12px',
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                +6
              </span>
            )}
          </div>

          {/* Filter Button */}
          <button
            onClick={onFilterClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.050', '4px'),
              padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              color: token('color.text', '#172B4D'),
            }}
          >
            <Filter size={16} />
            Filter
            <ChevronDown size={16} />
          </button>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
          {/* Group Dropdown */}
          <DropdownMenu
            trigger={({ triggerRef, ...props }) => (
              <button
                ref={triggerRef as any}
                {...props}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: token('space.050', '4px'),
                  padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: token('color.text', '#172B4D'),
                }}
              >
                Group
                <ChevronDown size={16} />
              </button>
            )}
          >
            <DropdownItemGroup>
              <DropdownItem onClick={() => setGroupBy('none')}>None (Hierarchy)</DropdownItem>
              <DropdownItem onClick={() => setGroupBy('assignee')}>Assignee</DropdownItem>
              <DropdownItem onClick={() => setGroupBy('status')}>Status</DropdownItem>
              <DropdownItem onClick={() => setGroupBy('quarter')}>Quarter</DropdownItem>
              <DropdownItem onClick={() => setGroupBy('priority')}>Priority</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>

          <button
            style={{
              padding: token('space.075', '6px'),
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: token('color.icon', '#5E6C84'),
            }}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${token('color.border', '#DFE1E6')}` }}>
              <th style={{ width: 40, padding: token('space.100', '8px') }}>
                <Checkbox />
              </th>
              <th style={{ width: 60, padding: token('space.100', '8px'), textAlign: 'left' }}>Type</th>
              <th style={{ width: 100, padding: token('space.100', '8px'), textAlign: 'left' }}>Key</th>
              <th style={{ padding: token('space.100', '8px'), textAlign: 'left' }}>Summary</th>
              <th style={{ width: 120, padding: token('space.100', '8px'), textAlign: 'left' }}>Status</th>
              <th style={{ width: 100, padding: token('space.100', '8px'), textAlign: 'left' }}>Comments</th>
              <th style={{ width: 150, padding: token('space.100', '8px'), textAlign: 'left' }}>Assignee</th>
              <th style={{ width: 100, padding: token('space.100', '8px'), textAlign: 'left' }}>Due date</th>
              <th style={{ width: 80, padding: token('space.100', '8px'), textAlign: 'left' }}>Priority</th>
              <th style={{ width: 120, padding: token('space.100', '8px'), textAlign: 'left' }}>Created</th>
              <th style={{ width: 120, padding: token('space.100', '8px'), textAlign: 'left' }}>Updated</th>
            </tr>
          </thead>
          <tbody>
            {viewMode === 'HIERARCHY' 
              ? hierarchyData?.map((item) => (
                  <HierarchyRow
                    key={item.id}
                    item={item}
                    level={0}
                    expandedRows={expandedRows}
                    selectedRows={selectedRows}
                    onToggle={toggleRow}
                    onSelect={toggleSelect}
                    onClick={onItemClick}
                  />
                ))
              : flatData?.map((item) => (
                  <FlatRow
                    key={item.id}
                    item={item}
                    selected={selectedRows.has(item.id)}
                    onSelect={() => toggleSelect(item.id)}
                    onClick={() => onItemClick(item)}
                  />
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Hierarchy Row Component
const HierarchyRow: React.FC<{
  item: WorkItemWithChildren;
  level: number;
  expandedRows: Set<string>;
  selectedRows: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onClick: (item: WorkItem) => void;
}> = ({ item, level, expandedRows, selectedRows, onToggle, onSelect, onClick }) => {
  const isExpanded = expandedRows.has(item.id);
  const isSelected = selectedRows.has(item.id);
  const indent = level * 24;

  return (
    <>
      <tr 
        style={{ 
          borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
          cursor: 'pointer',
        }}
        onClick={() => onClick(item)}
      >
        <td style={{ padding: token('space.100', '8px') }} onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            isChecked={isSelected}
            onChange={() => onSelect(item.id)}
          />
        </td>
        <td style={{ padding: token('space.100', '8px') }}>
          <div style={{ display: 'flex', alignItems: 'center', paddingLeft: indent }}>
            {item.hasChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                style={{
                  padding: 2,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  marginRight: token('space.050', '4px'),
                }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <WorkTypeIcon type={item.type} />
          </div>
        </td>
        <td style={{ padding: token('space.100', '8px') }}>
          <a href="#" style={{ color: token('color.link', '#0052CC'), textDecoration: 'none' }}>
            {item.key}
          </a>
        </td>
        <td style={{ padding: token('space.100', '8px'), color: token('color.text', '#172B4D') }}>
          {item.summary}
        </td>
        <td style={{ padding: token('space.100', '8px') }}>
          <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
        </td>
        <td style={{ padding: token('space.100', '8px') }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px'), color: token('color.text.subtlest', '#5E6C84') }}>
            <MessageSquare size={14} />
            {item.commentsCount > 0 ? `${item.commentsCount} comment${item.commentsCount > 1 ? 's' : ''}` : 'Add comment'}
          </div>
        </td>
        <td style={{ padding: token('space.100', '8px') }}>
          {item.assigneeName && (
            <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
              <Avatar size="xsmall" src={item.assigneeAvatar} name={item.assigneeName} />
              <span style={{ fontSize: '14px', color: token('color.text', '#172B4D') }}>
                {item.assigneeName}
              </span>
            </div>
          )}
        </td>
        <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84'), fontSize: '14px' }}>
          {item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : ''}
        </td>
        <td style={{ padding: token('space.100', '8px') }}>
          <PriorityIcon priority={item.priority} showLabel />
        </td>
        <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84'), fontSize: '14px' }}>
          {format(new Date(item.createdAt), 'MMM d, yyyy')}
        </td>
        <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84'), fontSize: '14px' }}>
          {format(new Date(item.updatedAt), 'MMM d, yyyy')}
        </td>
      </tr>
      {isExpanded && item.children.map((child) => (
        <HierarchyRow
          key={child.id}
          item={child}
          level={level + 1}
          expandedRows={expandedRows}
          selectedRows={selectedRows}
          onToggle={onToggle}
          onSelect={onSelect}
          onClick={onClick}
        />
      ))}
    </>
  );
};

// Flat Row Component
const FlatRow: React.FC<{
  item: WorkItem;
  selected: boolean;
  onSelect: () => void;
  onClick: () => void;
}> = ({ item, selected, onSelect, onClick }) => {
  return (
    <tr 
      style={{ 
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        cursor: 'pointer',
      }}
      onClick={onClick}
    >
      <td style={{ padding: token('space.100', '8px') }} onClick={(e) => e.stopPropagation()}>
        <Checkbox isChecked={selected} onChange={onSelect} />
      </td>
      <td style={{ padding: token('space.100', '8px') }}>
        <WorkTypeIcon type={item.type} />
      </td>
      <td style={{ padding: token('space.100', '8px') }}>
        <a href="#" style={{ color: token('color.link', '#0052CC') }}>{item.key}</a>
      </td>
      <td style={{ padding: token('space.100', '8px'), color: token('color.text', '#172B4D') }}>
        {item.summary}
      </td>
      <td style={{ padding: token('space.100', '8px') }}>
        <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
      </td>
      <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84') }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
          <MessageSquare size={14} />
          {item.commentsCount > 0 ? `${item.commentsCount}` : 'Add'}
        </div>
      </td>
      <td style={{ padding: token('space.100', '8px') }}>
        {item.assigneeName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
            <Avatar size="xsmall" src={item.assigneeAvatar} name={item.assigneeName} />
            <span>{item.assigneeName}</span>
          </div>
        )}
      </td>
      <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84') }}>
        {item.dueDate ? format(new Date(item.dueDate), 'MMM d') : ''}
      </td>
      <td style={{ padding: token('space.100', '8px') }}>
        <PriorityIcon priority={item.priority} />
      </td>
      <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84') }}>
        {format(new Date(item.createdAt), 'MMM d, yyyy')}
      </td>
      <td style={{ padding: token('space.100', '8px'), color: token('color.text.subtlest', '#5E6C84') }}>
        {format(new Date(item.updatedAt), 'MMM d')}
      </td>
    </tr>
  );
};
