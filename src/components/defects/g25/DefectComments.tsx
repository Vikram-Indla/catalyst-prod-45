import { useState } from 'react';
import { Send, MoreVertical, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useDefectCommentsG25, useCreateDefectCommentG25, useDeleteDefectCommentG25 } from '@/hooks/useDefectsG25';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export function DefectComments({ defectId }: { defectId: string }) {
  const { data: comments, isLoading } = useDefectCommentsG25(defectId);
  const create = useCreateDefectCommentG25();
  const del = useDeleteDefectCommentG25();
  const [text, setText] = useState('');

  const handleSubmit = async () => {
    if (!text.trim()) return;
    await create.mutateAsync({ defectId, comment: text.trim() });
    setText('');
  };

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  return (
    <div className="space-y-4">
      {comments?.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No comments yet</p>
      ) : (
        <div className="space-y-3">
          {comments?.map(c => (
            <div key={c.id} className="flex gap-3 p-3 rounded-lg bg-muted/50">
              <Avatar className="h-8 w-8">
                <AvatarImage src={c.creator?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">{c.creator?.full_name?.slice(0, 2).toUpperCase() || '??'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{c.creator?.full_name || 'Unknown'}</span>
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                    {c.updated_at && new Date(c.updated_at).getTime() - new Date(c.created_at).getTime() > 1000 && (
                      <span className="text-xs text-muted-foreground italic">(edited)</span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0"><MoreVertical className="h-3 w-3" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-destructive" onClick={() => del.mutate({ commentId: c.id, defectId })}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <p className="text-sm whitespace-pre-wrap">{c.comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 items-start">
        <Textarea placeholder="Add a comment... (Ctrl+Enter to send)" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(); }} rows={2} className="resize-none" />
        <Button size="sm" onClick={handleSubmit} disabled={!text.trim() || create.isPending}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
