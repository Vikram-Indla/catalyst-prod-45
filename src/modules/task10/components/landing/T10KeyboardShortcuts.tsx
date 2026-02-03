// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10KeyboardShortcuts
// Purpose: Fixed keyboard shortcuts panel (bottom right)
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';

export function T10KeyboardShortcuts() {
  return (
    <div className="t10-shortcuts">
      <div className="t10-shortcut">
        <kbd>/</kbd>
        <span>Search</span>
      </div>
      <div className="t10-shortcut">
        <kbd>C</kbd>
        <span>Create</span>
      </div>
      <div className="t10-shortcut">
        <kbd>↑↓</kbd>
        <span>Navigate</span>
      </div>
    </div>
  );
}

export default T10KeyboardShortcuts;
