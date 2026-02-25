import React from 'react';

export const JiraBugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A"/><circle cx="8" cy="8" r="3" fill="white"/></svg>
);
export const JiraTaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><path d="M4.5 8l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
export const JiraStoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#63BA3C"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>
);
export const JiraEpicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2"/><path d="M9.5 2.5L5.5 9H8l-1.5 5L11 7.5H8L9.5 2.5z" fill="white"/></svg>
);
export const JiraSubtaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><rect x="4" y="4" width="8" height="8" rx="1" fill="#fff" opacity=".4"/><path d="M6 8.5l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

/** Fuzzy match — "QA BUG" → BugIcon, "Sub-task" → SubtaskIcon */
export function getJiraIcon(type: string) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return <JiraBugIcon />;
  if (t.includes('story')) return <JiraStoryIcon />;
  if (t.includes('epic')) return <JiraEpicIcon />;
  if (t.includes('sub-task') || t.includes('subtask')) return <JiraSubtaskIcon />;
  return <JiraTaskIcon />;
}
