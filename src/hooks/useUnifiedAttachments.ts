import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UnifiedAttachment {
  id: string;
  work_item_id: string | null;
  work_item_type: string | null;
  upload_session_id: string | null;
  uploaded_by_user_id: string | null;
  uploaded_by_name: string | null;
  uploaded_by_type: 'external' | 'internal';
  source_context: 'external_wizard' | 'links_tab';
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  storage_provider: string;
  storage_key: string;
  checksum_sha256: string | null;
  status: 'staged' | 'committed' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface UploadSession {
  id: string;
  created_by: string | null;
  expires_at: string | null;
  status: 'active' | 'committed' | 'expired';
  created_at: string;
  updated_at: string;
}

// Create a new upload session for staging attachments
export function useCreateUploadSession() {
  return useMutation({
    mutationFn: async (createdBy?: string): Promise<UploadSession> => {
      const { data, error } = await supabase
        .from('upload_sessions')
        .insert({ created_by: createdBy || 'anonymous' })
        .select()
        .single();
      
      if (error) throw error;
      return data as UploadSession;
    }
  });
}

// Upload a file and create a staged attachment record
export function useStageAttachment() {
  return useMutation({
    mutationFn: async ({
      file,
      uploadSessionId,
      uploadedByName,
      uploadedByType = 'external',
      sourceContext = 'external_wizard'
    }: {
      file: File;
      uploadSessionId: string;
      uploadedByName?: string;
      uploadedByType?: 'external' | 'internal';
      sourceContext?: 'external_wizard' | 'links_tab';
    }): Promise<UnifiedAttachment> => {
      // Generate unique storage key
      // Use public-intake/ prefix for external uploads (anonymous access allowed)
      // Use staged/ prefix for internal uploads (requires authentication)
      const timestamp = Date.now();
      const folderPrefix = uploadedByType === 'external' ? 'public-intake' : 'staged';
      const storageKey = `${folderPrefix}/${uploadSessionId}/${timestamp}-${file.name}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('attachments')
        .upload(storageKey, file);
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Upload failed. Please try again or contact support if it continues.');
      }
      
      // Calculate simple checksum (for now, use size + name hash)
      const checksum = `size:${file.size}:name:${file.name}`;
      
      // Create staged attachment record
      const { data, error: insertError } = await supabase
        .from('unified_attachments')
        .insert({
          upload_session_id: uploadSessionId,
          uploaded_by_name: uploadedByName,
          uploaded_by_type: uploadedByType,
          source_context: sourceContext,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size,
          storage_provider: 'supabase',
          storage_key: storageKey,
          checksum_sha256: checksum,
          status: 'staged'
        })
        .select()
        .single();
      
      if (insertError) {
        // Rollback: delete the uploaded file
        await supabase.storage.from('attachments').remove([storageKey]);
        console.error('Attachment record insert error:', insertError);
        throw new Error(`Failed to create attachment record: ${insertError.message}`);
      }
      
      return data as UnifiedAttachment;
    }
  });
}

// Commit staged attachments to a work item (atomic operation)
export function useCommitAttachments() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      uploadSessionId,
      workItemId,
      workItemType
    }: {
      uploadSessionId: string;
      workItemId: string;
      workItemType: string;
    }): Promise<UnifiedAttachment[]> => {
      // Update all staged attachments in this session to committed
      const { data, error } = await supabase
        .from('unified_attachments')
        .update({
          work_item_id: workItemId,
          work_item_type: workItemType,
          status: 'committed'
        })
        .eq('upload_session_id', uploadSessionId)
        .eq('status', 'staged')
        .select();
      
      if (error) {
        console.error('Commit attachments error:', error);
        throw new Error(`Failed to commit attachments: ${error.message}`);
      }
      
      // Mark the session as committed
      await supabase
        .from('upload_sessions')
        .update({ status: 'committed' })
        .eq('id', uploadSessionId);
      
      return (data || []) as UnifiedAttachment[];
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['unified-attachments', variables.workItemId] 
      });
    }
  });
}

// Get attachments for a work item (for Links tab)
export function useWorkItemAttachments(workItemId: string | undefined, workItemType?: string) {
  return useQuery({
    queryKey: ['unified-attachments', workItemId, workItemType],
    queryFn: async () => {
      if (!workItemId) return [];
      
      let query = supabase
        .from('unified_attachments')
        .select('*')
        .eq('work_item_id', workItemId)
        .eq('status', 'committed')
        .order('created_at', { ascending: false });
      
      if (workItemType) {
        query = query.eq('work_item_type', workItemType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as UnifiedAttachment[];
    },
    enabled: !!workItemId
  });
}

// Delete an attachment
export function useDeleteAttachment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (attachment: UnifiedAttachment) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('attachments')
        .remove([attachment.storage_key]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // Continue anyway to delete the record
      }
      
      // Delete the record
      const { error } = await supabase
        .from('unified_attachments')
        .delete()
        .eq('id', attachment.id);
      
      if (error) throw error;
    },
    onSuccess: (_, attachment) => {
      queryClient.invalidateQueries({ 
        queryKey: ['unified-attachments', attachment.work_item_id] 
      });
      toast.success('Attachment deleted');
    },
    onError: () => {
      toast.error('Failed to delete attachment');
    }
  });
}

// Download attachment
export async function downloadAttachment(attachment: UnifiedAttachment) {
  const { data, error } = await supabase.storage
    .from('attachments')
    .download(attachment.storage_key);
  
  if (error) {
    toast.error('Failed to download file');
    throw error;
  }
  
  // Create download link
  const url = URL.createObjectURL(data);
  const a = document.createElement('a');
  a.href = url;
  a.download = attachment.file_name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Get signed URL for preview
export async function getAttachmentUrl(attachment: UnifiedAttachment): Promise<string> {
  const { data, error } = await supabase.storage
    .from('attachments')
    .createSignedUrl(attachment.storage_key, 3600); // 1 hour expiry
  
  if (error) throw error;
  return data.signedUrl;
}
