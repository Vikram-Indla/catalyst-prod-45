/**
 * Evidence System Types
 * Core types for the unified evidence upload system
 */

export type CaptureMethod = 'screen_capture' | 'clipboard_paste' | 'drag_drop' | 'file_browser';

export interface Evidence {
  id: string;
  executionStepId: string;
  fileName: string;
  fileType: 'image' | 'video' | 'document' | 'log';
  filePath: string;
  fileSize: number;
  mimeType: string;
  captureMethod: CaptureMethod;
  width?: number;
  height?: number;
  originalFileName?: string;
  storagePath: string;
  uploadedBy: string;
  createdAt: Date;
  url?: string;
}

export interface PendingEvidence {
  id: string;
  file: File;
  preview: string;
  captureMethod: CaptureMethod;
  timestamp: number;
  width?: number;
  height?: number;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface EvidenceUploadOptions {
  executionStepId: string;
  maxSizeMB?: number;
  onProgress?: (progress: UploadProgress) => void;
}

// File type mapping
export const FILE_TYPE_MAP: Record<string, Evidence['fileType']> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'application/pdf': 'document',
  'text/plain': 'log',
  'text/csv': 'log',
  'application/json': 'log',
};

// Allowed file types
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/webm',
];

// Max file size in bytes (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;
