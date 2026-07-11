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

## Phase 2 Slice S3 — Idea Detail (read + comments) · localhost:8082 (isolated instance) · 2026-07-10

**Plan Lock**: `03_PLAN_LOCK_PHASE2_S3_DETAIL.md`. Scope: real detail page for `/ideation/ideas/:slug` — problem/proposed-value ADF via canonical `DisplayView`, a read-only property rail, and working comments via canonical `ActivityPanel`/`CommentEditor`. Design evidence: `05_MOBBIN_UX_EVIDENCE.md` §C row 4 (Linear issue detail — "Structural 1:1 with C.4"). Deliberately touched none of the files `03_PLAN_LOCK_PHASE2_S2_CREATE.md` (a concurrent, unapproved session) claims, to avoid collision.

**Gates**: `npx tsc --noEmit` ✅ 0 errors · `node scripts/no-hardcoded-colors.cjs` ✅ 0 hits on touched files.

**Screenshots + live write-path proof** (Chrome MCP, signed-in session as Vikram Indla):
| Surface | Outcome |
|---|---|
| `/ideation/ideas/bulk-re-assign-ideas-during-triage`, light | PASS — real title/problem/rail (Stage=Submitted, Class=Problem, Submitter=Jahanara Khan resolved from `profiles`), empty Activity state honest ("No activity yet") (ss_6404nco18) |
| Comment write path | PASS — typed + saved a real comment through the canonical `CommentEditor`; UI updated live via query invalidation, author "Vikram Indla" resolved correctly (ss_6448ljdgk). **Independently verified in the DB**: `SELECT ... FROM idn_comments JOIN idn_ideas` returned the row with matching ADF content, `user_id` = Vikram's profile id, timestamped 2026-07-10 11:29:14 UTC |
| Dark mode | PASS — rail, lozenges, comment thread all hold contrast via ADS tokens (ss_3567vvd06) |

**Not yet built this slice**: AI Copilot rail tab, vote/importance control, evidence panel, scoring display, watchers, linked-BR block, owner/sponsor editing, comment mentions — all explicitly deferred in the Plan Lock's non-scope.

## Phase 2 Slice S2 — Create/Submit Idea form · localhost:8082 (isolated instance, worktree ideation-s2-create) · 2026-07-10

**Plan Lock**: `03_PLAN_LOCK_PHASE2_S2_CREATE.md` (APPROVED — D13/D14/D15 as recommended). First WRITE path over `idn_ideas`: CreateIdeaModal (PortalFix chrome + shared CreateIdeaForm), `?create=idea` deep link on Inbox/Explore/Portfolio, SubmitPage full-page host, "New idea" sidebar nav item.

**Gates**: `npx tsc --noEmit` ✅ 0 errors · `npm run lint:colors:gate` ✅ 0 = baseline 0 · touched files clean in full color scan.

**Isolation**: implemented + validated in git worktree `ideation-s2-create` (branch `worktree-ideation-s2-create`, base origin/main `56d798c2a`) — origin checkout belongs to a parallel session. Dev instance: `VITE_ENABLE_IDEATION=true npm run dev -- --port 8082 --strictPort` from the worktree, killed after evidence; 8080/8081 untouched. Signed-in browser session reused (no credentials handled by the assistant).

**DB probes (staging cyijbdeuehohvhnsywig, Supabase MCP)**:
| Probe | Outcome |
|---|---|
| Baseline pre-test | 6 idn_ideas (2 submitted / 2 screening / 2 evaluation), 0 drafts |
| UI Submit → IDEA-12 | PASS — key+slug trigger-generated (`let-submitters-attach-a-voice-note-to-an-idea`), status `submitted`, class `improvement`, origin_channel `form`, submitter_id set, 1 watcher row (reason `submitter`), audit_actions `[created, status_changed]` — D13 contract exact |
| UI Save draft → IDEA-13 | PASS — status `draft`, audit `[created]` only (no transition row), watcher present |
| Draft exclusion | PASS — Inbox header stayed "3 Submitted" with IDEA-13 existing; draft never rendered in queue |

