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

**Live DB probe — NOT obtained, documented honestly rather than skipped silently:** attempted a PostgREST probe against staging (`cyijbdeuehohvhnsywig`, anon key from `.env.local`, same approach as VG-001) to compare FK-matched vs JSONB-matched row sets for a known sprint. `ph_issues` returned `content-range: */0` for every anon-key query (`HTTP 200`, empty array) — RLS blocks anonymous reads on `ph_issues` entirely (VG-001's live probes evidently ran under an authenticated session/service context this session did not have). The authenticated Supabase MCP available this session (`mcp__6c122156...`) is scoped only to `catalyst-prod` (`list_projects` returned exactly one project, `lmqwtldpfacrrlvdnmld`) — prod has no `ph_jira_sprints` table at all (D-013) and querying it would prove nothing about this fix, so it was not used. No credentials were requested from the user. **Net: this slice's correctness rests on code-parity with an already-verified reference implementation + clean typecheck/gates, not a fresh live-data probe.** Recommend a live click-through/DOM check once Slice 2 wires a health card into the sprint side panel (there is currently no UI surface to click-test against).
