# PLAN LOCK — Phase 2 Slice S1: Inbox 2-pane triage

**Feature**: CAT-IDEATION-REBUILD-20260709-001 · **Status**: ✅ APPROVED by Vikram 2026-07-10 (AskUserQuestion: "Inbox 2-pane triage") · **Timebox**: 2h
**Supersedes**: nothing — first Phase 2 slice. Phase 1 (S1–S5) is exit-reviewed complete per 07_HANDOVER.md.

## Objective
Replace the InboxPage empty-state stub with the real 2-pane triage queue (queue list w/ counts + preview pane) per design row C.1 in `features/CAT-IDEATION-DISCOVERY-20260709-001/05_MOBBIN_UX_EVIDENCE.md`, reading live `idn_ideas` rows, so the Mobbin-derived UX is visually verifiable — not just documented.

## Non-scope
No AI Copilot rail, no vote/importance control, no create-modal changes, no merge/duplicate UI, no Portfolio matrix, no Detail page rebuild (stays placeholder), no admin. No new DB migration — this slice is UI + read query only.

## Design evidence (05 §C row 1)
- Intercom inbox: queue-list-with-counts + preview pane → adopt structure.
- Givingli inbox: confirms 2-pane sufficiency for our volume.
- **Explicit departure (09_DECISIONS.md)**: 2-pane, not Intercom's 4-pane — sidebar counts already cover the queue-nav role.

## Canonical components (per hierarchy)
- `JiraTable` (`src/components/shared/JiraTable`) — left pane queue list. Proven fit: schema-driven columns, row-click → selection, compact density.
- `StatusLozenge` (`src/components/shared/StatusLozenge`) — status pill, canonical single-source status color mapping.
- `HubPageHeader`, `EmptyState` — already in use, unchanged.
- No new non-canonical components required for this slice.

## Files to modify
- `src/hooks/useIdeationInbox.ts` (new) — read-only query against `idn_ideas`, `idn_ideas` only (no `ph_ideas*`).
- `src/modules/ideation/pages/InboxPage.tsx` — rebuild as 2-pane.
- `src/modules/ideation/types.ts` — add `IdeaRow` type for the fetched shape.

**Files forbidden**: `src/services/ideationService.ts` (legacy `ph_ideas*`, do not touch/reuse), `src/modules-dormant/**`, any migration file, any file outside `src/hooks/useIdeationInbox.ts` + `src/modules/ideation/**`.

## Data rules
- Zero legacy carryover: query `idn_ideas` only, never `ph_ideas`/`ph_idea_*`.
- Zero-assumption rendering: unknown/missing `problem_statement` renders nothing, not a placeholder lie.
- ADS tokens only; ideation status colors flow through `StatusLozenge`'s existing canonical mapping — no new color logic.
- Demo data: `idn_ideas` has zero rows on staging (S3 seed only touched scoring/workflow/notifications/roles, not idea rows per `20260709160000_idn_seeds_phase1.sql`). To produce a real, non-empty screenshot, this slice seeds a small number (5–6) of realistic `idn_ideas` rows directly on staging via the Supabase MCP connector (not a migration — demo content, not schema). Rows are clearly identifiable as seed/demo content and are left in place for future Phase 2 slices to build against; documented in `06_VALIDATION_EVIDENCE.md`.

## Validation
- [ ] `npm run lint:colors` clean on touched files
- [ ] Screenshot evidence: Inbox with real (seeded) idn_ideas rows, 2-pane visible, status lozenges rendering, via Chrome MCP against a local dev instance with `VITE_ENABLE_IDEATION=true`

## Stop conditions
Any DB schema change needed to satisfy this slice → stop, re-plan (this slice is UI + data-seed only, no DDL).

## Drift / rebaseline
None anticipated — pure additive read path over existing S1 schema.
