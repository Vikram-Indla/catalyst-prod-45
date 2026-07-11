# PLAN LOCK DRAFT — Phase 4 Slice S1: AI classification suggestion

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: 🟡 DRAFT — not approved, not built, no code written. This is the scoping artifact requested in chat, produced instead of leaving "scope Phase 4" as an unfulfilled verbal offer.

## Why this is a draft, not a build
Deploying an edge function is a live-infrastructure change (new callable function, real LLM API calls, real cost) — the same category of action as the RLS migration in the prior commit: hard to reverse, affects shared infrastructure, needs review before it happens, not mid-loop. This document exists so that review can happen on a concrete plan instead of an abstract "AI Copilot, eventually."

## Why classification, not something else, as Phase 4's first cut
04's P1 table lists AI Copilot as one L-effort item covering classify/summarize/duplicates/mapping/scores/BR-draft. Classification is the smallest complete vertical slice: one LLM call, structured JSON output, one suggestion kind, one review action (accept/reject) — proves the whole pattern (gateway → ledger → review UI) end-to-end before the more novel kinds (duplicate detection needs pgvector similarity search first; mapping needs the strategy-element catalog; BR-draft needs the full field-mapping the Conversion slice already does manually).

## What already exists (checked, not assumed)
- `supabase/functions/_shared/llm.ts` — real, battle-tested Deno gateway (gemini→anthropic→qwen failover, `jsonSchema` structured output, `embed()` for pgvector, `logUsage()`). Used by the docintel functions today; nothing ideation-specific to build here, just call it.
- `idn_ai_suggestions` (S2 schema) — `kind`, `payload jsonb`, `confidence`, `evidence_refs`, `model`, `prompt_version`, `status` ('proposed'/decided), `decided_by`/`decided_at` (CHECK-enforced attribution on every human decision). Real schema, unused since S2, exactly shaped for this.
- **RLS already blocks client-side insert** (S1 validation evidence, probe G4: "AI suggestion insert by client (service-role-only ledger) — blocked"). Confirms suggestions can only be written by a service-role edge function, never the browser — the architecture below respects that, doesn't route around it.
- `idn_ideas.idea_class` — the field being suggested, enum `problem`/`opportunity`/`improvement`, already real on every idea.

## Proposed architecture (for review, not built)
1. **New edge function** `supabase/functions/idn-classify-suggest/index.ts` — takes an `idea_id`, reads `title` + `problem_statement` (ADF → plain text, reuse `adfToPlainText`'s Deno-side equivalent or inline), calls `generateText` from `_shared/llm.ts` with `jsonSchema: { idea_class: enum, confidence: number, rationale: string }`, inserts one `idn_ai_suggestions` row (`kind='classification'`, `payload={suggested_class, rationale}`, `confidence`, `model`, `prompt_version`) via service-role client.
2. **Trigger point**: called from the client on idea submit (`draft → submitted` transition, D13) via `supabase.functions.invoke('idn-classify-suggest', { body: { idea_id } })` — fire-and-forget, doesn't block the submit UX; a failed/slow LLM call never blocks a human action (matches "AI: never auto-applied, prefill/suggest only" across every P0 AI row in 04's table).
3. **Review UI**: a suggestion card in the Detail page rail (or Inbox row per 04 §C.1 "AI-ready badge") — "Suggested: Opportunity (82% confidence) — because..." with Accept/Reject buttons. Accept: client updates `idn_ideas.idea_class` (already-open RLS path, reviewer/approver/admin can update non-draft ideas) AND updates the suggestion row's `status`/`decided_by`/`decided_at` — but per the RLS finding above, **suggestion status updates also need to go through the service-role function or a new RLS UPDATE policy**, since S2 only proved INSERT is service-role-only; UPDATE policy for the decide-path needs the same scrutiny `idn_ideas_update` should have gotten the first time — check before building, not after.

## Explicit non-scope for S1
- Duplicate detection, strategy mapping, score suggestions, BR-draft generation — separate suggestion kinds, separate slices, each needs its own data dependency checked first (pgvector query design for duplicates, strategy-element catalog access for mapping).
- Confidence threshold / master Copilot toggle / per-capability admin controls (04 §H "AI toggles") — needs the Admin write-path work (itself deferred, see Phase 3 S3's Plan Lock non-scope) before a toggle would do anything real.
- Auto-apply of any kind, at any confidence — explicitly prohibited by design (04, every AI row: "never auto-applied").
- Rate limiting / cost caps on the edge function — real production concern for a real LLM-calling function, needs its own design pass, not bolted on silently.

## Real open questions this draft surfaces (not resolved here)
1. Does `idn_ai_suggestions` need an UPDATE RLS policy for the decide-path, and does it have the same class of self-referential risk `idn_ideas_update` had? **Must be checked line-by-line before any code, given that exact bug already cost real time this session.**
2. Who bears LLM cost for classification suggestions at scale — every submit, or only on-demand ("Get AI suggestions" button)? Cost model isn't decided anywhere in 04.
3. `prompt_version` — is there a versioning/pinning convention already established by docintel's use of the same gateway, or does ideation start its own?

## Timebox estimate if approved
Given the gateway/schema already exist and this is deliberately the smallest AI vertical slice: ~2h for the edge function + insert, ~1.5h for the review UI + accept/reject wiring (contingent on resolving open question #1 first) — roughly a 3.5h two-slice cut, not the L-effort estimate for the full AI Copilot surface.
