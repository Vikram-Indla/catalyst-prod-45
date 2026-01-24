/**
 * Test Case Comments Component — Wired to DB
 * Uses tm_comments table with entity_type='test_case'
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTestCaseComments, useAddTestCaseComment, useDeleteTestCaseComment } from '@/hooks/test-management/useTestCaseComments';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

const avatarColors: string[] = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-teal-100 text-teal-700',
];

function getAvatarColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return avatarColors[hash % avatarColors.length];
}

function getInitials(name: string | null | undefined): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatTimestamp(dateStr: string): string {
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

interface TestCaseCommentsProps {
  testCaseId?: string;
}

export function TestCaseComments({ testCaseId: propTestCaseId }: TestCaseCommentsProps) {
  const { id: routeId } = useParams<{ id: string }>();
  const testCaseId = propTestCaseId || routeId;
  
  const [newComment, setNewComment] = useState('');

  // Real data from DB
  const { data: comments = [], isLoading } = useTestCaseComments(testCaseId);
  const addCommentMutation = useAddTestCaseComment();
  const deleteCommentMutation = useDeleteTestCaseComment();

  const handleSubmit = async () => {
    if (!newComment.trim() || !testCaseId) return;

    await addCommentMutation.mutateAsync({
      testCaseId,
      content: newComment.trim(),
    });
    
    setNewComment('');
  };

  const handleDelete = async (commentId: string) => {
    if (!testCaseId) return;
    await deleteCommentMutation.mutateAsync({
      commentId,
      testCaseId,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            ME
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Add a comment... (Ctrl+Enter to post)"
            className="min-h-[80px] resize-none"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={addCommentMutation.isPending}
          />
          <div className="flex justify-end mt-2">
            <Button 
              size="sm" 
              onClick={handleSubmit} 
              disabled={!newComment.trim() || addCommentMutation.isPending}
            >
              {addCommentMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Post Comment
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment, index) => (
          <motion.div
            key={comment.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 group"
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              {comment.author?.avatar_url && (
                <AvatarImage src={comment.author.avatar_url} alt={comment.author.full_name || 'User'} />
              )}
              <AvatarFallback
                className={cn('text-xs', getAvatarColor(comment.author_id))}
              >
                {getInitials(comment.author?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {comment.author?.full_name || 'Unknown User'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTimestamp(comment.created_at)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                  onClick={() => handleDelete(comment.id)}
                  disabled={deleteCommentMutation.isPending}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {comments.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No comments yet. Be the first to comment!
        </div>
      )}
    </div>
  );
}