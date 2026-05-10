/**
 * Block 8 — Phase E full-tree ADS sweep: components/admin.
 *
 * Every .tsx file under src/components/admin must use
 * @atlaskit/icon/core or @atlaskit/icon/glyph — never lucide-react.
 * Loader2 + animate-spin must be replaced with @atlaskit/spinner.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';

const COMP_ADMIN = resolve(__dirname, '..');

function collectTsx(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    if (e.name === '__tests__') continue;
    const full = resolve(dir, e.name);
    if (e.isDirectory()) files.push(...collectTsx(full));
    else if (e.name.endsWith('.tsx')) files.push(full);
  }
  return files;
}

const TARGET_FILES = collectTsx(COMP_ADMIN);

describe('components/admin — Block 8 ADS icon compliance', () => {
  it('imports no icons from lucide-react', () => {
    const violations = TARGET_FILES.filter(f =>
      readFileSync(f, 'utf8').includes("from 'lucide-react'"),
    ).map(f => f.replace(COMP_ADMIN + '/', ''));
    expect(violations).toEqual([]);
  });

  it('uses no Tailwind animate-spin (use @atlaskit/spinner instead)', () => {
    const violations = TARGET_FILES.filter(f =>
      readFileSync(f, 'utf8').includes('animate-spin'),
    ).map(f => f.replace(COMP_ADMIN + '/', ''));
    expect(violations).toEqual([]);
  });
});
