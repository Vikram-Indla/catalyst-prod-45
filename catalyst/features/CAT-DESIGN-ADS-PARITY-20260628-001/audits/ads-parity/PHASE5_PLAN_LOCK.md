# PLAN LOCK — Phase 5: Token Foundation Fix

**Status:** APPROVED  
**Approved by:** User (execution authorized)  
**Timebox:** 2 hours  
**Slice:** Phase 5 of 10 (CRITICAL BLOCKER)  
**Prerequisite:** Discovery phases 0–4 complete ✅  
**Blocks:** Phases 6, 7, 8, 9, 10, 11, 12, 13, 14 cannot start until gate passes  

---

## OBJECTIVE

Replace every hardcoded hex color in Catalyst UI components with ADS token equivalents. Target: reduce hardcoded hex count from 709 to <600. This phase is the foundation for all subsequent surface, dark mode, and icon fixes. No other phase may begin until this gate passes.

**Done looks like:** `npm run audit:colors` returns <600 hardcoded hex violations, audit:colors:gate passes, all Tailwind color utilities replaced in highest-impact files.

---

## NON-SCOPE

- Icon SVG source files (handled in Phase 10)
- Test fixtures or mock data
- Files outside src/
- Scripts, config, docs

---

## CANONICAL COMPONENTS SELECTED

| Component | File | Why selected |
|-----------|------|--------------|
| AtlaskitPageShell | src/components/ads/AtlaskitPageShell.tsx | Primary shell, 58% hardcoded colors, 73% hardcoded spacing |
| CatalystShell | src/components/layout/CatalystShell.tsx | Canonical shell variant |
| ADS tokens | references/ads-token-map.md | Source of truth for hex → token mapping |
| Status/Badge | src/components/shared/CatalystStatusPill.tsx | Reference (0 violations, gold standard) |

---

## FILES TO MODIFY

Priority order (highest violation count first):

| File | Violations | Change type | Scope |
|------|-----------|------------|-------|
| src/index.css | 817 | edit | Replace Tailwind color utilities with ADS tokens |
| src/components/ads/AtlaskitPageShell.tsx | ~50 | edit | Shell surface colors → tokens |
| src/components/layout/CatalystShell.tsx | ~40 | edit | Shell surface colors → tokens |
| src/components/ads/Breadcrumbs.tsx | ~15 | edit | Navigation breadcrumb colors → tokens |
| src/components/layout/MobileBottomNav.tsx | ~12 | edit | Mobile nav colors → tokens |
| [Additional files per manifest] | [varies] | edit | Continue until <600 gate passes |

---

## FILES FORBIDDEN

Do NOT touch:
- src/components/shared/CatalystStatusPill.tsx (already 100% canonical, 0 violations)
- src/components/ads/Button.tsx (already clean)
- Any test file (\*.test.ts, \*.spec.ts)
- Any mock/fixture file
- SVG source files (Phase 10)

---

## UI/UX RULES

