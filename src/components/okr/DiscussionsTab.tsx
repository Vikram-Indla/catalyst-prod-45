import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Send } from "lucide-react";

interface DiscussionsTabProps {
  objectiveId: string;
}

export function DiscussionsTab({ objectiveId }: DiscussionsTabProps) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["comments", objectiveId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("entity_type", "objective")
        .eq("entity_id", objectiveId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("comments").insert({
        entity_type: "objective",
        entity_id: objectiveId,
        content,
        user_id: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", objectiveId] });
      setNewComment("");
      toast.success("Comment added");
    },
    onError: () => {
      toast.error("Failed to add comment");
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    addCommentMutation.mutate(newComment);
  };

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Loading discussions...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="space-y-3">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              size="sm"
            >
              <Send className="w-4 h-4 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            No discussions yet. Start the conversation!
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="p-4">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">User</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
