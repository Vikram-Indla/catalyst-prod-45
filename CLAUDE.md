# jira-compare — compounding lessons

Append-only. Newest at top. Each entry: date, pattern, rule, surface.

---

## 2026-05-04 — Use jira-compare skill for every new feature built
**Surface:** any new feature implementation
**Pattern:** New features shipped without a jira-compare audit accumulated visual and wiring defects that were only caught later, requiring costly retroactive fixes.
**Rule:** Run the `jira-compare` skill on every new feature before marking it complete. No feature is done until jira-compare passes.

## 2026-05-04 — All outputs must be visual maps with before/after comparison
**Surface:** any audit, diff, or parity report
**Pattern:** Text-only diffs and lists of findings were hard to scan and easy to misread, slowing review cycles.
**Rule:** All outputs (audit results, parity reports, defect summaries) must be presented as visual maps showing the before state (current Catalyst) and after state (target Jira parity) side by side. No text-only findings lists.

## 2026-05-04 — Dark/light mode themes must come exclusively from Atlassian Design System
**Surface:** any theming, color, or token change
**Pattern:** Custom or third-party theme tokens were used for dark/light mode, causing inconsistency with ADS primitives and breaking parity with Jira's own theming.
**Rule:** All dark and light mode theme values must come exclusively from https://atlassian.design/ tokens. No custom color values, no third-party theme libraries for theming. If a token doesn't exist in ADS, raise it with Vikram before inventing one.

## 2026-05-04 — Handover: write Obsidian file + copy-paste block for next conversation
**Surface:** any handover request
**Pattern:** Handovers written as plain markdown docs required manual re-mapping in the next session, losing context and wasting warm-up time.
**Rule:** When a handover is requested: (1) write the full handover to the Obsidian vault, (2) produce a self-contained copy-paste block with all file paths, issue keys, component names, and state mapped — ready to paste as the first message of the next conversation. No context should need to be reconstructed manually.

## 2026-05-04 — Warm-up: read Obsidian files first, fall back to Claude memory
**Surface:** session warm-up / context loading
**Pattern:** Claude memory alone was stale or incomplete between sessions; Obsidian files contain the most recent handover state but weren't being consulted first.
**Rule:** At the start of every session, read the relevant Obsidian vault files before consulting Claude memory. Obsidian is the primary source of truth for session state. Claude memory is the fallback for anything not covered by Obsidian.

---

## 2026-04-28 — Handover items can conflict with in-code prohibitions
**Surface:** any patch listed in a handover
**Pattern:** Handover labelled Story Points as the "highest-asked Story-specific field" and option B for the next round. CatalystSidebarDetails.tsx line 422 has the explicit comment `Story Points: BANNED platform-wide. Do NOT re-add.` plus a JSDoc GUARDRAIL — added 2026-04-16 by Lovable co-authored with Vikram, citing Catalyst spec. The handover was written 12 days later and didn't reconcile with the ban. Following the handover blindly would have re-added a field the spec explicitly removed.
**Rule:** Before implementing any handover-listed feature, grep the codebase for negative directives ("BANNED", "Do NOT", "DEPRECATED", "REMOVED") that mention the feature. If a directive exists, halt and surface the conflict to Vikram. In-code directives win over handovers — they were authored against the live codebase, the handover was a snapshot.

## 2026-04-28 — `cv-*-select__*` DOM classes don't mean non-Atlaskit
**Surface:** any Lane A DOM probe that flags Atlaskit compliance
**Pattern:** I saw `cv-priority-select__control` in the rendered DOM and inferred the priority field bypassed `@atlaskit/select`. Wrong. `@atlaskit/select` is a styled wrapper around react-select and forwards `classNamePrefix` to it. The `cv-` prefix here was a deliberate styling override passed to Atlaskit Select (`classNamePrefix="cv-priority-select"` on line 264 of `EditableFields.tsx`, with `import Select from '@atlaskit/select'` on line 9). The DOM class prefix was a developer choice, not a primitive choice.
**Rule:** Before flagging an ADS-compliance defect from DOM classnames, grep the source for the component's `import` statement. `@atlaskit/select` + custom `classNamePrefix` is fine. Only flag a violation when the component imports `react-select` directly (no `@atlaskit/*` wrapper) or rolls its own dropdown.

## 2026-04-28 — CRUD gate is about data flow on each side, not cross-system parity (sync deliberately off)
**Surface:** Defect (QA Bug) right-rail, BAU-5717
**Pattern:** I treated a Catalyst-vs-Jira data divergence (BAU-5717: Status ToDo vs Ready for QA, Assignee Syed Habib vs Yazeed Daraz) as a P0 defect. Vikram corrected: Catalyst is in functionality-mode, wh-jira-sync is intentionally parked, divergence is expected and the risk is accepted. The CRUD gate's job is to prove data FLOWS through CRUD on each side independently — UI → backend → render — not that the two sides agree.
**Rule:** Don't flag stale data as a defect while sync is parked. CRUD-R diff is informational only, not pass/fail. The gate's pass criteria are: CRUD-C lands a row in each side's backend, CRUD-U writes through and renders after reload, CRUD-D removes the row. Cross-system parity is out of scope for this regime. Pick recently-synced tickets (a couple days old) when you want incidental data alignment, but don't make alignment the test.

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
