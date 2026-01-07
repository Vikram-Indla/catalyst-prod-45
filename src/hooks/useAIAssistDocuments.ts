import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logAuditEvent } from './useAIAssistDrafts';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type OcrQualityBand = 'high' | 'medium' | 'low';
export type BilingualConfidence = 'high' | 'medium' | 'low';
export type PrimaryLanguage = 'ar' | 'en' | 'mixed';

export interface AIAssistDocument {
  id: string;
  draft_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  storage_bucket: string;
  file_sha256: string | null;
  page_hashes: unknown[] | null;
  extracted_text: string | null;
  extraction_status: ExtractionStatus | null;
  retention_until: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  // New metadata fields
  primary_language: PrimaryLanguage | null;
  bilingual_confidence: BilingualConfidence | null;
  pages_total: number | null;
  ocr_avg_confidence: number | null;
  ocr_quality_band: OcrQualityBand | null;
  sections_detected_count: number | null;
  canonical_text_hash: string | null;
  extraction_warnings: string[] | null;
  document_version: number | null;
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

      // Log audit event - document_uploaded
      await logAuditEvent(input.draft_id, null, 'document_uploaded', userId, { 
        file_name: input.file_name,
        file_size: input.file_size,
        mime_type: input.mime_type,
        storage_path: input.file_path,
        version: data.document_version || 1,
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
        await logAuditEvent(draftId, null, 'extraction_completed', userId, { 
          document_id: documentId,
          text_length: extractedText?.length || 0,
          canonical_text_hash: data.canonical_text_hash,
          ocr_avg_confidence: data.ocr_avg_confidence,
          sections_count: data.sections_detected_count,
          primary_language: data.primary_language,
        });
      } else if (status === 'processing') {
        await logAuditEvent(draftId, null, 'extraction_started', userId, { 
          document_id: documentId,
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

// Replace a document - logs replacement audit and invalidates steps 2-8
export function useReplaceDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      draftId, 
      oldDocumentId,
      oldVersion,
      newDocument 
    }: { 
      draftId: string;
      oldDocumentId: string;
      oldVersion: number;
      newDocument: UploadDocumentInput;
    }): Promise<AIAssistDocument> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      // Get old document hash for audit
      const { data: oldDoc } = await supabase
        .from('ai_assist_documents')
        .select('file_sha256')
        .eq('id', oldDocumentId)
        .single();

      // Soft-delete old document
      await supabase
        .from('ai_assist_documents')
        .update({ extraction_status: 'failed' }) // Mark as replaced
        .eq('id', oldDocumentId);

      // Calculate new version
      const newVersion = (oldVersion || 1) + 1;

      // Calculate retention date
      const retentionDate = new Date();
      retentionDate.setFullYear(retentionDate.getFullYear() + 2);

      // Create new document
      const { data, error } = await supabase
        .from('ai_assist_documents')
        .insert({
          draft_id: draftId,
          file_name: newDocument.file_name,
          file_path: newDocument.file_path,
          file_size: newDocument.file_size,
          mime_type: newDocument.mime_type,
          storage_bucket: newDocument.storage_bucket || 'ai-assist-documents',
          uploaded_by: userId,
          extraction_status: 'pending',
          retention_until: retentionDate.toISOString(),
          document_version: newVersion,
        })
        .select()
        .single();

      if (error) throw error;

      // Log document_replaced audit event
      await logAuditEvent(draftId, null, 'document_replaced', userId, { 
        old_version: oldVersion,
        new_version: newVersion,
        old_file_sha: oldDoc?.file_sha256,
        new_file_name: newDocument.file_name,
      });

      // Reset draft steps 2-8 via step_data update
      await supabase
        .from('ai_assist_drafts')
        .update({
          current_step: 1,
          step_data: {
            completedSteps: [],
            lastCompletedStep: null,
          },
        })
        .eq('id', draftId);

      return data as AIAssistDocument;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-assist-documents', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-draft', data.draft_id] });
      queryClient.invalidateQueries({ queryKey: ['ai-assist-drafts'] });
      toast.success('Document replaced - previous analysis invalidated');
    },
    onError: (error) => {
      toast.error('Failed to replace document: ' + error.message);
    },
  });
}
