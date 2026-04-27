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

## L22 — Vite HMR can pin pages out of `document_idle` indefinitely

**Date:** 2026-04-27
**Surface:** BAU list view + BAU-5609 right-rail audit

**Pattern:** Chrome MCP screenshots returned
`Page still loading (executeScript waited 45000ms for document_idle)`
on `localhost:8080` even when `document.readyState === 'complete'`,
the React tree was hydrated, and the page was visibly interactive.
Cause: Vite's HMR keeps a long-lived websocket plus rolling chunk
fetches alive, and the screenshot driver waits for those to settle
before snapping. They never settle.

**Rule:** When `mcp__Claude_in_Chrome__computer.screenshot` times out
on a Vite/HMR page but `mcp__Claude_in_Chrome__javascript_tool` works
fine, **do not fight document_idle.** DOM probe via `javascript_tool`
is the source of truth for this skill anyway (TL;DR mandate #3).
Skip screenshots and probe directly. Save the time.

If the user explicitly asks for a screenshot, navigate the same tab
to a static URL first, snap, then navigate back — but only if needed.

## L23 — Catalyst components don't pass `testId` props

**Date:** 2026-04-27

**Pattern:** Probed Catalyst's BacklogPage and got `[data-testid]`
count = 0, `[role="gridcell"]` count = 0, `[role="tab"]` count = 0,
`[data-testid*="lozenge"]` count = 0. First instinct was to flag every
visible component as P0 "not Atlaskit" — but the rendered classes were
Compiled-CSS atomic hashes (`_ymio1r31 _ypr0glyw _zcxs1o36 ...`),
which IS the Atlaskit v8+ runtime fingerprint. Atlaskit primitives
only render `data-testid` when the consumer explicitly passes a
`testId` prop. Catalyst doesn't, so the attribute is absent.

**Rule:** On Catalyst (and any consumer that omits `testId` props),
**don't fingerprint by `[data-testid]` count.** Use this priority:

1. Compiled-CSS atomic class hashes (`_<8char> _<8char> ...`) on
   leaf elements → strong signal Atlaskit v8+.
2. Emotion `css-<hash>` class on root → Atlaskit v7-and-earlier or
   any other Emotion consumer.
3. `outerHTML` containing `@atlaskit` import paths in a sourcemap
   query (rarely accessible, but useful when present).
4. Visual chrome match against the Atlaskit reference page on
   atlassian.design/components (last resort).

When the audit says "Catalyst uses bespoke" the proof must be
**class-pattern + getComputedStyle + behaviour**, not `data-testid`
count alone.

## L24 — `getPropertyValue('--cp-*')` returns `[BLOCKED: Sensitive key]`

**Date:** 2026-04-27
**Surface:** any tab on `digital-transformation.atlassian.net`

**Pattern:** Tried to read Catalyst's `--cp-font-body` and Jira's
`--ds-text` via `getComputedStyle(document.documentElement).getPropertyValue('--<name>')`
to anchor the typography sweep. Both returned `[BLOCKED: Sensitive key]`.
That's Chrome MCP's response when the page redacts a value the
extension classifies as a credential-shaped string.

**Rule:** Don't read design-token values from `:root` via
`getPropertyValue`. Read them off the actual elements that consume
them — `getComputedStyle(button).backgroundColor` always returns
the resolved RGB. The token name doesn't matter; what matters is
whether Catalyst's resolved value matches Jira's resolved value
on the same role. Compare RGB to RGB, never token to token.

## L25 — Window-size mismatch hides geometry drift

**Date:** 2026-04-27

**Pattern:** Probed Jira at 1447×1027 (`window.innerWidth`) and
Catalyst at 2133×1044. The drawer/rail came up at x:1085 (Jira) vs
x:1703 (Catalyst). Looked like a massive layout drift, was actually
just different viewport widths. The rail width on both was ~398px.

**Rule:** First Phase-2 probe must capture `window.innerWidth /
.innerHeight`. If they differ between sides by more than ~50px,
**resize Catalyst to match Jira's viewport** before deep probing.
`mcp__Claude_in_Chrome__resize_window({ width, height, tabId })`.
Then the absolute pixel coordinates can be diff'd directly without
guessing.

## L26 — DDL must include no-op ALTER + double NOTIFY pgrst

**Date:** 2026-04-26 (yesterday's iron-dome audit)
**Surface:** Supabase migrations

**Pattern:** Bare `NOTIFY pgrst, 'reload schema'` after a CREATE/ALTER
in a Lovable-applied migration is silently dropped — Lovable's apply
path intercepts it and only the LAST statement of a multi-statement
migration triggers PostgREST reload. New columns then show as 400 in
the JS client for hours until something else triggers reload.

**Rule:** Every Catalyst migration that creates or alters a table the
Supabase JS client reads must end with:

```sql
-- Force PostgREST schema-cache reload (Lovable drops bare NOTIFYs).
ALTER TABLE <last_touched_table> ADD COLUMN IF NOT EXISTS _pgrst_noop boolean;
ALTER TABLE <last_touched_table> DROP COLUMN IF EXISTS _pgrst_noop;
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
```

The no-op ALTER guarantees a final DDL statement; the double NOTIFY
guarantees PostgREST sees at least one of them through Lovable's
debounce.

## L27 — Always query `pg_trigger` before `DROP TRIGGER`

**Date:** 2026-04-26

**Pattern:** A migration ran `DROP TRIGGER IF EXISTS xyz_trigger ON
public.foo;` to replace a trigger. The trigger had been renamed in a
prior migration to `xyz_trigger_v2`. The DROP IF EXISTS silently
succeeded (because the original name was already gone) and the new
CREATE TRIGGER added a *third* trigger. Result: every INSERT now
fired three sync jobs.

**Rule:** Before any `DROP TRIGGER`, introspect `pg_trigger`:

```sql
SELECT tgname FROM pg_trigger
 WHERE tgrelid = 'public.<table>'::regclass
   AND NOT tgisinternal;
```

Capture the actual current name. DROP exactly that. Recreate. Verify
afterwards by re-querying — count must match expectation.

## L28 — Supabase REST PATCH returns 204 on zero-row matches

**Date:** 2026-04-26

**Pattern:** A Catalyst feature applied an optimistic UI update,
PATCHed Supabase via the JS client, saw a 204 response, marked the
mutation success. Audit later found the `eq()` filter matched zero
rows because the column type was UUID and the filter passed an issue
key. The 204 was "successfully matched 0 rows" — which is a no-op
write the client treated as a write.

**Rule:** Never trust a Supabase PATCH/UPDATE 204 as proof of write.
Either:

1. Use `.select()` after `.update()` and assert `data.length > 0`, or
2. SELECT the row before+after and diff the changed column, or
3. Add `Prefer: return=representation` and check the returned row.

Optimistic UI is fine for UX, but the persistence audit must verify
a row actually changed. See also L10 (UUID column silent 400) — they
share the same root cause: PostgREST honors filters even when they
match nothing.

## L29 — PersistQueryClientProvider creates localStorage phantoms

**Date:** 2026-04-26

**Pattern:** Catalyst wraps the React Query client in
`PersistQueryClientProvider` so cached query results survive a tab
reload. After yesterday's `catalyst_issues` sweep, deleted rows kept
appearing in the BAU backlog for hours. RCA: the persisted cache held
the old `useProjectListItems` result; the query function changed
(now reading from `ph_issues`) but the cache key didn't bump, so the
provider rehydrated the stale rows on every page open and React Query
treated them as fresh.

**Rule:** When the *shape or source* of a query changes, bump the
PersistQueryClient `buster` key (or the queryKey itself). Also clear
`localStorage` for the persistence key during the audit:

```js
// In DevTools console on the affected origin:
localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
location.reload();
```

If a re-probe shows ghost rows that aren't in the database, suspect
the persisted cache *first*, then suspect React Query's stale-time.

## L30 — Jira H1 weight is 653 (Atlassian Sans semibold), not 600

**Date:** 2026-04-27

**Pattern:** Probed Jira's project header H1 ("Senaei BAU") and rail
H1 (issue summary). Both resolved to `font-weight: 653` in DevTools,
not the 600 Catalyst's `AtlaskitPageShell` and `StoryDetailModal`
were targeting. 653 is Atlassian Sans's optical-size semibold weight
for the medium/large Heading roles in the current Atlaskit theme.

**Rule:** Wherever Catalyst manually styles an `<h1>` to match Jira,
use `fontWeight: 653`, not 600. Better: import `@atlaskit/heading`
and let `<Heading size="medium">` resolve the weight automatically —
that's the supported path. The 653 hardcode is a bridge, not a
destination.

Targets:

- `src/components/ads/AtlaskitPageShell.tsx` — page H1 ✅ patched 2026-04-27
- `src/modules/project-work-hub/components/dialogs/StoryDetailModal.tsx`
  — rail H1 (already 653 — left alone)

## L31 — Atlaskit Breadcrumbs wraps when forced into a narrow rail

**Date:** 2026-04-27

**Pattern:** The rail header (~398px wide) tried to render
`<Breadcrumbs>` with 4 items: ProjectHub → BAU → Backlog → BAU-5609 —
External URL Behavior… Atlaskit Breadcrumbs is supposed to truncate
or insert an overflow disclosure (`…`), but in this layout it
wrapped onto a second line because the `flex: '0 1 auto'` parent
gave it just enough room for two items, then the rest broke.
User saw "ProjectHub / BAU /" with nothing after — actually a wrap
artifact, not a trailing-slash bug.

**Rule:** Don't push more than 2-3 crumbs into a rail header.
**Mirror Jira's rail-breadcrumb pattern** — show parent (or "Add
parent" CTA) + current key only. Page-level context belongs in the
page H1, not duplicated in the rail. Truncation is unreliable in
narrow flex parents; prefer fewer items.

Patched 2026-04-27 in `BacklogPage.atlaskit.tsx:1442` — dropped
ProjectHub and Backlog crumbs. Resulting crumbs: `BAU / BAU-5609 —
title`.

## L32 — Catalyst components omit `testId` and that's a separate audit

**Date:** 2026-04-27

**Pattern:** Catalyst's BacklogPage uses `@atlaskit/breadcrumbs`,
`@atlaskit/select`, and likely Atlaskit-derived form chrome, but
exposes zero `data-testid` attributes. Playwright/Cypress smoke
tests have to rely on visible-text selectors — fragile for i18n,
unreliable when the same word appears multiple times.

**Rule:** Track this as a distinct audit pass — "testId coverage"
— separate from parity. Most Atlaskit primitives accept a `testId`
prop and forward it as `data-testid` automatically. Adding them is a
mechanical sweep, not a parity question, but the absence shouldn't
block parity reviews. Note in the audit and move on.

## L33 — Status pill renders as 3 nested DOMs; probe the right one

**Date:** 2026-04-27

**Pattern:** Probed Catalyst's rail status button at y:491 and got
**three** elements all containing the text "In Progress":

1. Outer `<button>` — bg `rgb(233,242,254)`, text `rgb(15,23,42)`,
   16px/400, radius 4px (hit target + chevron + label)
2. Middle `<span>` — bg same, text same, 16px/400, padding 0 4px
   (Atlaskit Lozenge wrapper)
3. Inner `<span>` — bg transparent, text `rgb(21,88,188)`, 11px/653,
   uppercase letter-spacing (Atlaskit Lozenge inner cap text)

The Lozenge typography (rule 5 in StatusLozenge guardrail —
11/700/UPPERCASE) lives on the **innermost** span, which is *not*
what `[data-testid="lozenge"]` matches in v8+. Always probe to a
leaf, not an ancestor — see also L02.

**Rule:** Status-pill audits must probe the inner `<span>` (the
caps text). For weight + transform comparison, walk down the tree
until you reach a node where `textContent === el.textContent.trim()`
and that node has the smallest fontSize. That's the cap text.

## L34 — D-numbered backlog items must each carry an explicit verdict

**Date:** 2026-04-27

**Pattern:** Resumed an audit with a 12-item deferred list (D1-D12)
from a prior conversation's handoff. Checked each via probe; some
were already-resolved (D10 — second status pill), some were
data-not-code (D9 — `[QUEUE LIVE TEST]` test data), some were
re-classified (D7 — Group button bigger fix than scoped). Without
explicit verdicts the next continuation will re-investigate each.

**Rule:** Every deferred item from the prior handoff must end this
audit with one of three verdicts in the lessons or audit notes:

- ✅ **Closed (patched)** — list the file + line.
- ⏸ **Deferred (handoff target)** — list the handoff tag and why.
- ❌ **Not a bug** — explain what was misread (e.g., "trailing /"
  was wrap, not data).

Carry the verdict forward in the next handoff. Without this, the
list becomes an immortal queue.

## L35 — `--cp-*` CSS vars can drift away from `tokens.ts` declarations

**Date:** 2026-04-27

**Pattern:** `src/theme/ads/tokens.ts` declared `bg.surface` light value
= `#FFFFFF`. CLAUDE.md §4 documented `--cp-bg-surface: #FFFFFF`. But
`src/index.css:188` had the actual CSS variable set to `#F8FAFC`
(slate-50). All three layers — token map, doc, root variable —
are SUPPOSED to agree. They didn't. Result: every `<AtlaskitPageShell>`
inner card painted slate-50 grey instead of white, which read as a
"grey wash" behind the right rail and dashboard widgets and didn't
match Jira's pure-white surface.

**Rule:** When a parity audit finds a colour off by a hair from spec,
walk **all three** layers in this order:

1. **CSS root variable** in `src/index.css :root` (and `.dark` block)
   — what's actually painted.
2. **Token map** in `src/theme/ads/tokens.ts` — what wrapper code
   thinks it asks for.
3. **CLAUDE.md** — what the spec says.

If any two disagree, the `index.css` value is **almost always** the
drifter (it's the easiest to edit in isolation, the hardest to test).
Fix `index.css` to match the token map + spec. Don't change the
token map without also editing CLAUDE.md.

Probe trick — to confirm the drifter:

```js
getComputedStyle(document.documentElement).getPropertyValue('--cp-bg-surface').trim()
// '#F8FAFC' = drift; '#FFFFFF' = canonical
```

Patched 2026-04-27 in `src/index.css:188` with a comment block
explaining the source of truth so the value isn't quietly reverted.

## L36 — Canonical White Canvas — four background sources, one decision

**Date:** 2026-04-27

**Pattern:** "Why does Catalyst look slightly blue/grey vs Jira?" came up
during the BAU list-view audit. Tracked it down: every Catalyst page
had a tint stack from FOUR independent sources, none of which agreed:

1. `<body>` — `--background: 210 40% 98%` (#F8FAFC slate-50) at
   `src/index.css:678`. Painted by Tailwind's `@apply bg-background`.
2. `<div class="h-screen">` — `--cp-bg-canvas: #F7F8F9` (Atlassian
   sunken slate) at `src/styles/theme-tokens.css:11`. Painted on the
   shell wrapper that wraps everything below the global nav.
3. `<main id="catalyst-main">` — `JIRA_CANVAS_BG = '#E9F2FE'` (light
   Jira blue) at `src/components/layout/CatalystShell.tsx:48`. Painted
   on every hub-surface route.
4. `<HubSurface>` wrapper — `JIRA_CANVAS = '#E9F2FE'` (same blue) at
   `src/components/layout/HubSurface.tsx:38`. Painted again on each
   hub page that uses `HubSurface`.

These layered. The user perceived a "blue tint" across the whole app
because layers 3+4 painted blue, and a "grey tint" near page edges
because layers 1+2 painted slate, and the AtlaskitPageShell inner
card on top compounded with its own #F8FAFC drift (L35).

**Rule:** When the user reports a colour drift "across the app", the
fix is rarely one place. Walk **all four** layers in this order:

1. `--background` (Tailwind shadcn) in `src/index.css :root`
2. `--cp-bg-canvas` in `src/styles/theme-tokens.css`
3. `JIRA_CANVAS_BG` (or equivalent constant) in
   `src/components/layout/CatalystShell.tsx`
4. `JIRA_CANVAS` (or equivalent) in `src/components/layout/HubSurface.tsx`

If the design call is "match Jira" (which is white-canvas), all four
must be `#FFFFFF` in light mode. If the call is a tinted page wash
(pre-V3 blue, sunken slate, etc.), all four must agree on the same
value. Fragments of agreement produce visible bleed.

Patched 2026-04-27 in all four sources with cross-referencing
comments. Re-probed: zero painted backgrounds ≥ 200×100px remain
on the page that aren't pure white or transparent.

## L37 — "Roof touch" is usually background contrast, not geometry

**Date:** 2026-04-27

**Pattern:** User reported the right rail "touches the roof" — the
rail visually hung off the top edge of the page with no anchor.
First instinct: rail's geometry is wrong, needs top padding or a
"Jira work item" header band like Jira has.

Probe showed: rail wrapper at y=64 (just below the 56px global nav),
rail content (drawer-body) at y=310, with 246px of empty space
between them. That empty space contained tinted layers from L36
(slate + blue), so the user perceived a "ceiling" between top nav
and rail content.

After patching all four canvas layers to white (L36), the rail's
empty top region became invisible — the rail content (chevrons +
breadcrumb at y=212) sits on a white field that flows seamlessly
into the global nav, the table, and the sidebar. The "roof" disappears
because there's nothing painted up there anymore.

**Rule:** Before adding new chrome (rail header bands, padding, etc.)
to fix a "hanging" or "floating" feeling, **check the painted
backgrounds in the surrounding area.** A tinted page wash next to a
white card creates a visual edge that reads as poor anchoring even
when the geometry is fine. Fix the canvas first; only then judge
whether the rail still needs additional chrome.

## L38 — Audit a row in the context of its neighbours, not in isolation

**Date:** 2026-04-27

**Pattern:** Patched the rail's row-1 breadcrumb three times in this
audit:
  - iter 1: dropped ProjectHub + Backlog crumbs (kept project + key + title)
  - iter 2: dropped the title from the key crumb (kept project + key)
  - iter 3: dropped the breadcrumb entirely

Each iter "looked correct" by itself when re-probed in isolation.
The actual bug was **row 1 duplicated row 2's content** — both rows
ended up showing `BAU-5609`. I missed it on the first two passes
because I was probing row 1 alone, never zipping it against row 2.
User caught it from the screenshot.

**Rule:** Whenever a fix lands on one row of a multi-row chrome
strip (rail header, page header, top nav, footer), **probe the full
strip and compare adjacent rows for content overlap** before
declaring the fix complete. The probe payload should include all
rows in the strip, not just the row that was edited.

Concrete check during re-probe:

```js
// Pull all rows in the rail header (y:60–350), capture each row's
// non-empty text content + bounding boxes, then assert that no piece
// of identifying text (issue key, project key, title) appears more
// than once across rows.
```

If a key like `BAU-5609` shows up in two rows, that's a finding —
even when each row in isolation looks correct.

