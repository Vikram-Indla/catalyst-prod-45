# STRATA Organization Structures & Scopes — Product/Schema Decision Record

- **Defect**: CFG-003 (Configuration NO-GO, final pack)
- **Status**: OPEN — awaiting product decision (option 1 vs 2 below)
- **Date raised**: 2026-07-18
- **Raised by**: STRATA Configuration defect-pack remediation (CAT-STRATA-CFGDEF-20260718-001)

## Finding (verified against schema and code)

There is **no organization-structure or scope-hierarchy table anywhere in the
schema**. What exists instead:

| Artifact | Nature | Location |
|---|---|---|
| `owner_scope_type` on scorecard models | fixed enum (`enterprise\|sector\|function\|portfolio\|initiative\|custom`), free of any org entity | `strata_scorecard_models` |
| `sector`, `lead_business_unit`, `delivery_team` on Project Cards | free-text columns | `strata_project_cards` |
| `lead_business_unit` picklist | flat governed picklist, no hierarchy | Project Card field config |
| Role assignment `scope_type` | text field, effectively `'global'` for every explicit grant | `strata_role_assignments` |

Building an "Organization structures" admin UI over this would be a fake UI
over nonexistent data. The Configuration hub therefore deliberately has **no
org-structure card** — nothing implies the capability exists.

## Decision required

1. **Required this release** → schedule the schema work below (not fit for a
   defect-pack timebox; it is a feature slice with migration + RLS).
2. **Intentionally out of scope this release** → record that here, close
   CFG-003 as by-design, and revisit at the next release boundary.

## If required — minimum design

- **Entities**: `strata_org_units` (id, slug, name, unit_type enum
  [enterprise|sector|function|business_unit|team], parent_id self-FK,
  effective_from/effective_to, status draft|active|retired, governed envelope
  columns matching the config engine), plus `strata_role_assignment_scopes`
  linking role assignments to org units (replacing the free-text scope).
- **Hierarchy**: single-parent tree, enterprise root; cycles rejected by
  trigger; depth practically ≤ 4.
- **Lifecycle / effective dating**: same governed draft → pending → approved →
  retired envelope as other config records; historical scorecards keep the
  version in force when they locked (mirrors perspective retirement rule).
- **Migration**: new tables + backfill of `owner_scope_type`/`sector`/
  `lead_business_unit` values into org units where unambiguous; free text kept
  as-is until mapped. Slug contract applies (slug column + trigger + routes.ts
  builder + useOrgUnitBySlug hook).
- **Authorization**: reads for all STRATA roles; writes strata_admin +
  strategy_office via RPC with SoD (author ≠ approver), RLS matching the
  config-engine pattern.
- **Dependent modules**: role scoping (Access), scorecard model scope,
  Project Card sector/BU fields, Portfolio rollups, Command Center scope
  filter.
- **Delivery owner**: Vikram (product decision) → STRATA engineering.
- **Target release**: proposed next STRATA release train; not the current one.

## Interim guarantee

Until decided, Configuration must not (and does not) show any organization/
scope administration control. This record is the explicit limitation QA asked
for.
