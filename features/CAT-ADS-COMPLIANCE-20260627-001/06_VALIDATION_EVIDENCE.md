# CAT-ADS-COMPLIANCE-20260627-001 — Validation Evidence

> Raw output from validation commands. Append — never delete.

---

## Slice 1 — CI / pre-commit enforcement wiring (2026-06-27)

### Baseline capture
- `node scripts/no-hardcoded-colors.cjs` before scanner edit: **724** violations.
- After honoring the pre-existing `ads-scanner:ignore-next-line` convention (100 such comments already in `src`, scanner was not honoring them): **709**. Baseline set to 709 (the accurate honored count).

### Gate behaviour test (raw)
```
=== 1. Gate at baseline ===
✅ ads-color-gate: 709 = baseline 709. No new hard-coded colors.   (exit 0)

=== 2. Introduce a NEW bare hex (#ff00ff in a temp src file) ===
❌ ads-color-gate: hard-coded color count INCREASED: 710 (baseline 709, +1).  (exit 1)

=== 3. Same hex with `// ads-scanner:ignore-next-line` above it ===
✅ ads-color-gate: 709 = baseline 709. No new hard-coded colors.   (exit 0)

=== 4. Probe removed, gate re-run ===
✅ ads-color-gate: 709 = baseline 709. No new hard-coded colors.   (exit 0)
```
**Functional proof:** the ratchet blocks NEW bare colors (exit 1) but not existing debt, and the documented escape hatch neutralizes an intentional exception. Probe file deleted; tree clean.

### tsc-in-CI fix
- `tsconfig.app.json` confirmed present. CI step changed root `tsc --noEmit` (a no-op under project-references) → `tsc -p tsconfig.app.json --noEmit`. Kept `continue-on-error: true` because of the ~157-error baseline (per memory), so the fix surfaces errors in the CI log without breaking the build. Not asserting a clean tsc run — that is a separate burn-down.

### Not run (and why)
- `npm run test:visual` / screenshots: N/A — Slice 1 changes no rendered UI.
- vitest: broken on Node 20 (known) — not relevant; no app logic changed.

---

## Slice 2 — design-governance audit ratchet (2026-06-27)

### Baseline (from `node design-governance/rules/audit.js src`)
- tokens 28913, typography 2201, spacing 1118, fontImports 0 (total 32232; audit exits 1 in STRICT mode — gate parses counts, ignores exit code).

### Gate behaviour test (raw)
```
=== 1. baseline ===
✅ ads-audit-gate: no category above baseline — tokens 28913/28913, typography 2201/2201, spacing 1118/1118, fontImports 0/0.  (exit 0)

=== 2. inject Tailwind color util (text-red-500 bg-blue-100) in temp .tsx ===
❌ ads-audit-gate: design-governance violations INCREASED:
   tokens: 28914 (baseline 28913, +1)                                          (exit 1)

=== 3. probe removed ===
✅ ads-audit-gate: no category above baseline — tokens 28913/28913, ...        (exit 0)
```
**Functional proof:** per-category ratchet blocks a NEW Tailwind color utility (which the hex scanner cannot see) while leaving existing debt non-blocking.

### Robustness note
First regression run hit an incomplete-audit-output transient (~8.6 MB across thousands of file reads) → parse miss. Hardened: retry-once + fail-safe (block on unparseable) + maxBuffer 256 MB. Re-validated reliable across reruns. No rendered-UI change → no screenshots.
