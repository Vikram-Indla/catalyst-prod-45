import type { SourceLanguageCode } from './voiceFlow.types';

export const VOICE_FLOW_CONFIG = {
  /** ms window for double-space detection. */
  doubleSpaceThresholdMs: 350,
  /** Max recording duration before auto-stop (15 minutes — CatyFlow spec,
   *  CAT-VOICE-FLOW-20260704-001). There is deliberately NO silence auto-stop:
   *  thinking pauses of any length keep the session alive
   *  (CAT-VOICE-UX-PREMIUM-20260708-001 S1; Wispr-parity). */
  maxDurationMs: 900_000,
  /** Elapsed speaking time at which the capsule warns the cap is near. */
  capWarningMs: 840_000,
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

// Language preference routing was REMOVED entirely (Arabic demo fix,
// 2026-07-08): even session-scoped 'en' pinning sent the next Arabic
// utterance through a native en-US recognizer. Every session now uses the
// same language-agnostic engine; nothing about a previous utterance can
// change how the next one is recognized.

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
