/**
 * Task¹⁰ Notes Hook - Full CRUD for item notes
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logActivity } from './useAqdItemDetail';

export interface AqdNote {
  id: string;
  item_id: string;
  content: string;
  created_at: string;
  created_by: string | null;
  updated_at: string | null;
  updated_by: string | null;
  is_deleted: boolean;
  creatorName?: string;
  creatorAvatar?: string;
  isEdited: boolean;
}

export function useAqdNotes(itemId: string) {
  const queryClient = useQueryClient();

  // Fetch notes for item (excluding deleted)
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['aqd-notes', itemId],
    queryFn: async (): Promise<AqdNote[]> => {
      const { data, error } = await supabase
        .from('aqd_item_notes')
        .select(`
          id,
          item_id,
          content,
          created_at,
          created_by,
          updated_at,
          updated_by,
          is_deleted,
          profiles:created_by (full_name, avatar_url)
        `)
        .eq('item_id', itemId)
        .or('is_deleted.is.null,is_deleted.eq.false')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((note: any) => ({
        ...note,
        creatorName: note.profiles?.full_name || 'Unknown',
        creatorAvatar: note.profiles?.avatar_url,
        isEdited: !!note.updated_at,
      }));
    },
    enabled: !!itemId,
  });

  // Create note
  const createNote = useMutation({
    mutationFn: async (content: string) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('aqd_item_notes')
        .insert({ 
          item_id: itemId, 
          content,
          created_by: userData.user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;

      // Log activity
      await logActivity(itemId, 'note_added', 'note', null, content.substring(0, 100));
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-notes', itemId] });
      queryClient.invalidateQueries({ queryKey: ['aqd-item-detail', itemId] });
      toast.success('Note added');
    },
    onError: (e) => toast.error(`Failed to add note: ${e.message}`),
  });

  // Update note
  const updateNote = useMutation({
    mutationFn: async ({ noteId, content }: { noteId: string; content: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('aqd_item_notes')
        .update({ 
          content, 
          updated_at: new Date().toISOString(),
          updated_by: userData.user?.id,
        })
        .eq('id', noteId);
      
      if (error) throw error;

      // Log activity
      await logActivity(itemId, 'note_updated', 'note', null, content.substring(0, 100));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-notes', itemId] });
      toast.success('Note updated');
    },
    onError: (e) => toast.error(`Failed to update note: ${e.message}`),
  });

  // Delete note (soft delete)
  const deleteNote = useMutation({
    mutationFn: async (noteId: string) => {
      // Get note content for activity log
      const { data: note } = await supabase
        .from('aqd_item_notes')
        .select('content')
        .eq('id', noteId)
        .single();

      const { error } = await supabase
        .from('aqd_item_notes')
        .update({ is_deleted: true })
        .eq('id', noteId);
      
      if (error) throw error;

      // Log activity
      await logActivity(itemId, 'note_deleted', 'note', note?.content?.substring(0, 100) ?? null, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aqd-notes', itemId] });
      queryClient.invalidateQueries({ queryKey: ['aqd-item-detail', itemId] });
      toast.success('Note deleted');
    },
    onError: (e) => toast.error(`Failed to delete note: ${e.message}`),
  });

  return {
    notes,
    isLoading,
    createNote: createNote.mutate,
    updateNote: updateNote.mutate,
    deleteNote: deleteNote.mutate,
    isCreating: createNote.isPending,
  };
}
