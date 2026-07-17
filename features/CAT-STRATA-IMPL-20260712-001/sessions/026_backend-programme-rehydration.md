# 026 — Backend programme rehydration (no code)

**Feature Work ID:** CAT-STRATA-IMPL-20260712-001
**Session opened:** 2026-07-16 · resumed via `continue feature`
**Branch:** `strata/measures-2b` · working tree clean
**Purpose:** rehydrate against the backend-programme blueprint, report state, STOP for Vikram's implementation prompt.

## Rehydration (artifacts read, in the order the handover's 🛑 NEW SESSION block prescribes)
1. `07_HANDOVER.md` — 🛑 NEW SESSION block + ▶ START HERE + authoritative "Still open" block
2. `03_PLAN_LOCK_BACKEND_PROGRAM.md` — **the main event**, read in full (§1 D-1…D-8 · §1.1 E-1…E-7 · §2 reuse/build
   matrix · §3 P0 integrity audit + §3.7 lower-bound register + §3.8 exception model · §4 config-version completeness ·
   §5 releases · §6 per-capability · §7 backfill/rollback · §8 acceptance · §9 stale corrections · §10 14 vs ~24 ·
   §11 F-1…F-7 · §12 exact P0 scope · §13 E-4 trigger coverage · §14 revised DEF-010 AC)
3. `09_DECISIONS.md` — D-0…D-12, P3/P4/P5 series, M-D0…M-D4, D-1…D-8 (programme), E-1…E-7, P0+, DEF-010
4. `sessions/025_measures-builder-part2b.md`

## Pre-flight (run this session — not inherited)
| Check | Result |
|---|---|
| `pwd` | `/Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/catalyst-prod-46` |
| `git branch --show-current` | `strata/measures-2b` |
| `git status --short -uall` | clean (empty) |
| `git stash list --max-count=5` | 4 stashes, all foreign/pre-existing (w1-rebase · epitaxy · strata-standalone ×2) — none this session's |
| Feature folder | exactly one: `features/CAT-STRATA-IMPL-20260712-001/` |

## State on entry
- **Design pack 28/28 anchors · §20 acceptance 7/7 · no UI phase remains (there is no Phase 6).**
- Measures builder 2a + 2b SHIPPED; both 2b rulings in (M-D3 confirmed, M-D4 deferred to its own slice). 2b CLOSED.
- Everything open is BACKEND / OPS / optional POLISH: **14 product capabilities ≈ 24 implementation slices.**
- Product policy RULED for all 14 (D-1…D-8) + integrity handling RULED (E-1…E-7). **Blueprint NOT APPROVED.**
- **Next named action: R0 / A1 — the P0 integrity register.** Critical path A1 → A2 → A3 → B1 → C1.

