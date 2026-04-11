/**
 * Generic entity attachment hooks — works for any entity_type
 * Uses tm_attachments table + defect-attachments storage bucket
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EntityAttachment {
  id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string | null;
  uploader?: { full_name: string | null; avatar_url: string | null } | null;
}

const BUCKET = 'defect-attachments';

export function useEntityAttachments(entityType: string, entityId: string | undefined) {
  return useQuery({
    queryKey: ['entity-attachments', entityType, entityId],
    enabled: !!entityId,
    queryFn: async (): Promise<EntityAttachment[]> => {
      const { data, error } = await supabase
        .from('tm_attachments')
        .select(`
          id, entity_type, entity_id, file_name, file_path,
          file_size, mime_type, uploaded_by, created_at,
          uploader:profiles!tm_attachments_uploaded_by_fkey(full_name, avatar_url)
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EntityAttachment[];
    },
  });
}

export function useUploadEntityAttachment(entityType: string, entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !entityId) throw new Error('Not authenticated or missing entity');

      for (const file of files) {
        const storagePath = `${entityType}/${entityId}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file);
        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase
          .from('tm_attachments')
          .insert({
            entity_type: entityType,
            entity_id: entityId,
            file_name: file.name,
            file_path: storagePath,
            file_size: file.size,
            mime_type: file.type || 'application/octet-stream',
            uploaded_by: user.id,
          });
        if (insertError) throw insertError;
      }

      return files.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entity-attachments', entityType, entityId] });
    },
  });
}

export function useDeleteEntityAttachment(entityType: string, entityId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (attachment: EntityAttachment) => {
      // Delete from storage
      await supabase.storage.from(BUCKET).remove([attachment.file_path]);
      // Delete record
      const { error } = await supabase
        .from('tm_attachments')
        .delete()
        .eq('id', attachment.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['entity-attachments', entityType, entityId] });
    },
  });
}
