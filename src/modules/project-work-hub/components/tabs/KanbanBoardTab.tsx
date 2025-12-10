import React, { useState } from 'react';
import { token } from '@atlaskit/tokens';
import Textfield from '@atlaskit/textfield';
import Button from '@atlaskit/button';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import Avatar, { AvatarItem } from '@atlaskit/avatar';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Settings2, BarChart3 } from 'lucide-react';
import { useWorkItemsByAssignee, useUpdateWorkItemStatus } from '../../hooks/useWorkItems';
import { DEFAULT_BOARD_COLUMNS, WorkItem, BoardGrouping } from '../../types';
import { WorkTypeIcon } from '../WorkTypeIcon';
import { PriorityIcon } from '../PriorityIcon';

interface KanbanBoardTabProps {
  projectId: string;
  onItemClick: (item: WorkItem) => void;
}

export const KanbanBoardTab: React.FC<KanbanBoardTabProps> = ({ projectId, onItemClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [grouping, setGrouping] = useState<BoardGrouping>('ASSIGNEE');
  const [expandedSwimlanes, setExpandedSwimlanes] = useState<Set<string>>(new Set(['all']));
  
  const { data: swimlaneData, isLoading } = useWorkItemsByAssignee(projectId);
  const updateStatus = useUpdateWorkItemStatus();

  const toggleSwimlane = (id: string) => {
    const next = new Set(expandedSwimlanes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSwimlanes(next);
  };

  const handleDrop = (itemId: string, newStatus: string) => {
    updateStatus.mutate({ itemId, newStatus });
  };

  // Get unique assignees for avatar group
  const assignees = swimlaneData?.filter(s => s.name !== 'Unassigned').slice(0, 3) || [];

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      backgroundColor: token('elevation.surface', '#F4F5F7'),
    }}>
      {/* Top Control Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: `${token('space.150', '12px')} ${token('space.200', '16px')}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        backgroundColor: token('elevation.surface', '#FFFFFF'),
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
              placeholder="Search board"
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
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: token('space.100', '8px') }}>
            {assignees.map((assignee, idx) => (
              <div 
                key={assignee.name}
                style={{ 
                  marginLeft: idx > 0 ? '-8px' : 0,
                  zIndex: assignees.length - idx,
                }}
              >
                <Avatar 
                  size="small" 
                  src={assignee.avatar}
                  name={assignee.name}
                />
              </div>
            ))}
            {swimlaneData && swimlaneData.length > 3 && (
              <div style={{
                marginLeft: '-8px',
                width: 24,
                height: 24,
                borderRadius: '50%',
                backgroundColor: token('color.background.neutral', '#DFE1E6'),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                color: token('color.text.subtlest', '#5E6C84'),
              }}>
                +{swimlaneData.length - 3}
              </div>
            )}
          </div>

          {/* Quick Filters */}
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
                Quick filters
                <ChevronDown size={16} />
              </button>
            )}
          >
            <DropdownItemGroup>
              <DropdownItem>My open items</DropdownItem>
              <DropdownItem>High priority</DropdownItem>
              <DropdownItem>Has defects</DropdownItem>
              <DropdownItem>Has incidents</DropdownItem>
              <DropdownItem>Current quarter</DropdownItem>
              <DropdownItem>Unassigned</DropdownItem>
            </DropdownItemGroup>
          </DropdownMenu>
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.100', '8px') }}>
          {/* Group Toggle */}
          <button
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: token('space.050', '4px'),
              padding: `${token('space.075', '6px')} ${token('space.150', '12px')}`,
              backgroundColor: grouping === 'ASSIGNEE' ? token('color.background.brand.bold', '#0052CC') : 'transparent',
              color: grouping === 'ASSIGNEE' ? token('color.text.inverse', '#FFFFFF') : token('color.text', '#172B4D'),
              border: `1px solid ${grouping === 'ASSIGNEE' ? token('color.border.brand', '#0052CC') : token('color.border', '#DFE1E6')}`,
              borderRadius: '3px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
            onClick={() => setGrouping(grouping === 'ASSIGNEE' ? 'NONE' : 'ASSIGNEE')}
          >
            Group: {grouping === 'ASSIGNEE' ? 'Assignee' : 'None'}
          </button>

          <button
            style={{
              padding: token('space.075', '6px'),
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: token('color.icon', '#5E6C84'),
            }}
          >
            <BarChart3 size={20} />
          </button>

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

          <button
            style={{
              padding: token('space.075', '6px'),
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: token('color.icon', '#5E6C84'),
            }}
          >
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Board Content */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto',
        padding: token('space.200', '16px'),
      }}>
        {grouping === 'ASSIGNEE' && swimlaneData ? (
          // Swimlane View
          <div style={{ display: 'flex', flexDirection: 'column', gap: token('space.200', '16px') }}>
            {swimlaneData.map((swimlane) => (
              <SwimlaneRow
                key={swimlane.name}
                swimlane={swimlane}
                columns={DEFAULT_BOARD_COLUMNS}
                expanded={expandedSwimlanes.has('all') || expandedSwimlanes.has(swimlane.name)}
                onToggle={() => toggleSwimlane(swimlane.name)}
                onItemClick={onItemClick}
                onDrop={handleDrop}
              />
            ))}
          </div>
        ) : (
          // Single Board View
          <div style={{ 
            display: 'flex', 
            gap: token('space.100', '8px'),
            minHeight: 400,
          }}>
            {DEFAULT_BOARD_COLUMNS.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                items={swimlaneData?.flatMap(s => s.items).filter(i => 
                  column.statuses.includes(i.status.toLowerCase())
                ) || []}
                onItemClick={onItemClick}
                onDrop={handleDrop}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Swimlane Row Component
const SwimlaneRow: React.FC<{
  swimlane: { name: string; avatar?: string; items: WorkItem[] };
  columns: typeof DEFAULT_BOARD_COLUMNS;
  expanded: boolean;
  onToggle: () => void;
  onItemClick: (item: WorkItem) => void;
  onDrop: (itemId: string, newStatus: string) => void;
}> = ({ swimlane, columns, expanded, onToggle, onItemClick, onDrop }) => {
  const itemsByColumn = columns.reduce((acc, col) => {
    acc[col.id] = swimlane.items.filter(i => col.statuses.includes(i.status.toLowerCase()));
    return acc;
  }, {} as Record<string, WorkItem[]>);

  return (
    <div>
      {/* Swimlane Header */}
      <button
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.100', '8px'),
          padding: `${token('space.100', '8px')} 0`,
          backgroundColor: 'transparent',
          border: 'none',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Avatar size="small" src={swimlane.avatar} name={swimlane.name} />
        <span style={{ fontSize: '14px', fontWeight: 500, color: token('color.text', '#172B4D') }}>
          {swimlane.name}
        </span>
        <span style={{ fontSize: '12px', color: token('color.text.subtlest', '#5E6C84') }}>
          ({swimlane.items.length} work items)
        </span>
      </button>

      {/* Swimlane Columns */}
      {expanded && (
        <div style={{ 
          display: 'flex', 
          gap: token('space.100', '8px'),
          marginTop: token('space.100', '8px'),
        }}>
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              items={itemsByColumn[column.id] || []}
              onItemClick={onItemClick}
              onDrop={onDrop}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Board Column Component
const BoardColumn: React.FC<{
  column: typeof DEFAULT_BOARD_COLUMNS[0];
  items: WorkItem[];
  onItemClick: (item: WorkItem) => void;
  onDrop: (itemId: string, newStatus: string) => void;
  compact?: boolean;
}> = ({ column, items, onItemClick, onDrop, compact }) => {
  return (
    <div
      style={{
        flex: 1,
        minWidth: compact ? 140 : 200,
        backgroundColor: token('color.background.neutral', '#F4F5F7'),
        borderRadius: '3px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column Header */}
      <div style={{
        padding: `${token('space.100', '8px')} ${token('space.150', '12px')}`,
        borderBottom: `1px solid ${token('color.border', '#DFE1E6')}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: token('color.text.subtlest', '#5E6C84'),
        }}>
          {column.name}
        </span>
        {items.length > 0 && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            color: token('color.text.subtlest', '#5E6C84'),
            backgroundColor: token('color.background.neutral.bold', '#DFE1E6'),
            padding: '2px 6px',
            borderRadius: '10px',
          }}>
            {items.length}
          </span>
        )}
      </div>

      {/* Column Content */}
      <div style={{
        flex: 1,
        padding: token('space.100', '8px'),
        display: 'flex',
        flexDirection: 'column',
        gap: token('space.100', '8px'),
        minHeight: compact ? 100 : 200,
      }}>
        {items.map((item) => (
          <StoryCard
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
            compact={compact}
          />
        ))}

        {/* Create Button */}
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: token('space.050', '4px'),
            padding: token('space.100', '8px'),
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: token('color.text.subtlest', '#5E6C84'),
            fontSize: '14px',
          }}
        >
          + Create
        </button>
      </div>
    </div>
  );
};

// Story Card Component
const StoryCard: React.FC<{
  item: WorkItem;
  onClick: () => void;
  compact?: boolean;
}> = ({ item, onClick, compact }) => {
  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: token('elevation.surface.raised', '#FFFFFF'),
        borderRadius: '3px',
        padding: token('space.150', '12px'),
        boxShadow: token('elevation.shadow.raised', '0 1px 2px rgba(0,0,0,0.1)'),
        cursor: 'pointer',
        transition: 'box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = token('elevation.shadow.raised', '0 1px 2px rgba(0,0,0,0.1)');
      }}
    >
      {/* Summary */}
      <div style={{
        fontSize: '14px',
        color: token('color.text', '#172B4D'),
        lineHeight: '20px',
        marginBottom: token('space.100', '8px'),
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {item.summary}
      </div>

      {/* Priority Dots */}
      <div style={{ marginBottom: token('space.100', '8px') }}>
        <PriorityIcon priority={item.priority} />
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: token('space.050', '4px') }}>
          <WorkTypeIcon type={item.type} size="small" />
          <span style={{ fontSize: '12px', color: token('color.text.subtlest', '#5E6C84') }}>
            {item.key}
          </span>
        </div>

        {item.assigneeAvatar && (
          <Avatar size="xsmall" src={item.assigneeAvatar} name={item.assigneeName} />
        )}
      </div>

      {/* Child Counts - Only for Stories */}
      {item.type === 'STORY' && (item.subtaskCount || item.defectCount || item.incidentCount) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: token('space.150', '12px'),
          marginTop: token('space.100', '8px'),
          paddingTop: token('space.100', '8px'),
          borderTop: `1px solid ${token('color.border', '#DFE1E6')}`,
        }}>
          {item.subtaskCount ? (
            <span style={{ fontSize: '11px', color: token('color.text.subtlest', '#5E6C84') }}>
              Subtasks: {item.subtaskCount}
            </span>
          ) : null}
          {item.defectCount ? (
            <span style={{ fontSize: '11px', color: token('color.text.danger', '#DE350B') }}>
              Defects: {item.defectCount}
            </span>
          ) : null}
          {item.incidentCount ? (
            <span style={{ fontSize: '11px', color: token('color.text.warning', '#FF991F') }}>
              Incidents: {item.incidentCount}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};
