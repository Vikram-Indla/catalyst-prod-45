import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../..');
const migrationsDir = resolve(repoRoot, 'supabase/migrations');

function findMigrationByPattern(pattern: RegExp): string | null {
  const files = readdirSync(migrationsDir).sort();
  for (const f of files) {
    if (pattern.test(f)) return resolve(migrationsDir, f);
  }
  return null;
}

function getPresenceMigrationSql(): string {
  const path = findMigrationByPattern(/presence_availability/);
  if (!path) throw new Error('No migration file matching *presence_availability* found');
  return readFileSync(path, 'utf8');
}

describe('Phase 1 — presence & availability migration', () => {
  it('migration file exists', () => {
    expect(findMigrationByPattern(/presence_availability/)).not.toBeNull();
  });

  it('creates user_presence table with correct columns', () => {
    const sql = getPresenceMigrationSql();
    expect(sql).toMatch(/CREATE TABLE.*user_presence/s);
    expect(sql).toMatch(/last_seen_at/);
    expect(sql).toMatch(/available|away|busy|offline|on_leave/);
  });

  it('user_presence has REPLICA IDENTITY FULL', () => {
    expect(getPresenceMigrationSql()).toMatch(/REPLICA IDENTITY FULL/);
  });

  it('creates user_availability with leave columns', () => {
    const sql = getPresenceMigrationSql();
    expect(sql).toMatch(/CREATE TABLE.*user_availability/s);
    expect(sql).toMatch(/vacation|public_holiday|sick|ooo/i);
    expect(sql).toMatch(/starts_at/);
    expect(sql).toMatch(/ends_at/);
    expect(sql).toMatch(/backup_user_id/);
  });

  it('creates v_user_effective_status view with back_on', () => {
    const sql = getPresenceMigrationSql();
    expect(sql).toMatch(/CREATE.*VIEW.*v_user_effective_status/s);
    expect(sql).toMatch(/on_leave/);
    expect(sql).toMatch(/back_on|ends_at.*\+ interval/i);
  });

  it('creates shared_user_ids function unioning project+product', () => {
    const sql = getPresenceMigrationSql();
    expect(sql).toMatch(/CREATE.*FUNCTION.*shared_user_ids/s);
    expect(sql).toMatch(/UNION/i);
    expect(sql).toMatch(/ph_issues|project_members/);
    expect(sql).toMatch(/business_requests/);
  });

  it('enables RLS on both tables with shared_user_ids, no jwt role check', () => {
    const sql = getPresenceMigrationSql();
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/shared_user_ids/);
    expect(sql).not.toMatch(/auth\.jwt\(\).*role/);
    expect(sql).toMatch(/auth\.uid\(\)/);
  });

  it('creates clean_stale_presence fn sweeping offline after 5 min', () => {
    const sql = getPresenceMigrationSql();
    expect(sql).toMatch(/clean_stale_presence/);
    expect(sql).toMatch(/offline/);
    expect(sql).toMatch(/5 minute|5.*minute/i);
  });

  it('seeds presence_availability feature flag', () => {
    expect(getPresenceMigrationSql()).toMatch(/presence_availability/);
  });
});
