# CAT-SPRINTS-NATIVE-20260702-002 — Validation Evidence

> Raw output from validation commands, DOM probes, API responses.
> Append — never delete.

---

## Validation entries

## VG-001 — 2026-07-03 — Verification gate on commits 40551d95e / 660d29e5b (Council V2 condition)

Run per Council V2's "resume at verification, not at code" ruling, before any Phase 3 work. Three parallel read-only agents (DB probe, code-diff review, contradicted-claims reconciliation) plus one live DOM probe by the main session.

**DB probe (staging `cyijbdeuehohvhnsywig`, PostgREST, anon key from `.env.local`):**
| Claim | Verdict | Evidence |
|---|---|---|
| S1.4 release link wired | CONFIRMED | 1/29 `ph_jira_sprints` rows has `release_id` populated (sprint `88fc7fa1`) |
| S2.1 DoD has live data | CONFIRMED (thin) | `ph_sprint_dod` has 2 rows, both on sprint `88fc7fa1`, types Backend/Sub-task → Done |
| S2.2b/2.3 approvals fired | CONFIRMED (thin) | `ph_sprint_approvers` has 1 row, `decided_at` populated, status=approved |
| Native sprint reached awaiting_approval/completed via trigger | CONFIRMED w/ caveat | Sprint `88fc7fa1` reached `completed`; `updated_at` (20:46:44.458) trails approver `decided_at` (20:46:43.917) by 0.5s, consistent with the approval trigger firing. The intermediate `awaiting_approval` state is inferred from timing, not directly observed (no sprint currently sits there) |
| D-007 gate-2 (native transitions written) | CONFIRMED | `work_item_transitions` native rows (`jira_changelog_id IS NULL`) grew from 2 (Council V2 checkpoint) to 10 |

All evidence traces to a single sprint (`88fc7fa1`) — proves the mechanism works end-to-end at least once, not that it's broadly exercised.

**Code-diff review (commit `40551d95e` vs its own claims):**
| Claim | Verdict | Note |
|---|---|---|
| S1.4 release link | CONFIRMED | `20260703220000_sprint_release_link.sql:8-9`, one-to-one FK, project-scoped picker in `SprintCreateModal.tsx` |
| S2.1 real per-type DoD | CONFIRMED | `DefinitionOfDoneCard.tsx:48` sources `useWorkflowStatuses(workItemType)`, no hardcoded default |
| S2.2a trigger (all-items gate, never auto-completes) | CONFIRMED | `fn_sprint_check_dod()` (`20260703240000_sprint_dod_evaluation.sql:9-53`) — missing DoD row blocks transition, only writes `awaiting_approval`, never `completed` |
| S2.2b/2.3 first-person approve/reject | **PARTIALLY CONFIRMED — real gap** | Restriction is UI-only (`ReleaseSidePanel.tsx` `canDecide` client check). The actual `ph_sprint_approvers` UPDATE has no `user_id` filter and no restrictive RLS policy — a determined authenticated user could approve/reject on someone else's behalf via a direct client call |
| S2.2c dropdown blocks awaiting_approval/completed | CONFIRMED (UI-level) | Filtered at menu-generation time, not just absent from a list. Same class of gap as above: no DB-level guard against a raw client `.update()` bypass |
| Claim of folding in 2 bugfixes | NOT CONFIRMED as part of this diff | Both fixes (`d5210c42b`, `1858e0aea`) are pre-existing ancestor commits, not new code in `40551d95e` — message is accurate only in that they're already on the branch |
No TODOs, incomplete branches, or silently-swallowed errors found in the new code.

**Contradicted-claims reconciliation:**
1. Release-detail loading fix (`a64130b1b`) — code-review verdict: fix (`:releaseId`→`:releaseSlug` param rename) is structurally correct and still in place on `main`, contradicting the health-engine handover's "did not resolve root cause." **Live DOM probe (this session, Chrome MCP, fresh navigation + hard reload of `/release-hub/releases-management/sprint2-13feb25`) confirms the page loads correctly with no stuck loading state and no console errors.** Verdict: **RESOLVED**, live-confirmed.
2. Health sprint adapter (`CAT-HEALTH-ENGINE-20260702-001`) — verdict: **RESOLVED / unaffected**. The adapter (`src/features/health/adapters/entity.ts:56-111`) reads only `ph_issues` core columns + the JSONB `sprint_release` column, never `ph_jira_sprints` or the FK path the new migrations touch. None of the 4 new sprint migrations touch its dependency surface. The original "unverified post-restart" flag was about live-DOM re-confirmation, not a schema mismatch — no mismatch exists.

