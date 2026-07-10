# Validation Evidence

## S1 — core schema (20260709130000_idn_core_schema.sql) · staging · 2026-07-09

**Target verification**: Supabase MCP connector scoped to `catalyst-staging` (`cyijbdeuehohvhnsywig`, eu-central-1, ACTIVE_HEALTHY) — prod not visible to token; project ID cross-checked against Vikram's dashboard screenshot. No local link created (shared checkout untouched).

**Apply**: `apply_migration` success. Ledger row aligned to committed file: `version=20260709130000, name=idn_core_schema` (1:1 discipline).

**P0 structural** (raw): `idn_tables=7, idn_policies=21, idn_triggers=4, approval_fn_exists=true`

**Behavioral RLS probes** (JWT-simulated approved users A/B, raw output):
| Probe | Outcome |
|---|---|
| P1 insert + key/slug autogen (user A) | PASS: IDEA-2 / s1-probe-idea |
| P3 cross-user draft edit (user B) | PASS: 0 rows |
| P4 spoofed submitter insert | PASS: blocked (42501) |
| P6a update on converted (locked) idea | PASS: 0 rows |
| P6b comment on locked idea (designed exemption) | PASS: allowed |
| P6c vote on locked idea | PASS: blocked (42501) |
| P8 non-admin delete | PASS: 0 rows |
| P9 audit-log tamper (append-only) | PASS: 0 rows |
| cleanup | done (probe rows removed) |

