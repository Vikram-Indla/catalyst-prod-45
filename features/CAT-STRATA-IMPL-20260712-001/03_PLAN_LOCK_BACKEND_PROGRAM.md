# 03 — PLAN LOCK · STRATA remaining-backend PROGRAM
### Policy-ruled 2026-07-16 (Vikram: D-1 … D-8 CONFIRMED) · **BLUEPRINT — NOT APPROVED · NO CODE, NO MIGRATIONS**

> Each capability still needs its own per-slice Plan Lock before code. Target: `catalyst-staging`
> (`cyijbdeuehohvhnsywig`) — the live target; `catalyst-prod` is a paused SCOPE, not production.
> **Every "exists" claim was PROBED on staging or cited to file:line. None is inherited from the handover.**
> Companion evidence: `sessions/025_measures-builder-part2b.md`. Supersedes nothing — this is the program's first
> consolidated blueprint.

---

## 1. CONFIRMED DECISIONS (Vikram, 2026-07-16)

| ID | Ruling |
|---|---|
| **D-1** | **CONFIRMED — approved-model aggregate immutability is P0**, ahead of the remaining programme. Protect the COMPLETE approved aggregate: perspectives, weights, measures, aggregation settings, target policies, threshold association. Enforce in RPCs **and** at DB/RLS. **The UI is not a security boundary.** Produce a read-only integrity report first (§3). **Do not silently rewrite historical records.** |
| **D-2** | **Dedicated revision RPCs** — `strata_create_model_draft_version`, `strata_create_kpi_draft_version`, `strata_create_threshold_draft_version`. NOT one generic polymorphic RPC; NOT a mandatory change-request workflow. Each clones the complete governed aggregate, increments `version`, sets `supersedes_id`, resets approval fields, copies children, records actor/reason, and **leaves the predecessor unchanged**. Reuse `strata_approve_record`'s approval + supersession boundary. `strata_config_change_requests` MAY be an optional request/audit envelope; **do not create a second mandatory approval lifecycle without evidence**. |
| **D-3** | **CONFIRMED — approved-KPI "retire and recreate" is replaced by governed revision.** Retirement remains for genuine discontinuation. Preserve logical KPI lineage + historical resolution for actuals, objectives, Key Results, scorecards, snapshots, board packs. |
| **D-4** | **Replace misleading Finance terminology.** Neutral assurance states: **Reported · Owner confirmed · Independently validated · Rejected.** Stop writing `finance_validated`; migrate the vocabulary to `independently_validated`, preserving original actors + audit events. **Do not claim historical Finance assurance.** |
| **D-5** | **Accepted-with-exception MAY count after Strategy Office authorization.** Quarantined stays excluded. Submitter cannot authorize their own exception. Preserve exception reason, original validation failures, authorizer, timestamp, evidence, source run. Scorecards/snapshots/board packs must **retain and visibly expose** the exception flag. **Never silently convert exception-authorized data into ordinary Validated data.** |
| **D-6** | **Persisted reviews coexist with the derived model during transition.** `strata_reviews` is authoritative going forward. Backfill ONE Closed historical review per existing locked snapshot where possible, marked migrated/historical. **Do not invent chair, participants, agenda or meeting details that were never recorded.** Derived logic is retained temporarily as compatibility/verification support, not as the system of record. |
| **D-7** | **Undo = immutable supersession + reversal ledger.** NOT negative/offsetting measurements. Preserve the original run and actuals; create a compensating reversal run referencing the original; mark affected actuals reversed/superseded; restore the prior effective state where one existed. Allowed only: within 24h · before a locked snapshot · before dependent board-pack issuance · before a later run makes reversal unsafe. **Prefer atomic reversal; never silently leave a partially reversed run.** |
| **D-8** | **The count is 14** — 13 previously listed backend capabilities **+ DEF-010**. Measure-level scorecard authoring **has shipped and must not be counted**. |

**DEF-010 ruling.** Draft KPIs may link to strategic objectives during authoring · draft links are visibly marked ·
draft KPIs are excluded from official calculations, health, roll-ups, snapshots, board packs and executive reporting ·
eligible links become effective when the KPI is approved · **do not auto-approve** · preserve historical links through
retirement and supersession.

---

## 2. REUSE-VERSUS-BUILD MATRIX (evidence-backed)

