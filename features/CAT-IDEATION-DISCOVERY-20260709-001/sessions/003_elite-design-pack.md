# Session 003 — 2026-07-09 — Elite design pack (/goal)

**Directive**: extend `03_GREENFIELD_REBUILD_BLUEPRINT.md` (design of record, greenfield, no legacy carryover) into an elite design pack: verdict, feature inventory, mock screens, visual direction + icon decision, native-fit proof, AI blueprint detail, 9 phases, greenfield safety, blind spots, binary acceptance criteria. No code.

**New evidence gathered this session** (shell seats for the module already exist as platform chrome):
- `icons.registry.ts:148,159,371-392` — hub icon slot `ideation` + `assets/icons/hubs/ideation.svg` (+outline)
- `HubSwitcher.tsx:9,72` — DISCOVER section seat (Home, Strategy, Ideation); entry currently `deprecated: true, moduleKey: 'product'` — must be repointed
- `CatalystShell.tsx:127-130,242,416-420` — ideation sidebar lazy mount, hub-home map, route detection
- `IdeationSidebar.tsx` — legacy sidebar (config swaps in rebuild); header documents peer-hub rationale; flags SidebarBase mixed-icon (Atlaskit+lucide) ADS debt
- `ContextSwitcher.tsx:600-605` — `?create=1` deep-link convention for "+ New …" entries
- `@atlaskit/icon/core/lightbulb` + `lightbulb-filled` verified installed

**Output**: `04_ELITE_DESIGN_BLUEPRINT.md` — sections A–J. Highlights: verdict = 03 sound but not premium-proven (6 gaps, all closed); 24-feature P0/P1/P2 inventory with per-row benchmark+Catalyst evidence; 11 mock screens with ASCII wireframes and full per-screen contracts; icon decision = core lightbulb (+hub SVGs), 2 alternatives rejected with reasons; native-fit proof table (17 interactions → file:line); AI copilot release gates (dupe P≥0.8/R≥0.7 etc.); phases 0–8 with exit criteria/screenshots/tests/risks/rollback; greenfield safety (no legacy reads, additive schema, flags, no re-migration); 10 new blind spots (incl. HubSwitcher mis-key, URL-collision during dark launch, eval-set sourcing under the no-legacy rule); binary acceptance checklist.

**Open for Phase 0 (design lock)**: chart library audit; BR terminal-event source; global-create shell touchpoint; AR translation workflow; GovernedEnvelope approver mapping; dark-launch URL strategy (`/ideation-next` vs decommission-first).

## Addendum (same day) — Mobbin iteration (/goal v2)
- Mobbin MCP: Not Confirmed — none connected, none in MCP registry. Fallback: public Mobbin catalog research (sonnet agent, delegation-guard enforced).
- Output: `05_MOBBIN_UX_EVIDENCE.md` (Design Pack v2 addendum): Mobbin Evidence Board (8/11 screens with named Mobbin refs, all graded mobbin-indexed due to bot-block), per-screen inspiration lines, verdict + acceptance deltas, 3 new blind spots.
- Confirmed absent from Mobbin: Atlassian/Jira, Canny/Featurebase/Frill/Sleekplan, any 2D prioritization scatter, any merge-preview flow → those surfaces governed by official-doc benchmark evidence (02 §C), declared per-row.
- External validation gained: single-screen create (Linear New Issue Input), detail layout (Linear Issue Detail). Documented departure: multi-card AI suggestion stack vs Notion single-answer panel.
- Phase 0 additions: live-Mobbin verification of 4 rows; swipe-triage usability check moved to Phase 7 gate.

## Correction (same day) — true Mobbin MCP pass (v2.1)
- Vikram confirmed Mobbin MCP was connected; tools verified live (mobbin.search_screens). v2.0 web-fallback addendum was WRONG in 3 places and has been fully superseded.
- Corrections: merge preview FOUND (Salesforce Compare Leads field-survivor radios; folk Duplicates cards); prioritization scatter FOUND (TheyDo Opportunities Matrix with configurable axis dropdowns); Canny IS on Mobbin (roadmap table w/ votes+impact+score, public board, upvote list).
- All 11 surfaces + feedback-tool class now image-verified (12 batched MCP searches).
- 6 spec refinements adopted from images: Copilot as Details|Copilot rail tab on detail (Intercom); Save-as-draft + "Create more" on create modal (Linear); Field/Funnel toggle + coached empty state (TheyDo); "Don't merge" recorded decision (folk); fixed swipe defaults w/ config deferred (Asana/Spark); persistent AI disclaimer line (WRITER).
- New blind spot: rail-tab Copilot width on 13" laptops → Phase 2 screenshot gate.
- Lesson: when an MCP tool is expected but absent, ask the user before falling back — deferred-tool lists can lag connection state.
