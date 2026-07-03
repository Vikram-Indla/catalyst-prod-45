# Session 001 — 2026-07-02 — Discovery + Council + Plan Lock + P0

- Ran 17 agents (10 discovery, 5 council advisors, 2 planners) via /anthropic-skills:council.
- Live-DB verified: prod (lmqw) healthy for BAU workflows; cyij missing archived_at on ph_workflow_statuses → empty board root cause.
- Plan approved by Vikram (plan mode ExitPlanMode) → 03_PLAN_LOCK.md.
- Executing P0.1 (cyij repair + real CREATE migrations) and P0.2 (unswallow errors).

## P0 log
- ROOT CAUSE (deeper than plan): cyij drift = missing archived_at column + missing FKs on ph_workflow_type_statuses/transitions (PostgREST embed dead) + RLS disabled on both. AND error invisibility had TWO extra layers: (1) React Query pauses retries when tab unfocused → status pending/paused renders as neither loading nor error; (2) canonical ads SectionMessage wrapper passed action objects raw to Atlaskit → crashed error boundary the first time an error DID render.
- P0.1: migration `20260702120000_workflow_wiring_repair.sql` (archived_at, CREATE IF NOT EXISTS both tables, FK backfill DO-block, RLS enable + 4 policies). Applied to cyij via Management API; verified has_col=1, ts_fks=2, tr_fks=3, pols=4.
- P0.2: WorkflowAdminPage StatusBoard + TemplatesView + CatalystWorkflowBuilder now render SectionMessage(error, Retry) on `isError || error`; fixed SectionMessage wrapper to wrap actions in SectionMessageAction.
- VERIFIED live on 8080: board renders Story workflow 11 statuses (3 To do / 2 In progress / 6 Done, ★ initial); error banner shows real cause when column missing (probed both states). Diagram toolbar reports 11 statuses • 20 transitions.
- Gates: tsc clean, lint:colors:gate 0/0, audit:ads:gate all at baseline.
- Screenshots: before (empty board), error state, after (populated board) — captured in session.

## P1 log (same session, all staging cyij only per staging-first rule)
- P1.1 (main 029f7cd92): migration 20260702130000_ph_wf_draft_crud.sql — draft-guard trigger on 5 child tables (invoker-rights, NOT definer — definer ran as postgres and silently disabled the guard; caught in test), admin-asserted RPCs (create_draft deep-clone idempotent, status/transition upsert+delete w/ rewire, roles/guards/field-req bulk set, discard, validate_draft w/ reachability BFS), ph_wf_versions.layout jsonb. Smoke: full lifecycle 7 audit rows; guard verified blocking published edits as role authenticated.
- P1.2 (main c25e79e8d): migration 20260702140000_ph_wf_lifecycle.sql — publish_version (validate → remap-required for removed statuses → persist remaps → supersede → repoint scheme entries → audit), apply_scheme, reassign_statuses (batched 5k, ph_issues entities via ph_wf_entity_issue_types). Acceptance on cyij: story draft minus qa_failed BLOCKED w/o remap, published w/ remap → v1 superseded, remap row, scheme entry → v3; original content republished as v4 (18 statuses). History: v1 superseded / v2 archived / v3 superseded / v4 published.
- P1.3 (main dae47ce7b): src/hooks/workflow-v2/useWorkflowDraft.ts (14 hooks over RPCs); fixed useCloneVersionToDraft (selected nonexistent cols label/display_order/metadata → empty drafts) + useCreateDraftVersion → both delegate to ph_wf_create_draft. tsc clean.
- Discovery correction: all 11 entities have published v1 on cyij incl. task+sprint+subtask (WorkflowVersioningPage "NONE" cells are stale in-file hardcode; Plan-Lock note about publishing Subtask v1 obsolete).
- NEXT: P2.1 Studio shell (route swap, 6 tabs, grouped rail, JiraTable list, redirects).

## P2.1 log
- (main a3609347d) WorkflowStudioPage live at /admin/workflows: AtlaskitPageShell flush, 6 @atlaskit/tabs, 4-group rail (11 entities, draft ◐ + published vN badges, Sprint=auto read-only), JiraTable version list w/ lifecycle lozenges, statuses preview panel (lozenges + ★ initial), PublishModal (validate → publish, refusal shows remap message), create/discard draft actions. Legacy editor → /admin/workflows/classic; engine admin stays /admin/workflows/versions; interim tabs hand off there.
- UI-verified on staging: story v1–v4 history renders; row click → 18 status lozenges; create draft → v5 ◐ → discard → archived. Screenshot signoff in session.
- Gotchas: JiraTable onRowClick passes ROW not id; ads-audit gate enforces spacing grid (no 10/14/18px) + bans textTransform uppercase labels.
- NEXT: P2.2 editor (rewire CatalystWorkflowBuilder onto draft hooks, board view) → P2.3 property panels/history drawer/publish delta → P2.4 statuses/schemes/enforcement/audit tabs.

