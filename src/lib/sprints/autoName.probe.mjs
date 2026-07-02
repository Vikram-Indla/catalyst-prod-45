/**
 * Node-run assertions for sprintAutoName (vitest is broken on Node 20 — see
 * A6 conventions). Transpiles the REAL ./autoName.ts via esbuild so the probe
 * exercises the shipped implementation, not a copy.
 *
 *   node src/lib/sprints/autoName.probe.mjs
 */
import { buildSync } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), 'autoname-probe-'));
const outFile = join(outDir, 'autoName.mjs');

buildSync({
  entryPoints: [join(here, 'autoName.ts')],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  platform: 'node',
});

const { sprintAutoName, sprintEndDate } = await import(pathToFileURL(outFile).href);

let failures = 0;
function expectEqual(actual, expected, label) {
  const ok = actual === expected;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n      actual:   ${actual}\n      expected: ${expected}`);
}

// D-003 corrected council vector: Sun 04 Jan 26 + 1W ends Thu 08 Jan 26.
expectEqual(sprintAutoName('BAU', '2026-01-04', 1), 'BAU-Sprint 1.1 - 08 Jan 26', 'council vector: 04 Jan 26 + 1W');
expectEqual(sprintEndDate('2026-01-04', 1), '2026-01-08', 'end date 1W');
expectEqual(sprintEndDate('2026-01-04', 2), '2026-01-15', 'end date 2W');

// Feb-start rollover: W resets with the new month.
expectEqual(sprintAutoName('BAU', '2026-02-01', 1), 'BAU-Sprint 2.1 - 05 Feb 26', 'Feb rollover -> 2.1');

// 2W sprint spanning months: M/W named from the START month, date is the end.
expectEqual(sprintAutoName('IP', '2026-04-26', 2), 'IP-Sprint 4.4 - 07 May 26', '2W spans Apr->May, named 4.4');

// Year boundary: Dec start, Jan end — YY follows the END date.
expectEqual(sprintAutoName('NDS', '2026-12-27', 2), 'NDS-Sprint 12.4 - 07 Jan 27', '2W spans year boundary');

// Week-of-month edges: day 7 -> W1, day 8 -> W2, day 29+ -> W5.
expectEqual(sprintAutoName('BAU', '2026-06-07', 1), 'BAU-Sprint 6.1 - 11 Jun 26', 'day 7 is still week 1');
expectEqual(sprintAutoName('BAU', '2026-06-08', 1), 'BAU-Sprint 6.2 - 12 Jun 26', 'day 8 starts week 2');
expectEqual(sprintAutoName('BAU', '2026-06-29', 1), 'BAU-Sprint 6.5 - 03 Jul 26', 'day 29 is week 5');

rmSync(outDir, { recursive: true, force: true });

if (failures > 0) {
  console.error(`\n${failures} assertion(s) failed`);
  process.exit(1);
}
console.log('\nall assertions passed');
