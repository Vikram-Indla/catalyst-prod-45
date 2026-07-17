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

### 1.1 E-SERIES RULINGS (Vikram, 2026-07-16) — integrity-exception handling

| ID | Ruling |
|---|---|
| **E-1** | **Preserve and annotate both affected locked snapshots. Do NOT restate** — the exact historical child configuration cannot be reconstructed reliably. Frozen values remain **official and unchanged**; their configuration provenance is **qualified**. Create an integrity-exception record (§3.8). **Never modify the locked payload.** |
| **E-2** | **Do NOT backfill or infer `approved_at`.** Classify B2B Sector Scorecard v1 as **legacy/unverified approval provenance**. Prevent further edits → clone its intended current configuration into **v2 Draft** → obtain proper Strategy Office approval → set an explicit effective date → **supersede v1 prospectively**. Future clean approval requires agreement among: approved status · `approved_at` · `approved_by` · approval audit event · successful integrity checks. |
| **E-3** | **Retain** the two verification measure rows. **Do not delete or "clean" the approved model in place.** Preserve rows + audit evidence; mark v1 integrity-qualified; then **deliberately** include or exclude the measures in the clean v2 reviewed by Strategy Office. |
| **E-4** | **Add full database-level child auditability.** `updated_at`, actor fields, and INSERT/UPDATE/DELETE audit triggers on **every governed child table that can affect calculations**. Audit old + new values, parent, actor, timestamp, operation, correlation/request context. **For approved parents, reject child UPDATE and DELETE at both RPC and DB/RLS layers.** |
| **E-5** | **Import reversal restores the previous validated effective state.** Mark imported actuals reversed/superseded. If a prior valid, non-reversed actual exists for the same KPI/period/applicable source context → **restore it as effective**; otherwise **leave no effective value**. **Never create zero, negative or artificial offset measurements.** Recalculate **unlocked results only**. |
| **E-6** | **Extend accepted-with-exception governance to BOTH KPI actuals and benefit values.** Both: quarantined + rejected do NOT count · validated counts · SO-authorized `accepted_with_exception` **counts** · submitters cannot authorize their own exceptions · exception reason, original failures, evidence, actor, timestamp remain **visible downstream**. **Benefit assurance stays separate** (Reported · Owner confirmed · Independently validated). **Acceptance for calculation does NOT imply independent validation.** |
| **E-7** | **Enforce draft-KPI exclusion at BOTH the relationship and calculation layers.** Draft/pending KPIs may be linked for authoring; visible but excluded from official reporting. Approved+effective ⇒ reportable. Superseded/retired ⇒ historical only. **Do NOT add an independent link-status state machine unless relationship approval is genuinely separate from KPI approval — prefer deriving reportability from KPI lifecycle + effective dates.** Every official calculation must **independently** require: approved+effective KPI · reportable model-measure/objective relationship · validated-or-accepted-with-exception actual · correct scope+period · captured configuration versions. Draft previews may use draft KPIs **only in clearly labelled, non-persistent simulations**. |
| **P0+** | **Broaden the integrity audit** across **every governed parent/child aggregate that can affect official results**, not only scorecard models. Because historical updates may be undetectable, **label the report explicitly as a LOWER-BOUND EVIDENCE REGISTER.** |

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
them can no longer be proven. **E-1: preserve + annotate. Do NOT restate — the exact historical child configuration
cannot be reconstructed reliably. Never modify the locked payload.**

---

### 3.7 BROADER AUDIT (P0+) — **LOWER-BOUND EVIDENCE REGISTER**, all governed aggregates, read-only 2026-07-16

> **⚠️ THIS IS A LOWER BOUND, NOT A CENSUS.** In-place UPDATEs are **undetectable** on the four child tables that
> lack `updated_at`, and `setModelPerspectiveWeights`' raw `.update()` writes **no audit event**. Absence of a row
> below is **NOT evidence of integrity** — it is evidence of *no detectable INSERT*. This label is mandatory on every
> future run until E-4 lands.

**Scope covered:** all **9** governed parents (`strata_governed_tables()`: `gate_models · kpi_type_configs · kpis ·
perspectives · scorecard_models · threshold_schemes · upload_templates · value_categories · workflow_configs`) ×
their aggregate children (`model_perspectives · model_measures · gate_model_stages · kpi_formula_versions ·
element_kpis`).

**Result — the violation set is CONFINED to the scorecard-model aggregate:**

