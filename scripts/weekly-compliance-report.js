/**
 * weekly-compliance-report.js
 *
 * Runs the Catalyst design-system audit, computes week-over-week trends,
 * and persists the results to Supabase via the Supabase CLI.
 *
 * ─── SETUP ───────────────────────────────────────────────────────────────────
 *
 * 1. Supabase CLI must be installed and the project linked:
 *      supabase link --project-ref cyijbdeuehohvhnsywig   (staging)
 *      supabase link --project-ref lmqwtldpfacrrlvdnmld   (production)
 *
 * 2. Run from repo root:
 *      node scripts/weekly-compliance-report.js
 *
 * 3. Schedule via cron (Mondays 9 AM):
 *      0 9 * * 1  cd /path/to/catalyst && node scripts/weekly-compliance-report.js
 *    Or GitHub Actions with a `schedule:` trigger.
 *
 * 4. Migration must be applied before first run:
 *      supabase db push --linked
 *    (Creates public.design_system_weekly_reports table)
 *
 * ─── HEALTH BANDS ────────────────────────────────────────────────────────────
 *   EXCELLENT   0 violations
 *   GOOD        1–200 violations
 *   AT-RISK     201–600 violations
 *   CRITICAL    >600 violations
 *
 * ─── EXIT CODES ──────────────────────────────────────────────────────────────
 *   0  Report persisted to Supabase successfully
 *   1  supabase CLI not found, DB write failed, or audit script not found
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Paths ────────────────────────────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const REPO_ROOT  = path.resolve(__dirname, '..');
const AUDIT_SCRIPT     = path.join(REPO_ROOT, 'design-governance', 'rules', 'audit.js');
const SELF_TEST_SCRIPT = path.join(REPO_ROOT, 'design-governance', 'scripts', 'self-test.mjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

function runNode(scriptPath, args = []) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 600_000,
    maxBuffer: 256 * 1024 * 1024,
  });
  return { stdout: result.stdout || '', stderr: result.stderr || '', exitCode: result.status ?? 1 };
}

/**
 * Run a supabase CLI command and return its stdout (parsed as JSON if possible).
 * Uses --linked (remote linked project — staging or prod depending on what's linked).
 */
