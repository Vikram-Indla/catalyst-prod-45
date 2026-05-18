/**
 * Registry drift CI gate — v3 candidate #2.
 *
 * Authored: 2026-05-17 (PR-5).
 *
 * Both `scan:components` and `scan:ads-violations` write git-tracked
 * `*.generated.ts` files. If a PR mutates `components.registry.ts` or
 * adds/removes a component without re-running the scan, the generated
 * file diverges from the source of truth and downstream consumers (admin
 * UI cascade-impact view, banned-import scan) silently disagree about
 * the world.
 *
 * Strategy: snapshot each generated file, run the scan in a subprocess,
 * re-read the file, compare. Restore the snapshot before exiting so the
 * working tree is never left in a divergent state — the test failure
 * itself is the signal that `npm run scan:*` is needed.
 *
 * Run time: ~1.5s per scan on a warm node_modules. Acceptable for CI.
 * Skipped locally if `SKIP_REGISTRY_DRIFT_TEST=1` (escape hatch for devs
 * mid-refactor; should never be set in CI).
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(__dirname, '..', '..', '..');
const USAGE_MAP = resolve(REPO_ROOT, 'src/registry/usage-map.generated.ts');
const ADS_VIOLATIONS = resolve(REPO_ROOT, 'src/registry/ads-violations.generated.ts');

interface Target {
  label: string;
  file: string;
  script: string;
  fixCmd: string;
}

const TARGETS: Target[] = [
  {
    label: 'usage-map.generated.ts',
    file: USAGE_MAP,
    script: 'npx tsx scripts/scan-components.ts',
    fixCmd: 'npm run scan:components',
  },
  {
    label: 'ads-violations.generated.ts',
    file: ADS_VIOLATIONS,
    script: 'npx tsx scripts/scan-ads-violations.ts',
    fixCmd: 'npm run scan:ads-violations',
  },
];

const SKIP = process.env.SKIP_REGISTRY_DRIFT_TEST === '1';

/**
 * Strips the embedded "captured at" timestamp / `generatedAt` field so two
 * scans run minutes apart compare equal when the underlying data didn't
 * change. Without this the gate would false-fire on every CI run.
 */
function normalize(content: string): string {
  return content
    .replace(/Captured:\s*[0-9T:.Z-]+/g, 'Captured: <ts>')
    .replace(/generatedAt:\s*'[^']+'/g, "generatedAt: '<ts>'");
}

describe.skipIf(SKIP)('registry drift CI gate', () => {
  for (const target of TARGETS) {
    // Each scan walks every .tsx/.ts under src/ and re-writes a generated
    // file (~50k lines for usage-map). On a cold node_modules it can take
    // 5–10s; on a warm one ~1.5s. Allow generous headroom for CI under
    // load — the test itself does no work beyond running the scan.
    it(`${target.label} is up to date with the live scan output`, { timeout: 30_000 }, () => {
      expect(existsSync(target.file)).toBe(true);
      const before = readFileSync(target.file, 'utf8');
      let after: string;
      try {
        execSync(target.script, {
          cwd: REPO_ROOT,
          stdio: 'pipe',
          encoding: 'utf8',
        });
        after = readFileSync(target.file, 'utf8');
      } finally {
        // Always restore the snapshot so a failing test never leaves the
        // working tree dirty. Subsequent reruns are deterministic.
        writeFileSync(target.file, before, 'utf8');
      }

      const beforeNorm = normalize(before);
      const afterNorm = normalize(after);
      if (afterNorm !== beforeNorm) {
        const beforeLines = before.split('\n').length;
        const afterLines = after.split('\n').length;
        throw new Error(
          [
            `${target.label} is stale.`,
            '',
            `  Committed:  ${beforeLines} lines`,
            `  Fresh scan: ${afterLines} lines`,
            '',
            `Run \`${target.fixCmd}\` and commit the updated file.`,
          ].join('\n'),
        );
      }
      expect(afterNorm).toBe(beforeNorm);
    });
  }
});
