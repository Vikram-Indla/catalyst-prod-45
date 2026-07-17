# 12 — CAPABILITY MATRIX · CAT-STRATA-IMPL-20260712-001
### Updated session 027, 2026-07-17. **STRATA IS NOT FULLY IMPLEMENTED. 8 / 14 Complete.**

> **The Definition of Full Closure is still NOT met.** It requires *"every user workflow has a reachable UI"* and
> *"the final matrix is 14/14 Complete"*. **Neither holds.** Six capabilities remain: 1 Partial, 1 Backend-only,
> **4 genuinely Not started** (3 · 4 · 5 · 11) plus the reconciliation half of 12.
>
> **⚠️ THIS FILE WAS STALE FOR TWO SESSIONS.** It said **2/14** while commit `f3331ae4a` had already taken caps 6 and 8
> to Complete. Anyone reading it planned against a number that was wrong by two. **If you change a capability's status,
> update this file IN THE SAME COMMIT** — the R3 UI commit did not, and the next session had to re-derive the truth from
> `git log`. The handover banner had the same defect.
>
> **What session 027 did:** wired the R2/R4 UI (caps 7 · 9 · 10 · 12-reversal) + shipped the missing
> `strata_approve_board_pack` backend verb (F-13). **2 → 8 Complete.**
>
> **⚠️ "Backend ✅" in this table was too generous and is now qualified.** Cap 7 was marked backend-complete, but
> `issue_status='approved'` had **no entry verb** — staging had **3 packs, 0 approved**, so Issue was provably
> unreachable *at the DB*, not just missing a screen (F-13). A capability is not backend-complete because its RPCs
> exist; it is backend-complete when its states are **reachable**. The remaining ✅ marks in this table were inherited
> from prior sessions' evidence and **were not re-probed in 027**.
>
> **⚠️ NO SCREENSHOT ACCEPTANCE.** Every UI claim below is proven by DOM assertions + DB probes only. Nothing in this
> session was loaded in a browser. Per CLAUDE.md that is **not** UI/UX acceptance — a screenshot pass is still owed,
> and per the local lesson a TDZ-class error passes every gate and only a live page load catches it.

## Verified baseline (re-probed this sprint, not inherited)
| | |
|---|---|
| Locked snapshots | **byte-identical** `md5 = 128b14afc429bc18ad5dc14563edf3d3` (same as the step-6b baseline) |
| KPI calculations | **18/18 byte-identical**, confidence included |
| Benefit realization | **9/9 byte-identical** |
| Actuals on staging | **18 total · 18 validated · 0 pending** ← corrects the false handover warning |
| Gates | tsc `-p tsconfig.app.json` **0 errors under `src/modules/strata`** · colors 0=0 · audit no category above baseline · CRE pass |
| Suite | **2,442 passed / 6 failed** — the 6 are the known foreign ChatDock. (2 further tests are load-flaky: `AgeingPanel.navigate`, `registry-drift` — both pass in isolation.) |
| Migration ledger | **1:1**, verified |
| PR #349 | **open, unmerged** |

---

## The 14

| # | Capability | Schema | RPC | RLS/role | UI route | Tests | Staging | Commit | **Status** |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Threshold band-editor authoring | `strata_threshold_schemes.bands` (shipped) | `strata_create_threshold_draft_version` ✅ | strategy_office ✅ | **none — band editor never built** | DB probe (A3c) | ✅ | `81bf2a9f6` | **Backend-only** — not attempted in 027 |
| 2 | Scorecard-model draft-create (revision) | envelope existed | `strata_create_model_draft_version` ✅ | strategy_office + SoD ✅ | **`/strata/admin/:section` → "Create new version"** ✅ | 6 UI + DB probe | ✅ | `7ba522678` | **✅ Complete** |
| 3 | Preview-with-data | — | — | — | — | — | — | — | **Not started** |
| 4 | Version diff | — | — | — | — | — | — | — | **Not started** |
| 5 | Score-shift impact preview | — | — | — | — | — | — | — | **Not started** |
| 6 | Data-source register/retire + dependents-impact | `status` CHECK pre-existed | `strata_set_data_source_status` ✅ | strategy_office/data_steward ✅ | **none** | DB probe | ✅ | `48a05afab` | **Backend-only** |
| 7 | Board-pack editorial builder + Issue | `issue_status,version,supersedes_id,issued_by/at,title,sections` ✅ | `issue` · `supersede` · **+ `strata_approve_board_pack` (F-13, 027)** ✅ | SO + SoD; **immutability by trigger** ✅ | **`/strata/…/board-pack` → `PackVersionsSection`** ✅ | 16+ UI + DB probe w/ positive control | ✅ `20260717200000` | `a47385508` + 027 | **✅ Complete** — the arc draft→approved→issued is reachable **only because 027 shipped the missing approve verb**; before it, staging had 3 packs / 0 approved |
| 8 | Run downstream blast-radius | — (derived) | `strata_data_source_blast_radius` ✅ | SECURITY DEFINER ✅ | **none** | DB probe | ✅ | `48a05afab` | **Backend-only** |
| 9 | Quarantine validation tier | states + exception cols + **DB no-self-auth CHECK** ✅ | `strata_resolve_quarantine` ✅ | strategy_office ✅ | **`/strata/…/pipeline` → `QuarantineQueueSection`** ✅ | 19 UI + DB probe | ✅ | `3b71bf404` + 027 | **✅ Complete** — ⚠️ queue is **active-period-only** (inherits the pre-existing `:864` limitation); actuals a run wrote into *other* periods are not resolvable from this view |
| 10 | `strata_reviews` scheduling entity | `strata_reviews` + participants + readiness view ✅ | `strata_schedule_review` · `strata_update_review` ✅ | SO write / approved read ✅ | **`/strata/…/reviews` → `ScheduledReviewsSection`** ✅ | 19 UI | ✅ (2 migrated) | `519e2af63` + 027 | **✅ Complete for scheduling** — ⚠️ **participants, agenda/chair edit, and a review DETAIL route are NOT wired** (`reviewParticipants`/`reviewBySlug` unused). Registry + schedule + attach-snapshot + close only |
| 11 | Mapping-memory write | — | — | — | — | — | — | — | **Not started** |
| 12 | Import 3-way + diff + **24h undo** + run-log ledger | `run_type,reverses_run_id,reversed_by_run_id` ✅ | `strata_reverse_run` + eligibility ✅ | SO/data_steward ✅ | **`/strata/…/pipeline` → `RunReversalSection`** ✅ | UI + DB probe | ✅ | `08d7044dc` + 027 | **PARTIAL — reversal half is now Complete** (eligibility asked before the verb; all blocking reasons named). **3-way match / Matched-New-Conflict-Invalid / both-side diff STILL NOT BUILT** — that half is untouched |
| 13 | M-D4 approved-model editability (governance) | RLS draft-gate + RPC guard ✅ | `strata_set_model_measures` guard ✅ | RLS **and** RPC, both proven | **`/strata/admin/:section` — control hidden + reason shown** ✅ | 4 UI + DB probe w/ positive control | ✅ | `d9cd94a3b` | **✅ Complete** |
| 14 | DEF-010 draft-KPI → objective linking | `lineage_id`, `revision_class` ✅ | resolver excludes drafts ✅ | — | **partial** — materiality UI shipped; **link relaxation not built** | 8 tests | ✅ | `f72faf352` · `51034bc94` | **Partial — not Complete**: calc-side exclusion proven; `strata_link_element_kpi` still refuses non-strategic drafts |

