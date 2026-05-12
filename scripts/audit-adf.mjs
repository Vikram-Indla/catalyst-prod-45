#!/usr/bin/env node
/**
 * audit-adf — counts which "advanced" ADF node types live in real
 * description_adf blobs across ph_issues.
 *
 * Why: before we drop @atlaskit/editor-core plugins (allowExpand,
 * allowLayouts, etc.) from EpicDescriptionEditor.tsx for a perf win, we
 * must verify no live ticket actually contains those nodes. Schema
 * dropping them silently strips them on the next save → content loss.
 *
 * Reads VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY from .env,
 * pages through ph_issues with the publishable key (subject to RLS so
 * counts are a lower bound on what the audited user can see — still
 * useful: zero-hit on the visible subset is a strong "safe to drop"
 * signal).
 *
 * Run:  node scripts/audit-adf.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

// Tiny .env parser — avoids pulling dotenv in just for a one-shot script.
function loadEnv() {
  const text = readFileSync(join(root, '.env'), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

// Node types we'd potentially drop from the editor schema. Keys map 1:1
// to the `allow*` flags in EpicDescriptionEditor.tsx.
const NODE_TYPES = {
  taskList:       { plugin: 'allowTasksAndDecisions' },
  taskItem:       { plugin: 'allowTasksAndDecisions' },
  decisionList:   { plugin: 'allowTasksAndDecisions' },
  decisionItem:   { plugin: 'allowTasksAndDecisions' },
  status:         { plugin: 'allowStatus' },
  date:           { plugin: 'allowDate' },
  expand:         { plugin: 'allowExpand' },
  nestedExpand:   { plugin: 'allowExpand' },
  layoutSection:  { plugin: 'allowLayouts' },
  layoutColumn:   { plugin: 'allowLayouts' },
};

const counts = Object.fromEntries(
  Object.keys(NODE_TYPES).map(k => [k, { tickets: 0, nodes: 0 }])
);
let breakoutTickets = 0;
let breakoutNodes = 0;
let totalRows = 0;
let rowsWithDesc = 0;

function walk(node, perTicket) {
  if (!node || typeof node !== 'object') return;
  const t = node.type;
  if (typeof t === 'string' && counts[t]) {
    counts[t].nodes += 1;
    perTicket.add(t);
  }
  // Breakout shows up as a mark on certain block nodes
  if (Array.isArray(node.marks)) {
    for (const m of node.marks) {
      if (m?.type === 'breakout') {
        breakoutNodes += 1;
        perTicket.add('__breakout__');
      }
    }
  }
  // Some Atlaskit shapes encode breakout as attrs.layout = wide / full-width
  if (node.attrs && (node.attrs.layout === 'wide' || node.attrs.layout === 'full-width')) {
    breakoutNodes += 1;
    perTicket.add('__breakout__');
  }
  if (Array.isArray(node.content)) node.content.forEach(c => walk(c, perTicket));
}

async function fetchPage(offset, limit) {
  const url = `${SUPABASE_URL}/rest/v1/ph_issues?select=description_adf&description_adf=not.is.null&offset=${offset}&limit=${limit}`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Range: `${offset}-${offset + limit - 1}`,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${res.status}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log(`Connecting to ${SUPABASE_URL}…`);
  const PAGE = 500;
  let offset = 0;

  for (;;) {
    const rows = await fetchPage(offset, PAGE);
    if (!Array.isArray(rows) || rows.length === 0) break;
    totalRows += rows.length;

    for (const row of rows) {
      const adf = row.description_adf;
      if (!adf) continue;
      rowsWithDesc += 1;
      const perTicket = new Set();
      walk(adf, perTicket);
      for (const t of perTicket) {
        if (t === '__breakout__') {
          breakoutTickets += 1;
          continue;
        }
        if (counts[t]) counts[t].tickets += 1;
      }
    }

    if (rows.length < PAGE) break;
    offset += PAGE;
  }

  console.log('');
  console.log(`Scanned ${totalRows} ph_issues rows (${rowsWithDesc} have description_adf).`);
  console.log('');
  console.log('Per node type:');
  console.log(' tickets │ nodes │ node type        │ plugin to drop if 0');
  console.log('─────────┼───────┼──────────────────┼─────────────────────');
  for (const [type, info] of Object.entries(NODE_TYPES)) {
    const c = counts[type];
    const verdict = c.tickets === 0 ? '✂️  drop ' + info.plugin : '⚠️  KEEP ' + info.plugin;
    console.log(
      ' ' + String(c.tickets).padStart(7) +
      ' │ ' + String(c.nodes).padStart(5) +
      ' │ ' + type.padEnd(16) +
      ' │ ' + verdict
    );
  }
  console.log(
    ' ' + String(breakoutTickets).padStart(7) +
    ' │ ' + String(breakoutNodes).padStart(5) +
    ' │ ' + 'breakout (mark) '.padEnd(16) +
    ' │ ' + (breakoutTickets === 0 ? '✂️  drop allowBreakout' : '⚠️  KEEP allowBreakout')
  );
  console.log('');

  // Plugin verdict summary (de-duped)
  const pluginVerdicts = new Map();
  for (const [type, info] of Object.entries(NODE_TYPES)) {
    const used = counts[type].tickets > 0;
    const prev = pluginVerdicts.get(info.plugin);
    pluginVerdicts.set(info.plugin, prev || used);
  }
  pluginVerdicts.set('allowBreakout', breakoutTickets > 0);

  console.log('Plugin verdicts:');
  for (const [plugin, used] of pluginVerdicts) {
    console.log(`  ${used ? '⚠️  KEEP' : '✂️  drop'}  ${plugin}`);
  }
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
