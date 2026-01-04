/**
 * Execution Shortcut Hints Component
 * Displays keyboard shortcut hints at the bottom
 */

import React from 'react';
import { KEYBOARD_SHORTCUTS } from './hooks/useExecutionKeyboard';

export function ExecutionShortcutHints() {
  return (
    <div className="flex items-center justify-center gap-4 py-2 px-4 bg-muted/50 rounded-lg text-xs text-muted-foreground">
      <span className="font-medium">Shortcuts:</span>
      {KEYBOARD_SHORTCUTS.map((shortcut) => (
        <span key={shortcut.key} className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] font-mono">
            {shortcut.key}
          </kbd>
          <span>{shortcut.action}</span>
        </span>
      ))}
    </div>
  );
}
