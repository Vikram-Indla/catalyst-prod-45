import React, { useState } from 'react';
import DropdownMenu, { DropdownItem, DropdownItemGroup } from '@atlaskit/dropdown-menu';
import ModalDialog, { ModalTransition, ModalHeader, ModalTitle, ModalBody, ModalFooter } from '@atlaskit/modal-dialog';
import Button from '@atlaskit/button/new';
import MoreIcon from '@atlaskit/icon/glyph/more';
import FlagIcon from '@atlaskit/icon/core/flag';
import CopyIcon from '@atlaskit/icon/core/copy';
import ArrowRightIcon from '@atlaskit/icon/core/arrow-right';
import ArchiveBoxIcon from '@atlaskit/icon/core/archive-box';
import DeleteIcon from '@atlaskit/icon/core/delete';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface StoryActionMenuProps {
  storyId: string;
  storyKey?: string;
  onClose?: () => void;
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
      const { data: original, error: fetchError } = await supabase
        .from('ph_issues')
        .select('*')
        .eq('id', storyId)
        .single();
      if (fetchError || !original) throw fetchError;

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
      <DropdownMenu
        trigger={({ triggerRef, ...triggerProps }) => (
          <button
            ref={triggerRef as React.Ref<HTMLButtonElement>}
            {...triggerProps}
            type="button"
            aria-label="Story actions"
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
          >
            <MoreIcon label="More actions" size="small" />
          </button>
        )}
        placement="bottom-end"
      >
        <DropdownItemGroup>
          <DropdownItem elemBefore={<FlagIcon label="" size="small" />} onClick={handleFlag}>
            Add flag
          </DropdownItem>
          <DropdownItem elemBefore={<CopyIcon label="" size="small" />} onClick={handleClone}>
            Clone
          </DropdownItem>
          <DropdownItem elemBefore={<ArrowRightIcon label="" size="small" />} isDisabled>
            Move
          </DropdownItem>
        </DropdownItemGroup>
        <DropdownItemGroup>
          <DropdownItem elemBefore={<ArchiveBoxIcon label="" size="small" />} onClick={handleArchive}>
            Archive
          </DropdownItem>
          <DropdownItem
            elemBefore={<DeleteIcon label="" size="small" />}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <span style={{ color: 'var(--ds-text-danger, #AE2A19)' }}>Delete</span>
          </DropdownItem>
        </DropdownItemGroup>
      </DropdownMenu>

      <ModalTransition>
        {deleteDialogOpen && (
          <ModalDialog onClose={() => !isDeleting && setDeleteDialogOpen(false)}>
            <ModalHeader>
              <ModalTitle appearance="danger">Delete {storyKey || 'this story'}?</ModalTitle>
            </ModalHeader>
            <ModalBody>
              This will permanently delete the story and all associated data. This action cannot be undone.
            </ModalBody>
            <ModalFooter>
              <Button
                appearance="subtle"
                onClick={() => setDeleteDialogOpen(false)}
                isDisabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                appearance="danger"
                onClick={handleDelete}
                isDisabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </ModalFooter>
          </ModalDialog>
        )}
      </ModalTransition>
    </>
  );
}
