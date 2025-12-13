// Risk Discussions Tab - Comments and discussions on risks
// Source: Implementation Spec Section 5

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface RiskDiscussionsTabProps {
  riskId: string;
}

export function RiskDiscussionsTab({ riskId }: RiskDiscussionsTabProps) {
  const [newComment, setNewComment] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['risk-discussions', riskId],
    queryFn: async () => {
      // Fetch discussions without join (no FK relationship exists)
      const { data, error } = await supabase
        .from('discussions')
        .select('id, message, created_at, updated_at, user_id')
        .eq('entity_type', 'risks')
        .eq('entity_id', riskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Enrich with user profiles separately
      const enrichedDiscussions = await Promise.all(
        (data || []).map(async (discussion) => {
          let profile = null;
          if (discussion.user_id) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', discussion.user_id)
              .single();
            profile = profileData;
          }
          return { ...discussion, profiles: profile };
        })
      );
      
      return enrichedDiscussions;
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (message: string) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('discussions')
        .insert([{
          entity_type: 'risks',
          entity_id: riskId,
          message,
          user_id: user.data.user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['risk-discussions', riskId] });
      setNewComment("");
      toast({
        title: "Comment Added",
        description: "Your comment has been posted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment);
    }
  };

  const getUserInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  return (
    <div className="space-y-4">
      {/* Add Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="bg-brand-gold hover:bg-brand-gold-hover text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            {addCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-text-muted">
            <MessageSquare className="h-5 w-5 mr-2" />
            Loading discussions...
          </div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          discussions.map((discussion: any) => (
            <div key={discussion.id} className="flex gap-3 p-3 border rounded-lg bg-card">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="bg-brand-gold text-white text-xs">
                  {getUserInitials(
                    discussion.profiles?.full_name,
                    discussion.profiles?.email || 'U'
                  )}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-sm font-medium text-text-primary">
                    {discussion.profiles?.full_name || discussion.profiles?.email || 'Unknown User'}
                  </span>
                  <span className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap">
                  {discussion.message}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
