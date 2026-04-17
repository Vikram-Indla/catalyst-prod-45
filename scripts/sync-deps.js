#!/usr/bin/env node
/**
 * sync-deps — ensures node_modules matches package.json before we run anything
 * that imports from it (dev server, tests, etc).
 *
 * WHY THIS EXISTS
 * ───────────────
 * Progressive Atlaskit migration means package.json gains a new @atlaskit/*
 * entry every time we adopt a primitive. Each addition breaks the next
 * developer (or the next Claude session) who pulls the branch without
 * remembering to run `bun install`. Vite then errors with:
 *
 *   [plugin:vite:import-analysis] Failed to resolve import "@atlaskit/xyz"
 *
 * This script removes the human step. We compare the hash of package.json +
 * the lockfiles against the last-synced hash recorded in
 * node_modules/.catalyst-sync-hash. If they differ, we install; otherwise
 * we exit immediately (zero I/O, ~10 ms).
 *
 * Runs `bun install` when bun is available, else `npm install`. Falls through
 * to `npm install` with the public registry if bun hits a registry 403
 * (as the Lovable sandbox proxy sometimes does).
 *
 * SAFETY
 * ──────
 * - Non-destructive: never deletes node_modules.
 * - Silent on the happy path (nothing to do).
 * - Never fails the caller — if install can't run (offline, broken
 *   registry), we log a WARN and continue so `vite` can still try to
 *   start. Vite's own error overlay is clearer than whatever we'd print.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const HASH_PATH = join(root, 'node_modules', '.catalyst-sync-hash');

// Files that determine whether node_modules is fresh.
const WATCH = ['package.json', 'bun.lock', 'bun.lockb', 'package-lock.json'];

function fingerprint() {
  const h = createHash('sha1');
  for (const f of WATCH) {
    const p = join(root, f);
    try {
      const st = statSync(p);
      h.update(f);
      h.update(String(st.size));
      h.update(String(st.mtimeMs | 0));
    } catch {
      // File absent — encode that too so a disappearing lockfile still bumps
      // the hash.
      h.update(f + ':absent');
    }
  }
  return h.digest('hex');
}

function lastSynced() {
  try {
    return readFileSync(HASH_PATH, 'utf8').trim();
  } catch {
    return null;
  }
}

function markSynced(fp) {
  try {
    mkdirSync(dirname(HASH_PATH), { recursive: true });
    writeFileSync(HASH_PATH, fp);
  } catch {
    // non-fatal
  }
}

function hasCmd(cmd) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [cmd], { stdio: 'ignore' });
  return r.status === 0;
}

function run(cmd, args) {
  console.log(`[sync-deps] ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: root });
  return r.status === 0;
}

function install() {
  // Prefer bun when the repo uses it AND bun is available.
  const hasBunLock = existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'));
  const bun = hasBunLock && hasCmd('bun');

  if (bun) {
    if (run('bun', ['install'])) return true;
    console.warn('[sync-deps] bun install failed; falling back to npm.');
  }

  // npm with explicit public registry — sidesteps sandbox proxies that 403
  // on some packages and pins behavior across dev environments.
  if (hasCmd('npm')) {
    if (run('npm', ['install', '--registry=https://registry.npmjs.org/', '--no-audit', '--no-fund'])) return true;
  }

  console.warn('[sync-deps] Could not install dependencies automatically. Run `bun install` or `npm install` manually.');
  return false;
}

// `--check` returns non-zero when install would be needed, without running it.
// Handy for CI / manual gates.
const checkOnly = process.argv.includes('--check');

const before = fingerprint();
const last = lastSynced();
const nodeModulesExists = existsSync(join(root, 'node_modules'));

if (before === last && nodeModulesExists) {
  // Fast path. Nothing to do.
  process.exit(0);
}

if (checkOnly) {
  console.log('[sync-deps] out of sync; would install');
  process.exit(1);
}

const ok = install();
if (ok) {
  // CRITICAL: compute the fingerprint AFTER install. bun/npm rewrite lockfile
  // mtimes (even when content is unchanged), so hashing BEFORE install would
  // loop-install on every run.
  markSynced(fingerprint());
}
// Exit 0 even on install failure so the caller (vite, tests) still runs and
// surfaces its own error. We already warned.
process.exit(0);
