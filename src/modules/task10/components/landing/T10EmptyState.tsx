// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10EmptyState
// Purpose: Purposeful empty state with dashed circle icon and keyboard hint
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';

interface T10EmptyStateProps {
  onCreateList: () => void;
}

export function T10EmptyState({ onCreateList }: T10EmptyStateProps) {
  return (
    <div className="t10-empty">
      {/* Icon: Dashed circle with plus */}
      <div className="t10-empty-icon">
        <svg viewBox="0 0 56 56" fill="none" stroke="currentColor">
          <circle cx="28" cy="28" r="26" strokeWidth="1.5" strokeDasharray="4 4" />
          <path d="M28 18v20M18 28h20" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="t10-empty-title">No priority lists yet</h2>
      
      <p className="t10-empty-text">
        Create your first list to start tracking your top 10 priorities each week.
      </p>

      <div className="t10-empty-actions">
        <button
          type="button"
          className="t10-btn-new"
          onClick={onCreateList}
        >
          Create list
        </button>
        <span className="t10-empty-kbd">
          or press <kbd>C</kbd>
        </span>
      </div>
    </div>
  );
}

export default T10EmptyState;
