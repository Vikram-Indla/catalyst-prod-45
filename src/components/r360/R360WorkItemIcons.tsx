/**
 * Canonical Work Item Type SVG Icons for R360 Profile
 * Uses Jira-style icons — NOT Lucide
 */

export const WORK_ITEM_ICONS: Record<string, string> = {
  Bug: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#FF5630"/><circle cx="8" cy="8" r="3" fill="#FFFFFF"/></svg>`,
  Story: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M4 1h8a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2z" fill="#36B37E"/><path d="M6 5h4M6 8h4M6 11h2" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  Subtask: `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="10" height="10" rx="2" fill="#2684FF" opacity="0.4"/><rect x="5" y="5" width="10" height="10" rx="2" fill="#2684FF"/></svg>`,
  Task: `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#2684FF"/><path d="M4.5 8.5l2.5 2.5 5-5" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  Incident: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 1L15 14H1L8 1z" fill="#FF5630"/><path d="M8 6v4M8 11.5v.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  Epic: `<svg width="16" height="16" viewBox="0 0 16 16"><path d="M9 1L4 9h4l-1 6 5-8H8l1-6z" fill="#6554C0"/></svg>`,
  'New Feature': `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#36B37E"/><path d="M8 4v8M4 8h8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  Improvement: `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#36B37E"/><path d="M8 4l4 4H4l4-4z" fill="#fff"/><rect x="6" y="8" width="4" height="4" fill="#fff"/></svg>`,
  Changes: `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#FF991F"/><path d="M5 10l3-4 3 4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  Question: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#6554C0"/><text x="8" y="11.5" text-anchor="middle" fill="#fff" font-size="10" font-weight="700">?</text></svg>`,
  Initiative: `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#2684FF"/><path d="M4 8h8M8 4v8" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  Release: `<svg width="16" height="16" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#00B8D9"/><path d="M5 8l2 2 4-4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};

export function WorkItemIcon({ type }: { type: string }) {
  const svg = WORK_ITEM_ICONS[type] || WORK_ITEM_ICONS.Task;
  return (
    <span
      className="r3p-mix-icon"
      style={{ display: 'inline-flex' }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
