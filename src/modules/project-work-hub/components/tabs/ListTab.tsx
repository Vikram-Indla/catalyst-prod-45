import React, { useState } from 'react';
import { Search, Filter, ChevronDown, ChevronRight, MessageSquare, Settings2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkItemsHierarchy } from '../../hooks/useWorkItems';
import { WorkItemWithChildren, WorkItem, ListViewMode } from '../../types';
import { WorkTypeIcon } from '../WorkTypeIcon';
import { PriorityIcon } from '../PriorityIcon';
import { StatusLozenge } from '../StatusLozenge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '';

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Control Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-44">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search list"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8"
            />
          </div>

          {/* Assignee Avatars */}
          <div className="flex items-center -space-x-2">
            {assignees.map((item) => (
              <Avatar key={item.assigneeName} className="h-6 w-6 border-2 border-background">
                <AvatarImage src={item.assigneeAvatar} alt={item.assigneeName} />
                <AvatarFallback className="text-[10px]">{getInitials(item.assigneeName || '')}</AvatarFallback>
              </Avatar>
            ))}
            {flatData && flatData.length > 4 && (
              <span className="ml-2 text-xs text-muted-foreground">+6</span>
            )}
          </div>

          {/* Filter Button */}
          <Button variant="ghost" size="sm" onClick={onFilterClick} className="gap-1">
            <Filter className="h-4 w-4" />
            Filter
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Group Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1">
                Group
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setGroupBy('none')}>None (Hierarchy)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('assignee')}>Assignee</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('status')}>Status</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('quarter')}>Quarter</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGroupBy('priority')}>Priority</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="w-10 p-2">
                <Checkbox />
              </th>
              <th className="w-14 p-2 text-left text-xs font-medium text-muted-foreground">Type</th>
              <th className="w-24 p-2 text-left text-xs font-medium text-muted-foreground">Key</th>
              <th className="p-2 text-left text-xs font-medium text-muted-foreground">Summary</th>
              <th className="w-28 p-2 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="w-24 p-2 text-left text-xs font-medium text-muted-foreground">Comments</th>
              <th className="w-36 p-2 text-left text-xs font-medium text-muted-foreground">Assignee</th>
              <th className="w-24 p-2 text-left text-xs font-medium text-muted-foreground">Due date</th>
              <th className="w-20 p-2 text-left text-xs font-medium text-muted-foreground">Priority</th>
              <th className="w-28 p-2 text-left text-xs font-medium text-muted-foreground">Created</th>
              <th className="w-28 p-2 text-left text-xs font-medium text-muted-foreground">Updated</th>
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
  
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '';

  return (
    <>
      <tr 
        className="border-b border-border hover:bg-muted/50 cursor-pointer"
        onClick={() => onClick(item)}
      >
        <td className="p-2" onClick={(e) => e.stopPropagation()}>
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onSelect(item.id)}
          />
        </td>
        <td className="p-2">
          <div className="flex items-center" style={{ paddingLeft: level * 24 }}>
            {item.hasChildren && (
              <button
                onClick={(e) => { e.stopPropagation(); onToggle(item.id); }}
                className="p-0.5 hover:bg-muted rounded mr-1"
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            <WorkTypeIcon type={item.type} />
          </div>
        </td>
        <td className="p-2">
          <a href="#" className="text-primary hover:underline text-sm">{item.key}</a>
        </td>
        <td className="p-2 text-sm text-foreground">{item.summary}</td>
        <td className="p-2">
          <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
        </td>
        <td className="p-2">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <MessageSquare className="h-3.5 w-3.5" />
            {item.commentsCount > 0 ? `${item.commentsCount}` : 'Add'}
          </div>
        </td>
        <td className="p-2">
          {item.assigneeName && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={item.assigneeAvatar} alt={item.assigneeName} />
                <AvatarFallback className="text-[9px]">{getInitials(item.assigneeName)}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground truncate">{item.assigneeName}</span>
            </div>
          )}
        </td>
        <td className="p-2 text-sm text-muted-foreground">
          {item.dueDate ? format(new Date(item.dueDate), 'MMM d, yyyy') : ''}
        </td>
        <td className="p-2">
          <PriorityIcon priority={item.priority} showLabel />
        </td>
        <td className="p-2 text-sm text-muted-foreground">
          {format(new Date(item.createdAt), 'MMM d, yyyy')}
        </td>
        <td className="p-2 text-sm text-muted-foreground">
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
  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '';
  
  return (
    <tr 
      className="border-b border-border hover:bg-muted/50 cursor-pointer"
      onClick={onClick}
    >
      <td className="p-2" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={onSelect} />
      </td>
      <td className="p-2">
        <WorkTypeIcon type={item.type} />
      </td>
      <td className="p-2">
        <a href="#" className="text-primary hover:underline text-sm">{item.key}</a>
      </td>
      <td className="p-2 text-sm text-foreground">{item.summary}</td>
      <td className="p-2">
        <StatusLozenge status={item.status} statusCategory={item.statusCategory} />
      </td>
      <td className="p-2 text-muted-foreground text-sm">
        <div className="flex items-center gap-1">
          <MessageSquare className="h-3.5 w-3.5" />
          {item.commentsCount > 0 ? `${item.commentsCount}` : 'Add'}
        </div>
      </td>
      <td className="p-2">
        {item.assigneeName && (
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={item.assigneeAvatar} alt={item.assigneeName} />
              <AvatarFallback className="text-[9px]">{getInitials(item.assigneeName)}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{item.assigneeName}</span>
          </div>
        )}
      </td>
      <td className="p-2 text-sm text-muted-foreground">
        {item.dueDate ? format(new Date(item.dueDate), 'MMM d') : ''}
      </td>
      <td className="p-2">
        <PriorityIcon priority={item.priority} />
      </td>
      <td className="p-2 text-sm text-muted-foreground">
        {format(new Date(item.createdAt), 'MMM d, yyyy')}
      </td>
      <td className="p-2 text-sm text-muted-foreground">
        {format(new Date(item.updatedAt), 'MMM d')}
      </td>
    </tr>
  );
};
