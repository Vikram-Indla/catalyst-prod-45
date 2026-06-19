# 05 — Backend Wiring Plan (Gate 5)

> Authoritative against live pg catalog (project `lmqwtldpfacrrlvdnmld`). Non-destructive only. RLS in same migration as any table change (CLAUDE.md). Apply via `apply_migration` MCP. Smoke-test before any edge-function run.

## 1. Tables — confirmed live (DO NOT recreate)
| Table | Cols | Rows | Role |
|---|---|---|---|
| `ph_saved_filters` | 27 | 10 | **canonical** saved filter object |
| `ph_filter_versions` | 6 | 11 | immutable version history (FK `filter_id`) |
| `filter_derived_views` | 9 | 2 | kanban/roadmap/dashboard derived from filter (FK `source_filter_id`) |
| `boards` (+`board_columns`,`board_status_mappings`) | — | — | board; `boards.filter_id` FK → filter |
| `saved_filters` | 10 | 0 | **legacy, dead** — only `SearchPage.tsx` |
| `task_saved_filters` | 6 | — | separate, hook is stub/unused |

`ph_saved_filters` columns (full): `id, name, user_id, is_shared, filter_config(jsonb), page, created_at, updated_at, description, jql_query, viewers_config(jsonb), editors_config(jsonb), starred_by_user_ids[], owner_id, used_by_board_ids[], hub_scope, last_used_at, use_count, health_status, project_key, subscriber_ids[], jira_filter_id, jira_owner_name, jira_owner_account_id, share_permissions(jsonb), edit_permissions(jsonb), product_key`.

**No new tables required.** Governance schema is complete.

## 2. Required backend behavior — status
| Behavior | Status | Action |
|---|---|---|
| CRUD saved filters | ✅ `workhub/useSavedFilters` | none |
| Version on create/change | ✅ `useRecordFilterVersion` writes `ph_filter_versions` | none |
| Star/unstar | ✅ `useStarFilter` (array) | none |
| Subscribe/unsubscribe | ✅ `useToggleFilterSubscription` (`subscriber_ids`) | none |
| Copy filter | ✅ `useCopyFilter` | none |
| Transfer ownership | ✅ `useChangeFilterOwner` | none |
| Change visibility / editors | ⚠️ write works for owner; **editors can't write (G4)** | **B1/B2 RLS fix** |
| Record usage | ✅ `useRecordFilterUsage` (`use_count`,`last_used_at`) | none |
| Query execution | ✅ `applyJQLFilters` → `ph_issues` | C-phase consolidate (2 paths → 1) |
| Derived Kanban | ✅ `useCreateKanbanFromFilter` → `boards`+children | G-phase idempotency verify |
| Derived Roadmap/Dashboard | ✅ `useCreate*FromFilter` → `filter_derived_views` | verify |
| Linked-entity lookup | ❌ stub `[]` (G3) | **E1 new hook** |
| Health computation | ✅ `health_status` column (server-computed) | verify compute trigger/job exists |
| WhatsApp summary | ✅ edge fn — ⚠️ no fallback (G9) | **H1 client fallback** |
| Export | ❓ not confirmed | verify directory export action exists; defer if absent |

## 3. RLS — current + required change
### Current (live, all clean — no jwt anti-pattern)
- `ph_saved_filters_select`: owner/user OR org-types OR project-member OR product-member OR specific-user. ✅
- `ph_saved_filters_insert`: CHECK `user_id = auth.uid()`. ✅
- `ph_saved_filters_update`: `user_id OR owner_id`. ⚠️ **no editor branch.**
- `ph_saved_filters_delete`: `user_id OR owner_id`. ✅ (correct — delete stays owner-only)
- `ph_filter_versions_{select,insert,delete}`: parent-ownership gated, insert CHECK `changed_by = auth.uid()`. ✅
- `fdv_{select,insert,update,delete}`: owner-based + org via `user_can_see_filter`. ✅

