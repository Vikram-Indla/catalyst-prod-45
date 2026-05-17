/**
 * scan-ads-violations.ts — Detect live ADS-compliance defects in Catalyst.
 *
 * Authored: 2026-05-17 (preflight Step 9).
 *
 * Output: src/registry/ads-violations.generated.ts (git-tracked).
 *
 * Run:
 *   npm run scan:ads-violations
 *
 * Categories scanned (v1):
 *   - hand-rolled-dropdown — useState(menuOpen|dropdownOpen|showMenu|...)
 *     combined with a mousedown / outside-click listener — pattern banned by
 *     CLAUDE.md 2026-05-10 in favour of @atlaskit/dropdown-menu.
 *   - banned-import — imports of components Vikram banned (MDT, ServiceNow,
 *     Assessment, etc.). Zero today; defends against regression.
 *   - deprecated-shim — imports from files marked deprecated in the registry
 *     (e.g. components/WorkItemIcon shim, dynamic-table).
 *   - lozenge-duplicate — imports from non-canonical Lozenge paths when
 *     @atlaskit/lozenge is the canonical primitive.
 *
 * Raw-hex literal scan deferred to v2 (needs allowlist for legitimate
 * Jira-parity overrides per CLAUDE.md 2026-05-05).
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const SRC_ROOT = resolve(REPO_ROOT, 'src');
const OUTPUT_PATH = resolve(SRC_ROOT, 'registry/ads-violations.generated.ts');

type Category =
  | 'hand-rolled-dropdown'
  | 'banned-import'
  | 'deprecated-shim'
  | 'lozenge-duplicate';
type Severity = 'P0' | 'P1' | 'P2';

interface Violation {
  id: string;
  category: Category;
  severity: Severity;
  file: string;
  line: number;
  excerpt: string;
  rule: string;
  suggestion: string;
  claudeAnchor?: string;
}

// ─── File walking ───────────────────────────────────────────────────────────

function* walkFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '__tests__' || name.startsWith('.')) continue;
    if (name === 'registry') continue; // generated files
    const full = join(dir, name);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      yield* walkFiles(full);
    } else if (/\.tsx?$/.test(name) && !/\.(test|spec|d)\.tsx?$/.test(name)) {
      yield full;
    }
  }
}

// ─── Hand-rolled dropdown detection ─────────────────────────────────────────

// Menu-shaped state names — broad enough to catch contextMenu / popover variants.
const DROPDOWN_STATE_RE =
  /useState[^=]*?\b([A-Za-z_$][\w$]*(?:Menu|Dropdown|Popover|ContextMenu|Submenu|SubMenu)[\w$]*)\b/;
const OUTSIDE_CLICK_RE =
  /addEventListener\(\s*['"](?:mousedown|click)['"]/;
// Skip files that already use the canonical primitive correctly — those are
// false positives (e.g. a wrapper that uses @atlaskit/dropdown-menu AND has
// a separate popover state for unrelated reasons).
const CANONICAL_USE_RE = /from\s+['"]@atlaskit\/dropdown-menu['"]/;

function detectHandRolledDropdowns(file: string, src: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  if (CANONICAL_USE_RE.test(src)) return violations;
  if (!OUTSIDE_CLICK_RE.test(src)) return violations;
  if (!DROPDOWN_STATE_RE.test(src)) return violations;

  // Find the first line that matches the menu-state pattern — most informative.
  for (let i = 0; i < lines.length; i++) {
    if (DROPDOWN_STATE_RE.test(lines[i])) {
      violations.push({
        id: `dropdown:${file}:${i + 1}`,
        category: 'hand-rolled-dropdown',
        severity: 'P0',
        file,
        line: i + 1,
        excerpt: lines[i].trim().slice(0, 200),
        rule:
          'Hand-rolled menu/popover state combined with an outside-click listener (mousedown or capture-phase click).',
        suggestion:
          'Replace with @atlaskit/dropdown-menu (DropdownMenu + DropdownItem + DropdownItemGroup). See CLAUDE.md 2026-05-10.',
        claudeAnchor: '2026-05-10',
      });
      break;
    }
  }
  return violations;
}

// ─── Banned-import detection ────────────────────────────────────────────────

const BANNED_IMPORT_PATTERNS: Array<{ re: RegExp; rule: string; anchor: string }> = [
  {
    re: /import[^;]*?(CatalystMdtRefField|MdtRefField)[^;]*?from/,
    rule: 'MDT Ref field is permanently banned.',
    anchor: '2026-05-05',
  },
  {
    re: /import[^;]*?(CatalystServiceNowDisplay|ServiceNowNumber)[^;]*?from/,
    rule: 'Service Now# field is permanently banned.',
    anchor: '2026-05-07',
  },
  {
    re: /import[^;]*?(CatalystAssessmentFeatureField|AssessmentFeatureField)[^;]*?from/,
    rule: 'Assessment Feature field is permanently banned.',
    anchor: '2026-05-07',
  },
  {
    re: /import[^;]*?\bDevelopmentSection\b[^;]*?from/,
    rule: 'Development section (Jira branches/PRs/commits) is permanently banned.',
    anchor: '2026-05-06',
  },
  {
    re: /import[^;]*?\bAutomationSection\b[^;]*?from/,
    rule: 'Automation section + ⚡ Automate button are permanently banned.',
    anchor: '2026-05-06',
  },
];

function detectBannedImports(file: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of BANNED_IMPORT_PATTERNS) {
      if (pattern.re.test(line)) {
        violations.push({
          id: `banned:${file}:${i + 1}`,
          category: 'banned-import',
          severity: 'P0',
          file,
          line: i + 1,
          excerpt: line.trim().slice(0, 200),
          rule: pattern.rule,
          suggestion: `REMOVE this import. See CLAUDE.md ${pattern.anchor}.`,
          claudeAnchor: pattern.anchor,
        });
      }
    }
  }
  return violations;
}

// ─── Deprecated shim detection ──────────────────────────────────────────────

const DEPRECATED_IMPORT_PATTERNS: Array<{ re: RegExp; target: string; rule: string }> = [
  {
    re: /import[^;]*?\bWorkItemIcon\b[^;]*?from\s+['"]@\/components\/(WorkItemIcon|workItemIcon)['"]/,
    target: 'JiraIssueTypeIcon (@/lib/jira-issue-type-icons)',
    rule: 'Importing the deprecated WorkItemIcon shim.',
  },
  {
    re: /import[^;]*?from\s+['"]@\/components\/shared\/dynamic-table['"]/,
    target: 'JiraTable (@/components/shared/JiraTable)',
    rule: 'Importing the deprecated dynamic-table.',
  },
];

function detectDeprecatedShims(file: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of DEPRECATED_IMPORT_PATTERNS) {
      if (pattern.re.test(lines[i])) {
        violations.push({
          id: `deprecated:${file}:${i + 1}`,
          category: 'deprecated-shim',
          severity: 'P1',
          file,
          line: i + 1,
          excerpt: lines[i].trim().slice(0, 200),
          rule: pattern.rule,
          suggestion: `Migrate to ${pattern.target}.`,
        });
      }
    }
  }
  return violations;
}

// ─── Lozenge duplication detection ──────────────────────────────────────────

// Canonical: @atlaskit/lozenge. Duplicates: any local Lozenge.tsx import.
const LOZENGE_DUPLICATE_RE = /import[^;]*?\bLozenge\b[^;]*?from\s+['"](?!@atlaskit\/)[^'"]*Lozenge['"]/;

function detectLozengeDuplicates(file: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (LOZENGE_DUPLICATE_RE.test(lines[i])) {
      violations.push({
        id: `lozenge:${file}:${i + 1}`,
        category: 'lozenge-duplicate',
        severity: 'P2',
        file,
        line: i + 1,
        excerpt: lines[i].trim().slice(0, 200),
        rule: 'Importing a Lozenge from a non-canonical path.',
        suggestion: 'Import from @atlaskit/lozenge (canonical primitive).',
      });
    }
  }
  return violations;
}

// ─── Main scan ──────────────────────────────────────────────────────────────

function scan(): Violation[] {
  const all: Violation[] = [];

  for (const fullPath of walkFiles(SRC_ROOT)) {
    let src: string;
    try {
      src = readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }
    const lines = src.split('\n');
    const rel = relative(REPO_ROOT, fullPath).replace(/\\/g, '/');

    all.push(...detectHandRolledDropdowns(rel, src, lines));
    all.push(...detectBannedImports(rel, lines));
    all.push(...detectDeprecatedShims(rel, lines));
    all.push(...detectLozengeDuplicates(rel, lines));
  }

  all.sort((a, b) => {
    const sevOrder = { P0: 0, P1: 1, P2: 2 };
    if (sevOrder[a.severity] !== sevOrder[b.severity]) {
      return sevOrder[a.severity] - sevOrder[b.severity];
    }
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    return a.line - b.line;
  });
  return all;
}

// ─── Emit ────────────────────────────────────────────────────────────────────

function emit(violations: Violation[]): string {
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = { P0: 0, P1: 0, P2: 0 };
  for (const v of violations) {
    byCategory[v.category] = (byCategory[v.category] ?? 0) + 1;
    bySeverity[v.severity] += 1;
  }

  return `/**
 * ads-violations.generated.ts — AUTO-GENERATED by scripts/scan-ads-violations.ts.
 *
 * Do NOT edit by hand. Run \`npm run scan:ads-violations\` to regenerate
 * after fixing or introducing a violation.
 *
 * Captured: ${new Date().toISOString()}
 * Total: ${violations.length} (P0: ${bySeverity.P0}, P1: ${bySeverity.P1}, P2: ${bySeverity.P2})
 */

