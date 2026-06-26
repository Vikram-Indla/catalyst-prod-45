# 00 — READ ME FIRST

**Feature Work ID:** CAT-ADS-TOKEN-PARITY-20260626-004
**Title:** ADS (Atlassian Design System) token parity for Catalyst — styling-only.

## What this feature is
Bring Catalyst's colors onto ADS `--ds-*` tokens (light + dark), fix dark-mode
chrome failures, and wrap the hardcoded-hex long tail behind `var(--ds-token, #hex)`
fallbacks. **No behavior / data / route / schema change — ever.**

## Source of truth (verified identical, two copies)
- In-repo: `feature-branch/` (untracked) — the changeset bundle (maps + corrective files + ADS-13 patch).
- `~/Downloads/feature-branch/` — byte-identical copy (`diff -rq` clean).
- Detailed canonical record: `docs/reports/ads-token-parity/FINAL-REPORT.md` + `PLAN-LOCK.md` (in repo, tracked).

## Where things stand (verified on `main`, 2026-06-27)
| Lane | PR | Status |
|---|---|---|
| WIDE (global `--ds-*` theme + chart tokens + workstream consolidation) | #284 `60d280fcc` | ✅ merged |
| PR2–PR6 map-named bare-hex sweep | #286 `33a846230` | ✅ merged |
| Scanner runnable + ~85% false-positive drop | #287 `83bde822e` | ✅ merged |
| **ADS-13 dark-chrome patch** | branch `fix/dark-chrome-ads13` | ⏳ **active — Finding 1 applied, uncommitted** |
| PR7–PR9 long-tail | — | ⛔ blocked on Claude Design hex→token mappings (265 unmapped) |

## If you are resuming
Read in order: `00` (this) → `01_OBJECTIVE` → `03_PLAN_LOCK` (ADS-13 slice) →
`07_HANDOVER` → `08_DRIFT_LOG` → `09_DECISIONS` → `11_KARPATHY_LOOP_LOG`, then the
canonical `docs/reports/ads-token-parity/FINAL-REPORT.md`.

**Do not invent hex→token mappings. Do not change behavior. Stage explicit files only.**
