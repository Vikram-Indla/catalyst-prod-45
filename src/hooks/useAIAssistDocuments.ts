import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface AIAssistDocument {
  id: string;
  draft_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  extracted_text: string | null;
  extraction_status: ExtractionStatus | null;
  retention_until: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadDocumentInput {
  draft_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket?: string;
}

// Fetch all documents for a draft
export function useAIAssistDocuments(draftId: string | undefined) {
  return useQuery({
    queryKey: ['ai-assist-documents', draftId],
    queryFn: async (): Promise<AIAssistDocument[]> => {
      if (!draftId) return [];

      const { data, error } = await supabase
        .from('ai_assist_documents')
        .select('*')
        .eq('draft_id', draftId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AIAssistDocument[];
    },
    enabled: !!draftId,
  });
}

// Upload/register a new document
export function useUploadDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UploadDocumentInput): Promise<AIAssistDocument> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Calculate retention date (2 years from now)
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 2);

      const { data, error } = await supabase
        .from('ai_assist_documents')
        .insert({
          draft_id: input.draft_id,
          file_name: input.file_name,
          file_path: input.file_path,
          file_size: input.file_size,
          mime_type: input.mime_type,
          storage_bucket: input.storage_bucket || 'ai-assist-documents',
          uploaded_by: userId,
          extraction_status: 'pending',
          retention_until: retentionDate.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      await logAuditEvent(input.draft_id, null, 'upload', userId, { 
        file_name: input.file_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
      });

      return data as AIAssistDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-documents', data.draft_id] });
      toast.success('Document uploaded');
    },
    onError: (error) => {
      toast.error('Failed to upload document: ' + error.message);
    },
  });
}

// Update document extraction status
export function useUpdateDocumentExtraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      documentId, 
      draftId,
      extractedText, 
      status 
    }: { 
      documentId: string; 
      draftId: string;
      extractedText?: string;
      status: ExtractionStatus;
    }): Promise<AIAssistDocument> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const updates: Record<string, unknown> = { 
        extraction_status: status,
        updated_at: new Date().toISOString(),
      };
      
      if (extractedText) {
        updates.extracted_text = extractedText;
      }

      const { data, error } = await supabase
        .from('ai_assist_documents')
        .update(updates)
        .eq('id', documentId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event for extraction
      if (status === 'completed') {
        await logAuditEvent(draftId, null, 'extract', userId, { 
          document_id: documentId,
          text_length: extractedText?.length || 0,
        });
      }

      return data as AIAssistDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-documents', data.draft_id] });
    },
    onError: (error) => {
      toast.error('Failed to update extraction: ' + error.message);
    },
  });
}

// Delete a document
export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ documentId, draftId }: { documentId: string; draftId: string }): Promise<void> => {
      const { error } = await supabase
        .from('ai_assist_documents')
        .delete()
        .eq('id', documentId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-documents', variables.draftId] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete document: ' + error.message);
    },
  });
}
