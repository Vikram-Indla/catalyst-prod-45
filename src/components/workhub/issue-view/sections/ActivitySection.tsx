/**
 * ActivitySection — Combined activity timeline (comments, history, worklog, attachments)
 * ════════════════════════════════════════════════════════════════════════════
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare, History, Clock, Paperclip, FileText,
  ChevronDown, ArrowRight,
} from 'lucide-react';
import type { ActivityFilter, ActivityItem } from '@/types/issue-view.types';
import { formatDistanceToNow } from 'date-fns';

interface ActivitySectionProps {
  isDark: boolean;
  issueKey: string;
  commentCount: number;
  items?: ActivityItem[];
  hasMore?: boolean;
  onLoadMore?: (cursor?: string) => void;
  onAddComment?: (body: string) => Promise<void>;
}

const FILTER_OPTIONS: { key: ActivityFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <FileText className="w-3 h-3" /> },
  { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-3 h-3" /> },
  { key: 'history', label: 'History', icon: <History className="w-3 h-3" /> },
  { key: 'worklog', label: 'Work log', icon: <Clock className="w-3 h-3" /> },
  { key: 'attachments', label: 'Files', icon: <Paperclip className="w-3 h-3" /> },
];

function formatRelative(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

function AvatarSmall({
  name,
  isDark,
}: {
  name: string;
  isDark: boolean;
}) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hashCode = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
  const bg = colors[hashCode % colors.length];

  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ backgroundColor: bg }}
    >
      {initials}
    </div>
  );
}

function ActivityItemRow({
  item,
  isDark,
}: {
  item: ActivityItem;
  isDark: boolean;
}) {
  const actorName = item.actor.displayName;

  if (item.type === 'comment') {
    return (
      <div className="flex gap-3 py-2">
        <AvatarSmall name={actorName} isDark={isDark} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
              {actorName}
            </span>
            <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              commented {formatRelative(item.created)}
            </span>
          </div>
          <div className={cn(
            'font-body text-sm whitespace-pre-wrap',
            isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]',
          )}>
            {item.bodyAdfOrMarkdown}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'history') {
    return (
      <div className="flex gap-3 py-2">
        <AvatarSmall name={actorName} isDark={isDark} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
              {actorName}
            </span>
            <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              made changes {formatRelative(item.created)}
            </span>
          </div>
          <div className="space-y-1">
            {item.changes.map((change, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-body">
                <span className={cn('font-medium', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>
                  {change.field}
                </span>
                {change.from && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded line-through',
                    isDark ? 'bg-[#2E1A1A] text-[#FF8F73]' : 'bg-[#FFEBE6] text-[#BF2600]',
                  )}>
                    {change.from}
                  </span>
                )}
                <ArrowRight className="w-3 h-3 text-[#878787]" />
                {change.to && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded',
                    isDark ? 'bg-[#1A2E1A] text-[#57D9A3]' : 'bg-[#E3FCEF] text-[#006644]',
                  )}>
                    {change.to}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (item.type === 'worklog') {
    const hours = Math.round(item.timeSpentSeconds / 3600 * 10) / 10;
    return (
      <div className="flex gap-3 py-2">
        <AvatarSmall name={actorName} isDark={isDark} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
              {actorName}
            </span>
            <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              logged {hours}h {formatRelative(item.created)}
            </span>
          </div>
          {item.comment && (
            <p className={cn('font-body text-sm mt-1', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>
              {item.comment}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (item.type === 'attachment') {
    return (
      <div className="flex gap-3 py-2">
        <AvatarSmall name={actorName} isDark={isDark} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
              {actorName}
            </span>
            <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
              added attachment {formatRelative(item.created)}
            </span>
          </div>
          <a
            href={item.downloadUrl}
            className={cn(
              'inline-flex items-center gap-1.5 mt-1 font-body text-sm',
              'text-[#0C66E4] hover:underline',
            )}
          >
            <Paperclip className="w-3 h-3" />
            {item.filename}
          </a>
        </div>
      </div>
    );
  }

  return null;
}

export function ActivitySection({
  isDark,
  issueKey,
  commentCount,
  items = [],
  hasMore = false,
  onLoadMore,
  onAddComment,
}: ActivitySectionProps) {
  const [filter, setFilter] = useState<ActivityFilter>('all');

  const filteredItems = filter === 'all'
    ? items
    : items.filter(i => {
        if (filter === 'comments') return i.type === 'comment';
        if (filter === 'history') return i.type === 'history';
        if (filter === 'worklog') return i.type === 'worklog';
        if (filter === 'attachments') return i.type === 'attachment';
        return true;
      });

  return (
    <div>
      {/* Activity filter pills */}
      <div className="flex items-center gap-1 mb-3">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-body font-medium transition-colors',
              filter === opt.key
                ? isDark
                  ? 'bg-[#1F1F1F] text-[#EDEDED]'
                  : 'bg-[#E9F2FF] text-[#0C66E4]'
                : isDark
                  ? 'text-[#878787] hover:bg-[#1F1F1F]'
                  : 'text-[#505258] hover:bg-[#F4F5F7]',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Activity items */}
      {filteredItems.length > 0 ? (
        <div className={cn('space-y-0 divide-y', isDark ? 'divide-[#2E2E2E]' : 'divide-[#DFE1E6]')}>
          {filteredItems.map((activityItem) => (
            <ActivityItemRow key={activityItem.id} item={activityItem} isDark={isDark} />
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
            {commentCount > 0
              ? `${commentCount} activity item${commentCount > 1 ? 's' : ''} (load to view)`
              : 'No activity yet'}
          </p>
        </div>
      )}

      {/* Load more */}
      {hasMore && (
        <button
          onClick={() => onLoadMore?.()}
          className={cn(
            'w-full mt-3 py-2 text-center text-xs font-body font-medium rounded-md transition-colors',
            'text-[#0C66E4]',
            isDark ? 'hover:bg-[#1F1F1F]' : 'hover:bg-[#E9F2FF]',
          )}
        >
          Load more activity
        </button>
      )}
    </div>
  );
}
