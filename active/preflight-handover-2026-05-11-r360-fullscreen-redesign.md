# Preflight handover — R360 fullscreen redesign + team roster — 2026-05-11

## Context
- Surface: ui-feature · For You → Resource 360° tab
- Tier: Standard
- Started: 2026-05-11
- Council ran: Phase 2 abbreviated (Decision A/B/C options presented, Vikram chose all recommended)
- PR: pending — all rows committed

## Decisions made this session
- Decision A: scroll-guard auto-pagination (hide cards past page 8, show count badge + scroll affordance)
- Decision B: sidebar roster on wide viewports (≥900px viewport), pill strip on narrow — IMPLEMENTED ✅
- Decision C: viewport-proportional ring height `clamp(480, W×0.62, 700)` — IMPLEMENTED ✅

## Phase 0.5 — Jira Architect Register
```json
{
  "phase": "0.5",
  "task": "R360 fullscreen redesign + team roster for leads",
  "patterns_run": 28,
  "violations": [],
  "halt_required": false,
  "safe_to_proceed": true,
  "note": "R360 is a Catalyst-specific surface with no Jira equivalent — jira-compare not applicable"
}
```

## Plan (all rows from this session)
| # | Task | Status |
|---|---|---|
| 1 | Full-screen mode for For You tab when R360° active | ✅ committed (6074b4e7) |
| 2 | Reporting structure row + manager edit | ✅ committed (c710a9376) |
| 3 | Country flag + location badge | ✅ committed (035469703) |
| 4 | RingView V13 — ADS token migration + visual redesign | ✅ committed (f5b6931ce) |
| 5 | helpers.ts — AVATAR_R 28→36, getCardPixelPosDynH | ✅ committed (f5b6931ce) |
| 6 | R360Panel sidebar roster (Decision B) | ✅ committed (R360Panel.tsx rewrite) |
| 7 | useTeamResourceIds fix — resource_inventory direct query | ✅ committed (2fd24cfe6) |

## Files touched
- `src/pages/r360-member/RingView.tsx` — V13 full rewrite: ADS tokens via T.xxx() object, viewport-proportional ring height, compact 3-row card layout, 72px center avatar, dashed spoke lines
- `src/pages/r360-member/helpers.ts` — AVATAR_R: 28→36, added getCardPixelPosDynH()
- `src/hooks/useR360PanelData.ts` — useTeamResourceIds rewritten: direct resource_inventory query (dropped ph_project_members route which had 0 team data)
- `src/components/for-you/atlaskit/R360Panel.tsx` — Full rewrite: SidebarRoster (wide ≥900px), MemberPill strip (narrow), viewport innerWidth detection, hasTeam logic
- `src/pages/__tests__/RingView.tokens.test.tsx` — CREATED: 7 tests for no --cp-* vars, 72px avatar, ADS tokens
- `src/components/for-you/atlaskit/__tests__/R360Panel.sidebar.test.tsx` — CREATED: 4 tests for sidebar render + member selection

## Tests
- `RingView.tokens.test.tsx` — 7 assertions (blocked: Node v20.12.2 rolldown pre-existing bug)
- `R360Panel.sidebar.test.tsx` — 4 assertions (blocked: same infrastructure issue)
- All 4 behavioral scenarios verified manually in browser ✅

## Visual evidence (browser-verified)
- ✅ Sidebar roster visible at viewport 965px (threshold 900px) with 38 team members alphabetically
- ✅ "Me" row selected by default (gradient avatar, blue left border, selected background)
- ✅ Clicking team member (Abdulrahman Alghizzy) → R360 switches to their profile (0 open, 0 stale)
- ✅ Clicking "Me" → restores Vikram Indla (70 open, 40 stale)
- ✅ Ring V13 cards visible with ADS token colors, dashed spokes
- ✅ Sidebar scrollable (39 children: Me + 38 team members)

## Key data discoveries
- `ph_project_members` has only 3 rows (all admin user) — not usable for team roster
- `resource_inventory` has 38 active resources with profile_id (real auth users) — correct source
- Current user (Vikram, bd74d5ba) has role 'admin' → isTeamLead = true ✅
- Vikram's resource_inventory.id = 5b1d0498-2201-49cd-9e21-8e3cce75633c

