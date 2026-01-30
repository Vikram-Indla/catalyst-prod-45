// ============================================================
// ACTIVITY SECTION - ENTERPRISE CLEAN V2
// Tabs for All/Comments/History with styled feed
// Matches reference screenshots with proper formatting
// ============================================================

import { useState, useEffect } from 'react';
import { MessageSquare, Send, History, ListFilter, Clock, UserPlus, Edit3, Paperclip, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { TaskComment, TaskActivity } from '../../hooks/useTaskDetails';
import { useAddComment } from '../../hooks/useTaskDetails';

interface ActivitySectionProps {
  taskId: string;
  comments: TaskComment[];
  activity: TaskActivity[];
}

export function ActivitySection({ taskId, comments, activity }: ActivitySectionProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'comments' | 'history'>('all');
  const [newComment, setNewComment] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userInitials, setUserInitials] = useState('U');
  const addComment = useAddComment();

  // Get current user ID and name
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      const name = data.user?.user_metadata?.full_name || data.user?.email || '';
      const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
      setUserInitials(initials);
    });
  }, []);

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    if (!userId) {
      toast.error('You must be logged in to comment');
      return;
    }
    
    addComment.mutate({ 
      taskId, 
      content: newComment.trim(),
      authorId: userId
    }, {
      onSuccess: () => {
        setNewComment('');
        toast.success('Comment added');
      },
      onError: (err) => {
        console.error('Failed to add comment:', err);
        toast.error('Failed to add comment');
      }
    });
  };

  // Combine and sort all items for "all" tab
  const allItems = [...comments.map(c => ({ ...c, type: 'comment' as const })), 
                    ...activity.map(a => ({ ...a, type: 'activity' as const }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4">
      {/* Styled Tabs - Segmented control style matching reference */}
      <div className="flex bg-muted/50 rounded-lg p-1">
        {([
          { key: 'all', label: 'All', icon: ListFilter },
          { key: 'comments', label: 'Comments', icon: MessageSquare },
          { key: 'history', label: 'History', icon: History },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-md transition-all",
              activeTab === tab.key 
                ? "bg-background text-foreground shadow-sm border border-border/50" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
        {activeTab === 'all' && (
          allItems.length === 0 ? (
            <EmptyState message="No activity yet" />
          ) : (
            allItems.map(item => (
              item.type === 'comment' 
                ? <CommentItem key={`c-${item.id}`} comment={item as TaskComment} />
                : <HistoryItem key={`a-${item.id}`} activity={item as TaskActivity} />
            ))
          )
        )}
        
        {activeTab === 'comments' && (
          comments.length === 0 ? (
            <EmptyState message="No comments yet. Be the first to comment!" />
          ) : (
            comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))
          )
        )}
        
        {activeTab === 'history' && (
          activity.length === 0 ? (
            <EmptyState message="No activity recorded yet." />
          ) : (
            activity.map(item => (
              <HistoryItem key={item.id} activity={item} />
            ))
          )
        )}
      </div>

      {/* Comment Composer - Styled like reference */}
      <div className="flex gap-3 pt-2">
        <div 
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0"
        >
          {userInitials}
        </div>
        <div className="flex-1 relative border border-border rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/10 transition-all">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Write a comment... Type @ to mention"
            rows={3}
            className="w-full px-4 py-3 pr-14 text-sm resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <Button
            size="icon"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || addComment.isPending}
            className="absolute bottom-2.5 right-2.5 h-9 w-9 rounded-full"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Empty state component for consistent styling
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10">
      <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function CommentItem({ comment }: { comment: TaskComment }) {
  const authorName = comment.author?.full_name || 'Unknown';
  const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  
  return (
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm text-foreground/90 leading-relaxed">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

// History item styled to match the reference screenshots
function HistoryItem({ activity }: { activity: TaskActivity }) {
  const actorName = activity.actor?.full_name || 'System';
  
  const getActionIcon = () => {
    const action = activity.action_type;
    switch (action) {
      case 'created':
        return <Clock className="w-4 h-4" />;
      case 'assignment':
      case 'assignee_changed':
        return <UserPlus className="w-4 h-4" />;
      case 'status_changed':
      case 'status_change':
        return <Edit3 className="w-4 h-4" />;
      case 'attachment':
        return <Paperclip className="w-4 h-4" />;
      case 'checklist':
      case 'checklist_item_completed':
        return <CheckSquare className="w-4 h-4" />;
      default:
        return <Edit3 className="w-4 h-4" />;
    }
  };

  const getActionText = () => {
    const action = activity.action_type;
    const newVal = activity.new_value;
    const oldVal = activity.old_value;
    
    // Try to parse JSON if it's a stringified object
    let parsedNewVal: any = newVal;
    let parsedOldVal: any = oldVal;
    try {
      if (newVal && newVal.startsWith('{')) {
        parsedNewVal = JSON.parse(newVal);
      }
      if (oldVal && oldVal.startsWith('{')) {
        parsedOldVal = JSON.parse(oldVal);
      }
    } catch { /* ignore */ }
    
    switch (action) {
      case 'created':
        return (
          <>
            <strong>Task</strong> created by <strong>{actorName}</strong>
          </>
        );
      case 'status_changed':
      case 'status_change':
        if (typeof parsedNewVal === 'object' && parsedNewVal.from && parsedNewVal.to) {
          return (
            <>
              <strong>{actorName}</strong> changed status from <strong>{parsedNewVal.from}</strong> to <strong>{parsedNewVal.to}</strong>
            </>
          );
        }
        if (oldVal && newVal) {
          return (
            <>
              <strong>{actorName}</strong> changed status from <strong>{oldVal}</strong> to <strong>{newVal}</strong>
            </>
          );
        }
        return <><strong>{actorName}</strong> changed status</>;
      case 'assignment':
      case 'assignee_changed':
        return (
          <>
            <strong>{actorName}</strong> assigned <strong>{newVal || 'someone'}</strong> to this task
          </>
        );
      case 'attachment':
        return (
          <>
            <strong>{actorName}</strong> attached <strong>{newVal || 'a file'}</strong>
          </>
        );
      case 'checklist':
      case 'checklist_item_completed':
        return (
          <>
            <strong>{actorName}</strong> completed checklist item <strong>"{newVal}"</strong>
          </>
        );
      case 'priority_changed':
        return (
          <>
            <strong>{actorName}</strong> changed priority
          </>
        );
      case 'updated':
      case 'edit':
        return <><strong>{actorName}</strong> updated this task</>;
      default:
        return <><strong>{actorName}</strong> made a change</>;
    }
  };
  
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0">
        {getActionIcon()}
      </div>
      <div className="flex-1 min-w-0 pt-1">
        <p className="text-sm text-foreground/90 leading-relaxed">
          {getActionText()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(activity.created_at), 'MMM d, yyyy')} at {format(new Date(activity.created_at), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}
