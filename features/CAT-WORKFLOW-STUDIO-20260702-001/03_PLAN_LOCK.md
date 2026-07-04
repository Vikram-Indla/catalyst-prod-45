# WORKFLOW STUDIO — Full Revamp Plan
**Feature Work ID (proposed): CAT-WORKFLOW-STUDIO-20260702-001**
17 agents: 10 discovery + 5 council advisors + 2 planners. Live-DB verified on prod (lmqw) + dev (cyij).

---

## Context — what's actually wrong

Your complaint ("cumbersome, hard to manage, wiring is a big issue") decomposes into 3 verified diseases:

1. **The empty board is a wiring bug, not a feature gap.** Dev DB (cyij) `ph_workflow_statuses` is missing the `archived_at` column; code filters `.is('archived_at', null)` → PostgREST 400 → error silently swallowed (`{data}` destructure) → "No statuses" rendered as if legit. Prod has 44 statuses / 88 type-mappings / 55 transitions for BAU. Error state masquerading as empty state.
2. **Split-brain engines.** The editing UI (`/admin/workflows`) writes LEGACY `ph_workflow_*` tables — but the runtime (kanban drag, status pill) enforces the NEW canonical versioned engine `ph_wf_*` (14 tables, draft/publish, transitions+roles+guards+reason codes, schemes, enforcement, audit — ~70% complete, Story/Epic already blocking-enforced). **Every edit you make today is a placebo — the runtime never reads it.** Meanwhile the canonical engine's admin panel (10 tabs) is read-only.
3. **Fragmentation.** 3 separate workflow editors + 1 mapping page; 17 flat type chips; 11 competing hardcoded work-item-type registries in TS; 12 entity families with independent status models; 2 legacy tables never even created by migrations (hand-created → fresh envs break).

## COUNCIL VERDICT

**Where the panel agrees (5/5):** Consolidation IS the feature; the Studio UI is its skin. Build ALL new editing on the canonical `ph_wf_*` engine — any hour spent on legacy UI is negative work. Fix wiring + error-swallowing first. AI generation must output DRAFTS only, never auto-publish.

**Where the panel clashes:** 10-level hierarchy — Challenger calls it spec inflation (Jira ships 4-5 practical levels); resolution: build a **configurable levels table capped at 10** (cheap, additive) but sequence it LAST. Sprints — forcing date-derived lifecycle into a status machine is "falsification"; resolution: sprints/product_releases stay date-derived, shown in Studio as read-only "system-managed" lifecycle.

**What the panel caught:** (a) AI workflow generation before consolidation = generating into a system that doesn't execute; (b) `ph_wf_versions.template_id` is NOT NULL FK to legacy `ph_workflow_templates` — legacy templates table is load-bearing, can't drop; (c) opportunity — draft/publish + versioning + guard audit already EXCEEDS Jira Cloud (Jira sells that via Marketplace plugins); version-diff + audit-derived flow metrics are headline features.

**Recommendation: PROCEED WITH MODIFICATIONS** — sequence: wiring fix → engine consolidation → Studio UI → types → AI → hierarchy.

---

## TARGET INFORMATION ARCHITECTURE

One surface: **`/admin/workflows` = Workflow Studio**. Six tabs. Old pages redirect into it. Full width everywhere (`AtlaskitPageShell flush={true}` — no max-width containers, non-negotiable). ADS typography tokens via canonical `Heading`/`PageHeader`.

