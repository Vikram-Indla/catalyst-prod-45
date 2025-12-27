import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, file }: { sessionId: string; file: File }) => {
      // Determine file type
      let fileType: 'pdf' | 'docx' | 'txt' = 'txt';
      if (file.type === 'application/pdf') fileType = 'pdf';
      else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') fileType = 'docx';

      // Upload to storage
      const filePath = `${sessionId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('efd-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get current document count for order
      const { count } = await supabase
        .from('efd_documents')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);

      // Create document record
      const { data, error } = await supabase
        .from('efd_documents')
        .insert({
          session_id: sessionId,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: fileType,
          mime_type: file.type,
          upload_order: (count || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-documents'] });
      toast.success('Document uploaded');
    },
    onError: (error) => {
      console.error('Upload error:', error);
      toast.error('Failed to upload document');
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, sessionId }: { documentId: string; sessionId: string }) => {
      // Get document first to get file path
      const { data: doc } = await supabase
        .from('efd_documents')
        .select('file_path')
        .eq('id', documentId)
        .single();

      if (doc?.file_path) {
        // Delete from storage
        await supabase.storage
          .from('efd-documents')
          .remove([doc.file_path]);
      }

      // Delete record
      const { error } = await supabase
        .from('efd_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['efd-documents'] });
      toast.success('Document deleted');
    },
    onError: () => {
      toast.error('Failed to delete document');
    },
  });
}