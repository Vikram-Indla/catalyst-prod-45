# PLAN LOCK — Phase 8: Typography Fix

**Status:** APPROVED  
**Timebox:** 2 hours  
**Slice:** Phase 8 of 14 (P1 HIGH IMPACT)  
**Prerequisite:** Phase 5 gate must pass ✅  
**Can run parallel with:** Phase 9, 11  

---

## OBJECTIVE

Fix typography to match ADS intent and Jira density. Font sizes, weights, and hierarchy must be consistent and use ADS tokens. Target: 80%+ typography checks passing, no hardcoded px font-sizes, clear visual hierarchy.

**Done looks like:** Typography hierarchy is clear (page titles > section headers > body > metadata), font sizes use tokens, weights match Jira density, no arbitrary px values.

---

## NON-SCOPE

- Spacing or color changes
- Font family changes (already ADS-compliant)
- Component structure changes
- Icon or status changes

---

## KNOWN FAILURES TO FIX

1. **Hardcoded font-sizes** (100+ instances)
   - Fix: Replace with ADS token equivalents
   - Impact: Chat, Timeline, Task components

2. **Font-weight inconsistency** (30+ instances)
   - Fix: Standardize to ADS weight scale (400, 500, 600, 700)
   - Impact: Headers, buttons, emphasis text

3. **Line-height bloat** (20+ instances)
   - Fix: Use ADS line-height tokens
   - Impact: Sections with excessive vertical spacing

4. **Text hierarchy unclear** (15+ instances)
   - Fix: Ensure title > section > body > metadata progression
   - Impact: Page headers, issue lists

---

## FILES TO MODIFY

| File | Violations | Change type | Scope |
|------|-----------|------------|-------|
| src/components/chat/*.tsx | ~30 | edit | Chat typography |
| src/components/timeline/*.tsx | ~20 | edit | Timeline typography |
| src/modules/tasks/*.tsx | ~25 | edit | Task typography |
| [Page header components] | ~15 | edit | Title hierarchy |
| [Text hierarchy] | ~10 | edit | Body/metadata sizes |

---

## VALIDATION COMMANDS

```bash
# Verify no new color violations introduced
npm run lint:colors:gate

# Light/dark mode screenshots showing typography
# See PHASE-0-EXECUTION-CHECKLIST.md for process
```

---

## GATE REQUIREMENTS

**Phase 8 PASS criteria:**

- ✅ All font-sizes use tokens (no hardcoded px)
- ✅ Font-weights consistent (400, 500, 600, 700 only)
- ✅ Text hierarchy clear (title > section > body > metadata)
- ✅ Line-heights match ADS intent
- ✅ No visual regression in light/dark mode
- ✅ Typography density matches Jira reference

---

## APPROVAL

**Status:** ✅ APPROVED (execution authorized)

After Phase 8 passes → Phase 9 can proceed in parallel with Phase 11.