**Screenshots (Chrome MCP)**:
| Surface | Outcome |
|---|---|
| ?create=idea deep link | PASS — modal opens, `create` param stripped via replace (URL clean) (ss_7095iit58 dark, ss_0160l5hwq light) |
| Inline validation | PASS — empty submit blocks insert; "Give the idea a title" / "Describe the problem or opportunity" / "Pick a class" ErrorMessages (ss_87944wh29) |
| Filled form | PASS — title-first + ADF editor + class select (ss_7251ucsa1, ss_0582ayoe7 open select) |
| Submit → Detail | PASS — spinner (ss_4374w35q0) → navigated to slug URL, IDEA-12 SUBMITTED/IMPROVEMENT rendered (ss_8064fvtmp) |
| Inbox refresh | PASS — IDEA-12 top row, counts "3 Submitted" (ss_1829rt7fp background) |
| Create another (D15) | PASS — modal stays open, form fully reset, inline "IDEA-13 saved as draft" note (ss_5062s38bc) |
| SubmitPage full page | PASS — dark ss_6753gk9zl, light ss_7966icd1r; "New idea" sidebar item active (D14) |

**Recorded deviations (component-tier equivalent, not drift)**: (1) `@atlaskit/toggle` not installed → `@atlaskit/checkbox` "Create another" (Jira-parity); (2) success flag is a platform-wide no-op (suppressed 2026-06-16) → exemplar pattern: call kept + navigation/inline-note as confirmation.

**Demo rows**: IDEA-12 (submitted) + IDEA-13 (draft) left on staging as realistic content for later slices (draft handling, Explore).

**Not built this slice** (non-scope): voice capture, attachments/evidence, AI enrichment (static note only), ContextSwitcher entry, strategy/language pickers.

## Phase 2 Slice S4 — Explore (browse/search/filter + CSV export) · localhost:8082 (isolated instance, worktree ideation-s2-create) · 2026-07-11

**Plan Lock**: `03_PLAN_LOCK_PHASE2_S4_EXPLORE.md` (APPROVED — D16 explicit sign-off: drafts excluded from Explore at the query layer for every user, not just the owner; D17/D18 recommendations followed). Sibling of S1/S2/S3 — files forbidden list respected, zero overlap.

**Gates**: `npx tsc --noEmit` ✅ 0 errors · `npm run lint:colors:gate` ✅ 0 = baseline 0 · `npm run audit:ads:gate` ✅ all categories at/below baseline (tokens dropped 21187→19953 from an unrelated upstream refactor, not ratcheted by this slice — out of scope).

