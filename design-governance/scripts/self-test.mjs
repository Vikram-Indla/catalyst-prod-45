#!/usr/bin/env node
/**
 * Audit self-test — proves the audit actually catches what it claims to.
 *
 * The audit was a fraud once already (silent-pass on any error, false
 * positives on var() fallbacks, blind to Tailwind utilities). This file
 * is the second line of defence: it feeds the audit a curated set of
 * known-bad fixtures and asserts that every fixture is flagged with the
 * EXPECTED violation type. If the audit ever silently passes a known-bad
 * sample, this script fails non-zero and the CI gate goes red.
 *
 * Wire this into pre-commit + CI so a regression in the audit itself
 * cannot ship undetected.
 *
 * Run: node design-governance/scripts/self-test.mjs
 *
 * Exit: 0 if every fixture flagged correctly + every clean fixture passes.
 *       1 if any expected violation went undetected (audit regression),
 *         or any clean fixture got a false positive.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import ADSTokenScanner from '../rules/ads-token-scanner.js';
import TypographyEnforcer from '../rules/typography-enforcer.js';
import SpacingGridValidator from '../rules/spacing-grid-validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ── Fixtures ─────────────────────────────────────────────────────
 * Each fixture is: { name, code, expect: [{ scanner, type }] }
 *   - `scanner` is one of: 'tokens' | 'typography' | 'spacing'
 *   - `type` matches the violation.type the scanner emits
 * `expect: []` means the fixture must be CLEAN (no violation expected).
 * Add a new fixture every time you discover a NEW failure mode that
 * the audit didn't catch — the test surface should monotonically grow.
 * ──────────────────────────────────────────────────────────────── */
