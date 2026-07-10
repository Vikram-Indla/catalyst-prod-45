# Prevention — the unbypassable ADS color gate

Four layers. A dev must defeat ALL of them to land a hardcoded color; the last
layer is server-side and cannot be bypassed from a laptop.

## Layer 1 — IDE (advisory)
ESLint color rules already exist in `eslint.config.js` (`catalystBannedColors`,
`catalystBannedTailwindColors`) — red squiggles in-editor.
_Follow-up (Phase 0.5): add `@atlaskit/eslint-plugin-design-system`
`ensure-design-token-usage` for ADS-authoritative, auto-fixable hints._

## Layer 2 — pre-commit (local, bypassable with `--no-verify`)
`.husky/pre-commit` runs, blocking:
- `ads-color-changed-gate.cjs --staged` — **line-level**: any hardcoded color on
  a staged/added line fails. Pre-existing debt in the same file is grandfathered.
- `ads-color-strict-gate.cjs` — full-tree total/per-category can only go down.

## Layer 3 — CI (server-side, NOT bypassable)
`.github/workflows/ci.yml`:
- **ADS color HARD GATE** — `lint:colors:changed:ci` diffs `origin/main...HEAD`
  and fails the build on any color added on the branch. `--no-verify` on the
  local hook does NOT help — CI re-runs it.
- **ADS color strict ratchet** — full-tree down-only.

## Layer 4 — GitHub branch protection (the lock) — MANUAL, one-time
CI only *reports* unless `main` is protected. Do this once (repo admin):

> GitHub → Settings → Branches → Branch protection rules → `main`
> - ✅ Require a pull request before merging
> - ✅ Require status checks to pass before merging
>   - add required check: **`build`** (the CI job that runs the HARD GATE)
> - ✅ Require branches to be up to date before merging
> - ✅ Do not allow bypassing the above settings (applies to admins too)

Once required, a PR that adds a color has a **red required check** and the
merge button is disabled — for everyone, admins included. This is what makes it
so "even other developers cannot go through."

## Governed escape hatch
Genuine Jira-parity color with no ADS-token equivalent:
```
// ads-scanner:ignore-line -- Jira-parity, no ADS token, probed 2026-07-10 [CAT-XXXX]
```
The reason + issue id are mandatory; code review gates the exception.

## What each gate covers (blind spots closed)
| Blind spot (before) | Now caught by |
|---|---|
| `warn` + `continue-on-error` = decorative | changed-gate is `exit 1`, CI-required |
| `var(--ds-*, #hex)` fallback whitelisted | detector category `fallback-hex` = violation |
| scanner false-0 (comment-tracker bug) | `ads-color-detect.cjs` real state machine |
| only `.ts/.tsx/.css/.scss` | + `.js/.jsx` in `SCAN_EXTENSIONS` |
| named colors (`white`,`red`,`gold`) | detector `named` category |
| SVG `fill="#fff"` / `stroke=` | caught as `hex` in JSX/attr text |
| tailwind `bg-blue-500` not in color gate | detector `tailwind` category |
