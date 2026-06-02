/**
 * pathToHubTone — single source of truth for "which hub does this URL
 * belong to" + "what's the ADS accent token for that hub."
 *
 * The HubSwitcher tile, the sidebar active accent bar, the breadcrumb
 * dot (future), and the issue-row hub badge (future) all consume this
 * function. Keeping the path→tone map in one file is the only way to
 * avoid hub-color drift across surfaces.
 */
import { describe, it, expect } from 'vitest';
import { pathToHubTone, hubAccentToken } from '../hub-tone';

describe('pathToHubTone', () => {
  it.each([
    ['/for-you', 'blue'],
    ['/for-you/anything', 'blue'],
    ['/strategyhub', 'purple'],
    ['/strategyhub/themes/123', 'purple'],
    ['/ideation/backlog', 'orange'],
    ['/ideation', 'orange'],
    ['/product-hub', 'teal'],
    ['/product-hub/roadmap', 'teal'],
    ['/project-hub', 'green'],
    ['/project-hub/foo/bar', 'green'],
    ['/release-hub/command-center', 'magenta'],
    ['/release-hub', 'magenta'],
    ['/testhub/dashboard', 'lime'],
    ['/testhub', 'lime'],
    ['/incident-hub', 'red'],
    ['/tasks/board', 'yellow'],
    ['/tasks', 'yellow'],
    ['/planhub', 'gray'],
    ['/wiki', 'gray'],
    ['/wiki/space/anything', 'gray'],
  ])('maps %s → %s', (path, tone) => {
    expect(pathToHubTone(path)).toBe(tone);
  });

  it('returns null for unknown paths', () => {
    expect(pathToHubTone('/unknown')).toBeNull();
    expect(pathToHubTone('/admin/settings')).toBeNull();
  });
});

describe('hubAccentToken', () => {
  it('returns the ADS text-accent token for a known path', () => {
    expect(hubAccentToken('/strategyhub')).toBe('var(--ds-text-accent-purple)');
    expect(hubAccentToken('/incident-hub')).toBe('var(--ds-text-accent-red)');
    expect(hubAccentToken('/wiki')).toBe('var(--ds-text-accent-gray)');
  });

  it('falls back to --cp-blue for unmapped paths', () => {
    expect(hubAccentToken('/unknown')).toBe('var(--cp-blue)');
  });
});
