/**
 * Evidence System Types
 * Core types for the unified evidence upload system
 * TC-001 to TC-400: Complete evidence management
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
  // OCR fields (TC-261 to TC-290)
  ocrText?: string;
  ocrConfidence?: number;
  ocrProcessedAt?: Date;
  // AI analysis fields (TC-291 to TC-330)
  aiAnalysis?: AIAnalysisResult;
  aiAnalyzedAt?: Date;
  // Annotations (TC-186 to TC-260)
  annotations?: AnnotationData[];
  annotationsUpdatedAt?: Date;
  annotatedFilePath?: string;
}

// AI Analysis Result stored in DB
export interface AIAnalysisResult {
  defects?: DetectedDefectData[];
  summary?: string;
  overallQuality?: 'excellent' | 'good' | 'fair' | 'poor';
  testSteps?: TestStepData[];
  pageType?: string;
  mainFeatures?: string[];
}

export interface DetectedDefectData {
  type: 'visual' | 'functional' | 'accessibility' | 'performance' | 'content' | 'layout';
  severity: 'critical' | 'major' | 'minor' | 'trivial';
  title: string;
  description: string;
  location?: string;
  suggestion?: string;
}

export interface TestStepData {
  action: string;
  target?: string;
  expectedResult: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AnnotationData {
  id: string;
  type: 'rectangle' | 'arrow' | 'text' | 'blur' | 'highlight' | 'freehand' | 'circle';
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  points?: { x: number; y: number }[];
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
