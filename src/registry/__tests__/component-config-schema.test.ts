/**
 * component_config schema contract test (2026-05-17, PR-1 Step 2).
 *
 * Validates the migration shape via static check on the migration file. Live
 * RLS / DDL applied via Supabase MCP `apply_migration` separately — that's a
 * runtime gate, not unit-testable in Vitest. Here we assert:
 *   - migration file exists at expected path
 *   - CREATE TABLE component_config with required columns
 *   - CREATE TABLE component_config_history with required columns
 *   - RLS policies enabled on both tables
 *   - History trigger writes audit rows on INSERT/UPDATE/DELETE of component_config
 *
 * RED until the migration is written.
 */
import { readFileSync, existsSync } from 'node:fs';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const MIGRATIONS_DIR = resolve(__dirname, '..', '..', '..', 'supabase', 'migrations');

function findMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter(f => f.includes('component_config'))
    .sort()
    .map(f => resolve(MIGRATIONS_DIR, f));
}

/**
 * Concatenated SQL of every migration touching `component_config*`. Lets
 * contract checks assert across the full migration chain rather than the
 * single-most-recent file — so a v3+ ALTER migration doesn't break a v2
 * CREATE-TABLE invariant assertion. Each migration adds, never removes.
 */
function concatenatedSql(): string {
  return findMigrationFiles().map(f => readFileSync(f, 'utf8')).join('\n');
}

function findMigration(): string | null {
  const files = findMigrationFiles();
  return files.length > 0 ? files[0] : null;
}

describe('component_config migration — contract', () => {
  it('migration file exists', () => {
    const file = findMigration();
    expect(file, 'no migration matching *component_config* under supabase/migrations/').toBeTruthy();
    expect(existsSync(file!)).toBe(true);
  });

  it('declares component_config table with required columns', () => {
    const sql = concatenatedSql();
    expect(sql).toMatch(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?component_config/i);
    expect(sql).toMatch(/component_id\s+TEXT\s+(?:NOT NULL\s+)?(?:UNIQUE|PRIMARY KEY)/i);
    expect(sql).toMatch(/active_version\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/feature_flags\s+JSONB/i);
    expect(sql).toMatch(/applied_at\s+TIMESTAMP/i);
    expect(sql).toMatch(/applied_by\s+UUID/i);
  });

  it('declares component_config_history table with required columns', () => {
    const sql = concatenatedSql();
    expect(sql).toMatch(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(?:public\.)?component_config_history/i);
    expect(sql).toMatch(/action\s+TEXT\s+NOT NULL/i);
    expect(sql).toMatch(/CHECK\s*\(\s*action\s+IN/i);
  });

  it('enables RLS on both tables (CLAUDE.md mandate — RLS in same migration as DDL)', () => {
    const sql = concatenatedSql();
    expect(sql).toMatch(/ALTER TABLE\s+(?:public\.)?component_config\s+ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/ALTER TABLE\s+(?:public\.)?component_config_history\s+ENABLE ROW LEVEL SECURITY/i);
  });

  it('declares CREATE POLICY for admin SELECT + INSERT + UPDATE on component_config', () => {
    const sql = concatenatedSql();
    expect(sql).toMatch(/CREATE POLICY[^;]*?ON\s+(?:public\.)?component_config[^;]*?FOR\s+SELECT/is);
    expect(sql).toMatch(/CREATE POLICY[^;]*?ON\s+(?:public\.)?component_config[^;]*?FOR\s+(INSERT|ALL)/is);
  });

  it('declares history trigger on component_config writes', () => {
    const sql = concatenatedSql();
    expect(sql).toMatch(/CREATE OR REPLACE FUNCTION[^;]*?component_config_history/is);
    expect(sql).toMatch(/CREATE TRIGGER[^;]*?ON\s+(?:public\.)?component_config/is);
  });
});
