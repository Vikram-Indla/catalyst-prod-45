# Session 001 — ADS-13 dark-chrome plan (2026-06-27)

## Rehydration findings
- PR2–PR6 token sweep: merged (PR #286, `33a8462`).
- Scanner fix (was "NEXT #1"): **already merged** — PR #287 `83bde822e`. Handover was stale.
- Local branch `feature/ads-token-parity-sweep` is BEHIND main.
- Feature folder did not exist on disk → created this session.

## Decisions
- User chose: Plan the ADS-13 patch.
- User chose scope: **Finding 1 only** (delete Group A footgun). Findings 3 & 4 deferred.

## Verification done (read-only, on stale feature branch tree)
- `index.css` dark rule opener: lines 6088–6089. Group A ≈6092–6124, Group B ramp 6125+.
- SAFETY GATE: `comm -23` Group-A vars vs Group-B vars = EMPTY → A ⊆ B → deletion is byte-identical.
- Finding 3 scale: 332 overlay-fallback occurrences in src/ (195 `#1f1f1f`, 129 `#ffffff`, 8 other),
  not "~40" as spec claimed → confirmed deferral justified.
- audit/contrast-probe.js + audit/dark-sweep-2026-04-30/ baselines present on disk.

## Next action
Plan Lock written (`03_PLAN_LOCK.md`). STOPPED before code, awaiting review/approval.
On approval: branch `fix/dark-chrome-ads13` off main, re-run safety gate, delete Group A, validate.
