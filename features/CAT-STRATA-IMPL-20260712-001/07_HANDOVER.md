# 07 — HANDOVER · CAT-STRATA-IMPL-20260712-001

# 🔴 STRATA IS **NOT** COMPLETE — **8 / 14** (was 2/14). READ `12_CAPABILITY_MATRIX.md` FIRST.
> Session 027, 2026-07-17: **8 Complete · 1 Backend-only · 2 Partial · 3 Not started (+ cap 11).**
> **Do not report STRATA as done.** The Definition of Full Closure (every workflow reachable in UI + 14/14) is **not met**.
>
> **⚠️ THIS BANNER SAID 2/14 FOR TWO SESSIONS WHILE THE TRUE COUNT WAS 4.** Commit `f3331ae4a` took caps 6+8 to
> Complete and updated **neither** this banner nor the matrix. **If you move a capability, update BOTH IN THE SAME
> COMMIT.** Session 027 had to re-derive the real state from `git log`. This is the recurring failure mode on this
> feature: **the forward-looking blocks decay one commit after they are written.** Trust `git log` over this file.
>
> **⛔ THE REMAINING WORK IS NOW MOSTLY BACKEND, NOT UI — the inverse of what this banner said for two sessions.**
> Reviews · board packs · quarantine · reversal · data sources are **wired** (027 + `f3331ae4a`).
> What is left: **mapping memory (11) has no table** · **reconciliation (12) 3-way match not built** ·
> **preview-with-data (3) · version diff (4) · score-shift (5) not started** · **band editor UI (1)** ·
> **DEF-010 link relaxation (14)**. Exact per-capability detail: `12_CAPABILITY_MATRIX.md`.
>
> **⚠️ 027 shipped NO screenshot acceptance.** All UI claims rest on DOM assertions + DB probes; nothing was loaded in
> a browser. Per CLAUDE.md that is not UI/UX acceptance — **a screenshot pass is owed on caps 7 · 9 · 10 · 12.**
>
> **🔴 F-11b — `tsc` NEVER CHECKED STRATA. NOT WITH EITHER CONFIG.** F-11's prescribed fallback
> (`-p tsconfig.app.json`) is **also semantically silent**: parse errors in 4 foreign files suppress type-checking
> repo-wide. Proven in 027 — a deliberate `const x: number = "string"` in `domain/index.ts` produced **zero** errors,
> and a genuinely missing import (`StrataBlastRadius`, shipped unimported in `f3331ae4a`) was never flagged.
> **"0 errors under src/modules/strata" is vacuous — stop reporting it.** Details + the ruling ask: `09_DECISIONS.md` → F-11b.
>
> **Verified 2026-07-17 (re-probed, not inherited):** locked snapshots **byte-identical** across the whole session
> (`md5 128b14afc429bc18ad5dc14563edf3d3`) · **18/18 KPI + 9/9 benefit calcs byte-identical** · both live-numbers
> debts (F-7, E-7 cond.3) **live and moved nothing** (the states they turn on had zero rows) · staging actuals =
> **18 total, ALL validated, 0 pending** (an earlier handover claimed pending existed — **false, written from
> memory**) · gates green · suite **2,442/6** · ledger **1:1** · **PR #349 open, unmerged**.
> **F-11 stands: `npx tsc --noEmit` is a NO-OP — use `-p tsconfig.app.json` and grep your own paths.**


---

# 🟢 NEW SESSION — START HERE (session 026, 2026-07-16). THIS BLOCK IS AUTHORITATIVE.
> **Everything below the next `═══` divider was written at the END OF SESSION 025, BEFORE the programme was
> authorized. Its "STOP AND WAIT" instruction and its "blueprint NOT APPROVED / implementation BLOCKED" gates are
> STALE — Vikram authorized the full programme on 2026-07-16. Read this block first; where they disagree, THIS WINS.**

## The programme is AUTHORIZED and RUNNING. Do not stop for routine approval.
Vikram, 2026-07-16: *"Proceed with the FULL STRATA backend programme continuously through completion … The complete
backend-programme Plan Lock, D-series, E-series and F-series rulings are approved."* Full authorization text and the
CONFIRMED PRODUCT RULES: `09_DECISIONS.md` → "Backend programme AUTHORIZED".
**Per slice: implement → migrate staging → test → evidence → logs → commit → next dependency-safe slice.**
**Stop ONLY for a genuine hard blocker** (list in the authorization). Not for size, tests, migrations, or a debt item
proving bigger than expected. **PR #349 stays OPEN and UNMERGED. Do not merge it. Do not force-push.**

## ✅ SHIPPED — R0 COMPLETE + R1 revision/lineage core. 10 slices, committed AND pushed to `strata/measures-2b`.
| Slice | Commit | Migration | What |
|---|---|---|---|
| **P0-A** | `d9cd94a3b` | `20260716160000` | Approved-model aggregate immutability (D-1) — RLS draft-gate on `model_perspectives` + `model_measures`, parent-status guard in `strata_set_model_measures`, honest client failure, UI gate + visible reason |
| **A3a** | `7ba522678` | `20260716170000` | `strata_create_model_draft_version` (D-2) + "Create new version" CTA |
| **P0-C** | `3fced1f82` | `20260716180000` | E-4 child auditability — `updated_at`/`created_by`/`updated_by` + touch/actor/audit triggers on the 4 exposed children |
| **P0-D** | `1d57793fa` | `20260716190000` | `strata_integrity_exceptions` — append-only register (E-1/E-2) |
| **P0-D2** | `ce4200274` | `20260716200000` | **F-1 correction** — `owner_role` required, `assigned_owner_id` nullable, status/due_on; **the 3 records FILED** |
| **A3c** | `81bf2a9f6` | `20260716210000` | `strata_create_threshold_draft_version` (D-2); CTA now driven by a `REVISION_RPC` lookup |
| **A3b-1** | `804d12b16` | `20260716220000` | **KPI `lineage_id`** + chain-aware backfill + `UNIQUE(lineage,version)` + **EXCLUDE** non-overlap (btree_gist) |
| **A3b-2** | `a5a277a17` | `20260716230000` | **Canonical effective-version resolver** + set-based form + `strata_kpi_current_effective` view + hop indexes |
| **A3b** | `f72faf352` | `20260716240000` | `strata_create_kpi_draft_version` + **`revision_class`** (material/non_material), DB-enforced |

**⛔ F-1 and F-9 are BOTH DISCHARGED. There are NO open blockers.**

**All four: applied to `catalyst-staging` (`cyijbdeuehohvhnsywig`) via `execute_sql` + explicit ledger INSERT, ledger
1:1 verified · gates green · acceptance proven by DB probe with positive controls, fully rolled back.**
Suite: **2,434 passed · 6 failed · 16 skipped / 2,456** — the 6 are the pre-existing foreign ChatDock failures.
Baseline on entry was 2,426/6 → **+8 tests, 0 new failures.** Raw evidence: `06_VALIDATION_EVIDENCE.md`.

**🔴 THE P0 HOLE IS CLOSED.** An approved model's weights and measures can no longer be rewritten — proven at RLS
(0 rows) AND at the RPC (raises), as a real non-admin `strategy_office` user, with a draft-model positive control
returning 1 row so the test could actually fail. **F-4 is discharged** (A2→A3 back-to-back), so the E-2 v2 clone path
is open.

## ✅ STEP 6 IS COMPLETE — 6a + 6b + 6c shipped
| | commit | migration |
|---|---|---|
| **6a** calc lineage resolution + full provenance (F-9 + B1) | `23a5ac938` | `20260717100000` |
| **6b** snapshot config-version completeness (§4) | `04ef41fb4` | `20260717110000` |
| **6c** remaining calcs wired; step 6 complete | `71cffc658` | `20260717120000` |

**Provenance completeness went 8/28 → 42/43** (kpi 20/20 · scorecard_line 12/12 · scorecard_instance 2/2 ·
perspective 8/9). The last 1 is **stale data, not an unwired calc** — the two live instances' models have 5 + 3 = 8
perspectives, so everything actually calculated is covered. The metric still says LOWER BOUND, correctly.
**Zero numbers moved at any point: 18/18 KPI results and 11/11 instance+benefit results byte-identical to baseline;
locked snapshots byte-identical (`md5 128b14af…`).**

## ✅ STEP 7 SHIPPED — `51034bc94` (no migration)
Lineage-aware trend + Version provenance column + methodology-break band, driven by the **shared** rule
`domain/materiality.ts` → `methodologyBreaks()` (shared for the same reason as the DB resolver: scorecard detail and
board packs need the same answer — F-3 — and page-local re-derivations drift). 8 tests, incl. a positive control.
**The trend now spans the LINEAGE** — previously it read one `kpiId`, so a revision made the KPI's history vanish.

## 🔴 F-11 — **THE `tsc` GATE IS A NO-OP. Stop reporting "tsc clean".**
`tsconfig.json` is a solution config (`files: []` + references) ⇒ **`npx tsc --noEmit` compiles NOTHING**. Proven with
a deliberate `const x: number = "string"` → zero errors. **Use `npx tsc --noEmit -p tsconfig.app.json`** and grep for
your own paths: it reports **159 pre-existing parse errors in 4 foreign files** (CapacityHeatmap · icon-registry ·
RichTextCommentEditor · SortableColumn) and **0 in this feature's files**. Even then, `strict:false` means property
access on page objects is unchecked — **tsc green is not evidence for STRATA page code; tests and DB probes are.**
Needs a repo-wide ruling (recommendation in `09_DECISIONS.md` → F-11: switch the gate, then ratchet at 159).

## ✅ R2 STARTED — E1 reviews shipped `519e2af63` (`20260717130000`)
`strata_reviews` + participants + `strata_review_readiness` view + `strata_schedule_review`/`strata_update_review` +
**the D-6 backfill (2 migrated Closed reviews / 2 locked snapshots; chair, agenda, scheduled_for, participants all
NULL — never invented)**. Cadence defaults (departmental→monthly, executive→quarterly) are COALESCE defaults, not
CHECKs. Readiness is derived, never stored.

**E1 was smaller than the blueprint implies:** `strata_decisions` already has `snapshot_id`+`forum` and
`strata_actions` already has `decision_id`, so decisions/actions reach a review **through the snapshot** — do NOT add
`review_id` to them. Only `agenda` was genuinely missing.

## ✅ R2 DB-COMPLETE — F1 board packs shipped `a47385508` (`20260717140000`)
`issue_status` (draft→in_review→approved→issued→superseded) · `version`/`supersedes_id`/`issued_by`/`issued_at`/
`approved_by`/`approved_at`/`title`/`sections` · `strata_issue_board_pack` (SoD: approver≠issuer) ·
`strata_supersede_board_pack` (correction = new version; **`snapshot_id` copied, never re-pointed**) ·
**issued packs immutable BY TRIGGER** (UPDATE + DELETE both refused) · **F-3 discharged**:
`strata_board_pack_qualification` derives the qualification from the register and issuance stamps it into the audit
trail. Proven live against **SNAP-1**, a genuinely qualified snapshot.

**F-12 (logged):** §6 said "status +issued, superseded" — but `status` is the **generation** lifecycle
(`pending|generating|ready|failed`) and is in use. The editorial lifecycle got its OWN column instead. Don't "fix"
this back.

## ✅ R3 DB-COMPLETE — shipped `48a05afab` (`20260717150000`)
`strata_data_source_blast_radius` (blocking / migration / **historical**) + `strata_set_data_source_status`
(enforced transitions; retirement gated + reasoned; **suspension deliberately ungated** — you must be able to stop a
bad feed). The four lifecycle STATES already existed; only transitions/checks were missing.
**⚠️ Read the migration header before extending it:** the forward chain (`data_source → runs → calculated_values →
snapshot → pack`) is **expressible and proven to fire**, but yields **0 on real data** — `calculated_values` with BOTH
`snapshot_id` and `source_run_ids` = **0**. The two populations never intersect. Do not "fix" the empty `historical`;
it is correct.

## ✅ R4a SHIPPED — assurance vocabulary + exception governance (`28e2c1bbf`, `20260717160000`) + client realign (`b1481249c`)
**DEBT #1 IS DISCHARGED.** `finance_validated` is **unrepresentable** (D-4 — no Finance role has ever existed in
STRATA; the label claimed an assurance nobody performed). Benefit values now carry the six D-4/E-6 states
(`reported | owner_confirmed | independently_validated | accepted_with_exception | rejected | reversed`).
**F-7 is live and moved ZERO numbers** — 9/9 benefits byte-identical, because `owner_confirmed` had 0 rows; proven to
have teeth (one value → index 0.0000 → 0.4000). Exception governance (reason + authorizer + **no self-authorization**)
is enforced **at the DB**, not just in RPCs. Assurance composition is broken out per state.
**⚠️ The client had to be realigned in a follow-up** — `validateBenefitValue(id,'validated')` now **throws**; the VMO
page has two buttons (Independently validate / Owner confirm) because they are **different claims**. tsc could not see
this break (F-11); grep found it.