Notes: key sequence shows IDEA-2 because a first probe transaction rolled back on a temp-table grant (sequences don't roll back — expected, gap-tolerant by design). P2 (parallel-session key race) not executable over a single MCP connection; covered structurally by sequence-based generation + UNIQUE constraint; flagged for the Phase 2 integration test suite.

## S2 — governance schema (20260709150000_idn_governance_schema.sql) · staging · 2026-07-09

**Precondition**: pgvector 0.8.0 already enabled (verified) — HNSW index used.
**Apply**: `apply_migration` success; ledger aligned to `20260709150000` (1:1).

**Probes** (raw output):
| Probe | Outcome |
|---|---|
| G1 single-active-model unique index (2nd approved model) | PASS: blocked (23505) |
| G2 score recompute trigger — value 4×0.6 + effort 2 (lower_better → norm 3)×0.4 | PASS: 3.60 |
| G3 score insert by user without idn role | PASS: blocked (42501) |
| G4 AI suggestion insert by client (service-role-only ledger) | PASS: blocked (42501) |
| G5 embeddings invisible to authenticated clients (RLS, no policies) | PASS: 0 rows |
| G6 conversion insert by non-approver | PASS: blocked (42501) |
| G7 business_requests.source_idea_id column present | PASS |
| cleanup | done |

Notes: G1 first attempt failed on `created_by NOT NULL` (definer context has null auth.uid()) before reaching the unique index — re-run with explicit created_by exercised the intended path. Suggestion-decide policy (status transition + decided_by attribution CHECK) exercised structurally via constraint `idn_suggestion_decision_attributed`; behavioral decide-flow probe lands with the Phase 4 copilot tests.

## S3 — seeds (20260709160000_idn_seeds_phase1.sql) · staging · 2026-07-09

**Pre-apply**: first apply attempt FAILED (`42P01 ph_wf_templates does not exist`) → DRIFT-001 raised; 4 sections amended per Vikram decisions D10–D12 (see 09_DECISIONS.md, session 004). Transactional rollback verified (guard CHECK unchanged, no ledger row) before re-apply.
**Apply**: amended migration `apply_migration` success; ledger aligned to `20260709160000` (1:1, verified: 130000/150000/160000 all present).

**Probes** (raw output, single UNION query):
| Probe | Outcome |
|---|---|
| Scoring models | PASS: default-v1 approved · rice-v1 draft · wsjf-v1 draft |
| Drivers | PASS: default-v1 = value,effort (2) · rice-v1 = reach,impact,confidence,effort_months (4) · wsjf-v1 = user_value,business_value,time_criticality,effort (4) |
| Workflow version | PASS: entity_key ideation, published, v1 |
| Workflow statuses | PASS: 10 — draft,submitted,screening,evaluation,approved,declined,parked,merged,converted,delivered (sort order correct) |
| Workflow transitions | PASS: 12 |
| Transition roles | PASS: 11 rows |
| Transition guards | PASS: 8 rows; types = strategy_link_present, scores_complete, duplicate_review_complete, reason_required |
| Scheme entry | PASS: ideation registered in default scheme |
| Workflow template | PASS: Ideation / work_item_type 'Idea' (D12) |
| admin_nav_modules | PASS: ideation → core/main, sort 8 (D12) |
| admin_role_module_permissions | PASS: 26 rows — full=7, view=19 (D11 exactly) |
| notification_trigger_config | SKIPPED with NOTICE (table absent on staging — D10 waiver; seeds will apply where table exists) |

## S5 — shell + routes (no migration) · localhost:8080 · 2026-07-09 · session 005

**Gates**: `lint:colors:gate` ✅ 0/0 · `audit:ads:gate` ✅ (ratcheted down: tokens 22469→22293, typography 1427→1405) · `npm run build` ✅ exit 0 (twice: post-scaffold, post-nav-gate-fix) · legacy-route grep clean (comments only).

**Flag-ON probes (VITE_ENABLE_IDEATION=true, signed in)**:
| Route/surface | Outcome |
|---|---|
| /ideation (Inbox) | PASS — sidebar + HubPageHeader + ADS EmptyState, CTAs navigate (dark ss_0183geriy, light ss_61807z6zc) |
| /ideation/explore | PASS (ss_2697265jw) |
| /ideation/portfolio | PASS (ss_3218o92kk) |
| /ideation/ideas/:slug | PASS — slug echoed, title derives "Test Slug Probe" (ss_0377wxywc) |
| /ideation/submit | PASS (text probe; first attempt 404'd only because the checkout had been switched to strata-standalone mid-probe — see session 005 incident note) |
| /admin/ideation | PASS — renders inside AdminLayout (ss_1523546qe) |
| HubSwitcher | PASS — Ideation tile + ⌘3 under Discover; tile click navigates to /ideation (ss_5260uaq0q) |
| Console | Clean — no errors post-restore |

**Flag-OFF probes (server without the env var)**:
| Surface | Outcome |
|---|---|
| /ideation | PASS — 404, NO ideation sidebar (leak fixed this session; ss_3601wtyyi) |
| HubSwitcher | PASS — no tile, ⌘ chips skip 3 (ss_4454qq2qc) |
| Home surfaces | PASS — no trace (ss_1770ulmrs) |

**Known env limitation**: vitest cannot start locally (rolldown `styleText` array arg vs Node 20.12) — pre-existing, affects all suites; HubSwitcher suite (updated hrefs + pinned flag mock) runs in CI.

## Phase 2 Slice S1 — Inbox 2-pane triage · localhost:8082 (isolated instance) · 2026-07-10

**Plan Lock**: `03_PLAN_LOCK_PHASE2_S1_INBOX.md`. Scope: real 2-pane triage queue (JiraTable + StatusLozenge, both canonical) reading live `idn_ideas`, replacing the Phase 1 empty-state stub. Design evidence: `features/CAT-IDEATION-DISCOVERY-20260709-001/05_MOBBIN_UX_EVIDENCE.md` §C row 1.

**Data**: `idn_ideas` had 0 rows on staging pre-slice (S3 seed only touched scoring/workflow/notifications/roles). Seeded 6 demo rows directly via Supabase MCP (`execute_sql`, not a migration — content, not schema): IDEA-6..11, spanning submitted(2)/screening(2)/evaluation(2), real `submitter_id` FKs to approved staging profiles. Left in place for later Phase 2 slices (Explore/Portfolio/Detail) to build against.

**Gates**: `npx tsc --noEmit` ✅ 0 errors · `node scripts/no-hardcoded-colors.cjs` ✅ 0 hits on touched files.

**Isolated dev instance**: existing shared dev servers (8080, 8081) belong to other concurrent sessions per CLAUDE.md concurrent-sessions rule — not touched/restarted. Started a throwaway instance (`VITE_ENABLE_IDEATION=true npm run dev -- --port 8082 --strictPort`, killed after screenshotting) rather than editing the tracked `.env.development`.

**Screenshots** (Chrome MCP, signed-in session, user authenticated the tab manually — no credentials entered by the assistant):
| Surface | Outcome |
|---|---|
| /ideation (Inbox), light | PASS — 2-pane: JiraTable queue (Key/Class/Summary/Status) + counts header ("2 Submitted · 2 Screening · 2 Evaluation") + sticky preview pane, real idn_ideas rows (ss_99486r8yt initial, ss_0980zx4lt post column-width fix) |
| Row-click interaction | PASS — clicking IDEA-9 updates the preview pane (title/class/problem-statement/Open-idea button) live (ss_232723g55) |
| /ideation (Inbox), dark | PASS — StatusLozenge + ClassBadge + table chrome all hold contrast via ADS tokens, no new color logic (ss_8857wb15z) |

**Bug found + fixed during this slice**: initial column widths (`flex: true` Summary column has a 640px `FLEX_SUM_FLOOR` in JiraTable) overflowed the 2-pane's `1fr` track, clipping the Status column behind the preview pane (ss_33657c2mw/ss_7185gww35 predecessor — actually first: ss_51519j54y showed the clipped state). Fixed by dropping the `created_at` column and switching Summary to a fixed `width: 42` instead of `flex`, rebalancing Key/Class/Status widths so the table's natural width fits the available track without internal scroll.

**Not yet built this slice** (Phase 2 continues): Detail page (still placeholder), Explore/Portfolio real data, AI Copilot rail tab, vote/importance control, create modal.
