/**
 * No hardcoded jira.example.com in source files.
 *
 * All Jira URLs must be constructed using the base URL from
 * ph_jira_connection (via useJiraBaseUrl hook), not hardcoded placeholders.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { globSync } from 'node:fs';

const ROOT = join(__dirname, '..', '..');

const SCANNED_FILES = [
  'components/for-you/atlaskit/AgeingPanel.tsx',
  'components/shared/JiraSyncChip.tsx',
  'components/reqAssist/RAJiraSidePanel.tsx',
  'hooks/useForYouData.ts',
];

describe('No hardcoded jira.example.com placeholders', () => {
  for (const file of SCANNED_FILES) {
    it(`${file} must not contain "jira.example.com"`, () => {
      const src = readFileSync(join(ROOT, file), 'utf8');
      expect(src).not.toMatch(/jira\.example\.com/);
    });
  }

  it('useJiraBaseUrl hook exists and exports the function', () => {
    const hookPath = join(ROOT, 'hooks/useJiraBaseUrl.ts');
    const src = readFileSync(hookPath, 'utf8');
    expect(src).toMatch(/export\s+function\s+useJiraBaseUrl/);
  });
});
