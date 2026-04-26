# Target corrections vs original handoff

The handoff from session 7 had two values that the iter-8 Jira re-probe
proves wrong. Logging them here so the next patch round picks up the
right targets.

## Header color

- Handoff target: `#505258` (`--ds-text-subtle`)
- Jira reality: `#6B6E76` (`--ds-text-subtlest`) — probed `rgb(107, 110, 118)`
  at columnheader container `[data-testid="business-list.ui.list-view.column-header.column-header-container"]`.
- Disk currently has: `#505258` (the wrong handoff value, already
  patched but blocked behind the stuck Vite cache).
- **Action:** once Vite serves fresh, queue another `[CLAUDE CODE]`
  patch to update line 495 of `src/components/shared/JiraTable/JiraTable.tsx`
  from `color: #505258;` to `color: #6B6E76;`. Single-line edit.

## F9 Type column width

- Handoff target: `48px → 110px`
- Jira reality: 77px at Jira's ~1900px viewport (4.05% of table).
- Vikram's call (this session): keep 110px from the handoff. He has
  context I don't (target viewport, design intent).
- **Action:** apply the 110px target as instructed. No re-debate.

## Header font-weight

- Handoff target: `700`
- Jira reality: `653` (variable axis on Atlassian Sans).
- Static fallback `700` is the right call — Catalyst doesn't use the
  Atlassian Sans variable axis.
- **Action:** disk value is correct. No change.

## Summary column

- Handoff target: "30% via widthCss"
- Disk landed at: `width: 28` in `BacklogPage.atlaskit.tsx` line 850
  (28% of table since JiraTable treats values ≤ 100 as percent).
- Jira reality at its viewport: 21% of table.
- **Discussion:** matching ratio is more correct than matching pixels.
  Catalyst at 28% vs Jira at 21% is a 7-point overshoot. But this is
  also affected by Catalyst having fewer columns visible. Defer this
  judgment until after the cache unblocks and we can probe the live
  page side-by-side at matching viewports.
- **Action:** no immediate change. Re-evaluate in iter-9 once Vite is
  serving fresh.
