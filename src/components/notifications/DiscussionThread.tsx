import { useState } from 'react';
import { Send, Trash2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDiscussions } from '@/hooks/useDiscussions';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';

interface DiscussionThreadProps {
  entityType: string;
  entityId: string;
}

export function DiscussionThread({ entityType, entityId }: DiscussionThreadProps) {
  const [message, setMessage] = useState('');
  const { user } = useAuth();
  const { discussions, isLoading, addDiscussion, deleteDiscussion, isAdding } = useDiscussions(entityType, entityId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Extract @mentions
    const mentionMatches = message.match(/@\w+/g);
    const mentions = mentionMatches?.map(m => m.substring(1)) || [];

    addDiscussion({ message, mentions });
    setMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground">Loading discussions...</div>
        ) : discussions.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>No discussions yet</p>
            <p className="text-xs mt-1">Start the conversation</p>
          </div>
        ) : (
          <div className="space-y-4">
            {discussions.map((discussion) => (
              <div key={discussion.id} className="border-b pb-4 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">User {discussion.user_id.substring(0, 8)}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{discussion.message}</p>
                  </div>
                  {user?.id === discussion.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => deleteDiscussion(discussion.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="space-y-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a comment... Use @username to mention"
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <AtSign className="h-3 w-3" />
              Use @username to mention someone
            </div>
            <Button type="submit" size="sm" disabled={!message.trim() || isAdding}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
