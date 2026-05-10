/**
 * ADS compliance guard for the Project admin module (Block 3, 2026-05-09).
 *
 * The Project admin module (formerly WorkHub admin) must use
 * @atlaskit/icon/core or @atlaskit/icon/glyph for all icons — never
 * lucide-react. This test scans every .tsx/.ts file under
 * src/modules/workhub/admin/ and asserts zero lucide-react imports.
 *
 * RED against the current codebase (7 files import lucide-react).
 * GREEN after Block 3 icon swap migration.
 *
 * Vitest run: CI only (local Node 20.12.2 < vitest 4 minimum 20.19.0).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '..');

function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsxFiles(full));
    } else if (full.endsWith('.tsx') || full.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

const files = collectTsxFiles(ROOT).filter(f => !f.includes('__tests__'));

describe('Project admin module — ADS icon compliance', () => {
  it('imports no icons from lucide-react', () => {
    const violations = files.filter(f =>
      readFileSync(f, 'utf8').includes("from 'lucide-react'"),
    );
    expect(violations).toEqual([]);
  });

  it('imports no Tailwind animate-spin (use @atlaskit/spinner instead)', () => {
    const violations = files.filter(f =>
      readFileSync(f, 'utf8').includes('animate-spin'),
    );
    expect(violations).toEqual([]);
  });
});
