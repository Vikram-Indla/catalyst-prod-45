# 00 — Master Releases Blueprint (Discovery Index)

**Date:** 2026-06-23 (decision report added 2026-06-23)
**Mode:** DISCOVERY + DECISION — no code, no migrations, no app changes.
**Confirmed starting surface (only):** `http://localhost:8080/release-hub/releases` — **Release Operations → Releases**. Nothing outside this route unless explicitly approved later.

---

## Terminology guard (enforced)

- Scope is strictly the Jira Releases (Versions) feature on `/release-hub/releases`. No planning-cadence concept is modeled, routed, labeled, or implemented. Zero such references were found in the specs.
- No two-letter shorthand is used in this document set. Compressed abbreviations from the source specs are expanded to their full terms.
- **Production Incident** (when referenced at all) is always written in full. Production Incident is **not** part of the first implementation phase and is out of scope for `/release-hub/releases` work.

---

## Headline finding (read first)

`/release-hub/releases` is **already built and already canonical**: it mounts the shared `BacklogPage` (canonical `JiraTable`) over the **`rh_releases`** table via the `useReleasesSource` adapter. It is not hand-rolled.

The repo specs (`docs/release-hub/specs/`) describe a different product — a faithful **Jira "Versions / Releases"** clone (sectioned UNRELEASED / RELEASED / ARCHIVED list, per-row progress bars, version CRUD, version detail + release notes, a `releases` + sprints + `story_sprints` data model).

These are not the same feature. The current page is enterprise Release-Operations data; the spec is the Jira project-versions feature. The data-source decision (see `05` → Decision Area 1) and the safe first phase (see `06` → Decision Areas 2–5) resolve how to move the live page toward Jira Releases **without destructive schema change**.

---

## Decision summary (full report in `05` + `06`)

- **Data source of truth (Decision Area 1 → `05`):** **`rh_releases`** for Phase 1. It is the only release table that is wired to this route, has current/clean RLS, full generated types, and the needed display fields (`name`, `description`, `version`, dates, manager, `readiness_pct`). It is Release-Operations data, not true Jira Versions data — the `unreleased/released/archived` status semantics, `sequence`, and `archived_at` are gaps deferred to a later, separately-approved schema phase.
- **First real phase (Decision Area 2 → `06`):** **Option A** — refactor only the **columns + empty state** of `/release-hub/releases` over the existing `rh_releases` data source. No schema change. No create/edit/release/archive/delete/merge.
- **ModuleGuard is NOT the first phase.** It is logged as a separate **security-hardening task** (`06`, `07` Q4), not the first Jira-Releases build step.

---

## Document map

| Doc | Contents |
|---|---|
| `01_SPEC_DIGEST.md` | Spec files read, summaries, conflicts, invalid/outdated instructions |
| `02_CURRENT_CATALYST_RELEASES_DISCOVERY.md` | Live route, page, table, toolbar, empty state, create, route reg, layout, permissions |
| `03_JIRA_RELEASES_DISCOVERY.md` | Jira Releases behavior (from dated spec probe) + screenshots still needed |
| `04_CANONICAL_COMPONENT_INVENTORY.md` | Reuse table — Catalyst components + `@atlaskit/*`, with use decisions |
| `05_SCHEMA_API_PERMISSION_DISCOVERY.md` | Tables, enums, row counts, **RLS**, generated types, hooks + **Decision Area 1** |
| `06_PHASE_EXECUTION_PLAN.md` | Corrected phase plan + **Decision Areas 2–5** + **Phase 1 prompt draft** |
| `07_OPEN_QUESTIONS.md` | Remaining human decisions before code |

STOP. No implementation until human approval.
