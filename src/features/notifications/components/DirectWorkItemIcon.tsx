import type { DirectWorkItemIconType } from '../types';

export default function DirectWorkItemIcon({ type }: { type: DirectWorkItemIconType }) {
  switch (type) {
    case 'bug':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#FF5630"/>
          <circle cx="8" cy="8" r="3" fill="none" stroke="white" strokeWidth="1.5"/>
          <path d="M8 5V3M8 11v2M5 8H3M11 8h2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    case 'story':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#36B37E"/>
          <path d="M4 3h8v10l-4-2.5L4 13V3z" fill="white"/>
        </svg>
      );
    case 'epic':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#7C3AED"/>
          <path d="M9.5 3L5.5 9h4L6.5 13l6-7H9l.5-3z" fill="white"/>
        </svg>
      );
    case 'incident':
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#DC2626"/>
          <path d="M8 4v5M8 10.5v1.5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    default: // task
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <rect width="16" height="16" rx="2" fill="#2563EB"/>
          <path d="M4 8.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
      );
  }
}
