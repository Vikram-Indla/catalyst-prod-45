/**
 * useResponsiveLayout — Responsive layout detection (F1.13)
 *
 * Detects viewport width and returns layout mode.
 * Uses window.innerWidth, not container width.
 */
import { useState, useEffect } from 'react';

export interface ResponsiveLayoutResult {
  isCompact: boolean;
}

export function useResponsiveLayout(
  threshold: number = 900
): ResponsiveLayoutResult {
  const [isCompact, setIsCompact] = useState<boolean>(() => {
    return window.innerWidth < threshold;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsCompact(window.innerWidth < threshold);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [threshold]);

  return { isCompact };
}
