# COUNCIL VERDICT — Catalyst-Native Sprint Module Redesign
**Feature Work ID (proposed):** CAT-SPRINTS-NATIVE-20260702-001
**Date:** 2026-07-02 · **Requested by:** JK · **Panel:** Challenger, Root-Cause Thinker, Opportunity Finder, Fresh Eyes, Action Coach + Q1/Q4/Q5 challenges
**Evidence:** 3 parallel deep code-discovery agents (sprint surface, release module, reusable patterns). Jira DOM probe NOT performed — Chrome extension disconnected mid-session; must re-run /jira-compare before pixel-level layout signoff.

## Where the panel agrees (unanimous)
1. **Linkage first or nothing works.** Work-item↔sprint membership is triple and inconsistent: `sprint_id` FK (rename-safe), `ph_issues.sprint_release` JSONB name-match (what the detail page reads), `ph_issues.sprint_name` text (what the progress view reads; Jira sync overwrites it — a 710-row backfill reverted to 2 rows in minutes). Auto-naming makes rename a first-class action; on name-matched links that is silent data loss. Consolidating to `sprint_id` FK + neutering the Jira sync writer is the prerequisite for every other feature.
2. **Sprints are a release wearing a costume.** All sprint UI is shared release components via `SPRINT_CONFIG` (src/lib/entity-hub/config.ts): release statuses (planning|in_progress|released|archived), "Release date" column, released/unreleased vocabulary. The redesign must give sprints their own status vocabulary.
3. **Analytics are gated on unproven data.** Time-in-status, efficiency, scope-change history, sprint health all depend on `work_item_transitions` / `catalyst_status_history` / `work_item_changelogs` whose population is unverified (prior evidence: empty pending Jira changelog backfill) AND on Catalyst-native status changes writing to those tables going forward (unverified). Zero-assumption rule: render nothing until proven.
4. **~Half the scope is reuse, not build:** ph_sprint_approvers + ApproversCard, summarize-release edge fn, board_insight_cache hash pattern, TimeInStatus widgets, dependency kit, SprintLinker chip UI (orphaned), Sprint SDLC workflow catalog (ph_wf_*, no read surface yet), PLN-N/catalyst_slugify trigger prior art.
5. **Already broken today:** `useSprintBySlug` selects `slug`/`deleted_at` columns no migration added to `ph_jira_sprints` (the slug migration targeted `public.sprints`). Probe DB first.

## Where the panel clashes
- **Approvals in v1?** Action Coach: yes (wiring, table exists). Q5: defer one release. Resolution: keep — it is genuinely cheap AND it resolves the auto-complete landmine (below).
- **AI summary in v1?** Q5 calls it fashion; Opportunity Finder calls it nearly free. Resolution: keep, but only as "existing button + cache table" (1 slice), no new AI surface.
- **Status injection across all work-item types:** everyone flags it as the most dangerous item — statuses are hardcoded across ~6 TS files (defectWorkflow.ts, kanban columnConfig, workItem.types, project-hub.types, releasehub.design, ads/internal/status). It is a global regression surface disguised as a sprint feature. Resolution: split into its own Feature Work ID; sprint DoD reads the *status catalog that already exists per type* rather than injecting new statuses everywhere in v1.

## What the panel caught that was missed
- **Auto-complete → awaiting_approval, not → completed.** DoD satisfaction should transition the sprint to `awaiting_approval` (or prompt if no approvers), never silently complete it. Merges JK's two asks and removes the "sprint closes under a PM mid-work" trap.
- **The naming sample contradicts itself:** 07 Jan 26 is a **Wednesday**; a Sun 04 Jan 26 start with a Thursday end is **08 Jan 26**. And "1.1" for Jan 7 is ambiguous (calendar week 2). Fixed by defining W = week-of-month of the START Sunday (see naming spec).
- **Year collisions:** the end-date in the name carries the year ("07 Jan 26"), so `(project_id, name)` uniqueness survives across years — but only if the date stays in the name. Custom names get trigger dedupe (`-2`).
- **`sprint_iteration` does not exist** — it's a UI label over sprint_name/sprint_release/sprint_id. "Wiring to sprint_iteration" = wiring those three to the FK.
- **work_item_changelogs field_name='sprint' gives retroactive membership history for free** once backfill is proven.
- **The Sprint SDLC catalog (draft→planning→ready_to_start→active→scope_change_review→closing→completed/canceled) already encodes scope-change review and a no-open-blocker completion guard** — this redesign is its first read surface.

