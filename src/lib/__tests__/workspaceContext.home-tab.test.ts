/**
 * workspaceContext — /for-you/:tab must return 'home', not 'enterprise'
 *
 * RCA 2026-05-28: clicking any For You tab navigates to /for-you/:tab.
 * The exact-equality guard `pathname === '/for-you'` missed sub-routes,
 * causing deriveWorkspaceType to fall through to `return 'enterprise'`
 * and render EnterpriseSidebar (Strategy) on the home page.
 * Fix: changed to pathname.startsWith('/for-you').
 */
import { describe, it, expect } from 'vitest';
import { deriveWorkspaceType } from '../workspaceContext';

describe('deriveWorkspaceType — home routes', () => {
  it('returns "home" for /', () => {
    expect(deriveWorkspaceType('/')).toBe('home');
  });

  it('returns "home" for /for-you', () => {
    expect(deriveWorkspaceType('/for-you')).toBe('home');
  });

  it('returns "home" for /for-you/recommended', () => {
    expect(deriveWorkspaceType('/for-you/recommended')).toBe('home');
  });

  it('returns "home" for /for-you/ageing', () => {
    expect(deriveWorkspaceType('/for-you/ageing')).toBe('home');
  });

  it('returns "home" for /for-you/assigned-to-me', () => {
    expect(deriveWorkspaceType('/for-you/assigned-to-me')).toBe('home');
  });

  it('does NOT return "home" for /for-you-extra (no startsWith false positive)', () => {
    expect(deriveWorkspaceType('/for-you-extra')).not.toBe('home');
  });

  it('returns "enterprise" for unknown routes (default fallback unchanged)', () => {
    expect(deriveWorkspaceType('/unknown-route')).toBe('enterprise');
  });
});
