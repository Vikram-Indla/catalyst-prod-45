# Session 001: Phase 5 Token Foundation Fix
**Date:** 2026-06-28  
**Feature:** CAT-DESIGN-ADS-PARITY-20260628-001  
**Phase:** 5 (Token Foundation) — Priority P0, 2h timebox  
**Branch:** feat/ads-parity-light-dark-audit

## Baseline
- Hardcoded color count (lint:colors:gate): **673**
- Baseline: 20
- Excess: +653 (need to reduce to <600)
- **Note:** Scanner over-counts. Many violations are correct `rgba()` in fallback positions inside `var(--ds-*, #fallback)`. These should NOT be flagged.

## Mission
Fix token foundation violations by:
1. Identifying which 673 are real bare colors vs. correct fallback patterns
2. Prioritize actual bare hex colors (top offenders)
3. Move complex Tailwind gradients with embedded rgba to CSS custom properties
4. Run gate after each batch to verify count decreases

## Scanner Behavior Assessment
Current violations observed:
- ✅ **Correct (should be excluded):** `var(--ds-x, rgba(0,0,0,0.05))` — rgba in fallback
- ✅ **Correct (should be excluded):** `token('color.x', 'var(--ds-x, rgba(...))')` — nested token
- ❌ **Real violations (need fixing):** bare `rgba(...)` outside var() or token()
- ❌ **Real violations (need fixing):** bare hex like `#CF9F02`
- ❌ **Complex violations:** Tailwind gradients embedding rgba values

## Phase 5 Execution Plan

### Step 1: Get clean violation count (exclude fallbacks)
- Run lint:colors with filter for actual bare colors
- Create phase5-actual-violations.txt with only real violations

### Step 2: Fix by priority (highest count first)
Files with most bare colors:
1. Check src/index.css and global styles
2. Shell components (AtlaskitPageShell, SidebarHeader, etc.)
3. Nav/layout components
4. Feature components

### Step 3: Replacement protocol
```
BEFORE (bare hex):
  color: #44546F;

AFTER (with fallback):
  color: var(--ds-text-subtle, #44546F);

BEFORE (bare rgba):
  background: rgba(37,99,235,0.04);

AFTER (with token):
  background: var(--ds-background-information, rgba(37,99,235,0.04));
```

### Step 4: Validation gate
After every 50+ files or 100+ violations fixed:
```bash
npm run lint:colors:gate
```
Stop when count ≤ 600.

## Acceptance Criteria
- ✅ Hardcoded hex count ≤ 600
- ✅ npm run lint:colors:gate passes
- ✅ npm run lint:colors shows decreasing count
- ✅ No TypeScript errors (npx tsc --noEmit)
- ✅ Screenshots: light mode before/after

## Risk / Red Flags
- Scanner over-counting fallback rgba (not a real violation)
- Tailwind arbitrary values with gradients complex to refactor
- May need to adjust scanner exclusions or update baseline before Phase 6 can start

## Next: Phase 6 (Light Surface Validation)
Cannot start until Phase 5 gate passes (<600 count).
