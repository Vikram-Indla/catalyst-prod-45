# CAT-HEALTH-ENGINE-20260702-001 — Plan Lock

> Status: CONCLUDED — 2026-07-02. Board, Backlog, Filters, Dependencies: implemented, live-verified, committed (ea0ade4f3). Sprint: implemented, was live-verified before a dev-server restart; Timeline/Release: implemented, type-checked, ADS-clean, but blocked on a pre-existing unrelated bug in the release query (task_2dbda83d — attempted fix did not resolve it). Per Vikram's direction (2026-07-02), Sprint and Timeline/Release are set aside for now — not reverted, just not being chased further this session. Feature concluded on the other 4 modules. See 04_EXECUTION_LOG.md for full per-phase detail.

## Feature Work ID
CAT-HEALTH-ENGINE-20260702-001

## Feature name
health-engine (Phase 0 of 6 — see approved plan at `/Users/vikramindla/.claude/plans/compiled-snuggling-umbrella.md`)

## Timebox
2 hours — one slice.

## Objective
Generalize Board Health (`BoardInsightsPanel.tsx`) into a reusable `<HealthPanel moduleKey>` + `useHealthSignals` facade, fix the real defects found (border-token misuse, missing avatar, missing magenta trigger icon), without touching the underlying scoring logic.

## Business outcome
Board Health ships correct + reusable; Phases 1-5 (Backlog/Filters/Sprint/Timeline/Dependencies) become adapter-only work, no shell rebuild.

## Exact slice
Create `src/features/health/{types.ts, adapters/board.ts, hooks/useHealthSignals.ts, components/HealthPanel.tsx}`. Edit `AttentionItemCard.tsx` (type import + 3 render fixes) and `BoardManagerPage.tsx` (swap mount). Retire `BoardInsightsPanel.tsx`.