## Gates NOT satisfied — implementation is BLOCKED
1. **Blueprint not approved** (CLAUDE.md: no code before Plan Lock).
2. **F-1…F-7 open.** Blockers: **F-1** (no Strategy Office owner named for the integrity-exception records → the
   register cannot be built without a zero-assumption violation) · **F-4** (A2's RLS fix freezes children on approved
   parents, blocking E-2's v2 clone until A3 exists → A2→A3 must be sequenced back-to-back). **F-7** changes live
   numbers (does `owner_confirmed` count in benefit realization?).
3. Each capability still needs **its own per-slice Plan Lock**. The blueprint is the programme, not a slice spec.

## Actions taken this session
Read-only rehydration. **No code, no migration, no slice picked, PR #349 NOT merged.**

## Status
⏸ STOPPED as instructed — awaiting Vikram's implementation prompt.

---

# SESSION 026 (continued) — programme AUTHORIZED mid-session; R0 core implemented

**2026-07-16.** Vikram authorized the full backend programme for continuous execution through Release 5.
Rehydration ended; implementation began in the same session.

## Shipped — 4 slices, committed AND pushed to `strata/measures-2b` (PR #349 open, unmerged, not touched)
| Slice | Commit | Migration |
|---|---|---|
| P0-A · approved-model aggregate immutability (D-1) | `d9cd94a3b` | `20260716160000` |
| A3a · `strata_create_model_draft_version` (D-2) | `7ba522678` | `20260716170000` |
| P0-C · E-4 child auditability | `3fced1f82` | `20260716180000` |
| P0-D · `strata_integrity_exceptions` register (E-1/E-2) | `1d57793fa` | `20260716190000` |

Suite 2,426/6 on entry → **2,434 passed / 6 failed** (+8 tests, 0 new failures; the 6 are foreign ChatDock).
All gates green on every slice. Ledger 1:1 verified after each migration.

## What I did NOT do, and why
- **The 3 integrity-exception records** — blocked on **F-1** (a person's name; not inferable). Table ships empty,
  which is the honest state.
- **A3b (KPI revision)** — stopped and raised **F-9**: KPI revision moves official numbers (v2 would have no links or
  actuals; every objective silently loses its measure). D-3 settles the requirement, not the mechanism. Not derivable
  → raised with 3 options + a recommendation rather than coded past.
- **A3c, B1, R1–R5** — not started. Context risk; handover written instead of half-landing a slice that moves numbers.

## Judgement calls made under the autonomy directive (all logged, none silent)
- **F-2/F-3/F-4/F-5/F-6/F-7 resolved from the authorization's CONFIRMED PRODUCT RULES** rather than asking — each maps
  to an explicit rule. Recorded in `09_DECISIONS.md` with the derivation.
- **F-8 (new):** excluded `strata_element_kpis` from the P0 draft-gate. The blueprint said to gate it; doing so would
  have broken every KPI link. Derived from §3.7 + E-7 + the regression ban. **DRIFT-10.**
- **Split P0 into A/C/D + A3a** rather than one migration (§12.3 says "one migration, ships alone") — the 2-hour rule
  and the authorization's "split it, log the split and continue".
- **Corrected AC-6's fixture** rather than weakening the test. **DRIFT-11.**

## Method note worth keeping
Every acceptance test ran as a **real non-admin `strategy_office` user** with a **positive control**, inside a
`DO $$ … $$` block ending in `RAISE EXCEPTION` — which reports the results AND rolls back, so **no staging data was
written by any test**. The one time a test failed, it was **the test that was wrong, not the code** (it drove
`UPDATE … SET status='pending_approval'` directly; submission is RPC-only).

## Status
⏸ **Stopped at context limit, cleanly, on a committed+pushed boundary.** Next: **A3c** (safe, near-copy of A3a),
then B1. **A3b needs F-9 ruled. The 3 register records need F-1.**

---

# SESSION 026 (part 3) — F-1 + F-9 ruled; R0 completed, R1 revision/lineage core landed

**2026-07-16/17.** Vikram ruled F-1 (accountability = ROLE) and F-9 (stable logical lineage). Both discharged.

## Shipped in this part — 6 more slices, all committed AND pushed
| Slice | Commit | Migration |
|---|---|---|
| P0-D2 · F-1 correction + the 3 records filed | `ce4200274` | `20260716200000` |
| A3c · threshold revision | `81bf2a9f6` | `20260716210000` |
| A3b-1 · KPI lineage + backfill + EXCLUDE non-overlap | `804d12b16` | `20260716220000` |
| A3b-2 · canonical effective-version resolver | `a5a277a17` | `20260716230000` |
| A3b · KPI draft-version + revision_class | `f72faf352` | `20260716240000` |

**Session total: 10 slices.** Suite steady at **2,434 passed / 6 failed** (the 6 foreign ChatDock), all gates green on
every slice, ledger 1:1 after each migration. **No open blockers remain.**

## Ruling tests satisfied (of the ruling's own list)
✅ existing KPI IDs unchanged (**checksum-proven, byte-identical**) · ✅ chains receive one lineage (proven on a
simulated `v1←v2←v3`; **staging has 0 real chains — `supersedes_id` was never used**) · ✅ new version retains lineage +
increments · ✅ predecessor byte-identical · ✅ formula definitions clone · ✅ **facts do not clone** · ✅ present-day
relationships resolve v2 · ✅ historical views resolve v1 · ✅ no overlapping effective approved versions · ✅ draft
versions never enter official calculations · ✅ locked snapshots unchanged · ✅ gates + baseline hold.
**Not yet proven (step 7, consumer-side):** material revision ⇒ Missing rather than a carried-forward value ·
non_material continuity retains exact provenance. The `revision_class` column is shipped and DB-enforced; the
CONSUMER behaviour is what remains.

## Judgement calls (logged, none silent)
- **F-1's own record count/facts were RE-PROBED** rather than copied from §3.8's prose. They matched (SNAP-1 → 1
  post-lock row; SNAP-1001 → 5; both stamp CEO v1).
- **Fixed a latent bug in my own P0-D design**: `UNIQUE(...)` treats NULLs as distinct, so model-class exception
  records could be filed repeatedly. Now `UNIQUE NULLS NOT DISTINCT`.
- **EXCLUDE constraint over a trigger** for non-overlap: a BEFORE-trigger check can be raced by two concurrent
  approvals. Added the **adjacent-versions-allowed control** — a constraint that blocked `[a,b)`+`[b,∞)` would have
  forbidden the very supersession it exists to support.
- **`revision_class` REQUIRED, not defaulted**, and enforced by DB CHECK as well as the RPC. Defaulting it would have
  the system assert "safe to trend through" on an author's behalf — invisible in the number.
- **Version = `max(version)+1` across the LINEAGE**, not `source.version+1` (the source may not be the highest).

## Status
⏸ **Stopped at context limit on a committed+pushed boundary.** Next: **step 6** — wire the calc engine + snapshot
provenance to the canonical resolver, together with **B1 (§4 config_versions completeness)**: the ruling's required
provenance list and B1's required list are **the same problem**. Then step 7 (materiality consumer behaviour), then
R2→R5.

---

# SESSION 026 (part 4) — step 6: calc wiring + B1, done together

**2026-07-17.** Two more slices: **6a** `23a5ac938` (`20260717100000`) · **6b** `04ef41fb4` (`20260717110000`).
**Session total: 12 slices.** Suite steady at 2,434/6; all gates green; ledger 1:1.

## The finding that decided step 6 — F-10
Naive date-aware resolution would have **erased 3,210 of 3,212** historical KPI results. `effective_from` holds the
**approval timestamp**, not a business-effective date (8 KPIs: `effective_from == approved_at ==
2026-07-04 22:56:51`, byte-identical — stamped by `strata_approve_record`'s `COALESCE(effective_from, now())`), while
their periods end 2026-03-31…2026-06-30. **Applied backward extension of the earliest approved version** rather than
escalating, because the literal rule hits an authorized hard blocker ("would destroy or rewrite governed history"),
which makes the answer derivable. Measured 3,210 → **0**. Flagged for override with the consequence stated.

## Zero numbers moved — the test that had to pass
18/18 kpi×period results **byte-identical** to the pre-migration baseline. Locked snapshots **byte-identical**
(`md5 = 128b14afc429bc18ad5dc14563edf3d3` before and after).

## Two defects found by testing my own work
1. **The first 6b draft produced the same threshold scheme twice** — `{id, version:null}` and `{id, version:"1"}` —
   because only `strata_calc_kpi_achievement` was wired in 6a. Deduping the null away would have **over-claimed
   completeness**, the exact fault §4 exists to fix. Fixed by deriving `used` only from fully-provenanced items and
   **counting** the rest (`provenance_completeness`), so the snapshot declares itself a LOWER BOUND.
2. **A test fixture, not the code:** the material-revision test first picked the period ending 2026-03-31, where v1 IS
   correctly effective — so "carried forward v1's actual" was the right answer. Re-run against the 2026-06-30 period,
   where v2 is effective, it proved the real rule: **Missing, not 90**.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary. Step 6 is HALF done.**
**Next: 6c** — wire `strata_calc_scorecard_instance` · `strata_calc_period` · `strata_calc_benefit_realization` to the
canonical resolver, exactly as 6a wired `strata_calc_kpi_achievement`. The 20 `items_without_full_provenance` counted
in every new snapshot **is** that to-do list. Then step 7 (materiality consumer behaviour), then R2→R5.

---

# SESSION 026 (part 5) — step 6c; STEP 6 COMPLETE

**2026-07-17.** `71cffc658` (`20260717120000`). **Session total: 13 slices.** Suite 2,434/6; gates green; ledger 1:1.

## Step 6 closed itself, by design
6b's `provenance_completeness` counter WAS 6c's to-do list: **8/28 → 42/43**. The metric was built to be honest about
what it did not know, and that honesty is what made the next slice's scope self-evident rather than guessed.
The final 1 is stale data (an instance that no longer calculates), not an unwired calc — and the metric still reports
LOWER BOUND rather than rounding up to "complete".

## Two bugs found by wiring, not by reading
1. **`strata_calc_period` would have silently vanished historical numbers** the moment any lineage had 2 versions: it
   joined targets on the approved row's id, so an old period whose target sits on v1 finds none on v2 → the KPI is
   never iterated. Fixed to iterate by lineage.
2. **6b's own completeness metric was KPI-centric** — benefit values have no KPI, so they'd have counted as
   "incomplete" forever and the metric could never reach 0. Replaced the key with a general `provenance_schema: 1`
   marker (a version number, not a boolean, so future provenance changes are detectable).

## Zero numbers moved, across all of step 6
18/18 KPI results · 11/11 instance+benefit results · locked snapshots `md5 128b14af…` — all byte-identical.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary. STEP 6 COMPLETE.**
**Next: step 7** — materiality CONSUMER behaviour (methodology break for `material`; continuous trend + exact
provenance for `non_material`). The data is already in place: `kpi_revision_class` rides in every calculated value's
`config_context` and in the snapshot's `used.kpis[]`. It is a read/render slice.
**Then R2→R5.** Carry-forward debt (both R4, both live-numbers): benefit realization ignores `owner_confirmed` (F-7);
KPI achievement counts `pending` actuals (E-7 condition 3).

---

# SESSION 026 (part 6) — step 7: materiality consumer behaviour

**2026-07-17.** `51034bc94` (no migration). **Session total: 14 slices.** Suite **2,442 passed / 6 failed** (+8).

## The ruling's step 7 had a hidden prerequisite
"Display a methodology break" had **nowhere to appear**: `id` identifies a version, and the trend was built from ONE
`kpiId`, so a revision made the KPI's history silently restart. Step 7 = make the trend span the **lineage**, THEN
mark the break. The second is meaningless without the first.

## The rule is shared, deliberately
`domain/materiality.ts` → `methodologyBreaks(points)`. Same argument as the DB resolver: the ruling forbids surfaces
inventing their own version handling, and scorecard detail + board packs need the same answer (F-3). Testing the
shared rule tests it for all callers; testing it through one page would only ever prove that page.

## 🔴 F-11 — the biggest finding of the session, and it is about my own gate
**`npx tsc --noEmit` checks NOTHING** — root tsconfig is `files: []` + references. A deliberate
`const x: number = "definitely not a number"` produced zero errors. **The "tsc clean" gate I reported on all 13 prior
slices was vacuous.** Real check `-p tsconfig.app.json`: **159 pre-existing parse errors in 4 foreign files, 0 in
ours**. RTK compounded it — its tsc filter prints "TypeScript: No errors found" even for `tsc --version`.
**No shipped claim rests on tsc** — every claim in `06_VALIDATION_EVIDENCE.md` came from a DB probe or a test. But the
gate was reported as passing when it never ran, and that is worth correcting loudly. Raised with a recommendation
(switch the gate, then ratchet at 159 like `lint:colors:gate`); needs a repo-wide ruling. Memory: [[tsc-noemit-is-a-noop]].

## Discipline note
An interim suite run showed **8** failures. `AgeingPanel.navigate` had timed out at 5000ms under load and **passes in
isolation**; the re-run was clean at 6. Flagged in the evidence rather than quietly re-running until green.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary. Steps 1–7 of the F-9 order are COMPLETE.**
**Next: step 8 — R2 → R5.** Carry-forward debt (both R4, both move live numbers): benefit realization ignores
`owner_confirmed` (F-7 rules it COUNTS); KPI achievement counts `pending` actuals (E-7 condition 3). Both are now
recorded in each calculated value's provenance, so when they change the change will be visible and dated.

---

# SESSION 026 (part 7) — step 8 begins: R2 / E1 reviews

**2026-07-17.** `519e2af63` (`20260717130000`). **Session total: 15 slices.**

## Probing shrank E1 again
`strata_decisions` already carries `snapshot_id`+`forum`; `strata_actions` already carries `decision_id`. The
authorization's "snapshot, agenda, decision and action relationships" was **already built** — E1 joins the existing
chain at the snapshot rather than minting `review_id` columns that would give two paths to one fact. Only `agenda` was
genuinely absent. **`strata_reviews` itself was correctly reported absent** — §9's one accurate "genuinely missing".

## D-6 taken literally
2 migrated Closed reviews / 2 locked snapshots. Chair, agenda, scheduled_for, participants **NULL/empty**. Participants
are rows, not a jsonb blob, so nobody can write `[]` and call it attendance. Each migrated row's `note` says which
fields were **assumed by the migration** (review_type/cadence) versus recorded — the reader never has to guess.

## Probe finding + a self-correction
`strata_snapshots.status` is CHECKed to `locked|superseded` — **a snapshot is locked by construction**. My first error
message said "unlocked snapshot", describing a state that cannot exist. Corrected before commit.

## ⚠️ Suite baseline corrected — I had been quoting a lucky run
`AgeingPanel.navigate` and `registry-drift` **pass in isolation** but time out under full-suite load. True baseline =
**6 real (ChatDock) + 2 load-flaky = 8**. Step 7's "2,442/6" was the lucky run. This slice changed **zero src files**
(migration-only), which is what proves the 2 are not mine. Recorded rather than re-run until green.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary.**
**Next: R2/F1 board-pack issue+supersede** (needed E1; now unblocked). Then R3 → R4 → R5.
Carry-forward R4 debt unchanged (both move live numbers): benefit realization ignores `owner_confirmed` (F-7);
KPI achievement counts `pending` actuals (E-7 cond. 3).

---

# SESSION 026 (part 8) — R2 / F1 board-pack issuance

**2026-07-17.** `a47385508` (`20260717140000`). **Session total: 16 slices.** Suite 2,442/6; gates green; ledger 1:1.

## F-12 — the blueprint said to overload a column that was already taken
§6: "status +issued, superseded". But `status` is the **generation** lifecycle (`pending|generating|ready|failed`),
in use by 3 rows, and the authorization also wants an editorial builder/review/approval. One column would have made
`generating` and `in_review` incomparable and left an `issued` pack with **no generation state at all**. Gave the
editorial lifecycle its own `issue_status`; existing rows default to `draft`, which is the truth.

## Two design calls worth keeping
- **Immutability is a trigger, not RLS.** RLS gates *whether a row is writable*, not *which fields changed* — and both
  RPCs are SECURITY DEFINER, so they bypass RLS entirely. Only a BEFORE UPDATE trigger sees OLD vs NEW and binds every
  writer.
- **The F-3 qualification is derived, never copied onto the pack.** A copied qualification goes stale the moment the
  register changes — and the stale copy is what would get **printed on a board pack**.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary. R2 is DB-COMPLETE; its UI is not built.**
**Next:** R2's editorial builder UI (+ reviews UI from E1) → R3 → **R4 (where the two live-numbers debts land)** → R5.

---

# SESSION 026 (part 9) — R3 data-source governance

**2026-07-17.** `48a05afab` (`20260717150000`). **Session total: 17 slices.** Suite 2,442/6; gates green; ledger 1:1.

## Reuse again: the states were already there
`strata_data_sources.status` was already `registered|active|suspended|retired` — R3's whole lifecycle. Only the
**transitions** (unenforced), the dependents check and the blast radius were missing.

## The near-miss worth remembering
I drafted "the forward chain is complete and populated" citing **3,178** run-sourced calculated values and **32**
snapshot-frozen ones. Probing the **intersection**: **0**. They never meet. `historical` is legitimately empty on real
data. **Two impressive counts that don't join is exactly the shape of an evidence-free claim** — I caught it only
because the test returned 0 and I refused to accept my own explanation without checking. Chain proven to fire on a
constructed case (SNAP-1001); comment corrected before commit.

## Design calls
- **A third class beyond "blocking/migration": HISTORICAL.** Collapsing it into BLOCKING makes any source with history
  permanently un-retirable; into MIGRATION invites "migrating" a locked snapshot = rewriting governed history (D-1).
- **Suspension ungated on dependents.** Suspending is how you stop a bad feed; gating it means the more important a
  broken source is, the harder it is to stop. Retirement (terminal) IS gated + reasoned.
- **Blockers are NAMED, not counted** — a retirement decision needs the names.
- **`coverage_note` on every response**: manual actuals carry no run lineage, so absence is not evidence.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary. R2 and R3 are DB-COMPLETE with NO UI.**
**Next: R4** — quarantine/exception workflow, benefit assurance, mapping memory, reconciliation, 24h import reversal.
**Both live-numbers debts land in R4.** Then R5 + the 14/14 matrix.

---

# SESSION 026 (part 10) — R4a assurance vocabulary; DEBT #1 discharged

**2026-07-17.** `28e2c1bbf` (`20260717160000`) + `b1481249c` (client realign). **Session total: 19 slices.**

## The Finance lie is gone
`finance_validated` lived on **`strata_benefits.lifecycle_stage`** (the blueprint pointed at the wrong table) and was
stamped on **any** validator's verdict — while **no Finance role exists anywhere in STRATA**. Now unrepresentable.
The migration is a **relabel, not a re-assertion**: same rows, same counts, actors and audit untouched.

## F-7 shipped without moving a number — deliberately
9/9 benefits byte-identical. `owner_confirmed`/`accepted_with_exception` had **0 rows**, so widening the whitelist
changed nothing *today* while putting the rule in force. Proven to have teeth (0.0000 → 0.4000 once a value is
confirmed). **A change that moved numbers on the day it shipped would have been a silent restatement of history.**

## The follow-up that mattered more than the migration
R4a **broke a governed write path**: `validateBenefitValue(id,'validated')` now throws, so the VMO page's Validate
button was dead. **Neither tsc invocation could see it** — `--noEmit` is a no-op (F-11) and `-p tsconfig.app.json`
leaves these property accesses unchecked at `strict:false`. **Grep found it.** Fixed with TWO buttons, not one
relabelled: *owner confirmed* and *independently validated* are different claims, and merging them would have
recreated the exact lie D-4 removed.

## Status
⏸ **Stopped at context limit on a committed+pushed boundary. DEBT #1 discharged; DEBT #2 open.**
**Next:** quarantine workflow RPC (states + columns already exist) → **DEBT #2: pending actuals counting (E-7 cond. 3)
— this one WILL move live numbers, unlike F-7; baseline first** → mapping memory/reconciliation → 24h reversal → R5.
