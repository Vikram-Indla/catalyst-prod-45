/**
 * WorkHubTypeIcon — Canonical Jira-style SVG icons for 10 work item types
 * 16×16 in table rows, 24×24 in side panel
 */
import React from 'react';

interface WorkHubTypeIconProps {
  type: string;
  size?: number;
  className?: string;
}

const ICON_CONFIGS: Record<string, { bg: string; path: React.ReactNode }> = {
  epic: {
    bg: '#6554C0',
    path: <path d="M5 3L11 8L5 13L3 11L7 8L3 5L5 3Z" fill="white" />,
  },
  story: {
    bg: '#36B37E',
    path: <path d="M4 3h6c0.6 0 1 0.4 1 1v8c0 0.6-0.4 1-1 1H6l-3-2.5V4c0-0.6 0.4-1 1-1z" fill="white" />,
  },
  bug: {
    bg: '#FF5630',
    path: <circle cx="8" cy="8" r="4" fill="white" />,
  },
  task: {
    bg: '#2684FF',
    path: <path d="M4.5 8.5L6.5 10.5L11.5 5.5" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  },
  subtask: {
    bg: '#2684FF',
    path: (
      <>
        <rect x="3" y="3" width="5" height="5" rx="0.5" fill="white" opacity="0.6" />
        <rect x="6" y="6" width="5" height="5" rx="0.5" fill="white" />
      </>
    ),
  },
  improvement: {
    bg: '#36B37E',
    path: <path d="M8 4L12 9H4L8 4Z" fill="white" />,
  },
  new_feature: {
    bg: '#36B37E',
    path: <path d="M8 4V12M4 8H12" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round" />,
  },
  incident: {
    bg: '#FF5630',
    path: <path d="M8 4L12 12H4L8 4ZM8 7V9M8 10.5V11" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round" />,
  },
  changes: {
    bg: '#FFAB00',
    path: <path d="M4 6L7 4V8L4 6ZM12 10L9 12V8L12 10Z" fill="white" />,
  },
  question: {
    bg: '#6554C0',
    path: <text x="8" y="11" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">?</text>,
  },
};

function normalizeType(type: string): string {
  const t = type.toLowerCase().replace(/[\s-]/g, '_');
  if (t.includes('epic')) return 'epic';
  if (t.includes('story') || t.includes('user_story')) return 'story';
  if (t.includes('bug') || t.includes('defect')) return 'bug';
  if (t.includes('sub') || t.includes('subtask') || t.includes('sub_task')) return 'subtask';
  if (t.includes('improvement')) return 'improvement';
  if (t.includes('new_feature') || t.includes('feature')) return 'new_feature';
  if (t.includes('incident') || t.includes('problem')) return 'incident';
  if (t.includes('change')) return 'changes';
  if (t.includes('question')) return 'question';
  if (t.includes('task') || t.includes('issue')) return 'task';
  return 'task';
}

export default function WorkHubTypeIcon({ type, size = 16, className }: WorkHubTypeIconProps) {
  const key = normalizeType(type);
  const config = ICON_CONFIGS[key] || ICON_CONFIGS.task;

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className} style={{ flexShrink: 0 }}>
      <rect width="16" height="16" rx="3" fill={config.bg} />
      {config.path}
    </svg>
  );
}

export { normalizeType };
