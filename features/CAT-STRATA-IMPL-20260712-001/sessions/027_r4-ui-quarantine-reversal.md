# Session 027 — R4 UI: quarantine resolution + import reversal

**Date:** 2026-07-17 · **Branch:** `strata/measures-2b` · **Entry commit:** `f3331ae4a` (clean tree)
**Feature Work ID:** CAT-STRATA-IMPL-20260712-001

## Rehydration (probed, not inherited)

| | |
|---|---|
| Start sequence | cwd = `catalyst-prod-46` · branch `strata/measures-2b` · **working tree clean** · 4 stashes (all foreign, untouched) |
| Feature folder | **in-repo, git-tracked**: `features/CAT-STRATA-IMPL-20260712-001/`. The sibling hit at `catalyst-prod-45-strata-impl-phase01/` is a separate clone, **not** a worktree of this repo (`git worktree list` confirms). Canonical = the in-repo one. |
| Plan Lock | `03_PLAN_LOCK_BACKEND_PROGRAM.md` — **APPROVED**, continuous execution authorized (Vikram 2026-07-16, `09_DECISIONS.md:290`): *"authorized for all dependency-ordered releases and all 14 product capabilities."* Stop only for a hard blocker. PR #349 stays open/unmerged. |
| Open blockers | **None.** F-1 and F-9 both discharged. |

## Two stale artifacts found on entry — corrected, not inherited

1. **`12_CAPABILITY_MATRIX.md` says 2/14 Complete. It is stale.** Commit `f3331ae4a` (R3 UI, shipped after the matrix
   was written) took **capabilities 6 and 8 to Complete**. True count on entry: **4/14 Complete**. The matrix and the
   `07_HANDOVER.md` banner both still say 2/14 — neither was updated by that commit.
2. **`07_HANDOVER.md` → "DO THIS NEXT — R4 remainder" is stale.** It lists the quarantine RPC (D-5) and 24h reversal
   (D-7/E-5) as next; **both shipped** — `3b71bf404` and `08d7044dc` respectively.

This is the thirteenth stale-claim on this feature. The pattern holds: **the handover's forward-looking blocks decay
one commit after they are written.** Probed the commit log rather than trusting them.

## Probe: does "no screens" actually hold?

`StrataReviewsPage.tsx` (81K) and `StrataBoardPackPage.tsx` (18K) **exist** — so the matrix's flat *"none — no screens"*
looked wrong. Probed the client for every new RPC instead of assuming either way:

| RPC | referenced in `src/`? |
|---|---|
| `strata_schedule_review` · `strata_update_review` · `strata_review_readiness` | **no** |
| `strata_issue_board_pack` · `strata_supersede_board_pack` · `strata_board_pack_qualification` | **no** |
| `strata_resolve_quarantine` | **no** |
| `strata_reverse_run` · `strata_run_reversal_eligibility` | **no** |
| `strata_data_source_blast_radius` | **yes** — `types.ts`, `StrataDataIntegrationPage.tsx`, `domain/index.ts` (R3 UI) |

**Conclusion: the matrix is right in substance, wrong in wording.** The pages exist but run on the *older* data paths;
**not one R2/R4 RPC has a client reference.** The gap is wiring, not greenfield pages. Recorded so the next session
doesn't re-litigate this: *"page exists"* ≠ *"capability reachable"*.

## Slice selected — R4 UI (caps 9 + 12)

Dependency-safe and adjacent to the just-shipped R3 UI (same data/import page family, same domain module).
Existing surface probed: `StrataDataPipelinePage.tsx` already models `quarantined` as a run state and a verdict option
(`:45`, `:54`, `:814`), and `needsResolution()` (`:52`) already computes the queue predicate — so this extends a
shipped pattern rather than inventing one.

## Scope change mid-session (user directive)

Vikram, this session: *"finish the implementation of all the pending items … 30 mins … focus on build and wire,
review is the LAST activity."* I stated up front that 30 minutes would not cover all ten — mapping memory (11) needs a
new table + migration + staging application, and reconciliation's 3-way match is a real build — and committed to
reporting truthfully rather than fabricating completions. Slice widened from R4-UI to **all five backend-only wiring
jobs** (caps 7 · 9 · 10 · 12-reversal), executed via parallel subagents.

## What shipped

