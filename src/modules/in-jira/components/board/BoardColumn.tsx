/**
 * Board Column Component
 * Handles WIP limits and visual warnings
 */

import React, { useMemo } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IssueCard } from './IssueCard';
import type { BoardIssue, DBBoardColumn } from '../../hooks/useBoardData';

interface BoardColumnProps {
  column: DBBoardColumn;
  issues: BoardIssue[];
  onIssueClick?: (issue: BoardIssue) => void;
}

export function BoardColumn({ column, issues, onIssueClick }: BoardColumnProps) {
  const issueCount = issues.length;
  const isOverLimit = column.maxLimit !== null && issueCount > column.maxLimit;
  const isAtLimit = column.maxLimit !== null && issueCount === column.maxLimit;

  const wipIndicator = useMemo(() => {
    if (column.maxLimit === null) return null;
    
    const percentage = (issueCount / column.maxLimit) * 100;
    
    return {
      percentage: Math.min(percentage, 100),
      isWarning: percentage >= 80 && percentage < 100,
      isDanger: percentage >= 100,
    };
  }, [issueCount, column.maxLimit]);

  return (
    <div
      className={cn(
        'flex flex-col bg-muted/50 rounded-lg min-w-[280px] max-w-[320px]',
        'border border-border',
        isOverLimit && 'border-destructive bg-destructive/5'
      )}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 border-b border-border',
          isOverLimit && 'bg-destructive/10'
        )}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{column.name}</h3>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isOverLimit
                ? 'bg-destructive text-destructive-foreground'
                : isAtLimit
                ? 'bg-yellow-500 text-white'
                : 'bg-muted-foreground/20 text-muted-foreground'
            )}
          >
            {issueCount}
            {column.maxLimit !== null && `/${column.maxLimit}`}
          </span>
        </div>
        
        {isOverLimit && (
          <AlertTriangle className="w-4 h-4 text-destructive" />
        )}
      </div>

      {/* WIP Progress Bar */}
      {wipIndicator && (
        <div className="h-1 bg-muted mx-3 mt-2 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              wipIndicator.isDanger
                ? 'bg-destructive'
                : wipIndicator.isWarning
                ? 'bg-yellow-500'
                : 'bg-primary'
            )}
            style={{ width: `${wipIndicator.percentage}%` }}
          />
        </div>
      )}

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex-1 p-2 space-y-2 overflow-y-auto min-h-[200px] max-h-[calc(100vh-280px)]',
              snapshot.isDraggingOver && 'bg-primary/5 ring-2 ring-primary/20 ring-inset'
            )}
          >
            {issues.map((issue, index) => (
              <Draggable key={issue.id} draggableId={issue.id} index={index}>
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                    style={dragProvided.draggableProps.style}
                  >
                    <IssueCard
                      issue={issue}
                      isDragging={dragSnapshot.isDragging}
                      onClick={() => onIssueClick?.(issue)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            
            {issues.length === 0 && !snapshot.isDraggingOver && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No issues
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}

export default BoardColumn;
