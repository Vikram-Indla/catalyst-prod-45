import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ads';
import type { CdsComment } from '../types';
import { CommentAction } from './CommentAction';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderContent(content: string): React.ReactNode {
  const parts = content.split(/(@\[([^\]]+)\]\([^)]+\))/g);
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];
    if (part && part.startsWith('@[')) {
      const name = parts[i + 1];
      nodes.push(
        <span key={i} className="text-[var(--ds-text-brand, #2563EB)] dark:text-[#4C9AFF] font-medium">
          @{name}
        </span>
      );
      i += 3;
    } else {
      if (part) nodes.push(<React.Fragment key={i}>{part}</React.Fragment>);
      i += 1;
    }
  }

  return nodes;
}

export interface CommentProps {
  comment: CdsComment;
  actions?: React.ReactNode;
  isHighlighted?: boolean;
  className?: string;
}

const Comment = React.forwardRef<HTMLDivElement, CommentProps>(
  ({ comment, actions, isHighlighted, className }, ref) => {
    const { author, content, createdAt, isEdited, isSystem } = comment;

    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-3 py-3',
          isHighlighted && 'bg-[#DEEBFF]/30 dark:bg-[#1C3A5C]/20 -mx-3 px-3 rounded',
          className
        )}
      >
        <span className="shrink-0">
          <Avatar
            src={author.avatarUrl}
            name={isSystem ? 'System' : author.name}
            size="small"
          />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className={cn(
                'text-[13px] font-semibold',
                isSystem
                  ? 'text-[var(--ds-text-subtlest, #6B778C)] dark:text-[var(--ds-text-subtlest, #878787)]'
                  : 'text-[var(--ds-text, #172B4D)] dark:text-[var(--ds-text, #EDEDED)]'
              )}
            >
              {author.name}
            </span>
            <span className="text-[12px] text-[var(--ds-text-subtlest, #6B778C)] dark:text-[var(--ds-text-subtlest, #878787)]">
              {formatRelativeTime(createdAt)}
            </span>
            {isEdited && (
              <span className="text-[11px] text-[var(--ds-text-subtlest, #6B778C)] dark:text-[#7D7D7D] italic">
                edited
              </span>
            )}
          </div>

          <div className="text-[13px] text-[var(--ds-text, #172B4D)] dark:text-[var(--ds-text, #EDEDED)] whitespace-pre-wrap leading-relaxed">
            {renderContent(content)}
          </div>

          {actions && (
            <div className="flex items-center gap-3 mt-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    );
  }
);
Comment.displayName = 'Comment';

export { Comment, formatRelativeTime, getInitials, renderContent };
