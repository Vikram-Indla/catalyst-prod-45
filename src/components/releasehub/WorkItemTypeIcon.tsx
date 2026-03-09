import React from 'react';

interface Props {
  type: string;
  size?: number;
}

const ICONS: Record<string, { color: string; path: React.ReactNode }> = {
  story: {
    color: '#36B37E',
    path: <path d="M4 2h8a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm1 3v10h6V5H5z" fill="currentColor" />,
  },
  bug: {
    color: '#FF5630',
    path: <circle cx="8" cy="8" r="6" fill="currentColor" />,
  },
  task: {
    color: '#2684FF',
    path: <><rect x="2" y="2" width="12" height="12" rx="2" fill="currentColor" /><path d="M5 8l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" /></>,
  },
  epic: {
    color: '#6554C0',
    path: <path d="M9 2L3 9h5l-1 5 6-7H8l1-5z" fill="currentColor" />,
  },
  subtask: {
    color: '#2684FF',
    path: <><rect x="3" y="3" width="10" height="10" rx="1.5" fill="currentColor" /><path d="M6 8l1.5 1.5L10 7" stroke="white" strokeWidth="1.2" fill="none" /></>,
  },
};

export function WorkItemTypeIcon({ type, size = 16 }: Props) {
  const key = type?.toLowerCase().replace(/[\s-]/g, '') || 'task';
  const icon = ICONS[key] || ICONS.task;

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ color: icon.color, flexShrink: 0 }}>
      {icon.path}
    </svg>
  );
}