## ✅ R4b SHIPPED — E-7 cond.3 (`f0073c9ab`, `20260717170000`). **BOTH LIVE-NUMBERS DEBTS ARE DISCHARGED.**
`pending` actuals no longer count. One eligible-set predicate (`validated | accepted_with_exception`), no fallback
chain. **18/18 byte-identical** (confidence included) — because all 18 actuals were already validated.
**⚠️ My own handover note said "pending actuals EXIST today, so this WILL move live numbers" — it was FALSE.** I wrote
it from memory and never checked. Probed: 18 actuals, ALL validated. **Twelfth stale-claim on this feature; first one
that was mine.** The habit applies to me too.
Proven to have teeth: validated → 83.33/0.900 · pending → **Missing** · quarantined → **Missing** ·
accepted_with_exception → **83.33 COUNTS** at conf 0.540, flagged, reason visible.
**`no_eligible_actual` ≠ `no_actual`** — the response NAMES the ineligible rows, so nobody hunts for data that is there.

## ▶ DO THIS NEXT — updated session 027. (The old R4-remainder list here was STALE: items 1 and 3 had already shipped
## in `3b71bf404` and `08d7044dc` when it was written. Verified against `git log`, not inherited.)

**The UI debt that dominated this feature is largely discharged.** What remains is mostly backend:

1. **Mapping memory (cap 11)** — **no table exists.** The only capability needing a schema from scratch. Needs: source
   identity, source key, target entity/type, confidence, owner, status, effective dates, last-confirmed,
   version/audit. Rules: **suggest-not-assume** · conflicts require human resolution · retired targets are not reused ·
   evidence immutable. **Biggest single item left.**
2. **Reconciliation (cap 12 remainder)** — Matched / New / Conflict / Invalid + both-side diff. `strata_upload_runs`
   already carries `row_count_raw/valid/rejected` for the ledger counts. The reversal half is DONE (027).
3. **Preview-with-data (3) · Version diff (4) · Score-shift preview (5)** — blueprint §2.3: the **inputs already
   exist** (`config_versions`, `config_context` on 7,451 rows, append-only history), so the "old side" needs no build.
   These are smaller than they look.
4. **Threshold band editor (1)** — the revision RPC (`strata_create_threshold_draft_version`) shipped in `81bf2a9f6`;
   only the editor UI is missing. Pure UI slice.
5. **DEF-010 link relaxation (14)** — `strata_link_element_kpi` still requires `approved` (strategic drafts already
   pass). Calc-side exclusion is proven, so this is **the link layer only**.
6. **Owed on 027's work:** a **screenshot pass** (caps 7 · 9 · 10 · 12) — no browser was used; and the follow-ups in
   `12_CAPABILITY_MATRIX.md` → reviews participants/agenda/detail-route, quarantine's active-period-only queue.
7. **F-11b needs a repo-wide ruling** (`09_DECISIONS.md`) — until the 4 parse-error files are fixed or excluded,
   **no tsc config type-checks this repo at all.**

## ⚠️ SUITE BASELINE — corrected, read this before reporting gates
**True baseline: 6 real failures (foreign ChatDock) + 2 LOAD-FLAKY** (`AgeingPanel.navigate`, `registry-drift`) that
**pass in isolation** and time out only under full-suite load on this machine. So a full run legitimately reports
**8 failed / ~2,440 passed**. Step 7's "2,442 / 6" was the lucky run. **Do not chase the 2 flaky ones as regressions,
and do not re-run until green** — check whether the slice touched `src` at all first.
The `revision_class` column is shipped and DB-enforced (A3b), and the calc already returns **Missing** rather than
carrying an old actual forward (proven). **What remains is the UI/reporting side of the F-9 ruling:**
- **material** ⇒ **display a methodology break**; do not imply comparability; never present v1 and v2 as one trend
  without an approved bridge.
- **non_material** ⇒ continuous trend permitted, **with exact provenance**.
- `kpi_revision_class` is already carried in every calculated value's `config_context` **and** in the snapshot's
  `used.kpis[]` — the data a consumer needs is already there. This is a **read/render** slice, not a schema one.

## ⚠️ CARRY-FORWARD DEBT — deliberate, logged, and NOT forgotten
1. **`strata_calc_benefit_realization` still counts ONLY `validation_status='validated'`.** **F-7 rules
   `owner_confirmed` COUNTS** — widening it **WILL move live benefit numbers**. That is **R4 (E-6/F-7)**. The rule is
   now recorded in each benefit value's provenance, so the change will be visible and dated rather than silently
   rewriting what past numbers meant.
2. **`strata_calc_kpi_achievement` falls back to `pending` actuals** (confidence × 0.6). **§2.1's "validated
   whitelist" claim is FALSE.** Quarantined is still excluded, but pending counts today — a gap against E-7 condition
   3. Also **R4 (G1/E-6)**.

### 🔴 F-10 — READ THIS BEFORE TOUCHING ANY CALC (`09_DECISIONS.md` → F-10)
**`effective_from` holds the APPROVAL timestamp, not a business-effective date.** 8 approved KPIs have
`effective_from == approved_at == 2026-07-04 22:56:51` byte-identical, while their calculated values cover periods
ending 2026-03-31…2026-06-30. **Applying the ruling's resolution rule literally would have made 3,210 of 3,212
historical results Missing.** Resolved by **backward extension of the earliest approved version** inside
`strata_resolve_kpi_version` (measured: 3,210 → 0). **Applied and flagged for override.** Any new resolution code MUST
go through the canonical resolver so it inherits this — a hand-rolled `tstzrange @> date` predicate will erase history.

### Blueprint correction from 6a — matters for G1/E-6
**§2.1's "calcs filter `validation_status='validated'` — a WHITELIST" is FALSE.** `strata_calc_kpi_achievement`
prefers validated then **falls back to `pending`** (confidence × 0.6). Quarantined is still excluded (it matches
neither branch), so the conclusion survives — but **pending actuals count today**, a real gap against E-7 condition 3.
Deliberately left for G1/E-6: closing it moves live numbers.

## ▶ AFTER 6c — the F-9 ruling's remaining order
**The ruling's order (steps 1–5 are DONE):**
1. ~~F-1 corrective migration + 3 records~~ ✅ `ce4200274`
2. ~~A3c threshold revision~~ ✅ `81bf2a9f6`
3. ~~KPI lineage schema + backfill~~ ✅ `804d12b16`
4. ~~canonical effective-version resolver~~ ✅ `a5a277a17`
5. ~~A3b KPI draft-version creation~~ ✅ `f72faf352`
6. **← YOU ARE HERE. Wire calculations, objective links, initiative links, model measures, snapshots and provenance
   capture to the canonical resolver.** This is the big one: it touches `strata_calc_kpi_achievement`,
   `strata_calc_scorecard_instance`, `strata_calc_period`, `strata_calc_benefit_realization` and `strata_lock_snapshot`.
   **Everything it needs already exists** — `strata_kpi_effective_at(as_of)` is set-based and joinable precisely so a
   calc never hand-rolls the predicate. Per the ruling, official calculation must record: KPI row id · lineage id ·
   KPI version · formula version · target version · model-measure/config version · effective date/context. That is
   **the same list B1 (§4 config_versions completeness) needs** — do them together, they are one problem.
7. Material/non-material revision behaviour + tests (the `revision_class` column is shipped and DB-enforced; the
   **consumer** behaviour is not: material ⇒ show a methodology break, never carry an old actual forward, never imply
   comparability; **missing eligible actual ⇒ Missing, never a carried-forward value**).
8. Then R2 → R5 per §5. R5 (J DEF-010 · K · L · M · N · O) may run in parallel throughout.
   **DEF-010 is now much smaller than the blueprint thinks** — the resolver already excludes drafts from official
   resolution by construction, and draft *strategic* KPIs already link.

## ✅ F-1 — DISCHARGED (ruled 2026-07-16; register corrected + records filed)
Accountability is the **ROLE**; a named person is optional. Session 026 had read this backwards and modelled
`strategy_office_owner NOT NULL`, which made the register unfillable — it was blocked **by its own schema**, not by a
missing fact. Corrected in `20260716200000`: `owner_role` NOT NULL (default `strategy_office`), `assigned_owner_id`
**nullable** (NULL = "no individual assigned", **not** "unknown"), `status`/`due_on` added beside `resolution`.
**All three records are filed**, `assigned_owner_id` NULL — no person fabricated. Locked snapshots byte-identical.
A latent bug was fixed while doing it: the duplicate guard used a default UNIQUE, which treats NULLs as distinct, so
**model-class records (snapshot NULL) could be filed repeatedly** — now `UNIQUE NULLS NOT DISTINCT`.

## ✅ F-9 — DISCHARGED (ruled: stable logical KPI lineage)
`lineage_id` = stable identity shared by every version; `id` = the version. **Relationships keep their existing
`kpi_id` FK as a lineage ENTRY POINT** (the ruling's sanctioned compatibility design — nothing repointed, no FK
changed, no migration risk) and resolve through `strata_resolve_kpi_effective(kpi_id, as_of)`.
**Facts are never repointed; relationships are never duplicated.** Proven: the same stored v1 id resolves to **v1
historically** and **v2 present-day**; a revision clones the formula (1/1) and clones **zero** actuals/targets/links
while v1's remain intact.

### The canonical resolver — USE IT, never re-implement the predicate
| | |
|---|---|
| `strata_resolve_kpi_effective(kpi_id, as_of)` | from any version's row id (**the relationship entry point**) |
| `strata_resolve_kpi_version(lineage_id, as_of)` | from a lineage |
| `strata_kpi_effective_at(as_of)` → TABLE | **set-based — use this in calculations**, not per-row calls |
| `strata_kpi_current_effective` (view) | the "as of now" case |
**NULL means Missing** — never "fall back to latest", never a draft. `status='approved'` is filtered at this single
point, so no official calc can reach a draft by construction. Overlaps **RAISE** rather than silently picking one.

