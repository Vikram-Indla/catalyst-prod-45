import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../../..');
const src = readFileSync(resolve(repoRoot, 'src/components/shared/JiraTable/JiraTable.tsx'), 'utf8');

// 2026-05-17 jira-compare cycle 2: Jira's BAU list shows "{N} of {Total}" at
// the table footer (e.g. "50 of 1000+"). Catalyst was silent. The canonical
// JiraTable must render a row-count footer when data is present, with or
// without pagination active. This is a source-grep proxy for the existence
// of that footer; full DOM-level assertion is deferred to live probe.
describe('JiraTable — row count footer (2026-05-17 jira-compare)', () => {
  it('renders a row-count footer element gated by data.length', () => {
    // Look for a JSX block that references data?.length || data.length AND
    // the word "item" (singular/plural) inside the JiraTable source.
    expect(src).toMatch(/data\??\.length[\s\S]{0,400}item/);
  });

  it('exposes a showRowCount prop so consumers can opt out', () => {
    // Prop must exist in the JiraTable signature so callers can disable
    // the indicator on surfaces that already render their own count.
    expect(src).toMatch(/showRowCount/);
  });
});
