// Work Item Type SVG Icons — Canonical Jira-style icons for board cards
import React from 'react';

export function BugIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#FF5630" />
      <circle cx="8" cy="8" r="3.5" fill="white" />
    </svg>
  );
}

export function StoryIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#36B37E" />
      <path d="M5 3h6a1 1 0 011 1v8.5a.5.5 0 01-.78.42L8 11l-3.22 1.92A.5.5 0 014 12.5V4a1 1 0 011-1z" fill="white" />
    </svg>
  );
}

export function TaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#2684FF" />
      <path d="M6.5 8L7.5 9L9.5 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="white" strokeWidth="1.2" fill="none" />
    </svg>
  );
}

export function EpicIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#6554C0" />
      <path d="M9.5 3L6 8.5h3L6.5 13l5-6H8.5L11 3H9.5z" fill="white" />
    </svg>
  );
}

export function SubtaskIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="10" height="10" rx="2" fill="#2684FF" opacity="0.5" />
      <rect x="5" y="5" width="10" height="10" rx="2" fill="#2684FF" />
    </svg>
  );
}

export function ImprovementIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#36B37E" />
      <path d="M8 4v8M5 7l3-3 3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function NewFeatureIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#36B37E" />
      <path d="M8 4v8M4 8h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  bug: BugIcon,
  story: StoryIcon,
  task: TaskIcon,
  epic: EpicIcon,
  subtask: SubtaskIcon,
  improvement: ImprovementIcon,
  new_feature: NewFeatureIcon,
};

export function WorkItemTypeIcon({ type, size = 16 }: { type: string; size?: number }) {
  const Icon = ICON_MAP[type];
  if (Icon) return <Icon size={size} />;
  // Fallback: grey square
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <rect width="16" height="16" rx="3" fill="#94A3B8" />
    </svg>
  );
}
