/**
 * Execution Keyboard Shortcuts Hook
 * Handles keyboard navigation and actions
 */

import { useEffect, useCallback } from 'react';
import type { ExecutionStatus } from '../../../api/types';

interface UseExecutionKeyboardProps {
  isOpen: boolean;
  isUpdating: boolean;
  onSetStatus: (status: ExecutionStatus) => void;
  onOpenDefect: () => void;
  onToggleTimer: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function useExecutionKeyboard({
  isOpen,
  isUpdating,
  onSetStatus,
  onOpenDefect,
  onToggleTimer,
  onNext,
  onPrevious,
}: UseExecutionKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isUpdating) return;

      // Don't trigger when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        // Allow Escape to blur the input
        if (e.key === 'Escape') {
          target.blur();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'p':
          e.preventDefault();
          onSetStatus('passed');
          break;
        case 'f':
          e.preventDefault();
          onSetStatus('failed');
          break;
        case 'b':
          e.preventDefault();
          onSetStatus('blocked');
          break;
        case 's':
          e.preventDefault();
          onSetStatus('skipped');
          break;
        case 'd':
          e.preventDefault();
          onOpenDefect();
          break;
        case ' ':
          e.preventDefault();
          onToggleTimer();
          break;
        case 'arrowright':
          e.preventDefault();
          onNext();
          break;
        case 'arrowleft':
          e.preventDefault();
          onPrevious();
          break;
      }
    },
    [isOpen, isUpdating, onSetStatus, onOpenDefect, onToggleTimer, onNext, onPrevious]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export const KEYBOARD_SHORTCUTS = [
  { key: 'P', action: 'Pass' },
  { key: 'F', action: 'Fail' },
  { key: 'B', action: 'Block' },
  { key: 'S', action: 'Skip' },
  { key: 'D', action: 'Defect' },
  { key: 'Space', action: 'Timer' },
  { key: '←/→', action: 'Navigate' },
];
