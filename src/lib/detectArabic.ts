const ARABIC_RANGE_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function containsArabic(text: string | null | undefined): boolean {
  if (!text) return false;
  return ARABIC_RANGE_RE.test(text);
}

export function isArabicDominant(text: string | null | undefined): boolean {
  if (!text) return false;
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (!letters.length) return false;
  const arabicLetters = letters.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g);
  if (!arabicLetters) return false;
  return arabicLetters.length / letters.length >= 0.5;
}