**Complete: 8 · Backend-only: 1 (cap 1) · Partial: 2 (caps 12, 14) · Not started: 3 (caps 3, 4, 5) + cap 11.**
*(Counting note: cap 11 is listed under "Not started" in the rows above; the honest headline is **8 Complete of 14**.)*

### Session 027 delta — what moved and what did NOT
| Moved | 7 · 9 · 10 → Complete · 12 → reversal half Complete. **6 → 8 Complete.** |
|---|---|
| **Did NOT move** | **1** (band editor) · **3 · 4 · 5** (preview / diff / score-shift) · **11** (mapping memory — still no table) · **12** (reconciliation half) · **14** (link relaxation). **Not attempted — not blocked, just not reached.** |
| **Backend added** | `strata_approve_board_pack` (F-13) — the only new DB object; staging-applied + ledger 1:1. |
| **Evidence class** | DOM assertions + DB probes. **No browser, no screenshots.** |

---

## Exactly what remains (per the sprint's "record the exact remaining work")

**UI — the single largest gap. Nothing below has a screen.**
- **Reviews** (cap 10): registry, create/schedule (defaults exist in the RPC), detail, readiness (view exists),
  snapshot/agenda/decisions/actions, close/cancel. Data + RPCs ready; needs a route + page.
- **Board packs** (cap 7): draft-from-snapshot, commentary/ordering edit (`title`/`sections` exist), review/approve,
  Issue, immutable state, supersede, qualification band (`strata_board_pack_qualification` ready).
- **Data sources** (cap 6/8): register/validate/suspend/retire + dependency-impact + blocked-retirement explanation
  (`strata_data_source_blast_radius` returns named blockers + `coverage_note`).
- **Quarantine** (cap 9): queue, failures/evidence (`original_validation_failures`), accept-with-exception, correct,
  reject (`strata_resolve_quarantine` ready).
- **Reversal** (cap 12): action + blocked-reason display (`strata_run_reversal_eligibility` returns **all** reasons).

**Backend not started**
- **Mapping memory (cap 11)** — no table. Needs: source identity, source key, target entity/type, confidence, owner,
  status, effective dates, last-confirmed, version/audit; suggest-not-assume; conflicts require human resolution;
  retired targets not reused; evidence immutable.
- **Reconciliation (cap 12 remainder)** — Matched/New/Conflict/Invalid + both-side diff. `strata_upload_runs` already
  has `row_count_raw/valid/rejected` for the ledger counts.
- **Preview-with-data (3) · Version diff (4) · Score-shift preview (5)** — blueprint §2.3 notes the *inputs* already
  exist (`config_versions`, `config_context` on 7,451 rows, append-only history), so the "old side" needs no build.
- **Threshold band editor (1)** — revision RPC exists; the editor UI does not.
- **DEF-010 link relaxation (14)** — `strata_link_element_kpi` still requires `approved` (strategic drafts already
  pass). Calc-side exclusion is already proven, so this is the link layer only.

## What this sprint did ship (7 commits)
quarantine resolution · 24h reversal + eligibility · (earlier in session: P0-A immutability, A3a/A3b/A3c revisions,
lineage + resolver, E-4 auditability, integrity register + records, calc provenance, snapshot completeness,
materiality, reviews, board packs, data sources, assurance vocabulary, eligible actuals).

**Both live-numbers debts are discharged and neither moved a number** (F-7 `owner_confirmed` counts; E-7 cond.3
`pending` excluded). Both were safe for the same reason — **the states they turn on had zero rows** — and both are
proven to have teeth on constructed cases.
