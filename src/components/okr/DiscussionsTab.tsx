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
    return <div className="p-4 text-center text-[#57606A] dark:text-[#8B949E]">Loading discussions...</div>;
  }

  return (
    <div className="space-y-4 bg-white dark:bg-[#161B22]">
      <div className="p-4 border border-[#E1E4E8] dark:border-[#30363D] rounded-lg bg-white dark:bg-[#0D1117]">
        <div className="space-y-3">
          <textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-[#E1E4E8] dark:border-[#30363D] bg-white dark:bg-[#0D1117] px-3 py-2 text-sm text-[#24292F] dark:text-[#E6EDF3] placeholder:text-[#8B949E] dark:placeholder:text-[#6E7681] focus:outline-none focus:ring-1 focus:ring-[#2563eb] focus:border-[#2563eb]"
          />
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!newComment.trim() || addCommentMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-[#2563eb] hover:bg-[#1d4ed8] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
              Post Comment
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="p-8 text-center text-[#57606A] dark:text-[#8B949E] border border-[#E1E4E8] dark:border-[#30363D] rounded-lg bg-white dark:bg-[#0D1117]">
            No discussions yet. Start the conversation!
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="p-4 border border-[#E1E4E8] dark:border-[#30363D] rounded-lg bg-white dark:bg-[#0D1117]">
              <div className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#F6F8FA] dark:bg-[#21262D] text-[#57606A] dark:text-[#8B949E]">U</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#24292F] dark:text-[#E6EDF3]">User</span>
                    <span className="text-xs text-[#8B949E] dark:text-[#6E7681]">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-[#57606A] dark:text-[#8B949E] whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
