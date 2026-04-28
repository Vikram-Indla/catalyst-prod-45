# jira-compare — compounding lessons

Append-only. Newest at top. Each entry: date, pattern, rule, surface.

---

## 2026-04-28 — Round 1 cross-type patches: 8 self-contained P0 fixes closed 113 of 253
**Surface:** /allwork list + Defect/Incident/Task/Story views
**Pattern:** Audit produced 253 cross-type findings dominated by 8 root-cause clusters (status pill uppercase, footer count, deep-link, lozenge typography, parent rendering, smart-card crash, description font, page H1). Each fix was tiny but repeated across 7 issue types — fixing once at the shared component closed 24+ findings in one shot.
**Rule:** Before patching one type's view, grep for the same legacy component in OTHER type views — if `WorkItemStatusLozenge`, `CatalystParentLinker`, `AtlaskitRenderer` etc. is shared, one edit shuts down findings on all surfaces. Per-type one-offs are a smell.

## 2026-04-28 — Atlaskit Lozenge needs structural CSS override, not prop fix
**Surface:** any lozenge-using surface
**Pattern:** `@atlaskit/lozenge` v11 renders `<span class="css-X"><span class="css-Y">LABEL</span></span>` where the inner span carries `text-transform: uppercase`, `font-weight: 653`, `letter-spacing > 0`. Modern Jira renders sentence case. The lozenge has no prop to disable transform.
**Rule:** Wrap each lozenge in `<span data-cp-lozenge-jira-parity>` and add a global CSS rule overriding the inner span. Don't try to override via props — they don't exist for typography.

## 2026-04-28 — useItemSelection URL race deletes deep-link param on mount
**Surface:** ProjectAllWorkView (and any consumer of useItemSelection)
**Pattern:** URL-sync effect deleted `?issue=KEY` whenever `activeItemId` was null — but null is the default during first render before items have loaded. Hydration ran on the next tick, but the URL param was already gone, so deep-link landings always fell back to default.
**Rule:** Sync-to-URL deletion must guard on `items.some(i => i.jiraKey === current || i.id === current)` — only delete when the param's value is known-stale. For unmatched values, preserve the param so a late refetch can hydrate.

## 2026-04-28 — /allwork list excludes Epic, Feature, Task — non-Defect types unreachable from this surface
**Surface:** /allwork
**Pattern:** Search "BAU-4466" (Epic), "BAU-3726" (Feature), "BAU-4038" (Task) all returned `0 of 1000`. CatalystViewEpic/Feature/Task.tsx exist in code but are unreachable end-to-end through this navigator.
**Rule:** Audit `useProjectAllWorkItems` query for type-filter / page-cap before claiming a per-type view is testable from /allwork. If the row never appears in the list, route the audit through the surface that DOES include the type.

## 2026-04-28 — v4 skill rewrite: 3-lane logical-parallel model
**Surface:** skill itself
**Pattern:** v3 was 1350 lines, screenshot-mandatory, doc-heavy, single-tool (Chrome MCP only). Loop ran open-ended without a hard cap and without a CRUD acceptance test, so audits closed on visual match alone and shipped wiring defects.
**Rule:** Three lanes (Chrome MCP, Rovo/Atlassian MCP, Computer Use) report OBSERVATION before DIFF. CRUD on a canonical entity is the acceptance gate. Loop capped at 5 cycles. No standalone docs — only prompt blocks, MONITOR block, JIRA bug filings, and lessons here.

## 2026-04-24 — Rovo prompts need full probe payload
**Surface:** any
**Pattern:** Asking Rovo "what primitive is this?" without DOM context wastes a round — Rovo cannot infer from a screenshot alone.
**Rule:** Every Rovo prompt block must include the element's className, computed styles, and data-attrs from the Lane A probe. Rovo gets what Claude saw.

## 2026-04-24 — Visual match is not parity
**Surface:** any
**Pattern:** Surfaces declared "parity-complete" on visual match shipped wiring defects (composer doesn't submit, reaction increments visually but doesn't persist).
**Rule:** CRUD parity at C, R, U, D is the acceptance gate. Visual match without CRUD green is a fail. If a surface has no interactive behaviour in scope, state it explicitly and require Vikram sign-off.

---