## Catalyst-specific flags
- JiraTable rule: the sprint list currently renders through ReleasesTable (hand-rolled `<table>`); a rebuilt list must move to JiraTable or file written proof.
- Slug contract: `ph_jira_sprints` needs `slug` + trigger + routes.ts builder + useSprintBySlug fix — new navigable rows must never use UUID params.
- ADS tokens only; length ribbon/lozenge, status pills via statusPalette/Lozenge; AI trigger = CatyPulseIcon (canonical, magenta, never muted).
- ph_sprint_approvers.status has no CHECK constraint — add one (pending|approved|rejected).
- Screenshot signoff required for every UI slice; DOM/DB probes for functionality.
- Jira parity probe (JK's mandatory DOM probe) OUTSTANDING — Chrome extension disconnected. Run /jira-compare on the versions page + boards before pixel signoff.

## RECOMMENDATION
**Proceed — with modifications and strict sequencing.**
- Core (proceed): native sprint entity, FK-only membership, dead-data purge, sprint status vocabulary, auto|custom naming, 1w/2w lengths, list cleanup, create modal, sprint→release link, approvals with awaiting_approval, cached AI summary.
- Renegotiated (build UI, gate data): time-in-status, efficiency, scope-change history, sprint health — ship only after 3 proofs: (1) one Catalyst-native status change writes a transition row; (2) changelog backfill run + validated for one project; (3) FK linkage is sole read path.
- Split out (own feature ID): common-status injection across all work-item types.

---

# DESIGN DECISIONS (taken tonight, per JK's instruction)

## 1. Auto-naming specification
Format (Option A, recommended, JK's structure corrected):
`<PROJECT_KEY>-Sprint <M>.<W> - <DD Mon YY>`  → `BAU-Sprint 1.1 - 08 Jan 26`
- **M** = month number of the sprint START date (1–12). Month rollover: a sprint STARTING in Feb = 2.1 regardless of January leftovers. Two-week sprint spanning months is named from its start month.
- **W** = ordinal of the start-Sunday within that month: `ceil(startDay / 7)` → deterministic from start date alone; immune to gaps created by custom-named sprints; mid-week starts still resolve (W from actual start date).
- **Date suffix** = computed END date (Thursday): start + 4 days (1W) or start + 11 days (2W). Carries the year → uniqueness across years.
- 2W sprints: same name structure; length is signalled by the ribbon/lozenge and end date, NOT the name (Option B `1.1/2W` and Option C ISO-week `W02` and Option D global sequential documented as alternates — rejected for noise/ambiguity).
- Name recomputes read-only in Auto mode whenever start date or length changes. Custom mode frees the field; switching back to Auto recomputes. `name_mode` stored. Uniqueness: `(project_id, name)` + trigger dedupe for custom collisions. Slug frozen on creation; renames safe because membership is FK.
- Server-side: `sprint_autoname()` SQL function (mirror of client util) validates on insert — client and DB can never disagree.

## 2. Sprint status model (replaces release vocabulary)
`draft? → planning → active → awaiting_approval → completed | canceled` + `archived` (terminal). DB CHECK on ph_jira_sprints.status widened: `planning | active | awaiting_approval | completed | canceled | archived` with migration mapping (`in_progress→active`, `released→completed`). Aligned to the ph_wf Sprint SDLC catalog (its first read surface). Transitions:
- planning→active: manual "Start sprint" (needs start date + ≥1 item, warn otherwise).
- active→awaiting_approval: **automatic when DoD satisfied** (or manual "Request approval").
- awaiting_approval→completed: approval policy satisfied (or instant if zero approvers → confirm dialog).
- awaiting_approval→active: any rejection reopens with reason.
- completed→archived: manual/auto after N days.

## 3. Definition of Done model
`ph_sprint_dod (sprint_id FK, work_item_type text, done_status text, created_at)` — one row per type present in the sprint; default `Done` for every type (seeded at creation; editable in create modal "Definition of done" section and on detail page). Evaluation view `vw_sprint_dod_state`: per type, counts of items at/beyond DoD status (status order from the per-type catalog). All satisfied → trigger/edge check flips sprint to awaiting_approval. Statuses offered per type come from the existing per-type catalogs (defect workflow already has UAT READY/IN BETA/READY FOR PROD etc.); the "common four" (In QA/In UAT/In Beta/In Production) become a separate cross-module feature.

## 4. Approval model
Reuse `ph_sprint_approvers` (+ CHECK on status; + `decided_at timestamptz`, `decision_note text`). Sprint gets `approval_policy text CHECK (any|all|quorum) DEFAULT 'all'` and `created_by uuid` + `created_at` (creator avatar).
- 1 approver → that one decision completes/rejects.
- 3 approvers, policy=all → all three approve; any reject → back to active.
- 4 approvers, policy=quorum → majority (3 of 4) approves; ties keep waiting.
- Timeline: every decision timestamped (decided_at, by user); shown as avatars + lozenge (Pending/Approved/Rejected) + relative time in the Approvals card; full trail in the sprint report; included in AI summary context.

## 5. Sprint↔release link
New join `ph_release_sprints (release_id FK→ph_releases, sprint_id FK→ph_jira_sprints, linked_by, created_at, PK(release_id,sprint_id))`, modeled on rh_release_sprints. Optional single-select in create modal ("Link to release"), editable chip in the side panel (retarget the orphaned SprintLinker chip UX). Release detail gains a "Sprints" chips row; sprint list's Release column shows the linked release name + its release_date from the Release Hub.

## 6. AI summary caching
`sprint_summary_cache (sprint_id, data_hash, summary jsonb, created_at, updated_at, UNIQUE(sprint_id, data_hash))` — clone of board_insight_cache. Hash = SHA-256 over sorted tuples of (issue_key|status|assignee|updated_at) + approver rows + sprint dates/status. Summarize Sprint checks cache first; regenerates only on hash change or force-refresh; prompt context extended with approvals + contributors + scope changes.

## 7. Sprint health
Deterministic score (no AI needed to compute; AI narrates):
`health = 100 − penalties`: pace gap (DoD progress % vs time-elapsed %), open blocker deps (work_item_dependencies unresolved where dependent in sprint), overdue vs end date, approval stalls (>48h awaiting), unassigned items. Bands: ≥80 On track / 50–79 At risk / <50 Off track. Trigger: CatyPulseIcon button beside More actions — enabled ONLY when (transitions populated ∧ dates set ∧ ≥1 item); disabled state has tooltip listing what's missing. Click → CatyInsightCard panel: % + band + "what's pending" list (approver names, items not at DoD, blockers) + release date from linked release.

## 8. Sprint efficiency (comparable across 1W/2W — all ratios, no absolutes)
Per completed sprint, from work_item_transitions:
- CR (completion) = items at DoD by end ÷ committed items (committed = members at start; late adds excluded from denominator, reported separately). 40%
- FE (flow efficiency) = Σ active-status time ÷ Σ total cycle time of completed items. 25%
- SS (scope stability) = 1 − (late adds + removals) ÷ committed. 20%
- TA (timeliness of approval) = 1 if approved ≤48h after DoD; linear decay to 0 at 7d. 15%
`efficiency = 40·CR + 25·FE + 20·SS + 15·TA` → 0–100. Length-independent by construction; comparison chip "vs last sprint ±n". Time-in-status detail: per item per status per assignee-at-the-time (transitioned_by), longest-dwell first — "why did this take so long" answerable per user. GATED on data proofs (Q4).

## 9. Scope-change history
Source: work_item_changelogs where field_name='sprint' (retroactive) + forward writes from Catalyst add/remove paths (must add: AddWorkItemsModal writes a changelog row when mutating membership). Report section: "Added after start" table (item, who, when, days-before-end); last-day adds flagged with warning lozenge.

## 10. List page spec
Columns: Sprint (name + 1W/2W lozenge) · Status (pill) · Progress (fraction + segmented bar by status category) · Start date · Sprint end · Release (linked chip; its release date) · Owner (creator avatar) · ⋯. REMOVED: Description column, Project dropdown, density/hide menu. Group-by: **Month** (from start date, "January 2026" headers, newest first) and **Status**; filter lozenges Released… replaced with status filter (All / Planning / Active / Awaiting approval / Completed / Archived). Table = JiraTable (replaces ReleasesTable for sprints). Health % appears once gated analytics ship.

## Migration order
1. `ph_jira_sprints`: add slug + trigger + deleted_at (+ fix useSprintBySlug), created_by, name_mode, length_weeks CHECK (1|2), approval_policy, end_date. Register routes builder.
2. Backfill sprint_id FKs from JSONB/name matches (count-verified), repoint WorkItemsSection + vw_sprint_jira_progress to FK; stop Jira sync writes to sprint_name for native sprints.
3. Status vocabulary migration (map in_progress→active, released→completed) + widen CHECK.
4. `ph_sprint_dod` + seed defaults; approvers CHECK + decided_at.
5. `ph_release_sprints` join.
6. `sprint_summary_cache`.
7. Soft-delete dead Jira sprints (deleted_at), after count audit.

## Slice plan (each ≤2h; Plan Lock before code)
Phase P — Probes (no code): information_schema on ph_jira_sprints; row counts on the 3 history tables; linkage counts (FK vs JSONB vs name); dead-sprint audit; native-status-change write test.
Phase 0 — Foundations: S0.1 slug/columns migration+hook fix · S0.2 FK backfill + read repoint · S0.3 status vocabulary · S0.4 dead-data soft purge.
Phase 1 — List+Create: S1.1 JiraTable list w/ new columns · S1.2 group-by Month/Status + progress · S1.3 modal auto|custom naming + length picker + ribbon + avatar · S1.4 release link (join table + chip).
Phase 2 — Lifecycle: S2.1 DoD table+editor · S2.2 awaiting_approval flow + policy · S2.3 approver decisions UI + timestamps.
Phase 3 — Insights (gated): S3.1 summary cache · S3.2 dependencies section · S3.3 scope-change history · S3.4 health · S3.5 time-in-status + efficiency.
Deferred/cut from v1: common-status injection (own feature), backlog-health analog, cross-sprint comparison dashboards (cheap later), SprintLinker revival beyond the chip.

## Ten industry standards embedded
1. Fixed timeboxes (1W/2W only) — cadence over calendars.
2. Explicit, per-type Definition of Done agreed at planning.
3. Human gate on completion (approval), automation only proposes.
4. Immutable audit trail (who approved/added/changed, when).
5. Scope-change transparency (late adds visible, never punished silently).
6. Flow metrics (cycle/flow efficiency) over story-point velocity.
7. Single source of truth for membership (FK, rename-safe).
8. Ratio-based cross-sprint comparability (never raw counts across different lengths).
9. Render nothing over fabricated data (zero-assumption).
10. Cached, invalidation-hashed AI summaries — AI narrates verified data, never invents state.

## THE ONE THING TO DO RIGHT NOW
Run the staging DB probe: does `ph_jira_sprints` have slug/deleted_at, and do `work_item_transitions`/`catalyst_status_history`/`work_item_changelogs` contain rows? Every sequencing decision above hangs on those two answers.

---

# PROBE EVIDENCE (executed 2026-07-02, post-verdict "go")

## DB probes — app DB = cyijbdeuehohvhnsywig (staging), probed via PostgREST + anon key
- **`ph_jira_sprints.slug` EXISTS** on staging (sample: `sprint21-08-may-2025`) — patched out-of-band; NOT in any checked-in migration → codify it in a migration to end schema drift.
- **`ph_jira_sprints.deleted_at` DOES NOT EXIST** → `useSprintBySlug`'s `.is('deleted_at', null)` filter is querying a missing column. S0.1 confirmed necessary (add column or fix hook).
- **26 sprints total: 25 `released`, 1 `archived`** — 100% dead Jira imports, zero active/planning. Purge plan confirmed; names show old convention ("Sprint2.8 - 03 Jul 2025", "IP-Sprint 2.3-27 Nov 25").
- **`work_item_transitions`: 2,085 rows, 1,278 with `time_in_from_status_ms`** → changelog backfill HAS run (at least partially). Analytics gate leg 1 partially met.
- **Native transitions: 0 rows with `jira_changelog_id IS NULL`** → Catalyst-native status changes write NOTHING to transitions. Analytics gate leg 2 FAILS — a native write path (trigger or hook) is a new required slice before efficiency/time-in-status ship.
- **`work_item_changelogs`: 3,054 rows but 0 with `field_name='sprint'`** → sprint membership history is NOT retroactively available on staging; late-add tracking starts from our own instrumentation, not from backfill.
- **`catalyst_status_history`: 0 rows.**
- **`ph_sprint_approvers` exists (0 rows). `ph_release_sprints` does not exist** (PGRST205) — join migration confirmed needed.
- **RLS caveat:** `ph_issues` returned count 0 to the anon key (app clearly has data) → linkage counts (sprint_release JSONB vs sprint_name vs FK) need an authenticated/service-role probe; anon numbers for those are unreliable.
- **Environment drift flag:** the session's Supabase MCP points at `catalyst-prod` (lmqwtldpfacrrlvdnmld) where `ph_jira_sprints` DOES NOT EXIST AT ALL. The app's env files point at cyijbdeuehohvhnsywig. Prod and staging schemas have diverged materially.

## Jira DOM probe — digital-transformation.atlassian.net BAU versions (12+ interactions)
1. Version detail status control = **action verbs** ("Release", "Archive") in the dropdown, not a status picker.
2. "Summarize release" opens the **Rovo chat drawer** (agentic, streaming, not cached inline) → Catalyst's cached inline CatyInsightCard is a genuine differentiator, keep JK's design.
3. Work-items section filters: search, Epic, **Status category = TO DO / IN PROGRESS / DONE checkbox lozenges**, Warnings (**dev signals**: Unreviewed code / Open pull requests / Failing builds), Assignee; Sort by Date created. Catalyst can repurpose "Warnings" for DoD/approval/blocker warnings.
4. Clicking a row opens an **embedded work-item side panel** with an interactive colored status dropdown button (e.g. green "Ready for QA"), parent, severity, priority.
5. "Release notes" = generated modal, items **grouped by work-item type**, Copy to clipboard / Save.
6. Releases LIST: columns Release · Status lozenge · Progress bar · Start date · Release date · Description · More actions; **overdue release dates render in red danger text**; **contextual inline "Release" quick-action button** appears on eligible rows; single multi-select status filter (Released/Unreleased/Archived; default Unreleased-only); count banner "This space has 47 releases".
7. Kebab menu: Release / Archive / Merge / Edit / Delete.
8. **Create release modal: Release name*, Start date + Release date (both default today), "Driver" avatar person-picker (defaults to creator), Description. No project field.** → Catalyst create-sprint modal should mirror the Driver pattern for created-by/owner.

## Plan adjustments from evidence
- S0.1 splits: (a) codify slug in a migration (already live), (b) add deleted_at OR remove the filter from useSprintBySlug, (c) NEW: native transition write path (DB trigger on status update writing work_item_transitions with jira_changelog_id NULL) — prerequisite for all Phase-3 analytics.
- Late-add/scope history: no retroactive data — instrument AddWorkItemsModal + membership mutations from day one; history accrues forward.
- Linkage counts probe re-run needed with service role before the S0.2 backfill.
- List design: adopt Jira's red overdue end-dates, contextual quick-action ("Start sprint"/"Complete sprint") on eligible rows, and count banner. Status filter = multi-select checkboxes defaulting to non-archived.
