/**
 * Module 3B-2: Draggable queue item row
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  GripVertical, 
  MoreHorizontal, 
  Trash2,
  Clock
} from 'lucide-react';
import { PriorityBadge } from './PriorityBadge';
import { PositionControls } from './PositionControls';
import type { QueueItemData, PriorityLevel } from '../../types/queue-management';

interface QueueItemProps {
  item: QueueItemData;
  maxPosition: number;
  isSelected: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onToggleSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveToTop: () => void;
  onMoveToBottom: () => void;
  onChangePriority: (priority: PriorityLevel) => void;
  onRemove: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function QueueItem({
  item,
  maxPosition,
  isSelected,
  isDragging,
  isDragOver,
  onSelect,
  onToggleSelect,
  onMoveUp,
  onMoveDown,
  onMoveToTop,
  onMoveToBottom,
  onChangePriority,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: QueueItemProps) {
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-center gap-3 p-3 rounded-lg border transition-all',
        'hover:bg-muted/50 cursor-grab active:cursor-grabbing',
        isSelected && 'bg-primary/5 border-primary/30',
        isDragging && 'opacity-50 scale-[0.98]',
        isDragOver && 'border-primary border-dashed bg-primary/10',
        !isSelected && !isDragOver && 'bg-card border-border'
      )}
    >
      {/* Drag Handle */}
      <div className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground">
        <GripVertical className="h-5 w-5" />
      </div>

      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggleSelect()}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0"
      />

      {/* Position Badge */}
      <div className="shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
        <span className="text-sm font-mono font-medium text-muted-foreground">
          {item.position}
        </span>
      </div>

      {/* Priority Badge */}
      <PriorityBadge priority={item.priority} size="sm" />

      {/* Test Case Info */}
      <div 
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onSelect}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            {item.test_case.case_number}
          </span>
        </div>
        <p className="text-sm font-medium truncate">
          {item.test_case.title}
        </p>
      </div>

      {/* Estimated Time */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Clock className="h-3 w-3" />
        <span>{formatTime(item.estimated_time)}</span>
      </div>

      {/* Position Controls */}
      <PositionControls
        position={item.position}
        maxPosition={maxPosition}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onMoveToTop={onMoveToTop}
        onMoveToBottom={onMoveToBottom}
        className="hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity"
      />

      {/* More Actions Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Set Priority</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onChangePriority('critical')}>
                Critical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('high')}>
                High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('medium')}>
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChangePriority('low')}>
                Low
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRemove} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Remove from Queue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
