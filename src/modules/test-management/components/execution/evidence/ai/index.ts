/**
 * AI Analysis Module - Evidence System
 * TC-261 to TC-330: OCR, Defect Detection, Smart Suggestions
 * TC-331 to TC-355: Create Defect from AI Finding
 */

export { AIAnalysisPanel } from './AIAnalysisPanel';
export { 
  useEvidenceAI, 
  type DetectedDefect, 
  type DefectAnalysisResult, 
  type TestStepSuggestionResult, 
  type OCRResult 
} from './useEvidenceAI';
export { CreateDefectFromAIModal, type AIDefectSubmitData } from './CreateDefectFromAIModal';
export { useCreateDefectFromAI } from './useCreateDefectFromAI';