### 2.1 REUSE — verified present. Do NOT rebuild.
| Requirement | What exists | Evidence |
|---|---|---|
| Strategy Office = final authority | `strata_approve_record` / `strata_lock_snapshot` require `strategy_office` | RPC bodies (probed) |
| **No CXO escalation** | None exists anywhere | full RPC list (probed) — nothing to remove; **do not add** |
| Approver · time · version · note | `GovernedEnvelope` = `version, status, effective_from, effective_to, approved_by, approved_at, change_reason, supersedes_id, created_by, created_at, updated_at` on 9+ tables; note → `strata_audit_events.note` | `types.ts:14-26`; `strata_approve_record` body |
| Approver ≠ author | `strata_approve_record`: "the creator cannot approve their own record" | `foundation_config_engine.sql:372-444` |
| **Supersession boundary** | `strata_approve_record` **already** sets predecessor `status='superseded'` + `effective_to=now()` when `supersedes_id` is set | `foundation_config_engine.sql:413-418` — the ONLY reader of `supersedes_id` |
| **Mid-period prospective adoption** | `effective_from = COALESCE(effective_from, now())` ⇒ a **pre-set effective date is already honoured** | `strata_approve_record` body |
| Recalculation engine | `strata_calc_scorecard_instance` · `strata_calc_period` · `strata_calc_kpi_achievement` | RPC list |
| **Prior calculated result preserved** | `strata_calculated_values` is **append-only** (`calculated_at`; lock takes `max(calculated_at)`) — **7,457 rows** | probe; `strata_lock_snapshot` body |
| Performance vs methodology attribution | `calculated_values.config_context` populated **7,451/7,457**, + `formula_version`, `source_run_ids` | probe |
| Unlocked-period test | `strata_periods.close_status ∈ open/pending_close/closed`; `strata_close_period` | probe |
| Locked snapshot immutability | RLS `status <> 'locked'`; "locking is RPC-only"; `calcResult` reads frozen `snapshot_items` | `strata_strategy_scorecard.sql:296-309`; `domain/index.ts:313-360` |
| Config versions at lock | `strata_snapshots.config_versions` **populated 2/2** | probe; see §4 for what it MISSES |
| Superseding snapshot | `strata_supersede_snapshot(p_old,p_new,p_reason)` + `superseded_by_id` | RPC list |
| Exact locked snapshot per pack | `strata_board_packs.snapshot_id` | probe |
| **Quarantine exclusion from official calcs** | `strata_calc_kpi_achievement` / `strata_calc_benefit_realization` filter **`validation_status='validated'`** — a WHITELIST, so quarantined is excluded **by construction**; `strata_lock_snapshot` filters identically | probe |
| Quarantine states | `'quarantined'` already in CHECK on `strata_kpi_actuals.validation_status`, `strata_upload_runs.status`, `strata_staging_rows.validation_status`; settable by `strata_attest_actual` with SoD | probe; `types.ts:12,710,722` |
| No-self-authorization precedent | `strata_benefit_value_sod` (`validated_by <> submitted_by`); `strata_ccr_no_self_approval` (`decided_by <> requested_by`) | probe |
| Benefit provenance | `submitted_by, submitted_at, upload_run_id, value, value_kind, validated_by, validated_at, validation_note` | probe |
| Import dry-run/apply; idempotent promote | `strata_import_execution_batch(p_dry_run)`; `strata_validate_run`; `strata_promote_run` | `domain/index.ts:1041-1054`; `upload_validation_promote.sql:218-311` |
| Configurable cadence store | `strata_workflow_configs` (governed) | table list |

### 2.2 BUILD — verified absent (NOT FOUND)
| Gap | Evidence of absence |
|---|---|
| **Any writer of `supersedes_id`** | Column on 9+ tables; **never written** — no INSERT, no RPC param, no client call |
| Draft-from-approved RPCs (D-2) | No `revision`/`newVersion`/`draftFrom`/`clone*` function anywhere |
| Child-aggregate status gating (D-1) | `strata_scorecard_model_perspectives` RLS is role-only; `strata_set_model_measures` never reads model status |
| Date-aware model resolution | No calc resolves a model by `effective_from ≤ period` |
| Score-shift preview RPC | Absent (old side already stored) |
| Run reversal / undo | No RPC or client path reverses a promoted run |
| Board-pack version/issue/supersede | `strata_board_packs` has only `format,status,storage_path,generated_by/at` |
| `strata_reviews` | Absent from every migration + `src/` |
| Quarantine accept/correct/reject + exception label | No transitions, no authorizer, no exception fields |
| Draft-KPI linking (DEF-010) | `strata_link_element_kpi` gated on `approved`; `strata_kpis.status` defaults `draft` |

