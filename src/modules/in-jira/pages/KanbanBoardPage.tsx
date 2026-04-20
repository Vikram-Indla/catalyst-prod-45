/**
 * Kanban Board Page
 * Full Kanban board with real data, drag-drop, WIP limits, and virtualization
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import {
  Search, 
  Filter, 
  MoreHorizontal, 
  Plus,
  User,
  Flag,
  Layers,
  ChevronDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, Lozenge, Tooltip } from '@/components/ads';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useInJira } from '../context/InJiraContext';
import { useBoardData, useBoardColumns, type BoardIssue, type DBBoardColumn } from '../hooks/useBoardData';
import { compareRanks } from '../utils/lexorank';
import { IssuePriority, IssueType } from '../types';

// Quick filter options
const QUICK_FILTERS = [
  { id: 'only-my-issues', label: 'Only My Issues' },
  { id: 'recently-updated', label: 'Recently Updated' },
  { id: 'no-assignee', label: 'No Assignee' },
  { id: 'bugs-only', label: 'Bugs Only' },
];

// Priority colors
const PRIORITY_COLORS: Record<IssuePriority, string> = {
  highest: 'text-red-600',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-green-500',
  lowest: 'text-blue-400',
};

// Type colors
const TYPE_COLORS: Record<IssueType, string> = {
  feature: 'bg-purple-500',
  story: 'bg-green-500',
  subtask: 'bg-blue-400',
  defect: 'bg-red-500',
  incident: 'bg-orange-500',
};

// Default columns for fallback
const DEFAULT_COLUMNS: DBBoardColumn[] = [
  { id: 'backlog', boardId: '', name: 'Backlog', sortOrder: 0, statusIds: ['backlog'], maxLimit: null, minLimit: null },
  { id: 'in-progress', boardId: '', name: 'In Progress', sortOrder: 1, statusIds: ['in-progress'], maxLimit: 5, minLimit: null },
  { id: 'in-review', boardId: '', name: 'In Review', sortOrder: 2, statusIds: ['in-review'], maxLimit: 3, minLimit: null },
  { id: 'done', boardId: '', name: 'Done', sortOrder: 3, statusIds: ['done'], maxLimit: null, minLimit: null },
];

export function KanbanBoardPage() {
  const { projectKey } = useParams<{ projectKey: string }>();
  const { 
    openIssueDrawer, 
    openCreateModal, 
    searchQuery, 
    setSearchQuery, 
    activeFilters, 
    toggleFilter,
  } = useInJira();
  
  // Use projectKey as fallback IDs for demo mode
  const boardId = projectKey || 'demo-board';
  const projectId = projectKey || 'demo-project';
  
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

  const { columns: dbColumns, updateWipLimit } = useBoardColumns(boardId);
  
  // Use DB columns if available, otherwise use defaults
  const columns = dbColumns.length > 0 ? dbColumns : DEFAULT_COLUMNS;

  // Filter issues by search query and active filters
  const filteredIssues = useMemo(() => {
    let result = issues;
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (issue) =>
          issue.key.toLowerCase().includes(query) ||
          issue.summary.toLowerCase().includes(query)
      );
    }
    
    // Apply quick filters
    if (activeFilters.includes('bugs-only')) {
      result = result.filter(i => i.type === 'defect');
    }
    if (activeFilters.includes('no-assignee')) {
      result = result.filter(i => !i.assigneeId);
    }
    
    return result;
  }, [issues, searchQuery, activeFilters]);

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
      } else {
        // Default to first column if no match
        const firstColId = columns[0]?.id;
        if (firstColId) {
          grouped[firstColId] = grouped[firstColId] || [];
          grouped[firstColId].push(issue);
        }
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

      if (!destination) return;
      if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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

      // Determine new status
      const newStatusId = source.droppableId !== destination.droppableId
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

  const handleIssueClick = (issue: BoardIssue) => {
    openIssueDrawer({
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
      type: issue.type,
      status: issue.status,
      statusCategory: issue.statusCategory,
      priority: issue.priority,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      assigneeId: issue.assigneeId,
      reporterId: issue.reporterId,
      storyPoints: issue.storyPoints,
    });
  };

  const handleCreateInColumn = (columnId: string) => {
    openCreateModal({ projectKey: projectKey || 'PROJ' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-1">
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search board"
              className="pl-8 w-64 h-8"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-1">
            {QUICK_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={activeFilters.includes(filter.id) ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={refetch}
            disabled={isMoving}
          >
            <RefreshCw className={cn("h-4 w-4", isMoving && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <User className="h-4 w-4" />
            Assignee
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5">
            <Layers className="h-4 w-4" />
            Type
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Board */}
      <ScrollArea className="flex-1">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 p-4 min-w-max">
            {columns.map((column) => {
              const columnIssues = issuesByColumn[column.id] || [];
              const isOverLimit = column.maxLimit !== null && columnIssues.length > column.maxLimit;
              const isAtLimit = column.maxLimit !== null && columnIssues.length === column.maxLimit;
              
              return (
                <div 
                  key={column.id}
                  className={cn(
                    "w-72 flex-shrink-0 bg-surface-2 rounded-lg border",
                    isOverLimit ? "border-red-500" : "border-border-default"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border-default">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {column.name}
                      </span>
                      <Lozenge appearance={isOverLimit ? 'removed' : isAtLimit ? 'moved' : 'inprogress'}>
                        {columnIssues.length}
                        {column.maxLimit !== null && `/${column.maxLimit}`}
                      </Lozenge>
                      {isOverLimit && (
                        <Tooltip content="WIP limit exceeded">
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        </Tooltip>
                      )}
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6"
                      onClick={() => handleCreateInColumn(column.id)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Droppable Cards Area */}
                  <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "p-2 space-y-2 min-h-[200px] transition-colors",
                          snapshot.isDraggingOver && "bg-accent-primary/5"
                        )}
                      >
                        {columnIssues.length === 0 ? (
                          <div 
                            className="h-24 border-2 border-dashed border-border-default rounded-lg flex items-center justify-center text-text-tertiary text-sm cursor-pointer hover:border-accent-primary hover:text-accent-primary transition-colors"
                            onClick={() => handleCreateInColumn(column.id)}
                          >
                            Drop issues here
                          </div>
                        ) : (
                          columnIssues.map((issue, index) => (
                            <Draggable key={issue.id} draggableId={issue.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={cn(
                                    "bg-surface-1 rounded-md border border-border-default p-3 cursor-pointer hover:border-accent-primary hover:shadow-sm transition-all group",
                                    dragSnapshot.isDragging && "shadow-lg rotate-2"
                                  )}
                                  onClick={() => handleIssueClick(issue)}
                                >
                                  {/* Issue Key + Type */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className={cn(
                                      "w-4 h-4 rounded-sm flex items-center justify-center",
                                      TYPE_COLORS[issue.type] || 'bg-gray-500'
                                    )}>
                                      <Layers className="h-2.5 w-2.5 text-white" />
                                    </div>
                                    <span className="text-xs font-medium text-accent-primary">
                                      {issue.key}
                                    </span>
                                  </div>

                                  {/* Summary */}
                                  <p className="text-sm text-text-primary line-clamp-2 mb-3">
                                    {issue.summary}
                                  </p>

                                  {/* Footer */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Flag className={cn("h-3.5 w-3.5", PRIORITY_COLORS[issue.priority] || 'text-gray-400')} />
                                      {issue.storyPoints && (
                                        <Lozenge appearance="default">
                                          {issue.storyPoints}
                                        </Lozenge>
                                      )}
                                    </div>
                                    {issue.assigneeId ? (
                                      <Avatar name={issue.assigneeId} size="xsmall" />
                                    ) : (
                                      <div className="h-6 w-6 rounded-full border-2 border-dashed border-border-default flex items-center justify-center">
                                        <User className="h-3 w-3 text-text-tertiary" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              );
            })}
          </div>
        </DragDropContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}

export default KanbanBoardPage;
