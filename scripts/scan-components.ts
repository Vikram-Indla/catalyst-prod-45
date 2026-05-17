/**
 * scan-components.ts — Auto-discover every component currently rendered in Catalyst.
 *
 * Authored: 2026-05-17 (preflight Step 5).
 *
 * Walks every .tsx / .ts file under src/, extracts import statements, and
 * builds a usage map:
 *
 *   { ComponentName: { origin: 'atlaskit'|'internal', consumers: string[], package?: string } }
 *
 * Output: src/registry/usage-map.generated.ts (git-tracked).
 *
 * Run:
 *   npx tsx scripts/scan-components.ts
 *
 * Scope (per preflight Q2 = "Everything rendered, Atlaskit + internal"):
 *   - @atlaskit/* package imports → origin='atlaskit'
 *   - @/, @/components, @/lib, relative imports → origin='internal'
 *   - node_modules direct imports (react, lodash, etc.) → SKIPPED
 *   - type-only imports (import type ...) → SKIPPED (not rendered)
 *   - __tests__ directories → SKIPPED (not user-facing renders)
 *
 * The generated file is consumed at runtime by /admin/components and at
 * build time by the cascade-impact view (Step 12).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const SRC_ROOT = resolve(REPO_ROOT, 'src');
const OUTPUT_PATH = resolve(SRC_ROOT, 'registry/usage-map.generated.ts');

interface UsageEntry {
  name: string;
  source: string;
  origin: 'atlaskit' | 'internal';
  consumers: string[];
  package?: string;
}

type UsageMap = Record<string, UsageEntry>;

/**
 * Map key — guarantees uniqueness when the same identifier (e.g. `Button`) is
 * exported from multiple sources (e.g. @atlaskit/button + @/components/ui/button).
 * The /admin/components UI groups by `entry.name` for display.
 */
function entryKey(name: string, source: string): string {
  return `${name}::${source}`;
}

// ─── File walking ────────────────────────────────────────────────────────────

function* walkFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      yield* walkFiles(full);
    } else if (/\.(tsx|ts)$/.test(name) && !/\.(test|spec|d)\.tsx?$/.test(name)) {
      yield full;
    }
  }
}

// ─── Import extraction ──────────────────────────────────────────────────────

/**
 * Matches:
 *   import Foo from 'pkg'
 *   import { Bar, Baz } from 'pkg'
 *   import Foo, { Bar } from 'pkg'
 *   import { Bar as Qux } from 'pkg'
 * Skips:
 *   import type { ... } from 'pkg'
 *   import 'pkg'  (side effect)
 */
const IMPORT_RE = /^import\s+(?!type\s)([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/gm;

interface ParsedImport {
  names: string[];
  source: string;
}

function parseImports(src: string): ParsedImport[] {
  const results: ParsedImport[] = [];
  let m: RegExpExecArray | null;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) {
    const clause = m[1].trim();
    const source = m[2];
    const names: string[] = [];

    // Default import: starts with identifier, optional ", { ... }"
    const defaultMatch = clause.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
    if (defaultMatch) names.push(defaultMatch[1]);

    // Named imports: { Foo, Bar as Baz, ... }
    const namedMatch = clause.match(/\{([\s\S]*?)\}/);
    if (namedMatch) {
      for (const part of namedMatch[1].split(',')) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        // 'Foo as Bar' → use the local alias (Bar)
        const aliasMatch = trimmed.match(/^[A-Za-z_$][\w$]*\s+as\s+([A-Za-z_$][\w$]*)/);
        if (aliasMatch) {
          names.push(aliasMatch[1]);
        } else {
          const nameMatch = trimmed.match(/^([A-Za-z_$][\w$]*)/);
          if (nameMatch) names.push(nameMatch[1]);
        }
      }
    }

    if (names.length > 0) {
      results.push({ names, source });
    }
  }
  return results;
}

// ─── Source classification ──────────────────────────────────────────────────

function classify(source: string): { origin: 'atlaskit' | 'internal' | 'skip'; pkg?: string } {
  if (source.startsWith('@atlaskit/')) {
    // @atlaskit/button/new → @atlaskit/button (use base package)
    const pkg = source.split('/').slice(0, 2).join('/');
    return { origin: 'atlaskit', pkg };
  }
  if (source.startsWith('@/') || source.startsWith('./') || source.startsWith('../')) {
    return { origin: 'internal' };
  }
  // Anything else (react, lodash, react-router-dom, etc.) is not in scope.
  return { origin: 'skip' };
}