**Net verdict:** the shipped work is real and functions end-to-end (not vaporware), on thin (single-sprint) live coverage, with one confirmed regression-fix and one confirmed non-issue. One genuine unresolved gap surfaced: **approval/status-transition mutations are enforced client-side only, not at the DB/RLS layer** — matches the RLS risk A5 already flagged. See `09_DECISIONS.md` D-011–D-014 for the four implicit Plan Lock decisions ratified/flagged as part of this gate.

---

## VG-002 — 2026-07-03 — Phase 3 Slice 1 (health FK fix) implemented

Implemented per `03_PLAN_LOCK.md`'s Phase 3 Slice 1 lock: `src/features/health/adapters/entity.ts`'s `useEntityHealthAdapter` now branches on `config.matchIssueByFk`. Sprint-kind configs (`SPRINT_CONFIG.matchIssueByFk = 'sprint_id'`) query `ph_issues.eq('sprint_id', entityId)` directly; release-kind configs (no `matchIssueByFk`) keep the original JSONB `contains('sprint_release', ...)` + fallback-scan path byte-for-byte.

**Static/code verification:**
| Check | Verdict | Evidence |
|---|---|---|
| Query shape matches the proven reference | CONFIRMED | Identical to `WorkItemsSection.tsx:239-251`'s already-shipped `entityKind === 'sprint'` branch — same table, same column, same `.eq()` filter |
| Release path unaffected | CONFIRMED | Diff shows the JSONB contains/fallback block is unchanged, just moved after the new `if (config.matchIssueByFk)` early-return |
| `entityId` passed for sprint scope is the correct value | CONFIRMED (traced, not re-probed) | `useHealthSignals.ts:74-76` passes `scope.sprintId` for `moduleKey: 'sprint'`; `ReleaseDetailPage.tsx:563` sets `sprintId: release.id` — the sprint's own UUID, which is exactly what `ph_issues.sprint_id` stores per the D-002 FK contract |
| `npx tsc -p tsconfig.app.json --noEmit` | CONFIRMED | 183 errors — matches the `07_HANDOVER.md` baseline exactly, zero new errors, none in `entity.ts` |
| `npm run lint:colors:gate` | CONFIRMED | 0 = baseline 0 |
| `npm run audit:ads:gate` | CONFIRMED | no category above baseline (backend-only change, no styled code touched) |

