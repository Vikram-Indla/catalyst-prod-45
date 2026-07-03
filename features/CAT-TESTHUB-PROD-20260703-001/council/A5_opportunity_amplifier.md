# A5 — Opportunity Amplifier + Report/Executive Surface Critic

Feature: CAT-TESTHUB-PROD-20260703-001 · Advanced Council v3 · 2026-07-03
Inputs: discovery/01–14 (deep: 06, 12, 13, 10, 14) + gaps/G01–G14 (deep: G09; row-level: G07, G06, G03, G10). Claims below cite the shard rows; disputed items spot-verified against discovery evidence (file:line already embedded in shards).

**VERDICT: AMPLIFY 4, DEFER 6, REJECT 7. The enterprise "feel" is not more features — it is (a) numbers that never lie, (b) a go/no-go answer on the live release page, and (c) governed AI. All three are buyable with assets already in the repo.**

---

## 1. The core amplifier thesis

Gap-closure alone produces "a working test tool." What makes a 500-seat test company say *enterprise-grade* is three sensations:

1. **Trust** — every number is defensible. Today 7/10 dedicated report hooks render fake zeros on error (06 §2, RPT-001), coverage_status is a hand-set lie (TRC-004), the story coverage widget reads only one of two link mechanisms (TRC-018), and two analytics stacks compute the same metric with different formulas (RPT-003). No amount of new reports survives one VP seeing two pass rates for the same cycle.
2. **A decision surface** — "can we ship release X?" answered on the release page, not reconstructed from 26 reports. The entire machinery exists, built and idle (discovery 13 §7).
3. **Governed AI** — provenance, review-before-insert, quotas, a kill switch. This is what separates "has AI" from "we can let 500 people use the AI" (G09 P0 block).

Everything below is ranked against those three.

---

## 2. Ranked verdicts on the five named candidates

### 2.1 Unmounted quality-gate/readiness stack lift — **ACCEPT (highest-leverage item in the whole feature), with two hard conditions**

Evidence: discovery 13 §4.2/§7 — gate CRUD (6 gate types, 5 operators, blocking flags), waivers with expiry+audit, gate templates, evaluation history, readiness snapshots with approval workflow, `tm_get_release_test_summary` RPC. Schema + RPCs + hooks + components all functional, **zero routes render any of it**.

This is the only place in the codebase where a genuinely differentiating enterprise capability (release go/no-go with waiver audit — RPT-018, TRC-029/030) is ~80% built. Competitors charge for exactly this (14 §11 "release readiness scorecard").