## P2.2 log
- (main 5321b5a8c) WorkflowEditorPage at /admin/workflows/:versionId/edit — xyflow canvas over ph_wf_* draft hooks: add status (toolbar), drag-connect transitions, edge × delete, node drag persists layout to ph_wf_versions.layout (debounced 800ms), publish/discard header, read-only published w/ create-draft CTA, global-IN count lozenge. Canvas primitives exported from CatalystWorkflowBuilder (autoLayout generalized to Array<{id}>). Studio home draft actions navigate into editor; PublishModal + entities extracted to studio/ modules.
- Verified live: story draft v6 renders 18 statuses + 21 transitions; toolbar add "Security Review" → RPC → DB row → node on canvas (cleaned after). Draft v6 left alive for Vikram.
- Gotchas: ReactFlow renders SILENT 0-HEIGHT if flex chain broken — AtlaskitPageShell needs constrainHeight + explicit canvas min-height. ads-scanner false positives (xyflow css import, fitView padding fraction) annotated ignore-next-line. dataUpdatedAt in graph-rebuild deps = transient 0-node flash during refetch (cosmetic).
- NEXT: P2.3 property panels (transition: type/reason/roles/guards; status: flags/category), history drawer, publish delta+remap picker. Then P2.4 tabs.

## P2.3 log
- (main 417e0e731) EditorPanels.tsx: TransitionPanel (type select, requires reason/comment, roles editor w/ assignee/reporter/bypass flags, guards editor w/ evidence/advisory lozenges from GUARD_EVIDENCE_REGISTRY, delete) + StatusPanel (rename w/ frozen key, category, initial/terminal/exception/reopen/requires-reason flags, delete w/ rewire Select). HistoryDrawer.tsx (CatalystDrawer, restore-as-draft blocked while a draft exists). PublishModal upgraded: delta lozenges added/removed vs published + remap Select per removed key → p_remaps. useTransitionDetail hook + targeted invalidation.
- UI-verified on draft v6: edge click → panel shows seeded product_owner role card; requires_reason toggle persisted to DB + reverted; publish modal delta "Replaces published v4 … no statuses added or removed". Screenshot in session.
- Gotchas: ads Select takes OPTION OBJECTS ({value,label}), not raw strings — silent no-op otherwise; typography enforcer requires raw h2 inline styles to match approved px/weight pairs — use ads Heading instead; ReactFlow edge clicks in automation need dispatch on the g.react-flow__edge group.
- NEXT: P2.4 — fold Statuses/Schemes/Enforcement/Audit/Reason-codes tabs into Studio (write-capable where RPCs exist), retire interim handoffs + point project-settings WorkflowTab at Studio; then decide classic builder retirement.

## P2.4 log
- (main 53c44db9a) StudioTabs.tsx: SchemesTab (cards w/ entity→version lozenges + assign-to-project via ph_wf_apply_scheme), StatusesTab (published registry per entity + open-diagram jump), EnforcementTab (toggle w/ evidence pre-flight reuse), AuditTab (entity+mode filters). Interim handoffs removed except Work item types (P3). Project-settings WorkflowTab gets Studio banner (legacy board columns only).
- Verified live: Schemes card "Default Canonical Scheme DEFAULT · 1 project" + 11 lozenges incl. STORY V4 (publish repoint visible); Enforcement rows + toggles render; Audit table renders. Screenshots in session.
- P2 COMPLETE. Engine admin page (/admin/workflows/versions) + classic builder (/admin/workflows/classic) still reachable via header links — retirement decision deferred (versions page still has Migration-preview/Reason-codes/Health extras not yet folded).
- NEXT: P3.1 registry migrations + seeds (ph_work_item_types, ph_hierarchy_levels, ph_hierarchy_parent_rules) → P3.2 Types manager UI → P3.3 CHECK→registry swap + trigger rewrite.

