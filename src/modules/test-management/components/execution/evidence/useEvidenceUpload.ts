/**
 * Evidence Upload Hook
 * Handles file uploads to Supabase storage and database
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Evidence, 
  PendingEvidence, 
  UploadProgress, 
  EvidenceUploadOptions,
  CaptureMethod,
} from './types';
import { FILE_TYPE_MAP, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './types';

export function useEvidenceUpload() {
  const [pendingEvidence, setPendingEvidence] = useState<PendingEvidence[]>([]);
  const [uploadedEvidence, setUploadedEvidence] = useState<Evidence[]>([]);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Validate a file before upload
   */
  const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `File too large. Maximum size is 10MB.` };
    }

    // Check if empty
    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    // Check file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Invalid file type. Allowed: PNG, JPEG, GIF, WebP, PDF, MP4, WebM` 
      };
    }

    return { valid: true };
  }, []);

  /**
   * Add a pending evidence item (for preview before upload)
   */
  const addPendingEvidence = useCallback(async (
    file: File, 
    captureMethod: CaptureMethod
  ): Promise<PendingEvidence | null> => {
    const validation = validateFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return null;
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const preview = event.target?.result as string;
        
        // Get image dimensions if it's an image
        let width: number | undefined;
        let height: number | undefined;
        
        if (file.type.startsWith('image/')) {
          try {
            const dimensions = await getImageDimensions(preview);
            width = dimensions.width;
            height = dimensions.height;
          } catch {
            // Ignore dimension errors
          }
        }

        const pending: PendingEvidence = {
          id: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          preview,
          captureMethod,
          timestamp: Date.now(),
          width,
          height,
        };

        setPendingEvidence(prev => [...prev, pending]);
        resolve(pending);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  }, [validateFile]);

  /**
   * Remove a pending evidence item
   */
  const removePendingEvidence = useCallback((id: string) => {
    setPendingEvidence(prev => prev.filter(e => e.id !== id));
  }, []);

  /**
   * Clear all pending evidence
   */
  const clearPendingEvidence = useCallback(() => {
    setPendingEvidence([]);
  }, []);

  /**
   * Upload a single file to storage and create database record
   */
  const uploadFile = useCallback(async (
    pending: PendingEvidence,
    options: EvidenceUploadOptions
  ): Promise<Evidence | null> => {
    const { executionStepId } = options;
    const { file, captureMethod, width, height } = pending;

    // Update progress
    const progressId = pending.id;
    setUploadProgress(prev => [
      ...prev.filter(p => p.fileId !== progressId),
      { fileId: progressId, fileName: file.name, progress: 0, status: 'uploading' }
    ]);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate storage path
      const ext = file.name.split('.').pop() || 'bin';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const uniqueId = uuidv4().slice(0, 8);
      const storagePath = `${user.id}/${executionStepId}/${timestamp}-${uniqueId}.${ext}`;

      // Upload to storage
      setUploadProgress(prev => 
        prev.map(p => p.fileId === progressId ? { ...p, progress: 30 } : p)
      );

      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(storagePath, file, {
          contentType: file.type,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      setUploadProgress(prev => 
        prev.map(p => p.fileId === progressId ? { ...p, progress: 70 } : p)
      );

      // Create database record
      const fileType = FILE_TYPE_MAP[file.type] || 'document';
      const dbRecord = {
        execution_step_id: executionStepId,
        file_name: file.name,
        file_type: fileType,
        file_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        capture_method: captureMethod,
        width: width || null,
        height: height || null,
        original_file_name: file.name,
        storage_path: storagePath,
        uploaded_by: user.id,
      };

      const { data: insertedData, error: dbError } = await supabase
        .from('test_evidence')
        .insert(dbRecord)
        .select()
        .single();

      if (dbError) throw dbError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from('evidence')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      setUploadProgress(prev => 
        prev.map(p => p.fileId === progressId ? { ...p, progress: 100, status: 'success' } : p)
      );

      const evidence: Evidence = {
        id: insertedData.id,
        executionStepId,
        fileName: file.name,
        fileType,
        filePath: storagePath,
        fileSize: file.size,
        mimeType: file.type,
        captureMethod,
        width,
        height,
        originalFileName: file.name,
        storagePath,
        uploadedBy: user.id,
        createdAt: new Date(insertedData.created_at),
        url: urlData?.signedUrl,
      };

      setUploadedEvidence(prev => [...prev, evidence]);
      
      // Remove from pending
      setPendingEvidence(prev => prev.filter(e => e.id !== pending.id));

      return evidence;
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadProgress(prev => 
        prev.map(p => p.fileId === progressId 
          ? { ...p, status: 'error', error: (error as Error).message } 
          : p
        )
      );
      toast.error(`Failed to upload ${file.name}`);
      return null;
    }
  }, []);

  /**
   * Upload all pending evidence
   */
  const uploadAllPending = useCallback(async (
    options: EvidenceUploadOptions
  ): Promise<Evidence[]> => {
    if (pendingEvidence.length === 0) return [];

    setIsUploading(true);
    const results: Evidence[] = [];

    try {
      for (const pending of pendingEvidence) {
        const result = await uploadFile(pending, options);
        if (result) results.push(result);
      }

      if (results.length > 0) {
        toast.success(`${results.length} file(s) uploaded`);
      }
    } finally {
      setIsUploading(false);
      // Clear progress after delay
      setTimeout(() => setUploadProgress([]), 2000);
    }

    return results;
  }, [pendingEvidence, uploadFile]);

  /**
   * Delete uploaded evidence
   */
  const deleteEvidence = useCallback(async (evidence: Evidence) => {
    try {
      // Soft delete in database
      const { error: dbError } = await supabase
        .from('test_evidence')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
        })
        .eq('id', evidence.id);

      if (dbError) throw dbError;

      setUploadedEvidence(prev => prev.filter(e => e.id !== evidence.id));
      toast.success('Evidence deleted');
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete evidence');
    }
  }, []);

  /**
   * Load evidence for an execution step
   */
  const loadEvidence = useCallback(async (executionStepId: string) => {
    try {
      const { data, error } = await supabase
        .from('test_evidence')
        .select('*')
        .eq('execution_step_id', executionStepId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const evidenceList: Evidence[] = await Promise.all(
        (data || []).map(async (row) => {
          const { data: urlData } = await supabase.storage
            .from('evidence')
            .createSignedUrl(row.storage_path || row.file_path, 3600);

          return {
            id: row.id,
            executionStepId: row.execution_step_id,
            fileName: row.file_name,
            fileType: row.file_type as Evidence['fileType'],
            filePath: row.file_path,
            fileSize: Number(row.file_size),
            mimeType: row.mime_type,
            captureMethod: (row.capture_method || 'file_browser') as CaptureMethod,
            width: row.width || undefined,
            height: row.height || undefined,
            originalFileName: row.original_file_name || row.file_name,
            storagePath: row.storage_path || row.file_path,
            uploadedBy: row.uploaded_by,
            createdAt: new Date(row.created_at),
            url: urlData?.signedUrl,
          };
        })
      );

      setUploadedEvidence(evidenceList);
    } catch (error) {
      console.error('Failed to load evidence:', error);
    }
  }, []);

  return {
    pendingEvidence,
    uploadedEvidence,
    uploadProgress,
    isUploading,
    addPendingEvidence,
    removePendingEvidence,
    clearPendingEvidence,
    uploadFile,
    uploadAllPending,
    deleteEvidence,
    loadEvidence,
    validateFile,
  };
}

/**
 * Get image dimensions from data URL
 */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataUrl;
  });
}