const FIXTURES = [
  // ── Raw hex (must flag) ──
  {
    name: 'bare-hex-color',
    code: `const C = '#15803D';`,
    expect: [{ scanner: 'tokens', type: 'RAW_HEX' }],
  },
  {
    name: 'hex-in-var-fallback (must NOT flag — ADS-canonical)',
    code: `<div style={{ color: 'var(--ds-text, #292A2E)' }}>`,
    expect: [],
  },
  {
    name: 'hex-in-nested-var-fallback (must NOT flag)',
    code: `<div style={{ color: 'var(--ds-text, var(--cp-text-primary, #172B4D))' }}>`,
    expect: [],
  },
  {
    name: 'hex-in-token-fallback (must NOT flag — @atlaskit/tokens canonical)',
    code: `<div style={{ color: token('color.text', '#172B4D') }}>`,
    expect: [],
  },

  // ── Tailwind utilities (must flag) ──
  {
    name: 'tailwind-text-size',
    code: `<h1 className="text-2xl font-semibold">Title</h1>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },
  {
    name: 'tailwind-font-weight',
    code: `<span className="font-bold">x</span>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },
  {
    name: 'tailwind-padding-utility',
    code: `<td className="px-4 py-3">cell</td>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },
  {
    name: 'tailwind-gap-utility',
    code: `<div className="flex gap-2">x</div>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },
  {
    name: 'tailwind-rounded-chrome',
    code: `<div className="rounded-lg shadow-sm">x</div>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },
  {
    name: 'tailwind-color-class',
    code: `<p className="text-slate-500">x</p>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },
  {
    name: 'tailwind-italic',
    code: `<span className="italic">empty</span>`,
    expect: [{ scanner: 'tokens', type: 'TAILWIND_CLASS' }],
  },

  // ── Uppercase labels (must flag) ──
  {
    name: 'inline-uppercase',
    code: `<th style={{ textTransform: 'uppercase' }}>HEADER</th>`,
    expect: [{ scanner: 'typography', type: 'UPPERCASE_LABEL' }],
  },
  {
    name: 'tailwind-uppercase',
    code: `<th className="uppercase">HEADER</th>`,
    expect: [
      { scanner: 'tokens', type: 'TAILWIND_CLASS' },
      { scanner: 'typography', type: 'UPPERCASE_LABEL' },
    ],
  },

  // ── Spacing grid (must flag off-grid) ──
  {
    name: 'off-grid-padding',
    code: `<div style={{ padding: '13px 7px' }}>x</div>`,
    expect: [{ scanner: 'tokens', type: 'HARDCODED_PX' }],
  },
  {
    name: 'on-grid-padding (must NOT flag — 4/8/16/24/32)',
    code: `<div style={{ padding: '8px 16px' }}>x</div>`,
    expect: [],
  },
  {
    name: 'on-grid-padding-with-border-on-same-line (must NOT flag)',
    code: `<td style={{ padding: '12px 12px 12px 0', borderBottom: '1px solid #ccc' }}>x</td>`,
    expect: [{ scanner: 'tokens', type: 'RAW_HEX' }], // only the bare #ccc, NOT the 1px
  },

  // ── Typography weights (must flag invalid, pass Jira 653) ──
  // Use <div> not <h1> here — the h1 rule fires when both fontSize and
  // fontWeight aren't paired correctly, which would pollute the test.
  {
    name: 'invalid-fontweight',
    code: `<div style={{ fontWeight: 555 }}>x</div>`,
    expect: [{ scanner: 'typography', type: 'INVALID_FONTWEIGHT' }],
  },
  {
    name: 'jira-fontweight-653 (must NOT flag)',
    code: `<div style={{ fontWeight: 653 }}>x</div>`,
    expect: [],
  },

  // ── Banned components (must flag) ──
  {
    name: 'react-select-import',
    code: `import Select from 'react-select';`,
    expect: [{ scanner: 'tokens', type: 'BANNED_COMPONENT' }],
  },

  // ── Banned fields (must flag) ──
  {
    name: 'storypoints-banned-field',
    code: `<StoryPoints value={5} />`,
    expect: [{ scanner: 'tokens', type: 'BANNED_FIELD' }],
  },

  // ── 2026-05-19 — new rules ──────────────────────────────────────
  // Raw rgb()/rgba()/hsl() literals
  {
    name: 'bare-rgb',
    code: `<div style={{ color: 'rgb(255, 0, 0)' }}>x</div>`,
    expect: [{ scanner: 'tokens', type: 'RAW_RGB_HSL' }],
  },
  {
    name: 'bare-rgba',
    code: `<div style={{ background: 'rgba(15, 76, 199, 0.3)' }}>x</div>`,
    expect: [{ scanner: 'tokens', type: 'RAW_RGB_HSL' }],
  },
  {
    name: 'rgb-in-var-fallback (must NOT flag)',
    code: `<div style={{ color: 'var(--ds-text, rgb(41, 42, 46))' }}>x</div>`,
    expect: [],
  },
  // Banned toast libraries
  {
    name: 'sonner-import',
    code: `import { toast } from 'sonner';`,
    expect: [{ scanner: 'tokens', type: 'BANNED_TOAST' }],
  },
  {
    name: 'react-hot-toast-import',
    code: `import toast from 'react-hot-toast';`,
    expect: [{ scanner: 'tokens', type: 'BANNED_TOAST' }],
  },
  // Banned column header strings
  {
    name: 'banned-column-story-points-th',
    code: `<th>Story Points</th>`,
    expect: [{ scanner: 'tokens', type: 'BANNED_COLUMN_HEADER' }],
  },
  {
    name: 'banned-column-mdt-ref-th',
    code: `<th>MDT Ref</th>`,
    expect: [{ scanner: 'tokens', type: 'BANNED_COLUMN_HEADER' }],
  },
  // Atlaskit legacy import (NOT /new)
  {
    name: 'atlaskit-button-legacy',
    code: `import Button from '@atlaskit/button';`,
    expect: [{ scanner: 'tokens', type: 'ATLASKIT_LEGACY' }],
  },
  {
    name: 'atlaskit-button-new (must NOT flag)',
    code: `import Button from '@atlaskit/button/new';`,
    expect: [],
  },
  // .css imports outside allowlist
  {
    name: 'non-ads-css-import',
    code: `import './styles/dashboard.css';`,
    expect: [{ scanner: 'tokens', type: 'CSS_FILE_IMPORT' }],
  },
  {
    name: 'atlaskit-css-import (must NOT flag)',
    code: `import '@atlaskit/css-reset/dist/bundle.css';`,
    expect: [],
  },

  // ── 2026-05-19 — ignore-marker support ────────────────────────
  // // ads-scanner:ignore-next-line is an escape hatch for intentional
  // design-system demos (e.g. components-preview gallery).
  {
    name: 'ignore-next-line marker exempts the following line',
    code: `// ads-scanner:ignore-next-line\n<div style={{ color: '#FF0000' }}>demo</div>`,
    expect: [],
  },
  {
    name: 'ignore-next-line only exempts the immediately following line',
    code: `// ads-scanner:ignore-next-line\nconst safe = 'value';\n<div style={{ color: '#FF0000' }}>x</div>`,
    expect: [{ scanner: 'tokens', type: 'RAW_HEX' }],
  },
];