**Live DB probe — NOT obtained, documented honestly rather than skipped silently:** attempted a PostgREST probe against staging (`cyijbdeuehohvhnsywig`, anon key from `.env.local`, same approach as VG-001) to compare FK-matched vs JSONB-matched row sets for a known sprint. `ph_issues` returned `content-range: */0` for every anon-key query (`HTTP 200`, empty array) — RLS blocks anonymous reads on `ph_issues` entirely (VG-001's live probes evidently ran under an authenticated session/service context this session did not have). The authenticated Supabase MCP available this session (`mcp__6c122156...`) is scoped only to `catalyst-prod` (`list_projects` returned exactly one project, `lmqwtldpfacrrlvdnmld`) — prod has no `ph_jira_sprints` table at all (D-013) and querying it would prove nothing about this fix, so it was not used. No credentials were requested from the user. **Net: this slice's correctness rests on code-parity with an already-verified reference implementation + clean typecheck/gates, not a fresh live-data probe.**

**Superseded by VG-003 below** — a live authenticated-session DOM probe was obtained shortly after, closing the gap this paragraph originally left open.

---

## VG-003 — 2026-07-03 — Live DOM proof of the health FK fix (authenticated session, localhost:8080)

While scoping what was believed to be Phase 3 Slice 2 ("wire a health card into `ReleaseSidePanel.tsx`"), discovered the sprint health UI **already exists and is already live** — see D-019. Used this discovery to also close VG-002's outstanding live-probe gap, via the already-authenticated browser session (Chrome MCP) rather than the anon key.

**Empty sprint** (`/project-hub/BAU/sprints/bau-sprint-71-06-jul-26-2`, 0 work items in the list view): clicked the header "View sprint health" toggle → Health panel showed **0 Analysed**, "Looks healthy" empty state. Correct — this sprint has no linked issues.

**Populated sprint** (`/project-hub/BAU/sprints/sprint28-03-jul-2025`, "Work items 7" in the list view, 7 real `BAU-*` rows visible): clicked the same toggle → Health panel showed **7 Analysed**, matching the visible work-items count exactly, plus a real signal ("Board median last-updated: 2 days ago") and honest data-coverage disclaimers (sprint risk / time-in-status unavailable — zero-assumption, not fabricated).

**Verdict:** CONFIRMED live. The FK-matched query in `useEntityHealthAdapter` returns the correct row count for both an empty and a populated sprint, through the actual mounted UI (not just a code read). Screenshots not saved to the feature folder (ephemeral browser session) but reproducible via the routes above.

## VG-004 — 2026-07-03 — Phase 3 Slice 3 (AI summary + cache): FK fix + cache hit/miss/bust, live-verified on staging

**Migration + edge function deploy:** `20260703280000_sprint_insight_cache.sql` applied to staging (`cyijbdeuehohvhnsywig`) via `supabase db query --linked -f`; ledger auto-recorded (`supabase_migrations.schema_migrations` confirmed to contain version `20260703280000` immediately after, no manual insert needed). `sprint_insight_cache` table confirmed live via `information_schema.columns` (all 6 columns present, correct types). Types regenerated (`supabase gen types typescript --linked`), diffed against the checked-in `src/integrations/supabase/types.ts` (0 removed lines, 222 added — purely the new table's typing, confirmed by grepping the diff for `sprint_insight_cache`), then committed to the file. `summarize-release` edge function redeployed to staging via `supabase functions deploy summarize-release --project-ref cyijbdeuehohvhnsywig` (succeeded).

**Static gates:**
```
npx tsc -p tsconfig.app.json --noEmit → 183 errors (matches baseline exactly, 0 new)
npm run lint:colors:gate → ✅ 0 = baseline 0
npm run audit:ads:gate → ✅ no category above baseline
```

**Live probe (Chrome MCP, authenticated session, `localhost:8080`), sprint `BAU-Sprint 7.1 - 06 Jul 26` (`88fc7fa1-55eb-4a37-8000-29e70b8f3b01`, 2 real work items — BAU-6112 done, BAU-6114 in progress):**

1. **FK-fix correctness:** First "Summarize Sprint" click streamed: *"Sprint BAU-Sprint 7.1, covering July 2nd to July 6th, is currently 50% complete. One item is done, and one is in progress..."* — matches the Work Items panel exactly (1 of 2 done). Confirms `fetchReleaseContext`'s sprint branch now reads the correct `sprint_id`-FK-matched item set (previously would have read via the dead `sprint_release` JSONB match).
2. **Cache write:** `SELECT * FROM sprint_insight_cache` immediately after showed exactly one row (`data_hash = d8a09f4d...`, `summary_text` = the full generated text, byte-for-byte).
3. **Cache hit:** Dismissed the summary card, re-clicked "Summarize Sprint" — full text rendered within ~2s (no visible typewriter/streaming, unlike the ~10s+ of the first generation). DB re-check: still exactly 1 row, same `data_hash`, `updated_at` unchanged (`01:37:31.982`, not bumped) — confirms the store's `complete()` was called directly from the cached read path with zero edge-function invocation, and the cache-write path was correctly skipped (no duplicate/updated row).
4. **Cache bust:** Mutated `ph_issues.assignee_display_name` for `BAU-6114` (`null` → `'QA Probe Tester'`, a field included in the hash per the Plan Lock's HASH INPUTS list) directly via `supabase db query --linked`. Dismissed + re-clicked "Summarize Sprint" — screenshot taken ~1s after click showed mid-stream partial text ("Sprint BAU" + blinking cursor), confirming a fresh edge-function call (cache miss, correctly busted by the field change). DB re-check after completion: a **second** row appeared (`data_hash = 695aba94...`, different from the first), original row untouched (`updated_at` still `01:37:31.982`). Reverted `assignee_display_name` back to `null` immediately after to leave staging data clean — no lasting side effect.
5. **Release-path regression check:** On release `Refactor-Senaei 4.2 -10 July 26` (`b382f76b-0629-4dd1-896d-0372a78b2031`), clicked "Summarize Release" twice (dismiss between clicks) — **both times** showed the "Generating summary" fetching state (bouncing dots), never an instant/cached render. `SELECT count(*) FROM sprint_insight_cache` before and after: unchanged at 2 rows (both from the sprint tests above) — confirms zero leakage into the cache table from the release path, matching the code's `payload.entityKind === 'sprint'` gate.

**Verdict:** CONFIRMED live, all four Plan Lock proof points (FK correctness, cache hit, cache bust, release-path non-regression) hold under real staging data through the actual mounted UI.

## VG-005 — 2026-07-03 — Phase 3 Slice 4a (sprint-status transition trigger), live-verified including the DoD-cascade edge case

**Migration:** `20260703320000_sprint_status_transition_trigger.sql` applied to staging (`cyijbdeuehohvhnsywig`) via `supabase db query --linked -f`; ledger row inserted manually (confirmed `db query -f` does not auto-record the ledger — same lesson as DRIFT-004). `ph_sprint_status_transitions` table + `trg_record_sprint_status_transition` confirmed live via `information_schema`/`pg_trigger`. Types regenerated, diffed (0 removed / 183 added, purely the new table), overwritten.

**Static gates:**
```
npx tsc -p tsconfig.app.json --noEmit → 183 errors (baseline match, 0 new)
npm run lint:colors:gate → ✅ 0 = baseline 0
npm run audit:ads:gate → ✅ no category above baseline
```

**Live probe (Chrome MCP, authenticated session, `localhost:8080`):** Created a fresh test sprint via the real create-sprint flow (`BAU-Sprint 7.1 - 07 Jul 26`, `705a5197-5042-4e63-ad9e-89cd728be4fa`) to avoid disturbing prior sessions' test data.

1. **Manual transition** — clicked the status dropdown, "Start sprint" (`planning → active`). DB check: row appeared immediately, `from_status: planning`, `to_status: active`, `transitioned_by: Vikram Indla`, correct timestamp.
2. **DoD-cascade transition (the case flagged as uncertain in the Plan Lock's stop conditions)** — added a real work item (`BAU-6118`), set its Definition of Done ("Sub-task" → "Done"), then drove the item through its real workflow (To Do → Assigned → In Progress → Code Review → Done) via the actual item detail panel. This satisfied the sprint's DoD, and `fn_sprint_check_dod` auto-transitioned the sprint `active → awaiting_approval` (confirmed via DB: `ph_jira_sprints.status = 'awaiting_approval'`, UI hadn't refreshed but DB was already correct). Checked `ph_sprint_status_transitions`: **the row was captured**, `from_status: active`, `to_status: awaiting_approval`, `transitioned_by: Vikram Indla` (a real actor, not skipped) — confirming `auth.uid()` persists through the full trigger cascade within one authenticated request, so the common real-world DoD-completion path populates this table, not just manual dropdown overrides.

**Verdict:** CONFIRMED live. Both the manual and DoD-cascade transition paths are captured correctly with real actors and timestamps. This resolves Slice 4a's flagged uncertainty in favor of the better outcome — approval-timeliness (Slice 4b) will have real start-timestamps for sprints going through their natural DoD-driven lifecycle, not only ones manually overridden via the dropdown. Test sprint left in place (not deleted) — it's clean, real data (an `awaiting_approval` sprint with no approver yet), useful as a live fixture for Slice 4b's own testing.

## VG-006 — 2026-07-03 — Phase 3 Slice 4b (efficiency formula + card), both zero-assumption states verified live

**Migration:** `20260703400000_sprint_efficiency_rpc.sql` (`compute_sprint_efficiency` RPC). Collided on first attempt at `20260703330000` with the concurrent session's already-applied `senaei_bau_dedup_and_signoff_seed` (same class as DRIFT-004) — renamed to `20260703400000`, ledger corrected. Types regenerated (0 removed / 4 added — the RPC signature only), overwritten.

**Static gates:**
```
npx tsc -p tsconfig.app.json --noEmit → 183 errors (baseline match, 0 new; grepped log for SprintEfficiencyCard/useSprintEfficiency/ReleaseSidePanel — 0 hits)
npm run lint:colors:gate → ✅ 0 = baseline 0
npm run audit:ads:gate → ✅ no category above baseline (tokens/typography actually dropped — unrelated concurrent-session activity, not ratcheted down)
```

**RPC correctness (direct SQL call before any UI involvement):** against the Slice 4a test sprint (`705a5197-...`, 1 real item, no approver yet) — `{completion: 100, flow_efficiency: 64.65, scope_stability: 100, approval_timeliness: null, missing: ["approval_timeliness"], overall: null}`. Confirms zero-assumption: three real components computed correctly, the fourth genuinely absent, and `overall` correctly withheld rather than partially averaged.

**Live UI — insufficient-data state:** Sprint detail page rendered the new "Sprint Efficiency" card showing *"Not enough data yet — missing Approval timeliness."* — exact match to the RPC's `missing` array, human-labeled.

**Live UI — full-data state:** Added a real approver (Vikram Indla) via the actual Approvers UI, clicked approve (sprint auto-transitioned `awaiting_approval → completed`). Re-queried the RPC directly: `{completion: 100, flow_efficiency: 64.65, scope_stability: 100, approval_timeliness: 100, missing: [], overall: 91.16}`. Reloaded the page (waited for the round-trip this time, after an initial premature screenshot showed stale cached data) — card rendered a real `ProgressBar` at 91%, with all four component percentages listed (Completion 100%, Flow efficiency 65%, Scope stability 100%, Approval timeliness 100%), byte-consistent with the RPC's own numbers.

**Verdict:** CONFIRMED live. Both zero-assumption states (insufficient-data and full-data) render correctly and match the RPC's output exactly, through the real mounted UI. D-008's formula is live for the first time on this feature.
