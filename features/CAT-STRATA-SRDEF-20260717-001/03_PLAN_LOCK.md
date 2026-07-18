# 03 — PLAN LOCK — CAT-STRATA-SRDEF-20260717-001

**Objective:** Fix the four evidence-backed STRATA Strategy Room defects (SR-DEF-001..004) from
`/Users/jahanarakhan/Documents/17 Jul strata testing/STRATA_TESTING/`, in the order P1 → P2.

**Authorised by:** J (dispatch `00_CLAUDE_DISPATCH_STRATEGY_ROOM.md`), scope decisions confirmed by Vikram 2026-07-17.

**Non-scope:**
- Defect closure and Cycle 4 regression — Codex owns independent retest.
- Rewriting historical audit rows (existing duplicates stay; historical integrity preserved).
- The pre-existing migration-ledger drift (1308 local files vs 1289 applied; duplicate version
  prefixes `2026-06-28`, `20260706120000`) — known parked issue D-1, not touched here.
- The latent legacy-`'play'` row-menu bug noted at `StrataStrategyRoomPage.tsx:588` (bare `'theme'`
  string vs `isThemeElement()` helper) beyond what SR-DEF-003 requires.

## Confirmed decisions

| # | Decision | Rationale |
|---|---|---|
| D-1 | Target DB = **staging `cyijbdeuehohvhnsywig`** | Probed: staging holds J's exact test data (`J Cycle 1 Revenue Assurance Objective`, 2 create events). No prod DDL. |
| D-2 | Branch `strata/sr-defect-pack` off `origin/main`, isolated worktree | Contract: one session = one worktree; keeps pack out of `strata/measures-2b`. |
| D-3 | SR-DEF-002: generic `strata_audit()` trigger is sole writer; remove manual audit INSERT from **all four** create RPCs | Trigger is the uniform SoT across 8 tables and carries actor + before/after. |
| D-4 | SR-DEF-004: `count={themeOkrs.length}` only | Counter must agree with the rendered "Objective Key Results" list. |
| D-5 | SR-DEF-001: date fields use **day-first `dd/MM/yyyy`** via `dateFormat` + `parseInputValue` | STRATA's own `format.ts:64` renders dates en-GB day-first ("17 Jul 2026"). Picker defaulted to `en-US` month-first, so `31/12/2027` was literally unparseable. Acceptance requires that date to be accepted. |

## Evidence baseline (probed on staging, 2026-07-17)

- `J Cycle 1 Revenue Assurance Objective` (`7e6c5dd3-…`): `okrs=1`, `linked_kpis=1` → header showed `1+1=2` → SR-DEF-004 reproduced.
- Same objective: audit rows `INSERT @ 08:14:34.961414+00` and `RPC:create_strategy_element @ 08:14:34.961414+00` — identical timestamp → SR-DEF-002 reproduced.
- `createLocalizationProvider('en-US').parseDate('31/12/2027')` → **Invalid Date**; `'en-GB'` → valid → SR-DEF-001 locale root cause.

## Root causes (verified at file:line, all on `origin/main`)

| Defect | Root cause | Migration |
|---|---|---|
| SR-DEF-001 | `@atlaskit/datetime-picker` commits `onChange` only on calendar-select / Enter / clear — never on typed-text + blur (`date-picker.js:289-306`). Form model stays `null`; client check `authoring.tsx:263-269` emits `Required: Starts on, Ends on` before the RPC is reached. Compounded by `en-US` default vs STRATA's day-first display. | No |
| SR-DEF-002 | Double-write: `strata_audit()` AFTER-INSERT trigger (`20260705100100:249-253`) **and** RPC's own INSERT (`20260705140100:105-107`). `format.ts:88-97` maps both actions to label "Created". | **Yes** |
| SR-DEF-003 | Charter + decision-linkage already exist server-side and are type-unrestricted; UI gates them behind `isTheme`/`element_type === 'theme'`. Only Project-Card↔objective link has no write verb. | **Yes** (card link only) |
| SR-DEF-004 | `StrataStrategyElementDetailPage.tsx:407` sums two unrelated entity arrays. No join fan-out. | No |

## Files to modify

- `src/modules/strata/components/authoring.tsx` — date field commit-on-blur + day-first format; per-field invalid message; optional `validate` hook.
- `src/modules/strata/pages/StrataStrategyRoomPage.tsx` — un-gate Charter for objectives; cycle start<end validation.
- `src/modules/strata/pages/StrataStrategyElementDetailPage.tsx` — un-gate Charter/Governance/Project-Cards for objectives; OKR count fix; card link/unlink UI.
- `src/modules/strata/pages/StrataReviewsPage.tsx` — objective reference on New decision.
- `src/modules/strata/domain/index.ts` — card↔objective link/unlink API.
- `supabase/migrations/20260718*` — audit de-duplication; card↔objective link RPCs.
- Tests under `src/modules/strata/__tests__/`.

## Files forbidden

- Anything outside `src/modules/strata/**`, `supabase/migrations/**`, `features/**`, and the test-pack docs.
- No edits to `strata_audit()` trigger function itself (uniform across 8 tables).

## Guardrails

- ADS tokens only — no hex/rgb/Tailwind colours. Run `lint:colors:changed:ci` + `build` before commit (four gates, per lesson).
- No hand-rolled UI — reuse `StrataFormModal`, `KpiLinksModal` pattern, `@atlaskit/*`.
- Zero-assumption rendering — unparseable date commits `null`, never a guessed date.
- Stage explicit files only; never `git add -A`.

## Validation commands

```
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm test -- src/modules/strata
npm run lint:colors:changed:ci
npm run build
```

## Stop conditions

- Any migration failing on staging → stop, report, do not retry against prod.
- Any regression in existing STRATA tests → stop, raise RED FLAG.
