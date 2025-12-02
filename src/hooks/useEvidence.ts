import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TestEvidence, EvidenceFileType } from '@/types/evidence.types';

// Simple mime type lookup from file extension
const getMimeTypeFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    // Images
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'svg': 'image/svg+xml',
    // Videos
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'log': 'text/plain',
    'csv': 'text/csv',
    'json': 'application/json',
    'xml': 'application/xml',
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

export const useStepEvidence = (stepId: string) => {
  return useQuery({
    queryKey: ['step-evidence', stepId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_evidence')
        .select('*')
        .eq('execution_step_id', stepId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for all evidence files
      const evidenceWithUrls = await Promise.all(
        (data as TestEvidence[]).map(async (evidence) => {
          const { data: urlData } = await supabase.storage
            .from('test-evidence')
            .createSignedUrl(evidence.file_path, 3600); // 1 hour expiry

          return {
            ...evidence,
            signedUrl: urlData?.signedUrl,
          };
        })
      );

      return evidenceWithUrls;
    },
    enabled: !!stepId,
  });
};

export const useUploadEvidence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      stepId, 
      file 
    }: { 
      stepId: string; 
      file: File;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Determine file type
      const mimeType = file.type || getMimeTypeFromFilename(file.name);
      let fileType: EvidenceFileType = 'document';
      
      if (mimeType.startsWith('image/')) fileType = 'image';
      else if (mimeType.startsWith('video/')) fileType = 'video';
      else if (mimeType.includes('log') || mimeType.includes('text')) fileType = 'log';

      // Upload file to storage
      const fileName = `${user.id}/${stepId}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('test-evidence')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create evidence record
      const { data, error } = await supabase
        .from('test_evidence')
        .insert({
          execution_step_id: stepId,
          file_name: file.name,
          file_type: fileType,
          file_path: fileName,
          file_size: file.size,
          mime_type: mimeType,
          uploaded_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as TestEvidence;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['step-evidence', variables.stepId] });
    },
  });
};

export const useDeleteEvidence = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath, stepId }: { id: string; filePath: string; stepId: string }) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('test-evidence')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error } = await supabase
        .from('test_evidence')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['step-evidence', variables.stepId] });
    },
  });
};
