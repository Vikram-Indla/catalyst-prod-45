import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Edit, Bell, BellOff, Paperclip, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast as showToast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";

interface QuickActionsPanelProps {
  epicId: string;
  epicName: string;
  onUpdate?: () => void;
}

export function QuickActionsPanel({ epicId, epicName, onUpdate }: QuickActionsPanelProps) {
  const queryClient = useQueryClient();
  const [isFastEditOpen, setIsFastEditOpen] = useState(false);
  const [isAttachmentsOpen, setIsAttachmentsOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [editedName, setEditedName] = useState(epicName);
  const [newComment, setNewComment] = useState("");

  // Subscription state
  const { data: subscription } = useQuery({
    queryKey: ['epic-subscription', epicId],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('entity_id', epicId)
        .eq('user_id', user.user.id)
        .eq('type', 'subscription')
        .maybeSingle();
      
      return data;
    },
  });

  // Fetch attachments
  const { data: attachments } = useQuery({
    queryKey: ['attachments', epicId],
    queryFn: async () => {
      const { data } = await supabase
        .from('attachments')
        .select('*')
        .eq('entity_type', 'epic')
        .eq('entity_id', epicId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fetch comments
  const { data: comments } = useQuery({
    queryKey: ['comments', epicId],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select('*')
        .eq('entity_type', 'epic')
        .eq('entity_id', epicId)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  // Fast Edit mutation
  const fastEditMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from('epics')
        .update({ name: newName })
        .eq('id', epicId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      showToast.success('Epic name updated successfully');
      setIsFastEditOpen(false);
      onUpdate?.();
    },
    onError: () => {
      showToast.error('Failed to update epic name');
    },
  });

  // Subscribe/Unsubscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      if (subscription) {
        // Unsubscribe
        await supabase
          .from('notifications')
          .delete()
          .eq('id', subscription.id);
      } else {
        // Subscribe
        await supabase
          .from('notifications')
          .insert({
            user_id: user.user.id,
            entity_id: epicId,
            entity_type: 'epic',
            type: 'subscription',
            title: `Subscribed to ${epicName}`,
            read: true,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epic-subscription', epicId] });
      showToast.success(subscription ? 'Unsubscribed successfully' : 'Subscribed successfully');
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('comments')
        .insert({
          entity_type: 'epic',
          entity_id: epicId,
          user_id: user.user.id,
          content,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', epicId] });
      setNewComment("");
      showToast.success('Comment added successfully');
    },
  });

  // Upload attachment mutation
  const uploadAttachmentMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileName = `${epicId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { error: dbError } = await supabase
        .from('attachments')
        .insert({
          entity_type: 'epic',
          entity_id: epicId,
          uploaded_by: user.user.id,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', epicId] });
      showToast.success('Attachment uploaded successfully');
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadAttachmentMutation.mutate(file);
    }
  };

  return (
    <>
      <div className="space-y-[var(--s2)] px-[var(--s4)] py-[var(--s4)] border-t">
        <h3 className="text-sm font-medium mb-[var(--s3)]">Quick Actions</h3>
        
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setEditedName(epicName);
            setIsFastEditOpen(true);
          }}
        >
          <Edit className="h-4 w-4 mr-2" />
          Fast Edit
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => subscribeMutation.mutate()}
        >
          {subscription ? (
            <>
              <BellOff className="h-4 w-4 mr-2" />
              Unsubscribe
            </>
          ) : (
            <>
              <Bell className="h-4 w-4 mr-2" />
              Subscribe
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setIsAttachmentsOpen(true)}
        >
          <Paperclip className="h-4 w-4 mr-2" />
          Attachments ({attachments?.length || 0})
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => setIsCommentsOpen(true)}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Comments ({comments?.length || 0})
        </Button>
      </div>

      {/* Fast Edit Dialog */}
      <Dialog open={isFastEditOpen} onOpenChange={setIsFastEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fast Edit Epic Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-[var(--s4)]">
            <div>
              <Label>Epic Name</Label>
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Enter epic name"
              />
            </div>
            <div className="flex justify-end gap-[var(--s2)]">
              <Button variant="outline" onClick={() => setIsFastEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => fastEditMutation.mutate(editedName)}
                disabled={!editedName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Attachments Dialog */}
      <Dialog open={isAttachmentsOpen} onOpenChange={setIsAttachmentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attachments</DialogTitle>
          </DialogHeader>
          <div className="space-y-[var(--s4)]">
            <div>
              <Label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                  <Paperclip className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </p>
                </div>
                <Input
                  id="file-upload"
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </Label>
            </div>
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {attachments?.map((attachment) => (
                  <div
                    key={attachment.id}
                     className="flex items-center gap-[var(--s2)] px-[var(--s2)] py-[var(--s2)] border rounded-lg"
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.file_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(attachment.file_size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                ))}
                {!attachments?.length && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No attachments yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments Dialog */}
      <Dialog open={isCommentsOpen} onOpenChange={setIsCommentsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <Button
                onClick={() => addCommentMutation.mutate(newComment)}
                disabled={!newComment.trim()}
                className="w-full"
              >
                Add Comment
              </Button>
            </div>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {comments?.map((comment) => (
                  <div key={comment.id} className="flex gap-[var(--s3)] px-[var(--s3)] py-[var(--s3)] border rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-[var(--s2)] mb-1">
                        <p className="text-sm font-medium">User</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))}
                {!comments?.length && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