// Identifiers that aren't components (constants, types, hooks, utilities).
// Components conventionally start with a capital letter; we use that as the
// primary filter and exclude common false positives below.
const NON_COMPONENT_NAMES = new Set<string>([
  // React + framework
  'React', 'Fragment', 'Suspense', 'StrictMode', 'Children',
  // Common type aliases
  'FC', 'Props', 'State', 'Dispatch', 'SetStateAction', 'ReactNode', 'ReactElement', 'CSSProperties',
  // Common util names
  'cn', 'clsx', 'classNames',
]);

function isLikelyComponent(name: string): boolean {
  if (!/^[A-Z]/.test(name)) return false;
  if (NON_COMPONENT_NAMES.has(name)) return false;
  // ALL_CAPS_CONSTANTS — skip
  if (/^[A-Z][A-Z0-9_]+$/.test(name)) return false;
  return true;
}

// ─── Main scan ──────────────────────────────────────────────────────────────

function scan(): UsageMap {
  const map: UsageMap = {};

  for (const file of walkFiles(SRC_ROOT)) {
    let src: string;
    try {
      src = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const rel = relative(REPO_ROOT, file).replace(/\\/g, '/');

    for (const imp of parseImports(src)) {
      const cls = classify(imp.source);
      if (cls.origin === 'skip') continue;

      for (const name of imp.names) {
        if (!isLikelyComponent(name)) continue;
        const key = entryKey(name, imp.source);
        if (!map[key]) {
          map[key] = {
            name,
            source: imp.source,
            origin: cls.origin,
            consumers: [],
            ...(cls.pkg ? { package: cls.pkg } : {}),
          };
        }
        if (!map[key].consumers.includes(rel)) {
          map[key].consumers.push(rel);
        }
      }
    }
  }

  // Sort consumers per entry + sort entries alphabetically for stable diffs.
  for (const entry of Object.values(map)) {
    entry.consumers.sort();
  }
  return Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => a.localeCompare(b)),
  );
}

// ─── Output ──────────────────────────────────────────────────────────────────

function emit(map: UsageMap): string {
  const atlaskit = Object.values(map).filter(e => e.origin === 'atlaskit').length;
  const internal = Object.values(map).filter(e => e.origin === 'internal').length;
  const total = atlaskit + internal;

  const banner = `/**
 * usage-map.generated.ts — AUTO-GENERATED by scripts/scan-components.ts.
 *
 * Do NOT edit by hand. Run \`npx tsx scripts/scan-components.ts\` to regenerate
 * after changing any import in src/.
 *
 * Captured: ${new Date().toISOString()}
 * Stats: ${total} components observed (${atlaskit} atlaskit, ${internal} internal).
 */
`;

  const typeBlock = `
export interface UsageMapEntry {
  /** Display name (the imported identifier). */
  name: string;
  /** Original import source (e.g. '@atlaskit/button/new' or '@/components/ui/button'). */
  source: string;
  origin: 'atlaskit' | 'internal';
  /** Repo-relative paths of every file that imports this entry. */
  consumers: string[];
  /** For atlaskit: the base package id (e.g. '@atlaskit/button'). */
  package?: string;
}

export type UsageMap = Record<string, UsageMapEntry>;
`;

  const data = `\nexport const usageMap: UsageMap = ${JSON.stringify(map, null, 2)};\n`;

  const stats = `\nexport const usageMapStats = {
  total: ${total},
  atlaskit: ${atlaskit},
  internal: ${internal},
  generatedAt: '${new Date().toISOString()}',
};\n`;

  const helpers = `
/**
 * Return every UsageMapEntry variant that shares a display name.
 * Two variants can exist when the same identifier comes from different
 * sources (e.g. Atlaskit Button vs the shadcn-derived Button in
 * @/components/ui/button).
 */
export function getUsageByName(name: string): UsageMapEntry[] {
  return Object.values(usageMap).filter(e => e.name === name);
}

/**
 * Aggregate consumer list across every variant sharing a display name.
 * Used by /admin/components for cascade-impact rollups.
 */
export function getAllConsumersByName(name: string): string[] {
  const all = new Set<string>();
  for (const e of getUsageByName(name)) for (const c of e.consumers) all.add(c);
  return Array.from(all).sort();
}
`;

  return banner + typeBlock + data + stats + helpers;
}

const map = scan();
writeFileSync(OUTPUT_PATH, emit(map), 'utf8');
const atlaskit = Object.values(map).filter(e => e.origin === 'atlaskit').length;
const internal = Object.values(map).filter(e => e.origin === 'internal').length;
// eslint-disable-next-line no-console
console.log(
  `[scan-components] wrote ${OUTPUT_PATH}\n` +
  `  ${atlaskit} atlaskit + ${internal} internal = ${atlaskit + internal} total`,
);