function runScannersOnFixture(code) {
  // Write the fixture to a temp .tsx file and scan it.
  const tmp = path.join(os.tmpdir(), `ads-audit-self-test-${Date.now()}-${Math.random().toString(36).slice(2)}.tsx`);
  fs.writeFileSync(tmp, code, 'utf-8');
  try {
    const tokens = new ADSTokenScanner();
    tokens.scanFile(tmp);
    const typography = new TypographyEnforcer();
    typography.scanFile(tmp);
    const spacing = new SpacingGridValidator();
    spacing.scanFile(tmp);
    return {
      tokens: tokens.violations,
      typography: typography.violations,
      spacing: spacing.violations,
    };
  } finally {
    fs.unlinkSync(tmp);
  }
}

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passes = 0;
let fails = 0;
const failures = [];

console.log(`\n${BOLD}━━ Design-system audit self-test ━━${RESET}\n`);
console.log(`Running ${FIXTURES.length} fixtures…\n`);

for (const fx of FIXTURES) {
  const observed = runScannersOnFixture(fx.code);
  const observedFlat = [
    ...observed.tokens.map(v => ({ scanner: 'tokens', type: v.type })),
    ...observed.typography.map(v => ({ scanner: 'typography', type: v.type })),
    ...observed.spacing.map(v => ({ scanner: 'spacing', type: v.type })),
  ];

  const missingExpected = fx.expect.filter(
    e => !observedFlat.some(o => o.scanner === e.scanner && o.type === e.type),
  );
  const unexpectedExtras = observedFlat.filter(
    o => !fx.expect.some(e => e.scanner === o.scanner && e.type === o.type),
  );

  const ok = missingExpected.length === 0 && unexpectedExtras.length === 0;
  if (ok) {
    passes++;
    console.log(`  ${GREEN}✓${RESET} ${fx.name}`);
  } else {
    fails++;
    failures.push({ fx, missingExpected, unexpectedExtras, observedFlat });
    console.log(`  ${RED}✗${RESET} ${fx.name}`);
    if (missingExpected.length) {
      console.log(`    ${RED}missing:${RESET} ${missingExpected.map(e => `${e.scanner}/${e.type}`).join(', ')}`);
    }
    if (unexpectedExtras.length) {
      console.log(`    ${YELLOW}extra:${RESET}   ${unexpectedExtras.map(e => `${e.scanner}/${e.type}`).join(', ')}`);
    }
    console.log(`    ${DIM}code:${RESET}    ${fx.code.replace(/\n/g, ' ').slice(0, 100)}`);
  }
}

console.log(`\n${BOLD}━━ Result ━━${RESET}`);
console.log(`${GREEN}${passes} passed${RESET}, ${fails ? RED : DIM}${fails} failed${RESET}\n`);

if (fails > 0) {
  console.log(`${RED}${BOLD}AUDIT REGRESSION:${RESET} the scanner stopped catching something it used to catch, or started flagging something it shouldn't. Fix the scanner rule (or update the fixture if the policy genuinely changed) BEFORE landing any other change.\n`);
  process.exit(1);
}

console.log(`${GREEN}${BOLD}All audit rules verified.${RESET}\n`);
process.exit(0);
