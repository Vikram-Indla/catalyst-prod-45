import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { formatDistanceToNow } from 'date-fns';
import { BusinessRequest } from '@/types/business-request';

interface DiscussionsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

export function DiscussionsViewTab({ data }: DiscussionsViewTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  const requestId = data.id;

  // Fetch discussions
  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['business-request-discussions', requestId],
    queryFn: async () => {
      if (!requestId) return [];
      const { data, error } = await supabase
        .from('business_request_discussions')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId,
  });

  // Add discussion mutation
  const addDiscussion = useMutation({
    mutationFn: async (message: string) => {
      if (!requestId || !user?.id) throw new Error('Missing data');
      
      const { data, error } = await supabase
        .from('business_request_discussions')
        .insert({
          business_request_id: requestId,
          user_id: user.id,
          message,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-discussions', requestId] });
      setNewMessage('');
    },
  });

  const handleSubmit = () => {
    if (newMessage.trim()) {
      addDiscussion.mutate(newMessage.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No discussions yet</p>
            <p className="text-xs mt-1">Start the conversation</p>
          </div>
        ) : (
          discussions.map((discussion: any) => (
            <div key={discussion.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-brand-gold/20 text-brand-gold">
                  {discussion.user_id?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">User</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{discussion.message}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-muted/30">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            rows={2}
            className="bg-background resize-none"
          />
          <Button
            onClick={handleSubmit}
            disabled={!newMessage.trim() || addDiscussion.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
