#!/usr/bin/env node
/**
 * import-notion-features.mjs (v2 — SQL-emit mode)
 * ============================================================================
 * Pulls the Notion ⭐ Features database and emits a single transactional SQL
 * file you paste into the Lovable SQL editor. Aligns with the L22 workflow:
 * Claude pastes / Vikram clicks Run.
 *
 * Why this shape (vs the v1 direct-write design)
 *   Lovable doesn't expose Supabase service_role to its UI; the v1 script
 *   needed service_role to bypass RLS for auth.users email-resolution. SQL
 *   pasted into the Lovable SQL editor runs as a privileged Postgres role
 *   so we can do email→user_id inline as a subquery.
 *
 * What this script does
 *   1. Paginates the Notion DB (cursor-based) to load every record.
 *   2. Resolves DM / PO Notion user IDs → emails via Notion API
 *      (cached per run).
 *   3. For each record, emits an INSERT … ON CONFLICT (import_ref) DO UPDATE
 *      with email-based user-id subqueries inlined.
 *   4. Writes the full transactional SQL to outputs/notion-features-upsert.sql
 *      (and a copy to scripts/notion-features-upsert.sql for easy access).
 *
 * What this script does NOT do
 *   - Write to Supabase directly. Vikram pastes the .sql into Lovable and
 *     clicks Run.
 *   - Download BRD attachments. Notion's file:// URLs are short-lived signed
 *     URLs (~1hr); they need a service-role-equipped pipeline to upload to
 *     Supabase storage. Tracked as a follow-up workstream.
 *
 * Idempotency
 *   - Every UPSERT keys on import_ref (the Notion page URL). Re-running on
 *     the same data updates rows in place (no duplicates).
 *
 * Environment variables (required)
 *   NOTION_TOKEN — Notion integration token; needs read access to the
 *                  ⭐ Features DB (add the integration via the DB's …→Connections
 *                  menu in Notion). `ntn_` and `secret_` formats both work.
 *
 * Optional flags
 *   LIMIT=N      — process only the first N records (debug).
 *   OUT=path     — override default output path (./outputs/notion-features-upsert.sql)
 *
 * Run
 *   node scripts/import-notion-features.mjs
 *   LIMIT=5 node scripts/import-notion-features.mjs        # try with 5 records first
 * ============================================================================
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ─── Config ────────────────────────────────────────────────────────────────
const NOTION_DATABASE_ID = '2170d383a29046fc8b89682df84c50de';
const NOTION_API         = 'https://api.notion.com/v1';
const NOTION_VERSION     = '2022-06-28';
const NOTION_TOKEN       = process.env.NOTION_TOKEN;
const LIMIT              = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : null;
const OUT_PATH           = process.env.OUT || resolve('outputs/notion-features-upsert.sql');
const ALT_OUT_PATH       = resolve('scripts/notion-features-upsert.sql');

if (!NOTION_TOKEN) {
  console.error('FATAL: missing NOTION_TOKEN env var');
  process.exit(1);
}

// ─── Notion REST wrapper ───────────────────────────────────────────────────
async function notionFetch(path, init = {}) {
  const resp = await fetch(`${NOTION_API}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  if (!resp.ok) {
    throw new Error(`Notion ${init.method || 'GET'} ${path} → ${resp.status}: ${await resp.text()}`);
  }
  return resp.json();
}

// ─── Field maps ────────────────────────────────────────────────────────────
const STATUS_MAP = {
  'Not Started': 'new',
  'In Progress': 'under_implementation',
  'In Review':   'implementation_review',
  'On Hold':     'on_hold',
  'Completed':   'done',
};

const PRIORITY_MAP = { 'High': 'high', 'Medium': 'medium', 'Low': 'low' };

const THEME_MAP = {
  'رقمنة إجراء جديد':         'digitization_new_procedure',
  'تحسين إجراء قائم':         'improve_existing_procedure',
  'Digital Maturity 2026':     'digital_maturity_2026',
  'السوق الصناعي':            'industrial_market',
  'اتاحة خدمات':              'enable_services',
  'تضمين خدمة قطاعية':        'embed_sector_service',
  'Provide Services for SBC':  'services_for_sbc',
  'خدمات الموظف الداخلية':    'internal_employee_services',
  'تقارير ومؤشرات':           'reports_and_indicators',
  'كفاءة الموقع':              'website_efficiency',
  'تحسين خدمة الشركاء':       'improve_partner_service',
  'استعلام تحققي':             'verification_inquiry',
  'UX':                        'ux',
  'المسح الصناعي':            'industrial_survey',
  'Marketplace':               'marketplace',
  'مهام داخلية':               'internal_tasks',
  'جودة بيانات':               'data_quality',
  'مشاكل تشغيلية':             'operational_issues',
};

const CATEGORY_TO_DELIVERY_PLATFORM = {
  'صناعي':           'Senaei Platform',
  'موقع الوزارة':     'Website',
  'خدمات داخلية':    'Catalyst',
  'منصة الابتكار':   'Innovation Platform',
};

// ─── Notion helpers ────────────────────────────────────────────────────────
async function fetchAllPages() {
  const all = [];
  let cursor;
  let pageNum = 0;
  do {
    pageNum += 1;
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const res = await notionFetch(`/databases/${NOTION_DATABASE_ID}/query`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    all.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
    console.log(`  page ${pageNum}: ${res.results.length} records (cumulative ${all.length}, has_more=${res.has_more})`);
    if (LIMIT && all.length >= LIMIT) break;
  } while (cursor);
  return LIMIT ? all.slice(0, LIMIT) : all;
}

function plainText(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.map(t => t.plain_text ?? '').join('').trim();
}

const userEmailCache = new Map();
async function getEmail(notionUserId) {
  if (!notionUserId) return null;
  if (userEmailCache.has(notionUserId)) return userEmailCache.get(notionUserId);
  let email = null;
  try {
    const u = await notionFetch(`/users/${notionUserId}`);
    email = u?.person?.email ?? null;
  } catch (e) {
    console.warn(`  ! could not retrieve Notion user ${notionUserId}: ${e.message}`);
  }
  userEmailCache.set(notionUserId, email);
  return email;
}

// ─── SQL helpers ───────────────────────────────────────────────────────────
function sqlString(v) {
  if (v === null || v === undefined) return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}
function sqlBool(v) { return v ? 'true' : 'false'; }
function sqlDate(v) { return v ? `'${v}'::date` : 'NULL'; }
function sqlJsonbArray(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return `'[]'::jsonb`;
  // Use to_jsonb on a text[] so values escape cleanly
  const items = arr.map(s => sqlString(s)).join(', ');
  return `to_jsonb(ARRAY[${items}]::text[])`;
}
function sqlEmailLookup(email) {
  if (!email) return 'NULL';
  return `(SELECT id FROM auth.users WHERE email = ${sqlString(email)} LIMIT 1)`;
}

// ─── Per-record transform → SQL block ──────────────────────────────────────
async function buildUpsertSql(page) {
  const props = page.properties || {};
  const get = (n) => props[n];

  const arabicTitle  = plainText(get('Feature Name')?.title);
  const englishTitle = plainText(get('Feature En')?.rich_text);

  const notionStatus = get('Status')?.status?.name ?? null;
  const processStep  = STATUS_MAP[notionStatus] ?? 'new';

  const notionPriority = get('Priority')?.select?.name ?? null;
  const priorityTier   = PRIORITY_MAP[notionPriority] ?? null;

  const notionTheme = get('Theme')?.select?.name ?? null;
  const theme       = notionTheme ? (THEME_MAP[notionTheme] ?? null) : null;

  const notionCategory   = get('Gategory')?.select?.name ?? null;
  const deliveryPlatform = notionCategory ? (CATEGORY_TO_DELIVERY_PLATFORM[notionCategory] ?? null) : null;

  const stakeholders = (get('Stakeholders')?.multi_select ?? []).map(s => s.name);

  const targetedFeature = get('Targeted Feature')?.checkbox === true;

  const targetDate = get('Target Date')?.date?.start ?? null;

  const dmEmail = await getEmail(get('DM')?.people?.[0]?.id ?? null);
  const poEmail = await getEmail(get('PO')?.people?.[0]?.id ?? null);

  const scopeUrl = get('Scope')?.url ?? null;

  const title = englishTitle || arabicTitle || '(untitled)';
  const importRef = page.url;

  return `
-- ${importRef}
INSERT INTO public.business_requests (
  title, arabic_title, process_step, priority_tier, theme, delivery_platform,
  stakeholders, targeted_feature, end_date,
  project_manager_user_id, po_user_id, functional_spec_link,
  import_source, import_ref, health, is_force_ranked
) VALUES (
  ${sqlString(title)},
  ${sqlString(arabicTitle || null)},
  ${sqlString(processStep)},
  ${sqlString(priorityTier)},
  ${sqlString(theme)},
  ${sqlString(deliveryPlatform)},
  ${sqlJsonbArray(stakeholders)},
  ${sqlBool(targetedFeature)},
  ${sqlDate(targetDate)},
  ${sqlEmailLookup(dmEmail)},
  ${sqlEmailLookup(poEmail)},
  ${sqlString(scopeUrl)},
  'notion',
  ${sqlString(importRef)},
  'green',
  false
)
ON CONFLICT (import_ref) DO UPDATE SET
  title                   = EXCLUDED.title,
  arabic_title            = EXCLUDED.arabic_title,
  process_step            = EXCLUDED.process_step,
  priority_tier           = EXCLUDED.priority_tier,
  theme                   = EXCLUDED.theme,
  delivery_platform       = EXCLUDED.delivery_platform,
  stakeholders            = EXCLUDED.stakeholders,
  targeted_feature        = EXCLUDED.targeted_feature,
  end_date                = EXCLUDED.end_date,
  project_manager_user_id = EXCLUDED.project_manager_user_id,
  po_user_id              = EXCLUDED.po_user_id,
  functional_spec_link    = EXCLUDED.functional_spec_link,
  updated_at              = now();
`.trim();
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`▶ Notion → SQL emit${LIMIT ? ` (LIMIT=${LIMIT})` : ''}`);

  console.log('▶ Fetching Notion pages…');
  const pages = await fetchAllPages();
  console.log(`▶ Got ${pages.length} pages\n`);

  console.log('▶ Resolving emails + emitting SQL…');
  const blocks = [];
  let idx = 0;
  for (const page of pages) {
    idx += 1;
    try {
      const sql = await buildUpsertSql(page);
      blocks.push(sql);
      if (idx % 10 === 0) console.log(`  · ${idx}/${pages.length}`);
    } catch (e) {
      console.error(`  ! failed for ${page.url}: ${e.message}`);
    }
  }

  const header = [
    '-- ════════════════════════════════════════════════════════════════════════════',
    '-- Notion ⭐ Features → Catalyst business_requests upsert',
    `-- Generated: ${new Date().toISOString()}`,
    `-- Records:   ${blocks.length} of ${pages.length}`,
    '-- Conflict:  ON CONFLICT (import_ref) DO UPDATE — re-runs are safe',
    '-- ════════════════════════════════════════════════════════════════════════════',
    'BEGIN;',
    '',
  ].join('\n');

  const footer = '\n\nCOMMIT;\n\n-- VERIFY:\n-- SELECT count(*), import_source FROM business_requests GROUP BY import_source;\n-- SELECT request_key, title, arabic_title, theme, jsonb_array_length(stakeholders) AS stake, targeted_feature, project_manager_user_id, po_user_id\n--   FROM business_requests WHERE import_source = \'notion\' ORDER BY created_at DESC LIMIT 10;\n';

  const out = header + blocks.join('\n\n') + footer;

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, out, 'utf8');
  // Also write a copy next to the script for easy access in repo-rooted shells
  try { writeFileSync(ALT_OUT_PATH, out, 'utf8'); } catch {}

  console.log(`\n▶ Wrote ${blocks.length} upserts → ${OUT_PATH}`);
  console.log(`▶ Also at:                       ${ALT_OUT_PATH}`);
  console.log(`▶ ${out.length.toLocaleString()} chars`);
  console.log('\nNext: paste this SQL into Lovable SQL editor and click Run.');
  console.log('      I\'ll do the paste via Chrome MCP if you say "paste it".');
}

main().catch((e) => { console.error('FATAL:', e); process.exit(1); });
