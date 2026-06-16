#!/usr/bin/env node
/**
 * Target Schema Pre-Check  (C4)
 *
 * Prevents the silent-empty-render trap: code that reads `row.target_field`
 * where the column does not exist on the target table (CLAUDE.md Assumption
 * Class 2). Run this BEFORE generating any data-binding/adapter code.
 *
 * A standalone node script cannot portably reach Supabase (RLS/PostgREST does
 * not expose information_schema, and credentials vary). So this script does NOT
 * fake a connection. It GENERATES the exact verification SQL from your target
 * column list. Run that SQL via the Supabase MCP `execute_sql`. Any row it
 * returns is a MISSING column — stop and fix the mapping before writing code.
 *
 * Input: either --columns a,b,c  OR  --mapping <file.json> with shape
 *   { "table": "business_requests", "columns": ["id","summary","status", ...] }
 *
 * Usage:
 *   node .../schema-check.mjs --table business_requests --columns id,summary,status,owner_id
 *   node .../schema-check.mjs --mapping .field-mapping.json
 */
import fs from "fs";

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      a[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let table = args.table;
  let columns = [];

  if (args.mapping) {
    const m = JSON.parse(fs.readFileSync(args.mapping, "utf8"));
    table = table || m.table;
    columns = m.columns || [];
  }
  if (args.columns) columns = args.columns.split(",").map((s) => s.trim()).filter(Boolean);

  if (!table || !columns.length) {
    console.error("Usage: schema-check.mjs --table <t> --columns a,b,c  |  --mapping <file.json>");
    process.exit(1);
  }

  // dedupe, basic identifier sanity
  const bad = columns.filter((c) => !/^[a-z_][a-z0-9_]*$/i.test(c));
  if (bad.length) {
    console.error(`Suspicious column names (expected snake_case identifiers): ${bad.join(", ")}`);
    console.error("Raw Supabase rows are snake_case (CLAUDE.md Assumption Class 4). Check your mapping.");
  }
  const cols = [...new Set(columns)];
  const valuesList = cols.map((c) => `('${c.replace(/'/g, "''")}')`).join(", ");

  const sql = `-- Run via Supabase MCP execute_sql. Any returned row = MISSING column = STOP.
WITH expected(col) AS ( VALUES ${valuesList} )
SELECT e.col AS missing_column
FROM expected e
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = '${table.replace(/'/g, "''")}'
    AND c.column_name = e.col
)
ORDER BY e.col;`;

  console.log("TARGET SCHEMA PRE-CHECK");
  console.log(`Table: public.${table}   Columns to verify: ${cols.length}`);
  console.log("─".repeat(72));
  console.log("Run this via Supabase MCP execute_sql:\n");
  console.log(sql);
  console.log("\n─".repeat(1) + "─".repeat(71));
  console.log("PASS condition: 0 rows returned.");
  console.log("FAIL: any row = a column your adapter references does not exist.");
  console.log("      Do NOT write `row.<missing>` — fix the mapping or add a migration first.");
}

main();
