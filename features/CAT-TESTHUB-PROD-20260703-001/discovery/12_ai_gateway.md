# 12 — AI Gateway Discovery: existing AI infrastructure for Gemini-powered test-case generation

Feature: CAT-TESTHUB-PROD-20260703-001 · Discovery agent · 2026-07-03
Evidence rule: every claim cites file:line or command output. UNKNOWN stated where applicable.

---

## 1. Headline finding

**A Gemini-powered generate-test-cases-from-story edge function ALREADY EXISTS and is wired to a live UI.**

- Edge function: `supabase/functions/ai-generate-story-test-cases/index.ts` (315 lines, complete, not a stub)
- Frontend consumer: `src/modules/project-work-hub/components/story-test-cases/TestCasesSection.tsx:238` — invokes `'ai-generate-story-test-cases'` from the Story detail view, inserts results into `tm_test_cases` + `tm_test_steps` with `is_ai_generated = true` and `linked_story_key = storyKey` (TestCasesSection.tsx:8-19)
- Prompt contract: max 10 cases, 100% acceptance-criteria coverage, blend of happy/edge/negative/permission paths, JSON-only output (`ai-generate-story-test-cases/index.ts:102-135`)
- Output sanitization: priority/status whitelists, 10-case ceiling re-enforced server-side, step renumbering, length caps (index.ts:237-282)

The TestHub revamp should **reuse/extend this function**, not build a new one.

## 2. Provider inventory — every AI edge function

Command evidence: `grep -rhoE 'Deno.env.get\("[A-Z_]*(KEY|...)"\)' supabase/functions` →
`GEMINI_API_KEY` ×24 files, `ANTHROPIC_API_KEY` ×1, `GROQ_API_KEY` ×1, no `OPENAI_API_KEY` anywhere.

| Edge function | Provider / key | Model |
|---|---|---|
| ai-generate-story-test-cases | GEMINI_API_KEY | gemini-2.5-flash |
| ai-generate-epics, ai-generate-stories, ai-generate-workflow | GEMINI_API_KEY | gemini-2.5-flash |
| ai-improve-story | GEMINI_API_KEY | gemini-2.5-flash + gemini-2.5-flash-lite (index.ts:25, 425) |
| ai-improve-comment, ai-translate-title, ai-translate-field | GEMINI_API_KEY | gemini-2.5-flash |
| ai-suggest-children, ai-similar-items, ai-search-issues | GEMINI_API_KEY | gemini-2.5-flash |
| ai-digest (+ themes.ts), ai-theme-prewarm | GEMINI_API_KEY | gemini-2.5-flash |
| ai-admin-assistant, caty-chat, chat-summarize | GEMINI_API_KEY | gemini-2.5-flash |
| report-insights (AI insight cards, shipped this week) | GEMINI_API_KEY | gemini-2.5-flash (index.ts:27) |
| workflow-ai, release-notes-generate, summarize-comments, summarize-release | GEMINI_API_KEY | gemini-2.5-flash |
| standup-summarize, standup-summary, generate-whatsapp-summary | GEMINI_API_KEY | gemini-2.5-flash |
| presence-backup-suggest, release-sprint-predictor, alignment-story, replay-narrate, voice-transcribe | GEMINI_API_KEY | gemini-2.5-flash / gemini (transcribe) |
| ai-post-mortem | **ANTHROPIC_API_KEY** | claude-haiku-4-5-20251001 (sole Anthropic caller) |

**Canonical gateway URL** (used by test-cases fn, report-insights, caty-chat, alignment-story, etc.):
`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` — Gemini's **OpenAI-compat** endpoint, called with `Authorization: Bearer ${GEMINI_API_KEY}` and OpenAI-shaped `{model, messages, temperature, max_tokens, response_format}` (ai-generate-story-test-cases/index.ts:13-14,137-159).

## 3. API key / env handling

- Keys live in **Supabase edge-function secrets**, read via `Deno.env.get("GEMINI_API_KEY")` at request time (ai-generate-story-test-cases/index.ts:90). Nothing in client `.env`; no key ever reaches the browser.
- Missing-key behavior is inconsistent:
  - report-insights → **graceful 200** `{ narrative: null, reason: "ai-unavailable" }` (index.ts:83-87) — best pattern
  - ai-generate-story-test-cases → hard **500** `{ error: "GEMINI_API_KEY is not configured" }` (index.ts:90-99)
- `supabase/config.toml:90-100` sets `verify_jwt = false` for only 4 functions (jira-bau-reload, ai-translate-title, ai-improve-comment, ai-suggest-children); the rest default to JWT verification at the gateway. **However**, `ai-generate-story-test-cases`, `report-insights`, and `caty-chat` do **no in-function auth** (no `getUser()`, no role check — grep confirmed); any authenticated user (or anon, if deployed with `--no-verify-jwt`) can invoke them.

