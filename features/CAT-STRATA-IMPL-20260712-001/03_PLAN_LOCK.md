# 03 — PLAN LOCK · CAT-STRATA-IMPL-20260712-001 · Phase 0 + Phase 1

> STATUS: **DRAFT — awaiting Vikram approval. No code until approved.**
> Scope: STRATA design-pack Phase 0 (shared foundations) + Phase 1 (executive core) only.
> Grounded in: HANDOFF §1–§6, proposal §13/§14/§17/§18/§20, anchors 01/11/12/13, 5 discovery
> agents (`discovery/01–05`), anchor authority (`discovery/00_anchor_specs.md`), CRE + ADS gates.

## Objective
Bring the four Phase-1 surfaces to their anchors and build the shared foundations they consume,
using canonical components + `--ds-*` tokens only, protecting the map + sidebar/top-nav visuals.

## "Done" (Phase 0 + Phase 1)
- Command Center passes §20 first-screenful (condition/exceptions/value/trust/decisions) + five-verb
  chain restatable from entry + verdict→evidence preserves origin (`?from=`).
- My Work exists at `/strata/my-work` with verb groups + consequence column + role-sensitive home.
- Scorecards Index + Detail carry layout-matched skeletons, per-panel errors, role-aware empty +
  restricted states, and origin-preserving evidence links.
- Both themes reload-into-dark clean; states distinguishable in grayscale; keyboard-only actions.
- **Map zero-change preservation diff passes** (screenshot + behavior probe vs baseline).
- Both ADS gates stay GREEN (baseline unchanged or ratcheted down).

## Non-scope (forbidden this feature)
Phases 2–5. Any change to `StrataStrategyMapPage.tsx` graph/inspector/filters/legend. Any restyle
of `EnterpriseSidebar.tsx` or top nav (IA relabel + additive routes ONLY). New design tokens.
CatalystViewBase drawer integration (D-2 deferred). StrataLifecycleStepper (D-4 deferred).
v2/v3 concepts (posture fields, bubbles, decision fields, map overlays, glyph signatures).

## Canonical components (selected — reuse-first)
Reuse as-is: `StrataPageShell`, `ProjectPageHeader hubType="strata"`, `HubSurface`, `JiraTable`
(`density="compact"`), `useBandTone`, `StrataScoreRing`, `StrataValueBar`, `StrataBandLozenge`,
`StrataDataStateLozenge`, `StrataDecisionModal`, `@atlaskit/*` form controls, `EmptyState`,
`SectionMessage`, `fmtSarCompact`, `useStrataRoles`.
Extend: `StrataContextToolbar` (+ freshness slot, + scope), `JiraTableProps` (+ overflow prop).
Build new (canonical proof done in §18): `StrataChainStrip`, `StrataSnapshotBand`.

## Slices (each ≤ 2h; stop/split rule per CLAUDE.md)

### Slice 0A — Foundations: sidebar IA + context spine + JiraTable overflow prop
- `EnterpriseSidebar.tsx` `strataSidebarConfig`: relabel groups to the anchor-11 map
  (DIRECTION/MEASUREMENT/DELIVERY/VALUE/GOVERNANCE), add `My Work` item (badge=count),
  keep legacy routes additive + redirects. **DATA-ONLY — no style/token/layout change.**
- `StrataContextToolbar` (shared.tsx): add `freshness?`/`asOf?` slot + `scope?` (via StrataChipMenu);
  export or extend wrappers so every route can mount the full spine. No new primitive.
- `JiraTableProps` (`JiraTable/types.ts`) + `JiraTable.tsx`: add `overflowX?: 'hidden'|'auto'`
  (default 'hidden' = current behavior); remove the `<style>` injection hack from `StrataPageShell`.
- Files: `src/components/layout/EnterpriseSidebar.tsx`, `src/modules/strata/components/shared.tsx`,
  `src/components/shared/JiraTable/types.ts`, `src/components/shared/JiraTable/JiraTable.tsx`.

### Slice 0B — New canonical components
- `StrataChainStrip` (in shared.tsx): extract the `ChainItem`/`ChainEmpty` pattern from
  `StrataEvidencePage.tsx:107-338` into a reusable, param'd by chain segments (Lozenge/CatalystTag+links).
- `StrataSnapshotBand` (in shared.tsx): locked-mode chrome band (§18 API) — snapshot key + "as of" +
  supersedes; consumes `strata_snapshots`/`locked_snapshot_id` (already exist). Color never alone.
- Files: `src/modules/strata/components/shared.tsx` (+ refactor EvidencePage to consume StrataChainStrip
  WITHOUT visual change — behavior-preserving).

