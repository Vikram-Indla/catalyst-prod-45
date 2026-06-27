# CAT-ADS-COMPLIANCE-20260627-001 — Plan Lock

> Status: SLICE CHOSEN (CI/pre-commit enforcement) — awaiting final go-ahead. NO CODE until "proceed".
> See template: docs/ways-of-working/CATALYST_PLAN_LOCK_TEMPLATE.md

## Feature Work ID
CAT-ADS-COMPLIANCE-20260627-001

## Feature name
ads compliance (Atlassian Design System)

## Timebox
2 hours — one slice (Slice 1 only this Plan Lock).

## Objective
Stop NEW ADS violations from landing by making the existing scanner + typecheck actually gate, without touching any rendered UI.

## Business outcome
Compliance count stops drifting upward; every later remediation slice is protected by a regression gate.

## Exact slice (RECOMMENDED Slice 1 — CI / pre-commit enforcement wiring)
1. Add npm scripts: `lint:colors` → `node scripts/no-hardcoded-colors.cjs`; `audit:ads` → `node design-governance/rules/audit.js src/`.
2. Fix the CI tsc no-op: `.github/workflows/ci.yml` → `npx tsc -p tsconfig.app.json --noEmit` (keep `continue-on-error` for now given ~157 baseline errors; log count).
3. Make `.husky/pre-commit` FAIL on scanner regression (replace `exit 0` with real exit code) — gated so it does not block on the existing baseline (compare against committed baseline count, fail only on INCREASE).
4. Document the escape-hatch (`// ads-scanner:ignore-next-line`) and the new scripts in CLAUDE.md.

## Alternative Slice 1 (if JK prefers visual remediation first)
ADS-13 Finding 3 — standardize ~332 `var(--ds-surface-overlay, #…)` fallbacks to `#282E33`. Higher value, but 100–120 files, high visual blast radius → requires full light/dark screenshot + contrast acceptance.

## Non-scope (this Plan Lock)
- 265 unmapped hexes (BLOCKED), Tailwind arbitraries (BLOCKED), hand-rolled tables (future).
- No token swaps, no rendered-UI edits in Slice 1 (recommended path).

## Canonical components
N/A for Slice 1 (tooling only). Token modules referenced: `references/ads-token-map.md`, `src/lib/catalyst-tokens.ts`.

## Canonical screens
N/A for Slice 1.

## Files to modify (Slice 1 recommended)
- `package.json` — add `lint:colors`, `audit:ads` scripts.
- `.github/workflows/ci.yml` — fix tsc invocation.
- `.husky/pre-commit` — fail-on-increase gating.
- `CLAUDE.md` — document scripts + escape-hatch.
- (new) `design-governance/baseline.json` or similar — committed baseline count for the gate.

## Files forbidden
- Any `src/**` rendered component or `.css` (no UI edits in Slice 1).
- `statusPalette.ts`, `src/index.css` lines ~239–247, `workstreamColors.ts` — PROTECTED colors, never touch.
- `src/stories/**`, `src/theme/tokens.ts` — known false-positive zones.

## UI/UX rules
ADS tokens only, no bare colors, no hand-rolled UI. (Slice 1 changes no UI.)

## Data/backend rules
None — no DB, no migration, no RLS impact.

## Integration/wiring rules
Gate must fail only on a count INCREASE vs committed baseline, so the existing ~574 baseline does not break the build during migration.

## Parallel discovery agents
All seven ran 2026-06-27 — see 12_AGENT_OUTPUTS.md.

## Karpathy loop hypotheses
- [LOOP-001] ADS = Atlassian Design System (KEEP)
- [LOOP-002] tooling already mature (DISCARD "build scanner")
- [LOOP-003] bulk-wrap is BLOCKED (DISCARD "wrap now")
- [LOOP-004] CI enforcement = safest first slice (KEEP, pending choice)

## Screenshot checklist
- Slice 1 (recommended): none required (no UI change) — functional proof only (scanner exits, CI log, intentional-violation test fires + escape-hatch works).
- Alternative Slice 1 (Finding 3): light + dark before/after on affected overlays + contrast probe.

## Validation commands
```bash
node scripts/no-hardcoded-colors.cjs            # exit 0 = pass
npm run scan:ads-violations                      # count delta
npx tsc -p tsconfig.app.json --noEmit            # ~157 baseline
npm run lint
# vitest broken on Node 20 → DOM probe via Chrome MCP on localhost:8080 if UI touched
```

