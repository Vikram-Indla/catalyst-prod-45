# 06 — VALIDATION EVIDENCE · CAT-STRATA-IMPL-20260712-001

## §20 ACCEPTANCE PASS — run 2026-07-16 against `main` @ `c6f5a6602`
Criteria per HANDOFF.md "Acceptance (from proposal §20, abbreviated)" — the implementer's contract.
Method: live probes on `localhost:8080` (DOM + computed styles + git), not screenshots-as-proof.

**RESULT: 6 PASS · 1 NOT VERIFIED (tooling limitation, disclosed below). No criterion FAILED.**

| # | Criterion | Verdict | Evidence |
|---|---|---|---|
| AC-1 | Five-verb chain restatable from entry | ✅ PASS | Sidebar IA at entry renders the full task-sequence chain above the fold: **Direction → Measurement → Delivery → Value → Governance** (all 5 matched in the first screenful). |
| AC-2 | Exec answers condition/exceptions/value/trust/decisions from CC first screenful | ✅ PASS | At `scrollY=0`, viewport 890px, all five matched. Composed into one grounded sentence: *"Financial (100) drags the enterprise score, SAR 375K of portfolio value is at risk against plan, and 1 decision is waiting."* — condition=`ENTERPRISE SCORE`/`ON TRACK`; exceptions=`drags the enterprise score`; value=`SAR 375K`; trust=`Server-calculated`+`View evidence`+`Data as of`; decisions=`1 decision is waiting`. |
| AC-3 | ≤3 interactions verdict→evidence, origin preserved | ✅ PASS | **1 interaction** (CC verdict → "View evidence") → `/strata/scorecards/b2b-sector-scorecard-q2-fy2026/evidence?from=%2Fstrata`. `from` param = `/strata`; page renders **"Back to Command Center"** — origin named, not generic. |
| AC-4 | States distinguishable in grayscale | ✅ PASS | `filter: grayscale(1)` applied to `documentElement` on 2 surfaces. Thresholds: **ON TRACK / WATCH / AT RISK** fully legible — each lozenge carries its word; From ≥ / To < numbers carry boundary structure. CC: score ring's `100` + `ON TRACK` words carry the verdict; every delta uses a **▲ glyph** (shape not hue) — `▲12.5`, `▲15.9`, `▲6.9`. Nothing depends on colour. |
| AC-5 | Both themes pass reload-into-dark verification | ✅ PASS | Dark set, then **cold navigation** (full load). Earliest sample already `html.dark` / `bg rgb(24,25,26)` → **no light flash**; stayed dark once settled. All ADS tokens resolve to dark values, none unset: `--ds-surface:#1F1F21` · `--ds-text:#CECFD2` · `--ds-border:#E3E4F21F` · `--ds-surface-sunken:#18191A` · `--ds-background-selected:#1C2B42`. |
| AC-6 | Keyboard-only completion of validate/resolve/record/weight-change | ✅ **PASS — all 4 verbs** (was NOT VERIFIED) | 8 automated tests across 2 files (slices 6B + 6E). weight-change proven **end-to-end to the RPC**; validate/record/resolve proven **through their canonical modal to the submit boundary** — scope stated precisely below. |
| AC-7 | Map passes zero-change preservation diff (screenshot + behavior probe vs baseline) | ✅ PASS | **Git:** `StrataStrategyMapPage.tsx` last modified **2026-07-09 — 3 days BEFORE this feature began (2026-07-12)** and **never touched in any phase** (`git log <feature-first-commit>..HEAD -- <map>` = empty). Byte-diff vs Phase-5 start = empty, incl. all map deps. **Behavior probe vs recorded baseline:** nodes **18/18** ✓ · dashed edges with labels exactly `Drives`·`Contributes to`·`Enables` ✓ · **5 animated** edges (≥85%-confidence animation intact) ✓ · zoom controls **4/4** ✓ · legend + all 3 perspectives ✓ · Theme/Objective toggles + Perspective filter ✓. |

