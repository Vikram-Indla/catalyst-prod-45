/**
 * Execution Attachments Hook
 * Handles file uploads and management for test execution evidence
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionAttachment {
  id: string;
  runId: string;
  stepId?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  uploadedAt: Date;
  uploadedBy?: string;
}

interface UploadOptions {
  runId: string;
  stepId?: string;
  maxSizeMB?: number;
}

const MAX_FILE_SIZE_MB = 10;
const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/json',
  'video/mp4',
  'video/webm',
];

export function useExecutionAttachments(runId?: string) {
  const [attachments, setAttachments] = useState<ExecutionAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  /**
   * Upload a file as execution evidence
   */
  const uploadFile = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<ExecutionAttachment | null> => {
    const maxSize = (options.maxSizeMB || MAX_FILE_SIZE_MB) * 1024 * 1024;

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File too large. Maximum size is ${options.maxSizeMB || MAX_FILE_SIZE_MB}MB`);
      return null;
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('File type not supported');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique path
      const ext = file.name.split('.').pop() || 'bin';
      const uniqueId = uuidv4().slice(0, 8);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `${timestamp}-${uniqueId}.${ext}`;
      const filePath = `execution-evidence/${options.runId}/${options.stepId || 'general'}/${fileName}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('test-attachments')
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('test-attachments')
        .getPublicUrl(filePath);

      // Create attachment record
      const attachment: ExecutionAttachment = {
        id: uuidv4(),
        runId: options.runId,
        stepId: options.stepId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: urlData.publicUrl,
        uploadedAt: new Date(),
      };

      // Save to tm_attachments table
      await supabase.from('tm_attachments').insert({
        entity_type: options.stepId ? 'step_result' : 'test_run',
        entity_id: options.stepId || options.runId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      });

      setAttachments(prev => [...prev, attachment]);
      setUploadProgress(100);
      toast.success('File uploaded!');

      return attachment;
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload file');
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  }, []);

  /**
   * Upload multiple files
   */
  const uploadFiles = useCallback(async (
    files: FileList | File[],
    options: UploadOptions
  ): Promise<ExecutionAttachment[]> => {
    const results: ExecutionAttachment[] = [];
    const fileArray = Array.from(files);

    for (let i = 0; i < fileArray.length; i++) {
      const result = await uploadFile(fileArray[i], options);
      if (result) results.push(result);
      setUploadProgress(((i + 1) / fileArray.length) * 100);
    }

    return results;
  }, [uploadFile]);

  /**
   * Delete an attachment
   */
  const deleteAttachment = useCallback(async (attachment: ExecutionAttachment) => {
    try {
      const filePath = `execution-evidence/${attachment.runId}/${attachment.stepId || 'general'}/${attachment.fileName}`;
      await supabase.storage.from('test-attachments').remove([filePath]);
      
      // Delete from table
      await supabase
        .from('tm_attachments')
        .delete()
        .eq('entity_id', attachment.stepId || attachment.runId);

      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
      toast.success('Attachment deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete attachment');
    }
  }, []);

  /**
   * Load attachments for a run
   */
  const loadAttachments = useCallback(async (runId: string) => {
    try {
      const { data, error } = await supabase
        .from('tm_attachments')
        .select('*')
        .or(`entity_id.eq.${runId},entity_id.in.(SELECT id FROM tm_step_results WHERE run_id = '${runId}')`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: ExecutionAttachment[] = (data || []).map(a => ({
        id: a.id,
        runId,
        stepId: a.entity_type === 'step_result' ? a.entity_id : undefined,
        fileName: a.file_name,
        fileSize: a.file_size || 0,
        mimeType: a.mime_type || 'application/octet-stream',
        url: supabase.storage.from('test-attachments').getPublicUrl(a.file_path).data.publicUrl,
        uploadedAt: new Date(a.created_at),
        uploadedBy: a.uploaded_by,
      }));

      setAttachments(mapped);
    } catch (error) {
      console.error('Failed to load attachments:', error);
    }
  }, []);

  return {
    attachments,
    isUploading,
    uploadProgress,
    uploadFile,
    uploadFiles,
    deleteAttachment,
    loadAttachments,
  };
}