### 2.3 Reuse decisions that REDUCE scope
- **Model draft-create** is one cloning RPC, not a subsystem — the supersession half already works.
- **Quarantine exclusion** is free — the `='validated'` whitelist already excludes it.
- **Version diff / score-shift "old" side** are reads over data already stored at scale.
- **`strata_config_change_requests`** exists (`change_type ∈ create/update/retire/supersede`, self-approval CHECK) but
  is **READ and never written**. Per D-2 it is an OPTIONAL envelope only — **not** a mandatory lifecycle.

---

## 3. P0 INTEGRITY AUDIT (D-1) — **SCOPE + RESULTS (executed read-only, 2026-07-16)**

### 3.1 Scope
Identify (a) every approved model whose child aggregate changed without a `version` increment, and (b) every snapshot
potentially affected. Read-only. **No remediation, no rewrite.**

### 3.2 Detection method + its limits (state honestly)
`strata_scorecard_model_perspectives` and `strata_scorecard_model_measures` have **`created_at` only — no
`updated_at`**, and `setModelPerspectiveWeights` does a raw `.update()` that writes **no audit event**. Therefore:
- **In-place weight UPDATEs are UNDETECTABLE** by timestamp. Only INSERTs (and replace-set deletes+reinserts, which
  reset `created_at`) are visible. **This audit is a LOWER BOUND, not a complete census.**
- A first pass keyed on `approved_at` silently dropped models where `approved_at IS NULL`; corrected to
  `COALESCE(approved_at, effective_from)`.

### 3.3 Findings — **BOTH approved models and BOTH locked snapshots are affected**
| Model | v | Governed since | Child rows written after | Last write |
|---|---|---|---|---|
| CEO Enterprise Scorecard | 1 | approved_at `2026-07-04 22:56` | 1 perspective_weight | `2026-07-12 07:02:46` |
| B2B Sector Scorecard | 1 | **approved_at NULL** → effective_from `2026-07-09 10:48` | 3 perspective_weight · **2 measures** | `2026-07-16 18:20:39` |

| Snapshot | Status | Locked at | Stamps | Child rows written AFTER lock |
|---|---|---|---|---|
| SNAP-1 · Q1 FY2027 Review (proof) | locked | `2026-07-05 22:18` | CEO model **v1** | **1** |
| SNAP-1001 · Q1 FY2026 Executive Review | locked | `2026-04-08 06:00` | CEO model **v1** | **5** |

### 3.4 Second defect found by the audit
**`B2B Sector Scorecard` has `status='approved'` but `approved_at IS NULL`** — it was never approved through
`strata_approve_record` (seeded directly). Any control keyed on `approved_at` will silently skip it. Treat
"approved with no approver/timestamp" as its own integrity class.