### ⚠️ AC-6 disclosure — why it is NOT VERIFIED (do not read this as a pass)
The Chrome MCP `computer` tool **could not deliver ANY keystroke to the page** in this environment. Proof: with focus
programmatically placed on the weight input (`document.activeElement` = `INPUT[aria-label="Weight for Financial"]`), a real
`type "7"` left the value at `40` — unchanged. `Tab` likewise never moved focus off `BODY` (14 presses, then 3 more after
clicking the page to give it window focus). **Neither Tab nor character keys land.** That is a limitation of my tooling, not
evidence about the application — so claiming AC-6 green would be unfounded.

**Static preconditions that WERE verified (necessary, not sufficient) — weight-change path:**
- All 5 path controls are **native elements** (3× `INPUT`, `Save weights` + `Cancel` as `BUTTON`) → native Enter/Space/typing semantics.
- All are in the tab order (`tabIndex 0`); every weight input carries an `aria-label` ("Weight for Financial", "…Customer & Market", "…Digital & Innovation").
- **0 positive tabindex** anywhere on the page → tab order follows DOM order (unscrambled).
- **0 aria-hidden wrappers containing focusables** → no hidden focus trap.
- 8 unnamed focusables exist but are `SPAN`s with **Tailwind** classes and `inStrataShell:false` → global Catalyst chrome,
  **not STRATA** (STRATA uses ADS tokens + native controls). Pre-existing; outside §20's verb scope.

**Still unaudited even statically:** the other three verbs — **validate** (benefit attestation), **resolve** (blocker),
**record** (decision). AC-6 needs either (a) a harness that delivers real key events, or (b) a human 10-minute manual pass:
Tab to each control, Enter/Space to activate, complete each verb without touching the mouse.

**No mutation occurred during this run.** The weight editor was opened and cancelled; `Financial` remained `40%`; no write
RPC was issued at any point.

---

## AC-6 UPDATE — 2026-07-16 (slice 6B): weight-change CLOSED by automated test
The blocker above was the harness, so **the harness was replaced**. `vitest` was unblocked in 6A (it was a Node version
mismatch, not a broken suite), and `userEvent.tab()` implements real sequential focus navigation — exactly what the
browser tooling could not do.

**`src/modules/strata/__tests__/ac6-keyboard-weight-change.test.tsx` — 2 tests, both passing:**
1. **The verb completes with NO mouse event at all:** Tab → `Edit weights` → **Enter** → Tab → weight input → type `30` →
   Tab → second input → type `45` → Tab → `Save weights` → **Enter** → asserts `setModelPerspectiveWeights` fired once
   with `[{p1:30},{p2:45},{p3:25}]` — i.e. the governed write carries the **keyboard-typed** values.
2. **The blocking integrity rule holds from the keyboard too:** at a total of 70, `Save weights` is disabled, the reason
   is *visible* ("Weights must total 100" — never a silent disable, per anchor 05), and Enter cannot commit.

**A real finding from writing it:** an intermediate failure showed inputs `30,35,25` with Save disabled. That looked like
a component bug — it was **my test's arithmetic** (30+35+25 = 90, not 100). The component was right: it disabled Save and
rendered "Total 90%". Corrected to rebalance two weights (30/45/25 = 100), which also proves Tab traversal *between*
inputs. The diagnostic paid for itself.

## AC-6 FINAL — 2026-07-16 (slice 6E): all four verbs proven ✅
`src/modules/strata/__tests__/ac6-keyboard-decision-verbs.test.tsx` — **6 tests, all passing.**

The canonical-component rule paid off here: the three remaining verbs complete through just **two** shared modals, so
the keyboard contract has two chokepoints rather than three bespoke page flows.

| Verb | Completes through | Wired to |
|---|---|---|
| validate | `StrataDecisionModal` | `StrataPortfolioVmoPage` → `valueApi.validateBenefitValue` |
| record | `StrataFormModal` | `StrataReviewsPage` → `governanceApi.createDecision` |
| resolve | `StrataFormModal` | `ProjectCardDetailView` → `executionApi.updateDependency` |

**validate** (3 tests): Tab to the NON-default verdict → **Enter** to select → Tab to note → type → Tab to Confirm →
**Enter** ⇒ `onConfirm('rejected', '<typed note>')` — verdict *and* note both keyboard-sourced. `requireNote` gates
Confirm until typed, and the requirement is **visible on the field** ("Reason (required)"), not hidden. A server/SoD
rejection renders **verbatim in the modal and does NOT close it** — the reader keeps their context.

