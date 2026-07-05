# Phase C Handover — CAT-TESTHUB-REBUILD-20260704-001

Status: DEV-COMPLETE in working tree (uncommitted). tsc clean, color gate 0=baseline 0. NOT committed (concurrent chat-v2 session changes share the tree — stage explicit list only).

## The 5 user directives — status

### 1. "300+ defects on UI/UX/wiring/linkages — investigate, inspect, fix"
Root cause found: **seed-vs-real project split** — operational surfaces read `useProjects()[0]` = "Demo Project" seed (12 cases) instead of real "Senaei BAU" (92). One wiring bug produced most "wrong data / empty / linkage" defects.
Fix: new resolver `src/hooks/test-management/useTestHubProject.ts` (ranks active project by test-case volume, localStorage-switchable). Rewired every operational surface. 74 catalogued defects; P0/P1 fixed across Waves 1–3. Register: `01_defect_register.md`.

### 2. "I don't see linkages of test artefacts to project work item types"
- `TestCoveragePanel` now mounted on Story/Feature/Epic detail views (was absent) — L001. Epic/Feature roll up child keys via ph_issues.parent_key.
- Traceability page: dead snapshot text → live ph_issues join (56/56 links match, verified).
- Defect detail → "Raised from test case" source linkage (D043).
- Requirement-link picker widened to Story/Epic/Feature/Task/BR/Production Incident.

### 3. "All create modals must match create story modals from project module"
TestHub create flows unified through canonical `CreateStoryModal`: added 'Test Case' + 'Test Set' work types, wired the dead "+ Create case", CycleModal native selects/dates → ADS Select + DatePicker.

### 4. "True high-quality AI test artefacts from work items, defects, incidents (not cheap)"
New edge fn `supabase/functions/ai-generate-test-artefacts/index.ts` — **Claude claude-opus-4-8**, adaptive thinking, structured JSON output, 3 source modes (work_item / defect / incident) with server-assembled context (ACs, children, existing-case dedup, traceability covers[], coverage_map, gaps, rationales). Frontend rewired (`useAIGeneration`, `AIGenerateTestCasesDialog`, `TestCasesSection`); removed DEFAULT_TYPE_ID fabrication (per-case type map, null when unknown).
**ACTIVATION REQUIRED (Vikram):** deploy the fn + set `ANTHROPIC_API_KEY` secret on cyij. Will 500 until then. (Vikram shared a GEMINI key — that's for legacy Gemini fns, NOT this. Recommendation: keep Claude.)

### 5. "Sprints read from project module sprints section, driven by field sprint/iteration"
Canonical = `ph_jira_sprints` (30 live). Story sprint reads `ph_issues.sprint_release` JSONB name-join (L006). Cycle picker reads ph_jira_sprints only. `iterations` = empty SAFe model, never wired.

## Landed to origin/main
- `798da180e` — Phase C main (45 files).
- `c2f1b1128` — D059 dependency titles + native task/incident requirement links (4 files).
- AI edge fn `ai-generate-test-artefacts` DEPLOYED to cyij (ACTIVE v2). Only ANTHROPIC_API_KEY secret remains.

## Deferred (need a decision / out of safe scope)
- **D005** command-center "pulse" overlap = actually the global Caty **ChatDock FAB** (`src/components/chat/dock/useDraggableFab.ts`) with a stale `localStorage['catalyst-fab-position']`. Owned by the chat-v2 subsystem (another session's dirty files) — NOT edited. Fix: clamp/validate persisted FAB position on load.
- **D059** — DONE (c2f1b1128). Per-adapter `displayKey`/`href` on the shared diagram contract; issue hubs never set the fields so they hit the unchanged fallback. Live-verified.
- **requirement_type CHECK** (`tm_requirement_links`) — DONE 2026-07-05. Migration `20260705021435_tm_req_links_allow_task.sql` added 'task' on cyij ('defect'/'incident' were already present). Picker still writes Task via 'external' path — making it write native 'task' is trivial follow-up polish.
- **Key padding at DB level**: `tm_next_entity_key` (4-digit) vs `generate_defect_key` (3-digit) disagree for NEW keys. Display normalized via `formatTestKey.ts`; stored data NOT rewritten; RPC/trigger reconciliation is a migration decision.

## Verify
- `npx tsc --noEmit` → clean. `npm run lint:colors:gate` → 0=baseline 0.
- `npm run audit:ads:gate` shows spacing +2 — pre-existing (dock.css + Storybook, other-session), NOT TestHub files.
- Live DB proofs: `05_LIVE_VERIFICATION.md`.

## Commit note
Working tree also holds ~13 chat-v2 files from a concurrent session. Stage ONLY the ~30 TestHub files + 2 new hooks + edge fn + evidence docs (explicit list in git status filtered by testhub/test-management/kanban/Timeline/create-story/dashboard). Never `git add -A`.
