# Validation Log: test-hub / exp-002

**Date:** 2026-06-26
**Type:** research

---

## Validation Commands

Research experiment — no build validation needed.

---

## Results

**TypeScript errors:** N/A — no src/ files touched
**ADS violations (touched files):** N/A — no src/ files touched
**ADS self-test:** N/A
**Build:** N/A
**Screenshot path:** N/A — research experiment

---

## Constraint Checks

| Constraint | Status | Evidence |
|---|---|---|
| No src/ files modified | ✅ PASS | Read-only grep + python regex. Zero writes. |
| No staging DB queries | ✅ PASS | All data from types.ts static analysis. |
| No migrations run | ✅ PASS | No supabase CLI invoked. No migration files touched. |
| No routes added | ✅ PASS | FullAppRoutes.tsx not modified. |
| No schema changes | ✅ PASS | No SQL DDL executed. |
| No Test Hub UI implementation | ✅ PASS | Research only. |
| allowed-edit-surface.md filled before work | ✅ PASS | Filled prior session. |

---

## Acceptance Criteria (from hypothesis.md)

- [x] All Test Hub table families identified (tm_* active, th_* dormant)
- [x] All RPCs mapped (19 active, 1 dead, 1 suspect)
- [x] All hooks catalogued (16 test-management/, 8 test-cycles/, 1 my-test-scope, 3 releases)
- [x] Broken/suspicious data paths named (tm_get_requirement_test_cases suspect)
- [x] Canonical family recommendation written (tm_* definitively)
- [x] Safe pages listed (16 pages — all safe)
- [x] Blocked pages listed (none blocked; 1 suspect RPC flagged)
- [x] Exp-003 recommendation written (DB probe + types regen)
- [x] No src/ files modified
- [x] No DB queries executed
- [x] No migrations run
- [x] No routes added
- [x] Documentation complete (all 9 exp-002 files filled)

---

## Key Research Commands Run (read-only)

```bash
grep -c "th_" src/hooks/test-management/ src/pages/testhub/     # → 0 (no th_* refs)
grep -c "tm_" src/hooks/test-management/ src/pages/testhub/     # → 150+

python3 -c "re.findall(r'^\s{6}(tm_[a-z_]+):\s*\{', content)"   # 140+ tm_* names
sed -n '28234,28293p' types.ts                                    # plan_test_cycles = real table
sed -n '69796,69840p' types.ts                                    # tm_get_requirement_test_cases confirmed
sed -n '69272,69310p' types.ts                                    # save_test_data confirmed
grep -c "tm_test_sets\|tm_set_cases" TestSetsPage.tsx             # → 12 hits
grep -c "linked_work_item_id\|tm_test_cases" TraceabilityPage.tsx # → 9 hits
```

---

## Validation Run: 2026-06-26 01:48

### TypeScript

```
Errors: 0
```

### ADS Self-Test

```
Result: PASS

[1m━━ Design-system audit self-test ━━[0m

Running 45 fixtures…

  [32m✓[0m bare-hex-color
  [32m✓[0m hex-in-var-fallback (must NOT flag — ADS-canonical)
  [32m✓[0m hex-in-nested-var-fallback (must NOT flag)
  [32m✓[0m hex-in-token-fallback (must NOT flag — @atlaskit/tokens canonical)
  [32m✓[0m tailwind-text-size
  [32m✓[0m tailwind-font-weight
  [32m✓[0m tailwind-padding-utility
  [32m✓[0m tailwind-gap-utility
  [32m✓[0m tailwind-rounded-chrome
  [32m✓[0m tailwind-color-class
  [32m✓[0m tailwind-italic
  [32m✓[0m inline-uppercase
  [32m✓[0m tailwind-uppercase
  [32m✓[0m off-grid-padding
  [32m✓[0m on-grid-padding (must NOT flag — 4/8/16/24/32)
  [32m✓[0m on-grid-padding-with-border-on-same-line (must NOT flag)
  [32m✓[0m invalid-fontweight
  [32m✓[0m jira-fontweight-653 (must NOT flag)
  [32m✓[0m react-select-import
  [32m✓[0m storypoints-banned-field
  [32m✓[0m bare-rgb
  [32m✓[0m bare-rgba
  [32m✓[0m rgb-in-var-fallback (must NOT flag)
  [32m✓[0m react-toastify-import
  [32m✓[0m sonner-import (must NOT flag)
  [32m✓[0m react-hot-toast-import (must NOT flag)
  [32m✓[0m banned-column-story-points-th
  [32m✓[0m banned-column-mdt-ref-th
  [32m✓[0m atlaskit-button-legacy
  [32m✓[0m atlaskit-button-new (must NOT flag)
  [32m✓[0m non-ads-css-import
  [32m✓[0m atlaskit-css-import (must NOT flag)
  [32m✓[0m ignore-next-line marker exempts the following line
  [32m✓[0m ignore-next-line only exempts the immediately following line
  [32m✓[0m hex-in-jsdoc-block-comment
  [32m✓[0m rgb-in-jsdoc-block-comment
  [32m✓[0m google-fonts-import
  [32m✓[0m typekit-import
  [32m✓[0m atlassian-cdn-import (must NOT flag)
  [32m✓[0m google-fonts-link-tag
  [32m✓[0m fontawesome-link-tag
  [32m✓[0m atlassian-preconnect-link (must NOT flag)
  [32m✓[0m self-hosted-font-face
  [32m✓[0m atlassian-font-face (must NOT flag)
  [32m✓[0m dynamic-google-fonts-url-string

[1m━━ Result ━━[0m
[32m45 passed[0m, [2m0 failed[0m

[32m[1mAll audit rules verified.[0m
```

### ADS Audit Summary

```
  [TAILWIND_CLASS] src/components/board/BoardColumn.tsx:115
    Content: className="mt-4 text-xs font-semibold"
    Fix: Replace Tailwind utility "text-xs" with ADS token or inline style: fontSize/fontWeight/padding/margin/color from ADS tokens (var(--ds-*)).

  [TAILWIND_CLASS] src/components/board/BoardColumn.tsx:149
    Content: <div className="h-24 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 text-sm">
    Fix: Replace Tailwind utility "text-sm" with ADS token or inline style: fontSize/fontWeight/padding/margin/color from ADS tokens (var(--ds-*)).

  [TAILWIND_CLASS] src/components/board/BoardToolbar.tsx:85
    Content: <div className="px-6 py-2 border-t bg-gray-50 dark:bg-gray-900 flex items-center justify-between flex-wrap gap-4">
```

### Summary for This Run

TypeScript errors: 0
ADS self-test:     PASS