**record + resolve** (3 tests): Tab to field → type → Tab to submit → **Enter** ⇒ `onSubmit` fires with the typed
payload (field specs mirror the real call sites). Server rejection likewise surfaces verbatim without closing.

### ⚖️ Scope — precisely what is and isn't proven (do not over-read this PASS)
- **Proven:** every control in each verb's modal is keyboard-reachable and operable with **zero mouse events**, and the
  keyboard-entered payload reaches the submit boundary; rejection paths surface rather than trap.
- **weight-change is stronger:** proven end-to-end — the real `ScorecardModelsSection` renders and the actual
  `setModelPerspectiveWeights` RPC fires with the typed values.
- **Inferred, not executed, for validate/record/resolve:** the page's one-line handler forwarding the payload to the RPC
  (read, not run — rendering three ~1.5k-line pages would test the mocks, not the keyboard), and the modal-**open**
  trigger, which is the same canonical ADS `Button` proven reachable in the weight-change path.

### Standing gaps this pass does NOT close
- ~~vitest cannot run~~ → **RESOLVED in 6A.** The suite runs on Node 22: **964 suites / 2,414 tests, 2,392 passing.**
  6 failures remain, all pre-existing ChatDock (`src/components/chat/dock/`), untouched by this feature.
- The 6 ChatDock failures (foreign module — deliberately not touched).

---

# P0-A · AC-1 (blueprint §8.1) — RAW EVIDENCE
> §8.1: "an approved model rejects a weight write AND a measure write, at the RPC **and** via a direct table write
> (UI is not the boundary)."

## Method — a test that could actually fail
Run as a **real, non-admin `strategy_office` user** (`9537a670-b73e-4905-9835-b68085478cbc`; `strata_is_admin` = false,
verified — an admin would bypass the role predicate and make the result meaningless) via
`set_config('role','authenticated')` + `set_config('request.jwt.claims', …)`. A **positive control** (draft parent, same
identity, same statement) is included so a uniformly-blocking policy cannot masquerade as a pass. Everything is rolled
back by a terminal RAISE — **no staging data was written**.

## Raw output (2026-07-16)
```
ERROR:  P0001: === P0-A RESULT (all changes rolled back) ===
RLS approved-parent child UPDATE : 0 rows (expect 0)
RLS draft-parent  child UPDATE : 1 rows (expect 1 = positive control)
RPC on approved model          : scorecard model is approved — approved definitions are immutable;
                                 create a new draft version to change its measures
```
| §8.1 clause | Result |
|---|---|
| approved model rejects a **weight** write via **direct table write** | ✅ 0 rows |
| approved model rejects a **measure** write via the **RPC** | ✅ raises `check_violation` with a named, honest reason |
| draft model still writable (control — proves the test can fail) | ✅ 1 row |
| staging data mutated by the test | ✅ none — rolled back |

## Policy state after migration (pg_policies)
| table | policy | USING gates draft | WITH CHECK gates draft |
|---|---|---|---|
| `strata_scorecard_model_perspectives` | `..._write` | ✅ true | ✅ true |
| `strata_scorecard_model_measures` | `strata_model_measures_write` | ✅ true | ✅ true |

## Ledger 1:1
`supabase_migrations.schema_migrations` → `20260716160000 · strata_p0_aggregate_immutability`, matching the committed
file `supabase/migrations/20260716160000_strata_p0_aggregate_immutability.sql`. Applied via `execute_sql` + explicit
ledger INSERT (MCP `apply_migration` stamps its own version and breaks the 1:1 rule).

## E-3 preserved
The two verification measure rows on B2B Sector Scorecard are **retained** (measures = 2 before and after). No in-place
cleaning. The migration deletes nothing.

## Gates
`npx tsc --noEmit` → **No errors found** · `lint:colors:gate` → **0 = baseline 0** · `audit:ads:gate` → **no category
above baseline** (tokens 19798/19798, typography 1366/1366, spacing 0/0, fontImports 0/0) · `lint:cre` → **passed** ·
`PATH=node@22 npm test` → **2,430 passed · 6 failed · 16 skipped / 2,452**. The 6 are pre-existing foreign ChatDock
failures (unchanged). Baseline before this slice: 2,426 passed / 6 failed → **+4 tests, 0 new failures.**