export type AdsViolationCategory =
  | 'hand-rolled-dropdown'
  | 'banned-import'
  | 'deprecated-shim'
  | 'lozenge-duplicate';

export type AdsViolationSeverity = 'P0' | 'P1' | 'P2';

export interface AdsViolation {
  id: string;
  category: AdsViolationCategory;
  severity: AdsViolationSeverity;
  /** Repo-relative file path. */
  file: string;
  line: number;
  /** Single-line excerpt of the offending source. */
  excerpt: string;
  /** Human-readable rule statement. */
  rule: string;
  /** Suggested fix. */
  suggestion: string;
  /** CLAUDE.md lesson date the rule traces back to. */
  claudeAnchor?: string;
}

export const adsViolations: AdsViolation[] = ${JSON.stringify(violations, null, 2)};

export const adsViolationsStats = {
  total: ${violations.length},
  byCategory: ${JSON.stringify(byCategory)},
  bySeverity: ${JSON.stringify(bySeverity)},
  generatedAt: '${new Date().toISOString()}',
};
`;
}

const violations = scan();
writeFileSync(OUTPUT_PATH, emit(violations), 'utf8');
// eslint-disable-next-line no-console
console.log(
  `[scan-ads-violations] wrote ${OUTPUT_PATH}\n  ${violations.length} violations (P0: ${
    violations.filter(v => v.severity === 'P0').length
  }, P1: ${violations.filter(v => v.severity === 'P1').length}, P2: ${
    violations.filter(v => v.severity === 'P2').length
  })`,
);
