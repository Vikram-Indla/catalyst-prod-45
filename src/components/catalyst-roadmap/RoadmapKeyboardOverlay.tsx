/**
 * Roadmap Keyboard Overlay - ? shortcut overlay
 */

import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

interface RoadmapKeyboardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { keys: ['⌘', 'Z'], action: 'Undo' },
  { keys: ['⌘', 'Y'], action: 'Redo' },
  { keys: ['T'], action: 'Scroll to today' },
  { keys: ['F'], action: 'Toggle filters' },
  { keys: ['D'], action: 'Toggle dark mode' },
  { keys: ['P'], action: 'Presentation mode' },
  { keys: ['E'], action: 'Export PDF' },
  { keys: ['?'], action: 'Show shortcuts' },
  { keys: ['Esc'], action: 'Deselect / Close' },
  { keys: ['⌘', '+'], action: 'Zoom in' },
  { keys: ['⌘', '-'], action: 'Zoom out' },
  { keys: ['Double-click'], action: 'Edit name' },
];

export function RoadmapKeyboardOverlay({ isOpen, onClose }: RoadmapKeyboardOverlayProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[2000] animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-surface-0 rounded-2xl p-6 max-w-md shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-5">
          <Keyboard className="w-5 h-5 text-brand-primary" />
          <h2 className="text-base font-semibold text-text-primary">Keyboard Shortcuts</h2>
          <button 
            onClick={onClose}
            className="ml-auto p-1 hover:bg-surface-1 rounded transition-colors"
          >
            <X className="w-4 h-4 text-text-muted" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="text-xs text-text-secondary">{shortcut.action}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, j) => (
                  <span 
                    key={j}
                    className="bg-surface-1 border border-border rounded px-2 py-1 text-[11px] font-medium text-text-primary font-mono"
                  >
                    {key}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-5 text-center text-[11px] text-text-muted">
          Press <kbd className="bg-surface-1 border border-border rounded px-1.5 py-0.5 text-[10px] font-mono">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}
