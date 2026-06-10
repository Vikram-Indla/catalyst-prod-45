/**
 * Filters revamp guardrails (source-grep, mirrors no-type-icon-column.test.ts):
 *  1. FiltersListPage renders the canonical JiraTable — @atlaskit/dynamic-table is banned.
 *  2. CreateFilterPage and FilterDetailPage mount the live FilterResultsPanel.
 *  3. The list page has exactly ONE "Create filter" CTA (no duplicate in the empty state).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const read = (f: string) =>
  readFileSync(resolve(__dirname, '..', f), 'utf-8');

describe('filters module — canonical components', () => {
  it('FiltersListPage does not use @atlaskit/dynamic-table', () => {
    expect(read('FiltersListPage.tsx')).not.toMatch(/@atlaskit\/dynamic-table/);
  });

  it('FiltersListPage mounts the canonical JiraTable', () => {
    expect(read('FiltersListPage.tsx')).toMatch(/from '@\/components\/shared\/JiraTable'/);
  });

  it('CreateFilterPage mounts the live FilterResultsPanel', () => {
    expect(read('CreateFilterPage.tsx')).toMatch(/FilterResultsPanel/);
  });

  it('FilterDetailPage mounts the live FilterResultsPanel', () => {
    expect(read('FilterDetailPage.tsx')).toMatch(/FilterResultsPanel/);
  });

  it('FiltersListPage has a single Create filter CTA', () => {
    const src = read('FiltersListPage.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    const matches = src.match(/Create (your first )?filter/g) ?? [];
    expect(matches.length).toBe(1);
  });

  // Jira directory parity (live /rest/api/3/filter/search probe, 2026-06-10)
  it('FiltersListPage uses the Jira directory toolbar, not tabs', () => {
    const src = read('FiltersListPage.tsx');
    expect(src).not.toMatch(/@atlaskit\/tabs/);
    expect(src).toMatch(/placeholder="Owner"/);
    expect(src).toMatch(/placeholder="Project"/);
    expect(src).toMatch(/placeholder="Group"/);
  });

  it('FiltersListPage renders permissions as icon + text, not lozenges, and has no Last used column', () => {
    const src = read('FiltersListPage.tsx');
    expect(src).not.toMatch(/@atlaskit\/lozenge/);
    expect(src).not.toMatch(/Last used/);
    expect(src).toMatch(/My organization/);
    expect(src).toMatch(/All roles/);
  });
});
