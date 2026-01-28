// ============================================================
// ACTIVITY SECTION - POLISHED
// Tabs for All/Comments/History with styled feed
// ============================================================

import { useState } from 'react';
import { MessageSquare, Send, History, ListFilter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
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
  const addComment = useAddComment();

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    addComment.mutate({ 
      taskId, 
      content: newComment.trim(),
      authorId: ''
    });
    setNewComment('');
  };

  // Combine and sort all items for "all" tab
  const allItems = [...comments.map(c => ({ ...c, type: 'comment' as const })), 
                    ...activity.map(a => ({ ...a, type: 'activity' as const }))]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4">
      {/* Header - Sentence case */}
      <div className="flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Activity</span>
      </div>

      {/* Styled Tabs - Theme-aware */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {([
          { key: 'all', label: 'All', icon: ListFilter },
          { key: 'comments', label: 'Comments', icon: MessageSquare },
          { key: 'history', label: 'History', icon: History },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all",
              activeTab === tab.key 
                ? "bg-background text-foreground shadow-sm" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="space-y-4 max-h-64 overflow-y-auto">
        {activeTab === 'all' && (
          allItems.length === 0 ? (
            <EmptyState message="No activity yet" />
          ) : (
            allItems.map(item => (
              item.type === 'comment' 
                ? <CommentItem key={`c-${item.id}`} comment={item as TaskComment} />
                : <ActivityItem key={`a-${item.id}`} activity={item as TaskActivity} />
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
              <ActivityItem key={item.id} activity={item} />
            ))
          )
        )}
      </div>

      {/* Comment Input - Theme-aware */}
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0">
          U
        </div>
        <div className="flex-1 relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmitComment();
              }
            }}
            placeholder="Write a comment... Type @ to mention"
            rows={2}
            className="w-full px-3 py-2 pr-12 border border-border rounded-lg text-sm resize-none bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
          />
          <Button
            size="icon"
            onClick={handleSubmitComment}
            disabled={!newComment.trim()}
            className="absolute bottom-2 right-2 h-7 w-7"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Keyboard hint */}
      <div className="text-[10px] text-muted-foreground/60 text-center">
        Press <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[9px]">⌘</kbd> + <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[9px]">Enter</kbd> to send
      </div>
    </div>
  );
}

// Empty state component for consistent styling
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
        <MessageSquare className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function CommentItem({ comment }: { comment: TaskComment }) {
  const authorName = comment.author?.full_name || 'Unknown';
  const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{authorName}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <div className="mt-1.5 p-3 bg-muted/50 rounded-lg text-sm text-foreground/80 leading-relaxed">
          {comment.content}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: TaskActivity }) {
  const actorName = activity.actor?.full_name || 'System';
  const initials = actorName.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  const getActionText = () => {
    switch (activity.action_type) {
      case 'status_change':
        return `changed status from "${activity.old_value}" to "${activity.new_value}"`;
      case 'assignment':
        return activity.new_value 
          ? `assigned to ${activity.new_value}`
          : 'removed assignment';
      case 'edit':
        return `updated ${activity.old_value}`;
      case 'comment':
        return 'added a comment';
      case 'attachment':
        return 'added an attachment';
      default:
        return activity.action_type;
    }
  };
  
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0 py-1">
        <span className="text-sm">
          <span className="font-semibold text-foreground">{actorName}</span>
          {' '}
          <span className="text-muted-foreground">{getActionText()}</span>
        </span>
        <span className="text-[11px] text-muted-foreground ml-2">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