---

# A3a · AC §8.2 — RAW EVIDENCE
> §8.2: "draft version has version+1, supersedes_id=<old>, reset approval fields, all children copied;
> **predecessor byte-identical**; strata_approve_record then supersedes it with effective_to — unchanged code."

Source = **B2B Sector Scorecard** (chosen deliberately: it is the only model with BOTH perspectives and measures, so
child copying is actually exercised). Driven as a real non-admin `strategy_office` user through the full governed
lifecycle (create → submit → self-approve attempt → approve as a second SO user). Rolled back — **no staging data written**.

```
=== A3a RESULT (rolled back) ===
version 2 (expect 2) · status draft · supersedes_id ok t
approval reset: approved_at=<NULL> approved_by=<NULL> effective_from=<NULL>
slug b2b-sector-scorecard-2 (source b2b-sector-scorecard)
reason: E-2: clean v2 with reviewed configuration
children copied: perspectives 3/3 · measures 2/2
PREDECESSOR BYTE-IDENTICAL while draft open: t
blank reason  -> a change reason is required to create a new version
dup draft     -> a draft version of this model already exists (6bc1637d-…) — finish or discard it first
revise draft  -> this model is already a draft — edit it directly instead of creating a version
SELF-APPROVE  -> segregation of duties: the creator cannot approve their own record
AFTER APPROVE -> predecessor status=superseded effective_to set=t
```
| §8.2 clause | Result |
|---|---|
| `version + 1` | ✅ 2 |
| `supersedes_id = <old>` | ✅ |
| approval fields reset | ✅ all NULL |
| all children copied | ✅ perspectives 3/3 · measures 2/2 |
| **predecessor byte-identical** | ✅ `to_jsonb(before) = to_jsonb(after)` |
| `strata_approve_record` supersedes it, **unchanged code** | ✅ predecessor → `superseded`, `effective_to` stamped |
| slug contract (UNIQUE, frozen on creation) | ✅ auto-deduped `-2` by the existing trigger |
| SoD inherited, not rebuilt | ✅ self-approval refused |

**Ledger 1:1:** `20260716170000 · strata_create_model_draft_version` ↔ committed file of the same name.

**Gates:** tsc clean · `lint:colors:gate` 0=0 · `audit:ads:gate` no category above baseline · `lint:cre` pass ·
Node-22 suite **2,434 passed · 6 failed · 16 skipped / 2,456** (the 6 = pre-existing foreign ChatDock).

---

# P0-C / E-4 — RAW EVIDENCE
Driven as a real non-admin `strategy_office` user; rolled back — no staging data written.
```
=== P0-C / E-4 RESULT (rolled back) ===
audit events: INSERT=1 UPDATE=1 DELETE=1 (expect 1/1/1)
old weight -> new weight : 40.000 -> 99.000  (old+new value capture)
parent captured in payload (model_id) : t
actor_id captured : t
updated_at stamped on UPDATE : t
updated_by stamped on UPDATE : t
F-5: pre-existing perspective rows with updated_at NULL (expect all legacy rows) : 8
```
| E-4 clause | Result |
|---|---|
| INSERT **and** UPDATE **and** DELETE audited | ✅ 1/1/1 (a DELETE-blind audit cannot tell "never existed" from "removed") |
| old + new values | ✅ 40.000 → 99.000 — **the exact in-place UPDATE that was undetectable before this slice** |
| parent · actor · timestamp · operation | ✅ all four |
| `updated_at` / `updated_by` on UPDATE | ✅ / ✅ |
| **F-5 — no fabricated timestamps** | ✅ 8 legacy rows NULL (5 CEO + 3 B2B perspectives), not `now()` |
| second audit store minted | ✅ none — `strata_audit_events` reused as shipped |

