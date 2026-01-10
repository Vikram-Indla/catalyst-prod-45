/**
 * Test Case Comments Component
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { comments as initialCommentsData } from '@/data/testCaseDetailData';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Comment {
  id: number | string;
  author: { name: string; avatar: string; color: string };
  content: string;
  timestamp: string;
}

const avatarColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function TestCaseComments() {
  const [comments, setComments] = useState<Comment[]>(initialCommentsData);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: `comment-${Date.now()}`,
        author: { name: 'Vikram S.', avatar: 'VS', color: 'blue' },
        content: newComment.trim(),
        timestamp: 'Just now',
      };
      setComments([comment, ...comments]);
      setNewComment('');
      toast.success('Comment posted');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Comment Form */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">
            VS
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Add a comment... (Ctrl+Enter to post)"
            className="min-h-[80px] resize-none"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex justify-end mt-2">
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim()}>
              <Send className="w-4 h-4 mr-1.5" />
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
            className="flex gap-3"
          >
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback
                className={cn('text-xs', avatarColors[comment.author.color] || avatarColors.blue)}
              >
                {comment.author.avatar}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-foreground">
                  {comment.author.name}
                </span>
                <span className="text-xs text-muted-foreground">{comment.timestamp}</span>
              </div>
              <p className="text-sm text-muted-foreground">{comment.content}</p>
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
