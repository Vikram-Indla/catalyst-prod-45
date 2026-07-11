# Premium Test Hub Design Direction

**Feature Work ID:** CAT-TESTHUB-REMEDIATION-20260711-001  
**Status:** OWNER-APPROVED DESIGN DIRECTION — implementation remains slice-gated  
**Design authority:** Catalyst canonicals + installed Atlaskit components + ADS tokens only  
**Explicitly excluded:** Mobbin, generic SaaS dashboards, shadcn, Tailwind colors, custom tables, raw controls

## Verdict on the current experience

The current Test Hub is visually flat and operationally fragmented. The live
dashboard is mostly empty canvas with isolated metric boxes. Repository is a
functional table inside a thin toolbar. Plans presents a large empty state with
two competing create actions. Reports exposes a permanent 31-item navigation
rail before the report itself. Traceability can occupy the full page with a
spinner and no stable information hierarchy.

The redesign must keep Catalyst's component contract while replacing the page
composition. The target is not another dashboard. It is a connected testing
workspace with a clear operational focal point on every screen.

## Experience architecture

| Experience | Purpose | Premium composition | Catalyst / Atlaskit building blocks |
|---|---|---|---|
| Test operations cockpit | Answer “what needs attention now?” | Strong page header; visible Test Space; compact lifecycle tracker; one focal readiness surface; active execution table; contextual attention rail | `ProjectPageHeader`, `CatalystProgressTracker`, `JiraTable`, `Lozenge`, `SectionMessage`, `Inline`, `Stack`, `Box` |
| Repository studio | Author and curate reusable cases at speed | Full-height three-zone workspace: token-sunken folder tree, dominant JiraTable, contextual case drawer; sticky command toolbar | `JiraTable`, canonical tree, `Drawer`, `Button`, `Select`, `DropdownMenu`, `InlineEdit`, `EmptyState` |
| Plan builder | Turn approved cases into an executable baseline | Progressive four-stage workspace: Scope → Readiness → Assignment → Publish; selected cases remain visible while criteria and warnings update alongside | `CatalystProgressTracker`, `Tabs`, `JiraTable`, `Panel`, `SectionMessage`, `InlineEdit`, `ModalDialog` |
| Execution cockpit | Control an active execution without hunting across pages | Manifest header, readiness state, cycle strip, dominant scope table, right-side exceptions panel, sticky primary action | `JiraTable`, `Tabs`, `Lozenge`, `Panel`, `Drawer`, `DropdownMenu`, `Flag` |
| Focus runner | Execute accurately under pressure | Immersive workspace: compact queue left, one step focal surface center, evidence/defect drawer right, sticky verdict dock and explicit sync state | `NavigationSystem`, `Panel`, `Drawer`, `Button`, `Lozenge`, `ProgressIndicator`, `Flag`, `InlineMessage` |
| Coverage intelligence | Understand gaps and prove readiness | Unify Traceability and report drill-down behavior: persistent scope bar, coverage status strip, accessible matrix/table, gap drawer, chart only when it answers one decision | `Tabs`, `JiraTable`, `ReportChart`, `Panel`, `Drawer`, `Select`, `TagGroup`, `EmptyState` |
| Governance console | Define authority and expose denied states | Role list on the left, permission detail workspace on the right, member drawer, immutable audit below | `JiraTable`, `Tabs`, `Drawer`, `Lozenge`, `InlineMessage`, `ModalDialog` |

## 1. Test operations cockpit

The dashboard becomes the operational entry point, not a status-card gallery.
One intentionally raised focal surface shows release/test readiness. Everything
else stays on the default surface or a sunken well so elevation has meaning.

```text
┌ Test Hub / ACME Payments       [Test Space ▾] [This release ▾] [Create plan] ┐
│ Repository ─ Plan ─ Execution ─ Cycle ─ Run ─ Evidence ─ Ready              │
├──────────────────────────────────────────────────────────────────────────────┤
│ RELEASE READINESS                                              At risk       │
│ 68% executed · 7 failed · 4 blocked · evidence missing on 3 runs             │
│ [Continue execution]  [Review blockers]                                     │
├───────────────────────────────────────────────┬──────────────────────────────┤
│ Active execution scope — JiraTable            │ Needs attention              │
│ case · owner · result · evidence · defect      │ 4 blocked runs               │
│                                               │ 3 evidence gaps              │
│                                               │ 2 approvals waiting          │
├───────────────────────────────────────────────┴──────────────────────────────┤
│ Recent governed activity and upcoming milestones                            │
└──────────────────────────────────────────────────────────────────────────────┘
```

Design rules:

- No row of independent KPI cards.
- Readiness is one governed summary derived from the same facts as the table.
- The attention rail is a filtered work queue, not decorative metrics.
- The lifecycle tracker is clickable only where a real route/action exists.

## 2. Repository studio

The repository becomes a high-density authoring workspace. The existing table
remains, but the surrounding composition changes completely.

```text
┌ Test repository / ACME Payments          [Search] [Filters] [+ Create case] ┐
├───────────────┬──────────────────────────────────────────────┬───────────────┤
│ Folders       │ CASES — JiraTable                            │ Case preview  │
│ All           │ Key · Title · Approval · Last result · Risk  │ TC-142        │
│ Checkout      │                                              │ Approved v6   │
│ Payments      │                                              │ 12 steps      │
│ Refunds       │                                              │ 2 linked reqs │
│               │                                              │ [Open case]   │
└───────────────┴──────────────────────────────────────────────┴───────────────┘
```