**Ledger 1:1:** `20260716180000 · strata_child_auditability`.
**Gates:** tsc clean · colors 0=0 · audit no category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# P0-D · integrity-exception register — RAW EVIDENCE
Real non-admin `strategy_office` user; rolled back.
```
=== P0-D REGISTER (rolled back) ===
F-1 owner NULL      -> null value in column "strategy_office_owner" violates not-null constraint
shape violation     -> violates check constraint "strata_integrity_exceptions_snapshot_shape"
duplicate record    -> duplicate key value violates unique constraint "strata_integrity_exceptions_unique"
UPDATE (append-only)-> permission denied for table strata_integrity_exceptions
DELETE (append-only)-> permission denied for table strata_integrity_exceptions
detection_is_lower_bound default : t
```
| Guarantee | Result |
|---|---|
| **F-1: an owner-less record is impossible** | ✅ NOT NULL rejects it |
| a model-class record cannot carry a snapshot (and vice versa) | ✅ CHECK rejects |
| re-running the audit cannot duplicate a record | ✅ UNIQUE rejects |
| **append-only — UPDATE denied** | ✅ permission denied |
| **append-only — DELETE denied** | ✅ permission denied |
| lower-bound label mandatory | ✅ NOT NULL DEFAULT true |

**Ledger 1:1:** `20260716190000 · strata_integrity_exceptions`. **Gates:** tsc clean · colors 0=0 · audit no category
above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# P0-D2 · F-1 correction — RAW EVIDENCE
```
=== F-1 CORRECTION (rolled back) ===
records filed            : 3
UPDATE  (append-only)    -> permission denied for table strata_integrity_exceptions
DELETE  (append-only)    -> permission denied for table strata_integrity_exceptions
dup model-class (NULL snap) -> duplicate key value violates unique constraint "strata_integrity_exceptions_unique"
bad owner_role           -> violates check constraint "strata_integrity_exceptions_owner_role_check"
LOCKED SNAPSHOTS BYTE-IDENTICAL : t
assigned_owner_id all NULL (no person fabricated) : t
```
| Ruling clause | Result |
|---|---|
| three records filed with `owner_role='strategy_office'`, no individual | ✅ 3 rows, `assigned_owner_id` all NULL |
| **do not fabricate a person** | ✅ |
| append-only retained through the restructure | ✅ UPDATE + DELETE both denied |
| status / due-date / resolution retained | ✅ (`status` open · `due_on` nullable · `resolution` unchanged) |
| owner_role constrained to the supported vocabulary | ✅ `chief_vibes_officer` rejected |
| duplicate guard now covers NULL-snapshot records | ✅ rejected (it did not before — P0-D bug, fixed here) |
| **locked snapshots untouched** | ✅ byte-identical (`jsonb_agg(to_jsonb(s))` compare) |

**Ledger 1:1:** `20260716200000 · strata_integrity_exceptions_owner_role`.
**Gates:** tsc clean · colors 0=0 · audit no category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# A3c · AC §8.2 — RAW EVIDENCE
Real non-admin `strategy_office` user, full governed lifecycle, rolled back.
```
=== A3c RESULT (rolled back) ===
version 2 (expect 2) · status draft · supersedes ok t
approval reset: approved_at=<NULL> approved_by=<NULL> effective_from=<NULL>
slug salam-standard-rag-2 (source salam-standard-rag)
FULL DEFINITION COPIED — bands identical t: tolerance 5.000 conf 0.700 escalation <NULL>
reason: raise the green band to 90
PREDECESSOR BYTE-IDENTICAL while draft open: t
blank reason -> a change reason is required to create a new version
dup draft    -> a draft version of this threshold scheme already exists (eb157b0b-…)
SELF-APPROVE -> segregation of duties: the creator cannot approve their own record
AFTER APPROVE -> predecessor status=superseded effective_to set=t
```
| §8.2 clause | Result |
|---|---|
| version+1 · supersedes_id · approval reset | ✅ |
| **complete definition cloned** | ✅ bands **byte-identical** · tolerance 5.000 · confidence 0.700 · escalation NULL |
| **predecessor byte-identical** | ✅ |
| approve → predecessor superseded + effective_to (unchanged code) | ✅ |
| slug contract | ✅ `salam-standard-rag-2` |
| SoD inherited | ✅ self-approval refused |