### 3.5 Full disclosure — this session contributed 2 of the affected rows
The **2 measure rows on B2B Sector Scorecard (`2026-07-16 18:20:39`) were written by part 2b's live verification**
(PR #349), onto an **approved** model, because no status gate exists. That is the defect demonstrating itself. They
are coherent test data (Financial: 60 + 40 = 100) and are listed for removal/retention under Decision E-3.

### 3.6 Precise blast radius — provenance, NOT values
**The reported numbers are safe.** `strata_lock_snapshot` freezes `strata_snapshot_items.payload` from
`calculated_values`, and `calcResult` reads those frozen payloads for locked instances — so **no board-pack or
snapshot number silently changed**.
**What is broken is RESOLUTION.** `config_versions` stamps only `{id, version}`; because weights changed without a
version increment, **re-resolving "CEO model v1" today yields different weights than produced the frozen numbers**.
The policy "historical scorecards must continue to resolve against the … model versions used at calculation time" is
therefore **not satisfied for either locked snapshot**. The numbers can be shown; the configuration that produced
them can no longer be proven. **No remediation is proposed here (D-1: do not silently rewrite history)** — see E-1.

---

## 4. COMPLETE CONFIGURATION-VERSION CONTEXT required for historical resolution

`strata_lock_snapshot` records today:
```
{ perspectives[{id,version}], threshold_schemes[{id,version}], scorecard_models[{id,version}] }
```
**Insufficient.** Required for full resolution:

| Element | Today | Required | Why |
|---|---|---|---|
| Perspectives | ✅ id+version | keep | — |
| Threshold schemes | ✅ id+version | keep | bands decide every rating |
| Scorecard models | ⚠️ id+version | **+ the resolved child aggregate** (weights, measures, aggregation, target policy, threshold association) | version alone is unreliable — §3 proves children move under a static version |
| **KPIs** | ❌ **absent** | **id+version** | policy names KPI versions explicitly |
| **KPI formula versions** | ❌ absent | id+version | `strata_kpi_formula_versions` exists (read-only today); formula decides the number |
| **Model measures** | ❌ absent | id+version/hash | new in 2a/2b — never captured |
| Selection semantics | ⚠️ stamps **all approved** configs | stamp **the configs USED** | today's blob over-claims |
| Draft-KPI exclusion (DEF-010) | n/a | record the exclusion applied | prove drafts did not count |
| Exception-authorized data (D-5) | n/a | record exception flags in-scope | packs must expose the flag |

**Change is forward-only.** Existing locked snapshots are **never rewritten** (D-1 + §9 historical protection);
they are annotated as pre-completeness in the integrity register.

---

## 5. DEPENDENCY-ORDERED RELEASES

```
R0  P0 INTEGRITY          A1 audit register (read-only)  →  A2 RLS+RPC aggregate lock  →  A3 revision RPCs (D-2)
                                                   │
R1  HISTORICAL TRUTH      B1 config_versions completeness (needs real versions from A3)
                                                   │
R2  ADOPTION & PREVIEW    C1 date-aware resolution → C2 adoption modes → C3 score-shift preview → C4 version diff
                                                   │
R3  GOVERNANCE ENTITIES   E1 strata_reviews (+backfill) → F1 board-pack issue/supersede
                                                   │
R4  DATA INTEGRITY        G1 quarantine workflow + exception (D-5) → H1 import undo (D-7; needs F1 + G1)
R5  INDEPENDENT           J DEF-010 · K data-source register/retire · L preview-with-data · M blast-radius
                          N mapping-memory · O import 3-way/diff/ledger
```
**Critical path: A1 → A2 → A3 → B1 → C1.** F1 needs E1. H1 needs F1 + G1. R5 may run in parallel throughout.

---

## 6. PER-CAPABILITY CHANGES (schema · RPC · RLS · UI · test)

| Cap | Schema | RPC | RLS | UI | Test |
|---|---|---|---|---|---|
| **A2 aggregate lock (P0)** | none | `strata_set_model_measures` + status guard | `model_perspectives` write policy joins parent `status='draft'`; same for measures | Edit disabled on approved + "Create new version" CTA | approved model REJECTS weight+measure write at RPC **and** direct table write |
| **A3 revision (D-2)** | none (envelope exists) | `strata_create_model_draft_version` · `..._kpi_...` · `..._threshold_...` | `strategy_office` | "Create new version" → draft; predecessor untouched | clone sets `version+1` + `supersedes_id`; children copied; predecessor byte-identical; approve auto-supersedes |
| **B1 config completeness** | none (jsonb) | extend `strata_lock_snapshot` | — | provenance panel | new snapshot contains kpi+formula+measure versions + used-only selection; **old snapshots unchanged** |
| **C1/C2 adoption** | none (`effective_from` exists) | `strata_recalc_period(p_period,p_reason,p_dry_run)`; date-aware resolution | `strategy_office` | adoption-mode chooser at approval | pre-boundary results byte-identical; recalc refuses closed period + locked snapshot; prior rows retained |
| **C3 score-shift** | none | `strata_preview_score_shift(p_model_draft,p_period)` read-only | `strategy_office` | informational panel; **never blocks**; old·simulated·Δ·departments·perspectives·causes; perf vs methodology split | writes NOTHING (row counts identical); proceeds at any Δ; no escalation control exists |
| **E1 reviews (D-6)** | **NEW** `strata_reviews` (+participants); FKs to cycle/period/snapshot/board_pack | `strata_schedule_review` · `strata_update_review` | `strategy_office` write; approved read | registry reads the entity; derived kept as compatibility | backfill = 1 Closed review per locked snapshot; **chair/agenda/participants NULL, not invented**; marked historical |
| **F1 board packs** | `+version, supersedes_id, issued_by, issued_at`; status `+issued,superseded` | `strata_issue_board_pack` · `strata_supersede_board_pack` | issued rows immutable | issue/supersede actions; version chain | issued pack immutable; correction supersedes; `snapshot_id` unchanged |
| **G1 quarantine (D-5)** | `strata_kpi_actuals +exception_reason, exception_authorized_by, exception_authorized_at`; status `+accepted_with_exception`; CHECK authorizer≠submitter | `strata_resolve_quarantine(p_actual,p_verdict,p_reason)` | `strategy_office` | exception label + reason + authorizer on scorecard/snapshot/pack | quarantined excluded; exception-authorized **counts**; flag survives into snapshot + pack; never silently becomes Validated |
| **H1 undo (D-7)** | `strata_upload_runs +run_type, reverses_run_id`; actuals `+reversed_by_run_id/superseded` | `strata_reverse_run(p_run,p_reason)` atomic | `strategy_office` | undo affordance + honest blocked-reason | original run+actuals byte-identical; blocked at 24h+1m / snapshot-locked / pack-issued / unsafe-later-run; **atomic — no partial reversal** |
| **J DEF-010** | link table `+status/effective_from` or equivalent | relax `strata_link_element_kpi`; activate-on-approve | — | Draft lozenge on link | draft link created; **excluded from calc/health/rollup/snapshot/pack**; activates on approve; **no auto-approve**; links survive retire/supersede |
| **D-4 assurance** | `benefit_values.validation_status +owner_confirmed`; lifecycle `finance_validated → independently_validated` | rework `strata_validate_benefit_value` (stop writing `finance_validated`) | — | 4-state lozenge | no code path writes `finance_validated`; original actors + audit preserved; **no historical Finance claim** |

---

## 7. BACKFILL & ROLLBACK

**Backfill (only two, both conservative).**
- **E1 reviews:** one `Closed`, `origin='migrated'` review per existing locked snapshot (2 rows today). Chair,
  participants, agenda, meeting details = **NULL** — never invented (D-6).
- **D-4 vocabulary:** map `finance_validated → independently_validated` **preserving `validated_by`/`validated_at`
  and all audit events**. This is a **rename of the label, not a re-assertion of assurance** — no row gains or loses
  assurance, and no historical Finance claim is made (D-4).

**Explicitly NOT backfilled:** locked snapshots' `config_versions` (D-1: never silently rewrite history) · model
versions on §3's affected models · the affected snapshots. All are **recorded in the integrity register** instead.

**Rollback.** Every migration additive → rollback = drop the added column/policy/RPC; no data loss. Two exceptions
needing explicit down-scripts: **D-4** (retain a reverse map) and **A2** (reverting re-opens the P0 hole — rollback
only with a ruling). New tables (`strata_reviews`) drop cleanly. **No migration rewrites history**, so no rollback
can corrupt it.

---

## 8. ACCEPTANCE CRITERIA (binary; DB-probe or DOM — never screenshot-only)
1. **A2** — an approved model rejects a weight write AND a measure write, at the RPC **and** via a direct table write (UI is not the boundary).
2. **A3** — draft version has `version+1`, `supersedes_id=<old>`, reset approval fields, all children copied; **predecessor byte-identical**; `strata_approve_record` then supersedes it with `effective_to` — unchanged code.
3. **B1** — a NEW snapshot's `config_versions` contains kpi + formula + measure versions and only configs USED; **the 2 existing locked snapshots are byte-identical before/after**.
4. **C2** — mid-period adoption leaves pre-boundary results byte-identical; recalc refuses `close_status<>'open'` and any locked instance; prior `calculated_values` rows still present.
5. **C3** — preview writes nothing (row counts identical before/after); proceeds at any Δ; no escalation control exists anywhere.
6. **E1** — 1 Closed migrated review per locked snapshot; chair/agenda/participants NULL; derived registry still renders identically (compatibility).
7. **F1** — an issued pack cannot be mutated; a correction produces a superseding version; `snapshot_id` unchanged.
8. **G1** — quarantined excluded; `accepted_with_exception` counts; exception flag visible on scorecard, snapshot and board pack; no path converts it to `validated`.
9. **H1** — original run + actuals byte-identical after undo; reversal run references the original; blocked at 24h+1m, snapshot-locked, pack-issued, unsafe-later-run; reversal is atomic.
10. **J** — a draft-linked KPI moves NO official number (calc/health/rollup/snapshot/pack); link activates on approval; no auto-approve.
11. **D-4** — zero code paths write `finance_validated`; audit + actors preserved.
12. **Gates every slice:** tsc · `lint:colors:gate` · `audit:ads:gate` · `lint:cre` · `PATH=node@22 npm test`.

---

## 9. STALE HANDOVER CORRECTIONS (evidence-based)
| Recorded | Truth (probed) |
|---|---|
| "quarantine validation tier" — none exists (P4-D3) | Enums exist on 3 tables; `strata_attest_actual` already sets `quarantined` with SoD; **exclusion already enforced** by the `='validated'` whitelist. Only workflow + exception label missing. |
| "model draft-create" — new build | Supersession half already works; only the `supersedes_id` **writer** is missing. |
| "version diff" / "score-shift" — new build | Inputs already stored (`config_versions`, `config_context` on 7,451 rows, append-only history). The "old" side needs no build. |
| `strata_config_change_requests` | Full governance request table, **read but never written**. Optional envelope only (D-2). |
| "no `strata_reviews`" | ✅ correct — genuinely absent. |
| "board-pack editorial + Issue" | ✅ correct — no version/issued/supersedes columns. |
| "import undo" | ✅ correct — no reversal path. |
| "measure-level authoring" | **SHIPPED** (2a `ffb3f8c68` · 2b `96781d601`) — **must not be counted** (D-8). |
| server SoD RPC · view-as audit · `task_65642237` · `task_70e821ad` · "Vitest cannot run" | All CLOSED — see handover LIVE DEBT. |

---

## 10. 14 PRODUCT CAPABILITIES vs ~24 IMPLEMENTATION SLICES

**Product capabilities = 14** (D-8): 13 previously listed + DEF-010. Measure-level authoring is **shipped and not
counted**. These are what the business is owed.

| # | Capability |
|---|---|
| 1 | Threshold band-editor authoring |
| 2 | Scorecard-model draft-create (revision) |
| 3 | Preview-with-data |
| 4 | Version diff |
| 5 | Score-shift impact preview |
| 6 | Data-source register/retire + dependents-impact |
| 7 | Board-pack editorial builder + Issue |
| 8 | Run downstream blast-radius |
| 9 | Quarantine validation tier |
| 10 | `strata_reviews` scheduling entity |
| 11 | Mapping-memory write |
| 12 | Import 3-way + diff + 24h undo + run-log ledger |
| 13 | **M-D4** approved-model editability (governance) |
| 14 | **DEF-010** draft-KPI → objective linking |

**Implementation slices ≈ 24** — a capability is not a slice. Each slice is ≤2h, one commit, independently
verifiable (2-hour slice rule). Indicative decomposition: A1 audit register · A2 RLS lock · A3a model revision ·
A3b KPI revision · A3c threshold revision · B1a config_versions extend · B1b used-only selection · C1 date-aware
resolution · C2a adoption chooser · C2b recalc RPC · C3a preview RPC · C3b preview UI · C4 version diff · E1a
reviews schema · E1b reviews backfill · E1c registry rewire · F1a pack schema · F1b issue/supersede · G1a quarantine
schema · G1b workflow+exception UI · H1a reversal schema · H1b atomic reverse RPC · J DEF-010 · D-4 vocabulary.
**14 capabilities ≠ 24 slices — do not report slice progress as capability progress.**

---

## 11. GENUINE REMAINING DECISIONS (E-series) — none may be assumed
- **E-1 · The two affected locked snapshots (§3.6).** Numbers are safe; provenance is not. Options: (a) annotate in
  the integrity register, leave untouched — **recommend**, honours D-1; (b) supersede + restate via
  `strata_supersede_snapshot`; (c) accept + document. **Requires a ruling — no code either way.**
- **E-2 · `approved_at IS NULL` on an approved model (§3.4).** Backfill from `effective_from`, or leave and treat as
  its own integrity class? Any control keyed on `approved_at` silently skips it.
- **E-3 · This session's 2 measure rows on the approved B2B model (§3.5).** Remove, or retain as coherent seed?
- **E-4 · Detection blind spot (§3.2).** In-place UPDATEs are undetectable (no `updated_at`, no audit on the raw
  `.update()`). Add `updated_at` + audit triggers to child tables so the census can ever be complete? Recommend yes —
  otherwise A1's register stays a lower bound forever.
- **E-5 · "Restore the prior effective state where one existed" (D-7).** `strata_promote_run` writes NEW actuals; the
  "prior state" may be no row at all. Confirm: restore = revert to previous validated actual if one exists, else mark
  reversed with no replacement?
- **E-6 · Does `accepted_with_exception` flow into `strata_benefit_values` too**, or KPI actuals only? D-5 says
  "data"; benefit values have no `quarantined` state today.
- **E-7 · DEF-010 exclusion mechanism.** Calcs whitelist `validation_status='validated'` on *actuals*, not on KPI
  status — a draft KPI's approved actuals could still count. Exclude by KPI status at calc time, or by link status?
  **This determines whether DEF-010 is a link-table change or a calc-engine change.**
