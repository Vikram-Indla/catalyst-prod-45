const ARABIC_RANGE_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabic(text: string | null | undefined): boolean {
  if (!text) return false;
  return ARABIC_RANGE_RE.test(text);
}

/**
 * firstStrongDir — resolve text direction the same way the browser's
 * `dir="auto"` does: from the first strong directional character (Arabic →
 * rtl, Latin → ltr; numbers/punctuation/symbols are neutral and skipped).
 *
 * Use this to mirror a COMPOSED cell (e.g. a latin issue key followed by an
 * Arabic title) so the flex container's direction matches the title's own
 * `dir="auto"` resolution. Computing from the title — not the container's
 * first child — is required because the latin key would otherwise force the
 * whole row to ltr on every row.
 */
export function firstStrongDir(text: string | null | undefined): "rtl" | "ltr" {
  if (!text) return "ltr";
  for (const ch of text) {
    if (ARABIC_RANGE_RE.test(ch)) return "rtl";
    if (/[A-Za-zÀ-ɏḀ-ỿ]/.test(ch)) return "ltr";
  }
  return "ltr";
}

export function isArabicDominant(text: string | null | undefined): boolean {
  if (!text) return false;
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (!letters.length) return false;
  const arabicLetters = letters.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  if (!arabicLetters) return false;
  return arabicLetters.length / letters.length >= 0.5;
}
