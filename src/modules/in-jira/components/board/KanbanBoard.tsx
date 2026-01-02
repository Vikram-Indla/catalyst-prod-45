/**
 * Kanban Board Component
 * Full-featured Kanban board with drag-drop, WIP limits, and virtualization
 */

import React, { useState, useMemo, useCallback } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Plus, Settings, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { BoardColumn } from './BoardColumn';
import { useBoardData, useBoardColumns, type BoardIssue } from '../../hooks/useBoardData';
import { compareRanks } from '../../utils/lexorank';

interface KanbanBoardProps {
  boardId: string;
  projectId: string;
  tenantId: string;
  onIssueClick?: (issue: BoardIssue) => void;
}

export function KanbanBoard({
  boardId,
  projectId,
  tenantId,
  onIssueClick,
}: KanbanBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const {
    board,
    issues,
    isLoading,
    error,
    moveIssue,
    isMoving,
    rankIssue,
    refetch,
  } = useBoardData(boardId, projectId);

  const { columns, updateWipLimit } = useBoardColumns(boardId);

  // Filter issues by search query
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues;
    const query = searchQuery.toLowerCase();
    return issues.filter(
      (issue) =>
        issue.key.toLowerCase().includes(query) ||
        issue.summary.toLowerCase().includes(query)
    );
  }, [issues, searchQuery]);

  // Group issues by status (column)
  const issuesByColumn = useMemo(() => {
    const grouped: Record<string, BoardIssue[]> = {};
    
    columns.forEach((col) => {
      grouped[col.id] = [];
    });

    filteredIssues.forEach((issue) => {
      const column = columns.find((col) =>
        col.statusIds.includes(issue.status)
      );
      if (column) {
        grouped[column.id] = grouped[column.id] || [];
        grouped[column.id].push(issue);
      }
    });

    // Sort issues within each column by rank
    Object.keys(grouped).forEach((colId) => {
      grouped[colId].sort((a, b) => compareRanks(a.rankLexo, b.rankLexo));
    });

    return grouped;
  }, [filteredIssues, columns]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;

      // Dropped outside a droppable
      if (!destination) return;

      // Dropped in same position
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const sourceColumn = columns.find((c) => c.id === source.droppableId);
      const destColumn = columns.find((c) => c.id === destination.droppableId);

      if (!sourceColumn || !destColumn) return;

      // Check WIP limit
      if (source.droppableId !== destination.droppableId) {
        const destIssues = issuesByColumn[destColumn.id] || [];
        if (destColumn.maxLimit !== null && destIssues.length >= destColumn.maxLimit) {
          toast.error(`Column "${destColumn.name}" has reached its WIP limit of ${destColumn.maxLimit}`);
          return;
        }
      }

      // Calculate new rank
      const destIssues = (issuesByColumn[destColumn.id] || []).filter(
        (i) => i.id !== draggableId
      );
      const newRank = rankIssue(draggableId, destination.index, destIssues);

      // Determine new status (first status in destination column)
      const newStatusId =
        source.droppableId !== destination.droppableId
          ? destColumn.statusIds[0]
          : undefined;

      moveIssue({
        issueId: draggableId,
        targetStatusId: newStatusId,
        newRank,
      });
    },
    [columns, issuesByColumn, moveIssue, rankIssue]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
        <p>Failed to load board</p>
        <Button variant="outline" onClick={refetch} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">
            {board?.name || 'Kanban Board'}
          </h2>
          <Input
            placeholder="Search issues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={refetch} disabled={isMoving}>
            <RefreshCw className={cn('w-4 h-4', isMoving && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="sm">
            <Filter className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 p-4 min-h-full">
            {columns.map((column) => (
              <BoardColumn
                key={column.id}
                column={column}
                issues={issuesByColumn[column.id] || []}
                onIssueClick={onIssueClick}
              />
            ))}
            
            {columns.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">No columns configured</p>
                  <p className="text-sm mt-1">Add columns to start using the board</p>
                </div>
              </div>
            )}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}

export default KanbanBoard;
