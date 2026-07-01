# Plan Lock — CAT-BOARDS-HEALTH-20260701-001

**Status:** APPROVED  
**Timebox:** 2 hours  
**Date:** 2026-07-01

---

## Objective
Split-panel Board Health / Insights on the boards list page.

## Non-scope
- Portfolio/cross-board view
- URL state for panel open/close
- AI narrative layer (extension point only)
- Changes to kanban board page itself
- New Supabase schema
- Sprint end date risk (field not available — surface as gap)

---

## Files to modify

| File | Change |
|---|---|
| `src/components/boards/BoardManagerPage.tsx` | Add Health column; make icons always-visible; add split-panel state; wire ⬡ icon |
| `src/types/board.ts` | Add `BoardHealthSummary` type |

## Files to create

| File | Purpose |
|---|---|
| `src/hooks/useBoardInsights.ts` | Scoring hook — fetch ph_issues for board + compute attention scores |
| `src/lib/boardInsightsConfig.ts` | Configurable weights + thresholds |
| `src/components/boards/BoardInsightsPanel.tsx` | Right panel UI — stats, filters, attention cards |
| `src/components/boards/AttentionItemCard.tsx` | Individual attention item card |

## Files to mark deprecated (no delete)

| File | Change |
|---|---|
| `src/components/for-you/atlaskit/CatyBoardInsight.tsx` | Add `@deprecated` JSDoc comment at top |

---

## Scoring signals available (confirmed fields only)

| Signal | Field | Weight |
|---|---|---|
| Flagged | `is_flagged = true` | +35 |
| Overdue | `due_date < today AND status_category != 'done'` | +30 |
| Due within 1d | `due_date - today <= 1` | +22 |
| Due within 3d | `due_date - today <= 3` | +15 |
| Due within 7d | `due_date - today <= 7` | +8 |
| Stale 7d+ | `today - jira_updated_at > 7` | +15 |
| Stale 3d+ | `today - jira_updated_at > 3` | +8 |
| Status at risk | status text contains "on_hold"/"blocked"/"hold" | +20 |
| Status above 2× board median stale | dynamic | +12 |
| Unassigned + high/critical priority | `!assignee_user_id AND priority in (critical,high)` | +20 |

Priority multiplier: critical=1.35, high=1.20, medium=1.00, low=0.85  
Status multiplier: done/cancelled→exclude; on_hold/blocked→1.30; active→1.00  
Cap: 100. Show items with score ≥ 20.

**Sprint risk: NOT AVAILABLE** — `sprint_name` is text only, no end date. Surface as capability gap in UI.

---

## UI rules
- Health column: dot (red/amber/green) + count — always in table
- Icons: ⬡ ⚙ 🗑 — always visible (remove opacity-transition hover-only CSS)
- Split: 38% left / 62% right — CSS Grid, local state, no router change
- Active row: blue left border + "VIEWING HEALTH ↗" sublabel
- Panel close: restores full-width
- Board switching: swap in-place (no close/reopen)
- Below 1280px: full-overlay slide-over fallback
- Zero bare hex — `var(--ds-*)` only
- Risk badges: `@atlaskit/lozenge` or `var(--ds-background-*)` + `var(--ds-text-*)`
- ADS lint gate before commit

---

## Validation commands
```bash
npx tsc --noEmit
npm run lint:colors:gate
npm run audit:ads:gate
```

## Screenshot checklist
- [ ] Boards list full-width (Health column visible, 3 icons always visible)
- [ ] Panel open for BAU board (split 38/62, active row highlighted)
- [ ] Attention cards showing (risk band, reason, recommended action, deep link)
- [ ] Board summary stats row
- [ ] Filter bar (All / Critical / High / Overdue / Blocked / Unassigned)
- [ ] Panel closed (full-width restored)
- [ ] Board switching (click different ⬡, panel swaps in-place)
- [ ] Empty state (board with no attention items)
- [ ] 1280px viewport (no overflow/clip)

## Stop conditions
- TypeScript errors → fix before continuing
- ADS lint gate fails → fix before commit
- Any bare hex in touched files → stop and fix
