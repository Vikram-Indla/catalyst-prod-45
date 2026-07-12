# STRATA E2E — Decisions & disposition (V3-OPEN-013, V3-OPEN-011)

Product decisions taken by Vikram on 2026-07-12 during the CAT-STRATA-E2E-FIXES batch.
Both items were investigated read-only against the repo AND live staging
(`cyijbdeuehohvhnsywig`) before any decision. **Neither is closed** — see closure
conditions per item.

---

## V3-OPEN-013 — Portfolio member selector scoping

### Decision
- **Cycle-filter portion: REJECTED as a non-requirement.** Canonical STRATA model:
  Portfolios are independent of Strategic Theme and are NOT anchored to a Strategy
  Cycle; Project Cards may legitimately span cycles within one Portfolio. A Portfolio
  has no cycle by design, so "selector must show only the Portfolio's-cycle cards" is
  invalid.
- **Tenant-isolation portion: DEFERRED to a new product-wide multi-tenancy
  initiative** (see `STRATA_MULTITENANCY_INITIATIVE.md`). It is NOT implemented in
  STRATA in this batch.

### Evidence gathered (the RLS proof the ruling required)
Tenant isolation is **absent across ALL of Catalyst, by explicit single-tenant design** —
this is not a STRATA-local gap:
- `supabase/migrations/20260705100000_strata_foundation_config_engine.sql:6` —
  *"Single-tenant deployment (Q4): organization_id kept nullable for future use."*
- Across **1,274 migrations, zero** RLS policies reference `organization_id` /
  `tenant_id` / `account_id`. There is **no `organizations` table** and **no
  `current_user_org()` helper** anywhere.
- Live staging: `strata_portfolios.organization_id` NULL on 4/4 rows;
  `strata_project_cards.organization_id` NULL on 46/46. Only one tenant exists, so a
  cross-tenant leak test has no second tenant to run against.
- Both tables' SELECT RLS = `USING (current_user_is_approved())` (approval only, no
  org predicate); writes are role-only — identical to the rest of Catalyst.

### Why not implement STRATA-only tenant RLS
It would make STRATA the only tenant-isolated surface in the product (an illusory
boundary), and with no org model (org_id all NULL, no orgs table, no user→org map) an
`organization_id = current_user_org()` policy would either hide all data or enforce
nothing. Coherent multi-tenancy must be product-wide — a net-new initiative, not a
defect fix.

### Selector eligibility (ruling items 6–8) — current state
- Manual/Jira twins kept and disambiguated by source: **already implemented**
  (`vmoAuthoring.tsx:203-217`).
- Add-Member card `Select` is **already searchable** (`@atlaskit/select`).
- Exclude "retired/deleted/ineligible" cards: **not actionable today** — there is no
  retired/deleted/ineligible status on `strata_project_cards` (`stage` has no
  CHECK/enum; no soft-delete column). Would require a card-lifecycle column first.

### Closure condition
Do NOT close V3-OPEN-013. Cycle portion = rejected (documented). Tenant portion moves to
the multi-tenancy initiative and closes only with that initiative's schema/RLS + live
cross-tenant evidence.

---

## V3-OPEN-011 — Scorecard perspective model — RESOLVED (migration applied to staging)

### Decision
Canonical STRATA 5-perspective model: **1 Financial, 2 Customer & Market, 3 Network &
Infrastructure, 4 Digital & Innovation, 5 People & Capability.** ESG is NOT equivalent to
Network & Infrastructure.

### What shipped
Migration `supabase/migrations/20260712120000_strata_canonical_perspective_model.sql`
(applied to staging `cyijbdeuehohvhnsywig`, ledger version `20260712120000`):

| Current seed | → Canonical | Action |
|---|---|---|
| Financial (30) | Financial | kept, order 0 |
| Customer (25) | Customer & Market | renamed in place (id + slug `customer` frozen), order 1 |
| — | Network & Infrastructure (10) | **new** approved perspective, order 2 |
| Digital (20) | Digital & Innovation | renamed in place (slug `digital` frozen), order 3 |
| People (15) | People & Capability | renamed in place (slug `people` frozen), order 4 |
| ESG (10) | — | **retired** (status=retired); NOT deleted — RESTRICT-referenced seed line (KPI 1208) preserved |

- CEO Enterprise Scorecard weights rebalanced ESG(10) → Network & Infrastructure; model
  totals **100** (30/25/10/20/15). B2B Sector Scorecard untouched (no ESG), totals 100.
- Weights retained as existing seed distribution pending authoritative values (ruling
  item 7). N&I's 10 is provisional.
- Verified seed-only before applying: no non-seed KPIs on any perspective; ESG had 0
  elements / 0 KPI links. Migration asserts both models total 100 (raises otherwise).
- Historical reproducibility preserved: renames keep ids; ESG retired not deleted; its 2
  seed scorecard lines remain resolvable.

### Admin CRUD (ruling item 8) — DELIVERED
`configApi.createPerspective` / `updatePerspective` (draft-only per RLS) and
`setModelPerspectiveWeights` added, with admin UI in `StrataAdminConfigPage`:
New-perspective + Edit (drafts only) in `PerspectivesSection`, and a per-model weight
editor gated to `strategy_office` that blocks save unless weights total 100.
Activation/retirement continue through the existing Submit/Approve/Retire lifecycle.
Governance honored: approved perspectives are not editable via UPDATE (edits after
approval require supersede-versioning); global reorder of approved perspectives is
therefore not a client action. ADS tokens only; `color_token` left optional/omitted
(no curated ADS-accent list in-repo to source valid names).

### Closure condition
Do NOT close V3-OPEN-011 until: (a) the canonical model is confirmed on the target and
in the UI after refresh, and (b) the Admin CRUD capability is delivered. The data
migration is applied to STAGING only; PROD promotion is a separate DB-targeting action.
