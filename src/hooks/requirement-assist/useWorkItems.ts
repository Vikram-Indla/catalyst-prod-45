// ============================================================
// USE WORK ITEMS HOOK
// Work item operations (edit, delete, toggle)
// ============================================================

import { useCallback } from 'react';
import { useRequirementAssistStore } from '@/stores/requirementAssistStore';
import { supabase } from '@/integrations/supabase/client';
import toast from 'react-hot-toast';

export function useWorkItems() {
  const { workItems, updateWorkItem, removeWorkItem } = useRequirementAssistStore();

  // Update work item in database
  const saveWorkItem = useCallback(async (
    id: string, 
    updates: {
      title?: string;
      description?: string;
      acceptanceCriteria?: string[];
    }
  ) => {
    try {
      // Convert acceptance criteria array to string for DB
      const dbUpdates: Record<string, any> = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.acceptanceCriteria !== undefined) {
        dbUpdates.acceptance_criteria = updates.acceptanceCriteria.join('\n');
      }

      const { error } = await supabase
        .from('ra_generated_items')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      updateWorkItem(id, {
        ...updates,
        isEdited: true,
      });

      toast.success('Changes saved');
    } catch (error: any) {
      toast.error('Failed to save changes');
      console.error('Save error:', error);
    }
  }, [updateWorkItem]);

  // Delete work item
  const deleteWorkItem = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('ra_generated_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      removeWorkItem(id);
      toast.success('Item deleted');
    } catch (error: any) {
      toast.error('Failed to delete item');
      console.error('Delete error:', error);
    }
  }, [removeWorkItem]);

  // Toggle selection (local only since is_selected doesn't exist in DB)
  const toggleSelection = useCallback(async (id: string) => {
    const item = workItems.find(w => w.id === id);
    if (!item) return;

    // Just update local state - is_selected is not in the database
    updateWorkItem(id, { isSelected: !item.isSelected });
  }, [workItems, updateWorkItem]);

  // Toggle published status in database
  const togglePublished = useCallback(async (id: string) => {
    const item = workItems.find(w => w.id === id);
    if (!item) return;

    try {
      const { error } = await supabase
        .from('ra_generated_items')
        .update({ is_published: !item.isPublished })
        .eq('id', id);

      if (error) throw error;

      updateWorkItem(id, { isPublished: !item.isPublished });
      toast.success(item.isPublished ? 'Unpublished' : 'Published');
    } catch (error: any) {
      console.error('Toggle published error:', error);
      toast.error('Failed to update');
    }
  }, [workItems, updateWorkItem]);

  return {
    saveWorkItem,
    deleteWorkItem,
    toggleSelection,
    togglePublished,
  };
}
