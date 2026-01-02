/**
 * Cycle Execution Board
 * Kanban-style board for test cycle execution status management
 * Uses configurable columns from board_configs
 */

import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  SkipForward,
  MoreHorizontal,
  User,
  Clock,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CycleExecution, ExecutionStatus, ExecutionsByStatus } from '../../hooks/useCycleExecutions';
import { BoardColumn } from '../../hooks/useCycleBoardConfig';

interface CycleExecutionBoardProps {
  executionsByStatus: ExecutionsByStatus;
  columns: BoardColumn[];
  onStatusChange: (executionId: string, status: ExecutionStatus) => void;
  onAssign: (executionId: string, userId: string | null) => void;
  onViewExecution?: (execution: CycleExecution) => void;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  canEdit: boolean;
  isScopeLocked: boolean;
}

function getColumnIcon(iconName: string) {
  switch (iconName) {
    case 'check-circle': return <CheckCircle2 className="h-4 w-4" />;
    case 'x-circle': return <XCircle className="h-4 w-4" />;
    case 'alert-triangle': return <AlertTriangle className="h-4 w-4" />;
    case 'skip-forward': return <SkipForward className="h-4 w-4" />;
    default: return <Circle className="h-4 w-4" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'bg-status-error text-white';
    case 'high': return 'bg-status-warning text-white';
    case 'medium': return 'bg-accent-primary text-white';
    case 'low': return 'bg-surface-3 text-text-secondary';
    default: return 'bg-surface-3 text-text-secondary';
  }
}

export function CycleExecutionBoard({
  executionsByStatus,
  columns,
  onStatusChange,
  onAssign,
  onViewExecution,
  selectedIds,
  onSelectionChange,
  canEdit,
  isScopeLocked,
}: CycleExecutionBoardProps) {
  const handleDragEnd = (result: DropResult) => {
    if (!canEdit) return;
    
    const { draggableId, destination } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as ExecutionStatus;
    onStatusChange(draggableId, newStatus);
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const selectAllInColumn = (status: ExecutionStatus) => {
    const ids = executionsByStatus[status]?.map(e => e.id) || [];
    const next = new Set(selectedIds);
    ids.forEach(id => next.add(id));
    onSelectionChange(next);
  };

  // Sort columns by order
  const sortedColumns = [...columns].sort((a, b) => a.order - b.order);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full overflow-x-auto pb-4">
        {sortedColumns.map(column => {
          const statusKey = column.statusKey as ExecutionStatus;
          const items = executionsByStatus[statusKey] || [];
          
          return (
            <div
              key={column.id}
              className="flex-shrink-0 w-72 flex flex-col bg-surface-2 rounded-lg border border-border-default"
            >
              {/* Column Header */}
              <div className={cn('px-3 py-2.5 border-b border-border-default flex items-center justify-between', column.bgColor)}>
                <div className="flex items-center gap-2">
                  <span className={column.color}>{getColumnIcon(column.icon || 'circle')}</span>
                  <span className="font-medium text-sm text-text-primary">{column.title}</span>
                  <Badge variant="secondary" className="text-xs">{items.length}</Badge>
                </div>
                {canEdit && items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => selectAllInColumn(statusKey)}
                  >
                    Select All
                  </Button>
                )}
              </div>

              {/* Column Content */}
              <Droppable droppableId={statusKey} isDropDisabled={!canEdit}>
                {(provided, snapshot) => (
                  <ScrollArea className="flex-1">
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        'p-2 min-h-[200px] space-y-2',
                        snapshot.isDraggingOver && 'bg-accent-subtle/30'
                      )}
                    >
                      {items.map((execution, index) => (
                        <Draggable
                          key={execution.id}
                          draggableId={execution.id}
                          index={index}
                          isDragDisabled={!canEdit}
                        >
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                'bg-surface-1 rounded-lg border border-border-default p-3 cursor-pointer transition-all',
                                snapshot.isDragging && 'shadow-lg border-accent-primary',
                                selectedIds.has(execution.id) && 'ring-2 ring-accent-primary'
                              )}
                              onClick={() => onViewExecution?.(execution)}
                            >
                              <div className="flex items-start gap-2">
                                {canEdit && (
                                  <Checkbox
                                    checked={selectedIds.has(execution.id)}
                                    onCheckedChange={() => toggleSelection(execution.id)}
                                    onClick={e => e.stopPropagation()}
                                    className="mt-0.5"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary line-clamp-2">
                                    {execution.test_case?.title || 'Unknown Test Case'}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge className={cn('text-xs', getPriorityColor(execution.test_case?.priority || 'medium'))}>
                                      {execution.test_case?.priority || 'medium'}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {execution.test_case?.test_type || 'manual'}
                                    </Badge>
                                  </div>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onViewExecution?.(execution)}>
                                      <FileText className="h-4 w-4 mr-2" />
                                      View Details
                                    </DropdownMenuItem>
                                    {canEdit && (
                                      <>
                                        <DropdownMenuItem onClick={() => onStatusChange(execution.id, 'passed')}>
                                          <CheckCircle2 className="h-4 w-4 mr-2 text-status-success" />
                                          Mark Passed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onStatusChange(execution.id, 'failed')}>
                                          <XCircle className="h-4 w-4 mr-2 text-status-error" />
                                          Mark Failed
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onStatusChange(execution.id, 'blocked')}>
                                          <AlertTriangle className="h-4 w-4 mr-2 text-status-warning" />
                                          Mark Blocked
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              {/* Assignee */}
                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-default">
                                {execution.assignee ? (
                                  <div className="flex items-center gap-1.5">
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[10px]">
                                        {execution.assignee.full_name?.slice(0, 2).toUpperCase() || '??'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-text-secondary truncate max-w-[100px]">
                                      {execution.assignee.full_name}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-text-quaternary flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    Unassigned
                                  </span>
                                )}
                                {execution.executed_at && (
                                  <span className="text-[10px] text-text-quaternary flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(execution.executed_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {items.length === 0 && (
                        <div className="text-center py-8 text-text-quaternary text-sm">
                          No executions
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
