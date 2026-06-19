# 06 — Test Plan (Gate 6)

> Repo uses Vitest. TDD: failing test before implementation per CLAUDE.md. Functional verification via DOM/DB/REST probes — **never screenshots** (CLAUDE.md 2026-06-01).

## Directory
- Loads filters by hub (project/product/incident/tasks/release) — `useFiltersForProject` returns hub-scoped rows.
- Search by name/description/JQL/owner filters the list.
- My / Starred / Shared-with-me / Recently-used / Broken tabs filter correctly.
- Star/unstar toggles `starred_by_user_ids` and persists (reload).
- **Row click → DETAIL route** (`/:key/filters/:filterId`), NOT builder — assert navigate target per hub (G1).
- Explicit kebab **Edit → builder** route.
- Permission-restricted actions hidden/disabled for non-owner/non-editor.

## Builder & preview
- Basic facets → JQL via the single adapter (golden output matches snapshot).
- JQL mode accepts a query; round-trips through `parseToModel` → facets without loss for supported fields.
- Basic↔JQL switching does not drop supported filters.
- Save creates a `ph_saved_filters` row + a `ph_filter_versions` row.
- Update saves existing filter + new version on JQL change.
- Save-as creates a copy (new id, copied config).
- Dirty-state + unsaved-changes guard fire.
- `jql-validate` flags: empty (when required), unknown field, broken operator, unclosed quote, bad ORDER BY.
- Results load (paginated); empty/error states render.
- **`useLinkedEntities(filterId)` returns real boards + derived views** (G3) — not `[]`.

## Detail (source of truth — G10)
- Metadata: visibility, owner, **editors, subscribers** chips render.
- JQL block + live results render.
- Version history opens.
- **Action bar** fires: star, subscribe, copy, share, transfer, whatsapp.
- **Derived-views section** shows linked kanban + roadmap + dashboard.
- Activity feed renders (IF activity source confirmed; else test marked pending).
- Actions respect permissions (editor can edit, cannot delete/transfer).

## Derived views
- Create Kanban from filter → `boards` row with `filter_id` set + columns + status mappings.
- "Open existing" when a board already exists for the filter (idempotency — no duplicate).
- Create Roadmap / Dashboard → `filter_derived_views` row with `source_filter_id`.
- Linked-entity records update on detail page after creation.
- Flag-off → derived actions hidden (no dead buttons).

## WhatsApp (G9)
- AI path: preview renders before copy; copy writes to clipboard.
- **Deterministic fallback**: AI-down / flag-off / rate-limited → template summary from counts + banner. Pure-function output stable for fixed input (no AI).
- Fallback never includes any field not in `FilterSummaryContext` (no hallucination).

## Backend / RLS (Phase B — **mandatory 2-user isolation**, 2026-06-10 lesson)
- `ph_saved_filter_can_edit`: editor uid → true; stranger → false (direct SQL).
- UPDATE policy: **editor saves OK; stranger UPDATE affects 0 rows** (SET LOCAL role + jwt.claims swap per user).
- DELETE policy unchanged: editor CANNOT delete (only owner/user_id).
- SELECT visibility: private hidden from non-owner; project-visible shown to project member only; specific-user shown to listed user only.
- Version insert requires `changed_by = auth.uid()`.
- Indexes used: EXPLAIN on directory query shows owner/product/starred/viewers index scans.

## JQL consolidation (G2)
- Golden-output snapshot per existing serializer call site captured BEFORE refactor.
- After collapse: each call site re-serializes byte-identically (saved JQL unchanged).
- Single parser: a parse fix is reflected in ALL surfaces (no fork).

## Accessibility
- Share modal + action bar: keyboard navigable, ARIA roles via `@atlaskit/*`, Escape closes modal without closing parent.
- Menus keyboard accessible (`@atlaskit/dropdown-menu` — check overflow-ancestry per 2026-06-13 lesson; if inside `overflow:hidden`, use portal pattern).

## Cross-hub regression (hermes-regression-sweep candidate)
- After touching `workhub/useSavedFilters` (18 importers) or `AllWorkToolbar` (`FilterState` type), probe BacklogPage, both AllWork views, both timeline pages, kanban board, board modals — no visual/wiring regression.

## Gate K acceptance
- `npx tsc --noEmit` exit 0.
- `npx vitest run` all green.
- `node design-governance/cli/index.js audit src/<touched>` → 0 new violations.
- Live functional CRUD proof on :8080 via DOM/DB/REST probes (create→read→update→derive→share→delete), not screenshots.
