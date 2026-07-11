/**
 * Terminology guard — CAT-STRATA-FOUNDATION-20260709-001, REQ-003.
 * The legacy term "Play" is banned from active STRATA terminology
 * (locked goal rule 2). This test fails the build if it is reintroduced
 * in code, UI labels, comments, table names or RPC names inside the
 * STRATA module. Atlaskit icon imports and unrelated words (display,
 * playback) are whitelisted by the word-boundary pattern + filter.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STRATA_ROOT = join(__dirname, '..');
const BANNED = /\bplays?\b/i;
const WHITELIST = /display|playback|playwright/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('STRATA terminology guard (REQ-003)', () => {
  it('contains no active "Play" terminology in the strata module', () => {
    const offenders: string[] = [];
    for (const file of walk(STRATA_ROOT)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (BANNED.test(line) && !WHITELIST.test(line)) {
          offenders.push(`${file.replace(STRATA_ROOT, 'strata')}:${i + 1}: ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(offenders, `banned "Play" terminology found:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('uses the renamed charter identifiers end to end', () => {
    const domain = readFileSync(join(STRATA_ROOT, 'domain/index.ts'), 'utf8');
    expect(domain).toContain("typedQuery('strata_theme_charters')");
    expect(domain).toContain("typedRpc('strata_upsert_theme_charter'");
    const types = readFileSync(join(STRATA_ROOT, 'types.ts'), 'utf8');
    expect(types).toContain('export interface StrataThemeCharter');
  });
});