**Conditions (non-negotiable):**
- **C1 — Identity first.** Everything FKs legacy `releases(id)`; live surfaces run on `ph_releases`/`rh_releases` (13 §2). Mounting anything before the release-identity decision (mapping table vs FK repoint) ships gates against releases nobody can see. This decision belongs to the architecture advisor, but the amplifier position is: *the gate stack's value is fully hostage to it — sequence it early.*
- **C2 — Lift hooks/RPCs, never the orphan UI.** Discovery 10 shows the orphan cluster is a landmine inventory: Math.random assignment tables (#5), toast-only quick actions (#11), console.log calendars (#10). The quality-gates components (`components/releases/quality-gates/`) are the *least* stubbed part, but they are pre-JiraTable, non-canonical UX. Rebuild thin canonical UI (JiraTable + Lozenge + SectionMessage) over the existing hooks (`useReleaseQualityGates`, `useReleaseReadiness`) — that is a 2-hour-slice-shaped job precisely because the data layer is done.
- Bonus: killing `rh_releases.readiness_pct` as a hand-typed column (RPT-005, a P0 lie) falls out for free — computed readiness replaces it.

### 2.2 AI leapfrog (G09) — **SPLIT: ACCEPT the governance wedge + one visible leapfrog; DEFER the rest**

- **ACCEPT, P1, mandatory hygiene (not optional "AI features"):** AI-001 (dialog invokes nonexistent fn — live P0), AI-002/048 (no auth on credit-spending endpoints), AI-003/009 (usage ledger — inserts currently 404 into a dropped table), AI-004/005 (quota + inflight lock, Vikram-explicit), AI-006 (delete 4 dead caty-* hooks + orphaned modals). Without these, giving 500 seats an AI button is an uncapped Gemini invoice with no attribution.
- **ACCEPT, the visible leapfrog wedge (small, high perceived value):** AI-007 review-before-insert (the single biggest trust upgrade — vendors all do review-before-save), AI-029 provenance Lozenge + filter (column already written, S effort), AI-013 dedup context, AI-014 signature cache (credit protection with an existing `_shared/ai-cache.ts` pattern). Together these turn "we bolted on a prompt" into "governed generation" — the AIO/Xray trust-card story at ~4 S/M items.
- **DEFER (P2/P3):** Gherkin (AI-012 — blocked on G01 schema decision), coverage-gap suggestions (AI-018 — good, but after coverage engine is truthful), cycle-close failure summary (AI-019 — reuse report-insights verbatim later), defect drafting (AI-020), org kill switch (AI-031 — P2, do before GA not MVP).
- **REJECT for this cycle:** see §5.

### 2.3 Coverage engine as story-detail surface — **ACCEPT, and rank it above new reports**

G06 shows coverage is the most *dishonest* domain today: split-brain link mechanisms (TRC-001 P0), FK-less requirement_id (TRC-002), lying coverage_status (TRC-004), a story widget that undercounts (TRC-018), org-wide unscoped scans (TRC-005/022). The amplifier framing: **coverage-on-the-story is where developers and testers meet** — it is the surface a 500-seat company demos to auditors. Computed coverage verdicts (TRC-011), an uncovered-requirements view (TRC-015), and a "link existing test" action (TRC-047) beat any five new hub reports for perceived enterprise-ness. It also *unlocks* 2.1: a coverage quality gate (TRC-030) is only honest once this engine is honest. Sequence: truth fixes (P0 rows) → computed verdict → story panel → gate input.

### 2.4 Release-readiness integration into live release pages — **ACCEPT as the exec-visible payoff of 2.1**

The live `ph_releases` detail page contains **zero** test references (13 §2 grep evidence). One additive side panel — test summary (existing RPC) + gate status + readiness verdict — is the moment TestHub stops being a silo and Catalyst gets its "quality is in the delivery flow" story. Constraint-compatible: additive panel, canonical components, no refactor of the release page. Gated on C1 identity decision.

### 2.5 Exec dashboards — **DEFER the dashboard; ACCEPT three cheap credibility levers instead**

A composite QA dashboard (RPT-038), cross-project rollup (RPT-013), and the empty `/project-hub/:key/reports` slot are real gaps — but for one company's pre-prod MVP they are breadth, not trust. The exec-surface critic position (§6) is that the existing 26 reports fail executives on *credibility*, not coverage. Buy these first, all S/M and additive:
1. **RPT-001 silent-error sweep** (7 hooks, established memory pattern, hook-level only — zero UI refactor, respects reuse-not-refactor).
2. **RPT-006 "capture since 2026-07-03" disclosure** on history-gated reports — an empty burndown with no explanation reads as broken; with a SectionMessage it reads as disciplined.
3. **RPT-021 drill-through** — dead-end charts are the #1 "this is a demo" tell; clicking a bar must land on a filtered list. Additive onClick wiring, not body refactor.
Then one **release-readiness scorecard** (RPT-018, = 2.1's report face) is the only *new* exec artifact MVP needs. Full dashboards, subscriptions (RPT-010) and org rollups are honest P2s.

---

## 3. Sleeper amplifier not on the list: flaky-test report — **ACCEPT-CHEAP (P2, deterministic)**

RPT-008/AI-021: pure SQL flip-rate over run history, no AI call, no vendor in the field ships it well in the manual-TM tier. For a test company this is a conversation-starting differentiator at M effort. Contingent on per-instance run-history retention (G-cycles decision) — flag the dependency in the Plan Lock, don't lose the item.

---

## 4. Adjacent Catalyst capabilities that get easier

| Investment here | What it unlocks elsewhere | Evidence |
|---|---|---|
| `ai_usage_ledger` + quota + auth (AI-002/003/004) | Governance for **all 24 GEMINI_API_KEY edge fns** org-wide, not just TestHub; admin cost dashboard (AI-033) becomes a query | 12 §2 provider inventory |
| Release identity unification (C1) | Release Hub readiness_pct becomes computed (RPT-005 dies); sprint quality gates become possible later (13 §7 gap 4); ends the 4-way release split-brain that every future module hits | 13 §2 |
| Coverage engine truth (TRC-001/004/011) | Epic/feature rollups (TRC-016), release coverage gates, and Incident Hub escaped-defect/leakage analysis (RPT-015) all read the same computed verdicts | G06 |
| Reports-hub registry + insight-card pattern (already shipped) | Direct template for the empty `/project-hub/:key/reports` slot and any future module's report hub — zero new architecture | 06 §1, §3 |
| Silent-error sweep on report hooks | Extends the proven org-wide `{data}`-destructure fix pattern to its last known hideout | memory: silent-query-error-sweep |

---

## 5. REJECT as fantasy for a 500-seat single-company user base

| Item | Why fantasy at this scale | Ref |
|---|---|---|
| Custom/dynamic report builder (reviving dead `ReportBuilder`) | 26 canned reports + CSV covers a 500-seat org; builders are multi-tenant vendor economics. The dead code should be deleted (RPT-050), not resurrected | RPT-041, 06 §3 |
| NL query over reports / repository | Trust prerequisite (visible compiled filters) not met; novelty, not workflow | RPT-049, AI-024 |
| Repository-wide AI dedupe with embeddings | No pgvector infra exists; pairwise-LLM cost is exactly the unbounded spend G09 P0s are trying to stop | AI-017 |
| Risk-based "which tests to run" AI selection | Launchable-class; needs execution history + coverage links that don't exist honestly yet. Roadmap row only | AI-045 |
| Manual→automation skeleton generation | Blocked on Domain-12 automation-key schema; automation *ingestion* (tables exist, zero consumers) must come first anyway | AI-046, 06 §4 |
| Configuration-matrix entity (browser×OS×env) | One company's env list fits the plain environments admin (ADM-012); matrix engines are 10k-seat features | PLN-022 |
| SSE streaming generation UX | Established `als-*` wait pattern is fine at ≤10 cases/call; streaming is polish with real complexity | AI-039 |
| Metrics API for BI | CSV/XLSX export (RPT-012) serves a 500-seat org; an API is a contract to maintain forever | RPT-042 |

**DEFER (real, but post-MVP):** scheduled/emailed report subscriptions (RPT-010 — 500-seat orgs *do* want this, P2), cross-project rollup (RPT-013), XLSX export (RPT-012), composite dashboard (RPT-038), AI cycle-close summaries (AI-019), org AI kill switch (AI-031 — before GA), environment coverage report (RPT-017 — after env model split-brain PLN-020 resolves).

---

## 6. Report/Executive Surface Critic — findings on the shipped hub

The hub (CAT-REPORTS-HUB, closed yesterday) is architecturally right (registry SSoT, error boundary, insight cards on 26/26) and must be **reused, never refactored** per the constraint. Critic findings, all additive/bug-fix compatible:

1. **Credibility P0:** silent fake zeros in 7 hooks, worst in the *default* report (6 unchecked queries in useSprintTestingStatus) — the first report an exec ever opens is the most likely to lie. Fix before anything ships to pre-prod. (RPT-001)
2. **Consistency P0:** hub client-side math vs Cycle Command Center RPC math computes tester performance twice with different formulas (RPT-003). MVP answer is not a refactor: pick which stack a surface trusts, and don't mount the second answer where the first is visible. Document the formula per report (extend `FORMULA_EXPLANATIONS`, RPT-046) — auditors ask.
3. **Scale landmine on the flagship:** org-wide full-table scans + client JSONB sprint filtering in the default report (RPT-002) — fine at demo volume, embarrassing at 500-seat volume. Additive server-side scoping, P1.
4. **"Demo tell" list:** no drill-through (RPT-021), empty history-gated charts without disclosure (RPT-006), PDF without charts (RPT-011 — defer, but say so in the export menu), incident MTTR invisible from the navigator (RPT-053 — one nav link).
5. **People-report sensitivity:** tester/team performance visible to anyone with hub access (RPT-037). At a test company, tester-ranking data is HR-adjacent — gate it when TestHub RBAC (G10 ADM-004/005) lands; note it in the Plan Lock now.

---

## 7. Suggested amplifier sequencing (within 2-hour slices, MVP → phases)

- **MVP (pre-prod tomorrow):** RPT-001 sweep · AI-001/002/048 · AI-006 deletions · RPT-006 disclosures · TRC P0 truth fixes (001/004/007/018) · AI-029 provenance badge.
- **Phase next:** release-identity decision (C1) → gate/readiness mount on live release detail (2.1+2.4) · AI-003/004/005 ledger+quota · AI-007 review UI · coverage verdict engine + uncovered view (2.3) · RPT-021 drill-through.
- **Phase after:** readiness scorecard report · flaky report · scheduled delivery · AI-019/031 · env coverage.

*A5 out. The buried gate stack and the truth fixes are the feature; most of the rest is garnish.*
