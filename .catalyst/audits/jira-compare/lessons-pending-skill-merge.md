# Pending lessons to append to /jira-compare SKILL.md §19

These are lessons surfaced during real audits that should be merged into the
skill file at: `~/.claude-hostloop-plugins/<hash>/skills/jira-compare/SKILL.md`
(or wherever your skill repo lives). The base directory of the active install
shows in the skill's "Base directory for this skill" header.

## L20 — Work-item type icons are a Jira-row baseline, NOT optional

**Date:** 2026-04-25
**Surface:** Project Hub dashboard `/project-hub/:key/dashboard`

**Pattern:** Audited a dashboard with table-style and list-style row widgets
(Overdue, On Hold, QA Defects, Production Incidents, Recent Activity).
Caught the chrome (card, header, palette), the typography (h1/h2 sizes),
and the wiring (Edit Layout, Add Widget, gear popover) — but missed that
NONE of the rows rendered a work-item type icon next to the issue key. In
Jira every issue row, in every surface (backlog, board, table, dashboard,
search, mention rendering), shows a small colored type icon: Story =
green bookmark, Task = blue check, Bug = red bug, Epic = purple
lightning, Subtask = link-arrow, etc. Vikram caught it post-restart with
"most of the tickets are absent with issue type icon which is not the
standard." This is a Jira norm — at least 15 years old. Skipping it on a
parity audit is a P0 oversight.

**Rule:** PROBE phase (§2.1) MUST include a row-content checklist for
every list/table widget in scope, with these mandatory cells verified
per row:

  1. **Type icon** — canonical SVG from `@/components/shared/WorkItemIcon`,
     normalized via `normalizeIconType()`. Never a Lucide icon, never a
     hardcoded color SVG.
  2. **Issue key** — linkable, monospace, brand link color from
     `token('color.link')`.
  3. **Title / summary** — `TruncateCell` semantics for table rows.
  4. **Status** — `StatusLozenge`, not bespoke pill.
  5. **Assignee avatar** where present — Atlaskit `Avatar` size="xsmall"
     for 36px-locked tables, "small" for narrative feeds.

The PROBE payload (§2.1 canonical shape) must capture an explicit
`firstCellHasTypeIcon: boolean` per row-bearing widget. Missing icon =
P0 finding tagged `[CLAUDE CODE]` with the fix recipe:

```tsx
import WorkItemIcon, { normalizeIconType } from '@/components/shared/WorkItemIcon';
// inside the row's first cell, BEFORE the issue key:
<WorkItemIcon type={normalizeIconType(row.issue_type)} size={14} />
```

For DynamicTable widgets, render the icon inside the `key` cell content,
inline-flex with the issue key (gap: 6px). For narrative feeds (Recent
Activity), render before the issue key in the inline event line. Size
14px is canonical for 36px-locked dense rows; 16px is canonical for
narrative feeds and detail views.

**Triggers retroactive review:** any dashboard / board / list audit
completed BEFORE this lesson MUST be re-checked for this delta.

## L21 — Vite HMR can serve stale modules silently

**Date:** 2026-04-25
**Surface:** Project Hub dashboard rebuild

**Pattern:** Edited `WidgetWrapper.tsx`, `DashboardWidgetGrid.tsx`,
`widget-registry.ts` via the Edit tool. File system confirmed via bash
that the changes were on disk. But `fetch('/src/.../WidgetWrapper.tsx')`
from the running browser returned the PRE-EDIT compiled JS (verified by
content match against pre-edit source). The dev server's transform
cache had stalled — neither file watcher inotify nor the cache-bust
`?t=` query parameter invalidated it. Result: hours of "the change
doesn't seem to be working" until I diff'd the served chunk against
disk and saw the timestamp lie.

**Rule:** When Phase 7 RE-PROBE shows the rendered DOM doesn't match
the latest disk state — and the file watcher's job is to make those
match — verify the served compiled output:

```js
fetch('/src/...path/to/file.tsx?import&t=' + Date.now()).then(r => r.text())
  .then(t => ({ hasNewSymbol: t.includes('myNewExport'), len: t.length }));
```

If the served output doesn't contain symbols you just added on disk,
**stop debugging the React tree, skip the patch loop, and tell the user
to restart Vite**:

```bash
# Kill the dev server (Ctrl+C in the terminal)
rm -rf node_modules/.vite
npm run dev
```

`rm -rf node_modules/.vite` is the safety belt — drops the on-disk
transform cache that occasionally outlives a soft restart. Without
this, Phase 6 patches will land but Phase 7 re-probes will keep
matching the old chunk, and the loop never closes.

This shortcut beats two more hours of click-traces and fiber walks.
