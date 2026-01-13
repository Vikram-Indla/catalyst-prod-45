/**
 * Memory Management Hook
 * TC-316 to TC-330: Memory optimization and cleanup
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface MemoryStats {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  objectURLCount: number;
  cachedImagesCount: number;
}

interface UseMemoryManagementOptions {
  maxCachedImages?: number;
  cleanupThreshold?: number; // Percentage of heap limit
  autoCleanup?: boolean;
}

export function useMemoryManagement({
  maxCachedImages = 50,
  cleanupThreshold = 0.8,
  autoCleanup = true
}: UseMemoryManagementOptions = {}) {
  const objectURLs = useRef<Set<string>>(new Set());
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const [stats, setStats] = useState<MemoryStats>({
    objectURLCount: 0,
    cachedImagesCount: 0
  });

  // Create and track object URL
  const createObjectURL = useCallback((blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    objectURLs.current.add(url);
    setStats(prev => ({ ...prev, objectURLCount: objectURLs.current.size }));
    return url;
  }, []);

  // Revoke a specific object URL
  const revokeObjectURL = useCallback((url: string) => {
    if (objectURLs.current.has(url)) {
      URL.revokeObjectURL(url);
      objectURLs.current.delete(url);
      setStats(prev => ({ ...prev, objectURLCount: objectURLs.current.size }));
    }
  }, []);

  // Revoke all object URLs
  const revokeAllObjectURLs = useCallback(() => {
    objectURLs.current.forEach(url => URL.revokeObjectURL(url));
    objectURLs.current.clear();
    setStats(prev => ({ ...prev, objectURLCount: 0 }));
  }, []);

  // Cache an image
  const cacheImage = useCallback((key: string, img: HTMLImageElement) => {
    // Evict oldest if at limit
    if (imageCache.current.size >= maxCachedImages) {
      const oldestKey = imageCache.current.keys().next().value;
      if (oldestKey) {
        imageCache.current.delete(oldestKey);
      }
    }
    
    imageCache.current.set(key, img);
    setStats(prev => ({ ...prev, cachedImagesCount: imageCache.current.size }));
  }, [maxCachedImages]);

  // Get cached image
  const getCachedImage = useCallback((key: string): HTMLImageElement | undefined => {
    return imageCache.current.get(key);
  }, []);

  // Clear image cache
  const clearImageCache = useCallback(() => {
    imageCache.current.clear();
    setStats(prev => ({ ...prev, cachedImagesCount: 0 }));
  }, []);

  // Get memory stats
  const getMemoryStats = useCallback((): MemoryStats => {
    const memory = (performance as unknown as { memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } }).memory;
    
    return {
      usedJSHeapSize: memory?.usedJSHeapSize,
      totalJSHeapSize: memory?.totalJSHeapSize,
      jsHeapSizeLimit: memory?.jsHeapSizeLimit,
      objectURLCount: objectURLs.current.size,
      cachedImagesCount: imageCache.current.size
    };
  }, []);

  // Check if memory pressure is high
  const isMemoryPressureHigh = useCallback((): boolean => {
    const memory = (performance as unknown as { memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    } }).memory;
    
    if (!memory) return false;
    
    return memory.usedJSHeapSize / memory.jsHeapSizeLimit > cleanupThreshold;
  }, [cleanupThreshold]);

  // Perform cleanup
  const performCleanup = useCallback(() => {
    // Clear half of the image cache
    const keysToRemove = Math.floor(imageCache.current.size / 2);
    const keys = Array.from(imageCache.current.keys()).slice(0, keysToRemove);
    keys.forEach(key => imageCache.current.delete(key));

    // Trigger garbage collection hint (no guarantee)
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as unknown as { gc: () => void }).gc();
    }

    setStats(getMemoryStats());
  }, [getMemoryStats]);

  // Auto cleanup on memory pressure
  useEffect(() => {
    if (!autoCleanup) return;

    const checkMemory = () => {
      if (isMemoryPressureHigh()) {
        console.warn('High memory pressure detected, performing cleanup');
        performCleanup();
      }
    };

    const interval = setInterval(checkMemory, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [autoCleanup, isMemoryPressureHigh, performCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeAllObjectURLs();
      clearImageCache();
    };
  }, [revokeAllObjectURLs, clearImageCache]);

  return {
    createObjectURL,
    revokeObjectURL,
    revokeAllObjectURLs,
    cacheImage,
    getCachedImage,
    clearImageCache,
    getMemoryStats,
    isMemoryPressureHigh,
    performCleanup,
    stats
  };
}
