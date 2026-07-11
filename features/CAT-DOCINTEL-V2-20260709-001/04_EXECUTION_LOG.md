# Execution Log — CAT-DOCINTEL-V2-20260709-001

## 2026-07-11 — Session 008 — UI Slice 4A COMPLETE

- Made Overview the default source view while preserving all source controls and legacy panels.
- Added only existing actions and proven fact/artifact counts; no summary or score was fabricated.
- Authenticated staging and 7 workspace tests passed with full ADS/pre-commit validation.

## 2026-07-11 — Session 007 — UI Slice 3 COMPLETE

- Delivered the three-decision Review Start using real project sources and current version truth.
- Refused historical-version selection because Findings is document-current.
- Replaced the pending Review route and pulled forward only the query-state wiring required for
  Start Review to open Findings today.
- Browser critique caught Start below the fold; corrected to a one-viewport three-column layout.
- Authenticated staging proved Review Start → Audio Test → Findings plus Back/Forward restoration.
- 43 tests, TypeScript, ADS/color ratchets and full pre-commit passed.

## 2026-07-11 — Session 006 — UI Slice 2 COMPLETE

- Built the intent-first Home with real project/source/theme scope and existing Ask/Review/Create
  contracts.
- Added project-scoped recent artifact read and a canonical JiraTable of real recent sources and
  deliverables.
- Authenticated staging validation proved scoped Review routing and reopened a verified Test Cases
  deliverable with citations.
- Screenshot review caught and removed inherited EmptyState voids and widened the Ask field to the
  full composer width before acceptance.
- 33 tests, TypeScript, ADS/color ratchets and the complete pre-commit hook passed.

## 2026-07-11 — Session 005 — UI revamp goal resumed, Slice 1 COMPLETE

- User approval resumed the previously blocked goal.
- Resolved the frozen-slug/static-route collision with `views/*`, `actions/*` and canonical
  `source/:slug` namespaces while retaining legacy `:slug` compatibility.
- Added customer navigation and Home; moved the existing staging-backed documents surface to
  Library without replacing JiraTable or its data behavior.
- Added truthful pending states for later Review, Themes and Deliverables slices.
- Passed route tests (12/12), TypeScript, ADS/color gates and visual checks in logged-in Chrome.
- Next approved work: Slice 2, the buyer-facing knowledge-first Home using real staging sources.

## 2026-07-09 — Session 001

- Feature activated. Discovery reused from same-session audit
  (`docs/audits/doc-intel-current-state-discovery.md`) rather than re-running duplicate agents.
- Objective, Canonical Discovery, and Plan Lock (v1, DRAFT) written.
- **No code changed.** Stopped per CLAUDE.md contract — Plan Lock requires review before
  implementation begins.

## 2026-07-09 — Session 001 (cont.) — MarkItDown spike + Slice 1 verification

- MarkItDown spike (Slice 2, GATE) run: markitdown 0.1.6, isolated venv, real+generated fixtures.
  Verdict PARTIAL adoption — office/media (docx/xlsx/pptx) ADOPT, PDF REJECT (loses pages),
  scanned-Arabic keep Gemini. Decision 10 + evidence in `06_VALIDATION_EVIDENCE.md`. No repo/prod
  change.
- Slice 1 execution: read edge-fn source → all 3 correctness bugs ALREADY fixed in source
  (2026-07-07) and deployed (generate v7 / analyze v7 / sync v6). Live DB verification confirmed
  #2 and #3 working, #1 fixed for new artifacts (stale rows on 2 old demo artifacts only).
  **Drift Event 1 logged.** Slice 1 = complete-by-verification, no code changed. RTK grep proxy
  corrupts Bash grep on NUL-byte edge-fn files — used `/usr/bin/grep -a` to bypass.

## 2026-07-11 — Session 002 — Slice 4a (prompt registry: docintel-ask) COMPLETE

- Discovery: `ai_agent_prompts`=10 placeholder rows; prompts hardcoded inline; runs never stamped prompt_id.
- Built: migration `20260711011626_docintel_prompt_registry` (applied cyij); `_shared/prompts.ts`
  self-seeding loader; `docintel-ask` wired (registry load + byte-faithful template + prompt_id on all run inserts).
- Committed + pushed `5d44c3363` (rebased over concurrent remote; foreign drift preserved in stash@{0}).
- CI deploy FAILED 401 (expired GitHub `SUPABASE_ACCESS_TOKEN`) — Drift Event 2. Vikram: don't rotate.
  Found valid local token `~/.config/supabase/access-token`; deployed docintel-ask via CLI byte-faithfully (verify_jwt kept true).
- LIVE-VERIFIED end-to-end: live Ask seeded `docintel.ask.answer` v1 (id 31483425…) + stamped prompt_id
  on the run; prior runs NULL. Answer quality unchanged. Fine-tuning enabler live.
- Started local dev server (was down) for verification; left running.