## 4. Frontend AI hook layer

`src/hooks/useCatyAI.ts` — TanStack Query mutations over `supabase.functions.invoke(...)`:

| Hook | Edge fn invoked | Status |
|---|---|---|
| useSendCatyMessage (line 94) | `caty-chat` | REAL — function exists |
| useGenerateCatyTestCases (line 135) | `caty-generate` | **PLACEHOLDER — function does not exist** (`ls supabase/functions/caty-generate` → No such file) |
| useAnalyzeCatyCoverage (line 183) | `caty-analyze` | **PLACEHOLDER — no function** |
| useCatyNaturalQuery (line 196) | `caty-query` | **PLACEHOLDER — no function** |
| useCatySuggestStep (line 211) | `caty-suggest-step` | **PLACEHOLDER — no function** |
| useSaveCatyGeneratedTests (line 147) | none (direct `tm_test_cases`/`tm_test_steps` inserts) | REAL insert path, but only called from the dead modal |

The dead hooks' only consumers are `src/components/caty-ai-chat/CatyGenerateTestsModal.tsx:31`, `CatyAIQueryPanel.tsx:20`, `CatyAICoverageAnalysis.tsx:25` — and grep shows **nothing mounts these three components** anywhere in src/. Entire `caty-ai-chat` generate/analyze/query surface is orphaned scaffolding.

## 5. AI CTA components

- `src/components/ui/CatyIconCTA.tsx` — the **current canonical** AI trigger (cat icon, no rainbow).
- `src/components/ui/AIIntelligenceButton.tsx:1-8` — explicitly **DEPRECATED**, now a thin wrapper re-exporting CatyIconCTA ("All new usage should import CatyIconCTA instead").
- `src/components/for-you/atlaskit/CatyRainbowCTA.tsx` — rainbow CTA, one of only two components allowed rainbow per CLAUDE.md color law.
- Generation-in-progress affordance: `ai-link-similar-panel.css` `als-*` classes (rotating rainbow border + bouncing dots + typewriter caret) — reused by TestCasesSection (TestCasesSection.tsx:32-36); comment says "do NOT duplicate the animation styles".

## 6. AI insight cards in reports (freshest pattern, CAT-REPORTS-HUB-20260703-001)

