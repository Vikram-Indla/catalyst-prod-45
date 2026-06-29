/**
 * remediate-heading-wrapped-descriptions.mjs
 *
 * ONE-TIME data remediation for the "description renders bold + loud" defect
 * (RCA: BAU-5855). A broken Jira-markdown→ADF ingest stored the ENTIRE
 * description body inside a single `heading level:2` text node, with literal
 * "\n" (backslash-n) line breaks and unparsed "## " markdown left intact.
 * The renderer (adfLightRenderer.tsx) faithfully paints that h2 at 20px/600,
 * so the whole description looks bold and loud.
 *
 * Scope (DELIBERATELY NARROW): only rows whose description_adf is a doc with
 * EXACTLY ONE content block of type `heading`. This is the homogeneous,
 * confirmed-broken population (57 rows, all BAU as of probe 2026-06-29).
 * Multi-block docs that merely contain a stray "\n" are NOT touched — they
 * are mostly well-formed and need separate verification.
 *
 * What it does per row:
 *   1. Read the single heading node's text.
 *   2. Unescape literal \n \r \t into real characters.
 *   3. Parse the markdown into proper ADF blocks (headings / paragraphs /
 *      bullet + ordered lists) — same grammar Caty's improve pipeline uses.
 *   4. Write the rebuilt doc back to description_adf.
 *
 * Safety:
 *   - DRY RUN by default. Prints a before/after summary per row, writes NOTHING.
 *   - Pass --apply to perform the UPDATEs.
 *   - Idempotent: re-running after an apply is a no-op (the rows no longer
 *     match the single-heading shape).
 *   - Touches ONLY description_adf. description_text is left as-is so the
 *     original source string is preserved for audit / re-runs.
 *
 * Env (service-role required — this writes to ph_issues):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/remediate-heading-wrapped-descriptions.mjs            # dry run
 *   node scripts/remediate-heading-wrapped-descriptions.mjs --apply    # write
 */
import { createClient } from '@supabase/supabase-js';

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

/**
 * Markdown → ADF. Mirrors catyMarkdownToAdf in
 * CatalystDescriptionSection.tsx (## headings, - / * bullets, 1. ordered,
 * blank-line-separated paragraphs). Inline marks are intentionally not
 * parsed — parity with the existing Caty pipeline.
 */
function markdownToAdf(md) {
  if (!md.trim()) return { type: 'doc', version: 1, content: [{ type: 'paragraph' }] };
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const h = line.match(/^(#{1,6})\s+(.+)$/);
    if (h) {
      blocks.push({
        type: 'heading',
        attrs: { level: h[1].length },
        content: [{ type: 'text', text: h[2].trim() }],
      });
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i] ?? '')) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: (lines[i] ?? '').replace(/^[-*]\s+/, '') }] }],
        });
        i++;
      }
      blocks.push({ type: 'bulletList', content: items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: (lines[i] ?? '').replace(/^\d+\.\s+/, '') }] }],
        });
        i++;
      }
      blocks.push({ type: 'orderedList', content: items });
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && (lines[i] ?? '').trim() && !/^(#{1,6}\s|[-*]\s|\d+\.\s)/.test(lines[i] ?? '')) {
      para.push(lines[i] ?? '');
      i++;
    }
    if (para.length) blocks.push({ type: 'paragraph', content: [{ type: 'text', text: para.join(' ') }] });
  }
  return { type: 'doc', version: 1, content: blocks.length ? blocks : [{ type: 'paragraph' }] };
}

/** Turn literal escape sequences (backslash-n etc.) into real characters. */
function unescape(s) {
  return s.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n').replace(/\\t/g, '\t');
}

function isSingleHeadingDoc(adf) {
  return (
    adf &&
    adf.type === 'doc' &&
    Array.isArray(adf.content) &&
    adf.content.length === 1 &&
    adf.content[0]?.type === 'heading'
  );
}

async function main() {
  console.log(`\nMode: ${APPLY ? 'APPLY (will write)' : 'DRY RUN (no writes)'}\n`);

  // Pull candidates. RPC-free: fetch the narrow set and filter client-side
  // so the shape check lives in one place.
  const { data, error } = await db
    .from('ph_issues')
    .select('issue_key, description_adf')
    .not('description_adf', 'is', null);
  if (error) { console.error('Query failed:', error.message); process.exit(1); }

  const targets = (data ?? []).filter((r) => isSingleHeadingDoc(r.description_adf));
  console.log(`Candidate single-heading docs: ${targets.length}\n`);

  let changed = 0;
  for (const row of targets) {
    const node = row.description_adf.content[0];
    const raw = (node.content ?? []).map((c) => c.text ?? '').join('');
    const md = unescape(raw);
    const rebuilt = markdownToAdf(md);

    // Skip if the parse would still collapse to a single heading (nothing gained).
    if (isSingleHeadingDoc(rebuilt)) {
      console.log(`SKIP  ${row.issue_key} — parse produced no block split`);
      continue;
    }

    changed++;
    const preview = rebuilt.content
      .map((b) => `${b.type}${b.attrs?.level ? ` h${b.attrs.level}` : ''}`)
      .slice(0, 8)
      .join(' · ');
    console.log(`FIX   ${row.issue_key} — ${row.description_adf.content[0].attrs?.level ? 'h' + row.description_adf.content[0].attrs.level : 'heading'} → [${rebuilt.content.length} blocks] ${preview}`);

    if (APPLY) {
      const { error: upErr } = await db
        .from('ph_issues')
        .update({ description_adf: rebuilt })
        .eq('issue_key', row.issue_key);
      if (upErr) console.error(`  ! write failed for ${row.issue_key}: ${upErr.message}`);
    }
  }

  console.log(`\n${APPLY ? 'Wrote' : 'Would write'} ${changed} row(s).`);
  if (!APPLY && changed) console.log('Re-run with --apply to commit.\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
