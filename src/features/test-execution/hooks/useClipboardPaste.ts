// ============================================================
// Hook for handling clipboard paste events
// ============================================================

import { useEffect, useCallback } from 'react';
import type { ClipboardImageData } from '../types/evidence';

interface UseClipboardPasteOptions {
  onPaste: (data: ClipboardImageData) => void;
  enabled?: boolean;
}

export function useClipboardPaste({ onPaste, enabled = true }: UseClipboardPasteOptions) {
  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (!enabled) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          // Get image dimensions
          const img = new Image();
          const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.src = URL.createObjectURL(blob);
          });

          onPaste({
            blob,
            type: item.type,
            width: dimensions.width,
            height: dimensions.height,
          });
        }
        break;
      }
    }
  }, [enabled, onPaste]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);
}