## Regression risks
- Slice 1: a too-strict gate breaks every contributor's commit → mitigated by fail-on-increase-only.
- Alternative: overlay fallback swap shifts dark-mode elevation → mitigated by contrast probe + screenshots.

## Stop conditions
- Any banned color introduced → stop
- Any hand-rolled UI introduced → stop
- TypeScript error count rises above baseline → stop
- Any protected color touched → stop + RED FLAG

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only. Commit message references CAT-ADS-COMPLIANCE-20260627-001. Branch off main first.

## Plan Lock status
SLICE 1 LOCKED = CI / pre-commit enforcement wiring (JK chose 2026-06-27). SHIPPED — PR #289.
Alternative (ADS-13 Finding 3) deferred to a later slice.

---

# SLICE 2 — Extend the ratchet to the full design-governance audit

> Status: SLICE CHOSEN (JK, 2026-06-27). Awaiting "proceed". NO CODE until then.

## Timebox
≤ 2 hours, one slice. Tooling only.

## Objective
Add a per-category fail-on-increase ratchet over `npm run audit:ads` (design-governance: tokens, typography, spacing, fontImports) and wire it blocking into pre-commit + CI — so NEW Tailwind color utilities / hardcoded font sizes / off-grid spacing cannot land. Extends Slice 1's proven pattern beyond the hex scanner.

## Business outcome
Catches the ~200 Tailwind color violations (and typography/spacing drift) the hex scanner does not see. Stops all-category drift at near-zero risk.

## Exact slice
1. `scripts/ads-audit-gate.cjs` (NEW) — spawn `node design-governance/rules/audit.js src`, parse the per-category summary (`tokens|typography|spacing|fontImports: N`), compare each to baseline, fail if ANY category exceeds its baseline. Ignore the audit's own exit code (it always exits 1 in STRICT mode); rely on parsed counts. `--update` rewrites baselines down.
2. `design-governance/audit-baseline.json` (NEW) — committed per-category baselines (tokens 28913, typography 2201, spacing 1118, fontImports 0 — re-measured at implementation time).
3. `package.json` — add `audit:ads:gate` → `node scripts/ads-audit-gate.cjs`.
4. `.husky/pre-commit` — add the audit ratchet as BLOCKING (alongside the color ratchet).
5. `.github/workflows/ci.yml` — add `audit:ads:gate` blocking step.
6. `CLAUDE.md` — document `audit:ads:gate` + per-category ratchet under the enforcement subsection.

## Non-scope (Slice 2)
- No remediation of any violation (no count reduction; pure regression guard).
- No change to rendered UI / `.css` / `.tsx` components.
- Not touching the noisy `tokens` false positives — the ratchet is increase-only, so noise is inert.

## Files to modify
- `scripts/ads-audit-gate.cjs` (new), `design-governance/audit-baseline.json` (new), `package.json`, `.husky/pre-commit`, `.github/workflows/ci.yml`, `CLAUDE.md`.

## Files forbidden
- Any `src/**` component/CSS. Protected colors. `design-governance/rules/*` validators (do not change detection logic this slice).

## UI/UX rules
No UI change.

## Validation commands
```bash
node scripts/ads-audit-gate.cjs                  # PASS at baseline
# inject a Tailwind color util in a temp src file → gate FAILS (exit 1)
# remove → gate PASSES
node scripts/ads-audit-gate.cjs --update         # ratchet down
```

## Regression risks
- A flaky/slow audit in pre-commit annoys contributors → audit already runs in pre-commit today (informational); we only add a parse+compare, no extra full run if we reuse output. Mitigate: single audit invocation.
- Category parse breaks if audit output format changes → gate fails loudly (exit 1, prints raw) rather than silently passing.

## Stop conditions
- Any rendered UI/CSS touched → stop (out of scope).
- Audit output unparseable → stop, do not weaken the gate to pass-through.

## Commit rules
Stage explicit files only. Same branch (`feature/ads-compliance-ci-enforcement`) → same PR #289, or new branch if JK prefers a separate PR.

## Slice 2 status
EXECUTED (JK proceed, 2026-06-27). Shipped to PR #289. Validated: baseline pass, Tailwind-color-util injection → fail (exit 1), cleanup pass.
