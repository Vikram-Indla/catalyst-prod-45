// ============================================================
// IMPROVEMENT IDEAS - ATTACHMENTS HOOKS
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdeaAttachment {
  id: string;
  entity_id: string;
  entity_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  created_at: string;
  uploader?: { full_name: string; avatar_url?: string };
}

export function useIdeaAttachments(ideaId: string | undefined) {
  return useQuery({
    queryKey: ['idea-attachments', ideaId],
    queryFn: async () => {
      if (!ideaId) return [];
      
      const { data, error } = await supabase
        .from('attachments')
        .select(`
          *,
          uploader:profiles!uploaded_by(full_name, avatar_url)
        `)
        .eq('entity_type', 'improvement_idea')
        .eq('entity_id', ideaId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []) as unknown as IdeaAttachment[];
    },
    enabled: !!ideaId,
  });
}

export function useUploadIdeaAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      ideaId, 
      file 
    }: { 
      ideaId: string; 
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `ideas/${ideaId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from('attachments')
        .insert({
          entity_type: 'improvement_idea',
          entity_id: ideaId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { ideaId }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-attachments', ideaId] });
      toast.success('File uploaded');
    },
    onError: (error) => {
      toast.error('Failed to upload file', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });
}

export function useDeleteIdeaAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ attachmentId, ideaId, filePath }: { 
      attachmentId: string; 
      ideaId: string;
      filePath: string;
    }) => {
      // Delete from storage
      await supabase.storage
        .from('attachments')
        .remove([filePath]);

      // Delete record
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', attachmentId);
      
      if (error) throw error;
      return { attachmentId, ideaId };
    },
    onSuccess: ({ ideaId }) => {
      queryClient.invalidateQueries({ queryKey: ['idea-attachments', ideaId] });
      toast.success('Attachment deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete attachment', {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    },
  });
}