- All color changes: ADS tokens only (`var(--ds-*)`)
- Replacement pattern: `color: #44546F` → `color: var(--ds-text-subtle, #44546F)`
- Fallback is the original hex (scanner ignores var(--ds-*, #fallback))
- No hand-rolled color maps
- No Tailwind color utilities (bg-slate-100, text-gray-500, etc.)
- No arbitrary CSS colors

---

## DATA/BACKEND RULES

- No DB changes
- No API changes
- No prop/interface changes
- Audit only phase → no data assumptions

---

## INTEGRATION/WIRING RULES

- No new React Query hooks
- No Edge function changes
- Tokens resolve via existing CSS variable system (no new setup)
- CatalystStatusPill already uses tokens (reference, do not change)

---

## PARALLEL EXECUTION PLAN

**Single-threaded phase (no parallelization):**

1. **Scan & Manifest** (15 min)
   - Grep for all hardcoded hex
   - Sort by violation count descending
   - Create phase5-file-manifest.md

2. **Fix src/index.css** (30 min)
   - 817 Tailwind utilities
   - Map each to ads-token-map.md
   - Use ratchet gate script to validate

3. **Fix Shells & Nav** (30 min)
   - AtlaskitPageShell, CatalystShell, Breadcrumbs, MobileBottomNav
   - 85+ violations, highest visibility
   - Screenshot validation in light mode

4. **Fix Remaining Files** (30 min)
   - Continue down manifest until <600 gate passes
   - Log any unmapped hex in token-gaps.md
   - Final validation

5. **Gate Validation** (15 min)
   - Run `npm run audit:colors:gate`
   - Confirm <600 count
   - Generate phase5-gate-output.txt

---

## SCREENSHOT CHECKLIST

- [ ] Light mode before (reference page, 1440×900)
- [ ] Light mode after (same page, colors updated)
- [ ] Verify no visual regression (colors remain ADS-compliant)
- [ ] Status pill visible (reference component, should be unchanged)
- [ ] Nav/breadcrumbs visible and distinct from background

---

## VALIDATION COMMANDS

```bash
# After every 20 files fixed:
npm run audit:colors

# Final gate check (must show <600):
npm run audit:colors:gate

# Generate baseline for ratchet tracking:
npm run lint:colors > audits/ads-parity/phase5-gate-output.txt

# Verify no syntax errors:
npx tsc --noEmit -p tsconfig.app.json

# Take light mode screenshots:
# See PHASE-0-EXECUTION-CHECKLIST.md for screenshot process
```

---

## STOP CONDITIONS

Stop and raise RED FLAG if:

- Gate count is still ≥600 after 2 hours (incomplete)
- More than 10 files have `/* ads-scanner:ignore */` escape hatches (indicates systemic unmapped tokens)
- Light mode visual regression detected (colors changed incorrectly)
- Any file outside src/ was modified
- Syntax errors appear in `npm run audit:colors` output

RED FLAG format:
```
RED FLAG:
1. <What blocks gate passage>
2. <Why (missing tokens, scope creep, etc.)>
3. <Evidence (audit output, file count)>
4. <Safer option>
5. <Decision needed from Vikram>
```

---

## DRIFT/REBASELINE RULES

If new violations appear mid-phase:
1. Document in session log
2. Add to phase5-file-manifest.md with "NEW DISCOVERY" marker
3. Continue fixing (do not pause)
4. Gate still requires <600 final count

If gate cannot reach <600 in 2 hours:
1. Stop
2. Document blockers in RED FLAG
3. Request rebaseline or scope adjustment

---

## REQUIRED OUTPUTS

**Mandatory deliverables:**

1. **phase5-file-manifest.md**
   - List of all files fixed, violation count before/after, token replacements
   - Sort by file path

2. **token-gaps.md**
   - Any hex value without an ADS token entry
   - Format: `#hexvalue — no token found, added escape hatch [CAT-ADS-GAP-001]`
   - Do NOT invent token names

3. **phase5-gate-output.txt**
   - Raw output from `npm run audit:colors:gate`
   - Must show <600 hardcoded hex count

4. **Screenshots**
   - Light mode before (page with original colors)
   - Light mode after (same page, tokens applied)
   - Both at 1440×900 viewport
   - Saved to: audits/ads-parity/screenshots/phase5-before-after/

5. **Git diff summary**
   - Exact files changed, line counts, token replacements per file

---

## NOTES FOR IMPLEMENTATION

### Tailwind Color Utilities (src/index.css)

Identify Tailwind utilities:
```bash
grep -E "bg-|text-|border-|from-|via-|to-" src/index.css | grep -E "(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)"
```

These are violations. Layout utilities (flex, grid, w-, h-, p-, m-) are NOT violations — leave them alone.

### Hex Fallback Pattern

✅ Correct:
```css
color: var(--ds-text-subtle, #44546F);
border: 1px solid var(--ds-border, #091e4224);
```

❌ Incorrect:
```css
color: #44546F;
border: 1px solid #091e4224;
```

The scanner ignores values already inside `var(--ds-*, #fallback)` — this is correct behavior.

### Token Mapping Reference

Every replacement must appear in `references/ads-token-map.md`. If a hex value is missing:
1. Check if it's a Jira-parity bypass (should have escape hatch + issue ID)
2. Otherwise, add escape hatch: `/* ads-scanner:ignore — CAT-ADS-GAP-001 */`
3. Log in token-gaps.md
4. Do NOT invent a new token name

---

## GATE REQUIREMENTS

**Phase 5 PASS criteria:**

- ✅ Hardcoded hex count < 600 (down from 709)
- ✅ `npm run audit:colors:gate` returns success
- ✅ No syntax errors in modified files
- ✅ Light mode visual validation (colors appear correct)
- ✅ Status pill unchanged (reference validation)
- ✅ All 5 required outputs completed

**If gate fails:** Do not move to Phase 7. Continue Phase 5 or request rebaseline.

---

## IMPLEMENTATION NOTES

This phase is single-threaded and must complete before Phases 6–14. The ratchet gate is the final arbitrator — if it doesn't pass, keep fixing. The goal is <600, not perfection; use escape hatches for documented gaps.

Focus on highest-impact files first (src/index.css, shells, nav). Light mode visual validation proves tokens are working. Status pill serves as reference that canonical components already follow this pattern.

**No code changes beyond color token replacements.** This is surgical, not refactoring.

---

## APPROVAL

**Status:** ✅ APPROVED (execution authorized)

Next gate: Phases 7 and 10 cannot start until Phase 5 gate (npm run audit:colors:gate) passes with <600 count.

After Phase 5 passes → Phase 7 (Dark Surfaces) and Phase 10 (Icons) can run in parallel.
