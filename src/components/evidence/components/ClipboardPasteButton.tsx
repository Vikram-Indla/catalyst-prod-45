// ═══════════════════════════════════════════════════════════════════════════
// CLIPBOARD PASTE BUTTON & HOOK
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useCallback } from 'react';
import { Clipboard } from 'lucide-react';
import { toast } from 'sonner';

interface ClipboardPasteButtonProps {
  onPaste: (blob: Blob) => void;
  disabled?: boolean;
}

export const useClipboardPaste = (
  onPaste: (blob: Blob) => void,
  disabled?: boolean
) => {
  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    if (disabled) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          onPaste(blob);
          toast.success('Image pasted');
        }
        return;
      }
    }
  }, [onPaste, disabled]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);
};

export const ClipboardPasteButton: React.FC<ClipboardPasteButtonProps> = ({ 
  onPaste,
  disabled 
}) => {
  // Use the paste hook
  useClipboardPaste(onPaste, disabled);

  return (
    <button
      disabled={disabled}
      className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg 
                 hover:bg-primary/10 transition-colors group
                 disabled:opacity-50 disabled:cursor-not-allowed cursor-default"
      title="Press Ctrl+V to paste an image"
    >
      <Clipboard className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      <span className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
        Paste Image
      </span>
    </button>
  );
};
