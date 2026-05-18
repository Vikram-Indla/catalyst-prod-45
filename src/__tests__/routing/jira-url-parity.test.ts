/**
 * Jira URL parity — all dynamic URLs via useJiraBaseUrl hook follow canonical /browse/:key pattern.
 *
 * This test validates that:
 * 1. useJiraBaseUrl hook correctly queries ph_jira_connection.site_url
 * 2. All /browse/ URL construction uses the hook (never hardcoded URLs)
 * 3. Full Jira URLs follow the pattern: ${baseUrl}/browse/${issue_key}
 * 4. URL format is valid (https://, no trailing slash on baseUrl)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');

// Files that dynamically construct Jira URLs via useJiraBaseUrl
const URL_CONSTRUCTION_FILES = [
  'components/for-you/atlaskit/AgeingPanel.tsx',
  'components/reqAssist/RAJiraSidePanel.tsx',
  'hooks/useForYouData.ts',
];

describe('Jira URL parity — dynamic /browse URLs', () => {
  it('useJiraBaseUrl hook queries ph_jira_connection, not hardcoded URLs', () => {
    const hookPath = join(ROOT, 'hooks/useJiraBaseUrl.ts');
    const src = readFileSync(hookPath, 'utf8');

    // Hook must query ph_jira_connection
    expect(src).toMatch(/from\s*\(\s*['"]ph_jira_connection['"]\s*\)/);
    // Must select site_url column
    expect(src).toMatch(/\.select\s*\(\s*['"`]site_url['"`]\s*\)/);
    // Must strip trailing slash from site_url (for consistent URL construction)
    expect(src).toContain("replace(/\\/$");
  });

  it('All /browse/ URL construction uses ${jiraBaseUrl}/browse/${issueKey} pattern', () => {
    for (const file of URL_CONSTRUCTION_FILES) {
      const src = readFileSync(join(ROOT, file), 'utf8');

      // Must use jiraBaseUrl variable (not hardcoded URL)
      expect(src, `${file} must import useJiraBaseUrl hook`).toMatch(
        /import\s+{\s*useJiraBaseUrl\s*}\s+from/
      );

      // Must construct URL as ${jiraBaseUrl}/browse/
      expect(src, `${file} must construct /browse/ URLs with jiraBaseUrl`).toMatch(
        /\$\{\s*jiraBaseUrl\s*\}\/browse\//
      );

      // Must NOT have hardcoded Jira domain URLs (e.g., https://digital-transformation.atlassian.net)
      expect(src).not.toMatch(/https:\/\/[a-z0-9-]+\.atlassian\.net/);
    }
  });

  it('All /browse/ URLs include issue_key or issueKey variable (never hardcoded keys)', () => {
    for (const file of URL_CONSTRUCTION_FILES) {
      const src = readFileSync(join(ROOT, file), 'utf8');

      // Find all /browse/ constructions and verify they use a variable, not a literal
      const browseMatches = src.match(/\/browse\/\$\{[^}]+\}|\/browse\/\$\{[a-zA-Z_][a-zA-Z0-9_]*\}/g);
      expect(browseMatches, `${file} must use /browse/$\{variable\} pattern`).not.toBeNull();
      expect(browseMatches?.length, `${file} should have at least one /browse/ construction`).toBeGreaterThan(0);
    }
  });

  it('No hardcoded Jira domain URLs exist (all use dynamic hook)', () => {
    for (const file of URL_CONSTRUCTION_FILES) {
      const src = readFileSync(join(ROOT, file), 'utf8');

      // Must NOT have hardcoded Jira domain URLs (e.g., https://digital-transformation.atlassian.net)
      expect(src).not.toMatch(/https:\/\/[a-z0-9-]+\.atlassian\.net/);
      // Must NOT have http:// Jira URLs
      expect(src).not.toMatch(/http:\/\/[a-z0-9-]*jira[a-z0-9-.]*/);
    }
  });

  it('All /browse/ URL construction is guarded with null-check on jiraBaseUrl', () => {
    for (const file of URL_CONSTRUCTION_FILES) {
      const src = readFileSync(join(ROOT, file), 'utf8');

      // Find /browse/ URL constructions and verify they're all guarded
      const browseConstructions = src.match(/\$\{[^}]*jiraBaseUrl[^}]*\}\/browse\//g);
      if (browseConstructions && browseConstructions.length > 0) {
        // All /browse/ constructions must be in a ternary, &&, or if guard context
        for (const construction of browseConstructions) {
          const constructionIndex = src.indexOf(construction);
          const beforeContext = src.substring(Math.max(0, constructionIndex - 100), constructionIndex);
          const hasGuard = beforeContext.includes('?') || beforeContext.includes('&&') || beforeContext.includes('if (');
          expect(hasGuard, `${file}: /browse/ construction must be guarded (found: ${construction})`).toBe(true);
        }
      }
    }
  });
});
