/**
 * Lazy Image Loading Hook
 * TC-281 to TC-295: Progressive image loading with placeholders
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyImageLoadingOptions {
  src: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

interface LazyImageState {
  isLoaded: boolean;
  isError: boolean;
  isInView: boolean;
  currentSrc: string;
}

export function useLazyImageLoading({
  src,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3C/svg%3E',
  threshold = 0.1,
  rootMargin = '100px'
}: UseLazyImageLoadingOptions): LazyImageState & { 
  ref: React.RefObject<HTMLDivElement>;
  retry: () => void;
} {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<LazyImageState>({
    isLoaded: false,
    isError: false,
    isInView: false,
    currentSrc: placeholder
  });

  const loadImage = useCallback(() => {
    const img = new Image();
    img.onload = () => {
      setState(prev => ({
        ...prev,
        isLoaded: true,
        isError: false,
        currentSrc: src
      }));
    };
    img.onerror = () => {
      setState(prev => ({
        ...prev,
        isLoaded: false,
        isError: true,
        currentSrc: placeholder
      }));
    };
    img.src = src;
  }, [src, placeholder]);

  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      isError: false,
      isLoaded: false,
      currentSrc: placeholder
    }));
    loadImage();
  }, [loadImage, placeholder]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setState(prev => ({ ...prev, isInView: true }));
            loadImage();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [loadImage, threshold, rootMargin]);

  return { ...state, ref, retry };
}

/**
 * Batch image preloader for upcoming images
 */
export function useImagePreloader(urls: string[], preloadCount = 3) {
  useEffect(() => {
    const preloadUrls = urls.slice(0, preloadCount);
    const images: HTMLImageElement[] = [];

    preloadUrls.forEach((url) => {
      const img = new Image();
      img.src = url;
      images.push(img);
    });

    return () => {
      images.forEach((img) => {
        img.src = '';
      });
    };
  }, [urls, preloadCount]);
}
