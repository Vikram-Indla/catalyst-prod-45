// ═══════════════════════════════════════════════════════════════════════════
// EVIDENCE SYSTEM EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

// Core components
export { EvidenceUploadZone } from './EvidenceUploadZone';
export { EvidenceGallery } from './EvidenceGallery';
export { AnnotationEditor } from './annotation';
export { OcrPanel, EvidenceSearch } from './ocr';

// AI Analysis
export { 
  AiAnalysisPanel, 
  IssueCard, 
  useAnalyzeEvidence 
} from './ai';

// Defect Creation
export { CreateDefectModal } from './defect';
export type { 
  CreateDefectModalProps, 
  AiSuggestion, 
  LinkedEvidence 
} from './defect';

// Test Execution Integration
export { StepEvidenceSection, AttachmentCountBadge } from './integration';

// Reports & Export
export { 
  EvidenceStats, 
  ExecutionSummary, 
  ExportButtons 
} from './reports';

// Types
export type { 
  EvidenceUploadZoneProps, 
  EvidenceGalleryProps,
  Attachment, 
  UploadProgress 
} from './types';
export type { Annotation, AnnotationEditorProps, Tool } from './annotation';
export type { 
  AiAnalysisResult, 
  DetectedIssue, 
  IssueSeverity, 
  IssueType,
  OverallQuality,
  AiAnalysisPanelProps
} from './ai';
export { ALLOWED_TYPES, MAX_FILE_SIZE } from './types';
