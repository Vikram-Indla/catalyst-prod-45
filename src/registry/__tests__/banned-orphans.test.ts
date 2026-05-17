/**
 * Banned-orphan-file CI linter — v3 candidate #7.
 *
 * Authored: 2026-05-17 (PR-5).
 *
 * Enforces the CLAUDE.md "permanently banned" list at test time so a future
 * PR can't silently re-introduce a banned UI surface. Each entry pairs a
 * pattern with the directive it enforces; failure messages cite the
 * directive so a dev can find the rationale fast.
 *
 * Each ban scopes to either:
 *   - 'jsx'   — banned in JSX (`<Component`). Caller files only — the file
 *                that DEFINES the component is allowed to keep existing
 *                (Vikram directive: keep legacy files, never render them).
 *   - 'import'— banned anywhere as an `import ... from '<path>'` (no module
 *                may re-import the deleted file).
 *
 * To extend: add an entry to BANS and rerun. The harness greps every
 * `.tsx` / `.ts` under src/ except __tests__ and the explicit allowlist.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const SRC = resolve(__dirname, '..', '..');

type BanScope = 'jsx' | 'import';

interface Ban {
  /** Display label in failure messages. */
  label: string;
  /** Pattern to grep for. */
  pattern: RegExp;
  /** Scope of the ban. */
  scope: BanScope;
  /** Why this exists — cited in failure. */
  directive: string;
  /** Files that are ALLOWED to contain the pattern (definition files, etc.). */
  allow?: string[];
}

const BANS: Ban[] = [
  {
    label: 'CatalystServiceNowDisplay JSX',
    pattern: /<CatalystServiceNowDisplay\b/,
    scope: 'jsx',
    directive:
      'CLAUDE.md 2026-05-07 — Service Now# permanently banned from ALL Catalyst views, every issue type, forever.',
    // The defining file is allowed to keep exporting the component.
    allow: ['components/catalyst-detail-views/shared/sections/CatalystReadOnlyCustomFields.tsx'],
  },
  {
    label: 'CatalystAssessmentFeatureField JSX',
    pattern: /<CatalystAssessmentFeatureField\b/,
    scope: 'jsx',
    directive:
      'CLAUDE.md 2026-05-07 — Assessment Feature permanently banned from ALL Catalyst views, every issue type, forever.',
    allow: ['components/catalyst-detail-views/shared/sections/CatalystAssessmentFeatureField.tsx'],
  },
  {
    label: 'EditableStoryPoints JSX',
    pattern: /<EditableStoryPoints\b/,
    scope: 'jsx',
    directive:
      'CLAUDE.md (CatalystSidebarDetails.tsx:422 GUARDRAIL) — Story Points field BANNED platform-wide. Do NOT re-add.',
    allow: [
      'modules/project-work-hub/components/dialogs/story-detail-modules/EditableFields.tsx',
    ],
  },
  {
    label: 'features/ask-ai import',
    pattern: /from\s+['"][^'"]*features\/ask-ai\b/,
    scope: 'import',
    directive:
      'CLAUDE.md 2026-05-11 — src/features/ask-ai/ mock module was removed 2026-04-01. NEVER restore. Use CatyAIPage / CatyFAB for AI affordances.',
  },
  {
    label: 'AI Sparkles inline button — onAiImprove prop on CatalystQuickActions',
    pattern: /CatalystQuickActions[^/]{0,400}?onAiImprove\s*=/s,
    scope: 'jsx',
    directive:
      'CLAUDE.md 2026-05-07 — AI Sparkles inline button permanently banned from CatalystQuickActions. ONLY AI improve entry point is ImproveIssueDropdown in the right rail.',
  },
  {
    label: '/releases/ask-ai route',
    // Match the literal route string. Allows the rule itself but blocks any
    // <Route path="/releases/ask-ai"> or `navigate('/releases/ask-ai')` etc.
    pattern: /['"`]\/releases\/ask-ai['"`]/,
    scope: 'import',
    directive:
      'CLAUDE.md 2026-05-11 — /releases/ask-ai route was deleted with the ask-ai mock module. NEVER restore.',
  },
  {
    label: 'standalone __type column on JiraTable consumers',
    // The 2026-05-17 lesson banned a standalone `id: '__type'` column on
    // JiraTable consumers — type icon must render INSIDE the Key cell via
    // makeKeyCell's getIcon prop. The cells.tsx utility may still ship
    // `makeTypeIconCell` for future standalone-icon column use cases.
    pattern: /id:\s*['"]__type['"]/,
    scope: 'import',
    directive:
      'CLAUDE.md 2026-05-17 — Jira packs Type icon INSIDE the Work column. No standalone Type column. Use makeKeyCell getIcon.',
    allow: ['components/shared/JiraTable/__tests__/no-type-icon-column.test.ts'],
  },
];

function isAllowed(file: string, allow: string[] = []): boolean {
  const rel = relative(SRC, file).replace(/\\/g, '/');
  return allow.some(a => rel === a);
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '__tests__' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (/\.(tsx?|jsx?)$/.test(entry)) out.push(full);
  }
  return out;
}

const ALL_SRC_FILES = walk(SRC);

describe('banned-orphans CI gate', () => {
  for (const ban of BANS) {
    it(`bans ${ban.label}`, () => {
      const offenders: Array<{ file: string; line: number; text: string }> = [];
      for (const file of ALL_SRC_FILES) {
        if (isAllowed(file, ban.allow)) continue;
        const content = readFileSync(file, 'utf8');
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (ban.pattern.test(lines[i])) {
            offenders.push({
              file: relative(SRC, file).replace(/\\/g, '/'),
              line: i + 1,
              text: lines[i].trim().slice(0, 200),
            });
          }
        }
      }
      if (offenders.length > 0) {
        const detail = offenders
          .map(o => `  ${o.file}:${o.line}\n      ${o.text}`)
          .join('\n');
        throw new Error(
          `Banned pattern "${ban.label}" found in ${offenders.length} location(s):\n${detail}\n\nDirective: ${ban.directive}`,
        );
      }
      expect(offenders).toEqual([]);
    });
  }

  it('BANS catalog is non-empty (catches accidental disable of the gate)', () => {
    expect(BANS.length).toBeGreaterThan(0);
  });
});