function runSupabaseSql(sql) {
  const result = spawnSync('supabase', ['db', 'query', '--linked', sql], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (result.error) throw new Error(`supabase CLI not found: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`supabase db query failed:\n${result.stderr}`);
  return result.stdout.trim();
}

function parseAuditOutput(stdout) {
  const categories = {
    ADS_TOKEN: 0, TAILWIND_UTILITY: 0, HARDCODED_PX: 0,
    FONT: 0, UPPERCASE_LABEL: 0, THIRD_PARTY: 0,
  };

  // Count [TYPE] tags in verbose output
  const typeCountMap = {};
  const re = /\[([\w_]+)\]/g;
  let m;
  while ((m = re.exec(stdout)) !== null) {
    typeCountMap[m[1]] = (typeCountMap[m[1]] || 0) + 1;
  }

  const ADS_TOKEN_TYPES    = ['RAW_HEX', 'RAW_RGB_HSL'];
  const TAILWIND_TYPES     = ['TAILWIND_CLASS'];
  const PX_TYPES           = ['HARDCODED_PX'];
  const FONT_TYPES         = ['BANNED_FONT_IMPORT', 'BANNED_FONT_FACE', 'BANNED_FONT_LINK',
                               'BANNED_FONT_CDN_URL', 'BANNED_FONT_FAMILY'];
  const UPPERCASE_TYPES    = ['UPPERCASE_LABEL'];
  const THIRD_PARTY_TYPES  = ['BANNED_COMPONENT', 'BANNED_FIELD', 'BANNED_COLUMN_HEADER',
                               'ATLASKIT_LEGACY', 'CSS_FILE_IMPORT', 'BANNED_TOAST', 'HAND_ROLLED_MENU'];

  for (const [type, count] of Object.entries(typeCountMap)) {
    if (ADS_TOKEN_TYPES.includes(type))      categories.ADS_TOKEN       += count;
    else if (TAILWIND_TYPES.includes(type))  categories.TAILWIND_UTILITY += count;
    else if (PX_TYPES.includes(type))        categories.HARDCODED_PX     += count;
    else if (FONT_TYPES.includes(type))      categories.FONT              += count;
    else if (UPPERCASE_TYPES.includes(type)) categories.UPPERCASE_LABEL  += count;
    else if (THIRD_PARTY_TYPES.includes(type)) categories.THIRD_PARTY    += count;
  }

  // Total from authoritative summary line
  let total = 0;
  const totalMatch = stdout.match(/AUDIT FAILED[^:]*:\s*(\d+)\s+total/i);
  if (totalMatch) {
    total = parseInt(totalMatch[1], 10);
  } else if (stdout.includes('AUDIT PASSED')) {
    total = 0;
  } else {
    total = Object.values(categories).reduce((s, v) => s + v, 0);
  }

  return { total, categories };
}

function healthLabel(total) {
  if (total === 0)    return 'EXCELLENT';
  if (total <= 200)   return 'GOOD';
  if (total <= 600)   return 'AT-RISK';
  return 'CRITICAL';
}

function trendArrow(current, previous) {
  if (previous == null) return '';
  if (current < previous) return '↓';
  if (current > previous) return '↑';
  return '→';
}

/**
 * Load last week's report from Supabase.
 * Falls back to null on any error (first run, linked project not set up yet, etc.).
 */
function loadPreviousFromSupabase() {
  try {
    const sql = `
      SELECT total, categories, health, report_date
      FROM public.design_system_weekly_reports
      ORDER BY report_date DESC
      LIMIT 1;
    `;
    const raw = runSupabaseSql(sql);
    // supabase db query returns psql-style tabular output; parse the data row
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    // Skip header and separator lines
    const dataLine = lines.find(l => /^\d/.test(l) || /^\d{4}-\d{2}-\d{2}/.test(l));
    if (!dataLine) return null;
    // Column order: total, categories (jsonb), health, report_date
    // psql separates with | — parse carefully
    const cols = dataLine.split('|').map(c => c.trim());
    if (cols.length < 4) return null;
    return {
      total: parseInt(cols[0], 10),
      categories: JSON.parse(cols[1]),
      health: cols[2],
      report_date: cols[3],
    };
  } catch (err) {
    console.warn(`WARN: Could not load previous state from Supabase: ${err.message}`);
    return null;
  }
}

/**
 * Upsert the current report into Supabase.
 * On conflict (same date), update all fields.
 */
function persistToSupabase({ reportDate, total, health, selfTestOk, auditExit, categories, regressions }) {
  const categoriesJson = JSON.stringify(categories).replace(/'/g, "''");
  const regressionsJson = JSON.stringify(regressions).replace(/'/g, "''");

  const sql = `
    INSERT INTO public.design_system_weekly_reports
      (report_date, total, health, self_test_ok, audit_exit, categories, regressions)
    VALUES (
      '${reportDate}',
      ${total},
      '${health}',
      ${selfTestOk},
      ${auditExit},
      '${categoriesJson}',
      '${regressionsJson}'
    )
    ON CONFLICT (report_date) DO UPDATE SET
      total        = EXCLUDED.total,
      health       = EXCLUDED.health,
      self_test_ok = EXCLUDED.self_test_ok,
      audit_exit   = EXCLUDED.audit_exit,
      categories   = EXCLUDED.categories,
      regressions  = EXCLUDED.regressions,
      created_at   = now();
  `;
  runSupabaseSql(sql);
}

/**
 * Print a formatted ASCII report to stdout.
 */
function printReport({ date, total, previousTotal, categories, previousCategories, health, selfTestOk, regressions }) {
  const sep = '─'.repeat(60);

  const catLine = (label, key) => {
    const cur  = categories[key];
    const prev = previousCategories?.[key];
    const arr  = trendArrow(cur, prev);
    const prevStr = prev != null ? `  (was ${prev} ${arr})` : '';
    return `  ${label.padEnd(28)} ${String(cur).padStart(5)}${prevStr}`;
  };

  const trend = trendArrow(total, previousTotal);
  const prevStr = previousTotal != null ? `  (was ${previousTotal} ${trend})` : '';

  console.log('\n' + sep);
  console.log('  Catalyst Design System — Weekly Compliance Report');
  console.log(`  ${date}`);
  console.log(sep);
  console.log('');
  console.log('  CATEGORY BREAKDOWN');
  console.log(catLine('ADS tokens (hardcoded hex)', 'ADS_TOKEN'));
  console.log(catLine('Tailwind utilities',          'TAILWIND_UTILITY'));
  console.log(catLine('Hardcoded spacing',           'HARDCODED_PX'));
  console.log(catLine('Font violations',             'FONT'));
  console.log(catLine('Uppercase labels',            'UPPERCASE_LABEL'));
  console.log(catLine('Third-party components',      'THIRD_PARTY'));
  console.log('');
  console.log(`  OVERALL HEALTH: ${health}`);
  console.log(`  Total violations: ${total}${prevStr}`);
  console.log('');
  console.log(`  Audit self-test: ${selfTestOk ? 'PASSED ✓' : 'FAILED ✗'}`);

  if (regressions.length > 0) {
    console.log('');
    console.log('  REGRESSIONS (categories that worsened):');
    for (const { name, previous, current } of regressions) {
      console.log(`    ${name}: ${previous} → ${current}  (+${current - previous})`);
    }
  }

  console.log('');
  console.log(sep);
  console.log('  Run locally: node design-governance/rules/audit.js src/');
  console.log(sep + '\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const now  = new Date();
  const date = now.toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const reportDate = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // 1. Self-test
  console.log('Running self-test...');
  let selfTestOk = false;
  if (fs.existsSync(SELF_TEST_SCRIPT)) {
    const r = runNode(SELF_TEST_SCRIPT);
    selfTestOk = r.exitCode === 0;
    console.log(`Self-test ${selfTestOk ? 'PASSED' : 'FAILED'}`);
  } else {
    console.warn('WARN: self-test.mjs not found — marking failed');
  }

  // 2. Run audit
  console.log('Running design-system audit on src/...');
  if (!fs.existsSync(AUDIT_SCRIPT)) {
    console.error(`ERROR: Audit script not found at ${AUDIT_SCRIPT}`);
    process.exit(1);
  }
  const audit = runNode(AUDIT_SCRIPT, ['src/']);
  const output = audit.stdout + audit.stderr;
  console.log(`Audit exit code: ${audit.exitCode}`);

  // 3. Parse
  const { total, categories } = parseAuditOutput(output);
  const health = healthLabel(total);
  console.log(`Total violations: ${total}  Health: ${health}`);

  // 4. Load previous from Supabase
  const prev = loadPreviousFromSupabase();
  const previousTotal = prev?.total ?? null;
  const previousCategories = prev?.categories ?? null;

  // 5. Regressions
  const regressions = [];
  if (previousCategories) {
    for (const [name, current] of Object.entries(categories)) {
      const previous = previousCategories[name] ?? 0;
      if (current > previous) regressions.push({ name, previous, current });
    }
  }

  // 6. Print to stdout
  printReport({ date, total, previousTotal, categories, previousCategories, health, selfTestOk, regressions });

  // 7. Persist to Supabase
  console.log('Persisting report to Supabase...');
  try {
    persistToSupabase({
      reportDate,
      total,
      health,
      selfTestOk,
      auditExit: audit.exitCode,
      categories,
      regressions,
    });
    console.log(`Report saved → design_system_weekly_reports (${reportDate})`);
    process.exit(0);
  } catch (err) {
    console.error(`ERROR: Supabase persist failed: ${err.message}`);
    console.error('Report printed to stdout above — data not saved to DB.');
    process.exit(1);
  }
}

main();
