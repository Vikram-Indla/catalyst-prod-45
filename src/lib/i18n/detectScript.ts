/**
 * detectScript — cheap Unicode-range script detection for translate gating
 * (CAT-VOICE-UX-PREMIUM-20260708-001 S4a).
 *
 * Client-side and deterministic: the translate affordance must only appear
 * when content exists AND its script differs from the reader's target —
 * never on empty or same-language text (Gmail/Teams/LinkedIn rule). Matches
 * the ARABIC_RE used by the ai-translate-field edge function; the Arabic
 * block also covers Urdu and Persian letters.
 */

const ARABIC_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

/** Minimum characters before offering translation — language detection on
 *  very short strings is noise (Teams refuses short messages outright). */
export const MIN_TRANSLATABLE_LENGTH = 4;

export function containsArabicScript(text: string): boolean {
  return ARABIC_RE.test(text);
}

/** True when `text` is worth offering an Arabic→English translation for. */
export function isTranslatableArabic(text: string | null | undefined): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < MIN_TRANSLATABLE_LENGTH) return false;
  return ARABIC_RE.test(trimmed);
}
