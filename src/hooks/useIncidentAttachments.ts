import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUploadIncidentAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ incidentId, file }: { incidentId: string; file: File }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const filePath = `incidents/${incidentId}/${Date.now()}_${file.name}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(filePath, file);
      
      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase
        .from('incident_attachments')
        .insert({
          incident_id: incidentId,
          file_name: file.name,
          storage_path: filePath,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      toast.success('File uploaded');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to upload file');
    },
  });
}

export function useDeleteIncidentAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, incidentId, storagePath }: { 
      attachmentId: string; 
      incidentId: string; 
      storagePath: string;
    }) => {
      // Delete from storage
      await supabase.storage.from('attachments').remove([storagePath]);
      
      // Delete record
      const { error } = await supabase
        .from('incident_attachments')
        .delete()
        .eq('id', attachmentId);

      if (error) throw error;
    },
    onSuccess: (_, { incidentId }) => {
      queryClient.invalidateQueries({ queryKey: ['incident', incidentId] });
      toast.success('Attachment deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete attachment');
    },
  });
}

export function useDownloadIncidentAttachment() {
  return useMutation({
    mutationFn: async ({ storagePath, fileName }: { storagePath: string; fileName: string }) => {
      const { data, error } = await supabase.storage
        .from('attachments')
        .download(storagePath);

      if (error) throw error;
      
      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to download file');
    },
  });
}