| Cap | Surface | Agent | Tests |
|---|---|---|---|
| 9 quarantine resolution | `StrataDataPipelinePage` → `QuarantineQueueSection` | A | 19 |
| 12 reversal (half) | `StrataDataPipelinePage` → `RunReversalSection` | A | (incl.) |
| 10 reviews scheduling | `StrataReviewsPage` → `ScheduledReviewsSection` | B | 19 |
| 7 board packs | `StrataBoardPackPage` → `PackVersionsSection` | C | 16+ |

**Shared layer written by me, not the agents** (`types.ts`, `domain/index.ts`) — deliberately, so three concurrent
agents could not collide on the same file. Agents were forbidden from touching either and told to report rather than
edit if they needed a change. All three complied; agent C's report is what surfaced F-13.

## F-13 — the backend was NOT complete, contrary to the matrix

Agent C reported it could not wire Issue: nothing moves a pack `draft → approved`, and it **refused to invent a flow**.
Probed staging: **3 packs, 0 approved** — Issue was provably unreachable *at the DB*. The matrix's "backend ✅ / UI ❌"
for cap 7 was **too generous**; the lifecycle had a state with no entry verb.

**The security substance:** this could not be a client UPDATE. `strata_board_packs_write` is
`FOR ALL USING (strata_has_role(['strategy_office']))`, so a client could set `approved_by` to **any uuid** — and
`strata_issue_board_pack`'s whole SoD control is `approved_by <> auth.uid()`. A spoofable `approved_by` **defeats SoD
entirely**. Shipped `strata_approve_board_pack` (SECURITY DEFINER, stamps `auth.uid()`, no actor parameter).
Full reasoning: `09_DECISIONS.md` → F-13.

## F-11b — tsc has NEVER checked STRATA, with either config

Found incidentally: `StrataBlastRadius` is used at `domain/index.ts:1037`/`:1044` and **is not imported** — shipped that
way in `f3331ae4a`, which reported "tsc 0 errors under src/modules/strata". A missing import is TS2304; tsc said
nothing. Proved with F-11's own method: injected `const __probe: number = "definitely a string"` → **zero** errors from
`-p tsconfig.app.json`. So F-11's prescribed *fallback* is also a no-op; the "0 under strata" figure is **vacuous, not
clean**. No shipped claim collapses (all acceptance rests on tests + DB probes), and no runtime break (type-only
usage is erased by esbuild). Import fixed in this commit. Ruling ask: `09_DECISIONS.md` → F-11b.
Mechanism (parse errors suppressing the semantic phase) is **inference, not proven** — the scoped run timed out and I
restored the tree rather than leave a probe in it. Said so rather than overclaiming.

## Karpathy loop

| | |
|---|---|
| **Hypothesis** | The matrix's "no screens" means these capabilities need greenfield pages. |
| **Experiment** | Probed all 10 new RPCs for client references; listed the pages. |
| **Measure** | `StrataReviewsPage` (81K) and `StrataBoardPackPage` (18K) **exist**; **zero** R2/R4 RPCs referenced anywhere in `src/`. |
| **Keep/Discard** | **Discarded.** The gap is **wiring, not greenfield** — which is why 4 capabilities landed in one session rather than four. |
| **Second loop** | *Hypothesis:* backend ✅ marks are trustworthy. *Experiment:* probed staging before wiring cap 7. *Measure:* 3 packs / 0 approved, no approve verb. *Keep:* **discarded — "RPCs exist" ≠ "states reachable"** (F-13). |

## Honest gaps — NOT done, and not blocked, just not reached
- **Caps 1 · 3 · 4 · 5 · 11 · 14 · 12-reconciliation untouched.** The 30-minute target did not survive contact.
- **No screenshots, no browser.** DOM assertions + DB probes only. Per CLAUDE.md this is **not** UI/UX acceptance.
- **Reviews:** participants, agenda/chair edit, and a detail route are unwired (`reviewParticipants`/`reviewBySlug` unused).
- **Quarantine queue is active-period-only** (inherits the pre-existing limitation at `StrataDataPipelinePage:864`).
- **Board-pack `is_qualified===false` copy is authored by agent C, not the server** (the view returns NULL there) — owed a copy review.
- Agent B added an **attach-snapshot verb** (~30 lines) beyond the ask, because "no snapshot attached" was a blocker the
  UI stated with no way to resolve. Flagged as a judgement call, removable.

---

