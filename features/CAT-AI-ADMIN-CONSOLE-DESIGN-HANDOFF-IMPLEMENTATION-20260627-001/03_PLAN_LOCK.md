# CAT-AI-ADMIN-CONSOLE-DESIGN-HANDOFF-IMPLEMENTATION-20260627-001 — Plan Lock

> Status: **DRAFT — awaiting Vikram approval**
> No implementation until status is changed to APPROVED.

---

## Feature Work ID
CAT-AI-ADMIN-CONSOLE-DESIGN-HANDOFF-IMPLEMENTATION-20260627-001

## Feature name
AI Admin Console — design handoff implementation

## Timebox
2 hours (one slice: UI layer only)

## Objective
Replace the existing 3-column AI Admin cockpit at `/admin/ai-assistant` with the high-fidelity 2-column design from `/Users/vikramindla/Downloads/design_handoff_ai_admin_console/`.

## Business outcome
Admin console has a pixel-accurate, ADS-compliant UI matching the approved design handoff — responsive 2-col layout, inline autocomplete palette, inline confirmation bar, animated execution feed, command library with search/tabs.

## Exact slice
UI layer only: drop in all 10 handoff code files, delete 9 old components, wire the new hook to simulated timers (no real API calls). `useAiCommandConsole.ts` hook runs simulated execution for this PR.

## Non-scope
- Edge function changes (no plan_id, no admin_audit_log, no 409 conflict detection)
- Data layer wiring (real API calls replace simulated timers — separate PR)
- Module access command executability (RLS blocks super_admin writes — separate PR)
- Recent activity real data (AiRecentActivity uses demo entries — live DB read is separate PR)
- Any route changes (`/admin/ai-assistant` stays unchanged)
- `useAdminAiAssistant.ts` in src/hooks/ — untouched (keep in place)

## Canonical components selected

| Component | Import | Notes |
|-----------|--------|-------|
| Button | `@/components/ads` | primary/default/subtle/danger, iconBefore/iconAfter |
| Lozenge | `@/components/ads` | success/moved/removed/inprogress/new/default, isBold |
| Textfield | `@/components/ads` | elemBeforeInput (search in library) |
| Spinner | `@/components/ads` | size="small" (not used — handoff uses custom SVG animated icon) |
| AdminGuard | `@/components/admin/AdminGuard` | wraps entire page, unchanged |

**Approved deviation:** Raw `<input>` in AiCommandComposer for the 48px composer field. Textfield API maxes at 40px; custom 2px focus border transition not in API. CLAUDE.md banned list does not cover single prompt input fields. Aria-label present, keyboard handling complete.

## Canonical screens
- Route: `/admin/ai-assistant` (unchanged, lazy in FullAppRoutes.tsx)
- Pattern reference: AdminAccessPage.tsx (bare `<h1>`, `<p>` subtitle, no colored header badges)

## Files to CREATE (NEW)

| File | Source |
|------|--------|
| `src/components/admin/ai-assistant/aiAdminConsole.types.ts` | handoff `types.ts` |
| `src/components/admin/ai-assistant/tokens.ts` | handoff `tokens.ts` |
| `src/components/admin/ai-assistant/icons.tsx` | handoff `icons.tsx` |
| `src/components/admin/ai-assistant/aiCommands.catalog.ts` | handoff `catalog.ts` (renamed) |
| `src/components/admin/ai-assistant/RiskLozenge.tsx` | handoff `RiskLozenge.tsx` |
| `src/components/admin/ai-assistant/useAiCommandConsole.ts` | handoff `useAiCommandConsole.ts` |
| `src/components/admin/ai-assistant/AiActivityFeed.tsx` | handoff `AiActivityFeed.tsx` |
| `src/components/admin/ai-assistant/AiSidePanels.tsx` | handoff `AiSidePanels.tsx` |

## Files to REPLACE (full rewrite)

| File | Change |
|------|--------|
| `src/components/admin/ai-assistant/AiCommandComposer.tsx` | handoff `AiCommandComposer.tsx` |
| `src/pages/admin/AiAccessPage.tsx` | handoff `AiAccessPage.tsx` |

## Files to DELETE (old components, no consumers)

```
src/components/admin/ai-assistant/AiActionPlanPanel.tsx
src/components/admin/ai-assistant/AiAdminStatsStrip.tsx
src/components/admin/ai-assistant/AiCommandHeader.tsx
src/components/admin/ai-assistant/AiCommandLibrary.tsx
src/components/admin/ai-assistant/AiConversationTimeline.tsx
src/components/admin/ai-assistant/AiConfirmationModal.tsx
src/components/admin/ai-assistant/AiExecutionProgress.tsx
src/components/admin/ai-assistant/AiRecentActions.tsx
src/components/admin/ai-assistant/aiAdminAssistant.types.ts
```

## Files forbidden
- `src/hooks/useAdminAiAssistant.ts` — do NOT touch
- `src/routes/FullAppRoutes.tsx` — do NOT touch (route unchanged)
- `supabase/functions/ai-admin-assistant/index.ts` — do NOT touch (out of scope)
- Any migration files

## Import path adjustments required
When copying handoff files, change these relative imports:

