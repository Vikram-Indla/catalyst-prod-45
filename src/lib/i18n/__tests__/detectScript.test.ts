import { describe, it, expect } from 'vitest';
import { containsArabicScript, isTranslatableArabic } from '../detectScript';

describe('detectScript', () => {
  it('detects Arabic', () => {
    expect(containsArabicScript('مرحبا، متى سيتم إصدار النسخة الجديدة؟')).toBe(true);
  });

  it('detects Urdu (Arabic block)', () => {
    expect(containsArabicScript('ٹیسٹ پیغام')).toBe(true);
  });

  it('detects Arabic embedded in English', () => {
    expect(containsArabicScript('Please review الملف المرفق before Thursday')).toBe(true);
  });

  it('rejects pure Latin', () => {
    expect(containsArabicScript('Ship the release notes today')).toBe(false);
  });

  it('rejects emoji and digits', () => {
    expect(containsArabicScript('🎉 75% done at 10:30')).toBe(false);
  });

  it('isTranslatableArabic gates on emptiness', () => {
    expect(isTranslatableArabic('')).toBe(false);
    expect(isTranslatableArabic(null)).toBe(false);
    expect(isTranslatableArabic(undefined)).toBe(false);
  });

  it('isTranslatableArabic suppresses very short strings', () => {
    expect(isTranslatableArabic('لا')).toBe(false); // 2 chars — too short to gate on
    expect(isTranslatableArabic('مرحبا')).toBe(true);
  });

  it('isTranslatableArabic rejects English messages', () => {
    expect(isTranslatableArabic('hello there')).toBe(false);
  });

  it('handles Eastern Arabic numerals with Arabic text', () => {
    expect(isTranslatableArabic('٧٥٪ من المهام مكتملة')).toBe(true);
  });
});
