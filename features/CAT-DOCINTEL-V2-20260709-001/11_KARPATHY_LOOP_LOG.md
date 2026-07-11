# Karpathy Loop Log — CAT-DOCINTEL-V2-20260709-001

## Loop 1 — 2026-07-09 — "Is DocIntel real or mock?"

**Hypothesis:** DocIntel might be a largely-mocked demo surface given how many adjacent Catalyst
features turned out to have mock/dead layers (per repo memory patterns).

**Experiment:** 4 parallel read-only agents — code inventory, live Supabase DB probe (staging
`cyij`), docs/tests/seeds inventory, live browser navigation with real Ask/Extract/Generate calls.

**Measure:** 378 real 1536-dim embeddings (non-null spot-checked), 78 real citations, active edge
functions (v5-7), live 15-min cron, non-deterministic 6-45s async latency on Ask/Extract/Generate,
real bilingual (EN/AR) grounded answers across different source documents in the same session.

**Keep/Discard:** Hypothesis **discarded** — DocIntel is real, not mock. Result documented in
`docs/audits/doc-intel-current-state-discovery.md`.

---

## Loop 2 — 2026-07-09 — "Does the acceptance record match reality?"

**Hypothesis:** If DocIntel v1's own `06_VALIDATION_EVIDENCE.md` claims a capability works, live
data will confirm it.

**Experiment:** Cross-checked every AC section against the Knowledge Framework Acceptance Criteria
doc, using the same live DB probe data (table row counts, RPC existence) gathered in Loop 1.

**Measure:** Most claims held up. One did not: §5 Conflict detection marked ✅, but its dependency
`docintel_match_facts` RPC has 0 rows to match against in `ai_requirement_facts` — the capability
cannot currently function despite the ✅ mark.

**Keep/Discard:** Hypothesis **partially discarded** — most of the acceptance record is accurate
and honestly self-critical (several 🟡 residuals correctly marked), but the conflict-detection ✅
is an overclaim. This became Decision 2 in `09_DECISIONS.md` and drives this feature's P0 scope.

---

## Loop 3 (planned, Slice 1 kickoff) — "What is the actual root cause of the fact-embedding gap?"

**Hypothesis:** Not yet formed — requires reading `docintel-analyze/index.ts` and
`embed_stage.ts` fact-extraction path first. This is the first task of Slice 1 execution.
