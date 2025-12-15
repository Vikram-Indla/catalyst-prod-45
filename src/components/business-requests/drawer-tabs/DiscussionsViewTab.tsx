import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Send, MessageSquare, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface DiscussionsViewTabProps {
  requestId: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

export function DiscussionsViewTab({ requestId }: DiscussionsViewTabProps) {
  const [newComment, setNewComment] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  // Fetch all profiles for @mentions
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-mentions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch discussions for this request
  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['business-request-discussions', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_discussions')
        .select('id, message, user_id, created_at')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId
  });

  // Create a map of user_ids to profiles
  const profilesMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<string, Profile>);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('business_request_discussions')
        .insert({
          business_request_id: requestId,
          message,
          user_id: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-discussions', requestId] });
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

  const handleMentionSelect = (profile: Profile) => {
    const mentionText = `@[${profile.full_name || profile.email}](${profile.id})`;
    setNewComment(prev => prev + mentionText + ' ');
    setMentionOpen(false);
    textareaRef.current?.focus();
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

  // Format message to display mentions nicely
  const formatMessage = (message: string) => {
    return message.replace(/@\[([^\]]+)\]\([^)]+\)/g, (_, name) => {
      return `<span class="text-brand-gold font-medium">@${name}</span>`;
    });
  };

  const filteredProfiles = profiles.filter(profile => {
    const searchLower = mentionSearch.toLowerCase();
    return (
      (profile.full_name?.toLowerCase().includes(searchLower)) ||
      profile.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex flex-col h-[500px]" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Header */}
      <div 
        className="flex items-center gap-2 px-6 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--surface-1)' }}
      >
        <MessageSquare className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--accent-color)' }} />
        <h3 className="text-[15px] font-semibold uppercase tracking-wide" style={{ color: 'var(--accent-color)' }}>Discussions</h3>
        <span className="text-[13px]" style={{ color: 'var(--text-2)' }}>({discussions.length} comments)</span>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 px-6">
        <div className="space-y-4 py-4">
          {isLoading ? (
            <div className="text-center py-8 text-[13px]" style={{ color: 'var(--text-3)' }}>
              Loading discussions...
            </div>
          ) : discussions.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--text-3)' }}>
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="text-[15px] font-medium" style={{ color: 'var(--text-2)' }}>No discussions yet</p>
              <p className="text-[13px]">Start the conversation about this request</p>
            </div>
          ) : (
            discussions.map((discussion: any) => {
              const isSystemUser = discussion.user_id === '00000000-0000-0000-0000-000000000000';
              const profile = profilesMap[discussion.user_id];
              const displayName = isSystemUser ? 'System' : (profile?.full_name || profile?.email || 'Unknown User');
              const initials = isSystemUser ? 'SY' : getInitials(profile?.full_name, profile?.email);
              
              return (
                <Card key={discussion.id} className="p-4 bg-card border-border/60">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={`text-xs ${isSystemUser ? 'bg-muted text-muted-foreground' : 'bg-brand-gold/10 text-brand-gold'}`}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-[13px] ${isSystemUser ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                          {displayName}
                        </span>
                        <span className="text-[12px] text-muted-foreground">
                          {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p 
                        className="text-[13px] text-foreground whitespace-pre-wrap"
                        dangerouslySetInnerHTML={{ __html: formatMessage(discussion.message) }}
                      />
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="p-4 shrink-0" style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-1)' }}>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... Use @ to mention team members"
              className="min-h-[80px] resize-none pr-10 text-[13px] bg-muted/30 border-border/60 focus:border-brand-gold"
            />
            <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-7 w-7 p-0 text-muted-foreground hover:text-brand-gold"
                  onClick={() => setMentionOpen(true)}
                >
                  <AtSign className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput 
                    placeholder="Search users..." 
                    value={mentionSearch}
                    onValueChange={setMentionSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup heading="Team Members">
                      {filteredProfiles.map((profile) => (
                        <CommandItem
                          key={profile.id}
                          onSelect={() => handleMentionSelect(profile)}
                          className="cursor-pointer"
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarFallback className="text-xs">
                              {getInitials(profile.full_name, profile.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-[13px] font-medium">
                              {profile.full_name || 'No name'}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {profile.email}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex justify-end mt-3">
          <Button 
            type="submit" 
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </div>
  );
}