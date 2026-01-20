// ============================================================
// Module 3A-3: Result Recording & Evidence Types
// ============================================================

// Evidence Type Enum
export type EvidenceType = 'screenshot' | 'video' | 'file' | 'log';

// Evidence File
export interface EvidenceFile {
  id: string;
  type: EvidenceType;
  filename: string;
  original_filename?: string;
  storage_path: string;
  file_size: number;
  mime_type?: string;
  width?: number;
  height?: number;
  thumbnail_path?: string;
  metadata?: Record<string, unknown>;
  uploaded_by?: {
    id: string;
    name: string;
  };
  created_at: string;
  // Computed URLs (from Supabase Storage)
  url?: string;
  thumbnail_url?: string;
}

// Upload Progress State
export interface UploadProgress {
  file_name: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error_message?: string;
}

// Upload State (for multiple files)
export interface UploadState {
  uploads: UploadProgress[];
  is_uploading: boolean;
  total_progress: number;
}

// Actual Result Input
export interface ActualResultInput {
  execution_id: string;
  step_id: string;
  actual_result?: string;
  notes?: string;
}

// Evidence Upload Input
export interface EvidenceUploadInput {
  step_result_id: string;
  file: File;
  type?: EvidenceType;
}

// Comparison Result
export interface ComparisonResult {
  expected: string;
  actual: string | null;
  similarity: number;
  has_actual: boolean;
  match_level: 'not_recorded' | 'high_match' | 'partial_match' | 'low_match';
}

// Clipboard Data
export interface ClipboardImageData {
  blob: Blob;
  type: string;
  width?: number;
  height?: number;
}

// Drag & Drop Event
export interface DragDropState {
  is_dragging: boolean;
  is_over_drop_zone: boolean;
  files: File[];
}

// Quick Template Type
export type QuickTemplate = 'passed' | 'deviation' | 'failed';

// Quick Template Content
export interface QuickTemplateConfig {
  id: QuickTemplate;
  label: string;
  icon: string;
  content: string;
  bgColor: string;
  textColor: string;
}

// Evidence Gallery State
export interface GalleryState {
  selected_id: string | null;
  preview_open: boolean;
  comparison_open: boolean;
  comparison_position: number; // 0-100 for slider
}

// Supported File Types
export const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
export const SUPPORTED_DOC_TYPES = ['application/pdf'];
export const SUPPORTED_TEXT_TYPES = ['text/plain', 'text/log'];
export const ALL_SUPPORTED_TYPES = [...SUPPORTED_IMAGE_TYPES, ...SUPPORTED_DOC_TYPES, ...SUPPORTED_TEXT_TYPES];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