## P3.1 + P3.2 log
- P3.1 (main d0f95b434): migration 20260703100000 — ph_hierarchy_levels (rank 0-9, 6 seeded L1 BR→L6 Subtask), ph_work_item_types (kind standard|subtask, group_key, token-only color CHECK, entity_key engine binding, is_system; 20 seeded matching live ph_issues.issue_type strings), ph_hierarchy_parent_rules (42 from parent-rules.ts); RPCs wt_upsert (system identity frozen), wt_archive (system refused), hi_upsert_level, hi_set_parent_rules. cyij verified: 6/20/42/16 engine-bound.
- P3.2 (main d41e5a010): WorkItemTypesTab (hierarchy strip, types JiraTable w/ icons+SYSTEM lozenges+workflow jump, detail panel: create custom main/subtask, icon/group/level, parents checkboxes, archive). useWorkItemTypes hooks. Key index made partial (archived frees key) after live duplicate-key hit — error banner surfaced correctly.
- E2E on cyij via UI: Create "Risk" → parents (root+Epic) persisted → archived. Screenshot in session.
- NEXT: P3.3 — ph_issues CHECK→registry swap: defensive CHECK drop, type_id uuid NOT VALID FK + batched backfill by display_name, BEFORE trigger auto-registering unknown Jira-sourced types (native writes RAISE), rewrite hi_validate_parent_level to read ph_hierarchy_parent_rules, consumers read registry (CreateStoryModal WORK_TYPES etc.) w/ hardcoded fallback.

## P3.3 log (main d3b8cd6f5)
- migration 20260703110000: CHECK dropped via pg_constraint scan; type_id FK NOT VALID → 2394/2394 backfilled → validated; BEFORE trigger ph_issues_resolve_type (SECURITY DEFINER for the auto-register insert past RLS): jira* source auto-registers unknown types, native RAISEs w/ Studio pointer. Tested: jira 'Spike' auto-registered, native 'Wibble' refused, native 'Story' resolved (cleaned; note: ph_issues has a delete guardrail — app.force_jira_cleanup=true to bypass in tests).
- CreateStoryModal appends registry custom main types to curated catalogue.
- DEFERRED: hi_validate_parent_level trigger rewrite (hi_work_items appears dormant; parent rules enforced via registry+UI; revisit if hi_* revived).

## P4+P5+P6 log (main b83c0d4fb)
- P4: ai-generate-workflow edge fn DEPLOYED to cyij (Gemini JSON-mode, grammar + few-shot after first-round validation failures proved the validator), workflow_generation_cache + ph_wf_import_generated (drafts only, refuses non-empty human draft). E2E: change_request generated from prose → draft v1 (8 statuses/8 transitions) → validate ok. GenerateWorkflowModal wired to Caty button in Studio header.
- P5: classic builder deprecation banner + Studio header link removed. Legacy write-freeze DEFERRED until MapStatuses absorbs board-column grooming (classic is the only column-groomer today).
- P6: HierarchyLevelsCard — add level (cap 10), click-to-rename, enable/disable. L7 'Initiative' added live then left in place (harmless, no types attached).
- ALL PHASES COMPLETE. Remaining deferred items listed in decisions.

