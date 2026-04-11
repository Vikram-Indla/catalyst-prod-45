/**
 * IssueTypeIcon — Canonical work item SVG icons
 */
import React from 'react';

export function IssueTypeIcon({ type, size = 16 }: { type?: string; size?: number }) {
  const t = (type || '').toLowerCase();
  if (t.includes('bug')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#FF5630" /><circle cx="8" cy="8" r="3" fill="#fff" /></svg>
  );
  if (t.includes('epic')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#6554C0" /><path d="M9 3L6 8.5h4L7 13" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('sub')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#2684FF" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('task')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#4BADE8" /><path d="M5 8l2 2 4-4" stroke="#fff" strokeWidth="1.5" fill="none" /></svg>
  );
  if (t.includes('incident')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><path d="M8 2L14 13H2L8 2z" fill="#FF5630" /><path d="M8 6v4M8 11.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" /></svg>
  );
  if (t.includes('improvement') || t.includes('new_feature') || t.includes('new feature')) return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#36B37E" /><path d="M8 4v8M4 8h8" stroke="#fff" strokeWidth="1.5" /></svg>
  );
  // Default: Story (green bookmark)
  return (
    <svg width={size} height={size} viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="3" fill="#36B37E" /><path d="M5 4v8l3-2 3 2V4H5z" fill="#fff" /></svg>
  );
}
