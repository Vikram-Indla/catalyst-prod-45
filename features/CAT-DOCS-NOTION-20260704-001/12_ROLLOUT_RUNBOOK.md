# Production Rollout Runbook — Catalyst Wiki + CatyFlow
Branch `feat/CAT-WIKI-CATYFLOW-20260704` · staging = cyijbdeuehohvhnsywig · prod = lmqwtldpfacrrlvdnmld

## Gating summary (how each feature stays dark until you flip it)
| Feature | Gate | Default state | To roll out |
|---|---|---|---|
| **Wiki hub** | RBAC module `wiki` (role-based, `admin_role_module_permissions`) | Un-deprecated but **invisible** until the `wiki` module is granted to a role | Grant `wiki` module to the target role(s) in Access admin — staged per-role |
| **CatyFlow dictation** | `VITE_VOICE_DICTATION_ENABLED` env + `voice_dictation` module flag | **OFF** (both required) | Set `VITE_VOICE_DICTATION_ENABLED=true`, enable `voice_dictation` module |
| **CatyFlow realtime captions** | Gemini Live via `catyflow-token` (uses existing `GEMINI_API_KEY`) | Active once dictation is on | Nothing extra — Gemini key already set; verify first live session (Fable-reserved) |
| **Wiki sandbox** | `import.meta.env.DEV` | Not in prod builds | N/A — dev only |

## Prod database apply (do when ready — deferred per staging-first directive)
Prod has REAL legacy `kb_*` data + known ledger drift, so this is its own careful slice, NOT a blind `db push`.
1. `cat supabase/.temp/project-ref` — must NOT be prod for routine work; link a disposable dir for prod DDL (see CLAUDE.md concurrent-sessions rules).
2. Apply, in order, verifying each: `20260704200000_wiki_workspaces` → `_200100_wiki_pages` → `_200200_wiki_links` → `20260705010000_catyflow_dictionary`.
   - **Watch on prod**: `kb_doc_spaces.project_id` FK targets `kb_projects`; auto-provision INSERTs leave it NULL (container_type/id carry identity). The slug backfill dedupes existing kb docs — review the dedupe on prod's real titles.
3. Record 4 ledger rows (versions above) 1:1 with the files.
4. Deploy edge functions to prod: `catyflow-token`, `catyflow-clean` (need `GEMINI_API_KEY` on prod — confirm it's set).

## Edge functions (staging: DEPLOYED + ACTIVE)
- `catyflow-clean` — register-aware cleanup, Gemini. WORKS today.
- `catyflow-token` — Gemini Live ephemeral-token minter. Minting VERIFIED 200 on staging; first live WS session is the one runtime-unverified step (Fable-reserved).

## Pre-merge checklist
- [x] tsc 183 = baseline (every commit)
- [x] `npm run lint:colors:gate` clean (0 = baseline)
- [x] `npm run build` green (full 39.7k-module production build)
- [x] pure-logic self-test 17/17 (`src/components/wiki-hub/editor/__selftest__`)
- [x] migration files 1:1 with staging ledger
- [ ] **Runtime DOM probes + light/dark screenshots** — BLOCKED on Vikram signing into the MCP Chrome tab
- [ ] First live Gemini realtime dictation session (Fable-reserved; needs sign-in + mic)
- [ ] Remove `WikiSandboxPage` + its DEV route before merge (optional — dev-guarded, invisible in prod)

## Smoke test (post-deploy, per environment)
1. Wiki hub appears for a role with `wiki` granted; `/wiki` lists workspaces.
2. Create workspace page → slash menu → callout/table → @-mention a story → save → story's detail modal shows it under "Pages".
3. Paste a Google-Docs snippet → bold/lists survive (self-test already proves the normalizer).
4. Export markdown + print-to-PDF.
5. Translate a page to Arabic → RTL overlay.
6. With `VITE_VOICE_DICTATION_ENABLED=true`: focus a field → mic CTA appears → dictate English + Arabic → live caption streams → cleaned text inserts.

## Push / PR
22+ commits are LOCAL on the branch. Ready to `git push -u origin feat/CAT-WIKI-CATYFLOW-20260704` and open a PR (CI runs the same gates) — awaiting the go-ahead, as this is the one outward-facing step.

## Rollback
- Wiki: revoke the `wiki` module from roles — instant hide, data intact.
- CatyFlow: `VITE_VOICE_DICTATION_ENABLED=false` — instant off.
- DB: migrations are additive (new columns/tables); no destructive drops. Legacy ADF docs render read-only, untouched.
