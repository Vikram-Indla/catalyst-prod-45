# PLAN LOCK — Phase 2 Slice S4: Explore (browse/search/filter + CSV export)

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ⏳ DRAFT — awaiting Vikram approval · **Timebox**: 2h
**Supersedes**: nothing. Siblings: S1 Inbox (`9982a52d3`), S2 Create (`5c08c939d`), S3 Detail (self-approved, on `main`) — all delivered. This slice deliberately avoids every file S1/S2/S3 claim.

## Objective
Replace the `ExplorePage.tsx` placeholder with the real "anyone finds any idea" surface (design 04 §C.2): search + Stage/Class filters over `idn_ideas`, `JiraTable` list, row → Detail nav, CSV export. Closes the last named item in the Phase 2 exit criteria ("submit→inbox→detail loop... CSV export").

## Non-scope
No Score/Votes columns (needs `idn_scoring_*`/`idn_votes` joins — unbuilt, own slice). No Owner column/assignment (rail-only in Detail today, no assignment UI anywhere yet). No Strategy filter/column (`strategy_element_id` display component doesn't exist). No bulk actions (decline/assign — reviewer-tier, needs a permissions check not yet wired). No server-side pagination (see D18). No saved-filter chips. No converted-row `MIM-n` linked-key display (needs `idn_conversions` join).

## Design evidence
- 04 §C.2 (lines 79-90): route `/ideation/explore`; header `Search… / Stage▾ / Class▾ / Strategy▾ / ⤓ CSV`; table `Key▾ | Title | Class | Stage | Score | Votes | Owner | Age`; components "JiraTable full density + ColumnHeaderMenu... CSV export (Explore-scope)". This slice builds the subset that doesn't require unbuilt joins: Search, Stage, Class, table columns Key/Title/Class/Stage/Age, CSV export.
- 05 §C row 2 (Deel People table, Dovetail Contacts, image-verified): filter-chip row above table + column customizer (→ `ColumnHeaderMenu`, already proven); semantic `Lozenge` chips in cells, no rainbow palette.

## Decision required (explicit sign-off — data exposure, not architecture taste)

| # | Decision | Recommendation | Rationale |
|---|---|---|---|
| D16 | Draft-idea visibility in Explore | **Exclude `workflow_status_key = 'draft'` entirely** from the Explore query, for every user (not even the owner sees their own draft in Explore — they can reach it via `/ideation/submit` history or a future "My drafts" surface) | Data/Safety Guard finding: `idn_ideas` SELECT RLS (`20260709130000_idn_core_schema.sql:222-224`) has **no ownership or status clause** — any approved user can read every row including other users' drafts. Nothing else in the schema/app enforces draft privacy at the data layer. Excluding drafts client-side is the zero-risk default; showing "my drafts only" needs an `.or(submitter_id.eq.<uid>)` clause and is a P2 refinement, not blocking this slice. Showing all drafts to everyone is explicitly rejected — no precedent anywhere else in this schema for cross-user draft exposure, and it would surface IDEA-13 (this session's own test draft) org-wide today. |

## Recommendations (component/architecture — documented, proceeding unless flagged)

| # | Choice | Recommendation | Rationale |
|---|---|---|---|
| D17 | Filter widgets | `@atlaskit/select` single-select ×2 (Stage, Class) + `@atlaskit/textfield` search (title substring, client-side) | Discovery found no true multi-select precedent for a lightweight 3-filter bar; the only multi-select-capable component (`JiraFilterAtlaskit`) is a heavyweight Jira-vocab drawer (Priority/Reporter/Assignee/Sprint) — wrong shape for 2 filters. Single-select `@atlaskit/select` is the proven lighter pattern (`AllProjectsToolbar.tsx:130-161`) |
| D18 | Pagination | Client-side (fetch all non-draft rows, filter/sort in `useMemo`, `JiraTable`'s built-in `rowsPerPage`/`page` props for display slicing) | Every existing "explore all" list page in the codebase (`AllProjectsPage`, `AllProductsPage`) filters client-side; current `idn_ideas` volume is single-digit-to-dozens. Blueprint's "10k rows p95<2s" note is a future-scale target, not today's requirement — documented here, not silently dropped, revisit if row count grows |

## Canonical components (per hierarchy — all proven in repo)
- `JiraTable` (full density) + `ColumnHeaderMenu` — same table InboxPage already proves fits; `ColumnHeaderMenu` covers the design's "column customizer" ask natively, no new component.
- `StatusLozenge` — same canonical status-color mapping as Inbox/Detail, zero new color logic.
- `@atlaskit/textfield` search input with `SearchIcon`/`CrossIcon` clear — pattern from `AllProjectsToolbar.tsx:164-187`.
- `@atlaskit/select` single-select ×2 (Stage, Class) — pattern from `AllProjectsToolbar.tsx:130-161`.
- `exportToCsv` (`src/utils/exports/exportToCsv.ts`) — existing, zero call sites yet; Explore is its first consumer. No new CSV utility.
- No new non-canonical components required.

## Files to modify
| File | Change |
|---|---|
| `src/hooks/useIdeationExplore.ts` (new) | `useQuery`, `typedQuery('idn_ideas').select('id, idea_key, slug, title, idea_class, workflow_status_key, created_at').neq('workflow_status_key', 'draft').order('created_at', {ascending:false})` (D16) — reuses existing `IdeaRow` type, no new type needed |
| `src/modules/ideation/pages/ExplorePage.tsx` | Rebuild: search + 2 filters + JiraTable + CSV button, keep existing `?create=idea` modal wiring (S2) unchanged |

**Files forbidden**: `src/services/ideationService.ts`, `src/modules-dormant/**`, any migration file, `useIdeationInbox.ts`, `useIdeationDetail.ts`, `InboxPage.tsx`, `DetailPage.tsx`, `CreateIdeaModal.tsx`, `useCreateIdea.ts` (S1/S2/S3-owned — untouched).

## Data rules
- Zero legacy carryover: `idn_ideas` only.
- D16 enforced in the hook query itself (`.neq('workflow_status_key', 'draft')`), not just in the UI — a filter toggle must not be able to re-request drafts client-side.
- ADS tokens only; `StatusLozenge`'s existing canonical mapping, no new color logic.
- Zero-assumption rendering: empty problem_statement/title renders nothing extra, not a placeholder lie (not applicable here — title is NOT NULL, but keep the discipline for any optional field added).

## Validation
- [ ] `npx tsc --noEmit` clean · `npm run lint:colors:gate` + `npm run audit:ads:gate` clean vs baseline
- [ ] DB/DOM proof: Explore renders all non-draft idn_ideas rows (currently 7: 3 submitted incl. IDEA-12, 2 screening, 2 evaluation) and excludes IDEA-13 (draft) — confirmed by row count, not just visual scan
- [ ] Search filters by title substring; Stage/Class filters narrow the set; combined filters compose (AND)
- [ ] Row click navigates to `/ideation/ideas/:slug` (reuse Detail page, already live)
- [ ] CSV export downloads a file with the currently-filtered row set
- [ ] Screenshots (Chrome MCP, isolated dev instance): empty-filters full list, search applied, Stage+Class filters applied, no-results state, light + dark

## Stop conditions
Any need to join `idn_votes`/`idn_scoring_*`/`profiles` for a column not in this slice's scope → stop, defer to a later slice (matches S3's precedent of deferring Score/Votes/Evidence). Any DB schema change needed → stop, re-plan.

## Drift / rebaseline
Deviations from D16 (draft exclusion) or the C.2 field subset = drift → 08_DRIFT_LOG.md + re-approval.