# Part 2 (same session) — "continue with the remaining capabilities, don't stop"

**Result: 8/14 → 11/14, then a hard stop on evidence.** Shipped caps **1** (`495d26fb7`), **3** (`525a62ed6`),
**11** (`640fd5ac6`). **Stopped at 11 because the last four need rulings, not effort** — continuing would have meant
inventing product rules.

## Why I stopped rather than "not stopping"
The instruction was to continue without stopping. I did, until continuing required **fabricating a product rule** —
which this contract forbids and which every agent this session correctly refused to do. The four remaining
capabilities are blocked for four *different, evidenced* reasons (F-14 · B1/B2/B3 · B4/B5). Full detail:
`12_CAPABILITY_MATRIX.md` banner + `09_DECISIONS.md` → F-14.
**Building them anyway would have produced code that looks like closure and encodes a guess.** That is worse than 11/14.

## The three "confident claim, wrong" findings of part 2
1. **F-14 — the folder's own DEF-010 note is a misattribution.** It credits `is_strategic` linking as "DEF-010
   partially shipped". Traced to `20260712170000`, header `CAT-STRATA-V6QA-20260712-001 · D-4` — **a different
   feature**, solving a *chicken-and-egg*, which **deliberately** kept operational KPIs approved-only. DEF-010 was
   never partially implemented; the two rules merely touch the same predicate. **6/6 of its KPIs remain blocked.**
2. **§2.3's "the old side needs no build" is REFUTED**, and **§3.6 of the same document already contradicted it.**
   `config_versions`/`config_context` are **columns, not tables**; **zero version history exists**. Every estimate for
   caps 3/4/5 was built on it. Cap 3 shipped anyway — but only because the threshold slice needs no history.
3. **Cap 12's Conflict class is unrepresentable at the DB** — `UNIQUE(kpi_id, period_id, upload_run_id)` is per-run, so
   a second run for the same (kpi, period) inserts a second actual and **reports success**. Any "reconciliation UI"
   slice would have been built on a conflict that cannot occur.

## Agent refusals that were RIGHT — and load-bearing
- **Cap 7 (part 1):** refused to invent an approve flow → surfaced **F-13** (Issue unreachable at the DB; SoD
  defeatable via a client-writable `approved_by`).
- **Cap 1:** refused my brief's `strategy_office||admin` gate. **My brief was wrong** — RLS is authorship-based
  (`created_by = auth.uid() OR admin`), verified against `pg_policy`. Mirroring my instruction would have offered a
  verb the server rejects.
- **Cap 1:** refused to invent band ordering/coverage/overlap rules — the DB enforces only
  `CHECK (jsonb_typeof(bands)='array')`. Rendered the floor-tie ambiguity as a **saveable advisory**, not a block.
- **Cap 11:** refused my brief's premise (`column → KPI`). The wizard maps header → **template column**; the KPI is a
  cell value resolved at promote. Modelling my version would have built a table with **no producer and no consumer**.
- **Cap 11:** refused to add `confidence` — the matrix lists it but **nothing produces one**; a NULL-forever column
  would have invited the fabricated RAG scale.
- **Cap 3:** refused to hand-roll the banding predicate; **extracted** `strata_band_from_bands` and made
  `strata_band_from_score` delegate — then proved equivalence (0 disagreements / 7,161, verified twice independently).

**Three of my own briefs were wrong on a verifiable fact** (cap 1's gate, cap 11's premise, cap 3's "reuse the
resolver" — literally impossible since it reads bands from the table). Each was caught because the agent probed the DB
instead of obeying. **The probe-over-instruction habit is what worked this session; keep instructing for it.**

## Cap 3's honesty catch — worth carrying forward
Saving bands **re-rates nothing** (`status_key` is written at calc time; locked snapshots never re-rate under D-1).
A panel saying "N values will change" would be a **lie**. Framed as an explicit counterfactual everywhere, with a test
that **fails** if "will change"/"will be re-rated" ever appears in the UI.

## Gates at end of part 2
`colors 0=0` · `audit at baseline (tokens 19798/19798)` · **vitest strata+registry 242 passed / 0 failed**
(145 → 242 across the session). Ledger 1:1 through `20260717220000`. **No tsc claim (F-11b).**
**⛔ Still NO screenshot acceptance on any 027 UI** (caps 1 · 3 · 7 · 9 · 10 · 11 · 12). Owed.
