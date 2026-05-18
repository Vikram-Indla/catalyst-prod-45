/**
 * codemod-rename-flag contract test (2026-05-18, v3-candidate #3).
 *
 * RED until src/registry/codemod/rename-flag.ts is implemented.
 *
 * Tests the pure `applyRenameTransform` function which rewrites a single
 * feature-flag key inside a `useComponentConfig(componentId, { ... })` call.
 *
 * The function operates on source-code strings (via ts-morph in-memory
 * project) so tests need no real file system access and run in the existing
 * vitest jsdom environment without modification.
 *
 * Contract (locked):
 *   applyRenameTransform({ sourceCode, componentId, oldFlagName, newFlagName })
 *     → string (transformed source, or unchanged source if no match)
 *
 *   Transform rules:
 *   1. Find every CallExpression whose callee identifier is `useComponentConfig`
 *      and whose first argument is a StringLiteral matching `componentId`.
 *   2. In the second argument (ObjectLiteralExpression), find every
 *      PropertyAssignment whose key name matches `oldFlagName`.
 *   3. Rename that key to `newFlagName`. Value expression is preserved.
 *   4. If no match is found, return source unchanged.
 *   5. Never mutate a call whose componentId doesn't match.
 */
import { describe, it, expect } from 'vitest';
import { applyRenameTransform } from '@/registry/codemod/rename-flag';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** Mirrors the real JiraTable.tsx:174 call — three feature-flag props. */
const JIRA_TABLE_CONSUMER = `
import { useComponentConfig } from '@/registry/useComponentConfig';

function Consumer() {
  const resolvedConfig = useComponentConfig('jira-table', {
    enableGroupCreateButton: enableGroupCreateButtonProp,
    enableStickyCreateFooter: enableStickyCreateFooterProp,
    enableColumnReorder: enableColumnReorderProp,
  });
  return null;
}
`;

/** Consumer for a DIFFERENT component — must be left untouched. */
const OTHER_COMPONENT_CONSUMER = `
import { useComponentConfig } from '@/registry/useComponentConfig';

function Other() {
  const config = useComponentConfig('catalyst-view-base', {
    enableStickyCreateFooter: someProp,
  });
  return null;
}
`;

/** Consumer that has the flag absent — must be returned unchanged. */
const CONSUMER_WITHOUT_FLAG = `
import { useComponentConfig } from '@/registry/useComponentConfig';

function Consumer() {
  const config = useComponentConfig('jira-table', {
    enableGroupCreateButton: true,
  });
  return null;
}
`;

/** Consumer with shorthand property (computed shorthand). */
const CONSUMER_SHORTHAND = `
import { useComponentConfig } from '@/registry/useComponentConfig';

function Consumer() {
  const enableStickyCreateFooter = true;
  const config = useComponentConfig('jira-table', {
    enableGroupCreateButton: x,
    enableStickyCreateFooter,
  });
  return null;
}
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('applyRenameTransform', () => {
  it('renames the target flag key in the useComponentConfig props object', () => {
    const result = applyRenameTransform({
      sourceCode: JIRA_TABLE_CONSUMER,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    expect(result).toContain('enableStickyFooter:');
    expect(result).not.toContain('enableStickyCreateFooter:');
  });

  it('preserves all other prop keys in the same call', () => {
    const result = applyRenameTransform({
      sourceCode: JIRA_TABLE_CONSUMER,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    expect(result).toContain('enableGroupCreateButton:');
    expect(result).toContain('enableColumnReorder:');
  });

  it('preserves the original value expression (does not rewrite the value)', () => {
    const result = applyRenameTransform({
      sourceCode: JIRA_TABLE_CONSUMER,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    expect(result).toContain('enableStickyFooter: enableStickyCreateFooterProp');
  });

  it('leaves useComponentConfig calls for a different componentId untouched', () => {
    const result = applyRenameTransform({
      sourceCode: OTHER_COMPONENT_CONSUMER,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    // 'catalyst-view-base' call must not be rewritten
    expect(result).toContain("enableStickyCreateFooter: someProp");
  });

  it('returns source unchanged when the old flag name is not present', () => {
    const result = applyRenameTransform({
      sourceCode: CONSUMER_WITHOUT_FLAG,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    // Source should be bit-identical (no spurious mutations)
    expect(result).toBe(CONSUMER_WITHOUT_FLAG);
  });

  it('handles shorthand property syntax (renames shorthand to keyed assignment)', () => {
    const result = applyRenameTransform({
      sourceCode: CONSUMER_SHORTHAND,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    // Shorthand { enableStickyCreateFooter } → must become { enableStickyFooter: enableStickyCreateFooter }
    // or the shorthand key is renamed, depending on transform strategy. Either is valid.
    // The only hard assertion: old name must no longer appear as a property KEY.
    expect(result).not.toMatch(/enableStickyCreateFooter\s*[,}]/);
  });

  it('is idempotent: applying the transform twice produces the same output as once', () => {
    const once = applyRenameTransform({
      sourceCode: JIRA_TABLE_CONSUMER,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter',
      newFlagName: 'enableStickyFooter',
    });
    const twice = applyRenameTransform({
      sourceCode: once,
      componentId: 'jira-table',
      oldFlagName: 'enableStickyCreateFooter', // already gone
      newFlagName: 'enableStickyFooter',
    });
    expect(twice).toBe(once);
  });
});
