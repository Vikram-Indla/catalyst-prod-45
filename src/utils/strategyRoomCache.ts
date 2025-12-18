/**
 * Strategy Room LKG (Last Known Good) Cache
 * Provides sessionStorage-backed caching per snapshot and section
 * Prevents UI twitching during data refreshes
 */

// Cache key pattern: strategyRoom:lkg:${snapshotId}:${section}
const CACHE_PREFIX = 'strategyRoom:lkg:';

export type CacheSection = 'pulse' | 'exposure' | 'coverage' | 'okrTree';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  snapshotId: string;
}

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry<unknown>>();

// Max age for cached data (30 minutes)
const CACHE_MAX_AGE = 30 * 60 * 1000;

function getCacheKey(snapshotId: string, section: CacheSection): string {
  return `${CACHE_PREFIX}${snapshotId}:${section}`;
}

/**
 * Get data from LKG cache (memory first, then sessionStorage)
 */
export function getLKGData<T>(snapshotId: string, section: CacheSection): T | null {
  if (!snapshotId) return null;
  
  const key = getCacheKey(snapshotId, section);
  
  // Try memory cache first (fastest)
  const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_MAX_AGE) {
    return memEntry.data;
  }
  
  // Try sessionStorage
  try {
    const stored = sessionStorage.getItem(key);
    if (stored) {
      const entry = JSON.parse(stored) as CacheEntry<T>;
      if (Date.now() - entry.timestamp < CACHE_MAX_AGE) {
        // Restore to memory cache
        memoryCache.set(key, entry);
        return entry.data;
      } else {
        // Expired - clean up
        sessionStorage.removeItem(key);
      }
    }
  } catch (err) {
    console.warn('[LKG Cache] Failed to read from sessionStorage:', err);
  }
  
  return null;
}

/**
 * Store data in LKG cache (both memory and sessionStorage)
 */
export function setLKGData<T>(snapshotId: string, section: CacheSection, data: T): void {
  if (!snapshotId || data === null || data === undefined) return;
  
  const key = getCacheKey(snapshotId, section);
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    snapshotId,
  };
  
  // Store in memory
  memoryCache.set(key, entry);
  
  // Persist to sessionStorage
  try {
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.warn('[LKG Cache] Failed to write to sessionStorage:', err);
  }
}

/**
 * Clear LKG cache for a specific snapshot or all
 */
export function clearLKGCache(snapshotId?: string): void {
  if (snapshotId) {
    // Clear specific snapshot
    const sections: CacheSection[] = ['pulse', 'exposure', 'coverage', 'okrTree'];
    sections.forEach(section => {
      const key = getCacheKey(snapshotId, section);
      memoryCache.delete(key);
      try {
        sessionStorage.removeItem(key);
      } catch (err) {
        // Ignore
      }
    });
  } else {
    // Clear all
    memoryCache.clear();
    try {
      Object.keys(sessionStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => sessionStorage.removeItem(k));
    } catch (err) {
      // Ignore
    }
  }
}

/**
 * Safe number helper - ensures values never become NaN or undefined
 */
export function safeNumber(value: unknown, fallback: number = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

/**
 * Safe percentage helper - clamps to 0-100 range
 */
export function safePercentage(value: unknown, fallback: number = 0): number {
  const num = safeNumber(value, fallback);
  return Math.max(0, Math.min(100, num));
}

/**
 * Safe array helper - ensures always returns an array
 */
export function safeArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}
