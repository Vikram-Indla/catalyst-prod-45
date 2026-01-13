// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE SYSTEM TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  captureMethod: 'screen_capture' | 'clipboard_paste' | 'file_upload' | 'drag_drop';
  width?: number;
  height?: number;
  thumbnailUrl?: string;
  annotations?: any[];
  ocrText?: string;
  aiHasIssues?: boolean;
  createdAt?: string;
}

export interface UploadProgress {
  id: string;
  fileName: string;
  progress: number; // 0-100
  status: 'uploading' | 'success' | 'error';
  error?: string;
  thumbnailUrl?: string;
  abortController?: AbortController;
  file?: File | Blob;
  captureMethod?: 'screen_capture' | 'clipboard_paste' | 'file_upload' | 'drag_drop';
}

export interface EvidenceUploadZoneProps {
  stepResultId: string;
  executionResultId: string;
  onUploadComplete: (attachment: Attachment) => void;
  onUploadError: (error: string) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export interface EvidenceGalleryProps {
  stepResultId: string;
  attachments: Attachment[];
  onDelete: (id: string) => void;
  onAnnotate: (id: string) => void;
  onRefresh: () => void;
}

export const ALLOWED_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'application/pdf'
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
