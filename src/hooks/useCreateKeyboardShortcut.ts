/**
 * useCreateKeyboardShortcut — Keyboard listener for 'C' create shortcut (F1.11)
 *
 * Listens for 'C' key press and calls callback when pressed.
 * Ignores presses when typing in input/textarea or when modifiers are active.
 */
import { useEffect } from 'react';

export function useCreateKeyboardShortcut(callback: () => void): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if modifier keys are pressed (Ctrl, Cmd, etc.)
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) {
        return;
      }

      // Ignore if typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Ignore if typing in a contenteditable element
      if (target.contentEditable === 'true') {
        return;
      }

      // Check for 'c' or 'C'
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        callback();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [callback]);
}