- Folder tree uses `elevation.surface.sunken`; table uses the default surface.
- Preview is a contextual `Drawer`/panel, not a permanent duplicate detail page.
- Selection reveals bulk actions in the sticky toolbar; actions are not always visible.
- Creation opens the existing canonical modal/detail flow with progressive fields.

## 3. Plan builder

Plans become a guided workbench instead of a list followed by an unrelated form.
The plan detail is organized by state, not by database table.

```text
Scope ───────── Readiness ───────── Assignment ───────── Publish
  ●                  ●                   ○                   ○

┌ Selected approved case versions — JiraTable ┐ ┌ Readiness panel             ┐
│ TC-142 v6 · Approved · Checkout              │ │ Entry criteria     4/5      │
│ TC-188 v3 · Approved · Refunds               │ │ Missing owner       2      │
│ TC-201 v2 · In review                        │ │ Stale case version   1      │
└───────────────────────────────────────────────┘ │ [Resolve blockers]          │
                                                  └─────────────────────────────┘
```

- `CatalystProgressTracker` provides journey position.
- The right panel is contextual and changes by stage.
- Publish is disabled with a specific `SectionMessage` until blockers are resolved.
- Publishing creates the immutable baseline; `Create execution` becomes the next action.

## 4. Execution cockpit and focus runner

Execution detail owns the lifecycle. Users should never reconstruct the state
from separate Plan, Cycle, and Run screens.

The runner deliberately changes density: navigation compresses, the current
step becomes the only raised focal surface, and evidence/defect work stays in a
drawer. The verdict dock is sticky and keyboard-operable.

```text
┌ EX-24 · Cycle 3 · Checkout regression      12/18 complete    Sync: current ┐
├──────────────┬──────────────────────────────────────────────┬───────────────┤
│ Case queue   │ Step 4 of 9                                  │ Evidence      │
│ ✓ TC-142     │ Refund a captured payment                    │ screenshot.png│
│ ! TC-188     │                                              │ network.har   │
│   TC-201     │ Expected result                              │ [+ Add]       │
│              │ Refund status becomes “Submitted”            │               │
│              │ Actual result [ADF / text input]              │               │
├──────────────┴──────────────────────────────────────────────┴───────────────┤
│ [Pass] [Fail] [Block] [Skip] [Hold]        [Save draft] [Complete run]      │
└──────────────────────────────────────────────────────────────────────────────┘
```

- Verdicts use canonical Atlaskit buttons and status tokens, not custom colors.
- Sync/pending/conflict is persistent and never hidden in a toast.
- Failure opens the defect drawer without leaving the run.
- Completion expands into the retrospective on the same governed context.

## 5. Coverage intelligence

Traceability and Reports remain separate routes, but share one interaction
language and fact model. The user chooses a Test Space, baseline, and time range
once. The page then shows the accessible matrix/table first and charts second.

```text
Coverage intelligence  [Space ▾] [Baseline ▾] [Range ▾] [Saved view ▾]
[Coverage] [Requirements] [Defects] [Execution history]

Readiness: At risk · 82% requirement coverage · 7 untested · 4 failing
┌ Requirement / Case / Plan / Execution / Result / Defect — JiraTable ────────┐
│ PAY-42  → TC-142 v6 → Plan 12 → EX-24 → Failed → DEF-88                    │
└──────────────────────────────────────────────────────────────────────────────┘
Gap drawer: why this row is at risk, owner, evidence, and next valid action.
```

- The permanent 31-report rail is replaced by category tabs plus a searchable
  report switcher; the report becomes the dominant content.
- A chart appears only when it helps compare trend, distribution, or progress.
- The accessible grid/hierarchy is the production baseline; canvas remains deferred.

## Visual system

- `elevation.surface` is the default canvas.
- `elevation.surface.sunken` groups navigation wells and queue regions.
- `elevation.surface.raised` + matching raised shadow is limited to one focal
  work surface per screen.
- `elevation.surface.overlay` + matching overlay shadow is reserved for drawers,
  menus, and dialogs.
- Layout uses `Box`, `Inline`, `Stack`, and `Grid` from Atlaskit primitives with
  ADS spacing tokens. No arbitrary pixel spacing.
- Status uses Catalyst status wrappers/Atlaskit lozenges and semantic tokens.
- Motion uses ADS semantic motion for drawer, panel, and state transitions; it
  clarifies context changes and never decorates metrics.
- Every screen is designed in light and dark themes from the same token roles.

## Owner choices

1. Adopt this cockpit/workspace direction instead of the existing dashboard/card composition.
2. Make Plan Builder and Focus Runner the two signature Test Hub experiences.
3. Replace the permanent reports rail with category tabs + searchable report switcher.
4. Use one focal raised surface per page and default/sunken surfaces elsewhere.
5. Keep traceability canvas deferred until the accessible coverage workspace is certified.

**Owner disposition:** Vikram approved all five choices with `go` on
2026-07-11. This approves the design direction, not an open-ended production
change. Each implementation slice remains governed by `03_PLAN_LOCK.md`.

## Evidence boundary

This proposal is based on the live Catalyst Test Hub, live Catalyst sibling
surfaces, installed Atlaskit packages, and current official ADS guidance. It
contains no Mobbin or generic external product pattern. The direction is now
approved; implementation remains blocked until the exact slice-specific Plan
Lock is approved.
