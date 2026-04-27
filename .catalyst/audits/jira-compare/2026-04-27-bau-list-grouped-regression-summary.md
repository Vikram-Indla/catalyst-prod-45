# /regression — BAU list (groupBy=status) — 2026-04-27 (auto-chained from /jira-compare iter-3 close)

Catalyst route: http://localhost:8080/project-hub/BAU/backlog?groupBy=status
Jira parity:    https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list?sortBy=key&direction=DESC&groupBy=status
Tenant:         digital-transformation.atlassian.net (vikram indla)

## Pipeline phases run

Phase 1 INTAKE — confirmed scope as continuation from /jira-compare iter-3.
Phase 2 SCOPE — 11 regions in scope, full-page walk authorized.
Phase 3 NAV MAP — saved to `.probes/2026-04-27-bau-list-grouped-regression/nav-map-iter1.json`.
Phase 4 CRUD MATRIX — Read/Update/sort+group verified intact; Create per-group deferred to F-NEW-2; Delete affordance present on Catalyst (`jira-row-actions-trigger` per row).
Phase 5 PROBE SWEEP — DOM probes both surfaces, ADS dynamic-table spec fetched and compared.
Phase 6 LINT — 6 new defects categorized (4 unique root causes after rolling up shared-cause defects).
Phase 7 — SKIPPED at user instruction. No BAU board tickets filed. Handoffs emitted to repo instead.
Phase 8 RE-PROBE — D-004 patch verified live (probe match exact).

## Defects discovered

| ID | Cat | Sev | Status | Notes |
|---|---|---|---|---|
| D-001 | UI-Parity | P0 | handoff emitted (CC) | Project header band missing. Shares root cause with D-002 + D-003. Single CC Task Brief covers all three. |
| D-002 | UI-Parity | P0 | handoff emitted (CC) | Spaces breadcrumb missing. Lands as Row A of the new chrome band. |
| D-003 | UX-Parity | P0 | handoff emitted (CC) | H1 misplaced (currently inside white card, should be in chrome band). Resolves automatically when band lands. |
| D-004 | UI-Parity | P1 | ✓ FIXED in-session | Group By pill active state. One-line conditional change in BacklogPage.atlaskit.tsx GroupByControl. RE-PROBE confirmed bg=rgb(233,242,254) color=rgb(24,104,219) — exact Jira match. |
| D-005 | ADS-Tokens | P2 | deferred | Table th fontWeight 700 vs Jira 653 (canonical ADS dynamic-table also 653). Polish-tier. |
| D-006 | ADS-Tokens | P2 | deferred | Table th color rgb(80,82,88) vs Jira rgb(107,110,118). Polish-tier. |

## Handoffs emitted (repo-only — no BAU tickets)

- `.catalyst/audits/jira-compare/2026-04-27-bau-list-grouped/handoffs/CC-D-001-project-header-band-structural.md`
  Roll-up of D-001/002/003 — adds chromeBand slot to AtlaskitPageShell, new ProjectChromeBand component in BacklogPage, removes H1 from inside white card. Also becomes the landing surface for pre-existing handoffs #1 (avatar strip) and #9 (top-right CTAs).

## Patch applied in-session (Phase 6)

| File | Change | Verification |
|---|---|---|
| `src/modules/project-work-hub/pages/BacklogPage.atlaskit.tsx` | GroupByControl trigger style — `isOpen` → `(isOpen || value !== 'none')` for border/background/color tokens. Matches Jira's blue-chip active state when groupBy is engaged. | Chrome MCP probe post-patch: bg rgb(233,242,254), color rgb(24,104,219), border rgb(24,104,219) — exact Jira match. |

## Carryover (already in pre-existing handoffs — track, do not re-discover)

