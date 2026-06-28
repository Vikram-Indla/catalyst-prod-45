import type { SourceLanguageCode } from './voiceFlow.types';

export const VOICE_FLOW_CONFIG = {
  /** ms window for double-space detection. */
  doubleSpaceThresholdMs: 350,
  /** Max recording duration before auto-stop (3 minutes). */
  maxDurationMs: 180_000,
  /** Auto-stop after this much true silence (amplitude-based via AnalyserNode). */
  silenceAutoStopMs: 0_800,
  /** Run Gemini cleanup/polish pass on final result. */
  cleanupEnabled: true,
  /** Auto-commit result without user confirmation step. */
  autoCommit: true,
  /** Source languages Gemini should attempt to transcribe from. */
  sourceLanguages: ['ar-SA', 'ar-AE', 'ur-PK', 'hi-IN'] as SourceLanguageCode[],
  /** Target language always English for Phase 1. */
  targetLanguage: 'en' as const,
  /** MediaRecorder audio MIME type preference order. */
  preferredMimeTypes: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
  ],
  /** When confidence is low, pause for user review instead of auto-committing. */
  confidenceReviewEnabled: true,
} as const;

// ─── Language preference (page-session scope only) ───────────────────────────
// Intentionally NOT persisted to localStorage — persisting 'en' across page
// loads causes Urdu/Arabic/Hindi speech to bypass Groq and land in native
// SpeechRecognition, which produces phonetic Roman Urdu instead of translations.
// Every page load starts with Groq; native path only activates mid-session
// after Groq confirms the user is speaking English.
let _sessionPreferredLang: string | null = null;

export function setPreferredLanguage(lang: string): void {
  _sessionPreferredLang = lang;
}

export function getPreferredLanguage(): string | null {
  return _sessionPreferredLang;
}

/** Fields that must never activate voice regardless of kind. */
export const BLOCKED_INPUT_TYPES = new Set([
  'password', 'hidden', 'file', 'submit', 'button',
  'reset', 'image', 'radio', 'checkbox', 'range', 'color',
]);

/** aria-labels / name patterns that indicate sensitive fields — block voice. */
export const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api.?key/i,
  /otp/i,
  /pin\b/i,
  /credit.?card/i,
  /cvv/i,
  /ssn/i,
];
