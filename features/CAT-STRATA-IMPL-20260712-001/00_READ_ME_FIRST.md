# CAT-STRATA-IMPL-20260712-001 — READ ME FIRST

**Purpose:** Implement the STRATA Locked-V1 design pack (28 anchors) into `catalyst-prod-46`,
phase by phase, against existing STRATA pages.

**Design authority (read-only source):**
- claude.ai design project `e8a6bad6-1868-4b84-96bf-d6d49474b58a` ("Strata design brief", owner JK)
- Access via `DesignSync` (`get_file`) — anchors under `anchors/NN *.dc.html`, plus
  `HANDOFF.md` and `STRATA Design Proposal.dc.html` (§13 layout, §14 interaction, §17 roles,
  §18 component APIs, §19 specs, §20 acceptance).
- In-pack `HANDOFF.md` == the pasted work order (verified byte-identical 2026-07-12).

## HARD PROTECTIONS (zero change)
1. **`/strata/strategy/map` (`src/modules/strata/pages/StrataStrategyMapPage.tsx`)** — zero
   visual or behavioral change. Anchor 02 designs only the shell around it.
2. **Sidebar (`src/components/layout/EnterpriseSidebar.tsx`) + top nav** — VISUAL FROZEN.
   Permitted: Phase-0 IA relabel into task-sequence groups + additive routes + legacy
   redirects. No restyle, no token swap, no layout shift. (User decision, 2026-07-12.)

## NON-NEGOTIABLE RULES
- Canonical components only (JiraTable, CatalystViewBase/CatalystSidebarDetails,
  ProjectPageHeader hubType="strata", HubSurface, StrataDecisionModal, @atlaskit).
- **No design-token contamination — resolved at runtime.** Anchor hex = stand-ins for existing
  `--ds-*` tokens. Nothing raw (hex/rgb/hsl/Tailwind color utils/named colors/local color maps/
  hex fallbacks) enters the codebase. Gated by `lint:colors:gate` + `audit:ads:gate`.
- State taxonomy, navigation contract, rules-of-meaning per HANDOFF §3/§5/§6.

## STATE
- Branch: to be created off `origin/main` before any code (currently on shared `main`).
- Discovery scope: **Phase 0 (shared foundations) + Phase 1 (executive core)** only.
- Gate: STOP after `03_PLAN_LOCK.md` — no code until Vikram approves.

## READ ORDER FOR CONTINUATION
00 (this) → 01_OBJECTIVE → 03_PLAN_LOCK → 07_HANDOVER → 08_DRIFT_LOG → 09_DECISIONS →
11_KARPATHY_LOOP_LOG → latest `sessions/`.