### Slice 1A — Command Center (`StrataCommandCenterPage.tsx`)
- Mount `StrataChainStrip` (five-verb chain) in shell (P0).
- Live/locked → chrome-level `StrataSnapshotBand` + freshness on spine (P0); demote toolbar lozenge.
- Thread `?from=` through `scorecardEvidence`/`portfolioEvidence`/`kpiEvidence` (P0) — add param in
  `routes.ts` builders + call sites; Evidence renders "Back to [origin]".
- Overdue → "n days overdue" in danger (P1); trend dots get accessible names + non-color label (P1);
  restricted/403 role-aware panel (P1); "Mine" no-results one-click Clear (P1); promote attention
  inbox above the fold per anchor 01 (confirm exact order at slice start) (P2).
- **D-3:** changes-since-snapshot = client-side diff (no RPC). Data-trust strip wires `lineageApi`.
- Drawer-first drill = **DEFERRED (D-2)**; full-page nav retained with origin preserved.

### Slice 1B — My Work (NEW `/strata/my-work`)
- New page `StrataMyWorkPage.tsx` (StrataPageShell L1, no trail/title); route in `StrataRoutes.tsx`
  (before catch-all); `strataRoutes.myWork()` in `routes.ts`; `routeRegistry.ts` entry; sidebar item (0A).
- `useMyWork()` aggregator over `needsAttention(owner_id=current_user)` + `decisions` + `actions`;
  verb-group mapping Validate/Submit/Resolve/Act (+Approve for admin); consequence column; Mine/Team
  toggle; MECE rank verb→severity→due. States per anchor 11. **No CRE chokepoint (D-5).**
- Zero-assumption: `owner_id IS NULL` never shows under "Mine"; uncovered verb group renders empty.

### Slice 1C — Scorecards Index (`StrataScorecardsPage.tsx`)
- Layout-matched skeleton (P1); per-panel SectionMessage errors (P1); role-aware empty w/ admin
  create CTA (P1); restricted/403 (P1); `docTitle` (P2); ranked-variance panel (client-derived, no RPC).

### Slice 1D — Scorecard Detail (`StrataScorecardDetailPage.tsx`)
- Thread `?from=` on Evidence button + line ⓘ (P0); role-gate Recalculate write for read-only viewers
  (P1); layout-matched skeleton (P1); restricted/403 (P1); explicit stale/partial label (P2).
- **D-6:** add dual-mode (slug|UUID) to `useScorecardInstanceBySlug`.

## Files forbidden (do not touch)
`src/modules/strata/pages/StrataStrategyMapPage.tsx` and its graph/inspector deps; any restyle of
`EnterpriseSidebar.tsx` beyond the data-only config; top-nav components' styling.

## UI/UX rules (enforced every slice)
ADS `--ds-*` tokens only (no hex/rgb/hsl/Tailwind color util/named color/local color map/hex fallback).
Color never alone (lozenges carry words, bands add ▲▼). Layout-matched skeletons; per-panel
SectionMessage (page never blanks); role-aware empty; explained restricted (never bare 403).
Context spine on 100% of routes. Escape returns focus. 32/44px min targets. prefers-reduced-motion.

## Data / backend rules
No migrations expected for Phase 0/1 (data agent verified: `strata_needs_attention` RPC,
`strata_scorecard_instances.slug`+trigger, `strata_snapshots` all exist). My Work needs a migration
ONLY if an anchor verb isn't covered by `strata_needs_attention` — flag before adding. RLS unchanged;
all writes surface server rejection text (§17). Zero-assumption rendering throughout.

## Integration / wiring
Attention inbox = `governanceApi.needsAttention` RPC (not a table). Scorecard Detail owner =
`scorecardApi`. My Work = `useMyWork` composing governance entities. `?from=` via `routes.ts` builders
only (no string concat). Slug resolution dual-mode (F4).

## Parallel execution plan
Slice 0A/0B are prerequisites → then 1A/1B/1C/1D can proceed in parallel worktrees (isolate per
concurrent-session rule). One slice = one commit. Branch off `origin/main` before any code.

## Screenshot + probe acceptance (QA)
Per slice, light+dark, 1440/1024/640: (1) DOM/DB probe proving function (not screenshots);
(2) ADS gates green; (3) grayscale-distinguishable states; (4) keyboard-only path.
**Map baseline:** capture screenshot + behavior probe of `/strata/strategy/map` BEFORE slice 0A and
diff after every slice — zero visual/behavioral change is a hard gate.

## Validation commands
`npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre`
· targeted vitest (note: Vitest run-risk per memory — verify runner before relying on it).

## Stop conditions
Any ADS/CRE gate regression; any map diff ≠ zero; any slice exceeding 2h (split); any anchor verb
needing a migration (raise before adding); any PROPOSED decision (D-1…D-6) still unresolved for the
slice it gates.

## Drift / rebaseline
If an anchor re-read at slice start contradicts this plan, log to `08_DRIFT_LOG.md` and stop for
re-decision — do not silently adapt.
