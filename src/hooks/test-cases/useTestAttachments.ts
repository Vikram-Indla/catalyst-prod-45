// =====================================================
// TEST ATTACHMENTS HOOKS
// Hooks for managing test case attachments
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestAttachment {
  id: string;
  test_case_id: string;
  test_step_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  attachment_type: 'general' | 'screenshot' | 'document' | 'video' | 'data';
  description: string | null;
  uploaded_by: string | null;
  uploader_name: string;
  created_at: string;
}

// Hook to get attachments for a test case
export function useCaseAttachments(caseId: string | null) {
  return useQuery({
    queryKey: ['case-attachments', caseId],
    queryFn: async (): Promise<TestAttachment[]> => {
      if (!caseId) return [];

      const { data, error } = await supabase.rpc('tm_get_case_attachments', {
        p_case_id: caseId,
      });

      if (error) throw error;
      return (data || []) as TestAttachment[];
    },
    enabled: !!caseId,
  });
}

// Hook to upload attachment
export function useUploadAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      caseId,
      stepId,
      file,
      attachmentType = 'general',
      description,
    }: {
      caseId: string;
      stepId?: string;
      file: File;
      attachmentType?: TestAttachment['attachment_type'];
      description?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate unique file path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${caseId}/${timestamp}-${safeName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('test-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Create attachment record
      const { data, error } = await supabase.rpc('tm_add_attachment', {
        p_case_id: caseId,
        p_step_id: stepId || null,
        p_file_name: file.name,
        p_file_path: filePath,
        p_file_size: file.size,
        p_mime_type: file.type,
        p_attachment_type: attachmentType,
        p_description: description || null,
      });

      if (error) {
        // Clean up uploaded file if record creation fails
        await supabase.storage.from('test-attachments').remove([filePath]);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-attachments', variables.caseId] });
    },
  });
}

// Hook to delete attachment
export function useDeleteAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ attachmentId, caseId }: { attachmentId: string; caseId: string }) => {
      const { data, error } = await supabase.rpc('tm_delete_attachment', {
        p_attachment_id: attachmentId,
      });

      if (error) throw error;

      // Delete from storage
      const result = data as { success: boolean; file_path: string };
      if (result.file_path) {
        await supabase.storage.from('test-attachments').remove([result.file_path]);
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['case-attachments', variables.caseId] });
    },
  });
}

// Hook to get signed URL for attachment
export function useAttachmentUrl(filePath: string | null) {
  return useQuery({
    queryKey: ['attachment-url', filePath],
    queryFn: async (): Promise<string | null> => {
      if (!filePath) return null;

      const { data, error } = await supabase.storage
        .from('test-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    },
    enabled: !!filePath,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Utility to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Utility to get icon for mime type
export function getAttachmentIcon(mimeType: string): 'image' | 'video' | 'file-text' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'file-text';
  return 'file';
}
