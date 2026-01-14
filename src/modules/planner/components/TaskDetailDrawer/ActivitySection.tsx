// ============================================================
// ACTIVITY SECTION COMPONENT
// Tabs for Comments + Activity feed
// ============================================================

import { useState } from 'react';
import { MessageSquare, Activity, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { TaskComment, TaskActivity } from '../../hooks/useTaskDetails';
import { useAddComment } from '../../hooks/useTaskDetails';
import { CATALYST_COLORS } from '../../types/kanban';

interface ActivitySectionProps {
  taskId: string;
  comments: TaskComment[];
  activity: TaskActivity[];
}

export function ActivitySection({ taskId, comments, activity }: ActivitySectionProps) {
  const [activeTab, setActiveTab] = useState('comments');
  const [newComment, setNewComment] = useState('');
  const addComment = useAddComment();

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    // Would need current user ID from auth context
    addComment.mutate({ 
      taskId, 
      content: newComment.trim(),
      authorId: '' // Placeholder - would come from auth
    });
    setNewComment('');
  };

  return (
    <div className="space-y-3">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 h-9">
          <TabsTrigger value="comments" className="text-xs">
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            <Activity className="w-3.5 h-3.5 mr-1.5" />
            Activity ({activity.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="comments" className="mt-3 space-y-3">
          {/* Comment input */}
          <div className="flex gap-2">
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
                placeholder="Add a comment... (@mention someone)"
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              <Button
                size="sm"
                onClick={handleSubmitComment}
                disabled={!newComment.trim()}
                className="absolute bottom-2 right-2 h-7"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          
          {/* Comments list */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No comments yet. Be the first to comment!
              </p>
            ) : (
              comments.map(comment => (
                <CommentItem key={comment.id} comment={comment} />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="activity" className="mt-3">
          <div className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No activity recorded yet.
              </p>
            ) : (
              activity.map(item => (
                <ActivityItem key={item.id} activity={item} />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CommentItem({ comment }: { comment: TaskComment }) {
  const authorName = comment.author?.full_name || 'Unknown';
  const initials = authorName.split(' ').map(n => n[0]).join('').slice(0, 2);
  
  return (
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: TaskActivity }) {
  const actorName = activity.actor?.full_name || 'System';
  
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
    <div className="flex items-start gap-2 py-1.5 text-sm">
      <div 
        className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
        style={{ backgroundColor: CATALYST_COLORS.gray400 }}
      />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{actorName}</span>
        {' '}
        <span className="text-muted-foreground">{getActionText()}</span>
        <span className="text-xs text-muted-foreground ml-2">
          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}
