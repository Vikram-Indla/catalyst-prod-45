---
name: jira-compare
description: >-
  Parity audit comparing a Catalyst surface (localhost:8080/8081) against
  Jira. Runs 3 lanes in logical parallel — Chrome MCP (live DOM on both),
  Rovo/Atlassian MCP (Jira backend, schema, tokens), Computer Use
  (Lovable, Supabase) — gated into PROBE → DIFF → PLAN → PATCH → RE-PROBE,
  with CRUD on a canonical entity as the acceptance test. Hard cap 5
  cycles per surface. Trigger on: jira compare, compare to jira, audit vs
  jira, match jira, clone jira, mirror jira, jira parity, jira audit,
  parity loop, or whenever a Jira screenshot/URL is shared alongside a
  Catalyst screen asking for parity, alignment, wiring verification, or
  migration plan. Also covers Catalyst fix-all / build-all sweeps and
  HANDOVER resumes — see the §17–§24 Operational SOP. HARD GUARDRAILS —
  Atlaskit-only inside scope (every interactive element maps to
  @atlaskit/*); Jira is source of truth; no standalone docs — only prompt
  blocks, MONITOR block, JIRA bugs on the BAU board, and lesson appends
  to CLAUDE.md.
---

# Jira Compare — v4 (3-Lane, Logical-Parallel)

## 0. Warmup (mandatory, every invocation)

Before anything else, read `/mnt/skills/user/jira-compare/CLAUDE.md`. It
holds compounding lessons from prior audits. Skipping warmup is a defect.
If the file does not exist, create it from the seed in §13 and continue.

**Then read** the Catalyst project's own `HANDOVER.md` and `CLAUDE.md` at
the repo root (`/Users/vikramindla/Documents/GitHub/catalyst-prod-44/`)
plus the most recent context pack / distilled / AI output in
`~/Documents/Obsidian/catalyst/`. Order is fixed — see §17.0.

---

## 1. Contract

1. **Scope = the screenshot / surface named.** Nothing outside it.
2. **Atlaskit-only inside scope.** Every interactive element = `@atlaskit/*`. Cite the spec page on `https://atlassian.design/components/<n>`.
3. **Jira is source of truth** for behaviour, structure, naming, and the entity model. Catalyst conforms.
4. **3 lanes complete OBSERVATION before DIFF.** Sync gate enforced.
5. **CRUD on a canonical entity, both sides, is the acceptance test.** Visual match without CRUD parity is not a pass.
6. **Hard cap: 5 fix-test cycles per surface.** Cycle 6 = escalate + log + stop.
7. **No documentation output.** No standalone `.md` reports. No summary postambles. No "here's what I did" recaps. Allowed artefacts only: prompt blocks (Rovo/Lovable/Claude Code/Chat), MONITOR block, JIRA bug filings on the BAU board, CLAUDE.md lesson appends.
8. **Lessons compound to `/mnt/skills/user/jira-compare/CLAUDE.md`** — every audit that surfaces a new failure mode appends one.

The eight clauses above govern AUDIT mode. The Catalyst Operational SOP in §17–§24 governs the day-to-day operating loop — lane setup, slot-prop patches, recovery, end-of-session protocol — and applies in audit AND extension AND sweep mode.

---

## 2. Pinned endpoints (never substitute)

| Endpoint | URL |
|----------|-----|
| Catalyst (local dev) | `http://localhost:8080` (sometimes `8081`; check via Chrome MCP) |
| Jira tenant | `https://digital-transformation.atlassian.net` |
| Atlaskit components | `https://atlassian.design/components` |
| Atlaskit tokens | `https://atlassian.design/tokens` |

If Catalyst dev server is not responding, stop and tell Vikram to start
it. Never substitute a production URL unless he names one. Note: bash
`curl http://localhost:808x` from the sandbox always returns 000 — the
sandbox can't reach the host's localhost. Use Chrome MCP for dev-server
probes.

---

## 3. The three lanes

All three are mandatory per audit. Tool calls execute serially in a turn,
but **DIFF is blocked until all three lanes have reported OBSERVATION**.

### Lane A — Chrome MCP (`mcp__Claude_in_Chrome__*`)
- Drives Catalyst (localhost:8080/8081) and Jira (digital-transformation tenant) live in the visible browser.
- Runs DOM probes: `getComputedStyle`, accessibility tree, tab order, ARIA, role/name, computed colors, computed typography, computed spacing.
- Visual = same lane (the rendered pixels Vikram sees).
- DOM probe is structural ground truth for both sides.

### Lane B — Rovo / Atlassian MCP
- Jira backend metadata: issue type schemes, field configurations, screen schemes, workflow states + transitions, permission schemes, custom field IDs, JQL behaviour, API shape.
- Atlaskit primitive lookup ("which `@atlaskit/*` does Jira use here") and token resolution (`--ds-*` → value).
- Authoritative for backend assertions.

### Lane C — Computer Use
- Lovable (Catalyst builder), Supabase console, GitHub Desktop, anything Chrome MCP cannot reach.
- Used to apply backend fixes (Supabase migrations, schema changes, edge function deploys) and to drive Lovable rebuild prompts when the patch is "rebuild this surface on @atlaskit/\*".

**Lane scope is exclusive.** Do not use Computer Use for Jira/Catalyst
browsing — that's Chrome MCP. Do not invent a 4th lane.

### Sync gate
Before DIFF, post:

```
SYNC GATE — Lane A: <ok|partial|skipped+reason>
            Lane B: <ok|partial|skipped+reason>
            Lane C: <ok|partial|skipped+reason>
```

`skipped` is only valid with a reason ("no Lovable change in scope", "no
Jira backend question in scope"). `partial` triggers a re-probe of the
incomplete lane before DIFF.

---

## 4. Screenshot policy

Screenshots are **optional unless the assertion is itself visual**.

**Mandatory** for: color, contrast (WCAG), spacing/density, font weight,
hover/focus/active state, animation/transition, icon glyph match,
elevation/shadow, RTL rendering.

**Not required** for: presence of an element, attribute values, ARIA
roles, tab order, field schema, workflow transitions, API behaviour,
CRUD outcomes — DOM Probe (Lane A) + Rovo (Lane B) cover these.

When skipping a screenshot, state the assertion and which lane covers it.

---

## 5. Source-of-truth hierarchy (conflict resolution)

When lanes disagree:

1. Rovo / Atlassian backend (Lane B)
2. Jira live DOM (Lane A — Jira side)
3. Catalyst live DOM (Lane A — Catalyst side)
4. Catalyst Supabase / backend (Lane C)

Backend assertions defer to #1. UI assertions defer to #2. A #1 ↔ #2
disagreement is logged as an Atlassian platform inconsistency and Jira
live DOM wins for the audit (file an internal note, do not block).
Never resolve a conflict by guessing or by training-data appeal.

---

## 6. Pipeline

```
0. WARMUP    — read CLAUDE.md (skill) + HANDOVER.md (repo) + Obsidian context pack
1. PROBE     — Lanes A + B + C, sync gate before exit
2. DIFF      — consolidated against §5 hierarchy
3. PLAN      — root-cause + fix path; all lanes must agree on cause
4. PATCH     — Atlaskit-only; SQL emitted as a SUPABASE SQL EDITOR
               block — Vikram runs it (no Lovable SQL MCP); browser
               clicks on Catalyst/Jira/Lovable need inline OK
5. RE-PROBE  — CRUD on canonical entity, BOTH sides, parity-diffed
               at C, R, U, D
6. EXIT      — pass criteria met? if no, loop to 1 (cap 5)
7. APPEND    — new failure modes → CLAUDE.md
```

The loop is steps 1→6, capped at 5 iterations. Step 7 runs once at end,
regardless of pass/fail. The end-of-session protocol in §23 covers what
runs AFTER step 7.

---

## 7. CRUD parity test (the acceptance gate)

Every surface has one **canonical entity** — pick at PROBE, lock for the
audit. Examples:

| Surface | Canonical entity |
|---------|------------------|
| Issue View | Issue |
| Backlog | Sprint (and child Issue rank) |
| Board | Issue (column transition) |
| Filters | Filter |
| Project settings → Fields | Custom field |
| Comments panel | Comment |

For the chosen entity, execute identical payloads on both sides:

- **Create** — same field values; capture resulting entity ID + DOM + backend record.
- **Read** — fetch the created entity in both UIs; diff rendering and field exposure.
- **Update** — change one field of each type in scope (text, select, user, date); diff persistence + render.
- **Delete** — remove the entity; verify removal in DOM + backend.

A step is **green** only if Catalyst and Jira behave identically AND
backend state matches AND DOM render matches within the §4 visual
tolerances. Any non-green step is a P0 defect, filed as a JIRA bug on
the BAU board, and the loop continues.

---

## 8. Exit criteria

PASS requires ALL of:

- Zero P0 and zero P1 defects on the audited surface.
- CRUD parity green at C, R, U, D.
- Atlaskit compliance pass (every interactive primitive maps to `@atlaskit/*`, cited).
- Vikram explicit OK.

FAIL paths:

- Loop hits cycle 6 → STOP. Append failure mode to CLAUDE.md. Emit MONITOR + escalation block. Do not retry without Vikram restarting.
- A P0 has no resolvable lane consensus on root cause → STOP at PLAN gate. Emit Rovo prompt block. Wait for Vikram.

---

## 9. Defect filing

Every defect is a JIRA bug on the BAU board (`BAU` project, current
tenant). Use Atlassian Rovo MCP `createJiraIssue`. Required fields:

- Summary: `[jira-compare] <surface> — <one-line defect>`
- Description: lane evidence (Lane A DOM snippet, Lane B backend value, Lane C if applicable), expected (Jira side), actual (Catalyst side), Atlaskit primitive citation if ADS-related.
- Issue type: `Bug`.
- Priority: P0 (blocks CRUD parity), P1 (visible regression), P2 (polish), P-A11Y (a11y).
- Labels: `jira-compare`, `<surface-slug>`.

No defect is "tracked in chat only". File it.

(Caveat — when the active directive is "no JIRA bugs filed during the
audit", honour that. The current cycle uses chat-only tracking; switch
back to JIRA filing when Vikram lifts it.)

---

## 10. PATCH rules

- **Code edits** (prop swaps, token swaps, component swaps): apply directly via the in-session `str_replace` / `create_file` against the Catalyst repo. Atlaskit-only.
- **Lovable rebuilds** (when the fix is structural): emit a DYNAMITE V2 prompt block. Vikram runs it.
- **Supabase / backend SQL** (schema, migrations, RLS, seed data): there is **no MCP to Lovable's SQL editor**. Emit the SQL as a fenced **SUPABASE SQL EDITOR** block (one block per logical change, idempotent where possible, with a one-line "expected:" note). Vikram fires the query in the Supabase SQL Editor and pastes the result back. Do not call any Supabase write MCP without inline Vikram OK; reads are fine.
- **SQL loop (mandatory shape)**:
  ```sql
  -- SUPABASE SQL EDITOR — <surface> — <intent>
  -- expected: <one-line outcome, e.g. "0 rows then 1 row" / "column added" / "policy created">
  <statement>;
  ```
  After Vikram pastes back the result, RE-PROBE confirms the change before the loop advances. If the result diverges from "expected:", treat as a P0, file a JIRA bug, and emit a corrective SQL block in the next turn.
- **Edge functions / Supabase console clicks** (deploys, secrets, dashboard toggles): inline Vikram OK before each action.
- **Browser clicks on Catalyst, Jira, or Lovable** (anything that mutates state in those UIs) need explicit inline OK from Vikram before each action. DOM reads do not.
- Never swap a working `@atlaskit/*` primitive for a shadcn/custom equivalent. The reverse is always allowed.

---

## 11. MONITOR block (mandatory at end of every response)

```
🛡️ MONITOR
  cycle:           <n>/5
  lanes:           A=<ok|partial|skipped> B=<...> C=<...>
  open P0/P1:      <count>
  CRUD parity:     C=<g/r/-> R=<...> U=<...> D=<...>
  context load:    <green|yellow|red>
  hallucination:   <low|med|high> — <one-line reason>
  next:            <next concrete action OR "awaiting Vikram OK on X">
```

Context bands: green <50%, yellow 50–75%, red ≥75%. At red, stop at next
gate and emit a handoff prompt for a fresh conversation.

---

## 12. Forge gate bypass

When a Forge gate would block achieving Jira parity (e.g., G8 polish
before G3 wiring), bypass it for this skill — Jira parity is the
overriding constraint. Log the bypass in CLAUDE.md with the gate name
and reason.

---

## 13. CLAUDE.md seed

If `/mnt/skills/user/jira-compare/CLAUDE.md` does not exist, create with:

```markdown
# jira-compare — compounding lessons

Append-only. Newest at top. Each entry: date, pattern, rule, surface.

---
```

Then proceed.

---

## 14. Append rule

After EXIT (pass or fail), if this audit surfaced a failure mode not
already in CLAUDE.md, append ONE entry:

```markdown
## YYYY-MM-DD — <one-line title>
**Surface:** <name>
**Pattern:** <what went wrong / what was missed>
**Rule:** <what to do next time, one sentence>
```

No prose around it. No recap. Just the entry.

---

## 15. What is forbidden

- Standalone `.md` audit reports (no `.catalyst/audits/jira-compare/...md` writes).
- Summary postambles ("here's what I found...", "to recap...").
- Inventing a 4th lane.
- Skipping warmup.
- Skipping the sync gate.
- Skipping CRUD parity.
- Looping past cycle 5.
- Resolving lane conflicts by guess or training data.
- Substituting endpoints.
- Using shadcn/custom where Atlaskit exists.
- Filing defects "in chat only" without a JIRA bug (when JIRA filing is the active directive).
- Burning tokens on documentation, narration, or recap.

---

## 16. Atlaskit primitive quick map (cite spec on every finding)

Button → `@atlaskit/button/new` · Textfield → `@atlaskit/textfield` ·
Textarea → `@atlaskit/textarea` · Select → `@atlaskit/select` ·
User picker → `@atlaskit/user-picker` · Checkbox → `@atlaskit/checkbox` ·
Radio → `@atlaskit/radio` · Toggle → `@atlaskit/toggle` ·
Datetime → `@atlaskit/datetime-picker` · Modal → `@atlaskit/modal-dialog` ·
Drawer → `@atlaskit/drawer` · Popup → `@atlaskit/popup` ·
Dropdown → `@atlaskit/dropdown-menu` · Tabs → `@atlaskit/tabs` ·
Breadcrumbs → `@atlaskit/breadcrumbs` · Page header → `@atlaskit/page-header` ·
Lozenge → `@atlaskit/lozenge` · Badge → `@atlaskit/badge` ·
Avatar → `@atlaskit/avatar` · Avatar group → `@atlaskit/avatar-group` ·
Tooltip → `@atlaskit/tooltip` · Flag → `@atlaskit/flag` ·
Section message → `@atlaskit/section-message` · Empty state → `@atlaskit/empty-state` ·
Spinner → `@atlaskit/spinner` · Progress bar → `@atlaskit/progress-bar` ·
Progress tracker → `@atlaskit/progress-tracker` ·
Dynamic table → `@atlaskit/dynamic-table` · Table tree → `@atlaskit/table-tree` ·
Editor → `@atlaskit/editor-core` · Form → `@atlaskit/form` ·
Layout → `@atlaskit/primitives` (`Box`/`Stack`/`Inline`/`Grid`) ·
Heading → `@atlaskit/heading` · Tokens → `@atlaskit/tokens` ·
Icons → `@atlaskit/icon` / `@atlaskit/icon-lab` · Mention → `@atlaskit/mention`.

If Jira renders it and Atlaskit has the matching primitive, Catalyst
must use that primitive. No exceptions inside scope.

---

# CATALYST OPERATIONAL SOP (§17–§24)

The sections above are the audit rules engine. The sections below are
the operational scaffolding — how to start a session, where to read
state from, how to apply the slot-prop pattern that recurs across all
CatalystView*, what to do when something breaks, and how to close a
session so the next one resumes cleanly.

This SOP applies in audit mode AND in extension mode AND in sweep mode
("fix all", "build all"). The audit rules engine takes precedence when
they conflict.

---

## 17. Lane setup checklist (start every session)

### 17.0 — Always read these BEFORE touching code

In this exact order, every session, even when you think you remember:

1. `/mnt/skills/user/jira-compare/CLAUDE.md` (this skill's compounding lessons — §0 warmup).
2. `HANDOVER.md` at the repo root — what the prior cycle landed; what's open; what was skipped per Vikram directive; known gotchas.
3. `CLAUDE.md` at the repo root — the parity contract, canonical primitives, anti-patterns, lucide → Atlaskit replacement map, working agreement.
4. `~/Documents/Obsidian/catalyst/04_context_packs/Context Pack — *.md` (the most recent) — the resume bundle for the current track of work.
5. The most recent distilled note + AI output capture in the Obsidian vault.

Do not trust HANDOVER blindly. Re-probe state before any patch — prior items may already have shipped, HMR may need a restart, the dev server port may have moved (8080 ↔ 8081).

### 17.1 — Lane health check

Before any patch lands, all three lanes must be alive. If any one fails, abort per Rule 7 (Contract §1.5 → Catalyst SOP §22.3).

```
☐ Chrome MCP — list_connected_browsers returns at least one isLocal: true device
☐ tabs_context_mcp{createIfEmpty:true} — tab created or recovered
☐ Rovo — getAccessibleAtlassianResources returns cloudId 66b89222-afbe-4e02-b5bf-e49dcc583d3d
☐ Repo folder mounted: /Users/vikramindla/Documents/GitHub/catalyst-prod-44
☐ Obsidian vault folder mounted: /Users/vikramindla/Documents/Obsidian/catalyst
☐ Dev server reachable via Chrome MCP navigate to http://localhost:8081 (or 8080)
   — bash curl will FAIL (sandbox cannot reach host's localhost)
☐ Tools loaded via ToolSearch: select:mcp__Claude_in_Chrome__*, mcp__17fd535f-*__*,
   mcp__visualize__*, mcp__workspace__bash, TaskCreate/Update/List/Get,
   AskUserQuestion, mcp__cowork__request_cowork_directory
```

### 17.2 — Two Supabase projects — get this right

| Ref | Name | Has tables? | Catalyst dev `.env` |
|---|---|---|---|
| `mqgshobotcvcjouzxdbi` | Catalyst Test (runtime) | yes (200+ tables) | YES |
| `nbygvcavxkiyqeqmsxbq` | Vikram-Indla's playground | empty | no |
| `wpczgwxsriezaubncuom` | Catalyst Live (prod) | yes | no |

Probe the active project via `localStorage.getItem('sb-mqgshobotcvcjouzxdbi-auth-token')`.

---

## 18. Working agreement with Vikram

Pinned conventions for how the operator + Vikram interact during a Catalyst session.

- **"go ahead N"** = green-light item N from a queue.
- **"build all"** or **"complete in sequence"** = clear the queue without per-item sign-off. Still subject to Contract §1.4 — one target at a time.
- **"skip X, Y, Z"** = mark those task IDs `deleted` immediately and continue.
- **Browser CLICKS** on Jira / Catalyst / Lovable need inline OK each time. Navigation (URL change without click) and DOM reads are free.
- **Lovable scope: Supabase SQL only — never UI rebuilds.** If Catalyst needs a backend column, table, RLS rule, or Edge Function change, emit it as `-- SUPABASE SQL EDITOR — <surface> — <intent>` per §10 SQL loop and let Vikram run + paste back the result.
- **No JIRA bugs filed during an audit** unless the directive explicitly says otherwise. Track defects in chat + HANDOVER pixel-parity scoreboard during a no-JIRA-bugs run.

---

## 19. Catalyst canonical primitives & routing facts

These are the load-bearing facts about the codebase. Memorise them; if a fact in this list seems wrong, RE-PROBE before patching.

### 19.1 Surfaces and routes
- **Canonical issue UX:** `/project-hub/:key/allwork?issue=<key>` (side-panel via `ProjectAllWorkView`). The `/issue/<key>` full-page route is secondary.
- **Detail router:** `src/components/catalyst-detail-views/CatalystDetailRouter.tsx` resolves `issue_type` → CatalystView*. Mappings: epic, feature, defect, incident, task, business_request, subtask, story, idea. `'change request'` and `'change_request'` map to `'story'`.
- **Per-view files:** `src/components/catalyst-detail-views/<type>/CatalystView<Type>.tsx`. All 8 share `CatalystViewBase` shell + slot-prop pattern.

### 19.2 Slot-prop pattern (canonical for cross-cutting rail affordances)
- `CatalystSidebarDetails` owns the render position for `statusPill`, `improveDropdown`, the Automate ⚡ trigger, the Configure ⚙ CTA, the hybrid time format. Each `CatalystView*` threads JSX through the slot props.
- When adding a new universal rail affordance, prefer the slot pattern over per-view JSX. Adds 1 edit (in CatalystSidebarDetails); per-view changes are 8 edits.
- Universal-but-not-customizable affordances (e.g. ⚡ Automate, ⚙ Configure) can render directly inside CatalystSidebarDetails without a slot prop.

### 19.3 Data
- `useCatalystIssue` queries by `issue_key` text per F-iter9 PK contract. Page resolvers MUST pass `issue.issue_key`, not `issue.id` (UUID). Hook at `src/components/catalyst-detail-views/shared/hooks/useCatalystIssue.ts:14`.
- `useProjectListItems` (`src/hooks/useProjectListItems.ts:11`) normalises `issue_type`. Backend / Frontend → `'task'`. Bug / Defect / QA Bug → `'bug'`. Sub-task → `'subtask'`. The collapse loses the subtask signal — call sites that need to filter subtasks must check `rawType` against the Jira subtask-type list.
- `WorkItem.type` ≠ `ph_issues.issue_type`. The former is the normalised UI type; the latter is the raw Jira string.

### 19.4 Atlaskit gotchas (catalyst-prod-44 specific)
- Icons: prefer `@atlaskit/icon/core/<name>` (newer); fall back to `@atlaskit/icon/glyph/<name>` if core doesn't have it. Verify with `ls node_modules/@atlaskit/icon/core/`.
- Spinner: `@atlaskit/spinner` (component, not an icon — replaces lucide `Loader2`).
- Lozenge: `@atlaskit/lozenge`. `appearance="default" + isBold` renders BLACK (gotcha) — `CatalystStatusPill` enforces `isBold={ap !== 'default'}`.
- `appearance="discovery"` renders solid magenta in the 2026-05 theme. Use inline `--ds-background-discovery` token instead.
- `<Heading size="small">` renders 16/653, NOT 14/500. For Jira-measured small labels, bypass and use inline H2.
- `glyph/watch` is NOT bundled — the watcher chip uses an inline SVG fallback.

---

## 20. Patch templates (copy-pasteable)

### 20.1 Slot-prop addition to CatalystSidebarDetails (universal rail affordance)

```tsx
// 1. Import the icon
import <NewIcon> from '@atlaskit/icon/core/<name>';

// 2. Render directly inside the rail-header flex (no slot prop needed for universal)
{(statusPill || improveDropdown) && (
  <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
    {statusPill}
    <IconButton
      icon={(iconProps) => <NewIcon {...iconProps} label="" />}
      label="<Action>"
      appearance="subtle"
      spacing="compact"
      onClick={() => toast('<Feature> — coming soon')}
    />
    {improveDropdown}
  </div>
)}
```

### 20.2 Per-view slot-prop wiring (8 CatalystView* files)

```tsx
// Imports (each per-type view)
import { ImproveIssueDropdown, useImproveApplyHandlers } from '@/components/catalyst-detail-views/improve';
import { CatalystStatusPill, ... } from '../shared/sections';

// Hook
const improveHandlers = useImproveApplyHandlers(issue ?? null);

// rightContent — pass slot props
<CatalystSidebarDetails
  ...
  statusPill={<CatalystStatusPill status={issue?.status} statusCategory={issue?.status_category} onStatusChange={(st) => mutations.updateStatus.mutate(st)} />}
  improveDropdown={<ImproveIssueDropdown issue={issue ?? null} {...improveHandlers} />}
/>
```

### 20.3 Lucide → Atlaskit icon swap

```tsx
// Before
import { Trash2, Download, Loader2 } from 'lucide-react';
<Loader2 size={14} className="animate-spin" />

// After
import DeleteIcon from '@atlaskit/icon/core/delete';
import DownloadIcon from '@atlaskit/icon/core/download';
import Spinner from '@atlaskit/spinner';
<Spinner size="small" />
```

### 20.4 Hybrid relative-time helper

```tsx
function fmtRelative(iso: string | null | undefined): string {
  if (!iso) return '';
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '';
  const diffMs = Date.now() - ts;
  const sec = Math.round(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'yesterday';
  if (day < 30) return `${day} days ago`;
  const mon = Math.round(day / 30);
  if (mon < 12) return `${mon} month${mon === 1 ? '' : 's'} ago`;
  const yr = Math.round(mon / 12);
  return `${yr} year${yr === 1 ? '' : 's'} ago`;
}

// Render: hybrid absolute · relative
<div title={iso}>
  <span>Created</span> {fmtDate(iso)}
  {iso && <span style={{ color: '#7A869A' }}> · {fmtRelative(iso)}</span>}
</div>
```

### 20.5 Resolver case addition (CatalystDetailRouter)

```tsx
// Append to resolveItemType BEFORE the default 'story' fallback.
// Cite the BAU ticket count in the comment so the routing intent stays visible.
// jira-compare YYYY-MM-DD — <Audit> · <Type> mapped explicitly to '<bucket>'.
// Was falling through to default before. N tickets in BAU project today
// (BAU-XXXX, BAU-YYYY, …).
if (t === '<type lowercase>' || t === '<alt>') return '<bucket>';
```

---

## 21. Anti-patterns logged (if you do these, stop and re-plan)

The full list lives in `CLAUDE.md` at the repo root with override-context comments. Compressed for skill-load:

1. Building a new modal/drawer/table when a canonical exists in Project Hub.
2. Forking a primitive locally instead of editing the canonical.
3. Calling shadcn or lucide directly inside a hub page.
4. Translating "no drawer styles" into "name it differently".
5. Producing markdown documentation files (other than HANDOVER + Obsidian + skill outputs).
6. Speculating about data when probing is cheap.
7. Pre-binding cross-cutting entities to a parent.
8. Producing a defect catalogue from memory + HANDOVER instead of triple-probe.
9. Trusting prior session's "confirmed" claim without re-probing.
10. Visual parity claim without measuring border-style.
11. Implementing a feature scope without DOM-probing Jira's same surface.
12. Choosing Atlaskit Button `appearance="default"` when Jira chips are white-bg + grey-outline.
13. Drifting from canonical Atlaskit icons by using unicode characters.
14. Comparing across hierarchy levels (sub-task vs parent type).
15. Speculating on a deviation without finding the canonical UX path first.
16. Editing CatalystView* / CatalystSidebarDetails without confirming via React fiber tree which view is rendering.
17. Re-adding fields the codebase explicitly says were removed, without keeping the override context.
18. Adding a common-dep import (`toast`, `Spinner`, `useQueryClient`) without grepping the file first — duplicates throw SyntaxError and crash the app.
19. Aliasing Atlaskit icons to lucide names without normalising the JSX prop API. Lucide takes `size={n}` + `color`; Atlaskit takes `label` + `primaryColor`. Mixed prop API produces React DOM warnings + size silently falls to Atlaskit's default scale.

---

## 22. Recovery patterns

### 22.1 Duplicate import SyntaxError ("Identifier 'X' has already been declared")
1. Don't panic — the dev server is fine; the source has a duplicate.
2. `Grep` the file for `from 'sonner'` (or whichever package) and any reference to the identifier.
3. If two `import { toast } from 'sonner'` lines exist, remove the one YOU added.
4. Re-probe in Chrome — Vite re-bundles in 2–3 seconds.

### 22.2 List goes "0 of 0" after navigation
- Symptom: `/project-hub/:key/allwork` renders an empty list with no detail panel.
- Cause: HMR re-init wipes the in-memory query state.
- Fix: force-reload via `window.location.reload()`. If still empty after 6 seconds, clear localStorage filter keys: `Object.keys(localStorage).filter(k => /filter|allwork|workitem/i.test(k)).forEach(k => localStorage.removeItem(k))` then reload.

### 22.3 Chrome MCP service worker dies
- Symptom: `javascript_tool` errors, `screenshot` reports "Page still loading" twice in a row.
- Recovery: `list_connected_browsers` + `tabs_context_mcp{createIfEmpty:true}`.
- If it fails twice in a row: STOP. Tell Vikram, wait for direction. (Contract §1.5.)

### 22.4 Glob times out on the catalyst-prod-44 repo
- Symptom: `Ripgrep search timed out after 20 seconds`.
- Cause: too-broad pattern.
- Fix: pin `path` to a subdirectory; narrow the pattern.

### 22.5 The patch landed but the screenshot still shows the old UI
- Force-reload via `javascript_tool({text: "window.location.reload()"})`.
- Wait 5–6 seconds.
- If still old, check the URL — sometimes navigation drops the `?issue=...` query param.
- If still old, the file may have a TypeScript error blocking Vite re-bundle. Check console for `SyntaxError` and `hmr Failed`.

### 22.6 `[BLOCKED: Cookie/query string data]` on a DOM probe
- Cause: the JSON response contained a URL / UUID / JWT / long opaque token that triggered the privacy filter.
- Fix: slice all URL strings to ≤ 80 chars. Skip `outerHTML` for elements with `data-*` attrs full of IDs. Probe a different sibling that has only the visible text.

### 22.7 Bash sandbox cannot reach `localhost`
- Symptom: `curl http://localhost:8081` returns exit code 7 (000).
- Cause: bash sandbox is isolated from the host's network.
- Fix: use Chrome MCP `navigate` for any localhost probe. Bash is for repo-level file ops only.

---

## 23. End-of-session protocol (always run before logging off)

In this exact order:

1. **Refresh `HANDOVER.md`** at the repo root. Update:
   - The "what landed THIS session" table (file paths + descriptions).
   - The pixel-parity scoreboard.
   - The open work queue.
   - New gotchas under "Known gotchas (carried + new)".
   - New anti-patterns under "Anti-patterns logged".
   - "Last-verified state at session end" — what's confirmed working, what's deferred.

2. **Update `CLAUDE.md`** (repo root) with new anti-patterns / new conventions discovered. Append; never overwrite. Also append a one-line entry to `/mnt/skills/user/jira-compare/CLAUDE.md` per §14 if the audit surfaced a NEW failure mode.

3. **Write a distilled note** at `~/Documents/Obsidian/catalyst/02_knowledge/Distilled — <topic> — YYYY-MM-DD.md`. Capture the reusable lessons (slot-prop pattern, canonical-route discovery, override-prior-directive evidence, fiber-tree debugging).

4. **Capture the AI output** at `~/Documents/Obsidian/catalyst/03_ai_outputs/AI Output — <topic> — YYYY-MM-DD-HHmm.md`. The full session log: every patch, every widget, every failed probe, every recovery.

5. **Build the context pack** at `~/Documents/Obsidian/catalyst/04_context_packs/Context Pack — <track> — YYYY-MM-DD.md`. The resume bundle: open work menu A/B/C/D, lane status, files touched, what's verified vs deferred.

6. **Mark all TaskList items** with the right status. Skipped → `deleted`. Deferred → `completed` with a `metadata.verdict` explaining why.

The next session opens with `HANDOVER.md` and pulls the rest from the references in it.

---

## 24. Trigger extensions for Catalyst SOP mode

The Contract triggers (jira compare, audit vs jira, mirror jira, etc.) activate AUDIT mode. The Catalyst SOP mode is ALSO activated by:

- "fix all", "build all", "complete in sequence" within Catalyst — even without "jira" in the phrase.
- A request to extend a CatalystView*, CatalystSidebarDetails, ProjectAllWorkView, or any rail / slot / section.
- A request to do a routing audit across work-types (epic, feature, defect, incident, task, business_request, subtask, story, change_request, idea).
- A request to do a lucide / shadcn → Atlaskit sweep on any folder under `src/modules/project-work-hub/components/`.
- Resuming via `HANDOVER.md` + `CLAUDE.md` (always check this skill applies before patching).
- "set up Catalyst session" / "start parity work" / similar.

Do NOT trigger this skill for:
- Pure conversational questions about the codebase that don't need a patch.
- Reading a single file to answer a "what does this do" question.
- General SOP work that has nothing to do with Catalyst.

---

> **THE LOOP IS THE PRODUCT.** WARMUP → 3 lanes → sync → DIFF → PLAN →
> PATCH → CRUD RE-PROBE → EXIT or LOOP (cap 5) → APPEND. No docs. No
> recap. Atlaskit-only. Jira is truth. CLAUDE.md compounds.
>
> The Catalyst Operational SOP (§17–§24) is the scaffolding around the
> loop — lane setup, slot-prop patches, recovery, end-of-session — and
> applies in audit AND extension AND sweep mode.