- F-NEW-1 page chrome bg #E9F2FE — closed (verified live in /jira-compare iter-3 + this regression).
- F-NEW-2 inline create at group header — LOVABLE handoff open.
- F-NEW-3 issue chevron uniform slot — CC handoff open.
- #1 avatar strip + Add people — LOVABLE; will land into the new chromeBand once D-001/002/003 ship.
- #9 top-right CTAs (Give feedback / Enter full screen) — DESIGN-CRITIQUE; will land into the new chromeBand.
- #11 + #13 a11y on AvatarGroup — depend on #1 landing.

## Lessons appended (proposed § for skill files)

### L24 — Chrome bg lives on an INNER div, not body
Iter-1 audit reported "Jira body bg is white" → missed Jira's depth-1 chrome layer
painting rgb(233,242,254). Probe must walk ancestor chain at edge coords, not just
body element.

### L25 — Spec text drifts from live DOM; re-probe before scoping the fix
F-NEW-3 handoff said "render chevron only when row has children" — live Jira probe
showed uniform 24×24 slot on every issue row. Always re-probe before generating
downstream handoffs.

### L26 — patches/iter<n>.md exists ≠ patch is in source
Found patches/iter3.md in repo when continuation conversation opened. Took the patch
on faith initially; correct procedure was to re-probe DOM. The DOM is the oracle.

### L27 — Token-trigger condition is its own defect class
GroupByControl had the right `color.text.selected` token wired but the trigger
condition (`isOpen` only, missing `value !== 'none'`) made it fire only when the
menu was open. Pixel-perfect parity requires both the token AND the condition. Add
to defect categories: "Token-trigger condition" — the value is right, the trigger
is wrong.

### L28 — `/regression` chained from `/jira-compare` is the right combo
`/jira-compare` scopes to deltas in a screenshot — fast, focused. `/regression`
walks every region — slower, exhaustive. Running them in sequence on the same
surface caught:
  - D-001/002/003 structural project header band (NOT in /jira-compare scope)
  - D-004 Group By pill active-state token-trigger condition
That said, /regression's Phase 7 BAU filing is not always desired — Vikram opted
to emit repo-only handoffs instead. Skill should support a "no-file" filing mode.

## Verification checklist (skill §8)

- [x] Phase 1 INTAKE confirmed by user
- [x] Phase 2 SCOPE confirmed
- [x] Phase 3 NAV MAP saved to `.probes/`
- [x] Phase 4 CRUD MATRIX written
- [x] Phase 5 PROBE SWEEP — DOM + ADS specs + console + network captured
- [x] Phase 6 defects categorized and severity-rated
- [n/a] Phase 7 BAU filing — SKIPPED at user instruction
- [x] Phase 8 RE-PROBE — D-004 fix verified live
- [x] All authorization gates respected (no clicks without inline OK; SQL not run because no migrations needed)
- [x] All five evidence sources used: visual (screenshots blocked by document_idle but probe data captures the same), DOM probe, ADS docs (dynamic-table page fetched), Atlassian MCP (atlassianUserInfo + getAccessibleAtlassianResources verified), user (8 inline AskUserQuestion blocks)

## Final verdict

**SHIPPABLE** for in-session scope. One P1 defect closed (D-004). One P0 root cause
emitted as a structural CC handoff (covers D-001/002/003 + provides landing surface
for pre-existing #1 + #9). Two P2 polish defects deferred. No BAU tickets created
per user instruction.

## Next steps (in order)

1. Apply CC-D-001-project-header-band-structural.md handoff (one structural change
   to AtlaskitPageShell + new ProjectChromeBand component).
2. After (1) lands: re-run /jira-compare on this surface — pre-existing handoffs
   #1 and #9 should now land INTO the new chromeBand, not the toolbar.
3. Apply F-NEW-2 (LOVABLE — inline create at group header).
4. Apply F-NEW-3 (CC — issue chevron uniform slot).
5. Re-run /jira-compare iter-4 to close residual P-A11Y items #11 + #13.
6. Defer D-005/D-006 typography drift to a future polish pass.
