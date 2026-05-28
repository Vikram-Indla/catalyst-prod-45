/**
 * Tests that useCatalystIssue is configured with the settings needed to
 * prevent the "dancing panel" bug on allwork ticket navigation.
 *
 * Root cause (2026-05-24): no staleTime or placeholderData meant every
 * ticket click flushed the cache immediately, sending null/undefined
 * breadcrumb values and skeleton blocks to CatalystViewBase for the
 * duration of the network round-trip.
 *
 * Grep-based assertions: we verify the SOURCE TEXT of the hook file rather
 * than executing the hook (which would require a full React Query + Supabase
 * mock environment) — simpler, faster, and sufficient to guard against
 * regressions where someone strips these options.
 */
import * as fs from 'fs';
import * as path from 'path';

const HOOK_PATH = path.resolve(
  __dirname,
  '../useCatalystIssue.ts',
);

const source = fs.readFileSync(HOOK_PATH, 'utf-8');

describe('useCatalystIssue — anti-dance configuration', () => {
  it('configures a staleTime so the cache is not flushed immediately on navigation', () => {
    expect(source).toMatch(/staleTime\s*:/);
  });

  it('configures placeholderData so the previous ticket stays visible while the next loads', () => {
    // Accept either the React Query v5 callback form or the keepPreviousData import.
    const hasPlaceholder = /placeholderData\s*:/.test(source);
    expect(hasPlaceholder).toBe(true);
  });
});
