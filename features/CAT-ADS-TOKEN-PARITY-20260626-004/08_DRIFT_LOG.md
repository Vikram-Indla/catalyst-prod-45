# 08 — DRIFT LOG

Append-only. Records corrections to avoid repeating mistakes.

## 2026-06-27 — Corrected: "feature folder is outside the repo" (WRONG)
- **Claim made:** the `~/catalyst/features/...` docs live outside the repo and won't be committed.
- **Reality:** `~/catalyst` is a **symlink → the repo root** (`…/catalyst-prod-45/Catalyst-web`).
  `~/catalyst/features/` IS `Catalyst-web/features/` (same inode `80943881`). `features/` is
  **not** gitignored, and sibling feature folders (`...-003`, `...-001`) are **tracked in git**.
- **Impact:** the 004 docs are untracked files **inside** the working tree. They will NOT enter a
  commit unless explicitly `git add`-ed — but they are in-repo, not external.
- **Lesson:** verify symlinks (`ls -ld`, `stat -f %i`) before asserting a path is "outside the repo."

## 2026-06-27 — In-repo `feature-branch/` discovered alongside `~/Downloads` copy
- A second copy of the changeset bundle exists at repo-root `feature-branch/` (untracked,
  byte-identical to `~/Downloads/feature-branch/`). Reconciled in `02_CANONICAL_DISCOVERY.md`.
  No conflict; either is authoritative.

## 2026-06-27 — Stale handover item ("NEXT #1 = scanner fix")
- Continuation context listed the scanner fix as the next task; it was **already merged** as
  PR #287 (`83bde822e`). Corrected: only ADS-13 remains actionable.

## Guard
No drift from scope: ADS-13 slice is Finding 1 only. Findings 3 (332 overlay fallbacks) and 4
(nav-text scope) are deferred, not silently expanded. PR7–PR9 stay blocked pending Design mappings.