| Find | Replace |
|------|---------|
| `from './catalog'` | `from './aiCommands.catalog'` |
| `from './types'` | `from './aiAdminConsole.types'` |

All other relative imports (`./tokens`, `./icons`, `./RiskLozenge`, `./useAiCommandConsole`, `./AiCommandComposer`, `./AiActivityFeed`, `./AiSidePanels`) resolve correctly.

## Implementation order (strict)

1. Create `aiAdminConsole.types.ts`
2. Create `tokens.ts`
3. Create `icons.tsx`
4. Create `aiCommands.catalog.ts` (adjust `from './types'` → `from './aiAdminConsole.types'`)
5. Create `RiskLozenge.tsx` (adjust `from './types'` → `from './aiAdminConsole.types'`)
6. Create `useAiCommandConsole.ts` (adjust both imports; keep simulated timers)
7. Replace `AiCommandComposer.tsx` (adjust imports)
8. Create `AiActivityFeed.tsx` (adjust imports)
9. Create `AiSidePanels.tsx` (adjust imports)
10. Replace `AiAccessPage.tsx` (adjust imports to use `@/components/admin/ai-assistant/*`)
11. Delete 9 old files
12. Run `npx tsc --noEmit` + `npm run lint`
13. Screenshot SS1 (idle state)

## UI/UX rules

- All colors via `var(--ds-*)` tokens — zero hardcoded hex in component code
- Fallbacks in `tokens.ts` only (legitimate ADS pattern)
- Raw `<input>` in AiCommandComposer is approved (see Canonical components)
- Scoped CSS in `<style>` block inside AiAccessPage for keyframes + responsive breakpoint only
- All other styling inline (no external CSS files, no Tailwind)
- No colored badges in page `<h1>` header
- AdminGuard must wrap page content
- No second sidebar, no AdminLayout wrapper
- `prefers-reduced-motion` respected via CSS in the `<style>` block (already in handoff)

## Data/backend rules

- `useAiCommandConsole.ts` keeps simulated timers — no real Supabase/edge function calls
- No DB reads added in this PR
- No RLS-dependent queries in new components (AiRecentActivity demo data is hardcoded)
- No migration files

## Integration/wiring rules

- Route stays `/admin/ai-assistant`
- AiAccessPage default export unchanged (lazy import in FullAppRoutes still works)
- AdminGuard import path unchanged: `@/components/admin/AdminGuard`
- ADS imports all via `@/components/ads` barrel

## Parallel discovery agents
All 7 agents ran 2026-06-27 before this Plan Lock. Results in 12_AGENT_OUTPUTS.md.

## Karpathy loop hypotheses logged
- LOOP-001: ADS imports compatible — KEEP ✓
- LOOP-002: Raw input justified — KEEP ✓
- LOOP-003: Backend wiring out of scope — DISCARD ✓
- LOOP-004: Import renames needed — KEEP with modification ✓
- LOOP-005: Delete all old files — KEEP ✓
- LOOP-006: Module access non-executable — DISCARD (noted) ✓

## Screenshot checklist

- [ ] SS1 — Idle: composer + quick chips visible, status "Ready" (Lozenge default), activity empty
- [ ] SS2 — Palette open: typed text, grouped commands visible below input
- [ ] SS3 — Palette empty: unmatchable text, discovery prompt, status "New request"
- [ ] SS4 — Chip selected: input pre-filled, status "Ready to run"
- [ ] SS5 — Inline confirm: High-risk command, danger bar visible
- [ ] SS6 — Thinking phase: indeterminate bar, "Understanding your request…"
- [ ] SS7 — Steps phase: 4 checkpoints, step 2 active, determinate bar ~50%
- [ ] SS8 — Completion: green history card, Done Lozenge, audit ID row, buttons
- [ ] SS9 — Library search: right-rail filtered by typed term
- [ ] SS10 — Bulk tab: Bulk tab active (blue), bulk-tagged commands visible
- [ ] SS11 — Dark mode idle: all tokens inverted, no bare colors visible

SS1 required before commit. SS2–SS11 require interactive session (note: hook is simulated, so SS5–SS8 need simulated flow to run).

## Validation commands

```bash
npx tsc --noEmit
npm run lint
```

## Regression risks

1. **FullAppRoutes lazy import** — AiAccessPage default export must remain. Risk: LOW (we rewrite the file but keep the default export).
2. **useAdminAiAssistant.ts** — kept untouched. Risk: NONE.
3. **AdminGuard** — must remain as top-level wrapper. Risk: LOW (already in handoff AiAccessPage).
4. **Old component deletion** — if any component was imported elsewhere. Risk: LOW (Screen Discovery confirmed no external consumers).

## Stop conditions

- Any hardcoded hex in component code → stop
- Any hand-rolled table/dropdown/modal/sidebar → stop
- TypeScript error → stop
- AdminGuard removed or route changed → stop
- Any edit to useAdminAiAssistant.ts or FullAppRoutes.tsx → stop

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert. No endless patching.

## Commit rules
Stage explicit files only. Never `git add -A`. Commit message must reference `CAT-AI-ADMIN-CONSOLE-DESIGN-HANDOFF-IMPLEMENTATION-20260627-001`.

---

## Plan Lock status
**APPROVED — 2026-06-27. Implementation may proceed.**
