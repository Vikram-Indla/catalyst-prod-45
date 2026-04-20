/**
 * Virtualized issue card for board performance
 */

import React, { memo } from 'react';
import { Avatar, Lozenge } from '@/components/ads';
import { cn } from '@/lib/utils';
import type { BoardIssue } from '../../hooks/useBoardData';
import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons';

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

// Type icons now use canonical JiraIssueTypeIcon component

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
          <JiraIssueTypeIcon type={issue.type} size={16} />
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
            <Lozenge appearance="default">
              {issue.storyPoints} SP
            </Lozenge>
          )}
        </div>
        
        {issue.assigneeId && (
          <Avatar name={issue.assigneeId} size="xsmall" />
        )}
      </div>
    </div>
  );
});

export default IssueCard;