## Phase D — design remediation (Vikram design-critique 2026-07-03; H-score was 14/30 HALT)
- AUDIT: 405 probed defect instances / 16 root causes via Chrome-MCP DOM probes; canon = Backlog (th 12/653 sentence, td 14/400, rows 39-40px, status lozenges uppercase 11/653 PER Vikram's 2026-06-09 lozenge directive — the real D1 defect was lozenge OVERUSE on non-status chips, not uppercase itself). Full inventory in ~/.claude/plans/fuzzy-weaving-shamir.md.
- SHIPPED (main 4b7e947a2): one-baseline Workflows tab (single card + Edit/Publish/Discard/History; version table + row dropdown DELETED — popup-detach P0 dies with it); usePortal on all 14 selects (clipped-menu P0); non-status chips → CatalystTag (uppercase 195→status-only, matches Backlog); editor nodes sentence-case/no-tracking/on-grid; 12px above tabs + 24px title alignment; CRE C1 (system parents read-only RULE_TABLE mirrors) + C3 (Grid B reconcile migration 20260703130000, 66 rules on cyij). Two crash-fixes en route (HistoryDrawer + CatalystTag missing imports — tsc missed both, runtime caught).
- CLOSE-OUT (main 723bb852d): CatalystTag→SimpleTag when read-only (phantom × killed); guard evidence/advisory + v{n} chips → tags; post-fix probe = 0 tracking all tabs, uppercase = status/state lozenges only (Backlog-identical), rows 38-39px (canon). Green-arrow evidence screenshot in chat. Rescore: H4 3/3, H8 2/3 (sparse tabs by data, not defect), H9 3/3 → 27-28/30 estimate; formal full rescore pending Vikram signoff. CRE chip session DID land (07d884cde) — CORRECTION: wiring uses filterCreatableTypes/getAllowedChildTypesWithRegistry/canLinkTo (not getAllowedTypesForModule directly, which my grep checked). CreateStoryModal, both InlineCreates, IssueTypeSelector, LinkToolbar/LinkedWorkItems, SubtasksPanel, BacklogPage wired; scripts/cre-chokepoint-gate.cjs in .husky/pre-commit + npm lint:cre; engine gained isCREGovernedType + registry-aware child lookup (custom types registry-authoritative, CRE types locked). Gate + tsc verified green; Studio smoke clean. CRE C2 CLOSED.
- OLD NEXT-CONVERSATION CONTRACT (mostly done): remaining slices = row-density fine-tune vs 40px canon (D9); Schemes/Statuses/Types void layout (2-col grid, D11); publish/generate modal + editor-panel re-probe; red→green arrow closure evidence per design-critique protocol + full H1-H10 rescore ≥29/30; CRE C2 chokepoint wiring (getAllowedTypesForModule into CreateStoryModal/InlineCreate — pre-existing repo-wide gap, chip spawned). Auditor JS + canon numbers in the plan file. Do NOT touch engine/RPCs. Staging only.

---

## F-SLICES CLOSED (2026-07-03, session continuation)

Directive: "Production is not something which is mandatory now, but fix everything which is functional stuff." Prod rollout excluded; F2 (level runtime enforcement) by-design — pairwise parent rules govern, levels organize.

### Commits (main-direct)
- `da6b9eba7` — F1 + F3
- `fc2cd71b0` — F4 + F5 + F6 + F7 + F8 + usePortal-dup sweep

### What landed
- **F1** custom-type workflow binding: migration `20260703140000` (wt_upsert_work_item_type assigns entity_key = type_key for custom types, backfill; APPLIED to cyij; E2E passed w/ Risk type). Registry fallback (display_name → entity_key) in useCanonicalIssueWorkflow + useCatalystIssueMutations. Types tab "Create workflow" per bound type; Caty modal lists custom entities.
- **F3** table reason capture: backlog + releases adapters throw typed `WF_REASON_REQUIRED` (code + ctx {entityType, from, to}); BacklogPage intercepts in updateField onError, mounts ReasonCaptureModal, retries patch with reasonCode/reasonText; advisory audit rows record both.
- **F4** Enforcement tab inline add-row (project + entity + mode); blocking runs checkEnforcementBlockingSafe pre-flight; useAddEnforcementRow. Insert path probed on cyij as admin (rolled back).
- **F5** Schemes tab: create scheme + per-scheme entry editor (published versions only, removable CatalystTags); useCreateScheme/useUpsertSchemeEntry/useDeleteSchemeEntry w/ writeAdminAudit. Write path probed on cyij as admin (rolled back). RLS confirmed: *_write_admin ALL policies on all three tables.
- **F6** editor toolbar any-status transitions: add via target Select → upsertTransition(from null); global-IN chips w/ delete.
- **F7** PublishModal live item counts per removed status (ph_issues count by published display label; custom types resolved via registry; non-ph_issues entities render nothing — zero-assumption).
- **F8** WorkItemTypeIcon resolves custom registry types (display_name/type_key → Studio-chosen canonical icon id, custom name as label) instead of Task fallback; cached 5-min query.
- **Bug swept**: 9× `usePortal usePortal` duplicated prop (earlier scripted-edit artifact) across Studio files.

### Gates
tsc clean · lint:colors:gate 0/0 · audit:ads:gate all ≤ baseline · cre-chokepoint-gate pass.

### Remaining (explicitly deferred, not blocking)
- Prod rollout (user-excluded)
- F4-broad: canonical-label reads + guard evidence tables (new product features)
- F3-planner: MetadataBar/milestone service reason capture (heavier surface; detail views already covered)

## F3 FULL-PARITY SWEEP (2026-07-03, "proceed")

Commits `e4a4953ec` (milestone + task) and `4530ff4d1` (sprint/release confirm modal). All canonical entities now have reason capture; every advisory audit write carries reasonCode/reasonText.

Bugs found + fixed along the way:
- **Milestone preflight ordering**: updateMilestone threw the reason error AFTER the status persisted — the change landed, then claimed it didn't. Preflight moved before write.
- **recordAdvisoryStatusChange dropped reasons**: callers passed reasonCode/reasonText but the runtime never threaded them into writeAdvisoryAudit — audit rows recorded reason-gated transitions with NULL reasons. Fixed at the runtime.
- **Sprint/release completion invisible to engine**: ReleaseConfirmationModal wrote completed/released with no preflight and no advisory row. Now gated + audited.
- **Task advisory had from=null**: useUpdatePlannerTask now resolves current status_id → real from→to evaluation.

Reason-modal wiring per entity (versioning registry updated in code):
story/epic/feature/subtask (detail pill + JiraTable) · defect/incident (detail) · business_request (BacklogPage F3) · product_milestone (MilestonesPage) · task (TasksBoardView card menu + TaskListPageV3 inline; drag-drop useMoveBoardTask still advisory-only — deliberate, drop-revert UX undecided) · sprint/release (confirmation modal, stacked ReasonCaptureModal).

Test: useUpdatePlannerTask.test.ts mock gained chainable select for the preflight fetch; 4/4 pass.

NOTE concurrent session: another window landed reports/testhub commits (…9ea0218c8) in this checkout between my pushes; file sets disjoint, no conflicts. ADS baselines ratcheted DOWN by that session (tokens 27316→25969, typography 1658→1618) — gates still green.

## 4-ITEM CLOSEOUT SEQUENCE (2026-07-03, "finish all in sequence")

Commits: `ef1455850` (drag-drop parity), `021ddc566` (legacy freeze), `d3c2146c0` (guard evidence). No commit for item 4 (investigated, no code change — see below).

1. **Task drag-drop reason capture parity** — `useMoveBoardTask` now preflights via `checkReasonRequired` before writing status_id, throws typed `WF_REASON_REQUIRED`, records advisory audit on success. `persistDrop`'s onError hands off to the existing `onReasonRequired` callback (same one card-menu uses); retry goes through `persistStatusChange` (status-only — position doesn't need to survive a reason-gated transition). Verified live: task's published workflow has 8 reason-gated transitions on staging.

