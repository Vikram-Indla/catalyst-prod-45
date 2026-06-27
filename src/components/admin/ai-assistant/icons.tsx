import React from 'react';

// Lightweight inline icon using SVG paths.
export function Icon({ path, size = 16, w = 1.9, fill = 'none' }: { path: string; size?: number; w?: number; fill?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }} dangerouslySetInnerHTML={{ __html: path }}
    />
  );
}

export const ICONS = {
  send:     '<path d="M5 12h14M13 6l6 6-6 6"/>',
  spark:    '<path d="M12 8 13.6 11.2 17 12.8 13.6 14.4 12 17.6 10.4 14.4 7 12.8 10.4 11.2 12 8Z"/>',
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>',
  file:     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
  plane:    '<path d="m22 2-7 20-4-9-9-4 20-7Z"/>',
  check:    '<path d="m20 6-11 11-5-5"/>',
  checkC:   '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5L15.5 9"/>',
  spinner:  '<path d="M21 12a9 9 0 1 1-6.2-8.5"/>',
  warn:     '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  terminal: '<path d="M4 17l6-6-6-6M12 19h8"/>',
  users:    '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  shield:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
  key:      '<circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 8-8 2 2-2 2 2 2-3 3-2-2-2 2Z"/>',
  dept:     '<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4"/>',
  grid:     '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  bulk:     '<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
} as const;

export const catIcon = (cat: string): string => ({
  Users: ICONS.users, Roles: ICONS.shield, Permissions: ICONS.key,
  Departments: ICONS.dept, 'Module access': ICONS.grid, 'Bulk operations': ICONS.bulk, Learned: ICONS.spark,
} as Record<string, string>)[cat] || ICONS.users;
