// ═══════════════════════════════════════════════════════════
// Resource 360° — Jira Issue Type Icons (16×16 SVG)
// ═══════════════════════════════════════════════════════════

import React from 'react';

export const JiraBugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <circle cx="8" cy="8" r="7" fill="#E5493A"/>
    <circle cx="8" cy="8" r="3" fill="white"/>
  </svg>
);

export const JiraTaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/>
    <path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const JiraStoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#63BA3C"/>
    <path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/>
  </svg>
);

export const JiraEpicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2"/>
    <path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/>
  </svg>
);

export const JiraSubtaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/>
    <rect x="5" y="5" width="6" height="6" rx="1" fill="white"/>
  </svg>
);

export function getJiraIcon(itemType: string) {
  switch (itemType?.toLowerCase()) {
    case 'bug': return <JiraBugIcon />;
    case 'task': return <JiraTaskIcon />;
    case 'story': return <JiraStoryIcon />;
    case 'epic': return <JiraEpicIcon />;
    case 'subtask': return <JiraSubtaskIcon />;
    default: return <JiraTaskIcon />;
  }
}
