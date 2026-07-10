# Session 002 — 2026-07-09 — Greenfield rebuild directive

**Directive from Vikram**: wipe the entire existing Ideation module; carry zero inventory, artifacts, or implementation; design fresh for implementation. Not influenced by legacy UI, concepts, or functionality.

**Action**: authored `03_GREENFIELD_REBUILD_BLUEPRINT.md` — the new design of record:
- First-principles mandate (10 derived requirements, each traced to platform or benchmark evidence — none to legacy)
- New module identity: `ideation` module key (decoupled from ENABLE_AI), Inbox-first routes, IDEA-N keys + slugs
- All-new `idn_*` schema: narrow idea core; normalized evidence / votes-with-importance / governed scoring framework (models+drivers+scores, GovernedEnvelope-versioned) / AI suggestion ledger / conversion edge table
- Lifecycle on the canonical `ph_wf_*` workflow runtime (module owns no state machine); 3 new guards; RLS-enforced terminal locks; auto-Delivered on BR completion
- AI copilot (`ideation-copilot` edge fn) designed in from day one — suggest-only, evidenced, confidence-scored, eval-harness gated
- Conversion targets `business_requests` (MIM-N) with backlink + live rollup
- IdeationHub notification event set; Caty idea persona; voice + docintel intake channels
- EN/AR + RTL at launch; pure ADS tokens (no Astryx)
- §12 decommission inventory (routes, 8 pages, dormant folder, CatalystViewIdea, 2 hook sets, 3 services, ph_ideas + 8 satellites + 9 views) — destructive; requires explicit sign-off incl. legacy data disposition
- 9-phase build sequence, each 2h-sliceable, Plan Lock per slice

**Status**: research complete; no code. `02_CANONICAL_DISCOVERY.md` advisory superseded; retained as platform evidence + benchmark.
**Next**: Vikram review → `activate feature` for Phase 1 (foundations) Plan Lock; separate sign-off needed for the decommission slice and legacy-data disposition.
