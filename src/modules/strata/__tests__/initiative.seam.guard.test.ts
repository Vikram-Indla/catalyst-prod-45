/**
 * Initiative-seam guard — CAT-STRATA-FOUNDATION-20260709-001, REQ-019.
 * Initiative is a legacy read-only concept: the Execution UI shows only
 * Project Cards, the UI never writes to strata_initiatives, and portfolio
 * membership authoring favors project_card paths. This test fails the build
 * if any of those seams reopen.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STRATA_ROOT = join(__dirname, '..');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('STRATA initiative seam guard (REQ-019)', () => {
  it('no UI writes to strata_initiatives anywhere in the module', () => {
    const offenders: string[] = [];
    for (const file of walk(STRATA_ROOT)) {
      const src = readFileSync(file, 'utf8');
      // any insert/update/upsert/delete chained onto the initiatives table
      if (/strata_initiatives'\)[\s\S]{0,80}?\.(insert|update|upsert|delete)\(/.test(src)) {
        offenders.push(file.replace(STRATA_ROOT, 'strata'));
      }
    }
    expect(offenders, `write path to strata_initiatives found:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('Execution page renders Project Cards only — no Initiative UI', () => {
    const src = readFileSync(join(STRATA_ROOT, 'pages/StrataExecutionPage.tsx'), 'utf8');
    expect(src).not.toContain('InitiativeDetailModal');
    expect(src).not.toContain('useInitiatives(');
  });

  it('portfolio member authoring offers project_card only — Initiative is legacy read-only (V3-OPEN-014, REQ-019 revised 2026-07-12)', () => {
    const src = readFileSync(join(STRATA_ROOT, 'components/vmoAuthoring.tsx'), 'utf8');
    expect(src).toContain("useState<'initiative' | 'project_card'>('project_card')");
    // Project card is the ONLY selectable new-member type; the Initiative option
    // was removed so no new initiative membership can be authored. Existing
    // initiative rows still render read-only via memberName.
    const opts = src.match(/const MEMBER_TYPE_OPTIONS[\s\S]*?\];/);
    expect(opts, 'MEMBER_TYPE_OPTIONS not found').not.toBeNull();
    expect(opts![0]).toContain("value: 'project_card'");
    expect(opts![0]).not.toContain("value: 'initiative'");
  });

  it('the retired InitiativeDetailModal never returns', () => {
    const files = walk(STRATA_ROOT).map((f) => f.replace(STRATA_ROOT, ''));
    expect(files.some((f) => f.includes('InitiativeDetailModal'))).toBe(false);
  });
});
