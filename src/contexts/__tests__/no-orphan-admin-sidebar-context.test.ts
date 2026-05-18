/**
 * Orphan-context guard: AdminSidebarContext is deleted.
 *
 * Background — `AdminSidebarContext` defined `AdminSidebarProvider` +
 * `useAdminSidebar()` but the Provider was never mounted anywhere in the
 * app. Its sole consumer (`ProductSettingsNav.tsx`) called the hook on
 * every render, which threw "useAdminSidebar must be used within an
 * AdminSidebarProvider" — silently breaking the entire /admin/product-
 * settings page in production.
 *
 * The context existed to let inner admin nav components collapse the
 * admin sidebar imperatively. That responsibility now belongs to the
 * global CatalystContext.cycleSidebarState flow (parent PR
 * `feat/admin-components-v3-ci-gates`), so the context has no remaining
 * legitimate use. Delete it and any import of it.
 *
 * This test pins the deletion so the orphan cannot regress.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const SRC = join(ROOT, 'src');
const CONTEXT_FILE = join(SRC, 'contexts/AdminSidebarContext.tsx');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip generated / vendored / graveyard trees
      if (entry === 'node_modules' || entry === '_graveyard' || entry === '.git') continue;
      walk(full, acc);
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry))) {
      acc.push(full);
    }
  }
  return acc;
}

describe('AdminSidebarContext — orphan removal', () => {
  it('AdminSidebarContext.tsx no longer exists', () => {
    expect(existsSync(CONTEXT_FILE)).toBe(false);
  });

  it('no source file imports from @/contexts/AdminSidebarContext', () => {
    const offenders: string[] = [];
    const pattern = /from\s+['"]@\/contexts\/AdminSidebarContext['"]/;
    for (const file of walk(SRC)) {
      // Skip this test file itself
      if (file === __filename) continue;
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        offenders.push(file.replace(ROOT + '/', ''));
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Found ${offenders.length} import(s) of the deleted AdminSidebarContext:\n` +
        offenders.map(f => `  ✗ ${f}`).join('\n') +
        '\n\nFix: remove the import. The collapse() / useAdminSidebar API is gone — admin sidebar state lives in CatalystContext.cycleSidebarState now.'
      );
    }
    expect(offenders).toHaveLength(0);
  });

  it('no source file calls useAdminSidebar()', () => {
    const offenders: string[] = [];
    const pattern = /\buseAdminSidebar\s*\(/;
    for (const file of walk(SRC)) {
      if (file === __filename) continue;
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        offenders.push(file.replace(ROOT + '/', ''));
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `Found ${offenders.length} call(s) to useAdminSidebar():\n` +
        offenders.map(f => `  ✗ ${f}`).join('\n') +
        '\n\nFix: remove the call. The hook does not exist.'
      );
    }
    expect(offenders).toHaveLength(0);
  });
});
