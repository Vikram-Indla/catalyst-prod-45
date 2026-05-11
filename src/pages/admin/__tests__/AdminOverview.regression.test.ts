/**
 * Regression guardrail for AdminOverview.tsx
 *
 * Catches the P0 discovered 2026-05-12:
 *   "Invite user" quick action and "Users & Access" stat card both linked to
 *   /admin/users (old page) instead of /admin/access (new access management page).
 *
 * If either path is changed back to /admin/users this test will fail immediately.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const src = readFileSync(
  resolve(__dirname, '../AdminOverview.tsx'),
  'utf-8',
);

describe('AdminOverview — regression guardrail', () => {
  it('Invite user quick action links to /admin/access, not /admin/users', () => {
    // Extract the quickActions array block
    const quickActionsBlock = src.match(/const quickActions[\s\S]*?\];/)?.[0] ?? '';
    expect(quickActionsBlock).toBeTruthy();

    const inviteUserEntry = quickActionsBlock.match(/Invite user[\s\S]*?path:\s*'([^']+)'/)?.[1];
    expect(inviteUserEntry).toBe('/admin/access');
  });

  it('Users & Access pocket card links to /admin/access, not /admin/users', () => {
    // The pocketCards array has id: 'users-access' with a path property
    const usersAccessBlock = src.match(/id:\s*'users-access'[\s\S]*?path:\s*'([^']+)'/)?.[1];
    expect(usersAccessBlock).toBe('/admin/access');
  });

  it('no reference to /admin/users remains in quickActions or pocketCards', () => {
    // Slice to only the data definitions to avoid false positives in comments
    const dataSection = src.slice(
      src.indexOf('const quickActions'),
      src.indexOf('export default'),
    );
    // /admin/users must not appear as a path value
    const badPaths = dataSection.match(/path:\s*'\/admin\/users'/g);
    expect(badPaths).toBeNull();
  });
});