### Wireframe A — Studio home
```
┌ AtlaskitPageShell (flush, full width) ─────────────────────────────────────────┐
│ PageHeader: "Workflow Studio"          [Search…] [⚡Caty: Generate] [Create ▾]  │
│ Tabs: [Workflows] [Schemes] [Statuses] [Work item types] [Enforcement] [Audit] │
├──────────────┬─────────────────────────────────────────────────────────────────┤
│ LEFT RAIL    │  JiraTable — workflows for selected group                       │
│ (4 groups,   │  Name          Entity   Status     Ver  Projects  Updated      │
│  NOT 17      │  Story flow    story    ●Published v4   12        2d ago       │
│  flat chips) │   └ Draft in progress   ◐Draft     v5   —  [Edit][Discard]     │
│ ▾ Standard   │  Epic flow     epic     ●Published v2   12        1w ago       │
│   Story    3 │  …                                                             │
│   Epic     1 │  Row click → editor (draft if exists, else read-only published │
│   Feature  1 │  + [Create draft]). Overflow ▾: Edit draft · View published ·  │
│ ▾ QA         │  Duplicate · History (drawer) · Assign to scheme               │
│   Defect,Incident                                                              │
│ ▾ Business   │                                                                 │
│   BR·Milestone·Release·Sprint(read-only,date-driven)                           │
│ ▾ Subtasks   │                                                                 │
└──────────────┴─────────────────────────────────────────────────────────────────┘
```

### Wireframe B — Workflow editor (diagram-first + transition property panel)
```
┌ Breadcrumbs: Workflow Studio / Story / "Story flow"        ◐ DRAFT v5 (from v4)│
│ [Diagram|Board]  [+ Status] [+ Transition] [⚡Caty] [History] [Discard] [Publish…]│
├───────────────────────────────────────────────────┬────────────────────────────┤
│  DIAGRAM (@xyflow — reuse CatalystWorkflowBuilder)│ DETAIL PANEL (contextual)  │
│   (start)──▶[Backlog]──▶[In Progress]──▶[Review]  │ "In Progress → Review"     │
│                 ▲   ╲          │                  │ Type: forward         ▾    │
│                 │    ╲──▶[Blocked]                │ ☑ Requires reason          │
│              [Done]◀───────────┘                  │   Codes: [blocked-dep][+]  │
│   Edge click → transition panel                   │ ☐ Requires comment         │
│   Node click → status panel (label, category,     │ Roles: [PM][Eng Lead][+]   │
│    initial/terminal, reopen, color token)         │  ☑ assignee ☑ reporter     │
│   Board toggle = category columns w/ dnd reorder  │  ☑ super-admin bypass      │
│                                                   │ Guards: qa_signoff ●block  │
│                                                   │  [+ Add guard ▾ 21 types]  │
│                                                   │ [Delete transition]        │
└───────────────────────────────────────────────────┴────────────────────────────┘
Publish modal: status/transition delta vs published + affected-project count +
remap requirement for statuses holding live items. History = right drawer (v5
draft · v4 published · diff view · restore-as-draft), not a separate page.
```

### Wireframe C — Work item types manager (custom types + hierarchy)
```
├ HIERARCHY (configurable, ≤10 levels, dnd reorder) ──────────────┬ TYPE DETAIL ─┤
│  Lvl 1 ◇ Business Request [system]                              │ Name, Icon   │
│  Lvl 2 ◇ Milestone        [system]                              │ Color token▾ │
│  Lvl 3 ◆ Epic   Lvl 4 ◆ Feature   Lvl 5 ◆ Story·Task·Defect…    │ Kind:(•)Main │
│  Lvl 6 ▪ Subtask kinds            [+ Add level] (max 10)        │     ( )Sub   │
│ ── All types (JiraTable) ──                                     │ Group ▾      │
│  Type     Kind     Level  Group     Workflow         Items      │ Parent rules │
│  Story    main     5      standard  Story flow v4    1,204      │ Workflow:    │
│  Risk ✎   main     5      business  — [Assign▾][⚡Generate]      │ link or gen  │
│  [+ Create type]                                                │ [Archive]    │
└─────────────────────────────────────────────────────────────────┴──────────────┘
Create custom type → immediately offer: assign existing workflow OR ⚡generate.
Archive blocked with item count + reassign-to-type picker. System types locked.
```

