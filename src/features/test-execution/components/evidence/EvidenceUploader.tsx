// ============================================================
// EvidenceUploader - Multi-method upload component
// ============================================================

import { useCallback, useRef } from 'react';
import { Upload, Camera, Clipboard, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFileUpload } from '../../hooks/useFileUpload';
import { useClipboardPaste } from '../../hooks/useClipboardPaste';
import { useDragDrop } from '../../hooks/useDragDrop';
import { ALL_SUPPORTED_TYPES } from '../../types/evidence';

interface EvidenceUploaderProps {
  stepResultId: string;
  disabled?: boolean;
  onUploadComplete?: () => void;
}

export function EvidenceUploader({
  stepResultId,
  disabled = false,
  onUploadComplete,
}: EvidenceUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploadMultiple, isUploading } = useFileUpload();

  // Handle file selection
  const handleFileSelect = useCallback(async (files: File[]) => {
    if (files.length === 0 || !stepResultId) return;

    try {
      if (files.length === 1) {
        await uploadFile(files[0], { stepResultId });
      } else {
        await uploadMultiple(files, { stepResultId });
      }
      onUploadComplete?.();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }, [stepResultId, uploadFile, uploadMultiple, onUploadComplete]);

  // Handle clipboard paste
  useClipboardPaste({
    onPaste: async (data) => {
      if (!stepResultId) return;
      const file = new File([data.blob], `screenshot-${Date.now()}.png`, { type: data.type });
      await uploadFile(file, { stepResultId, type: 'screenshot' });
      onUploadComplete?.();
    },
    enabled: !disabled && !!stepResultId,
  });

  // Handle drag & drop
  const { is_over_drop_zone, handlers } = useDragDrop({
    onDrop: handleFileSelect,
    accept: ALL_SUPPORTED_TYPES,
  });

  // Handle screen capture
  const handleScreenCapture = useCallback(async () => {
    if (!stepResultId) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const track = stream.getVideoTracks()[0];
      
      // Create a video element to capture the frame
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Wait a moment for the video to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create canvas and capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      // Stop the stream
      track.stop();

      // Convert to blob
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((b) => resolve(b!), 'image/png');
      });

      const file = new File([blob], `screen-capture-${Date.now()}.png`, { type: 'image/png' });
      await uploadFile(file, { stepResultId, type: 'screenshot' });
      onUploadComplete?.();
    } catch (error) {
      // User cancelled or error
      console.log('Screen capture cancelled or failed:', error);
    }
  }, [stepResultId, uploadFile, onUploadComplete]);

  // Handle file input click
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFileSelect(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  return (
    <div className="space-y-3">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBrowseClick}
          disabled={disabled || isUploading}
          className="gap-2"
        >
          <FileUp className="h-4 w-4" />
          Browse
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleScreenCapture}
          disabled={disabled || isUploading}
          className="gap-2"
        >
          <Camera className="h-4 w-4" />
          Capture Screen
        </Button>

        <span className="text-xs text-muted-foreground self-center">
          or paste with Ctrl+V
        </span>
      </div>

      {/* Drop Zone */}
      <div
        {...handlers}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          is_over_drop_zone
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={!disabled ? handleBrowseClick : undefined}
      >
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          {is_over_drop_zone
            ? 'Drop files here...'
            : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, PDF, TXT (max 10MB)
        </p>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALL_SUPPORTED_TYPES.join(',')}
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Upload Progress */}
      {isUploading && (
        <div className="text-sm text-muted-foreground animate-pulse">
          Uploading...
        </div>
      )}
    </div>
  );
}
