import { useState, useRef } from 'react';
import { useWorkItemComments, useMentionableUsers } from '@/hooks/useWorkItemComments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Send, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface WorkItemCommentsSectionProps {
  entityType: 'epic' | 'feature' | 'story';
  entityId: string;
}

export function WorkItemCommentsSection({ entityType, entityId }: WorkItemCommentsSectionProps) {
  const [newComment, setNewComment] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { comments, isLoading, createComment, updateComment, deleteComment, isCreating } = 
    useWorkItemComments(entityType, entityId);
  const { data: users = [] } = useMentionableUsers();

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment(newComment.trim());
    setNewComment('');
  };

  const handleUpdate = (commentId: string) => {
    if (!editContent.trim()) return;
    updateComment({ commentId, content: editContent.trim() });
    setEditingId(null);
    setEditContent('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '@') {
      setShowMentions(true);
    }
    if (e.key === 'Escape') {
      setShowMentions(false);
    }
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const insertMention = (userName: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBefore = newComment.slice(0, cursorPos);
    const textAfter = newComment.slice(cursorPos);
    
    // Find the last @ before cursor
    const lastAtIndex = textBefore.lastIndexOf('@');
    if (lastAtIndex >= 0) {
      const newText = textBefore.slice(0, lastAtIndex) + `@${userName} ` + textAfter;
      setNewComment(newText);
    } else {
      setNewComment(newComment + `@${userName} `);
    }
    setShowMentions(false);
    textarea.focus();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const highlightMentions = (content: string) => {
    return content.replace(
      /@(\w+)/g,
      '<span class="text-brand-gold font-medium">@$1</span>'
    );
  };

  if (isLoading) {
    return (
      <Card className="border border-border/60 rounded-lg">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading comments...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/60 rounded-lg">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-4 w-4 text-brand-gold" />
          <Label className="font-semibold">Comments ({comments.length})</Label>
        </div>

        {/* New Comment Input */}
        <div className="space-y-2 mb-4">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Add a comment... Use @ to mention someone"
              rows={3}
              className="resize-none pr-10"
            />
            <Popover open={showMentions} onOpenChange={setShowMentions}>
              <PopoverTrigger asChild>
                <span />
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="text-xs font-medium text-muted-foreground mb-2">Mention someone</div>
                <div className="max-h-48 overflow-auto space-y-1">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-accent"
                      onClick={() => insertMention(user.full_name || user.email || '')}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-brand-gold/20 text-brand-gold">
                          {getInitials(user.full_name || user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{user.full_name || user.email}</span>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!newComment.trim() || isCreating}
              className="gap-1"
            >
              {isCreating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Post
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No comments yet</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-accent/30">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-brand-gold/20 text-brand-gold">
                    {getInitials(comment.user_name || 'U')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.user_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteComment(comment.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="resize-none"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdate(comment.id)}>Save</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <p 
                      className="text-sm mt-1 whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: highlightMentions(comment.content) }}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
