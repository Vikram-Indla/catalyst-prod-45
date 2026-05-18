/**
 * Phase B-4a — planner/components/UserAvatar deletion.
 *
 * 81-line sibling with the same GUARDRAIL pattern, zero consumers
 * (grep -rn 'import.*UserAvatar' src/modules/planner/ returned nothing).
 * Dead code — straight deletion, no callsite changes needed.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..', '..', '..');
const TARGET = join(ROOT, 'src/modules/planner/components/UserAvatar.tsx');

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '_graveyard' || entry === '.git') continue;
      walk(full, acc);
    } else if (['.ts', '.tsx'].includes(extname(entry))) {
      acc.push(full);
    }
  }
  return acc;
}

describe('planner/UserAvatar — dead code deletion', () => {
  it('src/modules/planner/components/UserAvatar.tsx no longer exists', () => {
    expect(existsSync(TARGET)).toBe(false);
  });

  it('no source file imports from the deleted planner UserAvatar', () => {
    const pattern = /from\s+['"](?:[^'"]*planner\/components\/UserAvatar|\.\/UserAvatar|\.\.\/UserAvatar)['"]/;
    const offenders: string[] = [];
    for (const file of walk(join(ROOT, 'src'))) {
      if (file === __filename) continue;
      // Only check planner-relative imports — other UserAvatar imports are unrelated.
      if (!file.includes('/modules/planner/')) continue;
      const content = readFileSync(file, 'utf8');
      if (pattern.test(content)) {
        offenders.push(file.replace(ROOT + '/', ''));
      }
    }
    expect(offenders).toHaveLength(0);
  });
});
