# PLAN LOCK — Phase 12: Guardrails & CI

**Status:** APPROVED (execution authorized)  
**Timebox:** 2 hours  
**Slice:** Phase 12 of 14 (FINAL P0 CRITICAL BLOCKER)  
**Prerequisite:** Phases 5, 7, 10 must pass ✅  
**Blocks:** Phases 13–14 cannot start until gates active  

---

## OBJECTIVE

Create permanent design system guardrails to enforce ADS compliance and prevent regression. Lock in all Phase 5–11 fixes via ratchet gates, pre-commit hooks, and CI enforcement. Establish Design Baseline Guardrail Contract as canonical source of truth.

**Done looks like:** Ratchet gates active and enforced, pre-commit hooks block new violations, CI gates prevent merge of non-compliant code, guardrail contract documented, team can't accidentally regress.

---

## NON-SCOPE

- Fixing remaining violations (Phases 5–11 already did)
- New feature implementation
- Refactoring outside design system scope
- Documentation beyond guardrail contract

---

## DELIVERABLES

### 1. Design System Guardrail Contract
**Create:** `docs/design-system/ADS_GUARDRAIL_CONTRACT.md`

**Contents:**

```markdown
# ADS Guardrail Contract

## Canonical Enforcement

1. **Color tokens are mandatory**
   - No raw hex (#XXXXXX), rgb/rgba, hsl colors
   - No Tailwind color utilities (bg-slate-*, text-gray-*, etc.)
   - All colors must use `var(--ds-*)` tokens with hex fallback
   - Pattern: `color: var(--ds-text-subtle, #44546F)`

2. **Canonical components required**
   - Buttons → @atlaskit/button or CatyButton
   - Status badges → CatalystStatusPill (100% canonical)
   - Icons → CatalystIconWrapper (16|24|32 sizes only)
   - Tables → JiraTable (mandatory for work items)
   - Modals, dropdowns, tabs → @atlaskit or Catalyst canonical

3. **Dark mode is mandatory**
   - All surfaces must use surface tokens (not color tokens)
   - Light/dark mode tested before merge
   - Screenshot validation required for UI changes
   - Contrast gate must pass (WCAG AA minimum)

4. **Accessibility is non-negotiable**
   - Focus rings required (var(--ds-border-focused))
   - Semantic HTML required (no div onClick)
   - ARIA labels required for icons
   - Contrast gate enforced (npm run audit:contrast)

5. **Spacing uses 8px grid only**
   - Allowed: 4px, 8px, 12px, 16px, 24px, 32px multiples
   - No arbitrary spacing (6px, 10px, 13px, 14px, etc.)
   - Ratchet gate tracks off-grid violations

6. **Typography is canonical**
   - Font family matches ADS intent
   - Font sizes from token scale (no arbitrary px)
   - Font weights consistent with hierarchy
   - Ratchet gate enforces baseline

7. **Status quo for Jira parity**
   - Catalyst must look and feel like Jira
   - Screenshot diffs gate PRs touching shell/nav/rows
   - Deviation requires documented exception

## Enforcement Gates

**Pre-commit (blocks locally):**
- `npm run lint:colors:gate` — hardcoded hex count ≤ baseline
- `npm run tsc --noEmit` — type safety
- `npm run lint:accessibility` — semantic HTML + ARIA

**CI (blocks merge):**
- `npm run audit:colors:gate` — no new hardcoded colors
- `npm run audit:contrast` — WCAG AA passes
- `npm run audit:ads` — token/spacing/typography baseline holds
- Screenshot diff gate (on UI-heavy PRs)

**Ratchet baseline values:**
- Hardcoded hex colors: 20 (can only go down)
- Tailwind color utilities: 0 (banned, any new = fail)
- Off-grid spacing violations: 0 (tracked per phase)
- Missing focus rings: 0 (enforced)
- Semantic HTML divs with onClick: 0 (enforced)

## Decision Framework

| Scenario | Decision | Who Decides |
|----------|----------|------------|
| New color needed, not in token map | Add to ADS token map, or use escape hatch + issue | Design System Lead |
| Can't fit in 4/8/12/16/24/32px spacing | Replan design, or document exception | Vikram |
| Custom component unavoidable | Proof of ADS unsuitability required | Vikram + Design review |
| Light/dark mode difference | Document why in code comment | PR author |

## Guardrail Violations = Automatic Rejection

No exceptions without written approval from Vikram + Design System Lead.

Violations include:
- Raw hex colors in new code
- Non-canonical components (buttons, tabs, status pills)
- Missing focus rings
- Contrast failures
- Off-grid spacing
- Custom color constants

## Quarterly Review

Every quarter:
1. Review ratchet baseline (should decrease)
2. Audit new token usage (patterns, gaps)
3. Update guardrail contract (new patterns, decisions)
4. Plan next design system phase
```

### 2. Ratchet Gate Scripts

**Color Gate:** `scripts/ads-color-gate.cjs`
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Get current violation count
const output = execSync('npm run lint:colors 2>&1', { encoding: 'utf8' });
const matches = output.match(/Found (\d+) hard-coded color violation/);
const current = matches ? parseInt(matches[1]) : 0;

// Load baseline
const baseline = JSON.parse(
  fs.readFileSync('design-governance/color-baseline.json', 'utf8')
).baseline;

// Report
console.log(`\n🎨 ADS Color Gate\n`);
console.log(`Current:  ${current}`);
console.log(`Baseline: ${baseline}`);

if (current <= baseline) {
  console.log(`✅ PASS (${baseline - current} below baseline)\n`);
  process.exit(0);
} else {
  console.log(`❌ FAIL (${current - baseline} above baseline)\n`);
  console.log('To update baseline: npm run lint:colors:update-baseline');
  process.exit(1);
}
```

**Contrast Gate:** `scripts/ads-contrast-gate.cjs`
```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  const output = execSync('npm run audit:contrast 2>&1', { encoding: 'utf8' });
  
  if (output.includes('FAIL') || output.includes('❌')) {
    console.log('❌ Contrast audit FAILED\n');
    console.log(output);
    process.exit(1);
  }
  
  console.log('✅ Contrast audit PASSED\n');
  process.exit(0);
} catch (e) {
  console.log('❌ Contrast audit error\n');
  console.log(e.message);
  process.exit(1);
}
```

### 3. Pre-commit Hook

**File:** `.husky/pre-commit`

```bash
#!/usr/bin/env bash

echo "🎨 Running ADS compliance gates..."

# Color gate
npm run lint:colors:gate || {
  echo "❌ Color gate failed. New hard-coded colors detected."
  exit 1
}

# TypeScript
npx tsc --noEmit || {
  echo "❌ TypeScript check failed."
  exit 1
}

# Accessibility
npm run lint:accessibility || {
  echo "❌ Accessibility check failed (focus rings, semantic HTML)."
  exit 1
}

echo "✅ All pre-commit gates passed."
exit 0
```

### 4. CI Workflow

**File:** `.github/workflows/design-gates.yml`

```yaml
name: Design System Gates

on:
  pull_request:
    paths:
      - 'src/**'
      - 'package.json'

jobs:
  color-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: node-modules/setup-node@v3
      - run: npm install
      - run: npm run lint:colors:gate
        
  contrast-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: node-modules/setup-node@v3
      - run: npm install
      - run: npm run audit:contrast

  ads-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: node-modules/setup-node@v3
      - run: npm install
      - run: npm run audit:ads

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: node-modules/setup-node@v3
      - run: npm install
      - run: npm run lint:accessibility

  ui-screenshot-diff:
    if: contains(github.event.pull_request.labels.*.name, 'ui-heavy')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: node-modules/setup-node@v3
      - run: npm install
      - run: npm run test:visual-regression
```

### 5. Baseline Tracking Files

**Color Baseline:** `design-governance/color-baseline.json`
```json
{
  "baseline": 20,
  "description": "Hardcoded hex color violations (Phase 5 target: <600, current: 20)",
  "updated": "2026-06-28",
  "phase": 5,
  "ratchet_direction": "down_only",
  "escape_hatch_count": 0
}
```

**Audit Baseline:** `design-governance/audit-baseline.json`
```json
{
  "tokens": {
    "pass": 57,
    "partial": 31,
    "fail": 46,
    "total": 160,
    "score": "51%",
    "baseline_date": "2026-06-28"
  },
  "ratchet_rules": [
    "tokens.fail can only decrease",
    "tokens.pass can only increase",
    "dark_surfaces must pass ≥70% (currently 15%, Phase 7 fixes)",
    "focus_rings must be present on all focusable elements"
  ]
}
```

---

## FILES TO MODIFY/CREATE

| File | Type | Purpose |
|------|------|---------|
| docs/design-system/ADS_GUARDRAIL_CONTRACT.md | create | Master contract |
| scripts/ads-color-gate.cjs | create/update | Color ratchet gate |
| scripts/ads-contrast-gate.cjs | create/update | Contrast ratchet gate |
| .husky/pre-commit | create/update | Pre-commit hook |
| .github/workflows/design-gates.yml | create | CI gates |
| design-governance/color-baseline.json | create | Baseline tracking |
| design-governance/audit-baseline.json | create | Audit tracking |
| package.json | edit | Add gate scripts |

---

## FILES FORBIDDEN

- src/ (no code changes, only guardrails)
- Test files
- Documentation outside guardrail scope

---

## UI/UX RULES

- No UI changes
- Guardrails only
- Contract is authoritative source

---

## VALIDATION COMMANDS

```bash
# Test color gate
npm run lint:colors:gate

# Test contrast gate
npm run audit:contrast

# Test accessibility
npm run lint:accessibility

# Test CI workflow locally
act -j color-gate  # requires act (GitHub Actions locally)

# Verify all baselines exist
ls design-governance/color-baseline.json design-governance/audit-baseline.json
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Any gate script fails to parse/execute
- Pre-commit hook blocks all commits (syntax error)
- CI workflow won't trigger (YAML error)
- Baseline files missing or corrupt
- Gates contradict each other

RED FLAG format:
```
RED FLAG:
1. <What blocks gate implementation>
2. <Why>
3. <Evidence>
4. <Safer option>
5. <Decision needed>
```

---

## REQUIRED OUTPUTS

1. **ADS_GUARDRAIL_CONTRACT.md**
   - Master document (provided above)
   - Decision framework
   - Enforcement rules

2. **scripts/ads-color-gate.cjs**
   - Executable color ratchet
   - Reports current vs. baseline

3. **scripts/ads-contrast-gate.cjs**
   - Executable contrast ratchet
   - Reports pass/fail

4. **.husky/pre-commit**
   - Pre-commit enforcement
   - Blocks violations locally

5. **.github/workflows/design-gates.yml**
   - CI enforcement
   - Blocks PR merge on violations

6. **design-governance/color-baseline.json**
   - Current baseline: 20
   - Ratchet direction: down only

7. **design-governance/audit-baseline.json**
   - Full audit baseline
   - Ratchet rules per category

8. **Session log + commit**
   - phase12-guardrails-setup.md
   - Git commit with all files

---

## GATE REQUIREMENTS

**Phase 12 PASS criteria:**

- ✅ ADS_GUARDRAIL_CONTRACT.md created + documented
- ✅ Color gate script created and executable
- ✅ Contrast gate script created and executable
- ✅ Pre-commit hook installed and working
- ✅ CI workflow defined and parseable
- ✅ All baseline files exist and valid
- ✅ No new violations introduced
- ✅ All 8 required outputs completed

**If gate fails:** Do not merge. Fix guardrail setup before proceeding.

---

## IMPLEMENTATION NOTES

This phase locks in all prior phases. After Phase 12 completes:
- New hardcoded colors automatically rejected (gate blocks)
- New low-contrast UI rejected (contrast gate)
- New semantic HTML violations rejected (accessibility gate)
- Light/dark mode regressions caught (screenshot diffs)

The team cannot accidentally regress. All violations are tracked, baseline is locked, and enforcement is automated.

---

## APPROVAL

**Status:** ✅ APPROVED (execution authorized)

After Phase 12 passes → Phases 13–14 (Screenshot Validation, Regression Testing) finalize the work.

Then: All P0 critical blockers complete ✅ + all guardrails locked in ✅