## Open items / next session
1. **Lesson approval** — Two CLAUDE.md lesson drafts awaiting Vikram sign-off (see below)
2. **Release stats chips** — `useR360ReleaseStats` hook + rendering in profile header (deferred)
3. **Schedule 1-on-1 calendar chooser** — popup with Outlook/Teams/Google Cal/copy link (deferred)
4. **Vitest infra** — Node v20.12.2 rolldown `styleText` incompatibility blocks all tests; needs upgrade or workaround
5. **Ring auto-scroll guard (Decision A)** — 8-item page with scroll affordance not yet implemented (ring shows all 70 stacked)
6. **PR creation** — Not yet created; all rows committed to main

## Lessons candidates (Phase 6 — awaiting Vikram approval)

### Lesson 1
```
2026-05-11 — ph_project_members is sparse; query resource_inventory for team roster
Surface: R360Panel / useTeamResourceIds hook
Pattern: useTeamResourceIds routed through ph_project_members to find team members.
The table had only 3 rows (admin user only) while resource_inventory had 38 active
resources with profile_id set. Silent empty state — no error, just no team shown.
Rule: For resource capacity views (R360Panel, any team roster picker), query
resource_inventory directly: .eq('is_active', true).not('profile_id', 'is', null)
.neq('profile_id', myProfileId).order('name'). Never route team membership through
ph_project_members for roster purposes.
Severity: P1 (data model assumption mismatch → silent empty state)
```

### Lesson 2
```
2026-05-11 — Use window.innerWidth not offsetWidth for breakpoints in padded containers
Surface: R360Panel responsive layout
Pattern: ResizeObserver on panel container underreported width (908px vs 965px viewport)
due to For You card padding absorbing ~57px. Sidebar threshold never triggered.
Rule: For layout breakpoints inside padded containers (For You card, sidebar panels),
always measure window.innerWidth not offsetWidth.
Severity: P2 (responsive layout fails silently)
```

## Copy-paste block (next session first message)

```
R360 fullscreen redesign — 2026-05-11 — COMPLETE (open items below)

Surface: For You → Resource 360° tab
Tier: Standard
All rows committed. No PR yet.

DONE this session:
- RingView V13: ADS tokens (T.xxx() object), viewport-proportional ring (clamp 480-700px),
  72px center avatar, compact 3-row cards, dashed spokes. Commit: f5b6931ce
- R360Panel Decision B: sidebar roster (200px, ≥900px viewport) + pill strip fallback.
- useTeamResourceIds fixed: switched from ph_project_members (only 3 rows, admin-only)
  to resource_inventory direct query (38 active team members). Commit: 2fd24cfe6
- Sidebar LIVE: 38 team members alphabetically, "Me" default selected, member switching works

OPEN for next session:
1. Approve 2 CLAUDE.md lessons (see active/preflight-handover-2026-05-11-r360-fullscreen-redesign.md)
2. Decision A: ring auto-scroll (8-item page, scroll affordance for 70 items)
3. Release stats chips in profile header (useR360ReleaseStats hook)
4. Schedule 1-on-1 calendar chooser popup

Key files:
- src/pages/r360-member/RingView.tsx (V13)
- src/pages/r360-member/helpers.ts (AVATAR_R=36, getCardPixelPosDynH)
- src/hooks/useR360PanelData.ts (resource_inventory direct query)
- src/components/for-you/atlaskit/R360Panel.tsx (sidebar roster)

Data facts:
- Current user profile_id: bd74d5ba-90a2-4a1c-8290-6539151e2e62 (role: admin)
- Current user resource_inventory.id: 5b1d0498-2201-49cd-9e21-8e3cce75633c
- Team: 38 active resources with profile_id in resource_inventory
- ph_project_members: only 3 rows (all admin user) — do NOT use for team roster
- Vitest broken: Node v20.12.2 rolldown styleText pre-existing bug, tests can't execute
```
