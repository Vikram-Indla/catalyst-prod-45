// @ts-nocheck
/**
 * useUWVKeyboard — arrow-key + Enter + Escape grid navigation.
 * Caller wires onEnter to "open detail for row n" and onClose to dismiss UWV.
 */

import { useEffect, useState } from 'react';

interface Opts {
  rowCount: number;
  colCount: number;
  onEnter: (row: number) => void;
  onClose: () => void;
  isRTL: boolean;
}

export function useUWVKeyboard(opts: Opts) {
  const [focused, setFocused] = useState({ row: 0, col: 0 });
  const { rowCount, colCount, onEnter, onClose, isRTL } = opts;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      // Only activate when the focus is on body / table — not in inputs.
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) {
        if (e.key === 'Escape') onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocused((f) => ({ ...f, row: Math.min(f.row + 1, Math.max(rowCount - 1, 0)) }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocused((f) => ({ ...f, row: Math.max(f.row - 1, 0) }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocused((f) => ({
          ...f,
          col: isRTL ? Math.max(f.col - 1, 0) : Math.min(f.col + 1, colCount - 1),
        }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocused((f) => ({
          ...f,
          col: isRTL ? Math.min(f.col + 1, colCount - 1) : Math.max(f.col - 1, 0),
        }));
      } else if (e.key === 'Enter') {
        if (rowCount > 0) onEnter(focused.row);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [focused, rowCount, colCount, onEnter, onClose, isRTL]);

  return { focused, setFocused };
}
