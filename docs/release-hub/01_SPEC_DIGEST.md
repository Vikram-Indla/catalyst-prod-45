# 01 — Specification Digest

**Date:** 2026-06-23

## Paths checked

| Path | Exists |
|---|---|
| `docs/releae-hub/spec/` (misspelled, as prompt warned) | ❌ MISSING |
| `docs/release-hub/spec/` | ❌ MISSING |
| `docs/release-hub/specs/` | ✅ **EXISTS** |
| `docs/releae-hub/specs/` | ❌ MISSING |
| `releases/` | ❌ MISSING |
| `docs/releae-hub/` | ❌ MISSING |
| `docs/release-hub/` | ✅ EXISTS (parent) |

**Canonical spec folder: `docs/release-hub/specs/`** (correctly-spelled `release-hub`, plural `specs`).

## Files read (every spec file found)

| # | Path | Lines | Summary |
|---|---|---|---|
| 1 | `docs/release-hub/specs/Jira-Releases-Catalyst-Replication-Spec.md` | 320 | Master clone spec. 10-page inventory, **80 navigational paths** in 11 categories, full ADS component master list (30 components → Catalyst equivalents), `CatalystRelease` TS interface, Jira→Catalyst API map (9 endpoints), state-machine, optimistic-UI pattern, animation table, responsive breakpoints, error matrix. |
| 2 | `docs/release-hub/specs/RELEASES_SPRINTS_COMPLETE_SPECIFICATION.md` | 316 | "Ready for Phase 3" build spec. Adds **Sprints** + **story_sprints** junction. Data model for `releases`, `sprints`, `story_sprints`, extends `stories`/`business_requests`/`production_incidents` with `release_id`. 14 API endpoints, pixel specs (newer ADS tokens), hard ADS constraints, 8 hooks, route `/projects/:key/releases`, permissions, data-integrity rules, checklist. |
| 3 | `docs/release-hub/specs/Releases-Spec-Part1-Styles-Validation.md` | 832 | Computed-CSS dump (modal, table, lozenges, progress bar, date picker) using **old Jira N/B/G/R palette hex** + field-validation rules with exact error copy and TS validators. |
| 4 | `docs/release-hub/specs/Releases-Spec-Part2-Permissions-UICopy-Accessibility.md` | 1116 | Jira permission→action map, Catalyst permission mapping, **exact UI copy** (page/modal/menu/flag strings), full ARIA accessibility tree, keyboard-handler map, live-region announcements, focus-management patterns. |

Also present (not spec content): `docs/release-hub/.DS_Store`, `docs/release-hub/specs/.DS_Store` (macOS cruft).

## Cross-file conflicts

1. **Route path conflict.** Spec 2 + spec 1 say `/projects/:key/releases`. The **actual Catalyst route is `/release-hub/releases`** (no project key — it is a global Release Operations surface, not project-scoped). The specs were written against the Jira URL shape, not Catalyst's.
2. **Data-model conflict.** Spec 1 defines `CatalystRelease` with `released`/`archived` booleans + `sequence`. Spec 2 defines a `releases` table with a 3-value `status` enum (`unreleased`/`released`/`archived`) + a `sprints` table. **Neither matches the live DB** (`releases.release_status` is a 10-value enum; `rh_releases` is a 9-stage lifecycle; `sprints` table does not exist). See `05`.
3. **Status-model conflict (3-way).** Spec = 3 states. `releases` table = 10-value enum. `rh_releases` (live) = 9-stage lifecycle. All three disagree.
4. **Palette conflict.** Spec Part 1 hardcodes the **old Jira palette** (`#172B4D`/`#0052CC`/`#00875A`/`#DE350B` = N800/B400/G400/R400). Spec 2 uses the **newer ADS tokens** (`#292A2E`, `#1868DB`, `#6A9A23`). They contradict each other, and Part 1's bare-hex CSS directly violates the CLAUDE.md hardcoded-color ban (tokens mandatory).
5. **Modal pattern conflict.** Spec 1 path 13 says Create is an **inline form at top of Unreleased section** ("NOT a modal in current Jira"). Spec 2 §4 says Create is a **`CatalystModal` + form**. Pick one at design time.
6. **Sprints scope conflict.** Spec 1 (80 paths) never mentions Sprints. Spec 2 makes Sprints + story_sprints a core, mandatory part of the model. Sprints are an undecided scope expansion.

## Outdated / invalid instructions (do NOT follow blindly)

- **Spec 2 reference links** cite `supabase/migrations/20260623120*.sql` ("5 files"). **These migrations do not exist** in the repo. The spec's "Phase 1 schema complete / 95% confidence / zero ambiguity" claims are not backed by shipped migrations.
- **Spec 1/2 routes (`/projects/:key/releases`)** are invalid for Catalyst — use `/release-hub/releases`.
- **Spec Part 1 raw-hex CSS** is invalid under CLAUDE.md (ADS `var(--ds-*)` tokens mandatory). Treat its hex as *reference values to map to tokens*, never to paste.
- **Spec Jira REST endpoints** (`/rest/api/3/version/*`, `mypermissions`) are Jira-side; Catalyst uses Supabase. Treat as behavioral reference only.
- **Spec 1 `@atlaskit/css`** package references — use ADS tokens / Catalyst canonical components instead.

## PI / Program Increment scan (mandatory)

- **Zero** occurrences of "Program Increment", "PI Planning", "PI sidebar", or "Program Increment Plan" in any spec file. ✅
- The literal **"BR/PI"** appears in spec 2 (§4 "BR/PI Detail — Release Field", §"## 7 ROUTES") where it abbreviates **Business Request / Production Incident** — both legitimate Catalyst work-item types (`business_requests`, `production_incidents` tables, with `release_id` FKs). This is **not** Program Increment.
- **Action:** excluded from this discovery's implementation surface regardless, and raised as `07_OPEN_QUESTIONS.md` Q1 because the literal string is on your ban list. No code path created.
