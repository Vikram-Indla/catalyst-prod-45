/**
 * Virtualized issue card for board performance
 */

import React, { memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { BoardIssue } from '../../hooks/useBoardData';

interface IssueCardProps {
  issue: BoardIssue;
  isDragging?: boolean;
  onClick?: () => void;
}

const priorityColors: Record<string, string> = {
  highest: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  lowest: 'bg-gray-400',
};

const typeIcons: Record<string, string> = {
  story: '📗',
  feature: '🎯',
  subtask: '📌',
  defect: '🐛',
  incident: '🚨',
};

export const IssueCard = memo(function IssueCard({
  issue,
  isDragging,
  onClick,
}: IssueCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-lg p-3 cursor-pointer transition-all',
        'hover:shadow-md hover:border-primary/50',
        isDragging && 'shadow-lg rotate-2 scale-105 opacity-90',
        'select-none'
      )}
    >
      {/* Issue key and type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{typeIcons[issue.type] || '📄'}</span>
          <span className="text-xs font-mono text-muted-foreground">
            {issue.key}
          </span>
        </div>
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            priorityColors[issue.priority] || 'bg-gray-400'
          )}
          title={`Priority: ${issue.priority}`}
        />
      </div>

      {/* Summary */}
      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
        {issue.summary}
      </h4>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {issue.storyPoints && (
            <Badge variant="secondary" className="text-xs px-1.5 py-0">
              {issue.storyPoints} SP
            </Badge>
          )}
        </div>
        
        {issue.assigneeId && (
          <Avatar className="w-6 h-6">
            <AvatarImage src="" />
            <AvatarFallback className="text-xs">
              {issue.assigneeId.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
});

export default IssueCard;
