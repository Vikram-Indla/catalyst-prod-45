// ==============================================
// IDEA DETAIL PANEL (Slide-out Drawer)
// Based on EpicDetailsPanel pattern
// ==============================================

import { useState, useRef } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { X, MoreVertical, MessageSquare, Paperclip, Bell, BellOff, Upload, Trash2, FileText, Image, File } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useUpdateIdea, useIdeaComments, useCreateComment, useIdeaAttachments, useUploadAttachment, useDeleteAttachment } from '@/hooks/useIdeation';
import { toast } from 'sonner';
import type { Idea, IdeaStatus, TShirtSize } from '@/types/ideation';
import { IDEA_STATUS_COLORS, T_SHIRT_SIZE_ORDER } from '@/types/ideation';

interface IdeaDetailPanelProps {
  idea: Idea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubscribed: boolean;
  onToggleSubscribe: () => void;
  userId: string;
}

export function IdeaDetailPanel({
  idea,
  open,
  onOpenChange,
  isSubscribed,
  onToggleSubscribe,
  userId,
}: IdeaDetailPanelProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [newComment, setNewComment] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateIdea = useUpdateIdea();
  const { data: comments = [], isLoading: commentsLoading } = useIdeaComments(idea?.id || '');
  const createComment = useCreateComment();
  const { data: attachments = [], isLoading: attachmentsLoading } = useIdeaAttachments(idea?.id || '');
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType.includes('pdf') || fileType.includes('document')) return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const handleStatusChange = async (status: IdeaStatus) => {
    if (!idea) return;
    try {
      await updateIdea.mutateAsync({ id: idea.id, status });
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSizeChange = async (size: TShirtSize) => {
    if (!idea) return;
    try {
      await updateIdea.mutateAsync({ id: idea.id, t_shirt_size: size });
      toast.success('Size updated');
    } catch {
      toast.error('Failed to update size');
    }
  };

  const handleAddComment = async () => {
    if (!idea || !newComment.trim()) return;
    try {
      await createComment.mutateAsync({
        ideaId: idea.id,
        content: newComment.trim(),
      });
      setNewComment('');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !idea) return;

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File ${file.name} is too large (max 10MB)`);
        continue;
      }
      try {
        await uploadAttachment.mutateAsync({ ideaId: idea.id, file });
      } catch {
        // Error handled in hook
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId: string, fileUrl: string) => {
    if (!idea) return;
    try {
      await deleteAttachment.mutateAsync({ attachmentId, ideaId: idea.id, fileUrl });
    } catch {
      // Error handled in hook
    }
  };

  if (!idea) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-[600px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn('text-xs', IDEA_STATUS_COLORS[idea.status as IdeaStatus])}
              >
                {idea.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(idea.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleSubscribe}
              >
                {isSubscribed ? (
                  <BellOff className="h-4 w-4" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Duplicate</DropdownMenuItem>
                  <DropdownMenuItem>Move to Backlog</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <SheetTitle className="text-left mt-2">{idea.title}</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="w-full justify-start rounded-none border-b px-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              Comments ({idea.comment_count})
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Attachments ({attachments.length})
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-auto p-4 space-y-6">
            {/* Description */}
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {idea.description || 'No description provided.'}
              </p>
            </div>

            {/* Status */}
            <div>
              <h4 className="text-sm font-medium mb-2">Status</h4>
              <Select value={idea.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Shelved">Shelved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* T-Shirt Size */}
            <div>
              <h4 className="text-sm font-medium mb-2">T-Shirt Size</h4>
              <Select
                value={idea.t_shirt_size || ''}
                onValueChange={(v) => handleSizeChange(v as TShirtSize)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {T_SHIRT_SIZE_ORDER.map((size) => (
                    <SelectItem key={size} value={size}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vote Score */}
            <div>
              <h4 className="text-sm font-medium mb-2">Vote Score</h4>
              <div className="flex items-center gap-4">
                <span className="text-2xl font-semibold">{idea.vote_score}</span>
                <div className="text-sm text-muted-foreground">
                  <span className="text-green-600">{idea.for_votes} for</span>
                  {' / '}
                  <span className="text-red-600">{idea.against_votes} against</span>
                </div>
              </div>
            </div>

            {/* Owner */}
            <div>
              <h4 className="text-sm font-medium mb-2">Owner</h4>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={idea.owner?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(idea.owner?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{idea.owner?.full_name || 'Unassigned'}</span>
              </div>
            </div>

            {/* Created By */}
            <div>
              <h4 className="text-sm font-medium mb-2">Created By</h4>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={idea.created_by?.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(idea.created_by?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{idea.created_by?.full_name || 'Unknown'}</span>
                <span className="text-xs text-muted-foreground">
                  on {format(new Date(idea.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Add Comment */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                />
                <Button
                  size="sm"
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || createComment.isPending}
                >
                  Add Comment
                </Button>
              </div>

              {/* Comments List */}
              {commentsLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">No comments yet.</div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={comment.user?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(comment.user?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {comment.user?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Attachments Tab */}
          <TabsContent value="attachments" className="flex-1 overflow-auto p-4">
            <div className="space-y-4">
              {/* Upload Button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadAttachment.isPending}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadAttachment.isPending ? 'Uploading...' : 'Upload File'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">Max file size: 10MB</p>
              </div>

              {/* Attachments List */}
              {attachmentsLoading ? (
                <div className="text-center text-muted-foreground py-4">Loading attachments...</div>
              ) : attachments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No attachments yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 text-muted-foreground">
                        {getFileIcon(attachment.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <a
                          href={attachment.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline truncate block"
                        >
                          {attachment.file_name}
                        </a>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(attachment.file_size)} • {format(new Date(attachment.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteAttachment(attachment.id, attachment.file_url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