2. **Legacy ph_workflow_* write freeze** — RED FLAG raised and resolved: scope narrowed to `ph_workflow_type_statuses`/`ph_workflow_transitions` only (the rule tables, provably dead for enforcement since all 11 entities have published ph_wf_* versions). `ph_workflow_statuses` (board-column master, live across ~15 read surfaces: dashboards, work-item creation, list views) deliberately NOT frozen — no Studio replacement exists, freezing it would be a real regression. `assertLegacyRulesWritable()` choke point in useTypeWorkflow.ts gates all 7 write mutations with a clear toast pointing to Studio.

3. **Guard evidence sources** — investigated all 12 "missing" guards before wiring any (surveyed ~30 DB tables: tm_plan_approvals, tm_release_signoffs, rh_change_signoffs, deploy_gate/deploy_summaries, transition_approval_configs, unified_attachments, ph_comments, ph_issue_attachments). Wired 3 with REAL, generically-applicable evidence: `brd_attached`/`figma_attached` from `ph_issue_attachments` (2284 live rows, issue_key-scoped, filename/mime/URL heuristics), `comment_required` from `ph_comments` (FK'd to ph_issues.id). Left 9 alone — every other candidate table is scoped to an unrelated domain entity (TestHub test plans/releases, Release Hub changes, CI pipeline runs, an orphaned config table with zero decision rows) and would silently check the wrong thing if reused; registry notes now document why. Verified `brd_attached` is live on published business_request workflow (is_blocking=true) but business_request has no enforcement_config row (defaults advisory) — change only improves audit accuracy today, doesn't newly block anything.

4. **hi_* hierarchy level enforcement** — investigated, found the task premise was stale. `hi_work_items`/`hi_validate_parent_level` trigger: 0 rows, 0 UI consumers, fully dead (the `hi_` RPC name prefix on `hi_upsert_level`/`hi_set_parent_rules` is coincidental — those write to the LIVE `ph_hierarchy_levels`/`ph_hierarchy_parent_rules` P3 registry, a completely different schema). Also discovered a THIRD, unrelated hierarchy system: `/admin/workflows/hierarchy` → WorkHubHierarchyPage → HierarchyMapping.tsx uses its own workhub/admin ConfigKey-flag-driven hierarchy config, separate from Studio's ph_hierarchy_* registry — a pre-existing surface outside this feature's scope, not touched. User decision: leave the dead hi_* schema alone (0 risk to leave, deletion is destructive and out of scope for this pass).

All 4 F-closure items from "what functional elements are pending" are now closed (3 shipped, 1 correctly identified as no-op). Gates green throughout (tsc/color/audit/CRE) on every commit.
