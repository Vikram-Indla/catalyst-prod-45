# Preflight handover — Admin function full clean-up — 2026-05-09

## Context
- Surface: cross-cutting (ui-feature + ui-bug-fix + ui-refactor + design-only across 35+ admin routes; vertical front-to-back; dead-wood removal)
- Tier: high-stake
- Started: 2026-05-09
- Council ran: no (recommended before Phase B; per skill, high-stake requires `/preflight --council`)
- Original prompt: route-by-route admin cleanup, transform UI heavily on design, find anomalies (design + ADS), remove dead wood, vertical probe front-end to back-end so admin functions like Jira, validate content per admin function (not just design). Anchor URL: localhost:8080/admin/overview.

## Decision (council verdict)
Pending. Phase A (inventory + audit) does not require the council. Phase B (cross-cutting ADS chrome migration) is gated on `/preflight --council` per the high-stake tier rules.

## Phase 0 findings — confirmed by file probe
1. Two parallel admin shells: `/admin/*` (legacy AdminLayout + AdminSidebarV2, Tailwind/shadcn) and `/admin/v2/*` (newer AdminV2Shell behind admin_v2_enabled flag). Naming overlap = churn debt. Fate decision deferred to plan row A6.
2. ZERO `@atlaskit/*` primitives in admin chrome. AdminLayout uses `bg-background flex h-screen` (Tailwind). AdminSidebarV2 imports `lucide-react`, `@/components/ui/input`, `@/components/ui/scroll-area`, `@/components/ui/collapsible` (shadcn). AdminOverview imports `Card`, `Button`, `Input` from `@/components/ui/*`. This is the "broken UI" the user sees.
3. Sidebar advertises 14+ routes that are not registered in the router — `/admin/users-access`, `/admin/budget`, `/admin/general`, `/admin/details-panels`, `/admin/announcements`, `/admin/general-settings`, `/admin/resource-locations`, `/admin/resource-countries`, `/admin/resource-vendors`, `/admin/software-licenses`, `/admin/module-matrix`, `/admin/resource-utilization`, `/admin/jira-config`, `/admin/activity` — clicking falls through to NotFound. Dead links across most pockets.
4. Admin pages range 39 LOC (stubs: Programs, JiraSyncControlPage) to 1187 LOC (ResourceAssignments). Severe abstraction inconsistency.
5. `src/_graveyard/admin/` already populated (Announcements, BusinessProcesses, CreateMenuConfig, DeliveryPlatforms, DetailsPanels, GeneralSettings, KBAdminPage, ModuleMatrixPage, ResourceCountries, ResourceLocations, ResourceUtilization, ResourceVendors, RiskSeverityLevels, SlackIntegrationPage, Users, WikiAdminPage, WikiDiagnosticPage). Sidebar still references several of these by name.
6. WorkHub and Wiki admin live in module-local trees (`src/modules/workhub/admin/`, `src/components/wiki/admin/`) — not in `src/pages/admin/`. Inconsistent location.

## Plan
See full Phase A→E table in the preflight transcript. Five phases:
- **A — Inventory + audit (no code).** A1 route inventory, A2 vertical data map, A3 ADS audit, A4 jira-compare baseline, A5 dead-wood list, A6 v1-vs-v2 decision.
- **B — Cross-cutting chrome migration.** Gated on /preflight --council. Migrates AdminLayout + AdminSidebarV2 to @atlaskit/* primitives. B7 Vikram sign-off before Phase C.
- **C — Per-route remediation.** 11 pockets, 6-row sub-plan per pocket. TDD + ADS + schema-probe + jira-compare + CRUD + Vikram-per-pocket gates.
- **D — Vertical back-end cleanup.** RLS audit (D1), edge-function hardening (D2), activity-log coverage (D3), dead-wood deletion (D4 — Vikram-per-file).
- **E — Final gates.** Full-tree ADS sweep (E1), full jira-compare (E2), review skill (E3), security-review (E4), Vikram final sign-off (E5), CLAUDE.md lesson append (E6).

## Mandatory gates baked into the plan
- TDD failing-test row before every implementation row.
- ADS-only enforcement (B5, E1) and per-row design-intelligence calls.
- Ask-Vikram rows: A5, A6, B4, B7, C{N}.2, C{N}.6, D4, E5, E6.
- jira-compare rows: A4, B6, C{N}.4, E2.
- CRUD acceptance per pocket: C{N}.5.
- Schema-probe per anti-pattern #18: C{N}.2.

## Pocket order (Phase C)
1. Overview, 2. Users & Access (7 pages), 3. General / Configuration (5), 4. Reference Data (8), 5. Workflows (1+editor), 6. Field Config / Incidents (7), 7. WorkHub (9), 8. Integrations, 9. Developer, 10. KB / Wiki Admin, 11. Admin v2.

## Progress
- [x] Phase 0 bootstrap complete
- [x] Plan synthesized
- [x] Handover stub written
- [ ] A1 route inventory
- [ ] A2 vertical data map
- [ ] A3 ADS audit
- [ ] A4 jira-compare baseline
- [ ] A5 dead-wood list (Vikram approval gate)
- [ ] A6 /admin vs /admin/v2 decision (Vikram decision gate)
- [ ] /preflight --council before Phase B
- [ ] Phase B chrome migration
- [ ] Phase C × 11 pockets
- [ ] Phase D vertical back-end
- [ ] Phase E final gates

## Files touched
None (plan-only turn).

## Tests added
None (plan-only turn).

## Open items / next session
- Vikram to confirm pocket order before A1 starts (or accept proposed order).
- Vikram to decide if /admin/v2 collapses into /admin or vice-versa (A6).
- Vikram to choose Jira parity anchor for admin pockets that have no exact Jira equivalent (e.g. Resource Vendors, Modules & Packages).
- Run `/preflight --council` before Phase B (covers the architectural reversal of the Tailwind/shadcn admin shell).

## Lessons captured (CLAUDE.md candidates — drafted only)
None yet. Defects observed during Phase 0 are in-scope for the plan, not new lessons.
