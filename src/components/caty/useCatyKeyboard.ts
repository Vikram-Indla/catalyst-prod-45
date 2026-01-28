/**
 * Caty V4 — Keyboard Hook
 * Handle keyboard shortcuts for the panel
 */

import { useEffect, RefObject } from 'react';

interface UseCatyKeyboardOptions {
  onClose: () => void;
  inputRef: RefObject<HTMLInputElement>;
  isOpen: boolean;
}

export function useCatyKeyboard({ onClose, inputRef, isOpen }: UseCatyKeyboardOptions) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, inputRef, isOpen]);
}
