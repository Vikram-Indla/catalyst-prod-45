// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT: T10EmptyState
// Purpose: Purposeful empty state with feature cards per specification
// ═══════════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ListChecks, BarChart3, CalendarCheck } from 'lucide-react';

interface T10EmptyStateProps {
  onCreateList: () => void;
}

export function T10EmptyState({ onCreateList }: T10EmptyStateProps) {
  return (
    <div className="t10-empty">
      {/* Icon: List with "10" badge */}
      <div className="t10-empty-icon">
        <svg viewBox="0 0 56 56" fill="none">
          <circle cx="28" cy="28" r="26" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
          <rect x="16" y="18" width="24" height="20" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <line x1="20" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="28" x2="30" y2="28" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="20" y1="32" x2="26" y2="32" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="38" cy="34" r="8" fill="var(--ds-text-brand, #2563eb)" />
          <text x="38" y="38" textAnchor="middle" fill="white" fontSize="10" fontWeight="600">10</text>
        </svg>
      </div>

      <h2 className="t10-empty-title">Focus on what matters most</h2>
      
      <p className="t10-empty-text">
        Task¹⁰ helps you identify and track your top 10 priorities each week.
      </p>

      <div className="t10-empty-actions">
        <button
          type="button"
          className="t10-btn-new"
          onClick={onCreateList}
        >
          Create your first list
        </button>
        <span className="t10-empty-kbd">
          or press <kbd>C</kbd> to create
        </span>
      </div>

    </div>
  );
}

export default T10EmptyState;
