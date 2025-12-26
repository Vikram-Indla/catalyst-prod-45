import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, MessageSquare, Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { format } from 'date-fns';
import { BusinessRequest } from '@/types/business-request';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DiscussionsViewTabProps {
  data: Partial<BusinessRequest> & Record<string, any>;
  onChange: (field: string, value: any) => void;
  onDirtyChange?: (isDirty: boolean) => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export function DiscussionsViewTab({ data }: DiscussionsViewTabProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState('');

  const requestId = data.id;

  // Fetch all profiles for user name display
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-discussions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Create a map of user_ids to profiles
  const profilesMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<string, Profile>);

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

  const getInitials = (name: string | null | undefined, email: string | null | undefined) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Format message to display mentions nicely and support markdown-like formatting
  const formatMessage = (message: string) => {
    // Handle bold text with **
    let formatted = message.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Handle italic text with _
    formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');
    // Handle @mentions
    formatted = formatted.replace(/@\[([^\]]+)\]\([^)]+\)/g, (_, name) => {
      return `<span class="text-[#2563eb] font-medium">@${name}</span>`;
    });
    return formatted;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages List */}
      <ScrollArea className="flex-1 p-6">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading...</div>
          ) : discussions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No discussions yet</p>
              <p className="text-xs mt-1">Start the conversation</p>
            </div>
          ) : (
            discussions.map((discussion: any) => {
              const isSystemUser = discussion.user_id === SYSTEM_USER_ID;
              const profile = profilesMap[discussion.user_id];
              const displayName = isSystemUser 
                ? 'External Submission' 
                : (profile?.full_name || profile?.email || 'Unknown User');
              const initials = isSystemUser ? 'EX' : getInitials(profile?.full_name, profile?.email);

              return (
                <div 
                  key={discussion.id} 
                  className={`flex gap-3 p-4 rounded-lg border ${
                    isSystemUser 
                      ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30' 
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback 
                      className={`text-xs ${
                        isSystemUser 
                          ? 'bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-400' 
                          : 'bg-[#2563eb]/20 text-[#2563eb]'
                      }`}
                    >
                      {isSystemUser ? <Bot className="h-4 w-4" /> : initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-medium ${
                        isSystemUser ? 'text-amber-700 dark:text-amber-400' : 'text-foreground'
                      }`}>
                        {displayName}
                      </span>
                      {isSystemUser && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200/50 dark:bg-amber-700/30 text-amber-700 dark:text-amber-300 uppercase font-medium">
                          System
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p 
                      className="text-sm whitespace-pre-wrap text-foreground"
                      dangerouslySetInnerHTML={{ __html: formatMessage(discussion.message) }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="border-t p-4 bg-muted/30 shrink-0">
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
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
