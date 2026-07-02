# CAT-SPRINTS-NATIVE-20260702-002 — Canonical Discovery

> Full reports: `agents/A1_component_discovery.md` (components) and `agents/A2_screen_discovery.md` (screens + blast radius). This file is the synthesis.

## Canonical components identified (A1)

| Element | Component | File path | Verdict |
|---|---|---|---|
| Sprint list table | JiraTable | src/components/shared/JiraTable/JiraTable.tsx | MANDATORY (replaces ReleasesTable for sprints) |
| Month/status group headers | JiraTable group-row idiom, sentence case | (same) | KEEP |
| 1W/2W indicator | @atlaskit/lozenge `default` appearance | via src/components/catalyst-ds/status/Lozenge.tsx | KEEP — ribbon DISCARDED (not an ADS pattern, A3) |
| Progress bar | existing progress cell pattern (vw_sprint_jira_progress) | src/components/releases/cells.tsx prior art | KEEP |
| Create modal shell | @atlaskit/modal-dialog + @atlaskit/form | SprintCreateModal.tsx today | KEEP, rebuild fields |
| Sprint length picker | RadioGroup "1 week / 2 weeks" | @atlaskit/radio | KEEP (A3) |
| Owner picker | profiles-based user select (ApproversCard add-approver pattern) | ReleaseSidePanel.tsx | KEEP — label **Owner** (D-001) |
| Dates | CatalystDatePicker | existing | KEEP |
| Release link | SprintLinker chip UX retargeted | src/components/releases/SprintLinker.tsx | PATTERN DONOR only (A6: do not import as-is) |
| Status pills | statusPalette SUBTLE tier + Lozenge appearance map | statusPalette.ts + NEW src/lib/sprints/sprintStatus.ts | KEEP — no new colors outside statusPalette |
| Status quick-change | StatusLozengeDropdown | src/components/shared/StatusLozenge/ | KEEP |
| Avatars/contributors | CatalystAvatar + @atlaskit/avatar-group | src/components/shared/CatalystAvatar.tsx | KEEP |
| Approvers | ApproversCard (config-driven) | ReleaseSidePanel.tsx | KEEP + decided_at/policy extension |
| AI trigger/card | CatyPulseIcon + CatyButton + CatyInsightCard | src/components/ui/CatyPulseIcon.tsx, src/components/for-you/atlaskit/ | KEEP (magenta never muted) |
| Dependencies | dependency kit | src/components/dependencies/ | KEEP |
| Time-in-status | TimeInStatus widgets | src/components/project-hub/dashboard/widgets/ | KEEP (gated) |
| Page chrome L1 | CatalystListPageLayout + ProjectPageHeader (no trail/title) | per CRE | KEEP |
| Page chrome L2 | AtlaskitPageShell flush + ProjectPageHeader (trail+title) | per CRE | GAP: ReleaseDetailPage uses raw divs (A2) — remediation slice |

## Canonical screens identified (A2)

| Route | File | Verdict |
|---|---|---|
| /project-hub/:key/sprints (L1) | src/pages/project-hub/SprintsPage.tsx | KEEP shell (CRE-compliant); REPLACE content (10 deviations: ReleasesTable, release vocabulary, Project dropdown, density menu, wrong group-by) |
| /project-hub/:key/sprints/:sprintSlug (L2) | SprintDetailPage → ReleaseDetailPage (SPRINT_CONFIG) | KEEP config-driven approach; header compliant; shell non-compliant (raw divs) |
| /work navigator | SprintWorkNavigatorPage | KEEP (shell compliant; shares broken slug hook) |

**Blast radius:** 21 behavioural surface clusters (~150 files) read sprint_name / sprint_release / sprint_id — full list in A2 §4. Regression probes: A7 §3.

## JiraTable evaluation
- Applies: **YES** — sprint list is a work-item-adjacent enterprise list.
- Verdict: **MANDATORY**. Current ReleasesTable is a hand-rolled `<table>` (ReleasesTable.tsx:481 thStyle) — the exact pattern the rulebook bans.

## New components requiring approval
- `src/lib/sprints/sprintStatus.ts` (status constants + Lozenge appearance map) — logic module, not UI; colors component-owned.
- `src/lib/sprints/autoName.ts` (pure util mirrored by SQL fn).
- No new visual components — everything composes existing canonical/Atlaskit parts.
