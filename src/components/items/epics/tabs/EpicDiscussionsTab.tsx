import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface EpicDiscussionsTabProps {
  epic: any;
}

export function EpicDiscussionsTab({ epic }: EpicDiscussionsTabProps) {
  const [newComment, setNewComment] = useState('');
  const queryClient = useQueryClient();

  // Fetch discussions for this epic
  const { data: discussions, isLoading } = useQuery({
    queryKey: ['epic-discussions', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .select(`
          id,
          message,
          user_id,
          created_at,
          profiles(full_name, email)
        `)
        .eq('entity_type', 'epic')
        .eq('entity_id', epic.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('discussions')
        .insert({
          entity_type: 'epic',
          entity_id: epic.id,
          message,
          user_id: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-discussions', epic.id] });
      setNewComment('');
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Discussions</h3>
        <span className="text-sm text-muted-foreground">
          ({discussions?.length || 0} comments)
        </span>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-4 pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading discussions...
            </div>
          ) : discussions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No discussions yet</p>
              <p className="text-sm">Start the conversation about this epic</p>
            </div>
          ) : (
            discussions?.map((discussion: any) => (
              <Card key={discussion.id} className="p-4">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        discussion.profiles?.full_name,
                        discussion.profiles?.email
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {discussion.profiles?.full_name || discussion.profiles?.email || 'Unknown User'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{discussion.message}</p>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment... Use @mention to notify team members"
            className="min-h-[80px] resize-none"
          />
        </div>
        <div className="flex justify-end mt-2">
          <Button 
            type="submit" 
            disabled={!newComment.trim() || addCommentMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}
