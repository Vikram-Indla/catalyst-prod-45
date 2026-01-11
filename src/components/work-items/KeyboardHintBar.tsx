/**
 * KeyboardHintBar — Fixed bottom bar showing keyboard shortcuts
 */

import React from 'react';

interface KeyboardHint {
  keys: string;
  label: string;
}

const HINTS: KeyboardHint[] = [
  { keys: 'J/K', label: 'Navigate' },
  { keys: 'X', label: 'Select' },
  { keys: 'Enter', label: 'Open' },
  { keys: 'C', label: 'Create' },
  { keys: '⌘K', label: 'Commands' },
  { keys: '?', label: 'Shortcuts' },
];

export function KeyboardHintBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-8 bg-surface-0 border-t border-border-subtle flex items-center justify-center gap-6 px-4 z-10">
      {HINTS.map((hint) => (
        <div key={hint.keys} className="flex items-center gap-1.5 text-xs text-text-3">
          <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded bg-surface-3 border border-border-default font-mono text-[10px] text-text-2">
            {hint.keys}
          </kbd>
          <span>{hint.label}</span>
        </div>
      ))}
    </div>
  );
}

export default KeyboardHintBar;
