# Handover — CAT-TESTHUB-REBUILD-20260704-001

**State (2026-07-05): Phase A DONE · Phase B DONE · Phase B2 DONE (Gate B feedback resolved) · re-holding at Gate B.**
Standing directive: **UI/UX must be best-in-industry — non-removable acceptance criterion.**

## Phase B2 (Gate B feedback) — all four concerns resolved + verified live
1. Double sidebar → GONE. LabShell = top tab strip (ProjectTabBar grammar); only app sidebar remains. VERIFIED (DOM probe: one nav rail, zero 232px lab rail).
2. Feature loss fear → REVERSED + PROVEN. Board/Timeline/Dependencies/Filters KEPT+uplifted. `docs/testhub-enterprise-rebuild/01_WORLDCLASS_FEATURE_MATRIX.md`: §1 52 rows 0-dropped, §2 265-row matrix, §3 15 differentiators, §4 38/38 competitor gaps phase-justified, §5 honesty rules.
3. Real data → all 7 screens read LIVE cyij staging via labLiveData.ts (12 hooks). VERIFIED: 92 cases, real cycles RVCYC-001/002/003, real gates 69.2/89.7, real signoffs (Khalid Alzahrani etc.), graph shows real case keys not UUIDs.
4. World-class scope → feature matrix is the contract.
- 16 fresh light+dark screenshots (single-sidebar + live data proof), all sane 545–770K, URL-verified per shot.
- Gates: tsc 0, color 0=baseline, zero mock refs, zero DB writes except user inline-add.
- Post-screenshot polish applied (tsc-clean, not re-shot): humanized "unlinked release gates" copy (CommandCenter+ReportCenter), graph fitViewOptions padding + minZoom, Traceability real case-key resolution.

## Phase B2b (design-critique nav-duplication fix) — 2026-07-05
Vikram: "UI/UX is complete duplicated." RCA: CatalystShell.tsx:551 `startsWith("/testhub")` matched `/testhub-lab` → production TestHubSidebar rendered alongside lab top tab strip = two navs. Earlier top-strip "fix" treated symptom, not cause.
FIX: CatalystShell suppresses production TestHubSidebar on /testhub-lab (isTestHubLabRoute guard) + renders lab's own `src/pages/testhub-lab/TestHubLabSidebar.tsx` (reuses canonical SidebarBase; 7 walkable screens + "In the rebuild" section = full kept IA phase-badged D–H). Top tab strip removed from LabShell.
VERIFIED live: 1 left rail, 0 top strips, 0 production sidebars. tsc 0, color 0=baseline. design-critique 18/30→28/30 SHIP.
Files touched: CatalystShell.tsx (production — sidebar routing), + testhub-lab/{TestHubLabSidebar.tsx new, LabShell.tsx}. Note: CatalystShell is now a permanent prototype dependency until Phase C folds the lab in or removes it.

## Outstanding polish (for production phases, none blocking)
- ads/DropdownMenu.tsx:32 prop leak (triggerRef/isSelected/testId → DOM) — canonical, Phase C one-line fix.
- Repository Owner avatar + Steps count render blank though data exists (60/92 have owners) — resolution display bug, Phase D.
- Traceability requirements mostly "Untitled" (staging data gap) — show key-only when title absent, Phase F.
- @atlaskit/select legacy-context warning (library-level).
- App rail collapsed(light)/expanded(dark) default inconsistency — session artifact, not our code.

## What exists
- Blueprint: docs/testhub-enterprise-rebuild/00_DISCOVERY_FITMENT_BLUEPRINT.md (25 sections, fitment matrix, 108 challenges, roadmap A–I). Evidence: evidence/00–08.
- Prototype: /testhub-lab (route in FullAppRoutes.tsx, lazy, ModuleGated, no nav entry). 12 files under src/pages/testhub-lab/ — LabShell, labMockData, labTokens, index + 7 screens.
- Screenshots: 16 genuine light+dark PNGs in screenshots/ (verified: correct tab, correct theme, no screensaver frames — see saga below).
- Docs: 03_PLAN_LOCK, 04_EXECUTION_LOG, 05_UI_UX_REVIEW, 06_VALIDATION_EVIDENCE, 08_DRIFT_LOG, sessions/001–002.

## Gates status
tsc 0 errors · lint:colors:gate 0=baseline · all 7 screens render, 0 runtime errors · interactions verified live (inline add, fail→defect, scope flip, keyboard) · theme restored light.

## Known items for production phases
- ads/DropdownMenu.tsx:32 leaks triggerRef/isSelected/testId to DOM on function-form triggers (canonical — Phase C one-line fix).
- Atlaskit dropdown menu with element/string trigger positions at viewport top-left in one ScopeBuilder context (known popper-in-overflow class of bug; production uses ProfilePicker/StatusLozengeDropdown patterns which already solve it).
- Reports lazy chunk paint delay (vendor-charts parse) — Suspense fallback now tokenized; Phase G: preload or skeleton.
- Lab tables reproduce JiraTable grammar; Phases D/E MUST swap to real JiraTable (drift #1).
- OS scrollbar light-on-dark → Phase I color-scheme property.

## Screenshot capture protocol (LESSONS — reuse next time)
1. `screencapture` shoots the VISIBLE tab, not Chrome MCP's managed tab → before every shot: osascript loop to set active tab by URL match + print-verify active-tab URL.
2. macOS LOCK SCREEN (aerial wallpaper) poisons captures; `caffeinate -u` does NOT dismiss it. Keep `caffeinate -dis` running for session; if CGSSessionScreenIsLocked=true, captures are impossible until user unlocks — stop and say so.
3. Sanity band: genuine app shots ~500K–1.5M; multi-MB = screensaver/photo, uniform ~470K duplicates = wrong-tab clones. Spot-check PNGs with Read after any capture batch.
4. Theme = server-persisted (user_theme_preferences); toggle via aria-label "Switch to dark mode" + FULL reload; always restore light.

## Next action (after Gate B approval)
Phase C — Foundation: Space context provider (kill hardcoded UUID), breadcrumbs, nav v2 + redirects (needs Q1 answer), dashboard FK fix, D1 migrations, D3 sprint-FK verification, DropdownMenu wrapper fix. Open questions §23 of blueprint (Q1 nav pruning, Q2 scenario model, Q3 sprint source, Q4 split pane).