Helper fns (all `SECURITY DEFINER STABLE`, params currently named `p_*` — good, no shadowing):
- `ph_saved_filter_is_project_member(p_project_key, p_user)` → ph_project_members ∘ ph_projects.key
- `ph_saved_filter_is_product_member(p_product_key, p_user)` → product_members ∘ products.code
- `user_can_see_filter(p_filter_id, p_uid)` → is_shared/owner/user (looser; G12, leave per ASK)

### Required migration (Phase B) — non-destructive
```sql
-- B1: editor-write helper (qualified params per 2026-06-10 lesson)
CREATE OR REPLACE FUNCTION public.ph_saved_filter_can_edit(p_filter_id uuid, p_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ph_saved_filters f
    WHERE f.id = p_filter_id
      AND ( f.user_id = p_user
         OR f.owner_id = p_user
         OR ( (f.editors_config ->> 'type') = 'specific'
              AND (f.editors_config -> 'user_ids') ? (p_user)::text ) )
  );
$$;

-- B2: UPDATE policy honors editors
DROP POLICY IF EXISTS ph_saved_filters_update ON public.ph_saved_filters;
CREATE POLICY ph_saved_filters_update ON public.ph_saved_filters
  FOR UPDATE TO authenticated
  USING ( user_id = auth.uid() OR owner_id = auth.uid()
          OR public.ph_saved_filter_can_edit(id, auth.uid()) )
  WITH CHECK ( user_id = auth.uid() OR owner_id = auth.uid()
               OR public.ph_saved_filter_can_edit(id, auth.uid()) );

-- B3: indexes (G5) — non-destructive
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_owner_id ON public.ph_saved_filters (owner_id);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_product_key ON public.ph_saved_filters (product_key);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_starred_gin ON public.ph_saved_filters USING gin (starred_by_user_ids);
CREATE INDEX IF NOT EXISTS idx_ph_saved_filters_viewers_gin ON public.ph_saved_filters USING gin (viewers_config);
```
**Rollback note:** restore prior UPDATE policy (`user_id OR owner_id`); `DROP FUNCTION ph_saved_filter_can_edit`; `DROP INDEX` the 4 new indexes. No data touched.

**Delete safety:** UPDATE now allows editors, but DELETE policy is unchanged (`user_id OR owner_id`) — editors can edit but NOT delete/transfer. Matches widget copy + master prompt §3.9.

## 4. Indexes — see B3. Rationale
- `owner_id`: SELECT RLS branches on `owner_id = auth.uid()`; directory "My filters" filters by owner.
- `product_key`: product-hub directory + RLS product-member branch.
- GIN `starred_by_user_ids`: "Starred" tab queries `starred_by_user_ids @> [uid]`.
- GIN `viewers_config`: SELECT RLS uses jsonb `?`/`->>` on viewers_config every row.

## 5. Edge functions — status
| Fn | Status | Action |
|---|---|---|
| `generate-whatsapp-summary` | ✅ deployed, hallucination-guarded; **no fallback** | client-side fallback (H1) — no fn change |
| `jira-filter-sync` | ✅ syncs Jira → ph_saved_filters | verify 2026-data guard applies |
| `jql-validate` | ✅ validates JQL string | reuse in builder |
| `standup-summary` | ✅ exists | out of scope |

No new edge functions required.

## 6. Migration discipline
1. One migration file for Phase B (fn + policy + indexes together).
2. `apply_migration` MCP (auditable).
3. Smoke-test: direct SQL — editor uid → can_edit true; stranger → false; 2-user isolation (editor saves OK, stranger UPDATE → 0 rows).
4. Re-probe `pg_policies` + `pg_indexes` to confirm landed.
5. Commit migration file to `supabase/migrations/` with explicit path.

## 7. ASK-Vikram gates (do NOT execute without sign-off)
- **G6**: migrate/drop legacy `saved_filters` + `SearchPage` rewiring (touches global Search — outside Filters module).
- **G11**: drop `task_saved_filters` table.
- **G12**: tighten `user_can_see_filter` to scoped logic (may be intentional).
- **Activity/notifications**: confirm a filter-activity system exists before building events (Phase F4/I). If none, scope separately.
