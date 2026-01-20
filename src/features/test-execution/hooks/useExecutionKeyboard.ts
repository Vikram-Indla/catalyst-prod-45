/**
 * Hook for keyboard shortcut handling in step execution
 */
import { useEffect, useCallback } from 'react';

interface KeyboardHandlers {
  onPass?: () => void;
  onFail?: () => void;
  onBlock?: () => void;
  onSkip?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onNotes?: () => void;
  onExit?: () => void;
  enabled?: boolean;
}

export function useExecutionKeyboard(handlers: KeyboardHandlers) {
  const {
    onPass, onFail, onBlock, onSkip,
    onPrev, onNext, onNotes, onExit,
    enabled = true,
  } = handlers;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      if (event.key === 'Escape' && onExit) onExit();
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'p':
        event.preventDefault();
        onPass?.();
        break;
      case 'f':
        event.preventDefault();
        onFail?.();
        break;
      case 'b':
        event.preventDefault();
        onBlock?.();
        break;
      case 's':
        event.preventDefault();
        onSkip?.();
        break;
      case 'arrowleft':
        event.preventDefault();
        onPrev?.();
        break;
      case 'arrowright':
        event.preventDefault();
        onNext?.();
        break;
      case 'n':
        event.preventDefault();
        onNotes?.();
        break;
      case 'escape':
        event.preventDefault();
        onExit?.();
        break;
    }
  }, [enabled, onPass, onFail, onBlock, onSkip, onPrev, onNext, onNotes, onExit]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
