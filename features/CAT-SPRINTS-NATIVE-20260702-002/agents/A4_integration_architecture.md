# A4 — Integration Architecture: Wiring, Data Flow & API Contracts
**Feature:** CAT-SPRINTS-NATIVE-20260702-002 · **Agent:** Integration Architect · **Date:** 2026-07-02
**Evidence base:** `src/lib/entity-hub/config.ts`, `src/hooks/workhub/useEntities.ts`, `src/pages/release-hub/ReleaseDetailPage.tsx`, `src/components/releases/detail/{ReleaseSidePanel,WorkItemsSection,AddWorkItemsModal}.tsx`, `src/hooks/useSprintBySlug.ts`, `src/components/shared/StatusLozenge/StatusLozengeDropdown.tsx`, `src/components/catalyst-detail-views/shared/hooks/useCatalystIssueMutations.ts`, `src/features/kanban-board/data/useKanbanMutations.ts`, `supabase/functions/summarize-release/index.ts`, `supabase/functions/ai-digest/index.ts`, `supabase/migrations/{20260616000000_board_insight_cache,20260618120000_release_operations_schema,20260516120000_bootstrap_full_schema}.sql`, `src/lib/catalyst-rules/{CatalystRules.ts,RULE_TABLE.md}`, `src/hooks/useReleaseHub.ts`, 13_COUNCIL_VERDICT.md probe evidence.

---

## 1. EntityConfig extension + current prop flow

### How config flows today (no fork exists — keep it that way)

```
SprintDetailPage (route /project-hub/:key/sprints/:sprintSlug)
  └─ <ReleaseDetailPage config={SPRINT_CONFIG} entityIdOverride listHrefOverride>
       ├─ entity query        keys [config.queryKeyPrefix,'one',id], select built from config.columnMap (ReleaseDetailPage.tsx:92–118)
       ├─ ProjectPageHeader   branch: config.kind ternaries for hubType/trail (lines 314–336)
       ├─ Summarize button    startSummary({ releaseId, entityKind: config.kind }) (line 297–304)
       ├─ HealthPanel         scope branch on config.kind==='sprint' (line 562–566)
       ├─ <WorkItemsSection config={config}>   membership query branches on kind (WorkItemsSection.tsx:240–286)
       └─ <ReleaseSidePanel config={config}>
            ├─ writes to config.table / config.columnMap (lines 173–223)
            ├─ status dropdown branch `next !== 'released' && config.kind !== 'milestone'` (line ~933)
            └─ <ApproversCard config> reads config.approvers {table, fkColumn, profileFkAlias} (lines 285–310)
```

Sprint-specific behavior is already injected exclusively through the config prop + `config.kind` guards. **All new sprint deltas go into `SPRINT_CONFIG` fields consumed at these existing branch points — never a `SprintDetailPage` fork.**

### Exact new EntityConfig fields

```ts
export interface EntityConfig {
  // …existing…

  /**
   * Membership linkage strategy. Replaces (supersedes) matchIssueByField for
   * the read path after S0.2 FK repoint. Release keeps jsonb-name until its
   * own migration; sprint moves to FK.
   */
  membership?:
    | { mode: 'jsonb-name' }                       // ph_issues.sprint_release [{name}]
    | { mode: 'fk'; fkColumn: 'sprint_id' };       // ph_issues.sprint_id

  /**
   * Entity status vocabulary + transition map. When present, ReleaseSidePanel's
   * status control renders THIS list instead of the release vocabulary and the
   * 'released' special-case branch is skipped for kinds that define it.
   */
  statusVocabulary?: {
    values: readonly string[];
    transitions: Readonly<Record<string, readonly string[]>>;
    initial: string;
    terminal: readonly string[];
  };

  /** Sprint-only capability block — undefined on RELEASE_CONFIG / MILESTONE_CONFIG. */
  sprint?: {
    lengthWeeksOptions: readonly (1 | 2)[];                    // [1, 2]
    naming: {
      defaultMode: 'auto';
      compute: typeof computeSprintAutoName;                   // client util, §2
    };
    dod: { table: 'ph_sprint_dod'; view: 'vw_sprint_dod_state' };
    approvalPolicy: {
      column: 'approval_policy';
      values: readonly ['any', 'all', 'quorum'];
      default: 'all';
    };
    joins: {
      releaseLink: {
        table: 'ph_release_sprints';
        selfFk: 'sprint_id';
        otherFk: 'release_id';
        otherTable: 'ph_releases';
      };
    };
  };
}
```