### Wireframe D — AI generate (prompt → preview → draft)
```
Step 1: ⚡ Modal — "For type: [Defect ▾]", prompt textarea, start-from blank|current.
Step 2: Preview modal — read-only mini xyflow diagram + "6 statuses · 9 transitions
· 2 guards" + warnings (e.g. guard w/o evidence source). [Regenerate w/ edits]
[Accept as draft →] → writes ph_wf_* DRAFT rows, opens editor with banner
"Draft generated by Caty — review before publishing". AI NEVER publishes.
Errors render inside modal w/ retry — never a blank close.
```

### Wireframe E — Statuses tab + safe delete
```
│ JiraTable: Status | Category(lozenge) | Used in workflows | Items | ✎ 🗑        │
│ 🗑 → Modal: "⚠ 12 items in 'Blocked' across 3 projects. Reassign to: [In       │
│ Progress ▾] (same-category suggested). Published versions immutable — new      │
│ draft created for: Story flow." [Cancel] [Reassign & delete] (danger)          │
│ Delete disabled+tooltip when it would strand a published version. Never silent.│
```

**Empty vs error contract (repo-wide rule for Studio):** `isLoading` → skeleton; `isError` → `SectionMessage appearance="error"` + actual message + Retry; `length===0` → EmptyState with CTA. A failed query NEVER renders an empty state.

---

## DATA MODEL

### Canonical engine (exists — becomes the only write path)
`ph_wf_versions` (draft/published/superseded/archived) → `ph_wf_version_statuses`, `ph_wf_version_transitions` → `ph_wf_transition_roles`, `ph_wf_transition_guards` (21 types; 6 have real evidence), `ph_wf_reason_codes`, `ph_wf_field_requirements`; `ph_wf_schemes`/`scheme_entries`/`scheme_assignments` (project binding); `ph_wf_status_remaps`; `ph_wf_enforcement_config` (advisory|blocking per project×entity); `ph_wf_audit` + `ph_wf_admin_audit`.

