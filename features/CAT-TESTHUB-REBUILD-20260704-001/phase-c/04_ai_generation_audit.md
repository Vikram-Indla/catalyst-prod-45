# AI Test-Artefact Generation — Deep Audit (VERIFIED, 2026-07-05)

## Current state
- **One edge fn** `supabase/functions/ai-generate-story-test-cases/index.ts` (479 LOC): **Gemini 2.5 Flash** (OpenAI-compat shim), temp 0.3, max_tokens 6000, json_object mode + regex salvage. Good governance (JWT gate, 20/day quota + 10s cooldown off tm_ai_usage_log, usage logged).
- **Two frontends**: (A) AIGenerateTestCasesDialog.tsx (free text, shadcn) + useAIGeneration.ts; (B) story-detail TestCasesSection.tsx (grounds on story summary/desc/ACs, batch-inserts is_ai_generated + linked_story_key).

## Why it's cheap (ranked)
1. **Zero real work-item grounding** — even story mode gets 3 flat strings; no linked items, comments, sub-tasks, parent epic, ACs-as-structure, existing-test dedup set.
2. **Weak model** for reasoning-heavy suite design (Flash, temp 0.3).
3. **Fabricated per-case type** — model returns no type; frontend forces uniform DEFAULT_TYPE_ID (TestCasesSection.tsx:41) / requestedType (useAIGeneration.ts:151) = zero-assumption violation.
4. No coverage-area analysis (prompt says "blend" but never labels/returns).
5. No dedup vs existing cases (re-run = near-dupes).
6. No AC traceability ("covers AC-3") — can't answer "which ACs untested".
7. Dead UI controls: 4 toggles (edge/negative/perf/security) dropped by hook; coverageAreas/priorityBreakdown/typeBreakdown/reasoning render EMPTY.
8. No structured-output guarantee.
9. No minimum-coverage contract.
10. **No defect or incident modes** (Vikram wants both).
11. Free-prompt project/feature = unbound strings, non-persistable.

## AI infra
- tm_ai_usage_log: LIVE (restored 20260703280000) — reusable for logging.
- tm_ai_embeddings: DROPPED (20260628170000 deadwood sweep) — no semantic dedup infra; build pgvector or use title-similarity.
- Zero Claude in generation today (all 29 AI edge fns = Gemini). Moving to Claude = net-new client (ANTHROPIC_API_KEY).

## Target model (the elevation)
**One new edge fn `ai-generate-test-artefacts`, `source` discriminator, server-side context assembly (client passes only an ID).**

**3 modes:**
- A **from work item** (Story/Feature/Epic): fetch ph_issues + ACs indexed AC-1..n + business_request_links + sub-tasks + comments + parent + existing tm_test_cases (dedup set); frame item's own type/priority.
- B **from defect**: tm_defects (title/repro/severity/env/parent) + linked story ACs + resolution comments → reproduction case + regression cases + "would have caught DEF-x" traceability; priority skews high.
- C **from incident**: incident record + post-mortem (reuse ai-post-mortem query) + linked defects → validation scenarios + regression + resilience/negative; "validates fix for INC-x".

**Output contract per case:** full steps (concrete test_data on boundary/negative), structured preconditions, priority+rationale, **type+rationale returned & persisted per case** (kills uniform-type bug), coverage_area (happy/negative/boundary/security/perf/integration), **traceability `covers:[AC-2|defect-x|incident-y]`**, Gherkin option, dedup flag `similar_to_existing`, + a `coverage_map` (AC→cases) + `gaps`.

**Prompt architecture:** frozen system (SDET persona + invariant contract + few-shot) for prompt caching → mode-specific context block after cache prefix → structured output (json_schema/strict tool) → coverage self-check (enumerate ACs → map → emit).

**Model:** Claude — audit recommends **claude-opus-4-8** default (reasoning-heavy, 1M ctx, structured outputs, adaptive thinking + effort:high; NO temperature param — drop the 0.3). Sonnet-5 as cost step-down; fable-5 only if Vikram wants most-capable. VERIFY exact API shape against claude-api skill at build.

**Governance:** keep JWT/quota/cooldown; log tm_ai_usage_log with model + real tokens; sanitizer stays as defense.

## Integration points
- Repository free-prompt (fix/remove dead toggles, populate real metadata, bind real project).
- Work-item detail "Generate tests" = Mode A (stop forcing DEFAULT_TYPE_ID).
- Defect detail "Generate regression tests" = Mode B.
- Incident detail "Generate validation/regression" = Mode C.
- Reviewer diff before insert: per-case coverage + traceability + dupe flag.

## Files
Dialog AIGenerateTestCasesDialog.tsx · hook useAIGeneration.ts (drops toggles, fabricates type) · grounded TestCasesSection.tsx:41 · edge fn ai-generate-story-test-cases/index.ts · usage log 20260703280000 · embeddings drop 20260628170000.
