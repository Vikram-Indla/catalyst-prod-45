# 07 — HANDOVER

## Done (committed to main, verified)
- Slice 1 `a02b9c569`: 001, 002, 005, 007 (frontend) — verified live.
- Slice 2 `86a6e7c33`: 004 + 008 (staging migrations, verified), 003 (role gate).
- Pre-work: fixed the corrupt-Vite-dep-cache boot failure (`rm -rf node_modules/.vite`).

7 of 9 defects fully resolved. 003 also had an environmental component (boot cache) — the
Delivery-Objective now creates fine; the committed change closes the latent role-gate gap.

## Remaining — two dedicated follow-ups

### 006 — Risk + standalone Blocker authoring (FEATURE, not a fix)
Scope for a fresh slice:
- Schema (staging first): new `strata_risks` table — project_card_id FK, title, description,
  severity, likelihood, status, owner_id, mitigation, dates; RLS mirroring strata_milestones;
  `strata_create_risk` / `strata_update_risk` / `strata_archive_risk` RPCs + audit events.
- Blocker: schema already supports it via `strata_dependencies.is_blocker` — add a standalone
  "New blocker" entry point (a dependency-create prefilled is_blocker=true), no new table.
- UI: Risk section in ProjectCardDetailView Delivery tab (JiraTable list + StrataFormModal
  create/edit), FormKey additions `new-risk`/`edit-risk`. ADS tokens only; no hand-rolled UI.
- Decision needed: severity/likelihood taxonomy (match Jira risk matrix? 1-5 × 1-5?).

### 009 — console warnings (minor)
- Malformed React Router path `/planhub*` (find the route with a bare `*` and fix to `/planhub/*`).
- Unknown Atlaskit tokens `font.size.100` / `font.size.050` (a component passing a bad token id).
- Recharts container width/height `-1` (a chart rendered before its container has size).
- Multiple FeatureGateClients versions / React defaultProps / legacy context — mostly library-level.

## Environment caveat
Vite dep-optimize is fragile here: edits sometimes re-corrupt `node_modules/.vite` and the app
shows `Boot Error: Failed to fetch dynamically imported module`. Fix: stop dev server,
`rm -rf node_modules/.vite`, `npm run dev`. See memory `strata-boot-error-vite-cache`.

---

# Version 2 — defects 010–015 (session 002, 2026-07-11)

See `sessions/002_v2-defects-010-015.md` for the full table. Summary: 015 fixed; 011/012/014
closed as not-a-defect (011/014 are product calls Vikram confirmed); **010 and 013 fixed only
partially and remain OPEN** pending backend/schema decisions + QA retest.

## OPEN — do not close until backend/schema lands AND QA retests

### 010 — KPI ↔ strategy hierarchy link at creation (OPEN)
- Shipped (`ca90cdede`): 5 ownership pickers on the New KPI form + chained `strata_update_kpi`.
  Owners now persist at creation. This half is DONE.
- BLOCKED half: linking a KPI to a Theme/Objective at creation is impossible — the RPC
  `strata_link_element_kpi` (`supabase/migrations/20260711...authoring_write_paths.sql:451` →
  guard also at :1101) raises `only approved KPIs can be linked (KPI status: %)`, and a new KPI
  is always `draft`. Verified live (the picker threw that exact error).
- **Decision needed (backend):** either (a) allow linking `draft` KPIs in `strata_link_element_kpi`,
  or (b) an auto-approve/creation-link path, or (c) accept that linking stays a post-approval step
  on the Strategy Room `KpiLinksModal` (current behaviour; form copy already says so).
- **Close only when:** the decision is implemented and QA re-runs "create KPI → link to hierarchy".

### 013 — Portfolio card selector cycle/tenant scoping + twin dedup (OPEN)
- Shipped (`4ccb5db46`): selector excludes already-member cards + disambiguates same-named cards
  by source (`· Manual` / `· Jira: <key>`). This half is DONE.
- BLOCKED half: true "eligible for the selected cycle and tenant" is not implementable —
  `strata_project_cards` has NO `cycle_id`/`theme_id` scoping column and `organization_id` is
  NULL on all 44 rows (staging `cyijbdeuehohvhnsywig`); there is no org/tenant context in the
  STRATA UI. The 7 reported "duplicates" are REAL twin rows: a `manual` card (no source_key) and
  a `jira`-synced card (source_key e.g. `ICP`) for the same project — deduping by name would drop
  a distinct card and bind membership to the wrong id.
- **Decision needed (data + schema):** (a) merge/retire the 7 manual+Jira twin pairs (choose the
  canonical source), and (b) add a real cycle association to project cards if cycle scoping is
  required. Both are data/product calls, not UI query changes.
- **Close only when:** the data/schema decision is implemented and QA re-runs the selector scoping.

## Follow-up 3 — Vitest verification risk (carry forward)
Vitest will not start in this env (rolldown/Node `styleText` crash,
`ERR_INVALID_ARG_VALUE … ['underline','gray']`). The REQ-019 seam guard was verified by reading,
not running. Record as a VERIFICATION RISK — not a passed test — until the toolchain is fixed.

## Engineering lessons (this session)
1. **Verify a subagent's api-object claim at the line before wiring it.** The 010 investigator
   cited `kpiApi.linkElementKpi`; it actually lives on `strategyApi` (domain/index.ts:188).
   Caught live as `kpiApi.linkElementKpi is not a function`. See memory `verify-subagent-api-object`.
2. **`git commit` (no `-a`) commits the WHOLE index, incl. foreign pre-staged renames from other
   sessions**, and `git status --short | grep '^[MA]'` MISSES renames (`R`)/deletes (`D`). Verify
   the complete staged set with `git diff --cached --name-status`. A foreign migration rename was
   swept into the first 010 commit; reset + recommitted clean. See memory
   `git-commit-includes-foreign-staged-renames`.