**Fix during build**: initial `ClassBadge` was copied verbatim from InboxPage.tsx (`textTransform: 'uppercase'`), which the audit gate's typography category flagged as a new instance (+1). Removed the uppercase transform in Explore's copy (sentence-case labels, matching the audit's own suggested fix) rather than touching the forbidden `InboxPage.tsx` or suppressing with an escape-hatch comment — a real fix, not noise.

**DB baseline (staging cyijbdeuehohvhnsywig)**: 8 total `idn_ideas` rows — 7 non-draft (IDEA-6/7/12 submitted, IDEA-8/9 screening, IDEA-10/11 evaluation) + IDEA-13 (draft, from the S2 slice).

**Screenshots + interaction proof (Chrome MCP)**:
| Check | Outcome |
|---|---|
| Unfiltered load | PASS — exactly 7 rows rendered, IDEA-13 (draft) absent — **D16 enforced** (ss_5932wy1f4 dark) |
| Search ("duplicate") | PASS — narrows to 1 matching row (IDEA-7) (ss_0876sx1oi) |
| Stage filter (Screening) | PASS — narrows to 2 rows (IDEA-8, IDEA-9) (ss_43719t7s8) |
| Combined Stage+Class (Screening + Improvement) | PASS — 0 rows, "No ideas match" empty state, CSV button correctly disabled, "Clear filters" restores full list (ss_27079xg6s) |
| Row click → Detail | PASS — navigates to `/ideation/ideas/:slug`, IDEA-12 Detail page renders (S3, untouched) (ss_43130uohd) |
| CSV export | PASS — button click fires with zero console errors; only console message is a pre-existing `@atlaskit/select` legacy-context warning shared with every other Select filter in the codebase (AllProjectsToolbar etc.), not introduced by this slice |
| Light mode | PASS — table, lozenges, sentence-case class labels all hold contrast via ADS tokens (ss_78018kafv) |
| Dark mode | PASS — ss_5932wy1f4 |

**Not built this slice** (non-scope, per Plan Lock): Score/Votes/Owner columns, Strategy filter, bulk actions, server-side pagination, saved-filter chips, converted-row `MIM-n` links — all deferred pending unbuilt joins (`idn_votes`, `idn_scoring_*`) or permissions wiring.

## Phase 2 Slice S5 — Portfolio (Value × Effort field chart) · localhost:8082 (isolated instance) · 2026-07-11

**Plan Lock**: `03_PLAN_LOCK_PHASE2_S5_PORTFOLIO.md`. Scope: real scatter over `idn_idea_scores` for the `default-v1` model's value/effort drivers, quadrant labels verbatim from 04 §C.7's mock (Quick Wins/Big Bets/Fill-ins/Money Pit), empty-state coaching text adopted from Mobbin evidence 05 §C row 7 (TheyDo blank-matrix coaching), unscored-ideas tray per 04 §C.7's required state.

**Gates**: `npx tsc --noEmit` ✅ 0 errors · `node scripts/no-hardcoded-colors.cjs` ✅ 0 hits on touched files.

**Data**: `idn_idea_scores` had 0 rows pre-slice. Seeded 10 score rows (value + effort per idea) across 5 of the 8 `idn_ideas` via Supabase MCP `execute_sql` (data, not schema) — spanning all 4 quadrants by design. Verified the `idn_idea_scores_recompute` trigger fired correctly: `SELECT idea_key, score_total FROM idn_ideas` showed real computed totals for the 5 scored ideas and `NULL` for the 3 left deliberately unscored (IDEA-9/12/13).

**Bug found + fixed during this slice**: the initial build colored scatter points via `<Scatter><Cell fill=.../></Scatter>` (the pattern recharts normally supports) — DOM inspection showed 5 `<g class="recharts-scatter-symbol">` groups existed with a valid `fill` and correct `transform` position, but their `<path>` geometry was a degenerate `d="M0,0"` (zero-size, invisible) in this recharts version. Root-caused via `javascript_tool` DOM inspection (`getBBox()` returned `{w:0,h:0}`), not guessed. Found the working precedent (`src/modules/epic-balancing/components/EpicBalancingChart.tsx`) already hit and solved the same issue with a custom `shape` render function instead of `Cell`; applied the same fix here (`PortfolioDot` component rendering an explicit `<circle>`). Re-verified after the fix: 5 visible, correctly positioned, correctly colored points.

**Screenshots + interaction proof** (Chrome MCP, signed-in session):
| Surface | Outcome |
|---|---|
| `/ideation/portfolio`, before fix | FAIL (documented, not shipped) — axes/quadrant labels/unscored tray rendered but 0 visible points despite 5 scored ideas (ss_6976ijwxc) |
| `/ideation/portfolio`, light, after fix | PASS — 5 points visible, cross-checked by hand against seeded value/effort against each point's quadrant position and class color (ss_42065pa9z) |
| Point click → navigate | PASS — clicked the green (Opportunity) point at (4, 4.5) → navigated to `/ideation/ideas/auto-flag-likely-duplicate-ideas-on-submit` (IDEA-7, the exact idea seeded at that position) |
| Dark mode | PASS — axes, gridlines, quadrant labels, and points all hold contrast via ADS tokens (ss_4922r4vi7) |

**Not yet built this slice**: Funnel/board toggle, inline decide actions (Approve/Park/Decline — needs Phase 3 workflow guards), votes-as-bubble-size, model switcher (only one model exists) — all explicitly deferred in the Plan Lock's non-scope.

**Open question flagged, not silently resolved**: the 04 §C.7 ASCII mock's exact left/right quadrant placement is ambiguous against a literal "Effort ▶" reading (see code comment in `PortfolioPage.tsx`) — this build used the industry-standard mapping (Quick Win = high value + low effort) since that's the meaning "Quick Win" carries everywhere else in the design pack; worth a quick confirm with Vikram rather than treated as settled.

## Phase 3 Slice S1 — Workflow guards, real evidence + Decision UI · localhost:8083 (isolated instance) · 2026-07-11

**Plan Lock**: `03_PLAN_LOCK_PHASE3_S1_GUARDS.md`. Closed a real gap: `GUARD_EVIDENCE_REGISTRY` already documented `strategy_link_present`/`scores_complete`/`duplicate_review_complete` as `evidence: 'real'`, but `evaluateGuardsReal`'s switch statement had no case for any of the three — silent fallthrough to `passed: null`. Wired the three real evaluators plus a Decision UI (Approve/Decline/Park) on the Detail page.

**Also fixed in passing**: `contracts.ts`'s `EntityKey`/`GuardType` unions didn't include `'ideation'` or the three ideation-specific guard types — a type-level gap that would have made this uncompilable; additive, no other entity affected.

**Data setup for a real 3-state proof** (Supabase MCP `execute_sql`, data not schema): `idn_idea_scores` already had rows for IDEA-10/IDEA-11 from the Portfolio slice (both 2/2 drivers scored). Linked IDEA-10's `strategy_element_id` to a real `strata_strategy_elements` row ("Accelerate Digital Channels") so it would show **all 3 guards passing**; left IDEA-11 unlinked so it would show the **mixed pass/fail** state — both are real DB states, not staged UI mocks.

**Gates**: `npx tsc --noEmit` ✅ 0 errors · `node scripts/no-hardcoded-colors.cjs` ✅ 0 hits on touched files.

**Isolated dev instance**: `VITE_ENABLE_IDEATION=true npm run dev -- --port 8083 --strictPort`, killed after screenshotting. No shared dev server touched.

**Mid-session correction**: another concurrent session flagged (cross-session message) that `idn_ideas`' SELECT RLS has no draft/ownership clause, so their Explore slice (S4) had been surfacing other users' private drafts org-wide — fixed on their end as D16, landed on `main` as `588e825c7`. Verified the claim independently (re-read the RLS policy text, confirmed no ownership/status clause) before trusting it, confirmed the fix commit didn't touch any file this slice was mid-editing, then fast-forward pulled it into this checkout. No conflict, no data loss.

**Screenshots + interaction proof** (Chrome MCP, signed-in session, user authenticated the tab manually):
| Surface | Outcome |
|---|---|
| IDEA-11 detail, evaluation stage, mixed guard state | PASS — real inline warning SectionMessage: "strategy link present: no strategy element linked" (fail) · "scores complete: 2/2 drivers scored" (pass) · "duplicate review complete: no outstanding duplicate suggestions" (pass) (ss_54403g92r) |
| Approve clicked despite failing guard | PASS — transitioned anyway (advisory, not blocking, as designed): lozenge → APPROVED, rail Decision row shows "approved" (ss_5177lud78). DB verified: `workflow_status_key='approved', decision='approved', decided_by=<real auth uid>, decided_at=<real timestamp>` |
| IDEA-10 detail, all guards passing | PASS — green success SectionMessage, all 3 guards pass with real detail strings (ss_6995802gr) |
| Decline → ReasonCaptureModal → confirm | PASS — canonical `ReasonCaptureModal` opened with the correct generic copy ("Moving ideation IDEA-10 from evaluation to declined requires a reason"), typed reason, confirmed (ss_8442l8uf5) → lozenge → DECLINED, rail Decision row shows "declined — <reason text>" (ss_22995bmpy). DB verified: `workflow_status_key='declined', decision='declined', decision_reason=<exact typed text>, decided_by`/`decided_at` populated |

**Not yet built this slice**: blocking enforcement (no `ph_wf_enforcement_config` row for `ideation` — governance decision, not this slice's), merge flow (`screening → merged`, needs a merge-target picker), role-gating the Approve/Decline/Park buttons by `ph_wf_transition_roles` (pre-existing gap across the whole canonical workflow system — role groups aren't mapped to `product_roles.code` anywhere yet, for any entity). RLS remains the real access-control backstop, same posture as every other advisory guard in the registry.

## Phase 3 Slices S2–S5 + Phase 5 S1 — Votes, Watchers, Admin, Merge, Conversion · 2026-07-11

**Status: committed with SQL-level validation only — NOT yet browser/screenshot-verified.** Every prior slice in this feature was screenshot-gated before commit; this batch breaks that pattern deliberately and the deviation is being logged, not hidden. Reason: the isolated dev instance (`localhost:8084`, `VITE_ENABLE_IDEATION=true`) required a fresh manual sign-in (new port = new origin = no carried-over session, and the assistant will not enter credentials — see the session's standing safety rule). The user was asked to sign in and did not do so across roughly 25+ minutes and 8 separate checks spanning two `/goal`-loop wakeups. Rather than hold this work uncommitted indefinitely or silently lower the bar by claiming screenshots that don't exist, it's committed now with exactly what has actually been verified stated plainly below. **A live screenshot pass is still owed and will happen the moment sign-in unblocks** — this section will be updated in place with real `ss_*` references at that point, not backfilled with invented ones.

**Gates that DID run and pass**: `npx tsc --noEmit` — 0 errors across all 5 slices, checked incrementally after each. `node scripts/no-hardcoded-colors.cjs` — 0 hits on every touched file, checked incrementally.

**What DID get validated — real Postgres, not assumed**:
- **Conversion** (`useIdeationConvert.ts`): the exact 3-statement chain (`business_requests` INSERT → `idn_conversions` INSERT → `idn_ideas` UPDATE) dry-run inside `BEGIN...ROLLBACK` against the live staging schema. Confirmed the `generate_business_request_key()` trigger fires correctly (`MIM-001`), all NOT NULL/CHECK constraints satisfied, rolled back with zero data change.
- **Merge** (`useIdeationMerge.ts`): the status-transition UPDATE dry-run the same way, plus a second UPDATE gated on `idn_idea_is_locked(id) = false` to prove the terminal lock actually excludes the merged row (0 rows matched) — not just documented as locked.
- **Votes/Watchers/Admin**: not dry-run individually (pure SELECT reads + own-row upserts on tables with RLS already validated in the S1 core-schema probes, session 2026-07-09) — lower risk, but genuinely **zero live-app verification** of the rendered UI, the `Popup` interaction, or the `JiraTable` role-matrix rendering.

**What is explicitly NOT verified yet — real gaps, not modesty**:
- No screenshot exists of any of these 5 surfaces rendering in a browser.
- No proof the `VoteControl`/`WatchControl` `Popup` components actually mount/position correctly in the DOM.
- No proof the Admin page's `JiraTable` role-matrix renders the real 26 rows without a runtime error (schema-checked via `tsc`, not run).
- No proof the Convert/Merge buttons' visibility conditions (`workflow_status_key === 'approved'` / `'screening'`) actually gate correctly in the rendered UI (logic-reviewed, not click-tested).
- Dark mode: unverified for all 5 (every ADS token used has been dark-safe in every prior slice, but that's a pattern-consistency argument, not proof for these specific new components).

**Design evidence recap** (full detail in each slice's own Plan Lock — `03_PLAN_LOCK_PHASE3_S2_VOTES.md` through `03_PLAN_LOCK_PHASE3_S5_MERGE.md`, `03_PLAN_LOCK_PHASE5_S1_CONVERSION.md`): VoteControl/WatchControl are D9-approved non-canonical (no canonical vote+importance or watch control exists); Admin is a real read view over already-seeded `idn_scoring_models`/`idn_scoring_drivers`/`admin_role_module_permissions`, no fabricated toggles for config that doesn't exist (AI/Intake/Retention correctly excluded); Merge ships the status-transition half only — real data transfer (votes/evidence/watchers) is RLS-blocked from the client and needs a migration-backed `SECURITY DEFINER` function, flagged in-UI rather than faked; Conversion is a direct single-step BR creation, not the full AI-draft wizard.

**Follow-up required, tracked here so it isn't lost**: live screenshot pass on all 5 surfaces (light + dark), interaction proof (vote cast, watch toggled, merge completed, conversion completed) with DB verification after each — same bar every earlier slice met.
