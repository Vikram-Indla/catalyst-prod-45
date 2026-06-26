# 11 — KARPATHY LOOP LOG

Hypothesis → Experiment → Measure → Keep/Discard → Log.

## L1 — Is the scanner "NEXT #1" still outstanding?
- **H:** scanner fix is the next task (per handover).
- **E:** `git log main` for ads-parity/scanner commits.
- **M:** PR #287 `83bde822e` "make color scanner runnable + drop ~85% false positives" already on main.
- **K/D:** Discard the task — done. Only ADS-13 remains.

## L2 — Is deleting Group A render-safe?
- **H:** Group B overrides Group A by source order, so Group A is dead.
- **E:** `comm -23` of var names set in Group A (6092–6119) vs Group B (6125–6159), on `main`.
- **M:** EMPTY → every Group A property is re-declared by Group B at equal specificity (A ⊆ B; B has 5 extra).
- **K/D:** Keep — deletion is byte-identical at render. Footgun-removal justified.

## L3 — How big is Finding 3 really?
- **H:** bundle says overlay-fallback standardization touches "~40 stylesheets."
- **E:** `grep -rn 'ds-surface-overlay, #…' src/`.
- **M:** **332 occurrences** (195 `#1f1f1f`, 129 `#ffffff`, 8 other).
- **K/D:** Discard from this slice — 8× larger than stated; defer to its own slice (D3).

## L4 — Does the dark ramp still resolve after the edit?
- **H:** removing Group A must not collapse surface elevation.
- **E:** dev server :8080, force `.dark`+`data-color-mode="dark"`, read computed `--ds-surface*`.
- **M:** `overlayLiftedAboveBase: true` — overlay `#282e33` sits above base `#22272b`.
- **K/D:** Keep — elevation intact, no regression.

## L5 — Are the WIDE-lane artifacts actually on main (not assumed)?
- **H:** continuation context says WIDE lane merged (#284) and byte-identical.
- **E:** `diff -q` repo file vs `feature-branch/` for parity.css, chart-tokens.css, workstreamColors.ts; `ls packages/tokens`.
- **M:** all three byte-identical & imported at `main.tsx:10-11`; no `packages/tokens/` dir.
- **K/D:** Keep — reconciliation confirmed; `definitions.ts` correctly N/A.
