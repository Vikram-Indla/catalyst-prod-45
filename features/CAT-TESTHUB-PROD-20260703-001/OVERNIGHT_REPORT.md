# 🌙 OVERNIGHT REPORT — TestHub Production Revamp Planning Cycle

**CAT-TESTHUB-PROD-20260703-001 · 2026-07-03 · Autonomous run complete · Awaiting your GO/NO-GO**

36 agents ran across two orchestrated cycles (~4.4M agent tokens, 830+ tool calls). Zero source files touched. Everything below is evidence-backed with file:line citations in the underlying reports.

---

## 1. TL;DR — the five things to know over coffee

1. **Your "built with stubs" fear is half-right, and the half that's right is worse than stubs.** The routed TestHub is ~80% real (real CRUD, working offline execution runner, attachment uploads, 26 wired reports). But where it isn't real, it **lies**: an assignment table that fabricates 85 fake rows with fake tester names when a query errors, a defect modal that shows a success toast off `Math.random()` and writes nothing, no-op "clone plan" mutations that report success, and 40 places where errors are silently swallowed so failures render as innocent empty screens.
2. **746 gaps registered** (target was 500+) against the Xray/TestRail/Zephyr/qTest/PractiTest composite — 117 P0 (broken/lying today), 422 P1 (table-stakes), 370 P2 (competitive), 189 P3 (delighters). Every row has evidence, a vendor benchmark, and a concrete Catalyst-canonical fix.
3. **Two enterprise features are already built and sitting idle**: a full quality-gate/release-readiness stack (6 gate types, waivers, templates, RPCs, hooks, UI — unmounted), and a working Gemini test-case-generation edge function (`ai-generate-story-test-cases`). The plan lifts them instead of building them.
4. **The architecture's #1 structural fix**: runs must pin the case version they executed (immutable execution snapshots). Today the runner executes live steps and editing a case rewrites history — the one mistake every serious competitor designed against.
5. **Plan Lock is drafted and waiting**: 63±2 slices across 4 phases; P0 "trust repair" (12 slices, ~1.5 days) is sized to run the moment you say go, and pre-prod-usable lands at P0 + first 5 P1 slices.

## 2. What was produced tonight (all in `features/CAT-TESTHUB-PROD-20260703-001/`)

| Artifact | What it is |
|---|---|
| `02_CANONICAL_DISCOVERY.md` | Synthesis of 14 discovery reports + the ~10 root causes |
| `discovery/01–14` | Code map, hooks/data layer, DB schema, linkage model, project-module UI patterns, reports, 26 past-mistake lessons, canonical components, CRE/permissions, stubs audit, ADS/dark audit, AI gateway, release integration, competitor baseline (16 domains, ~180 capabilities) |
| `GAP_REGISTER.md` + `gaps/G01–G14` | **746 gaps**, severity-ranked, evidence-cited |
| `council/A1–A6` | Advanced Council v3: 6 advisors, all GO-with-conditions |
| `ARCHITECTURE_BLUEPRINT.md` | 838 lines, ELI15: functional decomposition, data architecture, per-surface component pseudo-code, hook/mutation contract, AI gateway design, light+dark UX spec, **25 placeholders**, why-we-stand-out |
| `03_PLAN_LOCK.md` | VeriMAP draft: 63±2 two-hour slices, binary acceptance commands, forbidden files, rollback per slice — **STATUS: AWAITING YOUR APPROVAL** |
| `09_DECISIONS.md` | D-001 (AIO demoted), D-002 (council verdict), D-003 (release id-space decision needed from you) |

## 3. Council verdict (condensed)

**PROCEED WITH MODIFICATIONS.** Unanimous on: trust repair before features; reuse over rebuild; zero migrations until a 14-probe batch runs on cyij staging (the migration ledger over-states the live schema by ~73 tables — "exists in migrations" proves nothing). One disagreement: when to lift the quality-gate stack (settled: start of P2, after the coverage spine exists).

**The one non-negotiable first action of execution:** delete the no-op stub barrel exports in `src/hooks/test-management/index.ts:31-52` — they make live pages report success while doing nothing, and every other slice's acceptance depends on hooks that tell the truth.

## 4. The plan in fifteen-year-old language

- **P0 — Stop the lying (12 slices, ~1.5 days).** Probe the real staging database first. Then: kill fake data, kill silent errors (every query gets a visible error + retry), fix the broken routes and the defect modal that pretends to save, make the runner's save actually atomic. Nothing new is built; everything that exists starts telling the truth.
- **P1 — Table stakes (19 slices).** The things every real test tool has: runs pinned to case versions (history can't be rewritten), one canonical story↔test link model with a real picker (no more free-text typos), defect-from-failing-step with prefill, keyboard-driven runner, shared steps, JiraTable everywhere a list lives, dark mode fixed at the root (not via the 540-line override blanket), enforcement ratchets so this debt can't return. **MVP line is here.**
- **P2 — Compete (20 slices).** Computed coverage verdicts (OK/NOK/NOT-RUN like Xray, not a hand-typed field), quality-gate stack mounted on releases, JUnit/CI result ingestion API, plans→cycles→runs hierarchy, review/approval workflow, governed AI (auth + per-user daily quota + usage ledger on the existing Gemini function).
- **P3 — Delight (12–15 slices).** AI dedupe + coverage-gap suggestions, flaky detection, exploratory session mode, exec dashboards, NL search.

## 5. Decisions I need from you (blocking items only)

1. **GO / NO-GO on the Plan Lock** (`03_PLAN_LOCK.md`) — P0 can start immediately on go.
2. **D-003 release id-space**: re-point test↔release FKs from legacy `releases` to `ph_releases` (recommended) or bridge? Blocks release-scoped planning + quality-gate lift (P2).
3. **25 placeholders** in `ARCHITECTURE_BLUEPRINT.md` §8 — each has a default assumption; skim and veto any default you dislike. None block P0.

## 6. Honest caveats

- No live DB was probed tonight (read-only rule) — P0-S0 runs the 14-probe batch on cyij before any code; if probes contradict the schema map, the plan self-corrects there.
- Storybook MCP + several connectors need re-auth; worked around via repo reads.
- The gap register's long tail (P2/P3) is directional, not contractual — the council explicitly warned against treating it as a backlog to burn down linearly.