`SPRINT_CONFIG` sets:
- `membership: { mode: 'fk', fkColumn: 'sprint_id' }` (after S0.2; until then keep current behavior)
- `statusVocabulary: { values: ['planning','active','awaiting_approval','completed','canceled','archived'], transitions: {planning:['active','canceled'], active:['awaiting_approval','canceled'], awaiting_approval:['completed','active'], completed:['archived'], …}, initial: 'planning', terminal: ['completed','canceled','archived'] }`
- the `sprint` block above.

### Where branches live (no forking)
| Concern | File / branch point | Switch on |
|---|---|---|
| Membership query | `WorkItemsSection.tsx` ~240–286 (also remove-item ~427, add ~1140) | `config.membership.mode` (replaces kind-specific JSONB code) |
| Status control vocabulary | `ReleaseSidePanel.tsx` ~881–949 | `config.statusVocabulary ?? release default` |
| Start/Complete/Approve actions | ReleaseSidePanel action menu | `config.statusVocabulary.transitions` |
| DoD editor card | new `SprintDodCard` mounted in ReleaseSidePanel behind `config.sprint?.dod` | presence of `config.sprint` |
| Release-link chip | new card in ReleaseSidePanel behind `config.sprint?.joins.releaseLink` | presence |
| Length ribbon / auto-name | Create modal + list columns | `config.sprint?.lengthWeeksOptions` / `naming` |
| Approval decisions UI | existing `ApproversCard` (extend with decided_at/decision_note + policy from `config.sprint.approvalPolicy`) | presence |

Milestone/release compile untouched because every new field is optional.

---

## 2. Naming contract

### Client util — `src/lib/sprints/sprintAutoName.ts`

```ts
export interface SprintAutoName { name: string; endDate: string /* yyyy-mm-dd */; }

/**
 * <PROJECT_KEY>-Sprint <M>.<W> - <DD Mon YY>
 *   M = month number of startDate (1–12)
 *   W = ceil(startDay / 7)  — ordinal of the start day within its month
 *   endDate = startDate + (lengthWeeks === 1 ? 4 : 11) days   (Thursday for Sunday starts)
 *   date suffix rendered from endDate: 'DD Mon YY' (en-GB, 2-digit year)
 */
export function computeSprintAutoName(
  projectKey: string,
  startDate: string,          // ISO yyyy-mm-dd
  lengthWeeks: 1 | 2,
): SprintAutoName;
```

Pure, deterministic, no Date.now(). Create modal recomputes read-only whenever start date or length changes while `name_mode === 'auto'`; switching to `custom` frees the field; switching back recomputes.

### SQL mirror — authority lives in the DB

```sql
CREATE OR REPLACE FUNCTION public.sprint_autoname(
  p_project_key text, p_start date, p_length_weeks int
) RETURNS TABLE (name text, end_date date)
LANGUAGE sql IMMUTABLE AS $$
  SELECT p_project_key || '-Sprint '
         || extract(month from p_start)::int || '.'
         || ceil(extract(day from p_start) / 7.0)::int
         || ' - ' || to_char(p_start + (CASE WHEN p_length_weeks = 1 THEN 4 ELSE 11 END), 'DD Mon YY'),
         p_start + (CASE WHEN p_length_weeks = 1 THEN 4 ELSE 11 END)
$$;
```

### Where validation runs: **BEFORE INSERT/UPDATE trigger — DB is authority; client util is preview-only**

`trg_ph_jira_sprints_autoname` (BEFORE INSERT OR UPDATE OF start_date, length_weeks, name_mode, name):
- `name_mode = 'auto'` → recompute `NEW.name`/`NEW.end_date` from `sprint_autoname()` — **overwrite whatever the client sent**. Client and DB can never disagree; a stale client build cannot corrupt names.
- `name_mode = 'custom'` → dedupe collision with `-2`/`-3` suffix (same pattern as the F2 slug trigger).

Uniqueness contract:
- `UNIQUE (project_id, name)` constraint. Year lives in the auto-name date suffix → survives across years.
- Auto-mode collision (same project + same start + same length) is a *true duplicate* → constraint raises 23505; `useCreateEntity` onError surfaces "A sprint with this start date already exists" (map 23505 in the sprint create path).
- Custom-mode collision → trigger dedupe, never errors.
- `slug` frozen at insert by the existing (to-be-codified) slug trigger; renames are safe because membership is FK (§4/S0.2).