| Governed parent | Record | v | Child aggregate | Rows after approval | Classification |
|---|---|---|---|---|---|
| `strata_scorecard_models` | B2B Sector Scorecard (**approved_at NULL**) | 1 | model_measures | 2 | 🔴 **VIOLATION** (E-3: retain) |
| `strata_scorecard_models` | B2B Sector Scorecard | 1 | model_perspectives | 3 | 🔴 **VIOLATION** |
| `strata_scorecard_models` | CEO Enterprise Scorecard | 1 | model_perspectives | 1 | 🔴 **VIOLATION** |
| `strata_kpis` | Churn Rate | 1 | element_kpis | 1 | ✅ **NOT a violation** — see below |
| `strata_kpis` | Enterprise Revenue Growth (proof) | 1 | element_kpis | 1 | ✅ **NOT a violation** |
| `strata_gate_models` | (all) | — | gate_model_stages | **0** | ✅ clean — **and correctly gated** |
| `strata_kpis` | (all) | — | kpi_formula_versions | **0** | ✅ clean |
| `strata_perspectives` · `strata_threshold_schemes` | (all) | — | — | **0** | ✅ clean |

**Aggregate-definition children vs relationship/operational children — do not conflate.**
`element_kpis` rows created after KPI approval are **legitimate and intended**: linking is *supposed* to happen
post-approval (`strata_link_element_kpi` requires `approved`; linking lives on the Strategy Room `KpiLinksModal` —
[[strata-kpi-link-requires-approved]]). They are **not** part of the KPI's definition, so they do not violate
immutability. **But they DO affect official results** (objective roll-up/health) and are **unaudited** (no
`updated_at`) — so they are in scope for **E-4 trigger coverage** and **NOT** in the violation register.
Reporting them as violations would be a false positive.

**The reassuring finding:** broadening the audit did **not** widen the blast radius. Every other governed aggregate is
clean, and `strata_gate_model_stages` is clean **because it is already correctly gated** (§6.1) — the one child
aggregate whose RLS joins the parent's draft status. The defect is specific, not systemic.

---

### 3.8 INTEGRITY-EXCEPTION MODEL (E-1) — design, not yet built

A first-class, append-only register. **Never modifies the locked payload; never restates.**

| Field | Value for the two records |
|---|---|
| `affected_snapshot` | SNAP-1 · SNAP-1001 |
| `affected_model` / `version` | CEO Enterprise Scorecard / v1 (both) |
| `discovery_date` | 2026-07-16 |
| `known_child_changes` | SNAP-1: 1 model_perspective row written post-lock (`2026-07-12 07:02:46`). SNAP-1001: 5 rows post-lock. **Detection is a lower bound (§3.7).** |
| `values_changed` | **NO** — `snapshot_items.payload` frozen at lock; `calcResult` reads the frozen payload for locked instances |
| `provenance_reproducibility` | **INCOMPLETE** — "model v1" no longer re-resolves to the weights that produced the frozen numbers |
| `strategy_office_owner` | **UNASSIGNED — required before the register is built (F-1)** |
| `resolution` | **PRESERVED WITH QUALIFICATION** |

**Surfacing rule:** wherever a qualified snapshot's numbers appear (scorecard detail, review cockpit, board pack),
the qualification is **visible** — the values are official; the provenance is qualified. Zero-assumption: never render
a provenance claim the register does not support.

**A third exception class (E-2):** B2B Sector Scorecard v1 = **legacy/unverified approval provenance**
(`status='approved'`, `approved_at` NULL — never approved via `strata_approve_record`). Not a snapshot exception;
a *model* exception. Resolution path is E-2's: freeze v1 → clone to v2 Draft → proper SO approval → explicit
effective date → **prospective** supersession. **No backfill, no inference.**

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

## 12. EXACT P0 SCOPE (R0) — migration · RLS · RPC

### 12.1 The precedent to copy (do NOT invent a pattern)
**`strata_gate_model_stages_write` ALREADY gates its child on the parent's draft status** — verified via `pg_policies`
(`gates_on_draft_status = true`), and that aggregate is **clean in the audit**. It is the only correctly-gated child
aggregate. **Copy its shape.** All **9 governed PARENTS** already gate UPDATE + DELETE on draft — parents are fine;
only children are exposed.

### 12.2 Exposed children (verified via `pg_policies`)
| Child table | Policy | Gates on parent draft? | Action |
|---|---|---|---|
| `strata_scorecard_model_perspectives` | `..._write` (ALL) | ❌ **false** | P0 fix |
| `strata_scorecard_model_measures` | `strata_model_measures_write` (ALL) | ❌ **null** (no status predicate) | P0 fix |
| `strata_element_kpis` | `strata_element_kpis_write` (ALL) | ❌ **false** | P0 fix + DEF-010 (E-7) |
| `strata_gate_model_stages` | `..._write` (ALL) | ✅ **true** | none — precedent |

