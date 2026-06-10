# Filters Revamp — Complete Deliverable Package
**Date:** 2026-06-10 · **PR:** Vikram-Indla/catalyst-prod-45#240 (MERGED, squash `6a72ca4`) · **Surface:** `/project-hub/:key/filters`

---

## 0 · Why your screen still shows the old page

The screenshot you sent ("0 filters" line + "Create your first filter" button) can only render from PRE-merge code — both elements are deleted on `main` as of `6a72ca4`. Verified directly against `origin/main`:

```
git log origin/main --oneline -1
  6a72ca4 Revamp project filters: canonical JiraTable, live JQL results, enriched save flow (#240)
git show origin/main:src/pages/project-hub/filters/FiltersListPage.tsx | grep -c "Create your first filter"
  0
```

To render the new code:
```bash
git checkout main && git pull origin main
# kill and restart the dev server (vite must re-bundle the new files)
kill $(lsof -t -i:8080); npm run dev
# then HARD refresh the browser (Cmd+Shift+R) — the old bundle may be cached
```
Proof you're on the new page: the empty state has NO button — only the text
"Use the button above, or press N, to build your first filter."

---

## 1 · PROTOTYPE INFORMATION — requirements gathered

### Sources
- Your 5 screenshots (Jira filters directory, kebab menu, Jira list view with Save filter, Catalyst's old Create filter JQL/Ask CATY tabs)
- Jira's filter model (manage-filters doc was 403-blocked from the cloud environment; model reconstructed from screenshots + the Jira-parity lessons already encoded in CLAUDE.md)
- Code archaeology: the existing `ph_saved_filters` data layer (Supabase), `translate()/applyJqlToQuery()` JQL engine, `JiraTable` canonical table, `AskCatyInlineBar`, `FilterTemplateGallery`, `FilterSaveModal`, `FilterKebabMenu`
- Live Supabase probe: `ph_saved_filters` schema (22 columns), RLS policies, `ph_issues` row counts (1,462 non-Done items across 8 project keys)

### Requirement set distilled from your brief
| # | Requirement | Status |
|---|---|---|
| R1 | Filters list = the project-backlog table (JiraTable), not a bespoke table | ✅ shipped |
| R2 | "Create filter" opens a builder where THE TABLE shows live results | ✅ shipped |
| R3 | Cross-project: filters can pull tickets from other projects | ✅ shipped (no forced project clause; "N projects" lozenge) |
| R4 | JQL tab must not be a tiny box on an empty page | ✅ shipped (full-width editor + live results below) |
| R5 | "Use this filter" → understandable save flow with a nice modal | ✅ shipped (modal pre-filled w/ template name + live match count) |
| R6 | Padding = backlog padding | ✅ shipped (24px horizontal everywhere) |
| R7 | Remove duplicated Create CTAs | ✅ shipped + pinned by test |
| R8 | Ask CATY enterprise placement | ✅ canonical AskCatyInlineBar + results table (NOTE: underlying Gemini quality unchanged) |
| R9 | Private/public filters, viewers/editors, star, copy, change owner, delete | ✅ pre-existing data layer kept; surfaced in JiraTable columns + kebab |
| R10 | CRUD proven | ✅ C/R/U/D round-trip on live Supabase + RLS policy inspection |

### Data model (verified live)
`ph_saved_filters`: id, name, description, jql_query, filter_config, page, is_shared,
viewers_config (private/org/specific), editors_config (owner_only/specific),
starred_by_user_ids[], subscriber_ids[], owner_id, user_id, used_by_board_ids[],
hub_scope (project/product/both), last_used_at, use_count, health_status, project_key.
RLS: SELECT = owner OR shared; INSERT/UPDATE/DELETE = owner/creator.

---

## 2 · VISUAL MOCKUP

File: **`design-governance/mockups/filters-revamp.html`** (committed to main, also attached).
Open it in any browser. It shows, with ADS tokens:
1. Filters directory on the canonical JiraTable
2. Create filter — builder tabs + live results table (cross-project, "3 projects" lozenge)
3. Save filter modal — "47 work items currently match this filter" banner
4. Filter detail — JQL + live results ("filter in use")

---

## 3 · IMPLEMENTATION — complete file map

### New files
| File | What it does |
|---|---|
| `src/hooks/workhub/useJqlResults.ts` | Executes a JQL string against `ph_issues` via the canonical `translate()` + `applyJqlToQuery()` engine. Cross-project (JQL decides scope). Resolves `currentUser()` → profile name. 100-row cap + exact total count. |
| `src/lib/jql/orderBy.ts` | `parseOrderBy()` — ORDER BY support the engine previously dropped. |
| `src/lib/jql/__tests__/orderBy.test.ts` | 6 unit tests for the above. |
| `src/components/filters/FilterResultsPanel.tsx` | The live results table. Mounts canonical `JiraTable` with the backlog's cell factories: `makeKeyCell`(+`JiraIssueTypeIcon`), `makeSummaryCell`, `makeStatusCell`(+lozenge appearance), `makeAssigneeCell`, `makePriorityCell`, `makeDateCell`, plus a Project column. 400ms debounce, sortable headers, row click → work-item detail by issue key, reports live count upward. |
| `src/pages/project-hub/filters/__tests__/filters-canonical-table.test.ts` | Guardrails: dynamic-table banned, results panel mounted, single Create CTA. |
| `design-governance/mockups/filters-revamp.html` | The visual mockup. |

### Rewritten / modified
| File | Change |
|---|---|
| `FiltersListPage.tsx` | REWRITTEN onto canonical JiraTable (was `@atlaskit/dynamic-table`). Columns: ★, Name+JQL mono subtitle, Owner(avatar), Viewers, Editors, Starred by, Last used, kebab. Row click → detail. Single Create CTA. 24px padding. |
| `CreateFilterPage.tsx` | REWRITTEN: controlled tabs (fixes dead "Edit in JQL" switch), persistent `FilterResultsPanel` under all tabs, template select → save modal pre-filled, cross-project hint in JQL tab. |
| `FilterDetailPage.tsx` | Added live results table below the JQL block; 24px padding. |
| `FilterSaveModal.tsx` | Added `resultCount` banner + `initialName`/`initialDescription` pre-fill. |
| `src/lib/jql/index.ts` | Exports `parseOrderBy`. |
| `src/routes/FullAppRoutes.tsx` | Added missing `/project-hub/filters/create` route (Create from the global list 404'd). |

### Verification evidence
- ADS audit: 0 violations on every touched file (`node design-governance/rules/audit.js`)
- `tsc --noEmit`: clean · eslint: 0 new errors · vitest: 11/11
- Supabase CRUD: INSERT row `d0db7186…` → UPDATE name/use_count → DELETE (0 remaining)
- JQL path: `status != Done` ⇒ 1,462 rows, 8 distinct project keys (cross-project proven)
- CI failures on the PR were all pre-existing on main (npm install broken, admin/product-settings Tailwind drift, claude-review action misconfig) — documented in PR comment

---

## 4 · HONEST PARITY DELTAS vs Jira (open items)

| Δ | Jira | Catalyst now | Severity |
|---|---|---|---|
| List toolbar | Search + **Owner / Project / Group dropdowns** | Search + My/Starred/Shared/Recent tabs | P1 — next parity cycle |
| List columns | ★, Name, Owner, Viewers, Editors, Starred by, ⋯ | same + **Last used** (Catalyst-only) | P2 — justify or remove |
| JQL engine | full boolean logic | `OR` / parentheses silently dropped (clauses AND'ed) | **P1 — wrong results for complex JQL** |
| Results table | inline edit in navigator | read-only | P2 |
| Product hub | n/a | no live preview (data source is business_requests) | P2 follow-up adapter |
| Ask CATY quality | Atlassian Intelligence | same Gemini function as before (UI improved, brain unchanged) | P1 if quality matters |

Recommended next cycle order: (1) JQL OR-logic, (2) Jira-exact list toolbar dropdowns, (3) browser-verified visual pass with DOM probes.
