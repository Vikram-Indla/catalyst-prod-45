/**
 * Screenshot Paste Hook
 * Handles Ctrl+V screenshot paste functionality
 */

import { useEffect, useCallback, useState } from 'react';

interface PastedScreenshot {
  id: string;
  file: File;
  preview: string;
  timestamp: number;
}

export function useScreenshotPaste(isOpen: boolean) {
  const [screenshots, setScreenshots] = useState<PastedScreenshot[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      if (!isOpen) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          
          const file = item.getAsFile();
          if (!file) continue;

          const reader = new FileReader();
          reader.onload = (event) => {
            const preview = event.target?.result as string;
            const newScreenshot: PastedScreenshot = {
              id: `screenshot-${Date.now()}-${Math.random().toString(36).slice(2)}`,
              file,
              preview,
              timestamp: Date.now(),
            };
            setScreenshots((prev) => [...prev, newScreenshot]);
          };
          reader.readAsDataURL(file);
        }
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const removeScreenshot = useCallback((id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearScreenshots = useCallback(() => {
    setScreenshots([]);
  }, []);

  const getFiles = useCallback(() => {
    return screenshots.map((s) => s.file);
  }, [screenshots]);

  return {
    screenshots,
    isUploading,
    setIsUploading,
    removeScreenshot,
    clearScreenshots,
    getFiles,
  };
}