Hook contract: `useCreateSprint()` inserts `{ project_id, name, name_mode, start_date, end_date, length_weeks, status: 'planning', created_by, approval_policy }`. `useSprintBySlug` fix (S0.1): drop the `.is('deleted_at', null)` filter OR add the column — hook currently queries a column that does not exist on staging.

---

## 3. DoD evaluation — where does the check run?

**Recommendation: DB trigger on `ph_issues` (SECURITY DEFINER), not edge function, not client.**

| Option | Jira-synced items | Native items | Race safety | RLS | Verdict |
|---|---|---|---|---|---|
| **DB trigger AFTER UPDATE OF status, sprint_id ON ph_issues** | ✅ fires on jira-ingest service-role writes too | ✅ fires on every client mutation path | ✅ transactional; `SELECT … FOR UPDATE` on the sprint row serializes concurrent flips | ✅ SECURITY DEFINER bypasses RLS consistently | **RECOMMENDED** |
| Edge function | ❌ only if jira-ingest is modified to call it | ❌ needs every client path to call it (there are ≥5, §4) | ❌ two concurrent invocations can both read "not yet satisfied" | needs service role anyway | reject |
| Client check on detail load | ❌ | ❌ only fires if someone opens the page; "automatic when DoD satisfied" becomes "eventually, maybe" | ❌ multi-client double-transition | anon/user RLS may hide rows → wrong verdict | reject |

Contract — `fn_sprint_check_dod()` AFTER UPDATE OF `status`, `sprint_id` ON `ph_issues` FOR EACH ROW WHEN (`NEW.sprint_id IS NOT NULL OR OLD.sprint_id IS NOT NULL`):
1. `SELECT * FROM ph_jira_sprints WHERE id = NEW.sprint_id FOR UPDATE`; bail unless `status = 'active'`.
2. Evaluate `vw_sprint_dod_state` for the sprint: per `work_item_type` present in the sprint, every member item's status must equal `ph_sprint_dod.done_status` for its type OR have `status_category = 'done'` (v1 equality check; "at-or-beyond in ph_wf ordering" is a v2 refinement once the Sprint SDLC catalog gets its read surface).
3. All types satisfied ∧ member count > 0 → `UPDATE ph_jira_sprints SET status = 'awaiting_approval'` + advisory audit row. Never → `completed` directly (council verdict: auto-complete is banned; approval gate always intervenes).
4. Item leaving DoD while `awaiting_approval` does NOT auto-revert (human already in the loop; rejection reopens).

Ordering with the transition trigger (§4): both fire AFTER UPDATE OF status on ph_issues; name them `trg_a_wi_transition` / `trg_b_sprint_dod` — Postgres fires same-event triggers alphabetically, so the transition row exists before DoD evaluation (irrelevant to correctness but keeps audit order sane).

Client wiring: detail page invalidates `[SPRINT_CONFIG.queryKeyPrefix,'one',id]` + `'dod'` keys in every work-item status mutation's onSuccess it owns; a lightweight Supabase realtime subscription on `ph_jira_sprints` row (optional slice) makes the awaiting_approval flip visible without refresh.

---

## 4. Native transition writes (`work_item_transitions`, `jira_changelog_id NULL`)

### Status-mutation paths that exist today (all write `ph_issues.status` directly)

| Path | File | Notes |
|---|---|---|
| Detail-view status pill | `src/components/catalyst-detail-views/shared/hooks/useCatalystIssueMutations.ts:29–73` (`updateStatus`) | called by `StatusLozengeDropdown` consumers across ~15 detail views; already calls `recordAdvisoryStatusChange` (sourceSurface `catalyst_status_pill`) |
| Board drag / card dropdown | `src/features/kanban-board/data/useKanbanMutations.ts:106` (`updateStatus`) | also writes tasks.status_id variant |
| Bulk actions | `src/components/universal-work-view/UWVBulkActions.tsx` | multi-row status set |
| JiraTable inline status editors / hover card / For-You pickers | via `StatusLozengeDropdown` `onStatusChange` → per-surface mutations | StatusLozengeDropdown itself is **presentational** (`onStatusChange` callback, StatusLozengeDropdown.tsx:78) — it is NOT a chokepoint |
| Issue action dialogs, ConvertToSubtaskWizard, edge functions (issue-move etc.) | scattered | |

