/**
 * ExecutiveDiscussionsTab - CIO-grade discussions with structured updates
 * Two sub-views: Executive Updates (default) + Activity Log (system)
 */

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  Send, 
  MessageSquare, 
  AtSign, 
  Activity,
  ChevronDown,
  ChevronRight,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface ExecutiveDiscussionsTabProps {
  requestId: string;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

export function ExecutiveDiscussionsTab({ requestId }: ExecutiveDiscussionsTabProps) {
  const [activeView, setActiveView] = useState<'updates' | 'activity'>('updates');
  const [newComment, setNewComment] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [impact, setImpact] = useState<'low' | 'medium' | 'high' | ''>('');
  const [decisionNeeded, setDecisionNeeded] = useState<'yes' | 'no' | ''>('');
  const [category, setCategory] = useState<'delivery' | 'budget' | 'risk' | 'scope' | 'stakeholder' | ''>('');
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
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!requestId
  });

  // Fetch audit logs for activity view
  const { data: activityLogs = [] } = useQuery({
    queryKey: ['business-request-activity', requestId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_request_audit_logs')
        .select('*')
        .eq('business_request_id', requestId)
        .order('created_at', { ascending: false })
        .limit(50);

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

      // Format structured update with metadata JSON
      let formattedMessage = message;
      const meta: Record<string, string> = {};
      if (updateTitle) meta.title = updateTitle;
      if (impact) meta.impact = impact;
      if (decisionNeeded) meta.decision = decisionNeeded;
      if (category) meta.category = category;
      
      // Store metadata as JSON prefix for parsing
      if (Object.keys(meta).length > 0) {
        formattedMessage = `<!--META:${JSON.stringify(meta)}-->${message}`;
      }

      const { error } = await supabase
        .from('business_request_discussions')
        .insert({
          business_request_id: requestId,
          message: formattedMessage,
          user_id: user.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-request-discussions', requestId] });
      setNewComment('');
      setUpdateTitle('');
      setImpact('');
      setDecisionNeeded('');
      setCategory('');
      toast.success('Update posted');
    },
    onError: () => {
      toast.error('Failed to post update');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleMentionSelect = (profile: Profile) => {
    const mentionText = `@${profile.full_name || profile.email}`;
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

  const filteredProfiles = profiles.filter(profile => {
    const searchLower = mentionSearch.toLowerCase();
    return (
      (profile.full_name?.toLowerCase().includes(searchLower)) ||
      profile.email.toLowerCase().includes(searchLower)
    );
  });

  // Parse structured updates from messages (new JSON format + legacy)
  const parseUpdate = (message: string) => {
    // Try new JSON metadata format
    const metaMatch = message.match(/^<!--META:(.+?)-->/);
    if (metaMatch) {
      try {
        const meta = JSON.parse(metaMatch[1]);
        return {
          title: meta.title || null,
          impact: meta.impact || null,
          hasDecision: meta.decision === 'yes',
          category: meta.category || null,
          body: message.replace(/^<!--META:.+?-->/, '').trim()
        };
      } catch {
        // Fall through to legacy parsing
      }
    }
    
    // Legacy format parsing
    const hasDecision = message.includes('**Decision Required**');
    const impactMatch = message.match(/_Impact: (\w+)_/);
    const titleMatch = message.match(/^\*\*(.+?)\*\*/);
    
    return {
      hasDecision,
      impact: impactMatch?.[1]?.toLowerCase() || null,
      title: titleMatch?.[1] || null,
      category: null,
      body: message
        .replace(/^\*\*(.+?)\*\*\n?/, '')
        .replace(/\n\n_Impact: \w+_/, '')
        .replace(/\n⚡ \*\*Decision Required\*\*/, '')
        .trim()
    };
  };
  
  const getCategoryColor = (cat: string | null) => {
    switch (cat) {
      case 'delivery': return 'border-blue-500/50 text-blue-600 bg-blue-500/10';
      case 'budget': return 'border-emerald-500/50 text-emerald-600 bg-emerald-500/10';
      case 'risk': return 'border-amber-500/50 text-amber-600 bg-amber-500/10';
      case 'scope': return 'border-purple-500/50 text-purple-600 bg-purple-500/10';
      case 'stakeholder': return 'border-pink-500/50 text-pink-600 bg-pink-500/10';
      default: return '';
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* View Toggle */}
      <div 
        className="flex items-center gap-2 px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'updates' | 'activity')}>
          <TabsList className="h-8" style={{ background: 'var(--surface-2)' }}>
            <TabsTrigger value="updates" className="text-[11px] px-3 h-7">
              <MessageSquare className="h-3 w-3 mr-1.5" />
              Executive Updates
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-[11px] px-3 h-7">
              <Activity className="h-3 w-3 mr-1.5" />
              Activity Log
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <span className="text-[11px] ml-auto" style={{ color: 'var(--text-3)' }}>
          {activeView === 'updates' ? `${discussions.length} updates` : `${activityLogs.length} events`}
        </span>
      </div>

      {activeView === 'updates' ? (
        <>
          {/* Updates List */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-3 py-4">
              {isLoading ? (
                <div className="text-center py-8 text-[12px]" style={{ color: 'var(--text-3)' }}>
                  Loading updates...
                </div>
              ) : discussions.length === 0 ? (
                <div className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No updates yet</p>
                  <p className="text-[11px]">Post the first executive update</p>
                </div>
              ) : (
                discussions.map((discussion: any) => {
                  const isSystemUser = discussion.user_id === '00000000-0000-0000-0000-000000000000';
                  const profile = profilesMap[discussion.user_id];
                  const displayName = isSystemUser ? 'System' : (profile?.full_name || profile?.email || 'Unknown');
                  const initials = isSystemUser ? 'SY' : getInitials(profile?.full_name, profile?.email);
                  const parsed = parseUpdate(discussion.message);
                  
                  return (
                    <div 
                      key={discussion.id} 
                      className="p-3 rounded-md"
                      style={{ 
                        background: 'var(--surface-2)', 
                        border: '1px solid var(--border-color)' 
                      }}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarFallback 
                            className="text-[10px]"
                            style={{ 
                              background: isSystemUser ? 'var(--surface-3)' : 'var(--accent-muted)',
                              color: isSystemUser ? 'var(--text-3)' : 'var(--accent-color)'
                            }}
                          >
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-medium" style={{ color: 'var(--text-1)' }}>
                              {displayName}
                            </span>
                      {parsed.category && (
                              <Badge 
                                variant="outline" 
                                className={cn("h-4 text-[9px] px-1.5 capitalize", getCategoryColor(parsed.category))}
                              >
                                {parsed.category}
                              </Badge>
                            )}
                            {parsed.impact && (
                              <Badge 
                                variant="outline" 
                                className={cn(
                                  "h-4 text-[9px] px-1.5 capitalize",
                                  parsed.impact === 'high' && "border-amber-500/50 text-amber-600 bg-amber-500/10",
                                  parsed.impact === 'medium' && "border-blue-500/50 text-blue-600 bg-blue-500/10",
                                  parsed.impact === 'low' && "border-green-500/50 text-green-600 bg-green-500/10"
                                )}
                              >
                                {parsed.impact} impact
                              </Badge>
                            )}
                            {parsed.hasDecision && (
                              <Badge 
                                variant="outline" 
                                className="h-4 text-[9px] px-1.5 border-red-500/50 text-red-600 bg-red-500/10"
                              >
                                Decision Needed
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                            {format(new Date(discussion.created_at), 'MMM d, h:mm a')}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content */}
                      {parsed.title && (
                        <div className="text-[12px] font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                          {parsed.title}
                        </div>
                      )}
                      <p 
                        className="text-[12px] whitespace-pre-wrap"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {parsed.body}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Composer */}
          <form 
            onSubmit={handleSubmit} 
            className="p-3 shrink-0 space-y-3" 
            style={{ borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--surface-1)' }}
          >
            {/* Compact structured fields row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                value={updateTitle}
                onChange={(e) => setUpdateTitle(e.target.value)}
                placeholder="Title (optional)"
                className="h-7 text-[11px] w-[140px]"
                style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
              />
              <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                <SelectTrigger 
                  className="h-7 text-[11px] w-[100px]" 
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                >
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)' }}>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="budget">Budget</SelectItem>
                  <SelectItem value="risk">Risk</SelectItem>
                  <SelectItem value="scope">Scope</SelectItem>
                  <SelectItem value="stakeholder">Stakeholder</SelectItem>
                </SelectContent>
              </Select>
              <Select value={impact} onValueChange={(v) => setImpact(v as any)}>
                <SelectTrigger 
                  className="h-7 text-[11px] w-[90px]" 
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                >
                  <SelectValue placeholder="Impact" />
                </SelectTrigger>
                <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)' }}>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Select value={decisionNeeded} onValueChange={(v) => setDecisionNeeded(v as any)}>
                <SelectTrigger 
                  className="h-7 text-[11px] w-[110px]" 
                  style={{ background: 'var(--input-bg)', borderColor: 'var(--input-border)' }}
                >
                  <SelectValue placeholder="Decision?" />
                </SelectTrigger>
                <SelectContent className="z-[400]" style={{ background: 'var(--surface-1)' }}>
                  <SelectItem value="no">No decision</SelectItem>
                  <SelectItem value="yes">Decision needed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message input */}
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write your update..."
                className="min-h-[60px] resize-none pr-10 text-[12px]"
                style={{ 
                  background: 'var(--input-bg)', 
                  borderColor: 'var(--input-border)',
                  color: 'var(--input-text)'
                }}
              />
              <Popover open={mentionOpen} onOpenChange={setMentionOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 h-6 w-6 p-0"
                    style={{ color: 'var(--text-3)' }}
                    onClick={() => setMentionOpen(true)}
                  >
                    <AtSign className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-56 p-0 z-[400]" 
                  align="end"
                  style={{ background: 'var(--surface-1)', borderColor: 'var(--border-color)' }}
                >
                  <Command>
                    <CommandInput 
                      placeholder="Search users..." 
                      value={mentionSearch}
                      onValueChange={setMentionSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No users found.</CommandEmpty>
                      <CommandGroup>
                        {filteredProfiles.slice(0, 5).map((profile) => (
                          <CommandItem
                            key={profile.id}
                            onSelect={() => handleMentionSelect(profile)}
                            className="cursor-pointer text-[11px]"
                          >
                            <Avatar className="h-5 w-5 mr-2">
                              <AvatarFallback className="text-[9px]">
                                {getInitials(profile.full_name, profile.email)}
                              </AvatarFallback>
                            </Avatar>
                            {profile.full_name || profile.email}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                size="sm"
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="h-7 text-[11px]"
                style={{ 
                  background: 'var(--btn-primary-bg)', 
                  color: 'var(--btn-primary-text)' 
                }}
              >
                <Send className="h-3 w-3 mr-1.5" />
                Post Update
              </Button>
            </div>
          </form>
        </>
      ) : (
        /* Activity Log View */
        <ScrollArea className="flex-1 px-4">
          <div className="py-4">
            {activityLogs.length === 0 ? (
              <div className="text-center py-10" style={{ color: 'var(--text-3)' }}>
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-[13px] font-medium" style={{ color: 'var(--text-2)' }}>No activity yet</p>
                <p className="text-[11px]">Changes will appear here</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div 
                  className="absolute left-[11px] top-4 bottom-4 w-px"
                  style={{ background: 'var(--border-color)' }}
                />
                
                {activityLogs.map((log: any, idx: number) => (
                  <div key={log.id} className="flex gap-3 pb-3 relative">
                    {/* Timeline dot */}
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10"
                      style={{ 
                        background: log.action === 'CREATE' ? 'var(--accent-color)' : 'var(--surface-3)',
                        border: '2px solid var(--surface-1)'
                      }}
                    >
                      {log.action === 'CREATE' ? (
                        <span className="text-[9px] text-white font-bold">+</span>
                      ) : (
                        <span className="text-[9px]" style={{ color: 'var(--text-3)' }}>•</span>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium" style={{ color: 'var(--text-1)' }}>
                          {log.actor_name || 'System'}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                          {log.action === 'CREATE' ? 'created' : 'updated'}
                        </span>
                        {log.field_changed && (
                          <span className="text-[11px] font-medium" style={{ color: 'var(--text-2)' }}>
                            {log.field_changed}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {format(new Date(log.created_at), 'MMM d, h:mm a')}
                      </div>
                      {log.old_value !== null && log.new_value !== null && (
                        <div className="mt-1 text-[10px] flex items-center gap-1.5">
                          <span style={{ color: 'var(--text-3)' }}>{log.old_value || '(empty)'}</span>
                          <ChevronRight className="h-3 w-3" style={{ color: 'var(--text-3)' }} />
                          <span style={{ color: 'var(--text-2)' }}>{log.new_value || '(empty)'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
