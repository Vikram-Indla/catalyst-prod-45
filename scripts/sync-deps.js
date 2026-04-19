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
import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
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

/**
 * Remove npm's "safe-remove" staging directories left behind by a crashed
 * install.
 *
 * npm atomically replaces a package by renaming the old copy to
 * `.<name>-<nanoid>` and then moving the new copy into place. If the
 * install is interrupted (Ctrl-C, OOM, sleep/wake, another npm crashing)
 * the `.<name>-<nanoid>` backup directory is stranded. The NEXT install
 * then fails with:
 *
 *   ENOTEMPTY: directory not empty, rename
 *     '.../node_modules/@atlaskit/editor-plugin-card'
 *   -> '.../node_modules/@atlaskit/.editor-plugin-card-nUJmVndO'
 *
 * because npm tries to rename to the same temp name and the destination
 * is already non-empty from the previous crash. Sweeping these before we
 * install unblocks the loop without needing a full `rm -rf node_modules`.
 *
 * Pattern: `.name-<8+ alnum>` at the top level of node_modules AND inside
 * any `@scope/` directory. We do NOT recurse deeper — npm's staging dirs
 * only appear at those two levels.
 */
function cleanStaleStagingDirs() {
  const nm = join(root, 'node_modules');
  if (!existsSync(nm)) return 0;
  // Matches npm staging: leading dot, a package name, dash, 8+ alphanumeric
  // (nanoid-style). Excludes legitimate dotdirs like `.bin`, `.cache`,
  // `.package-lock.json`, `.catalyst-sync-hash`.
  const stale = /^\..+-[A-Za-z0-9]{8,}$/;
  let removed = 0;
  const sweep = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (!stale.test(e.name)) continue;
      try {
        rmSync(join(dir, e.name), { recursive: true, force: true });
        removed++;
      } catch {
        // swallow — worst case, npm will error again and we surface it
      }
    }
  };
  sweep(nm);
  let topEntries;
  try {
    topEntries = readdirSync(nm, { withFileTypes: true });
  } catch {
    return removed;
  }
  for (const e of topEntries) {
    if (e.isDirectory() && e.name.startsWith('@')) sweep(join(nm, e.name));
  }
  return removed;
}

/**
 * Run a package manager quietly. We don't want npm's wall of deprecation
 * warnings flooding the terminal on every dev start, but we DO want real
 * errors surfaced. So:
 *  - stdout is captured and discarded on success
 *  - stderr is captured; on failure we print the tail (last ~25 lines)
 *  - we print our own one-line status before + after
 */
function runQuiet(cmd, args, label) {
  const start = Date.now();
  process.stderr.write(`[sync-deps] ${label}… `);
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  const secs = ((Date.now() - start) / 1000).toFixed(1);
  if (r.status === 0) {
    process.stderr.write(`done in ${secs}s\n`);
    return true;
  }
  process.stderr.write(`FAILED after ${secs}s\n`);
  const tail = (r.stderr || r.stdout || '').split('\n').filter(Boolean).slice(-25);
  if (tail.length) {
    process.stderr.write('[sync-deps] last output:\n');
    for (const line of tail) process.stderr.write(`  ${line}\n`);
  }
  return false;
}

function install() {
  // Prefer bun when the repo uses it AND bun is available.
  const hasBunLock = existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'));
  const bun = hasBunLock && hasCmd('bun');

  if (bun) {
    if (runQuiet('bun', ['install', '--silent'], 'bun install')) return true;
    process.stderr.write('[sync-deps] bun install failed; falling back to npm…\n');
  }

  // npm with explicit public registry — sidesteps sandbox proxies that 403
  // on some packages and pins behavior across dev environments. `--loglevel=error`
  // drops the uuid/rimraf/etc deprecation chorus; real errors still surface.
  if (hasCmd('npm')) {
    const swept = cleanStaleStagingDirs();
    if (swept > 0) {
      process.stderr.write(
        `[sync-deps] cleaned ${swept} stale staging dir${swept === 1 ? '' : 's'} from a prior crashed install\n`,
      );
    }
    const npmArgs = ['install', '--registry=https://registry.npmjs.org/', '--no-audit', '--no-fund', '--loglevel=error'];
    if (runQuiet('npm', npmArgs, 'npm install')) return true;
    // ENOTEMPTY retry: the first attempt can strand its own staging dirs when
    // it fails midway. Sweep again and try once more before giving up.
    const swept2 = cleanStaleStagingDirs();
    if (swept2 > 0) {
      process.stderr.write(
        `[sync-deps] cleaned ${swept2} staging dir${swept2 === 1 ? '' : 's'}; retrying npm install…\n`,
      );
      if (runQuiet('npm', npmArgs, 'npm install (retry)')) return true;
    }
  }

  process.stderr.write('[sync-deps] Could not install dependencies automatically. Run `bun install` or `npm install` manually.\n');
  return false;
}

// `--check` returns non-zero when install would be needed, without running it.
// Handy for CI / manual gates.
const checkOnly = process.argv.includes('--check');

const before = fingerprint();
const last = lastSynced();
const nodeModulesExists = existsSync(join(root, 'node_modules'));

// Verify the dev server entry point is actually installed. The hash file
// can lie: a prior crashed install, an editor file-sync glitch, or a manual
// `rm -rf node_modules/.bin` will leave the fingerprint marked "synced"
// while `vite` is gone. Without this check the caller hits
// `sh: vite: command not found` with zero signal from sync-deps.
const viteBinPath = join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vite.cmd' : 'vite',
);
const viteBinInstalled = existsSync(viteBinPath);

if (before === last && nodeModulesExists && viteBinInstalled) {
  // Fast path. Nothing to do.
  process.exit(0);
}

if (checkOnly) {
  console.log('[sync-deps] out of sync; would install');
  process.exit(1);
}

if (nodeModulesExists && !viteBinInstalled) {
  process.stderr.write(
    '[sync-deps] node_modules present but vite binary missing — reinstalling…\n',
  );
}

const ok = install();
if (ok) {
  // CRITICAL: compute the fingerprint AFTER install. bun/npm rewrite lockfile
  // mtimes (even when content is unchanged), so hashing BEFORE install would
  // loop-install on every run.
  markSynced(fingerprint());
  process.exit(0);
}

// Install failed. If vite's bin is present we let the caller run — a partial
// node_modules plus an offline registry shouldn't block dev. But if vite
// isn't even installed, running `&& vite` next produces a confusing
// `sh: vite: command not found` and hides the real cause. Fail loudly here.
if (!existsSync(viteBinPath)) {
  process.stderr.write(
    '[sync-deps] node_modules is incomplete (vite binary missing). Run `npm install` manually to see the full npm error, then retry `npm run dev`.\n',
  );
  process.exit(1);
}
process.exit(0);