**Ledger 1:1:** `20260716210000 · strata_create_threshold_draft_version`. **Gates:** tsc clean · colors 0=0 · audit no
category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# A3b-1 · KPI lineage — RAW EVIDENCE
**Row-ID preservation (the ruling's first test):**
```
before : id_set=e7928cf9548900b1606277825b8b2ac0  full=5e226ea9b071d2d4b7e0af6ef2529e62  n=17
after  : id_set=e7928cf9548900b1606277825b8b2ac0  full=5e226ea9b071d2d4b7e0af6ef2529e62  n=17
         lineages=17  null_lineage=0
```
**Constraints (rolled back):**
```
=== KPI LINEAGE (rolled back) ===
chain v1<-v2<-v3 : 1 root(s), 3 rows (expect 1 root, 3 rows)
UNIQUE(lineage,version) dup -> duplicate key value violates unique constraint "strata_kpis_lineage_version_unique"
EXCLUDE overlapping approved -> conflicting key value violates exclusion constraint "strata_kpis_no_overlapping_effective"
ADJACENT approved versions -> ALLOWED (correct)
```
| Ruling test | Result |
|---|---|
| **existing KPI IDs remain unchanged** | ✅ checksums byte-identical |
| **existing supersession chains receive one lineage** | ✅ 1 root over `v1←v2←v3` (no real chains exist — 0 `supersedes_id` on staging — so proven against a simulated chain) |
| uniqueness on (lineage_id, version) | ✅ rejected |
| **no overlapping effective approved versions** | ✅ rejected, declaratively (EXCLUDE, race-free) |
| adjacent approved versions still permitted (control) | ✅ ALLOWED |
| every row backfilled | ✅ 17 lineages / 17 KPIs, 0 NULL |

**Ledger 1:1:** `20260716220000 · strata_kpi_lineage`. **Gates:** tsc clean · colors 0=0 · audit no category above
baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# A3b-2 · resolver — RAW EVIDENCE (rolled back)
Fixture: lineage L with v1 approved `[2026-01-01, 2026-07-01)`, v2 approved `[2026-07-01, ∞)`, v3 draft.
A relationship stores **v1's id** (the compatibility design), and every lookup below goes through it.
```
=== RESOLVER (rolled back) ===
HISTORICAL 2026-03-01 via v1 id -> ef8ce6da… (expect v1: ef8ce6da…)
PRESENT    2026-07-16 via v1 id -> e18e3cfa… (expect v2: e18e3cfa…)
BEFORE ANY VERSION 2025-01-01   -> <NULL> (expect NULL = Missing)
DRAFT-ONLY lineage              -> <NULL> (expect NULL — drafts NEVER resolve)
UNKNOWN kpi id                  -> <NULL> (expect NULL)
boundary: v2 effective_from is INCLUSIVE at 2026-07-01 -> t (expect v2)
set-based strata_kpi_effective_at(2026-03-01) picks v1 -> t
```
| Ruling test | Result |
|---|---|
| **present-day relationships resolve v2 after its effective date** | ✅ same stored v1 id → v2 |
| **historical views still resolve v1** | ✅ |
| **draft and pending versions never enter official calculations** | ✅ NULL at the single resolution point |
| no effective version ⇒ Missing, never a substitute | ✅ NULL |
| set-based and scalar resolvers agree | ✅ |

**Ledger 1:1:** `20260716230000 · strata_kpi_effective_resolver`. **Gates:** tsc clean · colors 0=0 · audit no
category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# A3b · KPI revision — RAW EVIDENCE (rolled back)
Fixture: v1 approved with a formula (definition) **and** an actual, a target and an objective link (facts +
relationship) — so the clone boundary is actually exercised rather than asserted.
```
=== A3b (rolled back) ===
lineage retained t · version 2 (expect 2) · supersedes ok t · class material
approval reset: approved_at=<NULL> effective_from=<NULL>
DEFINITION CLONED : formula rows 1/1 (expect 1/1)
FACTS NOT CLONED  : actuals 0 · targets 0 · element links 0 (expect 0/0/0)
v1 facts intact   : actuals 1/1 · links 1/1 (never repointed)
PREDECESSOR BYTE-IDENTICAL : t
missing class -> a revision class is required: non_material … or material …
blank reason  -> a change reason is required to create a new version
dup draft     -> a draft version of this KPI already exists (18e521e9-…)
unclassified revision via direct INSERT -> violates check constraint "strata_kpis_revision_class_required"
draft v2 does NOT resolve (still v1) : t
```
| Ruling test | Result |
|---|---|
| new version retains lineage and increments version | ✅ |
| **predecessor remains byte-identical** | ✅ |
| **formula definitions clone** | ✅ 1/1 |
| **facts do not clone** | ✅ actuals 0 · targets 0 · links 0, and v1's remain 1/1 |
| draft/pending versions never enter official calculations | ✅ draft v2 does not resolve |
| revision classification required | ✅ rejected in the RPC **and** by DB CHECK on direct INSERT |

**Ledger 1:1:** `20260716240000 · strata_create_kpi_draft_version`. **Gates:** tsc clean · colors 0=0 · audit no
category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# Step 6a — RAW EVIDENCE

## 1. Zero numbers moved (the test that had to pass)
Every kpi×period with a real actual+target, computed before and after the migration, rolled back both times:
```
BEFORE                                    AFTER
B2B Revenue Growth | 2026-03-31 | 77.50/77.50/amber      (identical)
B2B Revenue Growth | 2026-06-30 | 111.25/100.00/green    (identical)
Churn Rate         | 2026-03-31 | 83.33/83.33/amber      (identical)
Churn Rate         | 2026-06-30 | 105.26/100.00/green    (identical)
CO2 Reduction      | 2026-03-31 | 75.00/75.00/amber      (identical)
CO2 Reduction      | 2026-06-30 | 91.67/91.67/green      (identical)
Cost to Serve      | 2026-03-31 | 94.06/94.06/green      (identical)
Cost to Serve      | 2026-06-30 | 97.94/97.94/green      (identical)
Digital Rev Share  | 2026-03-31 | 88.57/88.57/green      (identical)
Digital Rev Share  | 2026-06-30 | 102.86/100.00/green    (identical)
Employee Engagement| 2026-03-31 | 94.67/94.67/green      (identical)
Employee Engagement| 2026-06-30 | 98.67/98.67/green      (identical)
Enterprise Rev (proof) | 2027-03-31 | 83.33/83.33/-      (identical)
Net Promoter Score | 2026-03-31 | 93.55/93.55/green      (identical)
Net Promoter Score | 2026-06-30 | 101.61/100.00/green    (identical)
Network Availability|2026-03-31 | 100.00/100.00/green    (identical)
Network Availability|2026-06-30 | 66.67/66.67/amber      (identical)
```
**18/18 byte-identical.**

## 2. F-10 erasure risk, measured before and after
```
before F-10 : resolve_to_same=2     WOULD_BECOME_MISSING=3210   would_switch_version=0
after  F-10 : resolve_to_same=3212  would_become_missing=0
```

## 3. Provenance + the ruling's behavioural tests (rolled back)
```
PROVENANCE keys present: lineage=t version=1 formula_v=1 target_v=1 scheme_v=1 resolved_as_of=t requested=t

=== MATERIAL REVISION ===
HISTORICAL period (ends 2026-03-31): resolved=v1  achievement=90.00
  -> v1 was effective then; its own actual is used. Trend preserved.
CURRENT period (ends 2026-06-30): resolved=v2  achievement=<NULL> reason=no_actual
  -> v2 effective, NO actual of its own; v1 HAS one (90).
  -> Carried forward? no — correct

DRAFT-only KPI with a VALIDATED actual -> achievement=<NULL> reason=no_effective_kpi_version
```
| Ruling test | Result |
|---|---|
| **material revision without a new actual ⇒ Missing, not a carried-forward value** | ✅ NULL, not 90 |
| **non_material continuity retains exact provenance** | ✅ historical period still resolves v1 and uses v1's actual; full provenance recorded |
| **draft/pending versions never enter official calculations** | ✅ `no_effective_kpi_version` — enforced in its own right, not via the actual's status |
| official calculation records the full version context | ✅ all required identifiers present, incl. **threshold_scheme_version** |
| locked snapshots unchanged | ✅ untouched — they read frozen payloads |

**Ledger 1:1:** `20260717100000 · strata_calc_lineage_provenance`. **Gates:** tsc clean · colors 0=0 · audit no
category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# Step 6b · B1 snapshot completeness — RAW EVIDENCE

## §8.3 — existing locked snapshots byte-identical
```
before : md5(all locked snapshots) = 128b14afc429bc18ad5dc14563edf3d3  (n=2)
after  : md5(all locked snapshots) = 128b14afc429bc18ad5dc14563edf3d3
```

## A NEW snapshot's config_versions (rolled back)
```
selection_semantics : used_only: derived from the config_context frozen on each item
used.kpis 8 · formula_versions 8 · targets 8 · model_measures 2
used.threshold_schemes (deduped, versioned) : [{"id": "a5a1a000-…-201", "version": "1"}]
used.resolved_as_of : 2026-06-30T00:00:00+00:00
provenance_completeness : {"items_with_full_provenance": 8, "items_without_full_provenance": 20,
                           "note": "LOWER BOUND: … a calc not yet wired to the canonical resolver (step 6c) …"}
draft_kpi_exclusion : {"rule": "only KPI versions approved AND effective at the period end contribute (E-7/DEF-010)",
                       "kpis_excluded_with_actuals": 0}
sample kpi : {"id": "…1201", "version": "1", "lineage_id": "108e4375-…", "revision_class": null}
```
| §4 requirement | Result |
|---|---|
| KPIs — id+version | ✅ + **lineage_id** + revision_class |
| KPI formula versions | ✅ 8 |
| Model measures | ✅ 2 |
| Threshold schemes — **with version** (the §3 gap) | ✅ deduped, versioned |
| Selection semantics: stamp the configs **USED**, not all approved | ✅ `used_only`, derived from frozen provenance |
| Draft-KPI exclusion recorded so it is provable | ✅ rule + count excluded |
| **Existing locked snapshots never rewritten** | ✅ checksum identical |
| honest about what it does NOT know | ✅ `provenance_completeness` declares the lower bound |

**Ledger 1:1:** `20260717110000 · strata_snapshot_config_completeness`. **Gates:** tsc clean · colors 0=0 · audit no
category above baseline · CRE pass · suite **2,434 passed / 6 failed**.

---

# Step 6c — RAW EVIDENCE

## 1. Zero numbers moved
```
BASELINE                                          AFTER
B2B Sector Scorecard · Q2 FY2026 | 100.00/true/green      (identical)
CEO Scorecard · Q2 FY2026        | 96.54/true/green       (identical)
BENEFIT AUM growth …             | 0.0000/true            (identical)
BENEFIT B2B Revenue Uplift       | 0.8625/true            (identical)
BENEFIT Churn Reduction Value    | 0.7889/true            (identical)
BENEFIT Cost-to-Serve Reduction  | 0.9571/true            (identical)
BENEFIT Enterprise Rev (proof)   | 0.0000/false           (identical)
BENEFIT Operations cost reduction| 0.0000/true            (identical)
BENEFIT Regulatory penalty …     | 0.0000/true            (identical)
BENEFIT ZZTEST-QA-CRUD-Benefit   | 0.0000/false           (identical)
BENEFIT ZZTEST-QA-Portfolio      | 0.0000/true            (identical)
```
**11/11 byte-identical.**

## 2. Provenance completeness — the metric 6b created, now closed
Driven end-to-end: `strata_calc_period(period)` then `strata_lock_snapshot(...)`. Rolled back.
```
=== 6c COMPLETENESS (rolled back) ===
provenance_completeness : {"items_with_full_provenance": 42, "items_without_full_provenance": 1,
                           "note": "LOWER BOUND: some frozen items predate full provenance capture…"}
by entity_type:
  kpi:                20/20 have provenance
  perspective:         8/9  have provenance
  scorecard_instance:  2/2  have provenance
  scorecard_line:     12/12 have provenance
used.kpis 8 · formula 8 · targets 8 · schemes 1 · measures 2
draft_kpi_exclusion : {"rule": "only KPI versions approved AND effective at the period end contribute (E-7/DEF-010)",
                       "kpis_excluded_with_actuals": 0}
```
**8 → 42 with provenance; 20 → 1 without.** The remaining 1 is **stale data, not an unwired calc**: the two live
instances' models have 5 + 3 = 8 perspectives, so every perspective actually calculated is covered. The metric
correctly still reports LOWER BOUND rather than claiming a census.

**Ledger 1:1:** `20260717120000 · strata_calc_provenance_remaining`. **Gates:** tsc clean · colors 0=0 · audit no
category above baseline · CRE pass · suite **2,434 passed / 6 failed**.
