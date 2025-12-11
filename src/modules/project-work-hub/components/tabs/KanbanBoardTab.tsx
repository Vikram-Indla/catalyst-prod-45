import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, MoreHorizontal, Settings2, BarChart3 } from 'lucide-react';
import { useWorkItemsByAssignee, useUpdateWorkItemStatus } from '../../hooks/useWorkItems';
import { DEFAULT_BOARD_COLUMNS, WorkItem, BoardGrouping } from '../../types';
import { WorkTypeIcon } from '../WorkTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    <div className="flex flex-col h-full bg-muted">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-[180px]">
            <Search 
              className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" 
            />
            <Input
              type="text"
              placeholder="Search board"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Assignee Avatars */}
          <div className="flex items-center ml-2">
            {assignees.map((assignee, idx) => (
              <div 
                key={assignee.name}
                className={idx > 0 ? '-ml-2' : ''}
                style={{ zIndex: assignees.length - idx }}
              >
                <Avatar className="w-6 h-6 border-2 border-card">
                  <AvatarImage src={assignee.avatar} />
                  <AvatarFallback className="text-[10px]">
                    {assignee.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            ))}
            {swimlaneData && swimlaneData.length > 3 && (
              <div className="-ml-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground border-2 border-card">
                +{swimlaneData.length - 3}
              </div>
            )}
          </div>

          {/* Quick Filters */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1">
                Quick filters
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>My open items</DropdownMenuItem>
              <DropdownMenuItem>High priority</DropdownMenuItem>
              <DropdownMenuItem>Has defects</DropdownMenuItem>
              <DropdownMenuItem>Has incidents</DropdownMenuItem>
              <DropdownMenuItem>Current quarter</DropdownMenuItem>
              <DropdownMenuItem>Unassigned</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Group Toggle */}
          <Button
            variant={grouping === 'ASSIGNEE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setGrouping(grouping === 'ASSIGNEE' ? 'NONE' : 'ASSIGNEE')}
          >
            Group: {grouping === 'ASSIGNEE' ? 'Assignee' : 'None'}
          </Button>

          <Button variant="ghost" size="icon">
            <BarChart3 className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon">
            <Settings2 className="w-5 h-5" />
          </Button>

          <Button variant="ghost" size="icon">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-auto p-4">
        {grouping === 'ASSIGNEE' && swimlaneData ? (
          // Swimlane View
          <div className="flex flex-col gap-4">
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
          <div className="flex gap-2 min-h-[400px]">
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
        className="flex items-center gap-2 py-2 bg-transparent border-none cursor-pointer w-full text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Avatar className="w-6 h-6">
          <AvatarImage src={swimlane.avatar} />
          <AvatarFallback className="text-[10px]">
            {swimlane.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium text-foreground">
          {swimlane.name}
        </span>
        <span className="text-xs text-muted-foreground">
          ({swimlane.items.length} work items)
        </span>
      </button>

      {/* Swimlane Columns */}
      {expanded && (
        <div className="flex gap-2 mt-2">
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
      className={`flex-1 bg-muted rounded flex flex-col ${compact ? 'min-w-[140px]' : 'min-w-[200px]'}`}
    >
      {/* Column Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {column.name}
        </span>
        {items.length > 0 && (
          <span className="text-[11px] font-semibold text-muted-foreground bg-muted-foreground/20 px-1.5 py-0.5 rounded-full">
            {items.length}
          </span>
        )}
      </div>

      {/* Column Content */}
      <div className={`flex-1 p-2 flex flex-col gap-2 ${compact ? 'min-h-[100px]' : 'min-h-[200px]'}`}>
        {items.map((item) => (
          <StoryCard
            key={item.id}
            item={item}
            onClick={() => onItemClick(item)}
            compact={compact}
          />
        ))}

        {/* Create Button */}
        <button className="flex items-center gap-1 p-2 bg-transparent border-none cursor-pointer text-muted-foreground text-sm hover:text-foreground">
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
      className="bg-card rounded p-3 shadow-sm cursor-pointer transition-shadow hover:shadow-md border border-border"
    >
      {/* Summary */}
      <div className="text-sm text-foreground leading-5 mb-2 line-clamp-2">
        {item.summary}
      </div>

      {/* Priority Dots */}
      <div className="mb-2">
        <PriorityIcon priority={item.priority} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <WorkTypeIcon type={item.type} size="small" />
          <span className="text-xs text-muted-foreground">
            {item.key}
          </span>
        </div>

        {item.assigneeAvatar && (
          <Avatar className="w-5 h-5">
            <AvatarImage src={item.assigneeAvatar} />
            <AvatarFallback className="text-[8px]">
              {item.assigneeName?.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Child Counts - Only for Stories */}
      {item.type === 'STORY' && (item.subtaskCount || item.defectCount || item.incidentCount) && (
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
          {item.subtaskCount ? (
            <span className="text-[11px] text-muted-foreground">
              Subtasks: {item.subtaskCount}
            </span>
          ) : null}
          {item.defectCount ? (
            <span className="text-[11px] text-destructive">
              Defects: {item.defectCount}
            </span>
          ) : null}
          {item.incidentCount ? (
            <span className="text-[11px] text-yellow-600">
              Incidents: {item.incidentCount}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};