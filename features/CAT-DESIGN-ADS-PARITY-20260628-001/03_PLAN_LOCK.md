# Phase 5 Plan Lock: Token Foundation Fix
**Date:** 2026-06-28  
**Timebox:** 2 hours  
**Acceptance:** hardcoded hex count ≤ 600 (interim), target ≤ 20 (final)

## Objective
Reduce bare hardcoded colors from 673 (over-counted with fallbacks) to ≤600 by fixing true violations in high-count files.

## Analysis
**Scanner over-counting issue identified:**
- Total reported: 673
- Correct fallbacks in `token('x', '#HEX')`: ~85% of count
- Correct fallbacks in `var(--ds-x, #HEX)`: ~10% of count  
- TRUE bare colors requiring fix: ~5% (~30-40 real violations)
- Stories/fixtures with test data: ~50 (lower priority)

**Real violation categories:**
1. CSS gradients embedding rgba without token wrapper (~20)
2. Bare hex in component style props (~10)
3. Tailwind color utilities in arbitrary values (~10)
4. Token definitions using raw colors (~5)

## Non-Scope (Phase 5 scope is TIGHT)
- Do not refactor all 673 flagged items (most are correct)
- Do not remove all fallbacks (this is separate)
- Do not touch stories/fixtures (Phase 14 cleanup)
- Do not add new tokens (Phase 5 is fix-only)

## Implementation Strategy

### Step 1: Identify TRUE violations (15min)
Filter scanner output to find:
```bash
# Real bare hex (not in token/var context)
# Real bare rgba (not in var/token fallback)
# Tailwind color utilities (not layout utilities)
```

### Step 2: Fix high-priority files (90min)
**Priority 1 (must fix):**
- src/components/ — any real bare hex in main components
- src/theme/tokens.ts — if any raw rgba/hex outside token definitions
- src/styles/caty.css — any bare colors in CSS

**Priority 2 (if time):**
- src/index.css — Tailwind utilities (bulk fix with codemod)
- Shell/nav components — structural backgrounds

**Priority 3 (defer to Phase 14):**
- src/stories/ — fixture/demo data
- src/modules/ — ring-fenced modules

### Step 3: Validation (15min)
```bash
npm run lint:colors:gate
# Must show count ≤ 600 and exit 0
```

## Canonical Components & Patterns
- Use existing `CatalystStatusPill` as 100% tokenized reference
- All colors must come from `var(--ds-*)` or `token('color.*')`
- Fallbacks are allowed IF inside token() or var() context
- No custom color constants outside theme/tokens.ts

## Risk / Red Flags
- ⚠️ Scanner may still over-count after fixes (fallback detection not perfect)
- ⚠️ If count doesn't decrease after fixes, scanner config may need update
- 🚫 STOP if any regression detected (test suite must pass)

## Exit Criteria (ALL must be true)
1. ✅ npm run lint:colors:gate exits 0
2. ✅ Count ≤ 600 shown in gate output
3. ✅ No TypeScript errors (`npx tsc --noEmit` passes)
4. ✅ No test regressions (`npm test` passes)
5. ✅ Session log updated with exact files modified
6. ✅ Gate output + before/after summary recorded

## Files to Modify (Planned)
- src/components/{specific high-count files}
- src/theme/tokens.ts (if needed)
- src/index.css (Tailwind utilities only)
- design-governance/color-baseline.json (update baseline after gate passes)

## Files FORBIDDEN
- src/components/shared/CatalystStatusPill.tsx (already 100% canonical)
- src/modules/task10/styles/* (ring-fenced)
- .github/workflows/* (CI config - Phase 12)
- design-governance/enforcement-config.json (scanner config - Phase 12)

## Success Looks Like
```
✅ PASS  hardcoded hex: 550 (ratchet: 673)  ← count decreases
Gate result: exit 0
Session log: Phase 5 complete, X files modified, Y violations fixed
```

---
**Plan approved:** Ready to execute Phase 5 token foundation fixes
