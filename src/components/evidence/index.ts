// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE SYSTEM EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { EvidenceUploadZone } from './EvidenceUploadZone';
export { EvidenceGallery } from './EvidenceGallery';
export { AnnotationEditor } from './annotation';
export { OcrPanel, EvidenceSearch } from './ocr';
export type { 
  EvidenceUploadZoneProps, 
  EvidenceGalleryProps,
  Attachment, 
  UploadProgress 
} from './types';
export type { Annotation, AnnotationEditorProps, Tool } from './annotation';
export { ALLOWED_TYPES, MAX_FILE_SIZE } from './types';
