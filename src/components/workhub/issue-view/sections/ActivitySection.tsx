/**
 * ActivitySection — Real activity timeline from wh_comments + wh_history
 * ════════════════════════════════════════════════════════════════════════════
 * Wired to real Supabase data. Comment composer uses useCreateComment mutation.
 * Activity filter persisted in localStorage.
 */
import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageSquare, History, Clock, Paperclip, FileText,
  ArrowRight, Loader2, AlertCircle, Send,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type ActivityFilter = 'all' | 'comments' | 'history';

interface ActivitySectionProps {
  isDark: boolean;
  issueKey: string;
  commentCount: number;
  comments?: any[];
  commentsLoading?: boolean;
  history?: any[];
  historyLoading?: boolean;
  createComment?: any; // useMutation result
}

const FILTER_OPTIONS: { key: ActivityFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'all', label: 'All', icon: <FileText className="w-3 h-3" /> },
  { key: 'comments', label: 'Comments', icon: <MessageSquare className="w-3 h-3" /> },
  { key: 'history', label: 'History', icon: <History className="w-3 h-3" /> },
];

function formatRelative(date: string | null): string {
  if (!date) return '';
  try { return formatDistanceToNow(new Date(date), { addSuffix: true }); } catch { return ''; }
}

function AvatarSmall({ name, isDark }: { name: string; isDark: boolean }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ['#4C6EF5', '#FA8C16', '#52C41A', '#EB2F96', '#722ED1'];
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ backgroundColor: colors[hash % colors.length] }}
    >
      {initials}
    </div>
  );
}

function CommentItem({ comment, isDark }: { comment: any; isDark: boolean }) {
  const name = comment.author_name ?? comment.author_display_name ?? 'Unknown';
  return (
    <div className="flex gap-3 py-3">
      <AvatarSmall name={name} isDark={isDark} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>{name}</span>
          <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
            {formatRelative(comment.created_at)}
          </span>
        </div>
        <div className={cn('font-body text-sm whitespace-pre-wrap', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>
          {comment.body ?? comment.body_text ?? ''}
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ entry, isDark }: { entry: any; isDark: boolean }) {
  const name = entry.author_name ?? entry.author_display_name ?? 'System';
  const changes = Array.isArray(entry.changes) ? entry.changes : [];
  return (
    <div className="flex gap-3 py-3">
      <AvatarSmall name={name} isDark={isDark} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-body text-sm font-medium', isDark ? 'text-[#EDEDED]' : 'text-[#292A2E]')}>{name}</span>
          <span className={cn('font-body text-xs', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
            made changes {formatRelative(entry.created_at)}
          </span>
        </div>
        {changes.length > 0 ? (
          <div className="space-y-1">
            {changes.map((ch: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs font-body flex-wrap">
                <span className={cn('font-medium', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>{ch.field}</span>
                {ch.from && (
                  <span className={cn('px-1.5 py-0.5 rounded line-through', isDark ? 'bg-[#2E1A1A] text-[#FF8F73]' : 'bg-[#FFEBE6] text-[#BF2600]')}>
                    {ch.from}
                  </span>
                )}
                <ArrowRight className="w-3 h-3 text-[#878787]" />
                {ch.to && (
                  <span className={cn('px-1.5 py-0.5 rounded', isDark ? 'bg-[#1A2E1A] text-[#57D9A3]' : 'bg-[#E3FCEF] text-[#006644]')}>
                    {ch.to}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : entry.description ? (
          <p className={cn('font-body text-sm', isDark ? 'text-[#A1A1A1]' : 'text-[#505258]')}>{entry.description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function ActivitySection({
  isDark, issueKey, commentCount,
  comments = [], commentsLoading = false,
  history = [], historyLoading = false,
  createComment,
}: ActivitySectionProps) {
  const [filter, setFilter] = useState<ActivityFilter>(() => {
    const stored = localStorage.getItem('allwork.activityFilter');
    if (stored === 'comments' || stored === 'history') return stored;
    return 'all';
  });

  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  // Persist filter
  const handleFilterChange = useCallback((f: ActivityFilter) => {
    setFilter(f);
    localStorage.setItem('allwork.activityFilter', f);
  }, []);

  // Merge + sort activity items
  const mergedActivity = useMemo(() => {
    const items: { type: 'comment' | 'history'; data: any; date: string }[] = [];

    if (filter === 'all' || filter === 'comments') {
      for (const c of comments) {
        items.push({ type: 'comment', data: c, date: c.created_at ?? '' });
      }
    }
    if (filter === 'all' || filter === 'history') {
      for (const h of history) {
        items.push({ type: 'history', data: h, date: h.created_at ?? '' });
      }
    }

    // Sort by date descending
    return items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });
  }, [comments, history, filter]);

  const handleSubmitComment = useCallback(async () => {
    if (!commentText.trim() || !createComment) return;
    setPosting(true);
    try {
      await createComment.mutateAsync({
        body: commentText.trim(),
        authorId: 'current-user', // Will be resolved by service layer
      });
      setCommentText('');
    } catch {
      // Error handled by mutation onError (toast)
    } finally {
      setPosting(false);
    }
  }, [commentText, createComment]);

  const isLoading = commentsLoading || historyLoading;

  return (
    <div>
      {/* Filter pills */}
      <div className="flex items-center gap-1 mb-3">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => handleFilterChange(opt.key)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-body font-medium transition-colors',
              filter === opt.key
                ? isDark ? 'bg-[#1F1F1F] text-[#EDEDED]' : 'bg-[#E9F2FF] text-[#0C66E4]'
                : isDark ? 'text-[#878787] hover:bg-[#1F1F1F]' : 'text-[#505258] hover:bg-[#F4F5F7]',
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      {/* Comment composer */}
      {createComment && (
        <div className={cn(
          'flex items-start gap-2 p-3 rounded-lg border mb-3',
          isDark ? 'border-[#2E2E2E]' : 'border-[#DFE1E6]',
        )}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            disabled={posting}
            className={cn(
              'flex-1 bg-transparent border-none outline-none resize-none font-body text-sm',
              isDark ? 'text-[#EDEDED] placeholder:text-[#878787]' : 'text-[#292A2E] placeholder:text-[#878787]',
            )}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
          />
          <button
            onClick={handleSubmitComment}
            disabled={posting || !commentText.trim()}
            className={cn(
              'p-2 rounded-md transition-colors shrink-0',
              commentText.trim()
                ? 'bg-[#0C66E4] text-white hover:bg-[#0052CC]'
                : isDark ? 'bg-[#292929] text-[#878787]' : 'bg-[#F4F5F7] text-[#6B6E76]',
            )}
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Activity list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-[#878787]' : 'text-[#505258]')} />
        </div>
      ) : mergedActivity.length > 0 ? (
        <div className={cn('divide-y', isDark ? 'divide-[#2E2E2E]' : 'divide-[#DFE1E6]')}>
          {mergedActivity.map((item, i) => (
            item.type === 'comment'
              ? <CommentItem key={`c-${item.data.id ?? i}`} comment={item.data} isDark={isDark} />
              : <HistoryItem key={`h-${item.data.id ?? i}`} entry={item.data} isDark={isDark} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className={cn('font-body text-sm', isDark ? 'text-[#878787]' : 'text-[#6B6E76]')}>
            No activity yet
          </p>
        </div>
      )}
    </div>
  );
}
