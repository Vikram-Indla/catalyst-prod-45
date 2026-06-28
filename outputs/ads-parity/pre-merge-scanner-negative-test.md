# Pre-Merge Scanner Negative Test
**Feature Work ID:** CAT-ADS-COMPLIANCE-20260627-001
**Date:** 2026-06-28

Purpose: Prove the scanner was not weakened by Phase 6 changes.

---

## Test Method

1. Injected a known raw hex violation as executable code into a non-protected, non-critical file.
2. Ran `node scripts/ads-color-gate.cjs`.
3. Confirmed gate FAILS (exit 1, count increased).
4. Reverted via `git checkout --`.
5. Confirmed gate PASSES again.

---

## Injection

**Target file:** `src/components/ads/AtlaskitPageShell.tsx`
(Non-protected, safe for temporary injection)

**Injected line:**
```ts
const _ADS_GATE_TEST = '#FF0000'; // ads-negative-test-code
```

**Method:** `echo "const _ADS_GATE_TEST = '#FF0000'; // ads-negative-test-code" >> src/components/ads/AtlaskitPageShell.tsx`

Note: First attempt used a comment (`// const _TEST = '#FF0000'`) — scanner correctly SKIPS comment lines. Second attempt used live code — scanner correctly CATCHES it.

---

## Results

| Step | Command | Output |
|---|---|---|
| 1. Inject | `echo ... >> AtlaskitPageShell.tsx` | File modified |
| 2. Gate with injection | `node scripts/ads-color-gate.cjs` | ❌ `hard-coded color count INCREASED: 35 (baseline 34, +1)` |
| 3. Revert | `git checkout -- src/components/ads/AtlaskitPageShell.tsx` | File restored |
| 4. Gate after revert | `node scripts/ads-color-gate.cjs` | ✅ `34 = baseline 34. No new hard-coded colors.` |

---

## Assessment

**VALIDATED** — Scanner correctly catches new violations. Gate correctly fails on injection. Gate correctly passes after revert.

The `ads-audit-gate.cjs` I/O change (spawnSync → tempfile) did NOT weaken detection:
- `parseCounts()` regex: UNCHANGED
- Fail-on-increase logic: UNCHANGED
- Baseline comparison: UNCHANGED
- Category list: UNCHANGED

Change was output-transport only (write to `/tmp/ads-audit-{pid}.txt`, read from file) to fix stdout truncation in git pre-commit hook context.
