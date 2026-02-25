import React from 'react';

export const JiraBugIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#E5493A"/><path d="M10 5.5a2 2 0 1 0-4 0v1h4v-1zM5 8h6v2.5a3 3 0 0 1-6 0V8z" fill="#fff"/></svg>
);
export const JiraTaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><path d="M4.5 8.5l2 2 5-5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);
export const JiraStoryIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#63BA3C"/><path d="M5 3h6v3H5zm0 4h6v3H5zm0 4h6v2H5z" fill="#fff" opacity=".9"/></svg>
);
export const JiraEpicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#904EE2"/><path d="M9 2L5 9h3l-1 5 4-7H8l1-5z" fill="#fff"/></svg>
);
export const JiraSubtaskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#4BADE8"/><rect x="4" y="4" width="8" height="8" rx="1" fill="#fff" opacity=".4"/><path d="M6 8.5l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

export function getJiraIcon(type: string) {
  switch(type) {
    case 'Bug': return <JiraBugIcon />;
    case 'Story': return <JiraStoryIcon />;
    case 'Epic': return <JiraEpicIcon />;
    case 'Sub-task': return <JiraSubtaskIcon />;
    default: return <JiraTaskIcon />;
  }
}
