export type VoiceStatus =
  | 'idle'
  | 'arming'           // mic permission requested
  | 'listening'        // MediaRecorder active, user speaking
  | 'processing'       // blob sent to Gemini, awaiting result
  | 'ready'            // result received, showing preview (auto_commit=false only)
  | 'review'           // low-confidence result — user must confirm before commit
  | 'committing'       // inserting text into field
  | 'cancelled'        // user pressed Esc or ×
  | 'error';           // unrecoverable error in current session

export type SourceLanguageCode = 'ar-SA' | 'ar-AE' | 'ur-PK' | 'hi-IN';

export type ActiveFieldKind = 'input' | 'textarea' | 'contenteditable';

export interface ActiveField {
  element: HTMLElement;
  kind: ActiveFieldKind;
  /** Saved for input/textarea (character index). -1 = end of field. */
  savedStart: number;
  savedEnd: number;
  /** Cloned Range for contenteditable (may be stale — fall back to end). */
  savedRange: Range | null;
}

export interface VoiceResult {
  englishText: string;
  detectedLanguage?: string;
  confidence?: 'high' | 'low';
  durationMs: number;
  geminiLatencyMs?: number;
}

export interface VoiceFlowContextValue {
  status: VoiceStatus;
  result: VoiceResult | null;
  errorMessage: string | null;
  isActive: boolean;
  commit: () => void;
  cancel: () => void;
}
