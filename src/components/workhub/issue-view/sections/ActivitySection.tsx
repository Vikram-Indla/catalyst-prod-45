/**
 * ActivitySection — Real activity timeline from wh_comments + wh_history
 * ════════════════════════════════════════════════════════════════════════════
 * Wired to real Supabase data. Comment composer uses useCreateComment mutation.
 * Activity filter persisted in localStorage.
 */
import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  MessageSquare, History, Clock, Paperclip, FileText,
  ArrowRight, Loader2, AlertCircle, Send,
} from '@/lib/atlaskit-icons';
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
  const colors = ['var(--ds-background-discovery-bold)', 'var(--ds-chart-orange-bold)', 'var(--ds-chart-green-bold)', '#EB2F96', 'var(--ds-background-discovery-bold)'];
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
  // wh_comments: { body, author_id, created_at, _author_name, _author_avatar }
  // ph_issues fallback: { body, _author_name, created_at }
  const name = comment._author_name ?? comment.author_name ?? comment.author_display_name ?? 'Unknown';
  return (
    <div className="flex gap-3 py-3">
      <AvatarSmall name={name} isDark={isDark} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-body text-sm font-medium', isDark ? 'text-[var(--ds-text,var(--cp-bg-neutral))]' : 'text-[var(--ds-text)]')}>{name}</span>
          <span className={cn('font-body text-xs', isDark ? 'text-[var(--ds-text-subtlest,var(--cp-text-secondary))]' : 'text-[var(--ds-text-subtlest)]')}>
            {formatRelative(comment.created_at)}
          </span>
        </div>
        <div className={cn('font-body text-sm whitespace-pre-wrap', isDark ? 'text-[var(--ds-text,var(--cp-bg-neutral))]' : 'text-[var(--ds-text)]')}>
          {comment.body ?? ''}
        </div>
      </div>
    </div>
  );
}

function HistoryItem({ entry, isDark }: { entry: any; isDark: boolean }) {
  // wh_history: { field_name, old_value, new_value, old_display, new_display, _author_name, created_at }
  // ph_issues fallback: same shape from fetchHistory mapping
  const name = entry._author_name ?? entry.author_name ?? 'System';
  const fieldName = entry.field_name ?? entry.field ?? '';
  const oldVal = entry.old_display ?? entry.old_value ?? entry.from ?? null;
  const newVal = entry.new_display ?? entry.new_value ?? entry.to ?? null;

  return (
    <div className="flex gap-3 py-3">
      <AvatarSmall name={name} isDark={isDark} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('font-body text-sm font-medium', isDark ? 'text-[var(--ds-text,var(--cp-bg-neutral))]' : 'text-[var(--ds-text)]')}>{name}</span>
          <span className={cn('font-body text-xs', isDark ? 'text-[var(--ds-text-subtlest,var(--cp-text-secondary))]' : 'text-[var(--ds-text-subtlest)]')}>
            changed {fieldName} {formatRelative(entry.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs font-body flex-wrap">
          <span className={cn('font-medium', isDark ? 'text-[var(--ds-text-subtlest)]' : 'text-[var(--ds-text-accent-gray)]')}>{fieldName}</span>
          {oldVal && (
            <span className={cn('px-1.5 py-0.5 rounded line-through', isDark ? 'bg-[var(--ds-background-danger)] text-[var(--ds-background-danger)]' : 'bg-[var(--ds-background-danger)] text-[var(--ds-text-danger)]')}>
              {oldVal}
            </span>
          )}
          <ArrowRight className="w-3 h-3 text-[var(--ds-text-subtlest,var(--cp-text-secondary))]" />
          {newVal && (
            <span className={cn('px-1.5 py-0.5 rounded', isDark ? 'bg-[var(--ds-background-success)] text-[var(--ds-background-success-bold)]' : 'bg-[var(--ds-background-success)] text-[var(--ds-text-success)]')}>
              {newVal}
            </span>
          )}
        </div>
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

  const { user } = useAuth();
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
        authorId: user?.id ?? '',
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
                ? isDark ? 'bg-[var(--ds-surface-overlay)] text-[var(--ds-text,var(--cp-bg-neutral))]' : 'bg-[var(--ds-background-selected)] text-[var(--ds-link)]'
                : isDark ? 'text-[var(--ds-text-subtlest,var(--cp-text-secondary))] hover:bg-[var(--ds-surface-overlay)]' : 'text-[var(--ds-text-accent-gray)] hover:bg-[var(--ds-surface-sunken,var(--cp-bg-sunken))]',
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
          isDark ? 'border-[var(--ds-border,var(--cp-ink-1))]' : 'border-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))]',
        )}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Add a comment..."
            rows={2}
            disabled={posting}
            className={cn(
              'flex-1 bg-transparent border-none outline-none resize-none font-body text-sm',
              isDark ? 'text-[var(--ds-text,var(--cp-bg-neutral))] placeholder:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]' : 'text-[var(--ds-text)] placeholder:text-[var(--ds-text-subtlest,var(--cp-text-secondary))]',
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
                ? 'bg-[var(--ds-link)] text-white hover:bg-[var(--cp-primary-60)]'
                : isDark ? 'bg-[var(--ds-border,var(--cp-ink-1))] text-[var(--ds-text-subtlest,var(--cp-text-secondary))]' : 'bg-[var(--ds-surface-sunken,var(--cp-bg-sunken))] text-[var(--ds-text-subtlest)]',
            )}
          >
            {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Activity list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className={cn('w-4 h-4 animate-spin', isDark ? 'text-[var(--ds-text-subtlest,var(--cp-text-secondary))]' : 'text-[var(--ds-text-accent-gray)]')} />
        </div>
      ) : mergedActivity.length > 0 ? (
        <div className={cn('divide-y', isDark ? 'divide-[var(--ds-border,var(--cp-ink-1))]' : 'divide-[var(--ds-border,var(--cp-lozenge-grey-bg, var(--cp-border-neutral)))]')}>
          {mergedActivity.map((item, i) => (
            item.type === 'comment'
              ? <CommentItem key={`c-${item.data.id ?? i}`} comment={item.data} isDark={isDark} />
              : <HistoryItem key={`h-${item.data.id ?? i}`} entry={item.data} isDark={isDark} />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className={cn('font-body text-sm', isDark ? 'text-[var(--ds-text-subtlest,var(--cp-text-secondary))]' : 'text-[var(--ds-text-subtlest)]')}>
            No activity yet
          </p>
        </div>
      )}
    </div>
  );
}
