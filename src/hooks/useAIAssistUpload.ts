import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { AIAssistDocument } from './useAIAssistDocuments';

interface UploadResult {
  success: boolean;
  document: AIAssistDocument;
  content_changed: boolean;
}

export function useAIAssistUpload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, draftId }: { file: File; draftId: string }): Promise<UploadResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('draft_id', draftId);

      const response = await supabase.functions.invoke('ai-assist-upload', {
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Upload failed');
      }

      const result = response.data as UploadResult;
      
      if (!result.success) {
        throw new Error('Upload failed');
      }

      return result;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-documents', variables.draftId] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-audit-events', variables.draftId] });
      
      if (data.content_changed) {
        toast.warning('Document content changed from previous upload');
      } else {
        toast.success('Document uploaded successfully');
      }
    },
    onError: (error) => {
      toast.error('Upload failed: ' + error.message);
    },
  });
}