### New tables
1. **`ph_work_item_types`** — org-scoped type registry (type_key, display_name, icon, color_token w/ token-only CHECK regex, kind standard|subtask, hierarchy_level_id FK, entity_key → ph_wf mapping, default workflow binding, is_system for the 11 seeded types, archived_at). Replaces 11 TS registries (they become fallback readers). Existing unused `ph_work_types`/`wh_work_types` frozen — wrong shapes.
2. **`ph_hierarchy_levels`** — org-scoped, `level_rank 0..9` (10-level cap), name/icon/token. Seeds from hi_hierarchy_levels.
3. **`ph_hierarchy_parent_rules`** — child_type_id → parent_type_id pairs; replaces `parent-rules.ts` + `hierarchy.ts` TS constants; `hi_validate_parent_level` trigger rewritten to read it. ltree deferred (pairwise validation doesn't need it).
4. **`workflow_generation_cache`** — prompt_hash unique, request/response jsonb, expires; RLS admin-only.

### Draft-editing model (decision)
Edit `lifecycle='draft'` version rows DIRECTLY — no shadow diff table. Drafts invisible to `gateTransition()` (resolves published only) = inherently safe. `ph_wf_assert_draft()` trigger on all 5 child tables blocks edits to published rows. Clone-on-edit: editing published calls `ph_wf_create_draft(from_version_id)` (deep copy).

### RPCs (all SECURITY DEFINER + admin assert + admin_audit write; RLS: reads open, writes RPC-only)
- Draft CRUD: `ph_wf_create_draft`, `ph_wf_upsert_status`, `ph_wf_delete_status(…, rewire_to)`, `ph_wf_upsert_transition`, `ph_wf_delete_transition`, `ph_wf_set_transition_roles/guards`, `ph_wf_set_field_requirements`, `ph_wf_discard_draft`
- Lifecycle: `ph_wf_validate_draft` (initial exists, terminal reachable, no orphans), `ph_wf_publish_version(version, remaps)` — refuses publish if live items sit on statuses absent from new version without a remap; batch-remaps live rows; supersedes prior. `ph_wf_clone_version`
- Schemes/repair: `ph_wf_apply_scheme`, `ph_wf_reassign_statuses` (batched)
- Types/hierarchy: `wt_upsert_work_item_type`, `wt_archive_work_item_type(…, reassign_to)`, `hi_upsert_level`, `hi_set_parent_rules`
- AI: edge fn `ai-generate-workflow` (clone `ai-generate-stories`: Gemini 2.5 Flash, `response_format json_object`, temp 0, content-hash cache) + `ph_wf_import_generated(cache_id)` → draft

### ph_issues CHECK → registry (without breaking Jira sync)
CHECK constraint is hand-applied drift (not in migrations). Drop defensively via pg_constraint scan. Add nullable `type_id uuid REFERENCES ph_work_item_types NOT VALID` → backfill batched → VALIDATE. `BEFORE INSERT/UPDATE` trigger: Jira-sourced unknown types AUTO-REGISTER into registry (never reject sync); native writes RAISE on unregistered type. `issue_type` text column stays forever (20+ views filter on literals).

### Entity unification (per family)
| Family | Strategy |
|---|---|
| story/epic/feature/subtask | Already canonical; publish Subtask v1 (fix lifecycle) |
| defects | Seed defect ph_wf version w/ 16 statuses; adapter (exists) |
| incidents (enum) | Adapter maps enum↔status_key; enum→text deferred |
| change_requests (TEXT+CHECK) | Adapter; drop CHECK at cutover — gateTransition becomes validator |
| releases (enum) | Extend existing adapter |
| business_requests | Adapter exists (process_step remap) — keep |
| planner tasks | Adapter planner_statuses.id↔status_key (best legacy model) |
| **sprints / product_releases** | **Stay date-derived**; read-only lifecycle view in Studio ("system-managed") |
| test cycles | Adapter w/ per-schema params; schema unification out of scope |

### Legacy disposition
- `ph_workflow_type_statuses` + `ph_workflow_transitions`: real `CREATE TABLE IF NOT EXISTS` migrations (DDL dumped from prod) — fixes fresh-env breakage.
- `ph_workflow_templates` x3: KEEP (load-bearing NOT NULL FK from ph_wf_versions).
- `ph_workflow_statuses`/assignments: freeze writes after Studio ships (revoke, notice trigger). Drops deferred entirely.
- cyij repair: `ADD COLUMN IF NOT EXISTS archived_at timestamptz` (idempotent, safe on prod). All migrations idempotent — drift is a standing assumption.

---

## IMPLEMENTATION PHASES (2h slices, Plan Lock per phase)

**P0 — Stop the bleeding (Day 1, 2 slices)**
0.1 cyij `archived_at` repair + real CREATEs for 2 hand-created tables + verify board renders. Screenshot before/after.
0.2 Kill error-swallowing in all workflow hooks (surface `isError` → SectionMessage). Verify: break a query → see error, not "No statuses".

**P1 — Engine write path (3 slices)**
1.1 `ph_wf_assert_draft` triggers + draft CRUD RPCs + `ph_wf_validate_draft`.
1.2 Lifecycle RPCs (publish w/ remap safety, clone, discard, apply_scheme, reassign batched).
1.3 `src/hooks/workflow-v2/useWorkflowDraft.ts` (optimistic, draft-is-the-save-buffer) + publish Subtask v1.

**P2 — Workflow Studio UI (4 slices)**
2.1 Studio shell: route swap `/admin/workflows` → `WorkflowStudioPage` (AtlaskitPageShell flush + 6 @atlaskit/tabs + grouped left rail + JiraTable list). Redirects from `/admin/workflows/versions` (+tab deep-links), project-settings tab → read-only projection linking to Studio.
2.2 Editor: rewire `CatalystWorkflowBuilder` off `useTypeWorkflow` onto draft hooks (data-adapter prop); board view (pragmatic-dnd).
2.3 Detail panels: transition properties (type, requires_reason+codes, roles, guards w/ evidence badges), status properties; History drawer + Publish modal w/ delta+remap.
2.4 Statuses tab + safe-delete reassignment modal; Schemes + Enforcement + Audit tabs (upgrade existing read views into Studio).

**P3 — Work item types + hierarchy config (3 slices)**
3.1 Registry migrations + seeds (11 system types, 4 levels, parent rules from TS).
3.2 Types manager UI (create custom main/subtask type, icon/token picker, group, archive w/ reassign).
3.3 CHECK→registry swap (defensive drop, type_id backfill, auto-register trigger) + `hi_validate_parent_level` rewrite + consumers read registry (create modals, filters fallback-first).

**P4 — AI workflow generation (2 slices)**
4.1 Edge fn `ai-generate-workflow` + `workflow_generation_cache` + `ph_wf_import_generated`.
4.2 CatyIconCTA modal flow (prompt → preview diagram → accept as draft). Drafts only.

**P5 — Entity unification sweep (3-4 slices, one family per slice)**
Defect seed, incident/CR adapters, planner adapter, sprint read-only lifecycle view. Freeze legacy writes (final slice).

**P6 — Hierarchy depth (LAST, 1-2 slices, behind flag)**
Level CRUD to 10, parent-rule editor, JiraTable depth rendering already generic (16px/level).

Deferred/out of scope: legacy table drops, test-cycle schema unification, guard evidence sources for the 14 advisory-only guard types (separate feature), prod deployment of ph_wf_* (own gate).

## Verification
- Per slice: `npm run lint:colors:gate` + `audit:ads:gate`, tsc clean, screenshot signoff on 8080.
- P0 acceptance: BAU board renders 44 statuses on cyij.
- P1 acceptance: create draft → edit → publish → kanban drag enforces new transition (gateTransition) → audit row.
- P2 acceptance: one Studio page does everything the 3 old editors did; old URLs redirect.
- P3 acceptance: create custom type "Risk" → appears in create modal + gets workflow → Jira sync unaffected (auto-register test).
- P4 acceptance: prompt → draft → human publish → runtime enforces.
- Regression: existing Story/Epic enforcement keeps working after every slice (kanban drag probe).

## Why user-friendly + enterprise-level
- One mental model (list → edit draft → publish) replacing 3 editors/27 tabs+chips; blast radius always visible (schemes, affected-project counts, delta preview).
- Draft/publish immutability + full audit + reason codes + role-gated transitions = change-control story Jira Cloud doesn't expose (Marketplace-only there). Version history + diff + restore.
- Safe destructive paths everywhere (reassign-on-delete, archive guards, publish remap checks). Errors never masquerade as empty.
- AI accelerates but never publishes — defensible governance.
- Full-width flush layout, ADS tokens only, canonical components (JiraTable, AtlaskitPageShell, @atlaskit/tabs, xyflow, pragmatic-dnd) — consistent with every migrated hub.

## Key files
Engine: `src/lib/workflow/canonical/runtime.ts`, `contracts.ts`, `supabase/migrations/20260628200000_ph_wf_foundation.sql`, `src/hooks/workflow-v2/useWorkflowFoundation.ts`
UI to build: `src/pages/admin/workflows/studio/*` (new), reuse `CatalystWorkflowBuilder.tsx` (rewire), `src/components/ads/AtlaskitPageShell.tsx`, `src/components/shared/JiraTable/`, `CatalystListPageLayout`
UI to retire: `WorkflowAdminPage.tsx` (1376-line monolith), `WorkflowVersioningPage.tsx` (folds into Studio), project-settings `WorkflowTab.tsx` (becomes projection)
Types: `src/types/work-item-canon.ts`, `src/components/icons/icons.registry.ts` (become fallbacks), `parent-rules.ts`/`hierarchy.ts` (replaced by tables)
AI: clone `supabase/functions/ai-generate-stories/index.ts`; CTA `src/components/ui/CatyIconCTA.tsx`
Sync: `supabase/functions/catalyst-full-sync/index.ts` (type auto-register touchpoint)
