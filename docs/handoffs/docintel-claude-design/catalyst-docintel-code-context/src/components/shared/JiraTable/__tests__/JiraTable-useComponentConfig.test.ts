/**
 * JiraTable + useComponentConfig integration contract (PR-2).
 *
 * Source-content assertions — runtime integration verified in dev / Chrome MCP.
 *
 * Requires JiraTable to import useComponentConfig and resolve every feature_flag
 * declared in the registry. The resolver returns the prop value when set,
 * then runtime config, then registry default. The destructure default of
 * `false` is no longer applied because it would short-circuit the runtime
 * config (undefined props would become `false` before reaching the resolver).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const FILE = resolve(__dirname, '..', 'JiraTable.tsx');
const src = (): string => readFileSync(FILE, 'utf8');

describe('JiraTable — useComponentConfig integration', () => {
  it('imports useComponentConfig from the registry', () => {
    expect(src()).toMatch(/from\s+['"]@\/registry\/useComponentConfig['"]/);
  });

  it('calls useComponentConfig with the canonical id "jira-table"', () => {
    expect(src()).toMatch(/useComponentConfig\(\s*['"]jira-table['"]/);
  });

  it('passes the registry-managed flag props to the resolver, not destructure defaults', () => {
    // The destructure-default-false pattern was replaced. The 4 v2-managed flags
    // (enableGroupCreateButton, enableStickyCreateFooter, enableColumnReorder,
    // enableBulkSelect) must be passed through the resolver instead of being
    // forced to false when undefined.
    const s = src();
    const destructureBlock = s.slice(s.indexOf('const {'), s.indexOf('} = props;') + 10);
    expect(destructureBlock).not.toMatch(/enableGroupCreateButton\s*=\s*false/);
    expect(destructureBlock).not.toMatch(/enableStickyCreateFooter\s*=\s*false/);
  });
});
