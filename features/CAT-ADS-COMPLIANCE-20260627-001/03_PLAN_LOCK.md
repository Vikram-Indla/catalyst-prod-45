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
SLICE 1 LOCKED = CI / pre-commit enforcement wiring (JK chose 2026-06-27). Alternative (ADS-13 Finding 3) deferred to a later slice.
Awaiting explicit "proceed" from JK before implementation. No app code until then.
