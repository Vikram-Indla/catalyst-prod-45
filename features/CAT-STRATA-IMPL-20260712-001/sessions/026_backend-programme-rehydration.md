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