### 12.3 P0 migration scope (additive; one migration, ships alone, first)
1. **RLS** — rewrite the three exposed child write policies to join the parent and require `status='draft'`, modelled
   on `strata_gate_model_stages_write`. Covers INSERT/UPDATE/DELETE (E-4: reject child UPDATE **and** DELETE for
   approved parents).
2. **RPC** — add a parent-status guard inside `strata_set_model_measures` (belt **and** braces: E-4 requires **both**
   RPC and DB/RLS; the UI is not a security boundary).
3. **Aggregate completeness (D-1)** — the guard must protect the **complete** aggregate: perspectives, weights,
   measures, aggregation settings, target policies, **threshold association** (`strata_scorecard_models
   .threshold_scheme_id` — already covered by the parent's own draft-gated UPDATE policy; verify, do not assume).
4. **E-4 columns + triggers** — see §13.
5. **Integrity-exception register** (§3.8) — append-only table + the 3 records (2 snapshot + 1 model/E-2).
   **`strategy_office_owner` is required and unassigned → F-1 blocks this.**
6. **NOT in P0:** revision RPCs (A3/D-2 — next slice), any remediation of existing records, any history rewrite.

**Ordering hazard:** the RLS fix (12.3.1) **blocks the B2B v2 clone path (E-2)** until the revision RPC (A3) exists —
once children are frozen on approved parents, v1's configuration cannot be edited *and* cannot yet be cloned. **A3
must land immediately after A2, or E-2 stalls.** Flagged as F-4.

---

## 13. COMPLETE AUDIT-TRIGGER COVERAGE (E-4)

**Coverage rule:** every governed child table that can affect official results gets `updated_at`, actor fields, and
INSERT/UPDATE/DELETE audit triggers capturing **old + new values, parent, actor, timestamp, operation, and
correlation/request context**.

### 13.1 Gap census (verified against `information_schema`) — exactly 4 tables lack `updated_at`
| Child table | Parent | `updated_at` | Affects official results? | Action |
|---|---|---|---|---|
| `strata_scorecard_model_perspectives` | scorecard_models | ❌ | **YES** — weights | **+updated_at, +actor, +triggers** |
| `strata_scorecard_model_measures` | scorecard_models / kpis / perspectives | ❌ | **YES** — measure weights | **+updated_at, +actor, +triggers** |
| `strata_element_kpis` | kpis / strategy_elements | ❌ | **YES** — objective roll-up + DEF-010 | **+updated_at, +actor, +triggers** |
| `strata_initiative_kpis` | kpis | ❌ | **YES** — initiative roll-up | **+updated_at, +actor, +triggers** |

### 13.2 Already have `updated_at` — triggers still required where they affect results
`strata_kpi_actuals` · `strata_kpi_targets` · `strata_kpi_formula_versions` · `strata_scorecard_lines` ·
`strata_key_results` · `strata_gate_model_stages` · `strata_scorecard_instances` · `strata_theme_charters` ·
`strata_upload_runs` · `strata_benefit_values`. **`updated_at` alone is not auditability** — it records *that*
something changed, never *what*, *by whom*, or *from what*. Old/new-value capture is the point.

### 13.3 Reuse
`strata_audit_events` (entity_table, entity_id, action, actor_id, note) already exists and is written by every
governed RPC — **extend it (old/new payload + correlation context) rather than minting a second audit store.**
`strata_touch_updated_at()` already exists as the `updated_at` trigger function — reuse verbatim.

### 13.4 Consequence for the register
Until 13.1 lands, **every integrity audit is a lower bound** (§3.7) and must say so. After it lands, the register
becomes a true census **prospectively only** — it can never retroactively recover the undetectable past.

---

## 14. REVISED DEF-010 ACCEPTANCE CRITERIA (E-7)

**Scope restated:** DEF-010 is **a relationship-authoring + calculation-eligibility + snapshot-context + audit +
testing change — NOT a UI-only or link-table-only fix.**

**Design rule (E-7):** do **not** add an independent link-status state machine. Relationship approval is **not**
separate from KPI approval, so **derive reportability from KPI lifecycle + effective dates**. `strata_element_kpis`
gets audit columns (§13.1) — **not** a parallel approval lifecycle.

**Reportability matrix (derived, not stored):**
| KPI lifecycle | Linkable | Visible | Counts in official results |
|---|---|---|---|
| draft / pending_approval | ✅ (authoring) | ✅ marked **Draft** | ❌ **never** |
| approved **and** effective | ✅ | ✅ | ✅ |
| approved, not yet effective | ✅ | ✅ | ❌ (until effective date) |
| superseded / retired | — | ✅ historical | **historical only** |

**Every official calculation must INDEPENDENTLY require all five:**
1. approved **and effective** KPI · 2. reportable model-measure/objective relationship · 3. validated **or
accepted-with-exception** actual (E-6) · 4. correct scope + period · 5. captured configuration versions.

**Acceptance criteria (binary):**
1. A draft KPI can be linked to an objective; the link renders a **Draft** marker.
2. A draft-linked KPI moves **NO** official number: calculation · health · roll-up · **snapshot** · **board pack** ·
   executive reporting. Probe each of the six independently — **not** one calc as a proxy for all.
3. **The 5-condition gate is enforced independently, not as a proxy chain.** Today calcs whitelist
   `validation_status='validated'` on *actuals* — **an approved actual belonging to a draft KPI would still count**.
   Condition 1 must be enforced at calc time in its own right.
4. On approval, eligible links become effective **without any auto-approval of the KPI**.
5. Links survive retirement + supersession and remain resolvable as historical.
6. Snapshot `config_versions` records the draft-exclusion applied (§4), so exclusion is provable after the fact.
7. Draft previews using draft KPIs are **clearly labelled and non-persistent** — assert zero rows written.
8. Audit: link create/update/delete captured with actor + old/new (§13.1).

---

## 11. GENUINE REMAINING DECISIONS (F-series) — none may be assumed
> **E-1 … E-7 are RULED (§1.1) and are no longer open.** The following arose FROM those rulings.

- **F-1 · Who is the `strategy_office_owner` on the three integrity-exception records?** (§3.8). E-1 mandates the
  field; no owner is assigned. **This blocks building the register** — a NULL owner on an accountability record is
  the zero-assumption violation the register exists to prevent. **A name is required.**
- **F-2 · E-2's v2 clone — what is "its intended current configuration"?** B2B v1's current children include the two
  verification measures (E-3) and 3 post-approval perspective weights. E-3 says include/exclude them **deliberately**
  in v2. Clone-as-is then edit in draft (**recommend** — v2 is a draft, freely editable, and the deliberate choice is
  recorded at approval), or clone selectively? **Strategy Office must review the v2 content either way.**
- **F-3 · Does the qualification surface on the BOARD PACK** for SNAP-1/SNAP-1001, or only in admin/registry views?
  §3.8's surfacing rule says wherever the numbers appear. Board packs are the highest-stakes surface and are
  **issued** artefacts — confirm they carry the qualification.
- **F-4 · P0 ordering hazard (§12.3).** The RLS fix (A2) freezes children on approved parents, which **blocks E-2's
  v2 clone until the revision RPC (A3) exists**. Options: (a) A2 → A3 back-to-back before E-2 remediation —
  **recommend**; (b) a one-time, audited exception for the B2B clone; (c) A3 before A2 (leaves the P0 hole open
  longer). **Do not discover this mid-slice.**
- **F-5 · E-4 retrofit scope on existing rows.** Adding `updated_at` to the 4 tables: default `now()` on backfill
  would **assert a change time that never happened** (false provenance on the very rows under investigation).
  Recommend `NULL`/`created_at` for pre-existing rows + an explicit "unaudited before <date>" marker. **Confirm** —
  this decides whether the register can ever distinguish "unchanged" from "changed before auditing existed".
- **F-6 · E-6 benefit-value exception states.** Benefit values have **no `quarantined` state today**
  (`pending|validated|rejected`) while KPI actuals do. E-6 requires exception governance in both. Add both
  `quarantined` **and** `accepted_with_exception` to benefit values, or only the latter? Adding `quarantined`
  implies a benefit-value quarantine workflow that does not exist and was not asked for.
- **F-7 · D-4 × E-6 interaction — the 4-state assurance vs the counting rule.** D-4 states are **Reported · Owner
  confirmed · Independently validated · Rejected**; E-6 says validated **and** accepted-with-exception count, and
  "acceptance for calculation does not imply independent validation". **Does `owner_confirmed` count?** It is neither
  rejected nor independently validated. Today `strata_calc_benefit_realization` whitelists `='validated'`, so
  owner-confirmed would **not** count unless added. **This decides whether benefit realization changes for existing
  data** — a live-numbers question, not a labelling one.
