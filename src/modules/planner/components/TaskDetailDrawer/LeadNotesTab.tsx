/**
 * LEAD NOTES TAB - Enterprise Clean V2
 * Private notes for workstream leads and management
 * Shows author name, avatar, and timestamp for each note
 * Supports @mentions for tagging users
 */

import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { Avatar } from '@/components/ads';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { FileText, Pencil, Trash2, Send, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useLeadNotes,
  useCanManageLeadNotes,
  useAddLeadNote,
  useUpdateLeadNote,
  useDeleteLeadNote,
  LeadNote,
} from '../../hooks/useLeadNotes';
import { useAuth } from '@/lib/auth';
import { MentionTextarea, MentionText } from '@/components/shared/MentionTextarea';

interface LeadNotesTabProps {
  taskId: string;
  workstreamId: string | null;
}

export function LeadNotesTab({ taskId, workstreamId }: LeadNotesTabProps) {
  const { user } = useAuth();
  const { data: notes, isLoading } = useLeadNotes(taskId);
  const { canManage, isLoading: accessLoading } = useCanManageLeadNotes(workstreamId);
  
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  const addMutation = useAddLeadNote();
  const updateMutation = useUpdateLeadNote();
  const deleteMutation = useDeleteLeadNote();

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    await addMutation.mutateAsync({ taskId, content: newNote.trim() });
    setNewNote('');
  };

  const handleStartEdit = (note: LeadNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editContent.trim()) return;
    
    await updateMutation.mutateAsync({ 
      noteId, 
      content: editContent.trim(), 
      taskId 
    });
    setEditingId(null);
    setEditContent('');
  };

  const handleDelete = async (noteId: string) => {
    await deleteMutation.mutateAsync({ noteId, taskId });
  };

  if (isLoading || accessLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add new note - only if can manage */}
      {canManage && (
        <div className="rounded-xl border border-border-default bg-surface-1/50 p-4">
          <div className="flex items-start gap-3">
            <span className="shrink-0">
              <Avatar name={user?.user_metadata?.full_name || user?.email || '??'} size="small" />
            </span>
            <div className="flex-1 space-y-3">
              <MentionTextarea
                value={newNote}
                onChange={setNewNote}
                placeholder="Add a note for the team... (Type @ to mention)"
                minHeight="80px"
                className="bg-background border-border-subtle focus:border-brand-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAddNote();
                  }
                }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-tertiary">
                  Press ⌘+Enter to save
                </span>
                <Button
                  size="sm"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addMutation.isPending}
                  className="gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Add Note
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes list */}
      <div className="space-y-4">
        {notes && notes.length > 0 ? (
          notes.map((note) => {
            const isEditing = editingId === note.id;
            const isAuthor = user?.id === note.author_id;
            const canEditThis = canManage || isAuthor;
            
            return (
              <div
                key={note.id}
                className={cn(
                  "group rounded-xl border bg-surface-0 p-4 transition-all",
                  isEditing 
                    ? "border-brand-primary shadow-sm" 
                    : "border-border-default hover:border-border-strong"
                )}
              >
                {/* Note header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={note.author?.avatar_url || undefined} name={note.author?.full_name || note.author?.email || '??'} size="small" />
                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {note.author?.full_name || note.author?.email || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-text-tertiary">
                        <span>{format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}</span>
                        {note.updated_at !== note.created_at && (
                          <>
                            <span>·</span>
                            <span className="italic">
                              edited {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions - show on hover or when editing */}
                  {canEditThis && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-text-secondary hover:text-brand-primary"
                        onClick={() => handleStartEdit(note)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-text-secondary hover:text-destructive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Note</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete this note. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(note.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>

                {/* Note content */}
                {isEditing ? (
                  <div className="space-y-3">
                    <MentionTextarea
                      value={editContent}
                      onChange={setEditContent}
                      minHeight="80px"
                      className="resize-none"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(note.id)}
                        disabled={!editContent.trim() || updateMutation.isPending}
                        className="gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    <MentionText text={note.content} />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 rounded-xl border border-dashed border-border-default">
            <FileText className="w-10 h-10 mx-auto mb-3 text-text-tertiary opacity-50" />
            <p className="text-sm font-medium text-text-secondary mb-1">No notes yet</p>
            <p className="text-xs text-text-tertiary">
              {canManage 
                ? 'Add the first note for your team'
                : 'No lead notes have been added to this task'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
