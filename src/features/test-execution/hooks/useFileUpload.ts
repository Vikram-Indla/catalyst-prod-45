// ============================================================
// Hook for file upload with progress tracking
// ============================================================

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import type { UploadProgress } from '../types/evidence';
import type { EvidenceType } from '../types/step-execution';
import { ALL_SUPPORTED_TYPES, MAX_FILE_SIZE } from '../types/evidence';

interface UploadOptions {
  stepResultId: string;
  type?: EvidenceType;
  onProgress?: (progress: number) => void;
}

export function useFileUpload() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const detectType = (file: File): EvidenceType => {
    if (file.type.startsWith('image/')) return 'screenshot';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type === 'text/plain' || file.name.endsWith('.log')) return 'log';
    return 'file';
  };

  const uploadFile = useCallback(async (file: File, options: UploadOptions) => {
    const { stepResultId, type } = options;

    // Validate file type
    if (!ALL_SUPPORTED_TYPES.includes(file.type) && !file.name.endsWith('.log')) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('File too large. Maximum size is 10MB');
    }

    const fileId = uuidv4();
    const ext = file.name.split('.').pop() || 'bin';
    const storagePath = `${stepResultId}/${fileId}.${ext}`;
    const evidenceType = type || detectType(file);

    // Update progress
    setUploadProgress(prev => [...prev, {
      file_name: file.name,
      progress: 0,
      status: 'uploading',
    }]);

    try {
      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('evidence')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get image dimensions if image
      let width: number | undefined;
      let height: number | undefined;
      if (file.type.startsWith('image/')) {
        const img = new Image();
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.src = URL.createObjectURL(file);
        });
        width = dimensions.width;
        height = dimensions.height;
      }

      // Record in database
      const { data, error } = await supabase
        .rpc('upload_evidence', {
          p_step_result_id: stepResultId,
          p_type: evidenceType,
          p_filename: `${fileId}.${ext}`,
          p_original_filename: file.name,
          p_storage_path: storagePath,
          p_file_size: file.size,
          p_mime_type: file.type,
          p_width: width,
          p_height: height,
          p_thumbnail_path: null,
          p_metadata: {},
        });

      if (error) throw error;

      const resultData = data as { error?: string } | null;
      if (resultData?.error) throw new Error(resultData.error);

      // Update progress to complete
      setUploadProgress(prev => prev.map(p =>
        p.file_name === file.name ? { ...p, progress: 100, status: 'complete' as const } : p
      ));

      // Invalidate query
      queryClient.invalidateQueries({ queryKey: ['step-evidence', stepResultId] });

      toast({
        title: 'Evidence uploaded',
        description: file.name,
      });

      return data;
    } catch (error) {
      setUploadProgress(prev => prev.map(p =>
        p.file_name === file.name ? { ...p, status: 'error' as const, error_message: (error as Error).message } : p
      ));
      throw error;
    }
  }, [queryClient, toast]);

  const uploadMultiple = useCallback(async (files: File[], options: Omit<UploadOptions, 'onProgress'>) => {
    const results = await Promise.allSettled(
      files.map(file => uploadFile(file, options))
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    if (failed > 0) {
      toast({
        title: `Uploaded ${succeeded} of ${files.length} files`,
        description: `${failed} file(s) failed to upload`,
        variant: 'destructive',
      });
    }

    return results;
  }, [uploadFile, toast]);

  const clearProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  return {
    uploadFile,
    uploadMultiple,
    uploadProgress,
    clearProgress,
    isUploading: uploadProgress.some(p => p.status === 'uploading'),
  };
}
