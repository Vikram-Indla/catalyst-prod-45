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
