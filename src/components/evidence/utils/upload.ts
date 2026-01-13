// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE UPLOAD UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

import { supabase } from '@/integrations/supabase/client';
import { Attachment } from '../types';
import { getImageDimensions } from './validation';

export const uploadEvidence = async (
  file: File | Blob,
  captureMethod: 'screen_capture' | 'clipboard_paste' | 'file_upload' | 'drag_drop',
  stepResultId: string,
  executionResultId: string,
  onProgress?: (progress: number) => void
): Promise<Attachment> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = file.type.split('/')[1] || 'png';
  const fileName = `evidence-${timestamp}.${extension}`;

  // Generate storage path
  const storagePath = `${user.id}/${executionResultId}/${stepResultId}/${fileName}`;

  // Get image dimensions if applicable
  let width: number | undefined;
  let height: number | undefined;

  if (file.type.startsWith('image/')) {
    const dimensions = await getImageDimensions(file);
    width = dimensions.width;
    height = dimensions.height;
  }

  // Simulate progress for now (Supabase doesn't have native progress)
  onProgress?.(20);

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('evidence')
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false
    });

  if (uploadError) throw uploadError;

  onProgress?.(60);

  // Create database record
  const { data: attachment, error: dbError } = await supabase
    .from('step_result_attachments')
    .insert({
      step_result_id: stepResultId,
      execution_result_id: executionResultId,
      uploaded_by: user.id,
      file_name: fileName,
      file_size: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      capture_method: captureMethod,
      width,
      height
    })
    .select()
    .single();

  if (dbError) throw dbError;

  onProgress?.(90);

  // Get signed URL for thumbnail
  const { data: signedUrl } = await supabase.storage
    .from('evidence')
    .createSignedUrl(storagePath, 3600);

  onProgress?.(100);

  return {
    id: attachment.id,
    fileName: attachment.file_name,
    fileSize: attachment.file_size,
    mimeType: attachment.mime_type,
    storagePath: attachment.storage_path,
    captureMethod: attachment.capture_method as Attachment['captureMethod'],
    width: attachment.width ?? undefined,
    height: attachment.height ?? undefined,
    thumbnailUrl: signedUrl?.signedUrl
  };
};
