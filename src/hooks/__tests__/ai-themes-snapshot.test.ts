// @ts-nocheck
/**
 * Tests for the AI Themes client snapshot store.
 * TDD: written FIRST — must fail until src/hooks/aiThemesSnapshot.ts exists.
 *
 * Why this module: cold mount of AiThemePanel currently shows a blank
 * takeover spinner because React Query has no in-memory cache and the
 * server cache is read asynchronously inside queryFn (isLoading stays
 * true the whole time). A synchronous localStorage snapshot lets the hook
 * seed `placeholderData` so the last themed cards render instantly while
 * the network revalidates underneath (stale-while-revalidate).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  snapshotKey,
  readSnapshot,
  writeSnapshot,
} from '@/hooks/aiThemesSnapshot';

const personalArgs = { scope: 'personal' as const };
const projectArgs = { scope: 'project' as const, projectKey: 'BAU' };

const sample = {
  themes: [{ id: 't1', name: 'Auth', summary: 's', count: 3, percentage: 50, intent: 'feature', issueKeys: ['BAU-1'] }],
  generatedAt: '2026-06-14T08:00:00Z',
  totalIssuesAnalyzed: 6,
  scope: { mode: 'personal' as const },
  cached: false,
};

beforeEach(() => {
  localStorage.clear();
});

describe('snapshotKey', () => {
  it('namespaces personal scope without a project', () => {
    expect(snapshotKey(personalArgs)).toBe('for-you:ai-theme:snapshot:personal');
  });
  it('includes the project key for project scope', () => {
    expect(snapshotKey(projectArgs)).toBe('for-you:ai-theme:snapshot:project:BAU');
  });
});

describe('writeSnapshot / readSnapshot round-trip', () => {
  it('returns undefined when nothing stored', () => {
    expect(readSnapshot(personalArgs)).toBeUndefined();
  });

  it('persists and reads back a themes response, marked cached', () => {
    writeSnapshot(personalArgs, sample);
    const got = readSnapshot(personalArgs);
    expect(got?.themes).toHaveLength(1);
    expect(got?.totalIssuesAnalyzed).toBe(6);
    // a snapshot is by definition stale → always flagged cached on read
    expect(got?.cached).toBe(true);
  });

  it('isolates scopes — personal write is not visible to project read', () => {
    writeSnapshot(personalArgs, sample);
    expect(readSnapshot(projectArgs)).toBeUndefined();
  });

  it('returns undefined for a corrupt / non-JSON payload', () => {
    localStorage.setItem(snapshotKey(personalArgs), '{not json');
    expect(readSnapshot(personalArgs)).toBeUndefined();
  });

  it('returns undefined when the stored shape lacks a themes array', () => {
    localStorage.setItem(snapshotKey(personalArgs), JSON.stringify({ foo: 1 }));
    expect(readSnapshot(personalArgs)).toBeUndefined();
  });
});