## Non-scope
Backlog/Filters/Sprint/Timeline/Dependencies adapters (Phases 1-5, separate feature folders later). No edge function, no DB migration, no `ph_sprints` work (table doesn't exist — see drift log).

## Discovery corrections (read before implementing — changes the original problem statement)
1. **No hardcoded colors exist.** `BoardInsightsPanel.tsx`/`AttentionItemCard.tsx` already use `var(--ds-*)` tokens throughout. The "yellow pill / black divider" look in Vikram's screenshot is a **token-misuse/resolution bug**, not a color-law violation. Real bug: `AttentionItemCard.tsx` line ~42 uses `var(--ds-text-warning)` (a text token) as a `border-left` color for the 'High' risk band — wrong token family. Fix: use an actual border/status token for that band (confirm exact token name against ADS registry at implementation time, do not guess a new one).
2. **Recommendation text is already rule-specific**, not boilerplate (`useBoardInsights.ts` lines 205-216, 6 distinct messages). No new copy work needed — just pass through unchanged.
3. **Current trigger is a plain `Activity` icon** (row-action in `BoardManagerPage.tsx`), not the magenta pulse Vikram wants. Real fix: swap to `CatyPulseIcon` (`src/components/ui/CatyPulseIcon.tsx`) as the open-panel trigger, matching the `CatyBoardInsight` precedent (which is a **separate, unrelated** AI-digest component — do not merge with this).
4. **Assignee is genuinely text-only today** (`<User icon>{name}`, no avatar) — this part of the original complaint is correct. Fix with `CatalystAvatar`/`Avatar`+`Tooltip` (canonical components, see below).

## Canonical components (must reuse, no hand-rolling)
- Drawer/split shell: `src/components/ads/CatalystDrawer.tsx` (existing `BoardManagerPage` flex-split at 38/62 is already the established Catalyst pattern for this row-level case — keep it, do not force into `CatalystDrawer` unless it's already what's under the hood; verify at implementation)
- Avatar: `src/components/shared/CatalystAvatar.tsx` + `src/components/ads/Tooltip.tsx` (combined pattern precedent: `WatchersChip.tsx:155-165`)
- Status/risk pill: `src/components/ads/Lozenge.tsx` / `src/components/shared/StatusLozenge/StatusLozenge.tsx` — risk band already routes through `riskBandAppearance()` in `AttentionItemCard.tsx:20-27`, just correct the appearance mapping, don't invent new pill markup
- KPI tiles: existing pattern matches `KpiCell` in `src/components/product-dashboard/widgets/AtAGlanceWidget.tsx:64-162` — keep current tile structure, it's already aligned
- AI trigger icon: `src/components/ui/CatyPulseIcon.tsx` (props: `size?`, `title?`) — reuse verbatim, no new icon

## Canonical screens
`BoardManagerPage.tsx:229-345` (split-panel mount pattern) is the canonical reference; Phase 1+ (Backlog/Filters/etc.) will each need their own mount point decided in their own Plan Lock — not this one.

## Files to modify
- `src/features/health/types.ts` — new: `HealthKPI`, `HealthAttentionItem`, `HealthSummary`, `HealthResult`, `HealthScope` (discriminated union keyed by `moduleKey`, only `'board'` implemented this phase)
- `src/features/health/adapters/board.ts` — new: wraps `useBoardInsights` unchanged, reshapes output
- `src/features/health/hooks/useHealthSignals.ts` — new: facade, `'board'` wired, other keys stubbed with `console.warn`
- `src/features/health/components/HealthPanel.tsx` — new: generalized panel, `moduleKey` prop, delegates routing via `onOpenItem` prop (no internal `useNavigate`)
- `src/components/boards/AttentionItemCard.tsx` — edit: type import rename to `HealthAttentionItem`, fix border-token misuse, add avatar, add card elevation (`var(--ds-shadow-raised)` or equivalent — confirm exact token exists before using)
- `src/components/boards/BoardManagerPage.tsx` (~line 4, ~336-345) — edit: swap `BoardInsightsPanel` import/mount for `HealthPanel`, swap `Activity` trigger icon for `CatyPulseIcon`

## Files forbidden
- `src/hooks/useBoardInsights.ts` — logic must stay unchanged, adapter absorbs shape differences only
- `src/lib/boardInsightsConfig.ts` — unchanged, scoring weights are out of scope
- `src/components/for-you/atlaskit/CatyBoardInsight.tsx` — separate AI-digest system, do not touch/merge
- Any `ph_sprints` reference — table does not exist, not this phase's problem

## UI/UX rules
- No new hex/rgb/Tailwind color anywhere in `src/features/health/*` (verified currently zero in the files being ported — keep it that way)
- Fix the one border-token misuse; do not introduce new ones
- Top-10 cap stays (existing `maxItemsToShow: 25` in config is more permissive than the UI's display cap — confirm which number is actually enforced at render time, don't assume)
- Face avatar + tooltip on every attention card, no plain name text alone

## Data/backend rules
- Read-only, client-side, same `ph_issues` query shape as today — verified: table exists, RLS allows authenticated read (`wh_issues_select` policy), indexes exist on `due_date`/`jira_updated_at`/`status_category`
- No new table, no new edge function, no new migration this phase

## Integration/wiring rules
- `useBoardInsights` has exactly one direct external call site (`BoardInsightsPanel.tsx`) — confirmed safe to retire in the same slice as adding `HealthPanel`, no dual-mount transition period needed
- `AttentionItemCard.tsx` has zero board-specific imports/routing (confirmed) — keep it standalone, imported by `HealthPanel`, not folded in
- `HealthScope` discriminated union signature must not change shape when Phase 1+ adds members later — Phase 0 only implements the `'board'` variant

## Parallel discovery agents
All seven run and reported: Canonical Component Discovery, Canonical Screen Discovery, UI/UX Critic, Integration Architect, Data/Safety Guard, Implementation Planner, QA/Screenshot Validator. Full outputs logged in `12_AGENT_OUTPUTS.md`.

## Karpathy loop hypotheses
- [LOOP-001] Hypothesis: Board Health has hardcoded/Tailwind color violations → Experiment: read both files fully → Measure: zero violations found, only one border-token misuse → **Discard** original hypothesis, **Keep** narrower border-token fix
- [LOOP-002] Hypothesis: recommendation text is generic boilerplate → Experiment: read `useBoardInsights.ts:205-216` → Measure: 6 distinct rule-driven messages already exist → **Discard**, no action needed
- [LOOP-003] Hypothesis: Sprint (Phase 3) can reuse `ph_sprints` for start/end/capacity → Experiment: check generated Supabase types → Measure: `ph_sprints` does not exist → **Discard**, flag for Phase 3 re-scoping, not blocking Phase 0
- [LOOP-004] Hypothesis: trigger icon is already the magenta pulse → Experiment: read `BoardManagerPage.tsx` trigger → Measure: it's a plain `Activity` icon, pulse icon lives in an unrelated component (`CatyBoardInsight`) → **Keep**: swap to `CatyPulseIcon` as a real Phase 0 fix

## Screenshot checklist
See `10_SCREENSHOT_CHECKLIST.md` (QA agent output): before/after panel closed, panel open KPI row, hovered/expanded card, empty state, assignee avatar before/after. DOM probes for border-color, background-color, box-shadow computed values. Grep + `lint:colors:gate` + `audit:ads:gate` must pass.

## Validation commands
```bash
npx tsc --noEmit
npm run lint:colors:gate
npm run audit:ads:gate
grep -rn --include="*.tsx" --include="*.ts" --include="*.css" \
  -E "(#[0-9a-fA-F]{3,8}|rgba?\(|hsl[a]?\(|bg-(red|green|blue|yellow|orange|slate|gray|amber|emerald|teal|cyan|indigo|violet|fuchsia|rose)-|text-(red|green|blue|yellow|orange|slate|gray|amber|emerald|teal|cyan|indigo|violet|fuchsia|rose)-)" \
  src/features/health/ src/components/boards/
```

## Regression risks
- `BoardManagerPage.tsx` board list / DnD / filters must be unaffected (only the row-action panel mount changes)
- `useBoardInsights` React Query cache key unchanged — confirmed no double-fetch risk since it becomes sole-consumer via the adapter

## Stop conditions
- Any banned color introduced → stop
- Any hand-rolled UI introduced (avatar/lozenge/drawer reinvented instead of reused) → stop
- TypeScript error → stop
- Exact border/shadow token name doesn't exist in ADS registry → stop and ask, do not invent a token

## Rebaseline rules
After one correction loop: accept / split / rebuild / stop+revert.

## Commit rules
Stage explicit files only. Commit message must reference CAT-HEALTH-ENGINE-20260702-001.

## Plan Lock status
IMPLEMENTED — Phase 0 shipped 2026-07-02.
