import type { DirectWorkItemIconType } from '../types';

export default function DirectWorkItemIcon({ type }: { type: DirectWorkItemIconType }) {
  switch (type) {
    case 'bug':
      // Jira canonical bug: red square, white asterisk/snowflake (6-arm star)
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#E5493A"/>
          {/* Horizontal arm */}
          <path d="M4 8h8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          {/* Diagonal arms top-left → bottom-right */}
          <path d="M5.17 5.17l5.66 5.66" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          {/* Diagonal arms top-right → bottom-left */}
          <path d="M10.83 5.17L5.17 10.83" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          {/* Vertical arm */}
          <path d="M8 4v8" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      );
    case 'story':
      // Jira canonical story: green square, white bookmark
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#63BA3C"/>
          <path d="M4.5 3h7v10l-3.5-2L4.5 13V3z" fill="white"/>
        </svg>
      );
    case 'epic':
      // Jira canonical epic: purple square, white lightning bolt
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#904EE2"/>
          <path d="M9.5 2.5L5 8.5h4.5L6.5 13.5l6-7.5H8.5l1-3.5z" fill="white"/>
        </svg>
      );
    case 'incident':
      // Jira canonical incident: orange-red square, white warning exclamation
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#E5493A"/>
          <path d="M8 4v5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="8" cy="11.5" r="1" fill="white"/>
        </svg>
      );
    default: // task
      // Jira canonical task: blue square, white checkmark
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#4BADE8"/>
          <path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}
