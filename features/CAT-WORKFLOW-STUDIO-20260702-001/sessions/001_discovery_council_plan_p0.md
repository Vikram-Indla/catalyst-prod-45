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
- CLOSE-OUT (main 723bb852d): CatalystTag→SimpleTag when read-only (phantom × killed); guard evidence/advisory + v{n} chips → tags; post-fix probe = 0 tracking all tabs, uppercase = status/state lozenges only (Backlog-identical), rows 38-39px (canon). Green-arrow evidence screenshot in chat. Rescore: H4 3/3, H8 2/3 (sparse tabs by data, not defect), H9 3/3 → 27-28/30 estimate; formal full rescore pending Vikram signoff. CRE chip session ended WITHOUT landing (no getAllowedTypesForModule callers on main) — chip may need restart.
- OLD NEXT-CONVERSATION CONTRACT (mostly done): remaining slices = row-density fine-tune vs 40px canon (D9); Schemes/Statuses/Types void layout (2-col grid, D11); publish/generate modal + editor-panel re-probe; red→green arrow closure evidence per design-critique protocol + full H1-H10 rescore ≥29/30; CRE C2 chokepoint wiring (getAllowedTypesForModule into CreateStoryModal/InlineCreate — pre-existing repo-wide gap, chip spawned). Auditor JS + canon numbers in the plan file. Do NOT touch engine/RPCs. Staging only.