There is **no single client chokepoint** and StatusLozengeDropdown cannot become one (it doesn't own mutations). Migrating ≥5 mutation families onto one shared hook is a permanent drift risk — any future surface that forgets the hook silently loses history.

### Recommendation: **DB trigger on `ph_issues` — `fn_wi_record_transition()`**

AFTER UPDATE OF `status` ON `ph_issues` FOR EACH ROW WHEN (`OLD.status IS DISTINCT FROM NEW.status`):

```
INSERT INTO work_item_transitions (
  work_item_id            = NEW.id,
  from_status             = OLD.status,
  to_status               = NEW.status,
  from_status_category    = OLD.status_category,
  to_status_category      = NEW.status_category,
  transitioned_by         = COALESCE(profiles.display_name for auth.uid(), 'Catalyst user'),
  transitioned_at         = now(),
  time_in_from_status_ms  = now() − (SELECT max(transitioned_at) FROM work_item_transitions WHERE work_item_id = NEW.id),
  jira_changelog_id       = NULL          -- the native marker
)
```

**Jira-sync double-count guard (critical):** jira-ingest/catalyst-full-sync write `ph_issues.status` with the **service role**, and those same transitions later arrive via changelog backfill *with* `jira_changelog_id` set → the trigger must skip sync writes: `IF auth.uid() IS NULL THEN RETURN NEW; END IF;` (service-role/PostgREST-anon sessions have no uid; every native client mutation is an authenticated user). Escape hatch for edge functions acting *on behalf of* a user (issue-move): session GUC `SET LOCAL catalyst.record_transition = 'on'` to opt in.

This satisfies analytics gate leg 2 (probe: 0 native rows today) at every current AND future mutation path, transactionally, with zero client refactors. The shared-hook option is rejected; `recordAdvisoryStatusChange` remains advisory-only.

---

## 5. React Query hooks — inventory, new hooks, invalidation map

### Existing
| Hook | Key | Source |
|---|---|---|
| `useEntities(SPRINT_CONFIG)` / `useSprints` | `['projecthub-sprints','list']` | useEntities.ts:21 |
| `useEntity` / `useSprint` | `['projecthub-sprints','item',id]` | :37 |
| detail page entity query | `['projecthub-sprints','one',id]` | ReleaseDetailPage.tsx:106 |
| `useEntityProgress(ById)` | `['projecthub-sprints','progress'(,id)]` | :53/:68 |
| `useCreateEntity/useUpdateEntity/useDeleteEntity/useCanonicalSprintUpdate` | invalidate `['projecthub-sprints']` prefix | :84–186 |
| `useSprintBySlug` | `['sprint-by-slug',projectKey,slugOrId]` | useSprintBySlug.ts:7 |
| WorkItemsSection items | `['ph_entity_items',…]` | WorkItemsSection.tsx |
| ApproversCard | `['projecthub-sprints-approvers',id]` | ReleaseSidePanel.tsx:294 |

### New hooks (all under the `'projecthub-sprints'` prefix so the existing blanket invalidations keep working)
| Hook | Query key | Reads | Enabled gate |
|---|---|---|---|
| `useSprintDod(sprintId)` | `['projecthub-sprints','dod',sprintId]` | `ph_sprint_dod` + `vw_sprint_dod_state` | always |
| `useUpdateSprintDod()` | mutation | upsert `ph_sprint_dod` | — |
| `useSprintApprovals(sprintId)` | `['projecthub-sprints','approvals',sprintId]` | `ph_sprint_approvers` (+decided_at, decision_note, profiles embed) — extends ApproversCard's key; migrate its key to this | always |
| `useDecideSprintApproval()` | mutation | update approver row; evaluate policy (any/all/quorum) client-side against fresh rows; if satisfied → `useCanonicalSprintUpdate` to `completed`; if rejected → to `active` | — |
| `useSprintEfficiency(sprintId)` | `['projecthub-sprints','efficiency',sprintId]` | `work_item_transitions` (FK-joined members) | **gated: only after native-write + backfill proofs** |
| `useSprintScopeHistory(sprintId)` | `['projecthub-sprints','scope-history',sprintId]` | `work_item_changelogs` `field_name='sprint'` (forward-only; probe: 0 retroactive rows) | gated on rows existing |
| `useReleaseSprintLink(sprintId)` | `['projecthub-sprints','release-link',sprintId]` | `ph_release_sprints` + embed `ph_releases(name, release_date, slug)` | always |
| `useLinkSprintToRelease()` / `useUnlink…` | mutation | insert/delete `ph_release_sprints` | — |
| `useReleaseLinksForSprints(sprintIds)` | `['projecthub-sprints','release-links',sortedIds]` | batch for list Release column | list page |
| `useSprintsForRelease(releaseId)` | `['projecthub-releases','sprint-links',releaseId]` | release-side chips row | release detail |
| `useSprintSummaryCache(sprintId, dataHash)` | `['projecthub-sprints','summary',sprintId,dataHash]` | `sprint_summary_cache` | hash computed |

### Invalidation map
| Mutation | Invalidate |
|---|---|
| create/update/delete sprint | `['projecthub-sprints']` (prefix — existing behavior) |
| work-item status change (any path) | `['ph_entity_items']`, `['projecthub-sprints','dod',id]`, `['projecthub-sprints','one',id]`, `'progress'` |
| add/remove work item (AddWorkItemsModal / WorkItemsSection) | existing predicate refetch + `'dod'`, `'scope-history'`, `'efficiency'` |
| DoD edit | `'dod'`, `'one'`, `'list'` |
| approval decision | `'approvals'`, `'one'`, `'list'`, `'dod'` |
| link/unlink release | `'release-link'`, `'release-links'`, `['projecthub-releases']`, `['projecthub-releases','sprint-links',releaseId]`, `['release-hub','sprints-map']` |
| summary regenerate | `['projecthub-sprints','summary',sprintId]` |

---

## 6. Edge functions

### summarize-release (reuse — already entity-aware)
Request contract (existing): `POST functions/v1/summarize-release` body `{ improve_type: 'summarize_release_v2', stream: true, release_id, entity_kind: 'sprint' }`. `fetchReleaseContext` already swaps `ph_jira_sprints` for `ph_releases` when `entity_kind==='sprint'` (index.ts:93–99) — **but its item link is the sprint_release JSONB name match (index.ts:118). S0.2 must repoint this branch to `ph_issues.eq('sprint_id', releaseId)`** or summaries silently go empty after the FK migration. Prompt context extension (verdict §6): approver rows + decisions, contributors, scope-change list — appended in `buildPrompt` behind `entityKind === 'sprint'`.

### sprint_summary_cache — read/write contract
Clone of `board_insight_cache` **minus user scoping** (a sprint summary is entity-truth, not per-user):

```sql
CREATE TABLE sprint_summary_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sprint_id uuid NOT NULL REFERENCES ph_jira_sprints(id) ON DELETE CASCADE,
  data_hash text NOT NULL,
  summary jsonb NOT NULL,          -- { text, model, generated_at }
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sprint_id, data_hash)
);
-- RLS: SELECT to authenticated; INSERT/UPDATE via edge function service role only.
```

Flow: client computes SHA-256 over sorted tuples `(issue_key|status|assignee|updated_at)` + approver rows + sprint dates/status (verdict §6) → `useSprintSummaryCache` SELECT → **hit**: render inline instantly, no AI call → **miss or force**: invoke summarize-release with `data_hash` in body; edge fn upserts the cache row (service role) after the stream completes. Old hashes garbage-collect via `ON DELETE CASCADE` + periodic archive-cleanup (existing fn) or `DELETE WHERE sprint_id = X AND data_hash <> current` on write.

### Health narration
Health score is deterministic client-side (verdict §7) — ship it without AI. If narration is added, extend `ai-digest` with a `sprint-health` mode (it already routes `board-insight | ageing-triage | workload-risk | morning-brief | release-risk`, index.ts:142); do NOT overload `board-insight`'s payload shape. Cache via the same `sprint_summary_cache` row (`summary.health_narration`). Recommend deferring to Phase 3.

---

## 7. CRE check — what may be added to a sprint

JK's rule: any work item EXCEPT product-module items and business requests. Grid A: **PRODUCT owns exactly `Business Request` + `Business Gap`** — so JK's two exclusions collapse into one predicate:

```ts
import { getOwningModule, normalizeType } from '@/lib/catalyst-rules/CatalystRules';
export function canAddToSprint(typeName: string | null): boolean {
  if (!typeName) return false;                       // zero-assumption: unknown type → not addable
  return getOwningModule(normalizeType(typeName)) !== 'PRODUCT';
}
```

**Yes — CRE already encodes the module ownership needed** (`MODULE_OWNED_TYPES` / `getOwningModule()`, CatalystRules.ts:65/186). Subtask family returns `null` from `getOwningModule` → allowed (correct: universal). **Chokepoint function to call: `getOwningModule()` — wrapped as a new exported `canAddToSprint()` + `validateSprintMembership(): CREValidationResult` in CatalystRules.ts.** This is a new product rule → requires `/cre add` + Vikram confirmation + a RULE_TABLE.md row (proposed: Grid I "Sprint membership: PRODUCT-owned types banned from sprints").

Enforcement point: `AddWorkItemsModal` — filter the ph_issues search results (`items.filter(it => canAddToSprint(it.issue_type))`) behind `config.kind === 'sprint'` (release keeps current behavior), and re-validate inside the mutation loop (reject with `validateSprintMembership().reason` toast) so a stale list can't sneak one in. CRE is client-side today (no DB grid enforcement exists anywhere) — DB CHECK is out of v1 scope, consistent with Grids A–D.

**Open decision for JK:** literal reading of the rule allows ENTERPRISE types (Theme/Objective/Snapshot) into sprints. Recommend excluding ENTERPRISE too (`module !== 'PRODUCT' && module !== 'ENTERPRISE'`) but this needs explicit confirmation before the CRE row is written.

---

## 8. Sprint ↔ release join

### Table (migration §5 of verdict order) — modeled on `rh_release_sprints` (20260618120000:208)
```sql
CREATE TABLE ph_release_sprints (
  release_id uuid NOT NULL REFERENCES ph_releases(id)      ON DELETE CASCADE,
  sprint_id  uuid NOT NULL REFERENCES ph_jira_sprints(id)  ON DELETE CASCADE,
  linked_by  uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (release_id, sprint_id)
);
-- indexes on each FK; RLS mirroring ph_releases policies.
```
Note: the rh_* prior art points at `anchor_sprints` — do NOT reuse the rh table; it's the wrong sprint entity.

### Hook + mutation contracts (from §5)
- `useReleaseSprintLink(sprintId)` → `{ release: { id, name, slug, release_date, status } | null }` (v1: single link; PK allows many, UI enforces one from the sprint side).
- `useLinkSprintToRelease({ sprintId, releaseId })` → insert; `useUnlinkSprintFromRelease` → delete. Both invalidate per the §5 map.
- UI: create-modal optional single-select "Link to release"; side-panel editable chip retargeting the orphaned `SprintLinker` chip UX (`src/components/releases/SprintLinker.tsx` — retarget its queries from rh_release_sprints/anchor_sprints to ph_release_sprints/ph_jira_sprints).

### What the release side reads
- Release detail (config.kind==='release'): new "Sprints" chips row via `useSprintsForRelease(releaseId)` → `ph_release_sprints` embed `ph_jira_sprints(name, slug, status, start_date, end_date)`; chips navigate via `Routes` sprint builder (`src/lib/routes.ts:36` — already registered: `sprint(projectKey, sprintSlug)`).
- Sprint list "Release" column: `useReleaseLinksForSprints(sprintIds)` → map sprint_id → `{ name, release_date, slug }`; renders linked release name + **its** release_date (Release Hub owns that date — sprint never duplicates it).

---

## Cross-cutting risks
1. **S0.2 repoint touches three readers in lockstep:** WorkItemsSection query, `vw_sprint_jira_progress`, and summarize-release's `fetchReleaseContext` sprint branch. Miss any one → silent empty data.
2. **Trigger discriminator assumption** (`auth.uid() IS NULL` = sync) must be probe-verified on staging before S0.1c ships: confirm jira-ingest writes carry no uid and a browser mutation does.
3. **`useSprintBySlug` is broken today** (`deleted_at` filter on a missing column) — S0.1 blocking everything navigable.
4. ApproversCard key migration (`projecthub-sprints-approvers` → `['projecthub-sprints','approvals',id]`) must update its own invalidations in the same slice.
