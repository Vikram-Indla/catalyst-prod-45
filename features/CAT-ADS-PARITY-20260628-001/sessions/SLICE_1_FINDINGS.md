# Slice 1 Findings — Phase 6: Light Surface

**Date:** 2026-06-28  
**Duration:** Investigation phase (30 minutes)  
**Status:** SCOPE CLARIFICATION NEEDED

---

## What we discovered

### Baseline audit (npm run lint:colors)
- ✅ 20 hardcoded colors found (well under 600 threshold)
- Mostly in story/demo files (CatySVGAssets.stories.tsx, ForYouRow.stories.tsx, etc.)
- **Phase A/B gate: PASS** (20 << 600)

### Phase 6 specific targets

**Issue 1: Card background tokenization**
- Example: ProjectCard.tsx uses `bg-white` (Tailwind) + `dark:bg-[var(--ds-surface,#0A0A0A)]`
- Phase 6 says: Should use `var(--ds-surface-raised)` for all card/panel components
- **Status:** Many cards use Tailwind utilities (bg-white, bg-gray-100, etc.) instead of ADS tokens

**Issue 2: Row hover states**
- Phase 6 says: Row hover must use `var(--ds-background-neutral-hovered)`
- **Status:** Need to locate row components; pattern not immediately clear in first scan

**Issue 3: Row selected states**
- Phase 6 says: Row selected must use `var(--ds-background-selected)`
- **Status:** Need to locate row components; similar situation

### Challenge

Phase 6 gate mentions "12/15 checks passing → 95%+" but:
- No automated audit tool found that measures "15/15 surface checks"
- The "12/15" reference is from the original prompt statement, not from test output
- Light surface compliance appears to be a visual/manual audit + screenshot comparison, not automated

---

## Decision needed

**Option A: Systematic card/row refactor (4+ hours)**
- Scan all components using bg-white, bg-gray-*, etc.
- Replace Tailwind utilities with `var(--ds-surface-raised)`, `var(--ds-background-neutral-hovered)`, `var(--ds-background-selected)`
- Run comprehensive screenshot validation
- Exceeds 2-hour slice

**Option B: Targeted high-impact fixes (1.5–2 hours)**
- Fix top 5–10 card components (most visible in UI)
- Fix top 5–10 row components (most visible in UI)
- Run screenshot validation against Jira reference
- Scope fits 2-hour slice
- Leaves some components untouched

**Option C: Defer Phase 6 pending clarification (0 hours)**
- Ask Vikram: What is the actual Phase 6 "12/15 checks" audit?
- Request reference data (what 3 checks are currently failing?)
- Defer Phase 6 until clear metrics are available
- Start with Phase 8 (Typography) instead

---

## Recommendation

**Choose Option B** — Make high-impact card/row fixes in the next 90 minutes, capture before/after screenshots, validate against Jira reference. This proves the approach works and establishes the pattern for Phase 6 debt reduction.

If precise metrics are needed beyond screenshots, defer to after clarification call with Vikram.

---

## Next step?

What's your preference?
- **A:** Full refactor (extend timebox)
- **B:** High-impact targeted fixes (proceed with 2h slice)
- **C:** Defer Phase 6, start Phase 8 (Typography — has clearer metrics)
