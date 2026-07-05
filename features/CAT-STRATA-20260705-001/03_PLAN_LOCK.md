# CAT-STRATA-20260705-001 — Plan Lock

> Status: **APPROVED — owner directive 2026-07-05** (Vikram: Q1–Q8 answered in-chat; Phase 2 mock gate waived via D-010; "/goal implement with highest precision and high fidelity").
> Scope: **Phase 3 implementation** — R0 foundation + R1 strategy/scorecard/KPI + execution/value/lineage/governance domains + the 10 surfaces, per DISCOVERY_REPORT.md §3 architecture and D-001…D-011.
> Supersedes the Phase 2-only draft below, which is retained for the design rules that remain binding during implementation.
>
> **Implementation addenda (binding):**
> - Work happens in an isolated worktree/branch off origin/main; the shared checkout is never touched (D-011).
> - DB: staging first; `strata_` namespace; strict RLS; SECURITY DEFINER RPCs for sensitive writes; approver≠submitter in DB; snapshots INSERT-only (D-004).
> - Calc engine per D-003/Q5; UI computes zero scores.
> - Ingestion: uploads + Jira adapter only (Q6). Board packs: PDF + PPTX (Q7). Single tenant (Q4). Salam = labeled demo seed (Q8).
> - /strategyhub tile repurposed → /strata with App.tsx-mounted redirect (Q1); old strategy/okr surfaces unrouted now, deleted + tables dropped in a later cleanup slice (Q2, D-009).
> - Files-to-modify list of the Phase 2 draft is replaced by: `src/modules/strata/**` (new), `supabase/migrations/2026*_strata_*.sql` (new), plus surgical edits to `src/lib/hubs.ts`, `src/routes/FullAppRoutes.tsx`, `src/lib/routes.ts`, `src/config/routeRegistry.ts`, `src/App.tsx` (redirects), feature-flag wiring. Everything else remains forbidden.

## Feature Work ID
CAT-STRATA-20260705-001

## Feature name
STRATA — greenfield strategy execution / scorecard / value realization module

## Timebox
Phase 2 executed as design slices ≤2h each (one slice ≈ 2–3 screenshot surfaces); hard stop after the 10-screenshot pack.

## Objective
Design the executive-grade STRATA product (10 mandatory screens) on Catalyst canonical components + ADS tokens, and stop for approval before any implementation.

## Business outcome
A CIO/CXO-reviewable design pack proving STRATA feels like a fresh command product (not CRUD/PPM/old scorecard), with configuration-awareness, lineage evidence, and governance states visible on every screen.

## Exact slice (Phase 2 scope)
- High-fidelity designs/mocks for the 10 screens in 10_SCREENSHOT_CHECKLIST.md
- Design rationale, canonical-component mapping, non-canonical justifications
- Accessibility + responsive review, UX risk register
- Explicit approval request: "Approve Phase 2 UI/UX so I can begin Phase 3 implementation?"

## Non-scope (this Plan Lock)
- Migrations, seeds, DB objects of any kind
- Permanent services, hooks wired to production data
- Route mounting in FullAppRoutes / HUBS[] changes
- Deleting or patching es_*/strategyhub residue
- AI features

## Canonical components (selected — evidence in 02_CANONICAL_DISCOVERY.md)
JiraTable (+editors), StatusLozenge/statusPalette, DangerConfirmModal, EmptyState, PageContainer, @atlaskit/pragmatic-drag-and-drop, CatyIconCTA/CatyPulseIcon (AI advisory markers only), @atlaskit form suite, @xyflow/react (canvas — ADS-styled), react-resizable-panels (split panes), recharts.

## Canonical screens (benchmarks)
ReleaseHub CommandCenterPage, ProjectDashboardPage widget grid, ReleaseDetailPage detail shell. Anti-benchmark: AdminAccessPage CRUD style, ComingSoon stubs.

## Files to modify (Phase 2)
- features/CAT-STRATA-20260705-001/** (design artifacts, evidence, checklists) ONLY.
- Any throwaway design prototypes live outside src/ or in a clearly-marked sandbox that is never routed or committed to src/.

## Files forbidden (Phase 2)
- src/** (all), supabase/** (all), package.json — no production code until Phase 3 approval.

## UI/UX rules
- ADS tokens only; ratchet gates must stay flat; statusPalette untouched.
- Every screen shows: selected scorecard model + cycle + period + config version; data-state lozenge (live / draft / pending-validation / locked).
- Every metric has an evidence affordance (drawer/drilldown: owner, formula version, target, source run, validation, snapshot).
- Route-first drilldowns (bookmarkable); modals only for quick-create/confirm.
- Dark mode + 768/1024/1440 responsive designs; keyboard/a11y noted per screen.
- No placeholder metrics; demo data clearly labeled as Salam demo tenant config.
- Admin screens are a governed control plane (versions, approvals, effective dates visible), not forms.

## Data/backend rules (design constraints for Phase 3, locked now)
- Configuration-first: no business truth in frontend constants; all governed metadata versioned + effective-dated + approved + audited.
- UI never calculates enterprise scores; calc engine = RPCs + versioned formula metadata returning provenance.
- strata_ table namespace; strict RLS; SECURITY DEFINER RPCs for sensitive writes; approver ≠ submitter in DB; snapshots INSERT-only + supersede flow.
- ProjectCard source-agnostic behind mapping seam; STRATA UI never reads ph_* Jira tables.

## Integration/wiring rules
- None in Phase 2. Phase 3: Jira adapter via sync_entity_map/sync_events conventions, config-driven field mappings.

## Parallel discovery agents
All mandatory agents ran 2026-07-05 (10 lanes; outputs in 12_AGENT_OUTPUTS.md). ✔

## Karpathy loop hypotheses
LOOP-001…LOOP-009 logged in 11_KARPATHY_LOOP_LOG.md; design-phase loops to be appended.

## Screenshot checklist
See 10_SCREENSHOT_CHECKLIST.md — exactly 10 screens, then HARD STOP.

## Validation commands (Phase 2)
Design phase: screenshot pack + design rationale + a11y/responsive review. (Code gates apply from Phase 3: `npx tsc -p tsconfig.app.json --noEmit`, `npm run lint`, `npm run lint:colors:gate`, `npm run lint:fallback-hex:gate`, `npm run audit:ads:gate`, `npm run lint:cre`, `npx vitest run`.)

## Regression risks
None in Phase 2 (no src/ changes). Register for Phase 3 in DISCOVERY_REPORT.md §5 (R1–R12).

## Stop conditions
- Any temptation to implement before screenshot approval → STOP (hard gate).
- Any banned color / hand-rolled UI in designs → STOP and fix.
- Owner questions Q1, Q3 unanswered when they block IA → STOP and ask.
- Conflict between blueprint and Catalyst contract → STOP and raise.

## Rebaseline rules
After one correction loop on a design slice: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only (feature-folder artifacts). Commit message must reference CAT-STRATA-20260705-001. No src/ or supabase/ files in Phase 2 commits.

## Open questions blocking parts of this plan
Q1 (hub placement), Q3 (canonical screenshot list), Q4 (tenancy), Q5 (calc engine confirm), Q6 (connector deferral), Q7 (board pack format), Q8 (Salam seed) — full text in DISCOVERY_REPORT.md §8.

## Plan Lock status
DRAFT — Vikram/JK must approve before Phase 2 design work begins. Phase 3 requires a further explicit approval after the 10-screenshot hard stop.
