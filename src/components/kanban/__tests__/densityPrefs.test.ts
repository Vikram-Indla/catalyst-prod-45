/**
 * Unit tests for the Kanban density localStorage adapter.
 *
 * Covers the three failure modes I actually care about: missing entry,
 * malformed entry, and a localStorage that throws (quota / disabled).
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { readDensityPref, writeDensityPref, DENSITY_STORAGE_KEY } from '../densityPrefs';

describe('readDensityPref', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns fallback when nothing is stored', () => {
    expect(readDensityPref('dense')).toBe('dense');
    expect(readDensityPref()).toBe('comfortable');
  });

  it('returns a stored valid value', () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'compact');
    expect(readDensityPref()).toBe('compact');
  });

  it('returns fallback when the stored value is malformed', () => {
    window.localStorage.setItem(DENSITY_STORAGE_KEY, 'spacious');
    expect(readDensityPref('dense')).toBe('dense');
  });

  it('returns fallback when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('disabled');
    });
    expect(readDensityPref('compact')).toBe('compact');
    spy.mockRestore();
  });
});

describe('writeDensityPref', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists the value', () => {
    writeDensityPref('dense');
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe('dense');
  });

  it('swallows errors when localStorage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => writeDensityPref('comfortable')).not.toThrow();
    spy.mockRestore();
  });
});
