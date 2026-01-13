/**
 * Clipboard Paste Hook
 * Enhanced clipboard paste with image detection and debouncing
 */

import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { CaptureMethod } from './types';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './types';

interface UseClipboardPasteOptions {
  enabled: boolean;
  onPaste: (file: File, captureMethod: CaptureMethod) => void;
  debounceMs?: number;
}

export function useClipboardPaste({
  enabled,
  onPaste,
  debounceMs = 300,
}: UseClipboardPasteOptions) {
  const lastPasteTime = useRef<number>(0);

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (!enabled) return;

      // Debounce rapid pastes
      const now = Date.now();
      if (now - lastPasteTime.current < debounceMs) {
        return;
      }

      const items = event.clipboardData?.items;
      if (!items) return;

      // Find image items
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          event.preventDefault();
          lastPasteTime.current = now;

          const file = item.getAsFile();
          if (!file) continue;

          // Validate file size
          if (file.size > MAX_FILE_SIZE) {
            toast.error('Pasted image too large. Maximum size is 10MB.');
            return;
          }

          // Validate file type
          if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            toast.error('Unsupported image format');
            return;
          }

          // Generate proper filename for pasted images
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = file.type.split('/')[1] || 'png';
          const pastedFile = new File(
            [file], 
            `paste-${timestamp}.${ext}`,
            { type: file.type }
          );

          onPaste(pastedFile, 'clipboard_paste');
          toast.success('Image pasted');
          return;
        }
      }

      // Text paste is ignored (no action needed)
    },
    [enabled, onPaste, debounceMs]
  );

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste, enabled]);

  /**
   * Manually read from clipboard (requires user interaction)
   */
  const readClipboard = useCallback(async () => {
    if (!enabled) return;

    try {
      // Check if Clipboard API is available
      if (!navigator.clipboard?.read) {
        toast.error('Clipboard access not available. Use Ctrl+V instead.');
        return;
      }

      const clipboardItems = await navigator.clipboard.read();
      
      for (const item of clipboardItems) {
        // Find image type
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          
          // Validate size
          if (blob.size > MAX_FILE_SIZE) {
            toast.error('Clipboard image too large. Maximum size is 10MB.');
            return;
          }

          // Create file
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const ext = imageType.split('/')[1] || 'png';
          const file = new File(
            [blob],
            `paste-${timestamp}.${ext}`,
            { type: imageType }
          );

          onPaste(file, 'clipboard_paste');
          toast.success('Image pasted from clipboard');
          return;
        }
      }

      toast.info('No image found in clipboard');
    } catch (error) {
      if ((error as Error).name === 'NotAllowedError') {
        toast.error('Clipboard access denied. Use Ctrl+V instead.');
      } else {
        console.error('Clipboard read error:', error);
        toast.error('Failed to read clipboard');
      }
    }
  }, [enabled, onPaste]);

  return { readClipboard };
}
