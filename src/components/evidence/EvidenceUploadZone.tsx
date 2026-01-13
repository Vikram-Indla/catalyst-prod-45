// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE UPLOAD ZONE
// Main component for uploading evidence files during test execution
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { Lock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { EvidenceUploadZoneProps, UploadProgress, Attachment } from './types';
import { ScreenCaptureButton } from './components/ScreenCaptureButton';
import { ClipboardPasteButton } from './components/ClipboardPasteButton';
import { FileBrowserButton } from './components/FileBrowserButton';
import { DragDropZone } from './components/DragDropZone';
import { UploadProgressList } from './components/UploadProgressList';
import { uploadEvidence } from './utils/upload';
import { validateFile } from './utils/validation';

export const EvidenceUploadZone: React.FC<EvidenceUploadZoneProps> = ({
  stepResultId,
  executionResultId,
  onUploadComplete,
  onUploadError,
  disabled = false,
  maxFiles = 10
}) => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  // Process a file upload
  const processUpload = useCallback(async (
    file: File | Blob,
    captureMethod: 'screen_capture' | 'clipboard_paste' | 'file_upload' | 'drag_drop'
  ) => {
    const uploadId = uuidv4();
    const fileName = file instanceof File ? file.name : `capture-${Date.now()}.png`;

    // Create thumbnail for images
    let thumbnailUrl: string | undefined;
    if (file.type.startsWith('image/')) {
      thumbnailUrl = URL.createObjectURL(file);
    }

    // Add to uploads list
    const newUpload: UploadProgress = {
      id: uploadId,
      fileName,
      progress: 0,
      status: 'uploading',
      thumbnailUrl,
      file,
      captureMethod
    };

    setUploads(prev => [...prev, newUpload]);

    try {
      const attachment = await uploadEvidence(
        file,
        captureMethod,
        stepResultId,
        executionResultId,
        (progress) => {
          setUploads(prev =>
            prev.map(u => u.id === uploadId ? { ...u, progress } : u)
          );
        }
      );

      // Update status to success
      setUploads(prev =>
        prev.map(u => u.id === uploadId ? { ...u, status: 'success', progress: 100 } : u)
      );

      onUploadComplete(attachment);

      // Auto-remove success items after 3s
      setTimeout(() => {
        setUploads(prev => prev.filter(u => u.id !== uploadId));
        if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';

      setUploads(prev =>
        prev.map(u => u.id === uploadId ? { ...u, status: 'error', error: errorMessage } : u)
      );

      onUploadError(errorMessage);
    }
  }, [stepResultId, executionResultId, onUploadComplete, onUploadError]);

  // Handle screen capture
  const handleScreenCapture = useCallback((blob: Blob) => {
    if (disabled) return;
    processUpload(blob, 'screen_capture');
  }, [disabled, processUpload]);

  // Handle clipboard paste
  const handleClipboardPaste = useCallback((blob: Blob) => {
    if (disabled) return;
    processUpload(blob, 'clipboard_paste');
  }, [disabled, processUpload]);

  // Handle file browser selection
  const handleFileSelect = useCallback((files: File[]) => {
    if (disabled) return;
    const currentCount = uploads.filter(u => u.status !== 'error').length;
    const remaining = maxFiles - currentCount;
    const filesToProcess = files.slice(0, remaining);

    filesToProcess.forEach(file => {
      if (validateFile(file)) {
        processUpload(file, 'file_upload');
      }
    });
  }, [disabled, uploads, maxFiles, processUpload]);

  // Handle drag & drop
  const handleDrop = useCallback((files: File[]) => {
    if (disabled) return;
    const currentCount = uploads.filter(u => u.status !== 'error').length;
    const remaining = maxFiles - currentCount;
    const filesToProcess = files.slice(0, remaining);

    filesToProcess.forEach(file => {
      processUpload(file, 'drag_drop');
    });
  }, [disabled, uploads, maxFiles, processUpload]);

  // Handle cancel
  const handleCancel = useCallback((id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload?.abortController) {
      upload.abortController.abort();
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  }, [uploads]);

  // Handle retry
  const handleRetry = useCallback((id: string) => {
    const upload = uploads.find(u => u.id === id);
    if (upload?.file && upload.captureMethod) {
      // Remove the failed upload
      setUploads(prev => prev.filter(u => u.id !== id));
      // Retry
      processUpload(upload.file, upload.captureMethod);
    }
  }, [uploads, processUpload]);

  return (
    <div className="evidence-upload-zone relative rounded-xl border-2 border-dashed border-border 
                    hover:border-primary transition-colors bg-muted/30 p-6">
      
      {/* Upload Methods Row */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <ScreenCaptureButton onCapture={handleScreenCapture} disabled={disabled} />
        <div className="h-8 w-px bg-border" />
        <ClipboardPasteButton onPaste={handleClipboardPaste} disabled={disabled} />
        <div className="h-8 w-px bg-border" />
        <FileBrowserButton onSelect={handleFileSelect} disabled={disabled} />
      </div>

      {/* Drag Drop Zone */}
      <DragDropZone onDrop={handleDrop} disabled={disabled} />

      {/* Upload Progress List */}
      <UploadProgressList 
        uploads={uploads} 
        onCancel={handleCancel}
        onRetry={handleRetry}
      />

      {/* Keyboard Hints */}
      <div className="text-xs text-muted-foreground text-center mt-4">
        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+Shift+S</kbd>
        <span className="ml-1 mr-3">Screen capture</span>
        <span className="mx-2">•</span>
        <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">Ctrl+V</kbd>
        <span className="ml-1">Paste</span>
      </div>

      {/* Disabled Overlay */}
      {disabled && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl 
                        flex items-center justify-center z-10">
          <div className="text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Execution completed</p>
            <p className="text-xs text-muted-foreground/70">Evidence upload disabled</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceUploadZone;
