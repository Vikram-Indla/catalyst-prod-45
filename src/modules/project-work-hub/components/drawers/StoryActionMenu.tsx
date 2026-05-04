/**
 * StoryActionMenu — Three-dot (⋯) menu for story header actions
 * JIRA-parity: Add flag, Clone, Move, Archive, Delete
 * Uses Radix DropdownMenu primitives from shadcn/ui
 */
import React, { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Flag, Copy, ArrowRight, Archive, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StoryActionMenuProps {
  storyId: string;
  storyKey?: string;
  onClose?: () => void; // close the drawer after delete
}

export function StoryActionMenu({ storyId, storyKey, onClose }: StoryActionMenuProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFlag = async () => {
    try {
      const { error } = await supabase
        .from('ph_issues')
        .update({ is_flagged: true })
        .eq('id', storyId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['story-drawer-detail', storyId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      toast.success('Flag added');
    } catch {
      toast.error('Failed to add flag');
    }
  };

  const handleClone = async () => {
    try {
      // Fetch the story to clone
      const { data: original, error: fetchError } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', storyId)
        .single();
      if (fetchError || !original) throw fetchError;

      // Remove fields that shouldn't be copied
      const { id, issue_key, jira_id, jira_created_at, jira_updated_at, created_at, updated_at, ...cloneData } = original;
      cloneData.summary = `[Clone] ${cloneData.summary || ''}`;
      cloneData.status = 'Backlog';
      cloneData.status_category = 'To Do';

      const { error: insertError } = await supabase
        .from('ph_issues')
        .insert(cloneData);
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      toast.success('Story cloned');
    } catch {
      toast.error('Failed to clone story');
    }
  };

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('ph_issues')
        .update({ status: 'Archived', status_category: 'Done' })
        .eq('id', storyId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['story-drawer-detail', storyId] });
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      toast.success('Story archived');
    } catch {
      toast.error('Failed to archive story');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('ph_issues')
        .delete()
        .eq('id', storyId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['backlog-stories'] });
      toast.success('Story deleted');
      onClose?.();
    } catch {
      toast.error('Failed to delete story');
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            style={{
              width: 28,
              height: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--cp-radius-md, 6px)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--cp-text-secondary, #334155)',
            }}
            className="hover:bg-accent"
            aria-label="Story actions"
          >
            <MoreHorizontal size={20} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          style={{
            minWidth: 220,
            background: 'var(--cp-bg-elevated, #FFFFFF)',
            border: '1px solid var(--cp-border-default, rgba(15, 23, 42, 0.12))',
            boxShadow: 'var(--cp-shadow-overlay, 0px 8px 12px rgba(30, 31, 33, 0.15), 0px 0px 1px rgba(30, 31, 33, 0.31))',
            borderRadius: 'var(--cp-radius-md, 6px)',
            padding: '4px 0',
          }}
        >
          <DropdownMenuItem
            onClick={handleFlag}
            style={{ height: 36, padding: '0 12px', fontSize: 14, gap: 12, cursor: 'pointer' }}
          >
            <Flag size={16} style={{ color: 'var(--cp-text-secondary, #334155)' }} />
            <span>Add flag</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleClone}
            style={{ height: 36, padding: '0 12px', fontSize: 14, gap: 12, cursor: 'pointer' }}
          >
            <Copy size={16} style={{ color: 'var(--cp-text-secondary, #334155)' }} />
            <span>Clone</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled
            style={{ height: 36, padding: '0 12px', fontSize: 14, gap: 12, opacity: 0.5 }}
          >
            <ArrowRight size={16} style={{ color: 'var(--cp-text-secondary, #334155)' }} />
            <span>Move</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator style={{ height: 1, background: 'var(--cp-border-subtle, rgba(15, 23, 42, 0.06))', margin: '4px 0' }} />

          <DropdownMenuItem
            onClick={handleArchive}
            style={{ height: 36, padding: '0 12px', fontSize: 14, gap: 12, cursor: 'pointer' }}
          >
            <Archive size={16} style={{ color: 'var(--cp-text-secondary, #334155)' }} />
            <span>Archive</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            style={{ height: 36, padding: '0 12px', fontSize: 14, gap: 12, cursor: 'pointer', color: 'var(--cp-danger-60, #DC2626)' }}
          >
            <Trash2 size={16} style={{ color: 'var(--cp-danger-60, #DC2626)' }} />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {storyKey || 'this story'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the story and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