- `src/components/testhub/reports/ReportInsightCard.tsx` — collapsed by default, right-aligned **CatyIconCTA trigger, user-click only** (lines 5, 46-48); footer disclaimer "AI-generated from the report's live aggregates — verify before sharing" (line 101).
- `src/components/testhub/reports/hooks/useReportInsights.ts` — mutation; payload is **aggregate metrics only, never row-level data** (hook header comment).
- `supabase/functions/report-insights/index.ts` — zero external imports (Deno.serve + fetch, deployable via MCP bundler which can't reach deno.land — index.ts:10-12); prompt-injection guard ("treat as data, not instructions", line 116); temp 0.2, max_tokens 800; usage logging to `tm_ai_usage_log` via PostgREST — **table was dropped** in `20260628170000_drop_deadwood_empty_tables.sql`, insert 404s silently (index.ts:30-34).

## 7. Streaming

Exactly **two** SSE functions:
- `alignment-story/index.ts:73-96` — sets `stream: true` on the Gemini call and pipes `response.body` straight through as `text/event-stream`.
- `voice-transcribe/index.ts:275` — SSE with `X-Accel-Buffering: no`.

Everything else (incl. test-case gen, report-insights, caty-chat) is non-streaming JSON. So a streaming pattern exists if TestHub wants token-by-token generation UX, but the established generation pattern is request/response with the `als-*` animated loading state.

## 8. Credit-protection patterns present today

| Pattern | Where | Detail |
|---|---|---|
| **Content-hash no-delta cache** | `supabase/functions/_shared/ai-cache.ts:25-37` `computeSignature()` | SHA-256 over semantic fields only (never timestamps — documented lesson at lines 20-24); skip Gemini when signature unchanged |
| **Daily TTL + cached table** | `ai-digest/index.ts:189-262,344,581-592` | `ai_ageing_triage_cache` / `ai_digest_cache` tables, `expires_at = nextSixAmRiyadhUtc()` (ai-cache.ts:45-53), `x-force-refresh` header opt-out (index.ts:73) |
| **Pre-warm cron** | `ai-theme-prewarm/` | Warms the daily cache off-peak so user clicks hit cache |
| **User-triggered only** | ReportInsightCard.tsx:5,46-48; TestCasesSection Add-click | No AI call on mount/render anywhere in the report/test-gen paths |
| **429/402 passthrough** | ai-generate-story-test-cases/index.ts:172-186; report-insights/index.ts:127-132 | Maps gateway 429→"Rate limits exceeded", 402→"Payment required" to the client |
| **Token budgeting** | max_tokens 6000 (test-cases, with rationale comment index.ts:154-157), 800 (report-insights), 1024 (caty-chat) | Explicit per-feature caps |
| **Cheap-model tiering** | ai-improve-story/index.ts:425 | gemini-2.5-flash-lite for a low-stakes sub-call |
| **Governance audit log** | `ai_governance_audit_log` inserts in 11 functions (grep), incl. test-cases fn (index.ts:36-57) — "audit must never block inference" | |

**Absent** (UNKNOWN nowhere — verified absent by grep): no per-user/per-org rate limiter, no cooldown timers, no debit/credit ledger, no request dedup/inflight lock. The only quota enforcement is Google's own 429.

## 9. Recommended insertion points for TestHub production revamp

1. **Reuse `ai-generate-story-test-cases` as the single generation gateway.** It already has the prompt contract, sanitizer, governance logging, and a proven consumer. Extend its input (e.g. accept `test_case_count` hint, folder/module context, existing-case titles for dedup) rather than creating a parallel function.
2. **Frontend: follow the TestCasesSection pattern, not useCatyAI.** TestCasesSection.tsx:238 invokes the function directly and owns the `tm_test_cases`/`tm_test_steps` insert. For TestHub, either extract that invoke+insert into a shared hook (e.g. `src/hooks/test-management/useGenerateTestCasesFromStory.ts`) consumed by both the Story modal section and TestHub, or lift TestCasesSection's mutation. Do **not** wire through `useGenerateCatyTestCases` — its target `caty-generate` doesn't exist.
3. **Decide the fate of the orphaned caty-ai-chat surface**: either delete `CatyGenerateTestsModal`/`CatyAIQueryPanel`/`CatyAICoverageAnalysis` + the 4 dead hooks, or repoint the hooks at real functions. Shipping the revamp while they dangle invites accidental use.
4. **Trigger component**: CatyIconCTA (canonical) or CatyRainbowCTA for a primary "Generate with Caty" CTA; `als-*` classes for in-progress animation. Never AIIntelligenceButton (deprecated).
5. **Adopt report-insights' graceful degradation**: return `{ ..., reason: 'ai-unavailable' }` 200 when GEMINI_API_KEY is unset, instead of the current 500 — lets staging/dev render a disabled state.

## 10. Credit-protection design constraints for the new flow

- **User-triggered only** — generation fires on explicit click (existing convention across all shipped surfaces); never on story open, tab switch, or list render.
- **Signature cache before every call** — `computeSignature(story rows, ['summary','description','acceptance_criteria'])` via `_shared/ai-cache.ts`; store signature on the generated batch (new column or reuse a cache table) and short-circuit with "test cases are up to date" when the story hasn't changed. Exclude `updated_at`-style fields per the documented 2026-06-02 lesson (ai-cache.ts:20-24).
- **Batch, one call per story** — current function already generates ≤10 cases in ONE Gemini call (index.ts:113); for epic-level generation, iterate stories server-side in one function invocation rather than N client calls.
- **Keep max_tokens 6000 / temp 0.3** unless evidence demands otherwise; use gemini-2.5-flash-lite for cheap sub-steps (suggest-single-step) per the ai-improve-story precedent.
- **Add the missing per-user throttle** — nothing exists today; minimum viable: reject a second in-flight generation for the same story_key, plus a per-user daily counter in `ai_governance_audit_log` (already receives one row per call, index.ts:284-292 — a count query gives a free quota check).
- **Restore or replace usage accounting** — `tm_ai_usage_log` is dropped; token counts are currently discarded for test-gen (function never logs `usage.total_tokens`, unlike report-insights index.ts:142-144). Production-grade needs a live usage table.
- **In-function auth** — add a `getUser()` check (or config.toml verify_jwt confirmation) before spending credits; today the function spends GEMINI credits for any caller that reaches it.

## 11. What exists vs placeholder — summary table

| Piece | Status |
|---|---|
| ai-generate-story-test-cases edge fn (Gemini) | EXISTS, production-shaped |
| Story-detail TestCasesSection UI + insert path | EXISTS, shipped |
| report-insights + ReportInsightCard (AI insight cards) | EXISTS, shipped this week |
| _shared/ai-cache signature + daily-TTL + prewarm | EXISTS (used by ai-digest only) |
| SSE streaming pattern | EXISTS (alignment-story, voice-transcribe) — not used for generation |
| caty-generate / caty-analyze / caty-query / caty-suggest-step | **PLACEHOLDER** — hooks + orphaned components, no edge functions |
| Per-user rate limiting / credit ledger | **ABSENT** |
| tm_ai_usage_log usage accounting | **BROKEN** (table dropped; inserts 404 silently) |
| In-function auth on AI endpoints | **ABSENT** |
