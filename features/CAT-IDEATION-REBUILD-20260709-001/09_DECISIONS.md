# Decisions Register

| # | Date | Decision | Decided by | Status |
|---|---|---|---|---|
| D0a | 2026-07-09 | Wipe legacy Ideation entirely; greenfield rebuild, zero carryover | Vikram (directive) | ✅ Decided |
| D0b | 2026-07-09 | Design of record = 03_GREENFIELD_REBUILD_BLUEPRINT + 04_ELITE_DESIGN_BLUEPRINT + 05_MOBBIN_UX_EVIDENCE v2.1 — RATIFIED | Vikram | ✅ Decided |
| D1 | 2026-07-09 | Dark-launch = routes-only early decommission: Phase 1 removes legacy `/ideation/*` + `/product/ideas/*` mounts; new module claims `/ideation` behind `VITE_ENABLE_IDEATION`; DB/component decommission stays Phase 8 | Vikram | ✅ Decided |
| D2 | 2026-07-09 | Legacy data disposition = **archive then drop** (CSV/parquet snapshot of ph_ideas + satellites before Phase 8 drop). Drop itself still gated by Phase 8 RED-FLAG review | Vikram | ✅ Decided |
| D3 | 2026-07-09 | Vote + 4-level importance (critical/important/nice/none) | Vikram | ✅ Decided |
| D4 | 2026-07-09 | Default portfolio axes = Value (y) × Effort (x) from scoring model v1; admin re-mappable | Vikram | ✅ Decided |
| D5 | 2026-07-09 | Campaigns out of V1 (P2 backlog) | Vikram | ✅ Decided |
| D6 | 2026-07-09 | Create entry: sidebar button + `?create=idea` in V1; shell-wide ContextSwitcher entry = P1 after shell-owner alignment | Vikram | ✅ Decided |
| D7 | 2026-07-09 | AR translation: string catalog required; owner TBD by Vikram before Phase 7 Plan Lock (does not block Phases 1–6) | Vikram | ✅ Decided (owner naming deferred) |
| D8 | 2026-07-09 | Scoring-model publish: Ideation Admin publishes, SuperAdmin approves (GovernedEnvelope) | Vikram | ✅ Decided |
| D9 | 2026-07-09 | 5 non-canonical components approved: vote-with-importance control, AI suggestion card, portfolio field chart (recharts), guard checklist, phone card-list — Atlaskit primitives + ADS tokens only | Vikram | ✅ Decided |

| D10 | 2026-07-09 | DRIFT-001 fix (a): notification_trigger_config seeds wrapped in conditional DO block — skip with NOTICE where table absent (staging); applies where it exists (prod). Staging exit-criterion "notification triggers present" waived, documented | Vikram | ✅ Decided |
| D11 | 2026-07-09 | DRIFT-001 fix (b): admin_role_module_permissions for 'ideation' uses real product_roles codes — full: super_admin, product_owner, technical_po, pmo, delivery_manager, project_manager, business_analyst; view: all other roles (INSERT…SELECT from product_roles) | Vikram | ✅ Decided |
| D12 | 2026-07-09 | DRIFT-001 fix (c): admin_nav_modules row = group 'core', nav_type 'main', sort_order 8 (mirrors workhub); ph_workflow_templates.work_item_type = 'Idea' | Vikram | ✅ Decided |

Documented design departures (from Mobbin evidence, 05 K-delta): 2-pane Inbox (not Intercom 4-pane); suggestion-ledger-first Copilot (not chat-first); labeled quadrants (not free field); one-modal merge (not Salesforce 2-step); winner-takes merge V1 (per-field = P2).

**Phase 0 status: ✅ EXITED 2026-07-09.** Next gate: Phase 1 Plan Lock approval (03_PLAN_LOCK_PHASE1.md).
