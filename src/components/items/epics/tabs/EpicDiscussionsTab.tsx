import { useState, useRef, useEffect } from 'react';
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

interface EpicDiscussionsTabProps {
  epic: any;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

export function EpicDiscussionsTab({ epic }: EpicDiscussionsTabProps) {
  const [newComment, setNewComment] = useState('');
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [selectedMentions, setSelectedMentions] = useState<string[]>([]);
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

  // Fetch discussions for this epic
  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['epic-discussions', epic.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discussions')
        .select('id, message, user_id, created_at')
        .eq('entity_type', 'epic')
        .eq('entity_id', epic.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Create a map of user_ids to profiles
  const profilesMap = profiles.reduce((acc, profile) => {
    acc[profile.id] = profile;
    return acc;
  }, {} as Record<string, Profile>);

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ message, mentions }: { message: string; mentions: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Insert discussion
      const { data: discussion, error } = await supabase
        .from('discussions')
        .insert({
          entity_type: 'epic',
          entity_id: epic.id,
          message,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      // Insert mentions if any
      if (mentions.length > 0 && discussion) {
        const mentionInserts = mentions.map(userId => ({
          discussion_id: discussion.id,
          mentioned_user_id: userId,
        }));

        await supabase.from('discussion_mentions').insert(mentionInserts);
      }

      return discussion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-discussions', epic.id] });
      setNewComment('');
      setSelectedMentions([]);
      toast.success('Comment added');
    },
    onError: (error) => {
      console.error('Failed to add comment:', error);
      toast.error('Failed to add comment');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    
    // Extract @mentions from the message
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(newComment)) !== null) {
      mentions.push(match[2]); // capture the user id
    }
    
    addCommentMutation.mutate({ message: newComment.trim(), mentions });
  };

  const handleMentionSelect = (profile: Profile) => {
    const mentionText = `@[${profile.full_name || profile.email}](${profile.id})`;
    setNewComment(prev => prev + mentionText + ' ');
    setSelectedMentions(prev => [...prev, profile.id]);
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
    // Replace @[name](id) with styled mention
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
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Discussions</h3>
        <span className="text-sm text-muted-foreground">
          ({discussions.length} comments)
        </span>
      </div>

      {/* Comments List */}
      <ScrollArea className="flex-1 mb-4">
        <div className="space-y-4 pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading discussions...
            </div>
          ) : discussions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No discussions yet</p>
              <p className="text-sm">Start the conversation about this epic</p>
            </div>
          ) : (
            discussions.map((discussion: any) => {
              const profile = profilesMap[discussion.user_id];
              return (
                <Card key={discussion.id} className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-brand-gold/10 text-brand-gold">
                        {getInitials(profile?.full_name, profile?.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">
                          {profile?.full_name || profile?.email || 'Unknown User'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(discussion.created_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p 
                        className="text-sm whitespace-pre-wrap"
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
      <form onSubmit={handleSubmit} className="border-t pt-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment... Use @ to mention team members"
              className="min-h-[80px] resize-none pr-10"
            />
            <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2 h-7 w-7 p-0"
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
                            <span className="text-sm font-medium">
                              {profile.full_name || 'No name'}
                            </span>
                            <span className="text-xs text-muted-foreground">
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
        <div className="flex justify-end mt-2">
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
