/**
 * Dynamic favicon — swaps favicon to issue-type icon on issue detail routes.
 *
 * The useDynamicFavicon hook must exist and use the existing
 * jira-issue-type-icons primitive to render type-specific favicons.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

describe('Dynamic favicon hook', () => {
  it('useDynamicFavicon hook exists', () => {
    const hookPath = join(ROOT, 'hooks/useDynamicFavicon.ts');
    const src = readFileSync(hookPath, 'utf8');
    expect(src).toMatch(/export\s+function\s+useDynamicFavicon/);
  });

  it('imports from jira-issue-type-icons', () => {
    const hookPath = join(ROOT, 'hooks/useDynamicFavicon.ts');
    const src = readFileSync(hookPath, 'utf8');
    expect(src).toMatch(/jira-issue-type-icons/);
  });

  it('is mounted in CatalystShell or IssueFullPage', () => {
    const shell = readFileSync(join(ROOT, 'components/layout/CatalystShell.tsx'), 'utf8');
    const issuePage = readFileSync(join(ROOT, 'pages/IssueFullPage.tsx'), 'utf8');
    const mounted = shell.includes('useDynamicFavicon') || issuePage.includes('useDynamicFavicon');
    expect(mounted, 'useDynamicFavicon must be called in CatalystShell or IssueFullPage').toBe(true);
  });
});
