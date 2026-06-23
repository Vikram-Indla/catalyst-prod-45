# 06 — Phase Execution Plan + Final Decision Report

---

## CURRENT_STATE (checkpoint 2026-06-23)

**1. Completed work**
- Discovery complete.
- Phase 1B additive canonical-table extension complete.
- Release Hub column order fixed.
- `/release-hub/releases` headers now structurally correct.
- **Phase 1C (2026-06-23): header column 1 relabeled `Version` → `Release`** (matches Jira screenshot). Live-verified: thead now reads `Release · Status · Progress · Start date · Release date · Description`. One-line `columnLabelOverrides` change, release-adapter-only, zero blast radius. tsc/build/audit clean.
- **Phase 1C deferrals (documented, not shipped):** "More actions" header label (BLOCKED — JiraTable replaces `__actions` header label with the column-picker trigger; can't override without shared-file blast radius); "No work items" progress text (BLOCKED — zero-assumption P0: `readiness_pct=null` ≠ zero linked work items); overdue release-date red (DEFERRED — shared inline-edit date cell cascade-trap + cannot DOM-probe under the auth blocker); 3-state UNRELEASED/RELEASED/ARCHIVED lozenge (DEFERRED — `rh_releases` is a 9-stage lifecycle, no invented mapping); toolbar parity (DEFERRED — shared toolbar, all-hub blast radius).

**2. Current accepted route:** `/release-hub/releases` (Release Operations → Releases).

**3. Current source of truth:** `rh_releases`.

**4. Rejected data sources for now:** `releases`, `release_versions`.

**5. Current visual status**
- Headers correct + in order: **Release, Status, Progress, Start date, Release date, Description, [picker]** (col 1 relabeled in Phase 1C; the trailing actions header shows the column-picker trigger, not a "More actions" label — by JiraTable design).
- Row rendering **still not visually accepted** — the browser Supabase session is from the wrong project (`iss = cyijbdeuehohvhnsywig`), so `rh_releases` returns 0 rows and only the empty-state placeholder renders. Q12 unchanged.

**6. Current blocker**
- Browser auth token issuer (`iss = https://cyijbdeuehohvhnsywig.supabase.co/auth/v1`) does NOT match the app data Supabase project (`lmqwtldpfacrrlvdnmld`).
- Live authenticated `rh_releases` query → HTTP 401 PGRST301 → 0 rows.
- Manual re-authentication required before row rendering can be verified.

**7. Next manual action**
- Clear local auth/session storage (`localStorage['catalyst-auth-token']`) in the browser used for verification.
- Log in again (ensure the login flow authenticates against `lmqwtldpfacrrlvdnmld`).
- Reopen `/release-hub/releases`.
- Verify the `rh_releases` row renders (expected: Version "8 July", Status draft, Release date 2026-06-19, Progress/Start/Description "—").

**8. Next Claude action after manual login**
- Data-rendering visual verification only.
- No code unless a real row-rendering defect is proven.

**9. Next implementation phase after Phase 1B is fully accepted**
- Phase 1C: Jira screenshot-based visual/pixel tuning only.

**10. Forbidden scope (all phases here)**
- No schema change · no RLS change · no migration · no create/edit/release/archive/delete/merge · no release detail · no sprint linkage · no custom table · no forbidden terminology.

---

**Date:** 2026-06-23. No planning-cadence concept anywhere. No two-letter shorthand used. "Production Incident" (where referenced) is written in full and is **out of scope / not in Phase 1**. Confirmed starting surface: **`/release-hub/releases` (Release Operations → Releases)** only. `/projects/:key/releases` is a **Jira reference route only** — never a Catalyst implementation route.

---

## Decision Area 1 — Data source of truth → see `05`

Verdict: **`rh_releases`** is the Phase 1 source of truth (wired, typed, RLS-clean, has display fields). `releases` and `release_versions` rejected. Full cited comparison in `05` → Decision Area 1.

---

## Decision Area 2 — First real implementation phase

**Goal of Phase 1:** visibly move `/release-hub/releases` toward Jira Releases **without destructive schema change**, using existing canonical components.

### Options considered

- **Option A — refactor table columns + empty state only, over the existing `rh_releases` data source.**
  Evidence it is safe: the page already reads `rh_releases` through `useReleasesSource` (`releasesDataSource.ts`), already mounts canonical `BacklogPage`/`JiraTable`, and `rh_releases` carries the fields to display (`name`, `version`, `description`, `planned_release_date`, `target_date`, `status`, `readiness_pct`, `release_manager_id`). No schema touch. Columns + empty-state copy align toward Jira's Version / Progress / Release date / Status shape using the existing allowlist + adapter.
- **Option B — read-only Jira Releases list adapter over the `releases` table.**
  Rejected: `releases` is empty (0 rows), QA-bloated, coupled to `release_vehicles`/program/portfolio, has a loose UPDATE RLS policy (`USING true / CHECK true`), and is not wired to this route (`05` Model B). Building over it would surface an empty, wrong-domain list.
- **Option C — stop and require schema migration first.**
  Not required for a visible, safe Phase 1: `rh_releases` can already back a column/empty-state refactor with zero migration. Migration is only needed later for true Jira status semantics (`unreleased/released/archived`), `sequence`, `archived_at` — those are deferred, separately-approved work.

### Recommendation — **Option A**

Refactor **only the column set + empty-state copy** of `/release-hub/releases` over the existing `rh_releases` data source. Reasons: zero schema risk, zero RLS risk, reuses canonical components, immediately visible parity movement, fully reversible. No create/edit/release/unrelease/archive/delete/merge in Phase 1.

---

## Decision Area 3 — Canonical component contract (Phase 1 import paths)

All confirmed present (`04` inventory). No wrapper invented.

| Need | Exact import path | Status |
|---|---|---|
| Route/page component | `src/pages/releasehub/ReleasesBacklogCanonical.tsx` (route `FullAppRoutes.tsx:735`) | ✅ exists |
| Layout / page shell | `src/components/layout/CatalystShell.tsx` | ✅ |
| Per-page header (breadcrumb+title) | `src/components/layout/ProjectPageHeader.tsx` | ✅ |
| Canonical table | `src/components/shared/JiraTable/` (`index.ts` → `JiraTable.tsx`) — via `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | ✅ |
| Data source adapter | `src/modules/project-work-hub/adapters/releasesDataSource.ts` (`useReleasesSource`) | ✅ |
| Search field | inside `BacklogPage` toolbar (canonical) | ✅ |
| Filter control | inside `BacklogPage` toolbar (canonical) | ✅ |
| Group-by control | inside `BacklogPage` toolbar (canonical) | ✅ |
| Column manager | inside `BacklogPage` (`allowedColumnIds` in `ReleasesBacklogCanonical.tsx`) | ✅ |
| Button | `@atlaskit/button/new` (direct; no Catalyst wrapper exists) | ✅ pattern |
| Lozenge / status | JiraTable status cell + `LozengeAppearance` from `@/components/shared/JiraTable`; `@atlaskit/lozenge` | ✅ |
| Progress bar | `src/components/releases/ReleaseProgressBar.tsx`; `@atlaskit/progress-bar` | ✅ (reuse, do not rebuild) |
| Action menu | `src/components/shared/JiraTable/ToolbarMenuButton.tsx` / `ColumnHeaderMenu.tsx`; `@atlaskit/dropdown-menu` w/ portal guard (CLAUDE.md 2026-06-13) | ✅ pattern |
| Empty state | `@atlaskit/empty-state` (direct; no `CatalystEmptyState` wrapper) + BacklogPage's own empty handling | ✅ pattern |
| Loading state | `@atlaskit/spinner` (already in `ReleasesBacklogCanonical.tsx`) + BacklogPage skeletons | ✅ |
| i18n pattern | **GAP** — no release-specific i18n/RTL layer found. Mark as gap; do not invent. Confirm if in scope. | ⚠️ gap |
| Permission guard (LATER, not Phase 1) | `<ModuleGuard moduleCode="releases">` (used by `/release-hub/overview`) | ✅ (deferred — security hardening task) |

**Gaps:** i18n/RTL (no release layer found) · no `CatalystModal`/`CatalystEmptyState` wrapper (use `@atlaskit/*` directly — established pattern, not a violation).

---

## Decision Area 4 — Jira screenshots required before pixel work

Minimum set before implementing the *visual* part of Phase 1:

1. **Jira Releases landing with rows** — BAU, all sections, real version rows (columns, density, lozenge, progress).
2. **Jira empty state** — Releases page with no versions (empty-state illustration + copy), if available.
3. **Row hover / action menu** — drag-handle visibility + the `•••` menu open.
4. **Create version interaction** — confirm current Jira behavior (inline form vs modal).
5. **Release detail first view** — only required if Phase 1 links rows to a detail surface (current page already routes row click to `/release-hub/:id`; capture if that link is kept).

Without 1–3 the column/empty-state pixel values cannot be verified against live Jira; the dated spec probe is the interim reference.

---

## Phase plan (corrected)

- **Phase 0 — Decision & live re-probe (no code).** Human answers `07` questions; collect screenshots (Decision Area 4). Gate.
- **Phase 1 — Option A (RECOMMENDED FIRST):** column-set + empty-state refactor of `/release-hub/releases` over `rh_releases`. No schema. No CRUD actions. Canonical components only. Gate.
  - **2026-06-23 — Phase 1A BLOCKED by canonical architecture (no code shipped).** Discovery during Phase 1A proved the target column set is not deliverable through the approved adapter-only levers:
    - Default-visible columns = `DEFAULT_VISIBLE_COLUMNS (['key','status','parent','assignee']) ∩ allowedColumnIds` (`BacklogPage.atlaskit.tsx:989,1048-1062`). The release page can only default-show a subset of `{key,status,parent,assignee}` → today `{key,status,assignee}` = "Work / Status / Assignee".
    - Column ids/labels are hardcoded in the shared file (`key`→"Work", etc.). No `version`/`progress`/`start_date`/`release_date`/`description` column id exists.
    - `BacklogDataSource` (`adapters/backlogDataSource.ts:83-194`) exposes no column-label override, no custom-column injection, no default-visible override, no empty-state override. Only `allowedColumnIds` (picker whitelist).
    - rh_releases mapping: Version→`name` (renders in `key`/"Work", cannot be relabeled), Status→`status` ✅, Progress→`readiness_pct` (no column ❌), Start date→`planned_start_date` (no column ❌), Release date→`planned_release_date`/`target_date` (picker-only, not default-visible ⚠️), Description→`description` (no column ❌), Actions→`__actions` kebab includes destructive Delete (must not enable ⚠️).
    - Delivering the target requires editing shared `BacklogPage.atlaskit.tsx` used by project-hub, product-hub, incident-hub, tasks-hub, testhub → violates Phase 1A boundaries #4/#5/#6/#15/#16/#17/#19. No shared-file edit was made; no fork; no fake cosmetic change.
- **Phase 1B (PROPOSED — supersedes the column work, requires explicit approval + pending Jira screenshots):** additively extend the canonical contract so the release adapter can opt in WITHOUT changing other hubs. Concretely: add optional `columnLabelOverrides?: Record<string,string>`, `defaultVisibleColumns?: string[]`, and a release-progress column hook to `BacklogDataSource`/`BacklogPage`, each guarded by `if (dataSource?.X)` so hubs that pass nothing are byte-for-byte unchanged. This is parameterisation, not a fork (CLAUDE.md ADOPT-CANONICAL). Gate on: (a) Jira screenshots (Decision Area 4) to confirm exact columns/labels/widths, (b) explicit approval to touch the shared canonical file, (c) regression sweep of the 5 consuming hubs after the additive change.

- **Phase 1B — ✅ IMPLEMENTED 2026-06-23 (structural; pixel tuning deferred until Jira screenshots).**
  - Contract additions (`adapters/backlogDataSource.ts`): optional `columnLabelOverrides`, `defaultVisibleColumns`, `nonDestructiveActions` — all `if (dataSource?.X)`-guarded.
  - Canonical page (`pages/BacklogPage.atlaskit.tsx`): 3 opt-in display columns `release_progress` (canonical `ReleaseProgressBar`, value=`readiness_pct`), `start_date`, `description`; new `RELEASE_ONLY_COLUMN_IDS` gate (mirrors `PRODUCT_ONLY_COLUMN_IDS`) so non-release hubs never see them; `DEFAULT_VISIBLE_COLUMNS` and column labels overridden only when the adapter provides the new fields; `__actions` renders a non-destructive `—` placeholder when `nonDestructiveActions` is set. New optional `BacklogItem`/`BacklogStory` fields `description`/`start_date`/`progress` carried through the story→item mapping.
  - Release adapter (`adapters/releasesDataSource.ts`): `RELEASE_SELECT` + `ReleaseRow` add `planned_start_date`, `description`; `releaseToBacklogStory` maps `description`, `start_date=planned_start_date`, `progress=readiness_pct`. No schema/RLS/migration.
  - Release page (`pages/releasehub/ReleasesBacklogCanonical.tsx`): `allowedColumnIds` + `columnLabelOverrides {key:'Version', target_date:'Release date'}` + `defaultVisibleColumns` = Version, Status, Progress, Start date, Release date, Description, Actions; `nonDestructiveActions: true`.
  - Validation: `tsc --noEmit` clean; design-governance audit adds **0** new violations (the 2 pre-existing BacklogPage violations at lines 234/7867 exist at HEAD and are outside the diff); `npm run build` EXIT 0 (✓ 48.55s). Lint: repo baseline already fails (134 `no-explicit-any`, 49 `no-restricted-imports` repo-wide); the diff adds 3 `(s as any)` field reads consistent with the file's existing 116-instance mapping pattern — no new rule class.
  - Regression: project/product/incident/tasks/test hubs set none of the new opt-in fields (grep-verified) → unchanged by construction. No CRUD/lifecycle behavior added; no destructive action exposed; sidebar/route/schema/RLS untouched.
  - Deferred to a later phase: exact pixel tuning (awaiting Jira screenshots), section grouping (UNRELEASED/RELEASED/ARCHIVED), real done/in-progress/to-do progress breakdown (only `readiness_pct` available today), non-placeholder release actions, ModuleGuard hardening.
- **Phase 2 — Status/label parity (no schema):** reconcile displayed status labels/appearances via the adapter `RELEASE_STATUSES` map only, against screenshots. Gate.
- **Phase 3 — Sectioning (only if needed):** try JiraTable's existing group-by to express UNRELEASED/RELEASED/ARCHIVED-style buckets via the adapter; never fork JiraTable or hand-roll a sectioned table. Escalate as a GAP if group-by can't express it. Gate.
- **Phase 4+ — Schema/status-semantics work (deferred, separate approval):** Jira `unreleased/released/archived` status, `sequence`, `archived_at`, progress breakdown, version CRUD/release/archive/merge. Requires migration design, RLS 2-user isolation test (CLAUDE.md), trigger review, types regen.
- **Security hardening task (NOT a Jira-Releases build phase, schedule independently):** add `<ModuleGuard moduleCode="releases">` to the `/release-hub/releases` route to match `/release-hub/overview`. Tracked in `07` Q4. One-line, reversible — but it is hardening, not the first Releases build step.

### Out of scope (this effort)
Release Detail rebuild, Release Notes, board/backlog/roadmap version integration, dashboard gadgets, Sprints, Business Request / Production Incident release linkage, anything at `/projects/:key/...` (Jira reference only), anything Program-Increment.

---

## Decision Area 5 — Proposed Phase 1 implementation prompt (DRAFT — DO NOT RUN)

> **Phase 1 — Releases column + empty-state parity (no schema, no CRUD).**
>
> Scope: ONLY `http://localhost:8080/release-hub/releases`. Do not touch any other route, module, or table.
>
> Data source: existing `rh_releases` via `src/modules/project-work-hub/adapters/releasesDataSource.ts` (`useReleasesSource`). Do NOT create or alter any schema, migration, RLS policy, enum, or generated type. Do NOT switch to `releases` or `release_versions`.
>
> Components: use only the canonical Catalyst components already wired — `ReleasesBacklogCanonical.tsx`, `BacklogPage.atlaskit.tsx`, `JiraTable`, `ProjectPageHeader`, `@atlaskit/spinner`, `ReleaseProgressBar` (`src/components/releases/ReleaseProgressBar.tsx`), `@atlaskit/empty-state`. Do NOT hand-roll any UI, table, modal, dropdown, or wrapper. Do NOT invent a `CatalystModal`/`CatalystEmptyState`.
>
> Do:
> 1. Refine the `allowedColumnIds` / column presentation in `ReleasesBacklogCanonical.tsx` so the visible columns move toward Jira Releases shape (Version, Progress, Release date, Status, Release manager) using ONLY columns that map to real `rh_releases` fields (`05` Model A). Render progress via the existing `ReleaseProgressBar` driven by `readiness_pct` (no fabricated done/inProgress/toDo — render nothing where data is absent, per CLAUDE.md zero-assumption rule).
> 2. Provide a Jira-aligned empty-state (copy from `03`/spec, mapped to ADS tokens) using `@atlaskit/empty-state` or BacklogPage's empty handling.
> 3. Use ADS `var(--ds-*)` tokens only — no bare hex (map spec hex to tokens).
>
> Do NOT (this phase): implement create / edit / release / unrelease / archive / delete / merge; add sectioning; add Sprints; add Business Request or Production Incident linkage; add ModuleGuard; change RLS; touch unrelated modules.
>
> After changes, run: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `node design-governance/rules/audit.js src/` (expect 0 new violations on touched files). Verify functionally via DOM/code, not screenshots (CLAUDE.md), unless the change is purely cosmetic.
>
> On completion, update `docs/release-hub/06_PHASE_EXECUTION_PLAN.md` (mark Phase 1 done, log what shipped + evidence), then STOP for review.

(Prompt is a draft for human approval — not executed.)
