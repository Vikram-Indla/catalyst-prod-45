# Planned task — Atlaskit dependency alignment (FeatureGate version skew)

**Status:** PLANNED / not started. **Priority:** low (tech debt, no confirmed functional impact).
**Requires:** full regression testing — do NOT ship without it.
**Raised:** 2026-07-11, from STRATA E2E v2 work (`CAT-STRATA-E2E-FIXES-20260711-001`).
**Decision (Vikram, 2026-07-11):** accept the console warning temporarily as known tech debt;
do NOT force a dependency pin; schedule this as a separate, regression-gated task.

## Known technical debt (accepted, temporary)
Runtime console warning: `@atlaskit/feature-gate-js-client` "version skew" — multiple client
instances initialise because two majors are present in the tree (5.8.0 and 6.0.0).
**No confirmed functional impact** — feature flags/gates resolve; it is a console log only.
QA should note-and-ignore this warning during E2E retesting (it is not a defect).

## Root cause (investigated 2026-07-11)
- Package manager is **Bun** (`bun.lock`); reinstall = `bun install`.
- The skew is driven by **two coexisting majors of `@atlaskit/platform-feature-flags`**:
  - older `platform-feature-flags@1.x` → requires `feature-gate ^5.x`
  - newer `platform-feature-flags@2.0.0` (bundled with newer `tokens` / `primitives` /
    `progress-tracker` / `react-compiler-gating`) → requires `feature-gate ^6.0.0`
- A `overrides["@atlaskit/feature-gate-js-client"]` pin does NOT resolve it (tested: no lockfile
  change; can't satisfy the `^6.0.0` subtree; forcing it would push 5.8.0 onto core tokens/primitives
  against their `^6.0.0` requirement → core-UI-breaking). Confirmed the pin is the wrong tool.

## Scope of the planned task
1. Identify the minimal set of `@atlaskit` packages to bump so `platform-feature-flags` (and thus
   `feature-gate-js-client`) converges to ONE major across the tree — i.e. align the older @atlaskit
   packages (editor, profilecard, react-ufo, tmp-editor-statsig, etc.) with the newer release train
   that `tokens`/`primitives`/`progress-tracker` already sit on.
2. Apply as a coordinated `@atlaskit` version bump (package.json + `bun install`), NOT a forced pin.
3. Regenerate `bun.lock`; verify a single `feature-gate-js-client` version remains on disk.

## Acceptance criteria
- Exactly one `@atlaskit/feature-gate-js-client` version resolved in `bun.lock` / `node_modules`.
- The "version skew" console warning is gone (verified live at `localhost:8080`).
- **Full regression pass** across STRATA + the wider app: build boots, all @atlaskit UI renders
  (tokens/primitives/editor/tables/modals), no new console errors, key flows exercised. Because
  Vitest cannot run in-env (see verification-risk note), regression is manual/E2E until the runner
  is fixed — budget for that.
- No unrelated dependency majors silently bumped (diff `bun.lock` deliberately).

## Guardrails
- Do NOT run this on the shared checkout mid-session (a `bun install` disrupts other sessions'
  running dev servers). Use an isolated worktree/branch.
- ADS-token rules unaffected (no app-code color/UI changes expected), but re-run the ADS audit if any
  component API shifts with the @atlaskit bump.
