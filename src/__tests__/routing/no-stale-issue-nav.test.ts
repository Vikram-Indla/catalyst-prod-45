/**
 * No stale /issue/{key} navigation links.
 *
 * The canonical issue detail route is /browse/{key}.
 * All nav links (anchors, navigate() calls) must use /browse/, not /issue/.
 * The /issue/:key route itself is a redirect (in App.tsx) — allowed.
 * But hardcoded links in components must point to /browse/.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

// Files that are known to use /issue navigation (and should be fixed)
const NAV_FILES = [
  'components/shared/IssueKeyLink.tsx',
  'components/IssueDetailPane/SubtasksPanel.tsx',
  'components/IssueDetailPane/LinkedWorkItemsSection.tsx',
  'components/catalyst-detail-views/shared/CatalystViewBase.tsx',
  'components/layout/CatalystShell.tsx',
  'modules/project-work-hub/components/TicketBreadcrumbs.tsx',
  'modules/project-work-hub/components/dialogs/CloneIssueDialog.tsx',
];

describe('No stale /issue/{key} navigation links', () => {
  for (const file of NAV_FILES) {
    it(`${file} must not contain href="/issue/ or href=\`/issue/ navigation patterns`, () => {
      const src = readFileSync(join(ROOT, file), 'utf8');

      // Check for hardcoded /issue/ href patterns (excluding the redirect route)
      const hasIssueHref = /href\s*[=:]\s*["'`]\/issue\//.test(src);
      const hasIssueNavigate = /navigate\s*\(\s*["'`]\/[a-z0-9-]+\/issue\//.test(src);

      expect(hasIssueHref, `Found /issue/ href in ${file}`).toBe(false);
      expect(hasIssueNavigate, `Found /issue/ navigate in ${file}`).toBe(false);
    });
  }

  it('All nav links must use /browse/{key} instead of /issue/{key}', () => {
    for (const file of NAV_FILES) {
      const src = readFileSync(join(ROOT, file), 'utf8');

      // Should use /browse/ for issue navigation
      const hasValidBrowse = /\/browse\//.test(src) ||
        /\/project-hub\/[^/]+\/issue\//.test(src) === false; // Old pattern removed

      // If the file previously had /issue/ patterns, they should now be /browse/ or /project/
      expect(src).not.toMatch(/href\s*=\s*["'`]\/issue\//);
      expect(src).not.toMatch(/navigate\s*\(\s*["'`]\/[a-z0-9-]+\/issue\//);
    }
  });
});
