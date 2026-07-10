/**
 * RBAC guard — CAT-STRATA-CLOSEOUT-20260710-001, W2.
 * executive_viewer is read-only by definition of record
 * (20260705100000: "CEO/CXO consumption; no data edits").
 * This test fails the build if the role is reintroduced into any
 * write-affordance role list in the STRATA module, or if the DB
 * tightening migration disappears. Read/scope usages (labels, role
 * pickers, type unions) are fine — only *_ROLES write-gate constants
 * are scanned.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const STRATA_ROOT = join(__dirname, '..');
const MIGRATIONS = join(__dirname, '..', '..', '..', '..', 'supabase', 'migrations');

/** Write-gate constants: any `const X_ROLES = [...]` line naming executive_viewer. */
const WRITE_GATE = /const\s+\w*_ROLES\b[^=]*=\s*\[[^\]]*executive_viewer/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (name === '__tests__' || name === 'node_modules') return [];
    if (statSync(p).isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe('STRATA RBAC guard (W2 — executive_viewer read-only)', () => {
  it('no write-gate role list includes executive_viewer', () => {
    const offenders: string[] = [];
    for (const file of walk(STRATA_ROOT)) {
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (WRITE_GATE.test(line)) {
          offenders.push(`${file.replace(STRATA_ROOT, 'strata')}:${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      });
    }
    expect(offenders, `executive_viewer found in write-gate role lists:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('the DB tightening migration exists and strips the role from all six write paths', () => {
    const file = join(MIGRATIONS, '20260710140000_strata_executive_viewer_read_only.sql');
    expect(existsSync(file), 'migration 20260710140000 missing').toBe(true);
    const sql = readFileSync(file, 'utf8');
    // The migration must redefine every write path WITHOUT the role.
    for (const marker of [
      'strata_decisions_insert',
      'strata_ai_review',
      'strata_create_decision',
      'strata_update_decision',
      'strata_create_action',
      'strata_update_action',
    ]) {
      expect(sql.includes(marker), `migration does not cover ${marker}`).toBe(true);
    }
    // No role-array in the migration may grant executive_viewer.
    expect(/ARRAY\[[^\]]*executive_viewer/.test(sql), 'migration still grants executive_viewer a write').toBe(false);
  });
});