## F-series: 6 of 8 resolved from the authorization's CONFIRMED PRODUCT RULES (see `09_DECISIONS.md`)
**F-2** clone-as-is then edit in draft · **F-3** qualification surfaces on packs + exports · **F-4** A2→A3 back-to-back
(**done**) · **F-5** pre-existing rows NULL not `now()` (**implemented mechanically in P0-C**) · **F-6** benefit values
get `accepted_with_exception` ONLY, not `quarantined` · **F-7** `owner_confirmed` **COUNTS** (widens
`strata_calc_benefit_realization`'s `='validated'` whitelist — **this changes live numbers**).
**F-8 (new, applied):** `strata_element_kpis` is NOT in the P0 draft-gate — see below.

## ⚠️ BLUEPRINT CORRECTIONS PROVEN THIS SESSION — the blueprint is right about the defect, wrong in these details
1. **§12.2 lists `strata_element_kpis` for the P0 draft-gate. Following it would BREAK EVERY KPI LINK.**
   `strata_link_element_kpi` **requires** `kpi_status='approved'`, so a draft-gate inverts the rule. It also
   contradicts §3.7 (relationship ≠ definition) and E-7. Excluded → **F-8 / DRIFT-10**.
2. **§13.2 is FALSE.** It says the 10 tables that already have `updated_at` "still require" triggers. **They already
   have them** (census verified). E-4's real scope was exactly §13.1's 4 tables.
3. **§13.3 is already satisfied.** `strata_audit_events` **already has `before`/`after` jsonb**, and `strata_audit()`
   already captures old+new+actor+op generically. E-4 needed **one** new function (`strata_touch_updated_by`).
4. **§12.1's precedent cannot be copied verbatim.** `strata_gate_model_stages_write` authorizes on
   `created_by = auth.uid() OR strata_is_admin()`, **not** `strategy_office`. Copy the draft-join SHAPE only.
5. **DEF-010's link layer is PARTIALLY SHIPPED.** `strata_link_element_kpi` already allows draft/pending linking for
   **strategic** KPIs. Staging: 10 approved · 5 draft non-strategic · **1 draft strategic (linkable TODAY)** · 1
   pending. The handover's old "6 draft KPIs, **all unlinkable at creation**" is **FALSE**.
6. **§20 AC-6 was ratified 7/7 OVER the P0 defect** — its fixture was `status:'approved'`, so it asserted that an
   approved model is keyboard-editable. Fixture corrected to draft; criterion untouched; the rule is now pinned by
   `p0-approved-model-immutable.test.tsx`. **DRIFT-11.**

## Environment — unchanged, still true
- **Tests need Node 22:** `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`. Node 20 crashes vitest at startup —
  a VERSION MISMATCH, not a broken suite.
- **`npm run scan:components` FAILS** on Node 20 → `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsx scripts/scan-components.ts`.
  Any new component import breaks `registry-drift` until the map is regenerated. (Not needed this session — no new
  component imports.)
- **`catalyst-staging` (`cyijbdeuehohvhnsywig`) IS the live target** (verified ACTIVE_HEALTHY). `catalyst-prod` is a
  paused SCOPE, not production. No prod migration debt.
- **Migrations: `execute_sql` + an explicit ledger INSERT.** MCP `apply_migration` stamps its own version and breaks
  the file↔ledger 1:1 rule. Ledger tail and file tail verified matching at `20260716190000`.
- **Impersonation idiom for RLS proofs** (this is how every acceptance test above was run):
  `set_config('role','authenticated',true)` + `set_config('request.jwt.claims','{"sub":"<uuid>","role":"authenticated"}',true)`
  inside a `DO $$ … $$` block, ending in `RAISE EXCEPTION` to report results AND roll everything back.
  **Non-admin `strategy_office` on staging: `9537a670-b73e-4905-9835-b68085478cbc`** (`strata_is_admin`=false —
  an admin bypasses the role predicate and makes the result meaningless). Admin SO: `6bbd0863-2736-42e0-aa9b-c98e946c6fd4`.
  **Always include a positive control** — a test that cannot fail proves nothing.

## The habit that keeps paying — now **ELEVEN** times
"Do not inherit a 'can't' (or a 'must') without re-testing it." This session it caught **six** more: §12.2's
element_kpis gate (would have caused a regression) · §13.2's phantom trigger work · §13.3's phantom audit-store work ·
§12.1's precedent predicate · DEF-010's "all unlinkable" · AC-6's defect-encoding fixture. **~40% of what the blueprint
called "build" was already built, and one item it called "fix" would have broken the product.**
**Before writing "X is impossible" — or "X must be done" — into a Plan Lock, run the one query that tests it.**

═══════════════════════════════════════════════════════════════════════════════════════════════════
# ⛔ EVERYTHING BELOW HERE IS PRE-AUTHORIZATION (end of session 025). Its gates are STALE. Kept for the audit trail.
═══════════════════════════════════════════════════════════════════════════════════════════════════

# 🛑 NEW SESSION — READ THIS BLOCK FIRST, THEN STOP AND WAIT FOR VIKRAM'S PROMPT
> **Written 2026-07-16 (end of session 025) specifically to hand over to a fresh chat that will begin the
> backend implementation programme. Vikram will supply the implementation prompt in that chat.**
>
> ## Do this, in order
> 1. Run the mandatory pre-flight: `pwd` · `git branch --show-current` · `git status --short --untracked-files=all` ·
>    `git stash list --max-count=5`.
> 2. Read: **`03_PLAN_LOCK_BACKEND_PROGRAM.md` (the programme blueprint — the main event)** → this handover's
>    `▶ START HERE` block → `09_DECISIONS.md` (D-1…D-8, E-1…E-7, M-D0…M-D4, DEF-010) →
>    `sessions/025_measures-builder-part2b.md`.
> 3. Print: `Recommended Claude conversation title: CAT-STRATA-IMPL-20260712-001 — <short purpose>`.
> 4. Open a new session log: `sessions/026_<purpose>.md`.
> 5. **STOP. Wait for Vikram's prompt. Do not code, do not migrate, do not pick a slice.**
>
> ## ⛔ Gates that are NOT satisfied — implementation is BLOCKED until Vikram clears them
> - **The blueprint is NOT APPROVED.** CLAUDE.md: no code before Plan Lock. Product policy (D-1…D-8, E-1…E-7) is
>   ruled, but the Plan Lock itself has not been approved.
> - **7 decisions are OPEN — F-1…F-7 (blueprint §11). Two are hard blockers:**
>   **F-1** — no Strategy Office owner is named for the integrity-exception records; E-1 mandates the field, so the
>   register cannot be built. **F-4** — the P0 RLS fix freezes children on approved parents, which blocks E-2's v2
>   clone until the revision RPC (A3) exists; A2→A3 must be sequenced back-to-back.
>   **F-7** changes live numbers (does `owner_confirmed` count in benefit realization?).
> - Each capability still needs **its own per-slice Plan Lock**. The blueprint is the programme, not a slice spec.
>
> ## Where the work actually is (this trips people up)
> - **Branch: `strata/measures-2b`** — 5 commits, pushed. **[PR #349](https://github.com/Vikram-Indla/catalyst-prod-45/pull/349) is OPEN and UNMERGED. Do not merge without explicit authorization.**
> - **`strata/impl-phase01` NO LONGER EXISTS** — GitHub Desktop deleted it mid-session after PR #348 merged and
>   switched the checkout to `main`. Any instruction anywhere in this file to push `strata/impl-phase01` is STALE.
> - `main` == `origin/main` == `35c14550b`. Local `main` is clean; do not commit to it.
> - **[[github-desktop-autocommit-hazard]] is LIVE and bit this session** — a commit intended for a feature branch
>   landed on `main` because the branch vanished underneath the session. **Check `git branch --show-current`
>   immediately before every commit, and verify the landed commit with `git log --oneline -1` after.**
>
> ## Environment — read before running anything
> - **Tests need Node 22:** `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`. Global Node 20 crashes vitest at
>   startup — that is a VERSION MISMATCH, not a broken suite. Current: **2,426 passed · 6 failed · 16 skipped**; the
>   6 are pre-existing **foreign ChatDock** failures. **0 are ours.**
> - **`npm run scan:components` FAILS** (`tsx` not on the global Node 20 PATH). Use
>   `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsx scripts/scan-components.ts`. **Any new component import makes
>   `registry-drift` fail until the usage map is regenerated.**
> - **`catalyst-staging` (`cyijbdeuehohvhnsywig`) IS the live target.** `catalyst-prod` is a paused SCOPE, not
>   production. No prod migration debt.
> - **Migrations:** `execute_sql` + an **explicit ledger INSERT** (MCP `apply_migration` stamps its own version and
>   breaks the file↔ledger 1:1 rule).
> - Gates every slice: `npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate` · `npm run lint:cre`
>   · Node-22 tests. UI slices: live-verify light + dark on `localhost:8080` ([[dev-session-expires-mid-verify]]).
>
> ## The one habit that matters here
> **Do not inherit a "can't" without re-testing it.** It has bitten **nine** times on this feature — 5G-2 slug
> routing · vitest · prod-migration debt · DEF-013's premises · `task_70e821ad`'s "schema gap" · F1a's first design ·
> "no measure table" · "no quarantine tier" (the enums existed) · "model draft-create is a new build" (the
> supersession half already works). **Before writing "X is impossible" into a Plan Lock, run the one query that
> tests it.** The blueprint's reuse register (§2) exists because this rule found ~40% of the programme already built.

---

> Resume point. **Phases 0–5 COMPLETE. ✅ PHASE 5 (configuration & system states) COMPLETE — slices 5A–5G merged to `main`.**
> **Phase 5 anchors shipped: 03 (config landing 5A) · 04 (measurement domain + taxonomy 5B) · 05 (model integrity 5C) ·
> 25 (threshold bands 5D) · 26 (data & integration 5E) · 27 (roles & access 5F) · 28 (canonical system states 5G).**
> **⛔ THERE IS NO PHASE 6 — the design pack is FULLY IMPLEMENTED (28/28 anchors).** HANDOFF's build order allocates every
> anchor across Phases 0–5: P1 `01·11·12·13` (4) · P2 `06·16·02·14·15` (5) · P3 `07·17·18·08·22·21` (6) ·
> P4 `10·23·24·09·19·20` (6) · P5 `03·04·05·25·26·27·28` (7) = **28**. An earlier revision of this file said
> "NEXT = Phase 6 per HANDOFF build-order" — that was **WRONG** (corrected 2026-07-16). **No UI phase remains.**
> Everything still open is BACKEND, OPS or optional POLISH — see LIVE DEBT below. Each backend item needs its own
> migration + Plan Lock; do NOT start one expecting a "Phase 6" scope to exist.
>
> ## ▶ START HERE — resume point (2026-07-16, PR #348 merged to `main` @ `77fd5c26a`)
> **Design pack 28/28 anchors · §20 acceptance 7/7 · suite 2,426/2,448 green · map never touched in the entire feature.**
>
> ### ✅ measures builder **part 2b** — DONE (session 025, 2026-07-16). Anchor 05's builder is COMPLETE.
> Built as specced; gates green; live-verified on staging. The measures table went **0 → 2 rows** through the new UI as
> `strategy_office`, which also closed part 2a's only gap (populated rows had been verified by construction only).
> Proven end-to-end: replace-set (2nd save → still 2 rows, not 4) · order_index re-derived from position · draft seeds
> from persisted rows · group verdict flips ✕0→✕60→✓100→✕90 live · **the anchor-05 band renders "✕ Financial measure
> weights total 90 — assign the remaining 10"** (the exact band P5-D3 could not build) · Save blocked at ≠100 with a
> VISIBLE named reason · M-D0 held (direction READ per KPI: "Higher is better" vs "Lower is better") · M-D1 held (exactly
> four aggregation values) · light + dark. Evidence + **4 raised findings**: `sessions/025_measures-builder-part2b.md`.
>
> **✅ BOTH 2b RULINGS ARE IN (Vikram, 2026-07-16) — 2b is CLOSED, nothing outstanding on it.**
> **M-D3 CONFIRMED** — the Save gate treats an EMPTY perspective group as passing (mirrors `ModelIntegrityBand`: one
> rule for one fact). Shipped as built; no code change followed from the ruling. **M-D4 DEFERRED to its own slice.**
>
> ### 🔴 THE ONE THING TO DO NEXT — **R0 / A1: the P0 integrity register.** Blueprint: `03_PLAN_LOCK_BACKEND_PROGRAM.md`
> **Product policy for ALL 14 remaining capabilities was RULED 2026-07-16 (D-1…D-8). The blueprint is written and
> awaiting approval — it is NOT approved and NO code/migration may run.** Read it before anything else.
>
> **🔴 P0 — "approved definitions are immutable" is FALSE today (D-1 CONFIRMED, ahead of the whole programme).**
> Proven at RLS/RPC level, not suspected: `strata_scorecard_models`' own UPDATE RLS gates on `status='draft'`, but
> its CHILDREN do not — `strata_scorecard_model_perspectives` RLS is role-only and never joins the parent's status
> (`strata_strategy_scorecard.sql:266-277`), and `strata_set_model_measures` never reads model status
> (`20260716150000_...sql:62-107`). **An approved model's weights and measures can be rewritten in place, today.**
> This is M-D4 — **pre-existing since 5C, NOT a 2b regression.**
>
> **Integrity audit RESULT (read-only, executed 2026-07-16 — both approved models AND both locked snapshots hit):**
> CEO Enterprise Scorecard (v1, approved 07-04) → 1 perspective_weight written 07-12 · B2B Sector Scorecard (v1) →
> 3 perspective_weights + **2 measures** written after approval. SNAP-1 (locked 07-05) and SNAP-1001 (locked 04-08)
> both stamp "CEO model **v1**" while 1 and 5 child rows were written AFTER lock.
> **Blast radius is PROVENANCE, not values:** `strata_lock_snapshot` freezes `snapshot_items.payload` and
> `calcResult` reads it for locked instances, so **no board-pack or snapshot number silently changed**. But
> re-resolving "CEO model v1" today yields DIFFERENT weights than produced those frozen numbers — so "historical
> scorecards must resolve against the versions used at calculation time" is **not satisfied for either snapshot**.
> **Disclosure:** 2 of the affected rows are ours — part 2b's live verification (PR #349) wrote measures onto an
> approved model *because no gate exists*. The defect demonstrating itself. See blueprint §3.5 / decision E-3.
> **Detection is a LOWER BOUND:** child tables have `created_at` only (no `updated_at`) and the raw `.update()`
> writes no audit event, so **in-place UPDATEs are undetectable** (E-4).
> **Integrity report ACCEPTED; E-1…E-7 RULED (2026-07-16).** **E-1: preserve + annotate both snapshots — do NOT
> restate** (historical child config is not reliably reconstructable); values stay official, provenance is qualified;
> **never modify the locked payload.** **E-3: RETAIN our 2 measure rows** — no in-place "cleaning"; v1 is marked
> integrity-qualified and the measures are included/excluded **deliberately** in a clean v2.
>
> **Second defect — E-2 RULED:** `B2B Sector Scorecard` is `status='approved'` with **`approved_at` NULL** (never
> approved via `strata_approve_record`; any control keyed on `approved_at` silently skips it). **Do NOT backfill or
> infer it.** Classify as legacy/unverified approval provenance → freeze → clone to **v2 Draft** → proper SO approval
> → explicit effective date → **supersede v1 prospectively.**
>
> **P0+ BROADER AUDIT — RESULT (all 9 governed parents × aggregate children, read-only):** the violation set is
> **CONFINED to the scorecard-model aggregate** (3 records). Every other governed aggregate is clean.
> `strata_gate_model_stages` is clean **because its RLS already gates on the parent's draft status** — **the shipped
> precedent the P0 fix must copy, not invent** (all 9 governed PARENTS already gate UPDATE+DELETE on draft; only
> children are exposed: `model_perspectives` ❌ · `model_measures` ❌ · `element_kpis` ❌).
> **`element_kpis` rows created after KPI approval are NOT violations** — post-approval linking is the intended path
> ([[strata-kpi-link-requires-approved]]); relationship ≠ definition. They ARE unaudited, so they are in E-4 scope.
> **The register is a LOWER BOUND, not a census** — absence of a row is NOT evidence of integrity (E-4 §13).
>
> **E-4 census (probed): exactly 4 child tables lack `updated_at`** — `strata_scorecard_model_perspectives` ·
> `strata_scorecard_model_measures` · `strata_element_kpis` · `strata_initiative_kpis`. All four affect official
> results. Reuse `strata_audit_events` + `strata_touch_updated_at()` — do not mint a second audit store.
>
> **⚠️ ORDERING HAZARD (F-4):** the P0 RLS fix freezes children on approved parents, which **blocks E-2's v2 clone
> until the revision RPC (A3/D-2) exists.** A2 → A3 must land back-to-back, or E-2 remediation stalls.
> **7 NEW decisions (F-1…F-7) are open — blueprint §11. F-1 (no Strategy Office owner named for the exception
> records) BLOCKS building the register.**
>
> ### Environment — READ BEFORE RUNNING ANYTHING
> - **Tests need Node 22:** `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`. On the global Node 20 vitest dies at
>   startup (`util.styleText` / `ERR_INVALID_ARG_VALUE`) — that crash is a VERSION MISMATCH, not a broken suite. It hid
>   a 2,414-test suite for the whole implementation. `engines` now pins `>=22`.
> - **`catalyst-prod` is a SCOPE, not production** (INACTIVE/paused, different org). **`catalyst-staging`
>   (`cyijbdeuehohvhnsywig`) IS the live target.** There is no prod migration debt and no prod DDL to fear.
> - Prod token (if ever needed) lives OUTSIDE the repo at `~/.catalyst/supabase-prod.env`; `.gitignore` now covers
>   `.env*`. Never paste a token into chat.
> - Migrations: `execute_sql` + an **explicit ledger INSERT** (MCP `apply_migration` stamps its own version and breaks
>   the file↔ledger 1:1 rule).
>
> ### Shipped this session (all on `main`, all gates-green AND live-verified)
> `task_65642237` fix (`strata_promote_element` → `strata_theme_charters`; it broke **every** theme promotion, not just
> "legacy" as logged) · §20 pass 7/7 · the VERIFICATION pass — session-labelled "Phase 6", which was a verification
> session and **never a UI phase** (vitest unblocked, +34 tests) · **B2** freshness (no migration needed) ·
> **F1a** SoD RPC (`strata_check_role_sod`) closing anchor 27's column · **F2** view-as audit (`strata_log_view_as`) ·
> **measures** table + `strata_set_model_measures` + readers + groups/integrity UI (part 2a).
>
> ### Decisions in force
> **M-D0** a measure is a KPI ASSIGNMENT (assoc table; NO `strata_measures` master; `scorecard_lines` stays
> instance-level) · **M-D1** ONE aggregation vocabulary — `weighted_average|sum|min|custom` (verified byte-identical to
> `rollup_method`) · **M-D2** split the slice · **F1-D1** F1a approved · **F1-D2** CONFLICT deferred (the server never
> refuses a role COMBINATION, so claiming one would assert a check that does not exist).
>
> ### ⚠️ The pattern that bit SIX times this session — do not inherit a "can't" without re-testing it
> 5G-2 slug routing · vitest · prod-migration debt · DEF-013's premises · `task_70e821ad`'s "schema gap" · F1a's own
> first design. **Every one was a true observation with a wrong conclusion, carried forward because nobody re-ran the
> check.** Before you write "X is impossible" into a Plan Lock, run the one query/command that tests it.
>
> ### ✅ Still open — **THIS BLOCK IS AUTHORITATIVE** (supersedes every debt list lower in this file)
> **Position at 2026-07-16: no anchor-critical UI scope remains · 0 unanswered product decisions · 8 optional
> UI-polish items · **14 product capabilities** (≈24 implementation slices), policy-ruled, blueprint written,
> NOT approved.**
>
> **✅ COUNT RATIFIED AT 14 (Vikram, D-8):** 13 previously listed + DEF-010. **Measure-level scorecard authoring has
> SHIPPED (2a `ffb3f8c68` · 2b `96781d601`) and must NOT be counted.** The earlier "13" excluded DEF-010 while it
> was still a product decision; the ruling made it implementation scope.
> **⚠️ 14 capabilities ≠ 24 slices.** A capability is not a slice (2-hour rule → ≈24 slices). **Never report slice
> progress as capability progress.** Decomposition: blueprint §10.
>
> **Policy is RULED for all 14 (D-1…D-8, 2026-07-16). Sequencing, reuse-vs-build, schema/RPC/RLS/UI/test, backfill,
> rollback and acceptance criteria: `03_PLAN_LOCK_BACKEND_PROGRAM.md`. Seven decisions (E-1…E-7) remain open there —
> none may be assumed.** Release order: **R0 P0 integrity → R1 historical truth → R2 adoption/preview →
> R3 governance entities → R4 data integrity → R5 independent.** Critical path A1→A2→A3→B1→C1.
>
> **⚠️ The probe RESIZED several of these — do not trust the old sizing:** "model draft-create" is ONE cloning RPC
> (`strata_approve_record` already auto-supersedes the predecessor when `supersedes_id` is set; the column exists on
> 9+ tables and is **never written**) · "quarantine tier" — exclusion is ALREADY enforced (calcs whitelist
> `validation_status='validated'`) and the enums exist; only workflow + exception label are missing · "version diff"
> and score-shift's "old" side are READS over data already stored (`config_versions` populated 2/2;
> `calculated_values.config_context` on 7,451/7,457 rows) · **mid-period prospective adoption already works**
> (`effective_from = COALESCE(effective_from, now())` in `strata_approve_record`).
>
> **Backend capabilities — each needs its own Plan Lock, and usually a migration.**
> 1. threshold band-editor authoring (P5, anchor 25)
> 2. scorecard-model draft-create (P5)
> 3. preview-with-data (P5)
> 4. version diff (P5)
> 5. server-calculated score-shift impact preview (P5; P5-D2 renders it as a labelled gap, never a number)
> 6. data-source register/retire + dependents-impact check (P5, anchor 26)
> 7. board-pack editorial builder + Issue (P4-D2)
> 8. run downstream blast-radius RPC (P4-D4)
> 9. quarantine validation tier (P4-D3)
> 10. `strata_reviews` scheduling entity (P4-D1 / DRIFT-9)
> 11. mapping-memory write (P4-D6)
> 12. import Matched/Conflict/Unmatched + both-sides diff + 24h undo + run-log ledger (P3-D3 · 3C)
> 13. **M-D4 · approved-model editability — 🔴 NOW P0 (D-1), ahead of the whole programme.** Mechanism RULED:
>     approved definitions are immutable; **editing creates a new draft version** via dedicated revision RPCs (D-2:
>     `strata_create_model_draft_version` / `..._kpi_...` / `..._threshold_...` — NOT one generic polymorphic RPC,
>     NOT a mandatory change-request workflow). Protect the COMPLETE aggregate (perspectives, weights, measures,
>     aggregation, target policies, threshold association) in **RPCs AND at DB/RLS — the UI is not a security
>     boundary.** D-3 extends the same rule to KPIs, replacing "retire and recreate". Integrity register FIRST.
> 14. **DEF-010 · draft KPI → strategic-objective linking** — RULED (D-8/DEF-010): draft KPIs MAY link during
>     authoring · links visibly marked Draft · **excluded from official calculations, health, roll-ups, snapshots,
>     board packs and executive reporting** · links activate on approval · **NO auto-approve** · links preserved
>     through retirement and supersession. Today `strata_link_element_kpi` is gated on `approved` and
>     `strata_kpis.status` defaults `draft` (6 draft KPIs on staging, all unlinkable at creation).
>     **⚠️ Open (E-7): the exclusion mechanism is undecided** — calcs whitelist `validation_status='validated'` on
>     *actuals*, not on KPI status, so a draft KPI's approved actuals could still count. Whether DEF-010 is a
>     link-table change or a calc-engine change turns on this. See `09_DECISIONS.md` → DEF-010.
>
> **Product decisions: NONE outstanding.** ~~DEF-010~~ ✅ RULED 2026-07-16 (now backend initiative 14 above).
> **DEF-013** was ALREADY ruled — parked behind the product-wide multi-tenancy initiative. It is **not** an open
> decision and must not be re-listed as one.
>
> **Tests:** 6 pre-existing ChatDock failures are NOT ours (foreign module, predate this feature). 0 failures are ours.
>
> ### ⚠️ Suite baseline correction (session 025)
> "2,426/2,448 green" was recorded BEFORE `def869232` (B2 freshness) landed. That commit added a
> `StrataFreshnessGlyph` usage without regenerating `usage-map.generated.ts`, so **`registry-drift` was failing on
> `main`** — a 7th failure nobody had attributed. Session 025 regenerated the map, repairing it. Back to 2,426 passed /
> 6 failed (all ChatDock). **`npm run scan:components` FAILS** (`tsx` is not on the global Node 20 PATH) — run
> `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npx tsx scripts/scan-components.ts` instead. Adding any new component
> import to a page makes this test fail until the map is regenerated.

---

> **✅ 5G-2 NOTIFICATION LANDING SHIPPED** (`ceb99e56f`) — the earlier "UUIDs can't build slug routes" blocker was wrong in
> its conclusion: there is no link column, but every entity_table can be hopped id→slug, and the same hop returns the
> resolution state. `governanceApi.resolveNotificationTarget(n)` → `{ key, done }` (kpis→slug · benefit_values→benefit.slug ·
> decisions→snapshot.snapshot_key · dependencies→requesting_id→project_card.slug). The bell lands on the OBJECT with
> `?n=<id>` and falls back to the area landing when `key` is null (one seeded decision is orphaned). `StrataNotificationBand`
> is mounted ONCE in `StrataPageShell` → every object page shows the "why am I here" band; live + expired variants.
> **No Phase-5 UI debt remains.** Anchor 28's panel-scale "object deleted mid-session" variant was never in Phase-5 scope.
>
> ### 🗄️ Phase-5 DEFERRED backend features — **HISTORICAL SNAPSHOT (as written at Phase-5 close, 2026-07-16 early).**
> **⛔ NOT AUTHORITATIVE. SUPERSEDED by the `▶ START HERE` → "Still open" block at the TOP of this file.** Three items
> below shipped the same day this list was written; it is kept for the audit trail, struck through, NOT deleted.
> If this block and the top block disagree, **the top block wins**.
>
> Phase-5 deferrals as recorded then: threshold band-editor authoring · scorecard-model draft-create ·
> ~~model measure-level authoring (no model-measure table exists)~~ **← CLOSED. Both premises were wrong by end of day:
> the table now exists (`strata_scorecard_model_measures`, migration `20260716150000`) and the authoring UI shipped.
> Part 1 `6d30320fc` (table + RPC + reader) · part 2a `ffb3f8c68` (perspective groups + integrity) · part 2b `96781d601`
> (assignment UI, PR #349). Anchor 05's builder is COMPLETE.** · preview-with-data · version diff ·
> data-source register/retire (+ dependents-impact check) · ~~**server SoD-check RPC** (per-assignment
> CLEAN/GUARDED/CONFLICT — deliberately NOT faked)~~ **← CLOSED by F1a `c033fb778` (`strata_check_role_sod`), which
> closed anchor 27's column. NOTE: F1-D2 still defers the CONFLICT verdict specifically — the server never refuses a
> role COMBINATION, so claiming one would assert a check that does not exist. The RPC is shipped; CONFLICT is not
> faked.** · ~~view-as audit-log write~~ **← CLOSED by F2 `cee965731` (`strata_log_view_as`), closing P5-D4's flag** ·
> server-calculated score-shift impact preview.
>
> **Earlier-phase backend deferrals — ALL STILL OPEN, unchanged:** board-pack editorial builder + Issue · run downstream
> blast-radius RPC · quarantine validation tier · `strata_reviews` scheduling entity · mapping-memory write (all P4) ·
> import Matched/Conflict/Unmatched + both-sides diff + 24h undo + run-log ledger (P3 · 3C).
>
> **⚠️ LIVE OPS + VERIFICATION DEBT — STILL OPEN. Do NOT lose: it is duplicated below the `# ARCHIVE` marker, where it
> reads as history. This block is the authoritative copy.**
> 1. ~~**Prod migrations parked**~~ — **DISSOLVED 2026-07-16 (Vikram): `catalyst-prod` is only a SCOPE/placeholder
>    project, NOT a live production system.** There is no production environment to migrate to, so this was never real
>    debt. `20260713100000` (plan-variance) + `20260713110000` (saved-views + bulk-update) are applied to
>    **`catalyst-staging` (`cyijbdeuehohvhnsywig`) — which IS the live target**, so nothing is degraded anywhere.
>    Evidence: Management API reports `catalyst-prod` (`lmqwtldpfacrrlvdnmld`, org `wxrdscstztinvcjdcgka`) =
>    **status INACTIVE / paused**, in a DIFFERENT org from staging (`xtrdfmquqljdkpxyltmn`); `supabase link` refuses with
>    "project is paused". The long-standing note "prod unreachable via the Supabase MCP" was a true observation with the
>    wrong conclusion — the MCP token is staging-scoped AND the project is paused AND it isn't production anyway.
>    **CONSEQUENCE — the "hold backend features until prod access" recommendation is WITHDRAWN.** It rested on avoiding a
>    growing prod-parked migration queue. No prod ⇒ no queue. Backend features ship to staging like everything else.
>    If a real production project is ever stood up, THEN re-apply the full migration ledger to it and re-instate the
>    CONCURRENT SESSIONS / DB-TARGETING hard stop for prod DDL.
> 2. ~~**Backend defect `task_65642237`**~~ — ✅ **CLOSED 2026-07-16 by B1 `d017ffd8b`.** `strata_promote_element`
>    referenced the dropped `strata_play_charters`; repaired to `strata_theme_charters`. **The original entry
>    UNDERSTATED it:** it did not error only "for legacy elements" — it broke **every** theme promotion. Diagnosis
>    corrected at fix time; see the START HERE "Shipped this session" line.
> 3. ~~**`task_70e821ad`**~~ — ✅ **CLOSED 2026-07-16 by B2 `def869232`, with NO migration.** The entry called it a
>    "schema gap" requiring a freshness/staleness column. That was a true observation with a wrong conclusion:
>    freshness is DERIVABLE from the latest run's `completed_at` per `data_source_id` (the same derivation anchor 09
>    already used), so 5E's registry now renders the freshness glyph. No column was ever needed.
>    ⚠️ `def869232` shipped WITHOUT regenerating `usage-map.generated.ts`, which left `registry-drift` failing on
>    `main` until session 025 repaired it — see the Suite baseline correction above.
> 4. ~~**🔴 Vitest cannot run — there is NO unit-test verification for ANY phase.**~~ — ✅ **CLOSED 2026-07-16 by
>    slice 6A `e3fc285f7`.** The claim was FALSE, not merely stale: vitest was never broken. It was a Node-20
>    `util.styleText` startup crash (`ERR_INVALID_ARG_VALUE`) — a VERSION MISMATCH that hid a **2,414-test suite for
>    the entire implementation**. `engines` now pins `>=22`.
>    **Current verified status (session 025, full run on Node 22): 2,426 passed · 6 failed · 16 skipped / 2,448.**
>    The 6 failures are pre-existing ChatDock failures in a FOREIGN module that predate this feature. **0 failures are
>    ours.** Run tests as `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm test`.
> 4b. **§20 ACCEPTANCE — ✅ 7 PASS / 0 NOT VERIFIED / 0 FAIL** (`06_VALIDATION_EVIDENCE.md`; run 2026-07-16,
>    completed in Phase 6). AC-1 five-verb chain · AC-2 CC first-screenful · AC-3 verdict→evidence in **1** interaction
>    w/ "Back to Command Center" · AC-4 grayscale · AC-5 reload-into-dark · **AC-6 keyboard-only — all 4 verbs** ·
>    AC-7 **map preservation** (map last touched 2026-07-09, 3 days BEFORE the feature began, never since; probe =
>    baseline exactly: 18 nodes · Drives/Contributes to/Enables · 5 animated · 4 zoom controls · legend).
>    **AC-6 scope (do not over-read):** weight-change is proven END-TO-END to the real RPC; validate/record/resolve are
>    proven through their canonical modal to the submit boundary — the page's one-line payload→RPC handler and the
>    modal-open trigger are inferred (same ADS Button proven in the weight-change path). 8 tests, 2 files.
> 5. **E2E defects 010 & 013** — partially fixed; remain OPEN pending backend/schema work + QA retest.
>
> **Optional UI polish (non-anchor-critical, all deliberately deferred):** Benefit-Detail 2-col rail (IN-THE-CHAIN +
> Confidence) + attestation timeline (P3 · 3B-1) · objective-hop subline · <1100 small-multiple stacking · committed-spend
> SAR (no field) · Element-Detail OKR restyle + locked band · Evidence Step/Fact restyle (P2) · not-found search box /
> fuzzy best-match / recents (no recents store or search index) · anchor 28 panel-scale "object deleted mid-session".
>
> **New canonical components (reuse these):** `components/StrataSystemStates.tsx` → `StrataNotFound` (names failed route +
> cause + owning-area exit) and `StrataRestricted` (consequence framing + owning role + reader's actual roles).
> `StrataAdminConfigPage` now EXPORTS for reuse: `GovActions` (with `submitBlockedReason`), `GovEnvelope`,
> `GovStatusLozenge`, `ROLE_DOCS`, `ScorecardModelsSection`, `ThresholdsSection`, `KpiTypesSection`,
> `UploadTemplatesSection`, `WorkflowsSection`. New readers: `useAllModelPerspectives`; `StrataProfileRef` now has `email`.
>
> **Domain pages:** `/strata/admin` (landing) · `/strata/admin/measurement` · `/strata/admin/data` · `/strata/admin/access`.
> The legacy 12-tab page stays reachable at `/strata/admin/:section` (transitional, P5-D0); unknown sections now render the
> canonical not-found instead of silently falling to tab 0.
>
> Read order to resume: `00_READ_ME_FIRST` → `01_OBJECTIVE` → **`03_PLAN_LOCK_PHASE5` (APPROVED, `3e215d4ed`)** → this file →
> `08_DRIFT_LOG` → `09_DECISIONS` (P5-D0…D6 CONFIRMED) → `discovery/08_phase5_anchor_specs.md` → `sessions/023_phase5-impl.md`
> (per-slice detail + honest scoping rationale). **Re-read the next slice's anchor in full via DesignSync (parent-only) before coding.**
>
> Phase 5 merges: 5A `4ae22c344` · 5B `18627efca` · 5C `5e4ebc65c` · 5D `56082a288` · 5E `a57670444` · 5F `18bae3c92` ·
> 5G `aedfcb6fd` · **5G-2 `ceb99e56f`**. Branch == origin/branch == origin/main (linear fast-forward). Map byte-untouched
> throughout (verified `git diff 3e215d4ed..HEAD -- StrataStrategyMapPage.tsx` = empty).

---

# ARCHIVE — Phase 4 detail below

## Slice 4B ✅ MERGED `5afac31f8` (anchor 23 Reviews Index)
- Redesigned `StrataReviewsPage` **index branch** (`!isDetail`) to anchor 23: **NOW band** + **Review registry**
  (JiraTable, `StrataLifecycleStepper variant="dots"` 5-stage, derived rows) + **Snapshot registry** (JiraTable,
  supersedes struck-through). Gated the cockpit detail column to `isDetail` (fixed `selected=snapshots[0]` index leak).
- **Derived-review model (P4-D1, honest):** review = current (non-superseded) snapshot keyed by snapshot_key; lifecycle/
  stage/decision-counts/follow-ups derived from snapshots + decisions + actions + board-packs. Cadence subtitle CUT;
  StatStrip dropped (subsumed). Close-period ritual PRESERVED below registries (governed feature; not in anchor 23; no regression).
- New thin hook `useAllBoardPacks` + `governanceApi.boardPacksAll` (plain select, no migration) for the pack-stage dot.
- Gates green (tokens 19799/19799 after off-grid 10px→12px fix); live-verified light+dark; detail branch + map unchanged; no console errors. See session 016.
## Slice 4C-1 ✅ MERGED `70695ddd3` (anchor 10 cockpit context layer)
- Detail branch (`isDetail`) gains: header **review-stage lozenge** + **snapshot identity band** (reused
  `StrataSnapshotBand`, rich ReactNode `basis` w/ derived KPI/benefit/frozen-record counts — no component change) +
  **review lifecycle strip** (`StrataLifecycleStepper variant="full"`, `selectedLifecycle` memo, per-step notes),
  layered above the preserved key-metrics/evidence/decisions/board-pack panels. Corrected a FactChip mislabel
  ("frozen records"→"config versions") the band surfaced. Gates green; light+dark (SNAP-1001 rich + SNAP-1 sparse);
  index branch unbroken; only StrataReviewsPage.tsx touched (map zero-change); no console errors. See session 017.
## ✅ Decision Cockpit (anchor 10) COMPLETE — 4C-1 + 4C-2 + 4C-3 merged. NEXT = 4D (anchor 19).
- **4C-3 compare-with-live** (P4-D5): identity-band "Compare with live" toggle → Snapshot-vs-live panel (client diff of
  frozen KPI value/band vs live `strata_calc_kpi_achievement` over `selected.period_id`; batched `useQueries` gated on the
  toggle; restated = |Δ%|>0.05 or band flip; "Snapshot matches live" when 0). Present-mode + Export-board-pack still → 4G.

## Slice 4C-2 ✅ MERGED `df5475b7c` (anchor 10 decision + actions registers)
- "03 Decisions & actions" → anchor-10 **2-col 7fr/5fr** registers. Decision register: `renderDecision` reworked into
  always-visible cards (status + evidence prose + verdict-record band [status-as-verdict + Recorded by X · date ·
  against SNAP] + evidence tags + preserved authoring; dropped chevron-expand + `expandedDecisionId`). Actions register:
  NEW `renderActionRow` + `snapshotActions` memo (from-decision ancestry + owner + due tone + transitions + follow-up
  footer). Fixed a runtime TDZ (`todayISO` order) caught live. Gates green; light+dark on SNAP-1001; index unbroken;
  only StrataReviewsPage.tsx (map zero-change); no console errors. See session 017.
- **⛔ NEXT — either (a) 4C-3 compare-with-live** (P4-D5: client diff of snapshot_items.payload vs live calc via
  `useKpiAchievement` per-KPI; restatements flagged) + Present-mode/Export-board-pack (→ 4G); **or (b) proceed to 4D**
  Data & Lineage Landing (anchor 19). Cockpit context + registers are DONE; remaining 4C bits are enhancements.
  Re-read the relevant anchor via DesignSync before coding.

## State (as of 2026-07-15 — PHASE 3 COMPLETE; PHASE 4 IN PROGRESS, slice 4A done)
> **⚠️ HISTORICAL — this section is a 2026-07-15 snapshot. Phases 4 AND 5 have since completed (28/28 anchors).
> The branch named below is DEAD. Authoritative state: the `🛑 NEW SESSION` block at the top of this file.**
- **Branch (as of 2026-07-15):** `strata/impl-phase01` — **DELETED 2026-07-16 by GitHub Desktop after PR #348
  merged. Current branch is `strata/measures-2b`.** `origin/main` advancing via fast-forward
  ([[github-noff-merge-push-rejected]] —
  **`StrataStrategyMapPage.tsx` byte-untouched across Phases 3 + 4.**
- **PHASE 3 COMPLETE** (3A · 3B-0 · 3B-1 · 3B-2 `12deb2d15` · 3B-3 `338da9903` · 3C `0a85e8535`).
- **PHASE 4 (governance & data) — Plan Lock APPROVED** `03_PLAN_LOCK_PHASE4.md` (Vikram 2026-07-15; P4-D0…D8 CONFIRMED;
  planning docs merged `918ca5689`). 4 discovery agents done (canonical/route/integration/data-safety). Slice order:
  **4A ✅ → 4B(23) → 4C(10) → 4D(19) → 4E(09) → 4F(20) → 4G(24 scoped)**. Anchor digests: `discovery/07_phase4_anchor_specs.md`.
  - **4A ✅ DONE (component only) — AWAITING commit/merge.** `StrataLifecycleStepper` added to `shared.tsx`
    (`variant='full'` numbered circles + note, anchors 09/20; `variant='dots'` compact, anchors 23/10; states
    done/current/todo/failed, token-pure, a11y per-step). **DRIFT-8:** consumer refactors DEFERRED to redesign
    slices (4E/4F/4B/4C) — no behavior-preserving refactor exists (anchor "current"=warning ≠ existing brand/info;
    DataPipeline stepper is icon-dot/removed by anchor 19). Gates green; live-verified when first consumed. Flagged to Vikram.
  - **⛔ NEXT = 4B (Reviews Index, anchor 23)** — redesign `StrataReviewsPage` index branch (`isDetail=false`): NOW
    band + review registry (derived rows, `StrataLifecycleStepper variant="dots"`, stage lozenge, decisions/follow-up
    counts) + snapshot registry (supersedes struck-through). Cut scheduling/chair/cadence (P4-D1). Reviews are DERIVED
    (no `strata_reviews` table) from snapshots+decisions+actions keyed by snapshot_key. Hooks exist: useSnapshots/
    useDecisions/useActions. Re-read anchor 23 via DesignSync before coding (drift protocol).
- **Phase 4 KEY FACTS (from discovery):** NO splits — StrataReviewsPage branches on `:snapshotKey`, StrataDataPipelinePage
  on `:runKey` (redesign-in-place); only 24 = NEW route `/reviews/:snapshotKey/pack` + `StrataBoardPackPage`. Backend
  gaps (P4-D2/D3/D4): board-pack editorial builder+Issue DEFERRED (file/gen record only); runs 2-way not 3-way;
  downstream dependents backward-derivable only; promote has no reverse RPC. NO migration this phase.
- Phase 5 (config & system-states: 03·04·05·25·26·27·28) — own Plan Lock. See OPEN DEBT below.
- **Phases 0/1/2 COMPLETE + merged** (see history below). **Phase 3 = HANDOFF "delivery & value"** per D-12
  (DRIFT-6 resolved): anchors **17 · 07 · 18 · 08 · 22 · 21**. Plan Lock `03_PLAN_LOCK_PHASE3.md` APPROVED
  (Vikram 2026-07-14; decisions **P3-D1…D8** all CONFIRMED — P3-D3 = scoped-down import on the existing
  dry-run/apply backend, no undo/conflict engine).

### Phase-3 slice status (order per Plan Lock)
| Slice | Anchor / target | Status |
|---|---|---|
| 3A-1a/b | 17 Project Cards List (`StrataExecutionPage`) | ✅ merged — grouped JiraTable (Card·source·↑Objective·Health·Forecast Δ·Benefit-at-stake·Blockers), inline milestone tree-rows, row→detail `?from=` |
| 3A-2a/b | 07 Project Card Detail (`ProjectCardDetailView`) | ✅ merged — strategic-role panel · Health&Forecast · unified "What threatens the forecast" · 360px rail (Details/Source System/Value Contribution) |
| 3B-0 | `StrataValueBar` hero + `multiple` variants (`shared.tsx`) | ✅ merged — additive `variant` prop; default path unchanged |
| 3B-1 | 21 Benefit Detail (`BenefitDetailSection` in `StrataPortfolioVmoPage`) | ✅ merged **(focused)** — verdict band + hero value stages. **DEFERRED:** 2-col rail (IN-THE-CHAIN + Confidence) + attestation-timeline |
| 3B-2 | 08 Portfolio Detail — NEW route `/strata/portfolio/:slug` (`StrataPortfolioDetailPage`) | ✅ **merged to main `12deb2d15` (session 012)**. Leakage hero (`StrataValueBar` hero + grounded verdict) · leakage-sorted benefits JiraTable · gates decision-context list (`decideGate`). P3-D2 client-derived via `useQueries`. No shadow (benefits/:slug + :slug/evidence + index all verified unbroken). Map zero-change. **DEFERRED:** objective-hop subline (kept "via N cards"). **⚠️ MERGE QUIRK:** GitHub rejected the `--no-ff` merge-commit push to main with `remote: fatal error in commit_refs` (no branch-protection/ruleset exists — verified). Fast-forward push of the identical commit (`git push origin <sha>:main`) succeeded. main + branch now BOTH at `12deb2d15` (no merge commit this slice). See [[github-noff-merge-push-rejected]]. |
| 3B-3 | 22 Portfolio Index — repurpose `/strata/portfolio` to a real index | ✅ **merged to main `338da9903` (session 013)**. New `StrataPortfolioIndexView` (leakage-concentration sentence + shared-scale small multiples + ranked-by-leakage JiraTable → row→detail + comparability footer). VMO page → thin **dispatcher** (bare `/portfolio` → index; `?portfolio=`/benefit slug → `StrataPortfolioManageView`, byte-identical). `StrataValueBar` gained additive `scaleOverride?` (default-preserving). No shadow/regression: `?portfolio=` management + `/benefits/:slug` + hero all verified unbroken. Map zero-change. **DEFERRED:** <1100 responsive stacking (small multiples already `auto-fit`); committed-spend SAR (no field). |
| 3C | 18 Import & Reconciliation (`StrataExecutionImportPage`, scoped-down P3-D3) | ✅ **built + gates green (session 014) — AWAITING commit/merge**. Anchor-18 signature onto the honest Excel dry-run/apply backend: DRY RUN `Lozenge` + **`StrataStatStrip`** summary (WILL CREATE/UPDATE/REJECTED/WRITTEN-0) + honest **COMMITMENT** band (idempotent re-import, no 24h undo) + role-gated **Apply**. Per-row `ResultTable`s + upload/classify/map steps unchanged. **NOT built (no backend):** Matched/Conflict/Unmatched, both-sides diff, 24h undo, run-log ledger. **⚠️ Preview-step screenshot NOT captured** — Chrome `file_upload` sandbox rejects synthesized files; verified by tsc+gates+code (canonical components). Map zero-change. |

## ⛔ NEXT = SLICE 3C — Import & Reconciliation (anchor 18), the LAST Phase-3 slice. (3B-2 + 3B-3 done, awaiting commit/merge.)
**No code without re-reading anchor 18 in full via DesignSync first** (drift protocol). Key resume facts:
- **3C is DELIBERATELY scoped-down (P3-D3, Vikram-confirmed):** redesign `StrataExecutionImportPage.tsx` (1015 LOC)
  to the anchor-18 LAYOUT on the EXISTING `importApi.importExecutionBatch` dry-run/apply backend
  (created/updated/rejected). **NO** fabricated Matched/Conflict/Unmatched three-way, **NO** both-sides diff,
  **NO "undo" affordance** — none of that backend exists. Render honestly: DRY RUN header + summary strip
  (`StrataStatStrip`: created/updated/rejected + "nothing written until you apply") + per-row validation table +
  Apply = single commit + honest commitment strip. States: match-run failure SectionMessage+retry (previous
  preserved); partial-apply per-row errors; empty→Config; restricted read-only dry-run (apply disabled, owning
  role named); <1100 stack. If the full reconciliation engine is wanted, 3C becomes its own backend feature (own Plan Lock).
- **Portfolio value spine COMPLETE (3B-0/1/2/3):** `/strata/portfolio` = index (`StrataPortfolioIndexView`, anchor 22);
  `/strata/portfolio/:slug` = detail (`StrataPortfolioDetailPage`, anchor 08); `?portfolio=`/`benefits/:slug` =
  `StrataPortfolioManageView` (the old VMO body). `StrataValueBar` variants all consumed: `hero` (08/21),
  `multiple`+`scaleOverride` (22, shared scale). P3-D2 client-derivation pattern lives in both index + detail.
- **3C (import) scope is DELIBERATELY reduced (P3-D3):** redesign to the anchor LAYOUT on the existing
  `importApi.importExecutionBatch` dry-run/apply (created/updated/rejected) — NO Matched/Conflict/Unmatched
  three-way, NO both-sides diff, **NO "undo" affordance** (none of that backend exists). Render honestly.

## Merge / commit discipline
> **⚠️ CORRECTED 2026-07-16 (session 025). The recipe below named `strata/impl-phase01` — THAT BRANCH NO LONGER
> EXISTS** (GitHub Desktop deleted it after PR #348 merged). Substitute your **current** feature branch everywhere;
> today that is **`strata/measures-2b`**. Never push `main` directly. **Confirm `git branch --show-current` right
> before every commit** — this session had a commit land on `main` because the branch vanished mid-session
> ([[github-desktop-autocommit-hazard]]).

One slice = one commit (explicit files; feature docs alongside; `git add -A` banned). Verify the staged set
with `git diff --cached --name-status` before every commit — `grep '^[MA]'` MISSES renames/deletes
([[git-commit-includes-foreign-staged-renames]]). **Preferred route now: push the feature branch and open a PR**
(as PR #349 did) rather than the worktree merge dance.
Legacy worktree recipe, if a direct merge is ever authorised: `git worktree add <scratchpad>/merge-main main` →
`git merge --no-ff <your-feature-branch>` → symlink node_modules → re-run ALL gates on the merged tree →
`push origin main` → (from the shared checkout) `git merge --ff-only main` + `push origin <your-feature-branch>`
→ remove worktree. **A `--no-ff` merge-commit push to `main` has been REJECTED before** with
`remote: fatal error in commit_refs`; the workaround was a fast-forward push of the identical commit
(`git push origin <sha>:main`) — [[github-noff-merge-push-rejected]].
**LESSON (this session):** never `cd` INTO the worktree persistently — run gates in a `( cd "$WT" && … )`
subshell and remove the worktree from the repo-root cwd, else removing it deletes your cwd (concurrent-session
rule → STOP + re-verify). Gates: `npx tsc --noEmit` · `npm run lint:colors:gate` · `npm run audit:ads:gate`
(baseline 19799) · `npm run lint:cre`. Live-verify every UI slice light + dark on `localhost:8080`.

## Phase 0/1/2 history (reference)
- Phase 0/1 complete (earlier sessions). **Phase 2** (measure & direction) COMPLETE + merged: 2A StrataChainStrip ·
  2B KPI Detail (06) · 2C KPI/OKR Library (16, `da80fdb43`) · 2D Strategy Room (02, `a11d8e8e9`) · 2E Element
  Detail (14, `f1c3a3364`) · 2F Evidence (15, `f4b2b2b6a`). Detail for those slices is in git history + the
  lower sections of this file (below OPEN DEBT).

## ⚠️ OPEN DEBT — **HISTORICAL (Phase-2 era). SUPERSEDED by the LIVE DEBT block at the top of this file.**
> **Kept for provenance ONLY — every numbered item below is now CLOSED or DISSOLVED. Do not treat this section as
> the current picture; the `▶ START HERE` → "Still open" block at the TOP of this file is authoritative.**
> This pointer previously read "Items 1, 2 and 4 below are STILL OPEN" — that was true when written and is now
> FALSE (corrected 2026-07-16, session 025). Closure map:
> - item 1 (prod migrations blocked) → **DISSOLVED** — `catalyst-prod` is a paused SCOPE, not production; staging
>   IS the live target, so there was never a prod queue. See LIVE DEBT item 1 at the top.
> - item 2 (`task_65642237`) → **CLOSED** by B1 `d017ffd8b` (and it broke EVERY theme promotion, not just legacy).
> - item 4 (`task_70e821ad`) → **CLOSED** by B2 `def869232`, with no migration — freshness was derivable all along.
> - item 6 → stale (Phases 4–5 are complete; the design pack is 28/28).
1. **Prod migrations BLOCKED (no prod access this session — tackle later).** `20260713100000`
   (plan-variance, session 004) and `20260713110000` (strata_saved_views + strata_bulk_update_kpis, 2C-2a)
   are applied to **staging (`cyijbdeuehohvhnsywig`) ONLY**; prod (`lmqwtldpfacrrlvdnmld`) is unreachable via
   the Supabase MCP. Apply BOTH on the next prod migration run (link a disposable dir, `execute_sql` +
   explicit ledger INSERT since MCP apply_migration stamps its own version — see CONCURRENT SESSIONS rule).
   Until then: Scorecards-Index "Vs plan" and any bulk/saved-view write error-degrade on prod only.
2. **Backend defect `task_65642237`** — `strata_promote_element` references the dropped `strata_play_charters`
   table and errors for legacy elements ("relation public.strata_play_charters does not exist"). Fix to use
   `strata_theme_charters` (or drop the dead 'play' branch) + committed migration. The Promote UI already
   surfaces the rejection correctly (§17); this is a pre-existing backend bug, not a UI regression.
3. **Deferred Phase-2 nice-to-haves (non-anchor-critical, optional):** Element-Detail OKR anchor-table
   restyle + locked-snapshot band; Evidence exact Step/Fact lineage-table restyle + "differs from live" markers.
4. Spun-off background task `task_70e821ad` — data-source freshness/staleness column (schema gap).
5. **Phase-3 deferred polish (anchor 21, from slice 3B-1):** the 2-col Benefit-Detail restructure with a 360px
   rail (IN-THE-CHAIN links: objective ↑ / delivery ▦ / measured-by ◎ / gate ⚖, + Confidence panel) and
   attestation-history-as-timeline were NOT built — verdict band + hero value stages shipped, other panels
   preserved as-is. Fold into a 3B-1b pass or the 3B-2 portfolio-page restructure.
6. ~~**Phases 4–5 NOT started**~~ — **SUPERSEDED 2026-07-16: Phases 4 AND 5 are both COMPLETE and merged**
   (all 28/28 anchors shipped). This item is Phase-2-era history; see the authoritative block at the top of this file.

### 2E Element Detail (anchor 14) — SPLIT 2E-1/2E-2/2E-3. Page: `StrataStrategyElementDetailPage.tsx`.
- Anchor 14 = 2-col ViewBase: left body [health verdict (LEADS) → StrataChainStrip → Charter (Intent/Scope)
  → OKRs table] + 360px rail [Details field rows + History]. Draft → DRAFT lozenge + "Promote to active"
  (server-validated `strategyApi.promoteElement`, lists requirements). Themes = same shell, theme charter +
  child-objective list replacing OKRs. Restricted read-only; locked snapshot band. Health = derived (P2-D5,
  reuse `healthKeyFor` from 2D-2b — achievement rollup of linked KPIs).
- **DECISION (session 008):** the current rich Theme panels (Execution Summary, Governance, Project Cards,
  Strategy relationships) are NOT in anchor 14 but are PRESERVED in the left body (no regression, same rule
  as DRIFT-4/D-9). Anchor sections layer on TOP.
- **2E-1 DONE** — 2-col grid (left body 1fr + 360px sticky rail). Rail = Details field rows (Type/Lifecycle/
  Owner/Perspective/Parent/Charter) + History (audit). Removed standalone Summary + Audit panels; all other
  panels kept in left body. Gates green; light+dark; objective + theme both verified.
- **2E-2 DONE** — health verdict (derived rollup via useQueries over linked KPIs in the active period,
  worst-band, grounded sentence) LEADS the left body + StrataChainStrip (Theme/Measures/Delivery/Value/
  Decisions, multi-hop: element_kpis, project cards by objective_element_id, benefit↔card, decisions by
  element_id). Gates green; light+dark. NB: useQueries placed BEFORE the early returns (rules of hooks).
- **2E-3 DONE** — Promote-to-active (draft, server-validated + §17 rejection surfaced), Charter INTENT/SCOPE
  prose restyle, responsive rail-fold <1100. Backend defect flagged: `strata_promote_element` references
  dropped `strata_play_charters` for legacy elements (task_65642237). Deferred nice-to-haves: OKR table restyle, locked band.

### 2D Strategy Room (anchor 02) — SPLIT 2D-1/2D-2/2D-3/2D-4. HARD GATE: map component never touched.
- **Anchor 02 re-read in full (session 007).** **MAP BASELINE captured:** `/strata/strategy/map` = 18
  React-Flow nodes · dashed edges (Drives/Contributes/Enables) · 4 zoom controls · legend. RE-PROBE + visual
  diff after EVERY 2D slice; `git status` must show ZERO map-file changes (`StrataStrategyMapPage.tsx` + deps).
- **Decisions:** P2-D5 Health = **derive from linked-measure bands** (no element-health column/RPC exists —
  only stage/status); P2-D4 Narrative = **3-way toggle now, body in 2D-4** (no anchor chrome for Narrative).
- **2D-1 DONE** (`StrataStrategyRoomPage.tsx` only): `ViewToggle` (Structure/Map→navigate-out/Narrative) +
  `ReadinessBand` (4 tiles: measures/owners/execution/draft, client-derived from elements+element_kpis+
  project-cards.objective_element_id) replacing StrataStatStrip. Narrative = placeholder. Existing tree +
  authoring modals PRESERVED. Gates green; live-verified light+dark; map zero-change gate PASSED.
- **2D-2 DONE** (`StrataStrategyRoomPage.tsx` only): hand-rolled `renderNode` → **JiraTable** (flat rows +
  `getRowDepth` indent, NOT `groups` — themes carry column values so a label-header group doesn't fit).
  Columns Element(chevron+chip+name+DRAFT+gap chip)·Owner·KPIs(count, orange 0 gap)·Cards(objective_element_id;
  theme rolls up descendants)·Actions(Promote+menu). Gap chips NO MEASURES/NO OWNER; "Show coverage gaps only"
  toggle (gap rows + ancestors); dropped KPI-coverage + Cause-effect panels (subsumed). Draft = DRAFT lozenge
  (JiraTable has NO per-row style hook, so no dashed accent). Gates green; light+dark; MAP zero-change PASS.
- **2D-2b DONE** — Health column (derived rollup via `useQueries` over linked KPI achievement bands, worst-band;
  Tooltip "derived"; no measures → —) + Benefits column (multi-hop `useBenefitProjectCards` ⋈ card.
  objective_element_id). Column order now Element·Owner·Health·KPIs·Cards·Benefits·Actions; Promote folded into
  the Actions menu (no wide button column). Gates green; light+dark; MAP zero-change PASS. Anchor-02 tree COMPLETE.
- **2D-3 DONE** — 360px inspector rail (2-col grid). Selected element → chip + Open-full-page + name +
  description + `StrataChainStrip` (Theme/Measures/Delivery/Value, real multi-hop) + Owner/Lifecycle/Health/
  Perspective + derived attention callout. Row/name click SELECTS (no nav; nav via "Open full page"); Esc
  closes; <1280 → overlay drawer (`isNarrow` resize listener). No full-row highlight (JiraTable lacks the
  hook — feedback is brand-toned name + rail). Gates green; light+dark; MAP zero-change PASS.
- **2D-4 DONE** — Narrative view = grounded executive prose (`renderNarrative`): per theme a composed
  verdict sentence from real counts + health lozenge + "Open →", then objectives as one-liners with
  measures/cards/benefits + gap warnings. No invented content. Approach approved by Vikram. Gates green;
  light+dark; MAP zero-change PASS. **✅ 2D COMPLETE.**
- 2C-2 split into 2C-2a (backend ✓) · 2C-2b (columns) · 2C-2c (BulkFooterBar) · 2C-2d (saved views + filters).

## ⭐ PHASE 2 — NEXT (START HERE). Plan Lock: `03_PLAN_LOCK_PHASE2.md` (APPROVED, full build)
Phase 2 = measure & direction, 5 REDESIGNS of existing pages. Slice order: **2A ✓ · 2B ✓ · 2C-1 ✓** →
**2C-2 (DO NEXT)** → 2D Strategy Room (SPLIT) → 2E Element Detail → 2F Evidence. Map protection is
structural: `/strata/strategy` is NOT the map (it's `StrataStrategyRoomPage`); the map is a standalone
route; nothing imports the map component — so the Structure view (2D) is a Room-page redesign + a toggle
whose "Map" navigates out.

### DONE + merged (Phase 2)
- **2A** `84fcb57ff` — `StrataChainStrip` in `shared.tsx`. API: `StrataChainStrip({ segments, heading?,
  testId })`; `segments:[{ icon?, label, items:StrataChainLink[], emptyText? }]`;
  `StrataChainLink:{ name, onNav?, meta?, tone?:'default'|'danger' }`. Now mounted on KPI Detail.
- **2B-1** `78f1d9efd` — KPI Detail verdict band + Trend + StrataChainStrip + trust strip. Chain/trust
  sourced from **`useKpiEvidenceChain(kpi.id, activePeriod.id)`** (RPC keys: elements/projects/benefits/
  formula_version/lineage/actual). Scorecards chain segment OMITTED (not in RPC — zero-assumption).
- **2B-2** `98ba2b2d4` — unified "Actuals & validation" table (Period·Actual·Target·Band·Validation·
  Commentary·Lineage; commentary = period-scoped column; orphaned Commentary panel removed); role-gated
  Validate (`VALIDATE_ROLES`, `kpiApi.attestActual`). Anchor-06 COMPLETE.
- **2C-1** `91c0f868e` — KPI Library verdict-first columns (KPI+status · Achievement · Actual/Target ·
  Trend spark · Validation · Owner · Freshness) via per-row achievement + deduped `useKpiActualsLite`
  (`kpiApi.actuals`). Removed dead DirectionCell/ValidatorCell/dataSourceNameById. OKR accordion kept.

### 2C-2 — KPI Library: bulk + saved views + anchor-16 richness (`StrataKpiLibraryPage.tsx`). RE-READ anchor 16 in full at start.
Anchor 16 **COMPLETE** — 2C-2a ✓ · 2C-2b ✓ · 2C-2c ✓ · 2C-2d-1 ✓ · 2C-2d-2 ✓ (all DONE session 007).
- **2C-2d-2 DONE** — Validation filter chip (page-level actuals batch via `useQueries`, deduped w/ cells;
  All/Validated/Pending/Rejected/Quarantined/No data) + **Saved views** ("Saved views ▾" selector, built-in
  "My exceptions" = Band Below-threshold, user views via `strata_saved_views`, Save/Delete). New:
  `kpiApi.savedViews/createSavedView/deleteSavedView`, `useSavedViews`, `StrataSavedView`. Gates green;
  live-verified light+dark incl. real DB insert (Board exceptions) + delete (cleaned up).
- **2C-2d-1 DONE** (`StrataKpiLibraryPage.tsx` only) — page-level achievement batch via `useQueries`
  (deduped with cells); filter toolbar Status·Band·Perspective·Owner (`StrataChipMenu`); Band "Below
  threshold" = appearance ∈ {removed,moved}; worst-first achievement default sort (Achievement col now
  sortable); filter summary bar (Showing N of M — filtered to … · Clear filters · Sorted by …). Gates
  green; live-verified light+dark. NOTE: `useQueries` result array is fresh each render — memo keyed on
  resolved-count string. Spacing tokenized to `var(--ds-space-*)` (audit caught an off-grid 10px).
- **2C-2c DONE** — BulkFooterBar extended additively (`actions`/`note`/`BulkAction`, existing verbs +
  4 consumers untouched); JiraTable `selectable`/`selection` wired → anchor leading checkbox; verbs
  Change owner… · Assign threshold scheme… (gated canAuthor, → `kpiApi.bulkUpdate`/`strata_bulk_update_kpis`)
  · Export (client CSV). Result → SectionMessage banner (honest approved-KPI rejection surfaced, §17).
  New: `kpiApi.bulkUpdate`, `StrataBulkUpdateResult` type. Gates green; live-verified light+dark
  (0 applied/2 not-applied on 2 approved KPIs). Footer full-width overlaps sidebar Configuration label
  (pre-existing canonical BulkFooterBar behavior — not a regression).
- **2C-2b DONE** (`StrataKpiLibraryPage.tsx` only) — columns now match anchor 16 (DRIFT-5): dropped Trend
  spark; split Actual + Target; added Δ (vs prior period, direction-aware arrow+color, grayscale-safe);
  objective-ancestry sub-line "↑ {objective}" (useElementKpis⋈useStrategyElements, objectives-win);
  freshness staleness glyph ●/◐/○ + relative time (absolute on hover); Owner NO-OWNER → "— no owner".
  Gates green; live-verified light+dark. New cell helpers: `KpiValueCell`, `KpiDeltaCell`+`fmtDelta`,
  rewritten `KpiFreshnessCell`. Cell `useKpiActualsLite` feeds Δ+Validation+Freshness (one deduped fetch).
Anchor 16 re-read in FULL session 007 → **DRIFT-5** (anchor has NO trend spark; splits Actual/Target;
adds Δ) **RESOLVED (Vikram): match anchor exactly** — 2C-2b drops trend spark, splits Actual + Target,
adds Δ. Remaining anchor-16 work (Vikram: build everything, nothing deferred):
1. **Governed bulk RPC — ✓ DONE (2C-2a, migration `20260713110000`, staging-applied; prod parked).**
   `strata_bulk_update_kpis(p_kpi_ids uuid[], p_accountable_owner, p_threshold_scheme, p_reason) → jsonb
   {applied,failed,results:[{kpi_id,ok,error?}]}`. **HONEST-LOOP design** (session-007 decision): loops the
   existing `strata_update_kpi`, which REFUSES approved KPIs ("retire and recreate…") — no versioning
   subsystem was built. So the bulk verb applies to draft/pending KPIs; approved rows return the honest
   per-row rejection for BulkFooterBar to surface (§17). Role-gated strategy_office/kpi_owner/admin.
   Also shipped `strata_saved_views` table (per-user, RLS user_id=auth.uid(), NO slug — not URL-nav) for 2C-2d.
   No TS types added yet — add `SavedView` + bulk-result types to `src/modules/strata/types.ts` when 2C-2c/d consume them.
2. **BulkFooterBar** (reuse `src/components/shared/JiraTable/BulkFooterBar.tsx`): JiraTable `selectable`/
   `selection`/`onSelectionChange` + footer verbs **Change owner… · Assign threshold scheme… · Export**.
   Export = client-side CSV of selected (safe). Owner/scheme = the new governed RPC + "routes through
   approval" note. Anchor row has a leading 28px checkbox column.
3. **Saved views (P2-D2):** `strata_saved_views` migration (per-user named filter/column config, entity
   'kpi', jsonb). "Saved views ▾" selector + save/select/delete. Default view "My exceptions" = filtered to
   below-threshold bands. Anchor annotation: "Saved views per user via canonical BasicFilterBar."
4. **Filter enrichment + summary bar + sort:** filter chips **Band (Below+Critical) · Perspective · Owner ·
   Validation** (current page has only search + status). Filter summary bar: "Showing N of M — filtered to
   … · Clear filters · Sorted by achievement, worst first". Default sort = achievement ASC (worst first).
5. **Column refinements (anchor 16):** KPI name cell gets an **objective-ancestry sub-line** ("↑ {objective}"
   — from element_kpis→elements); add a **Δ column** (vs prior period, from actuals); Freshness → **staleness
   glyph** ● (fresh) / ◐ (aging) / ○ (stale >5d, danger) + relative time, not the plain date 2C-1 shipped.
   NO OWNER renders "— no owner" (value, never blank).
6. States: loading skeleton rows; empty → model builder; no-results → summary + clear; <1280 Owner+Freshness
   merge under name; <900 stacked verdict cards.

### 2B — KPI Detail — DONE (kept for reference: current-page wiring)
- Hooks `useKpiBySlug`→`kpi`, `useKpiDetail(kpi.id)`→
  `{formulas,targets,actuals,lineage,calc}`, `useKpiAchievement(kpi.id, activePeriod.id)`→`achievement`
  (`{achievement, score, status_key, actual, target, confidence}`), `commentaryQ` (`kpiApi.commentary`),
  `elementKpisQ`+`elementsQ` (chain: linked objective/theme), `uploadRunsQ` (trust/last-run), `rolesQ`.
  `trendRows` memo (targets⋈actuals per period, sorted) at ~366; `chartData` at ~391. Many governance
  modals (submit/approve KPI, approve formula, attest, edit/new-formula/set-target/submit-actual) —
  KEEP. Roles: `CREATE_ROLES`, `SUBMIT_ROLES` (~45). Render starts ~519.
- **Chain-data sourcing DECISION (resolve at 2B-1 start):** ↑ Objective is available now
  (`elementKpisQ` filtered to this kpi → `elementsQ`). Scorecards/Projects/Benefits linkage for a KPI is
  NOT loaded on the page. Option A: use `useKpiEvidenceChain(kpiId, periodId)` (F-REP-005, returns full
  chain — check its shape first) to populate all 4 segments. Option B: populate ↑ Objective truthfully +
  render honest `emptyText` for segments without loaded data, add wiring incrementally. Recommend A if
  the hook's shape is clean; else B (zero-assumption — never invent links).

### Shipped + merged (sessions 003–004, all live-verified, gates green)
- `16d41e844` **1A-4** CC close-out — whole-page restricted (§17), "Mine" one-click Clear,
  changes-since-snapshot client diff (D-3, "Since the last locked review" Row 3), trend-dot a11y
  (§14: role=link, tabindex, aria-names). Merge `ab93cddd2` (also carried sessions 001–002 work).
- `7c00a061b` **1C-1** Scorecards Index → anchor-12 **card scope-chooser** (full redesign, D-9;
  resolves DRIFT-4): instance cards (64px ring + band + scope + Δ-vs-prior + coverage footnote),
  CEO accent border + first, judgment one-liner, restricted/empty/skeletons/docTitle; Models grid
  DROPPED (Model Builder owns models). NEW `useScorecardCalcs` batch hook. Merge `2e2e3c15a`.
- `03892b726` **1C-2** ranked "Where attention pays" panel (JiraTable). Merge `665d105e4`.
- `ff222cf7f` **1D** Scorecard Detail close-out — ?from= threading (Evidence + line ⓘ; EvidencePage
  got `strataOriginLabel()` prefix resolver → "Back to Scorecard"), role-gated Recalculate
  (RECALC_ROLES = strategy_office/vmo_validator/strata_admin), layout-matched skeletons, whole-page
  restricted, "Partial — N of M lines have data" label, **D-6 dual-mode slug|UUID**
  (`scorecardApi.instanceBySlug` + canonical-slug replace-redirect). Merge `83b9728f2`.
- `b5e99ea6c` **plan-variance backend (D-11, task_e44f1ba9)** — migration `20260713100000`:
  `strata_kpi_plan_achievement` + `strata_calc_scorecard_plan_variance` (read-only, uncapped
  achievement rollup; 100 = on plan; locked → 'locked_snapshot' null; no provenance writes).
  Ranked panel re-based to true "Vs plan" (supersedes D-10 interim). Merge `0b3ab232f`.
- `9a83af9ba` handover refresh (merge `c643fe182`).
- `926cece43` **Scorecard Detail anchor-13 polish** — composed verdict sentence (worst perspective +
  below-target measures linked to KPI evidence w/ ?from=, + Δ-vs-prior), **Contribution column**
  (per-line share of total; Σ = total score, verified 96.5), roll-up mechanics footer; panel
  retitled "Measures by perspective". Fixed a const-TDZ (`refNameFor` used before init) caught in
  live verify (gates were green — screenshots catch what tsc can't). Merge `062bfa741`.
- Earlier (sessions 001–002, on main via `ab93cddd2`): 0A sidebar IA + spine slots + JiraTable
  overflowX · 0B StrataSnapshotBand · 1A-1 ?from= + "n days overdue" · 1A-2 locked snapshot band ·
  1A-3 judgment band · 1A-2b spine scope/freshness + data-trust strip.

## ⚠️ OPERATIONAL — prod migration pending
`supabase/migrations/20260713100000_strata_scorecard_plan_variance.sql` is applied to **staging
(`cyijbdeuehohvhnsywig`) ONLY** — prod (`lmqwtldpfacrrlvdnmld`) is unreachable via the Supabase MCP.
Until applied to prod, the Scorecards Index "Vs plan" column error-degrades there (per-panel banner,
page never blanks). **Apply on the next prod migration run.** Ledger discipline held: staging row
`20260713100000` matches the committed file 1:1 (applied via execute_sql + explicit ledger INSERT,
because MCP apply_migration stamps its own version).

## ⚠️ GIT HAZARD — GitHub Desktop auto-committer STILL ACTIVE ([[github-desktop-autocommit-hazard]])
Not paused in session 004 (Vikram chose "work carefully"). Discipline that worked (zero sweeps):
verify the staged set with `git diff --cached --name-status` before every commit; `git log
--oneline -3` after. **Merge-to-main flow used** (Vikram said "merge and commit" per slice):
temp worktree via `git worktree add <scratchpad>/merge-main main` → `git merge --no-ff` → symlink
node_modules → re-run ALL gates on the merged tree → push → remove worktree. Never `git checkout
main` in the shared checkout.

## Design authority (PARENT-ONLY access)
claude.ai design project `e8a6bad6-1868-4b84-96bf-d6d49474b58a` via **DesignSync** — subagents
CANNOT load it ([[designsync-parent-only]]). Anchors 01/11 read fully in sessions 001–002; **12 and
13 read fully in session 004** (`anchors/12 Scorecards Index.dc.html`, `anchors/13 Scorecard
Detail.dc.html`). Digest in `discovery/00_anchor_specs.md`.

## HARD protections (verify every slice — held through session 004)
- `/strata/strategy/map` (`StrataStrategyMapPage.tsx`) — ZERO change (untouched sessions 003–004).
- Sidebar (`EnterpriseSidebar.tsx`) + top nav — VISUAL FROZEN (untouched sessions 003–004).

## Decisions (09_DECISIONS.md — all CONFIRMED)
D-0 sidebar visual-frozen+IA · D-1 keep StrataPageShell · D-2 defer drawer-first drill (?from=
instead) · D-3 changes-since-snapshot = client diff · D-4 defer LifecycleStepper · D-5 My Work no
CRE chokepoint · D-6 dual-mode slug|UUID (DONE in 1D) · D-7 defer StrataChainStrip to Phase 2 ·
D-8 CC keeps trend chart + AI advisory · **D-9** Scorecards Index = full anchor-12 card redesign
(DONE) · **D-10** interim ranked basis (SUPERSEDED by D-11) · **D-11** vs-plan = uncapped-achievement
rollup RPC (DONE; naive targets-as-actuals rollup proven degenerate — constant 100).
Drift log: DRIFT-1/2 (CC layout, resolved via D-8) · DRIFT-3 (D-3 panel = new full-width row) ·
DRIFT-4 (anchor-12 vs Plan Lock, resolved via D-9).

## NEXT — remaining work (in order of value)
1. **1B My Work** (`/strata/my-work`) — **SKIPPED by Vikram 2026-07-13 ("ignore My Work"), not
   cancelled.** Full spec in `discovery/00_anchor_specs.md` (anchor 11): new page + route before
   catch-all + `strataRoutes.myWork()` + routeRegistry + sidebar item; `useMyWork` aggregator;
   verb groups Validate/Submit/Resolve/Act(+Approve); JiraTable compact + group headers;
   consequence column; Mine/Team; NO CRE chokepoint (D-5). Ask before starting.
2. **Anchor-13 polish — DONE** (`926cece43`). Remaining anchor-13 nice-to-haves NOT built: per-line
   Actual/Target split columns + per-line Δ-vs-Q1 column (needs prior per-line calc matching);
   composition popover per score cell; row-drawer (CatalystViewBase panel mode — D-2 deferred).
3. **Apply migration 20260713100000 to prod** (see OPERATIONAL above).
4. Spun-off background task `task_70e821ad` — data-source freshness/staleness column (schema gap;
   data-trust strip "N stale").
5. **Phase 2 is ACTIVE** — Plan Lock approved (`03_PLAN_LOCK_PHASE2.md`), 2A done; resume at 2B-1 (see
   the ⭐ PHASE 2 — NEXT section at the top). **Phases 3–5 still need their OWN Plan Locks.**

## As-built quick reference
- **Command Center rows:** 1 judgment band · 2 trend (8) + perspective health (4) · 3 "Since the
  last locked review" (D-3 diff vs last locked snapshot in the active cycle, matched by
  perspective_id) · 4 needs-attention inbox (Mine/All + Clear) · 5 AI advisory · 6 data-trust
  strip. Locked mode: StrataSnapshotBand above Row 1 (inside the non-restricted branch).
  Whole-page restricted when `useStrataRoles()` → 0 roles (pattern repeated on Index + Detail).
- **Scorecards Index:** judgment one-liner → instance cards (active period; CEO accent-border
  first, then worst score; cards are presentational — calc via `useScorecardCalcs`) → "Where
  attention pays" JiraTable ranked by vs-plan variance asc (`useScorecardPlanVariances`),
  coverage sub-note, Δ-vs-prior retained.
- **Scorecard Detail:** hero composed verdict (worst perspective + below-target measures as
  `VerdictLink`s to KPI evidence + Δ-vs-prior via prior-period instance calc); "Measures by
  perspective" table with a Contribution column (`contributionByLineId` = persp weight-share × line
  weight-share × line score, Σ = total); roll-up mechanics footer. ?from= via `originPath`;
  RECALC_ROLES gate; DetailSkeleton/LinesSkeleton; partial label keyed on `calc.lines` has_data;
  UUID param → replace-redirect to slug. NB: `refNameFor` MUST stay declared above the verdict
  memos (const TDZ).
- **Conventions learned:** ADS font weight 653 (not 650 — audit gate rejects); `var(--ds-space-*)`
  for new spacing (6px → var(--ds-space-075)); restricted = full-size EmptyState, never bare 403.

## Environment / verification gotchas (unchanged)
- Dev app + Supabase MCP → staging `cyijbdeuehohvhnsywig` ONLY; `execute_sql` takes explicit
  project_id. Re-verify before any write.
- Vitest CANNOT run (rolldown/node toolchain) — verify via tsc + gates + live DOM/screenshots.
- Gates before every commit: `npx tsc --noEmit` · `npm run lint:colors:gate` ·
  `npm run audit:ads:gate` · `npm run lint:cre`.
- Locked-mode UI: CC Period → "Q1 FY2026 · closed" (SNAP-1001). D-6 test URL:
  `/strata/scorecards/a5a1a000-0000-4000-8000-000000001512` → canonicalizes to slug.
- RTK mangles `grep -n` line numbers → `rtk proxy grep`.

## Commit discipline
One slice = one commit; explicit staging only; Vikram approves file list + message; feature folder
committed alongside; after every commit check `git log` for foreign "commit" sweeps; merge to main
via the temp-worktree flow above with gates re-run on the merged tree; push only on Vikram's word.
Co-author trailer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
