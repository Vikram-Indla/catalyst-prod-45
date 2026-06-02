---
name: catalyst-clone
description: End-to-end clone protocol that replicates a complete surface — page, table, modal, or component — between two contexts. Handles BOTH directions — Catalyst↔Catalyst (e.g. project backlog → product backlog) AND Jira→Catalyst (external Jira link → internal Catalyst surface). Enforces probe-before-code via a 10-phase contract — scope contract, ability matrix, variation map (5 axes), canonical-component identity gate, field-binding contract, interaction probe plan, ADS pre-validation, L1-L10 + G1-G10 guardrails re-scan, surgical patch, live verification, lesson auto-log. Refuses to advance until each phase's evidence is in. Always appends a lesson entry to CLAUDE.md after every run (success or failure). Triggers on `/clone`, `/catalyst-clone`, "clone this", "replicate from jira", "make X like Y", "mirror the project table on product".
---

# Catalyst Clone

End-to-end clone protocol. Single command — `/clone {source-url} {target-url}` — runs ten gated phases. Refuses to write code until every phase's evidence is in.

## Two supported modes

The skill auto-detects mode from the URL pair:

| Mode | Source format | Target format | Example |
|---|---|---|---|
| **Catalyst↔Catalyst** | `localhost:8080/...` or `/project-hub/...` | `localhost:8080/...` or `/product-hub/...` | `/clone /project-hub/BAU/backlog /product-hub/INV/backlog` |
| **Jira→Catalyst** | `https://*.atlassian.net/...` or Jira REST URL | `localhost:8080/...` | `/clone https://digital-transformation.atlassian.net/jira/software/c/projects/BAU/list /project-hub/BAU/list` |

Mode selection drives **Phase 1 probe lanes**:
- Catalyst↔Catalyst → Chrome MCP DOM probe on both surfaces; codebase grep for canonical components.
- Jira→Catalyst → Chrome MCP on Catalyst + Atlassian MCP (`getJiraIssueTypeMetaWithFields`, `getJiraIssue`, `searchJiraIssuesUsingJql`) on Jira; live DOM on the Jira surface for visual confirmation.

---

## Soft Announcement (mandatory — fires when skill activates)

Emit this exact block in chat BEFORE Phase 0:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 catalyst-clone · END-TO-END REPLICATION
Source: {source-url-or-route}
Target: {target-url-or-route}
Mode:   {Catalyst↔Catalyst | Jira→Catalyst}
Phases: 0 scope · 1 abilities · 2 variations · 3 components ·
        4 fields · 5 probe plan · 6 ADS · 7 guardrails ·
        8 patch · 9 verify · 10 lesson-log
HALT-AT-EACH-PHASE: evidence required before advance.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When the run completes:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧬 catalyst-clone · COMPLETE
Abilities cloned: {N} / {N}
Variations: {identical/vocab/schema/type-conditional/excluded breakdown}
Gates: G1-G10 ✓ · L1-L10 ✓ · ADS ✓
Lesson appended to CLAUDE.md.
Commit: {sha}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Phase 0 — Scope Contract

**User declares (or the skill asks):**
- Source URL or route
- Target URL or route
- What changes between them (one or more of: data-source / work-item-type / field-shape / vocabulary / RLS-policy / styling-only)

**Skill declares:**
- Mode (auto-detected from URLs)
- Canonical components that own each region of the source (grepped from source file)
- Adapter contract that will own the variation (e.g. `BacklogDataSource` for table clones, `HeaderAdapter` for header strips)

**Output — Scope Contract table (required):**

| Field | Value |
|---|---|
| Source URL | … |
| Target URL | … |
| Mode | … |
| Canonical owner component(s) | …, … |
| In-scope regions | …, … |
| Out-of-scope regions | …, … (banned columns, banned fields, banned interactions per CLAUDE.md) |
| Variation axes declared | data-source · work-item-type · field-shape · vocabulary · RLS |

**HALT** until this table is filled and acknowledged by the user.

---

## Phase 1 — Ability Matrix (probe both sides)

DOM-probe source AND target. Enumerate every **observable behavior**, not surface visuals.

### Probe categories (mandatory — every one of these must be filled in)

1. **Cell types** — for each column: which `make*Cell` / `make*EditCell` factory renders it?
2. **Edit affordances** — for each editable cell: click→popover? keyboard activate? dispatchEvent → DOM assertion result?
3. **Toolbar** — filter pills, group-by, sort, type-filter, saved filters, column picker, Ask Caty, bulk-change menu
4. **Keyboard** — arrow nav, Tab order, Esc behavior, Enter behavior, `c` for create, `j/k` row nav
5. **Drag/drop** — row drag handle (and its conditional visibility: no sort + no group), drop targets, ghost row
6. **Group / sort / filter** — every group-by option enumerated; every sortable header; every column filter menu opened
7. **Bulk ops** — row select checkbox, bulk-select footer, transition / move / delete actions
8. **Footer / pagination / virtualization** — sticky create row, row count, page size, scroll behavior
9. **Detail-open behavior** — row click → side panel vs full page vs modal; chevron prev/next
10. **Vocabulary** — for status: { value, label, lozenge color }. For priority: { value, label, icon }. For type: { value, label, icon }.

### Probe JS — paste into Chrome MCP `javascript_tool`

```js
// Run on BOTH source and target. Returns an ability matrix row per column.
(function probeBacklogAbilities() {
  const rows = [];
  const headers = document.querySelectorAll('thead th, [role="columnheader"]');
  headers.forEach((h, i) => {
    const id = h.getAttribute('data-column-id') || h.getAttribute('data-col') || `col_${i}`;
    const label = (h.textContent || '').trim().slice(0, 40);
    const sortable = !!h.querySelector('[aria-sort], [data-sortable="true"]');
    // First data cell in this column — probe its editability
    const firstRowCell = document.querySelector(`tbody tr:first-child td:nth-child(${i + 1})`);
    const hasEditButton = !!firstRowCell?.querySelector('button, [role="button"], [contenteditable], [data-edit]');
    const hasInput = !!firstRowCell?.querySelector('input, select, [role="combobox"]');
    const hasAvatar = !!firstRowCell?.querySelector('[role="img"], [data-avatar], img[alt]');
    const hasLozenge = !!firstRowCell?.querySelector('[class*="lozenge"], [class*="Lozenge"]');
    rows.push({ idx: i, id, label, sortable, editable: hasEditButton || hasInput, hasAvatar, hasLozenge });
  });
  // Toolbar
  const toolbar = {
    filterButton:  !!document.querySelector('[data-testid*="filter"], button[aria-label*="ilter" i]'),
    groupButton:   !!document.querySelector('[data-testid*="group"], button[aria-label*="roup" i]'),
    columnPicker:  !!document.querySelector('[data-testid*="column"], button[aria-label*="olumn" i]'),
    askCaty:       !!document.querySelector('[data-testid*="caty"], button:has(svg[aria-label*="aty" i])'),
    bulkChange:    !!document.querySelector('[data-testid*="bulk"], button[aria-label*="ulk" i]'),
    searchInput:   !!document.querySelector('input[type="search"], input[placeholder*="earch" i]'),
  };
  // Footer
  const footer = {
    stickyCreate:  !!document.querySelector('tfoot, [data-testid*="footer-create"], [data-testid*="inline-create"]'),
    rowCount:      (document.body.innerText.match(/\b\d+\s+(of\s+\d+\s+)?items?\b/i) || [null])[0],
    pagination:    !!document.querySelector('[aria-label*="ext page" i], button[aria-label*="agination" i]'),
  };
  // Drag affordance — show only when no sort + no group
  const dragHandle = !!document.querySelector('[data-drag-handle], [class*="drag"][role="button"]');
  return { columns: rows, toolbar, footer, dragHandle };
})();
```

### Output — ability matrix table

| # | Column / Ability | Source factory / vocab | Target factory / vocab | Status |
|---|---|---|---|---|
| 1 | Status | `makeStatusEditCellAkPopup({ getStatus, options: STATUS_OPTIONS, onChange: updateField })` | currently `<span>` raw enum | **broken-on-target** |
| 2 | Assignee | `makeAssigneeEditCell` + profile picker | currently `<Avatar>` read-only | **broken-on-target** |
| … | … | … | … | … |
| N | Drag-to-rank | `__drag` + dnd-kit | present | **identical** |

**HALT** until every column AND every ability category is filled. Reject vague entries.

---

## Phase 2 — Variation Map (5 axes)

For every ability from Phase 1, assign **exactly one** axis:

| Axis | Meaning | Action |
|---|---|---|
| **Identical** | Same factory + same vocab on both sides | Mount as-is via adapter |
| **Vocab-different** | Same factory, different option set (e.g. `urgency` ⟂ `priority`, `process_step` ⟂ `status`) | Adapter feeds `options` / `labelByValue` / `colorByValue` |
| **Schema-different** | Different DB column on the same conceptual field (e.g. `end_date` ⟂ `due_date`) | Adapter's `fieldMap` translates field id → DB column |
| **Type-conditional** | Behavior depends on work-item-type (Epic has no Parent picker; BR has no Sprint; QA Bug has Severity) | Per-type branch in cell renderer + per-type probe |
| **Excluded** | Doesn't apply to target (Comments banned; Fix versions N/A for BR; Story Points permanently banned) | Don't mount; add to picker exclusion set or `BANNED_COLUMN_IDS` |

**Output — decision table:**

| Ability | Axis | Rationale | CLAUDE.md citation |
|---|---|---|---|
| Status | Vocab-different | BR uses `process_step` enum (new, demand_approved, …) with custom colors | "2026-06-01 — Drop 89 legacy columns" |
| Comments | Excluded | Permanently banned in tables | "🚫 No banned columns" rule |
| Delivery Manager | Schema-different | `project_manager_user_id` not `assignee_account_id` | `business_requests` schema |
| … | … | … | … |

**HALT** until every ability has an axis tag and a rationale.

---

## Phase 3 — Canonical-Component Identity Gate (Clone-Parity G1-G10)

Run the 10 gates from `design-critique`:

| Gate | Check |
|---|---|
| G1 | Are EXACT SAME React components from the reference mounted on the target? |
| G2 | If canonical is hardwired to one data source, is the FIX to parameterise (adapter prop) — not fork? |
| G3 | Interaction parity, not just visual — clicking produces same state transitions |
| G4 | Naming parity (role-substituted only) |
| G5 | Icon-type registry compliance |
| G6 | No external image URLs |
| G7 | Root elements are `<div>`, not `<aside>`/`<section>`/`<nav>` |
| G8 | No duplicate fields (right rail vs center) |
| G9 | Right-rail idle affordances present |
| G10 | DOM/CSS probe quote required for every verdict |

**Output:** explicit gate-pass table with DOM probe evidence per row.

**HALT on any G failure.** Plan revision required before Phase 4.

---

## Phase 4 — Field-Binding Contract

For every editable cell, declare in writing:

```
{ cellId } → { adapter.fieldMap[cellId] } → { DB column on target table }
```

Extend the adapter contract with:
- `fieldMap: Record<CellId, DbColumnName>`
- `optionsByField: Record<CellId, Option[]>` (for select cells)
- `labelByValue: (cellId, value) => string` (for vocab translation)
- `colorByValue: (cellId, value) => LozengeAppearance | string` (for status/priority)
- `iconByValue?: (cellId, value) => ReactNode` (for type/priority icons)

**Output:** TypeScript-level interface diff. No `as any`, no implicit fallthroughs.

For Jira→Catalyst clones, the field map also includes:
- Jira field key → Catalyst column id (e.g. `customfield_10125` → `severity`)
- Jira screen scheme verification via `getJiraIssueTypeMetaWithFields` — fields NOT in the scheme MUST be excluded

**HALT** until the contract is committed in writing.

---

## Phase 5 — Interaction Probe Plan (test-first)

For every editable cell, write the verification probe BEFORE writing the implementation. The probe is the spec.

**Template per cell:**

```js
// Status edit probe — paste into Chrome MCP after the patch lands
(async function probeStatusEdit() {
  const cell = document.querySelector('[data-row="MDT-221"] [data-col="status"]');
  if (!cell) return { error: 'cell not found' };
  // 1. Open the editor
  cell.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  await new Promise(r => setTimeout(r, 300));
  const popup = document.querySelector('[role="listbox"], [role="menu"]');
  if (!popup) return { step: 'open', pass: false };
  const optionLabels = Array.from(popup.querySelectorAll('[role="option"]')).map(o => o.textContent.trim());
  // 2. Assert vocab — pretty labels, NOT raw enum slugs
  const hasRawSlug = optionLabels.some(l => /^[a-z_]+$/.test(l));
  if (hasRawSlug) return { step: 'vocab', pass: false, sample: optionLabels.slice(0, 3) };
  // 3. Pick an option, capture network call
  // (real test: use Network panel or supabase mock to assert the PATCH)
  return { step: 'open', pass: true, options: optionLabels };
})();
```

**Output:** one probe per editable cell, plus probes for:
- Drag-to-rank (drag start + drop target + persist)
- Group-by reflow (change group → assert rows regroup)
- Sort (click header → assert order reverses)
- Filter (open menu → pick value → assert rows filter)
- Bulk select (select 2 rows → assert footer shows count + actions)
- Detail open (row click → assert panel opens with correct entity)
- Sticky create (focus footer → type → submit → assert row appears)

**HALT** until every editable cell + every interactive ability has a probe.

---

## Phase 6 — ADS Validation Pre-Gate (planned files, not just committed)

Run ADS audit against the LIST OF FILES the plan touches — BEFORE writing code:

```bash
node design-governance/cli/index.js audit src/{file1}.tsx src/{file2}.tsx ...
```

Required: **0 violations on planned files.** If the plan introduces new color/typography/spacing values that aren't tokenized, revise the plan to use ADS tokens FIRST.

For new column cells, default to:
- Text: `color: var(--ds-text, #172B4D)`
- Subtle text: `var(--ds-text-subtle, #42526E)`
- Subtlest text: `var(--ds-text-subtlest, #6B778C)`
- Border: `var(--ds-border, #DFE1E6)`
- Hover bg: `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))`
- Link: `var(--ds-link, #0052CC)`

**HALT** on any token violation.

---

## Phase 7 — Guardrails Re-Scan (L1-L10 + permanent CLAUDE.md bans)

Re-read CLAUDE.md before this phase. Quote each guard + verdict:

| Guard | Quoted rule | Verdict | Evidence |
|---|---|---|---|
| L1 | "NEVER build a parallel section component" | PASS | Plan uses `makeAssigneeEditCell` not new `BrAssigneeCell` |
| L2 | "NEVER map field-values to icon-type-strings" | PASS | `request_type` stays a field value; icon comes from canonical `Business Request` |
| L3 | "NEVER use external image URLs as avatar sources" | PASS | `resolveAvatarUrl(name)` only |
| L4 | "NEVER `git add -A`" | PASS | Stage explicit paths |
| L5 | "Visual parity ≠ functional parity" | PASS | Interaction probes in Phase 5 |
| L6 | "Read CLAUDE.md before EVERY edit" | PASS | Re-read at Phase 0 + Phase 7 |
| L7 | "Root elements are `<div>`, never `<aside>`/`<section>`/`<nav>`" | PASS | All new wrappers are `<div>` |
| L8 | "Naming must mirror reference role-for-role" | PASS | "Project Backlog" → "Product Backlog" |
| L9 | "Never render the same field in two places" | PASS | Fields appear in EITHER table OR detail rail, not both |
| L10 | "Visible fast is the slowest path" | PASS | Canonical components mounted, not new ones |

**Permanent CLAUDE.md bans (always re-checked):**
- Comments column in tables → permanently banned
- Story Points (anywhere on BR / Product Hub)
- MDT Ref custom field
- Assessment Feature custom field
- Service Now#
- Standalone Type column (icon goes inside Key cell)
- Catalyst Intelligence / AI Sparkles inline button
- Development section / Automation section / Automate button in right rail
- Hardcoded hex colors / Tailwind color utilities on chrome
- Spinning rainbow / consumer animations on enterprise UI
- `<aside>` as root for any section
- `git add -A`

**HALT** on any L or ban failure.

---

## Phase 8 — Patch (single PR, surgical)

Constraints:
- Single PR per clone. No file scope outside the plan.
- Stage explicit paths only — `git -C . add path/a path/b path/c`. **NEVER** `-A` / `.`.
- Run `git status` BEFORE every commit. If unexpected files appear, halt; investigate stale working tree.
- Commit message MUST cite:
  - Source → Target route pair
  - Variation axes touched
  - Abilities cloned (count + matrix row #s)
  - Gates passed (G1-G10 ✓ · L1-L10 ✓ · ADS ✓)
  - Caveats / deferred work
- Branch name: `{TargetHub}-{Surface}-clone-{NN}` per CLAUDE.md branch convention (or push to main if `main` is the convention and the user authorized).

**HALT** if `npm run build` is not green or `npx tsc --noEmit` has errors.

---

## Phase 9 — Verification Probe (run the Phase 5 probes live)

Re-execute every probe written in Phase 5 against the patched surface.

For each probe:
- Run via Chrome MCP `javascript_tool`
- Capture the result
- Screenshot the surface with the design-critique SVG arrow overlay flagging the area under test
- Assert mutation persistence: refresh the page; the edit MUST survive

**Output:** probe results table — every row is `{ ability, probe-result, screenshot-caption }`. Any failure rolls back the commit before Phase 10.

---

## Phase 10 — Lesson Auto-Log (mandatory, every run)

Append to **project CLAUDE.md** (this repo's root CLAUDE.md). Location: a new dated section under the existing lesson stream, or a dedicated `## YYYY-MM-DD — Catalyst Clone — {target}` heading.

**Template:**

```markdown
## YYYY-MM-DD — Catalyst Clone: {target-surface} from {source-surface}

**Mode:** {Catalyst↔Catalyst | Jira→Catalyst}
**Surfaces:** source `{source-url}` → target `{target-url}`
**Scope axes:** {axes affected}
**Abilities cloned:** {N} (matrix rows {#-#})
**Variations:**
- Identical: {N}
- Vocab-different: {N}
- Schema-different: {N}
- Type-conditional: {N}
- Excluded: {N}
**Gates:** G1-G10 ✓ · L1-L10 ✓ · ADS ✓
**Caveats / deferred:** {list, or "none"}
**Commit:** {sha}

### NEW LESSONS (promoted to permanent guards)
- {LN+1 — only if a NEW failure mode was discovered. Otherwise omit.}
```

**Always written**, even on perfect clones — cite which gates passed so future runs can grep "G7 ✓ — root `<div>` confirmed on BrSidebarDetails" if they're ever debugging a regression.

On failure or new discovered lesson:
- Upgrade the entry to a permanent CLAUDE.md guard (add L11, L12, …)
- Add a row to the Clone-Parity Gate (G11, G12, …) if it's a clone-specific failure mode
- Update this skill (`SKILL.md`) with the new gate

---

## Mode-specific notes

### Catalyst↔Catalyst mode

- Source probe: Chrome MCP DOM probe on source route
- Target probe: Chrome MCP DOM probe on target route
- Codebase grep: `grep -rn "from.*BacklogPage\|from.*JiraTable\|from.*Editable" src/` to map factory usage
- Adapter discovery: every "X→Y" clone goes through a `DataSource` / `Adapter` contract; if one doesn't exist, define it in Phase 4 BEFORE Phase 8

### Jira→Catalyst mode

- Source probe (Lane A): Chrome MCP on the Jira URL — DOM probe pretty labels, lozenge colors, computed styles
- Source probe (Lane B): Atlassian MCP — `getJiraIssueTypeMetaWithFields({ project, issueType })` returns the official screen scheme. Fields NOT in `fields[].key` MUST be excluded from the clone.
- Source probe (Lane C): `searchJiraIssuesUsingJql` against a canonical entity to sample real values
- Schema gate (anti-pattern #18): every Catalyst field added must trace back to a Jira screen-scheme field. Never add a field "because it'd be useful" — it MUST be in Jira's scheme.
- CRUD acceptance: Phase 9 probe must perform Create + Read + Update + Delete on a canonical Jira entity AND assert the Catalyst surface reflects each operation.

---

## Decision rules (non-negotiable)

1. If Phase 1 ability matrix is not exhaustively filled, refuse to advance.
2. If Phase 2 variation map has any "I'm not sure" rows, refuse to advance.
3. If Phase 3 G1-G10 has any FAIL, halt + revise plan.
4. If Phase 4 field-binding contract has any implicit `as any`, halt + name the column.
5. If Phase 5 probe plan is missing a probe for any editable cell, halt.
6. If Phase 6 ADS pre-gate has violations on planned files, revise plan BEFORE writing code.
7. If Phase 7 guardrails has any FAIL, halt + revise plan.
8. If `git status` shows files outside the plan staged, halt and investigate.
9. If Phase 9 verification probes fail, revert the commit before Phase 10.
10. Phase 10 lesson log is ALWAYS written, even on perfect runs.

---

## Failure modes & recovery

| Failure | Recovery |
|---|---|
| Source URL unreachable | Stop. Ask user for an alternate URL or login state. |
| Source surface has a behavior the codebase doesn't yet model (e.g. a Jira interaction Catalyst lacks the infra for) | Flag as **deferred** in Phase 0 scope; do NOT silently skip. |
| Adapter doesn't exist yet for the target surface | Phase 4 defines + ships the adapter contract as a prerequisite, in a separate prep PR if scope > 100 lines. |
| ADS audit reveals 100+ existing violations in the target file | Out-of-scope tech debt — flag as separate task (spawn via `mcp__ccd_session__spawn_task`); do NOT roll into the clone PR. |
| Phase 9 probe fails after commit | Revert via `git revert {sha}` BEFORE Phase 10. Phase 10 logs the failure as a new lesson. |
| User skips a phase mid-run | Skill REFUSES. Re-emits the gate. Restates evidence required. |

---

## References

- `CLAUDE.md` — the contract this skill enforces (re-read at Phase 0 + 7)
- `.claude/skills/design-critique/SKILL.md` — Clone-Parity Gate G1-G10 + L1-L10 + closure evidence protocol
- `.claude/skills/jira-compare/SKILL.md` — 3-lane Jira parity protocol (used in Phase 1 Lane B for Jira→Catalyst mode)
- `.claude/skills/catalyst-agent/SKILL.md` — probe-first router with TABLE gap report pattern
- `design-governance/cli/index.js` — ADS validator
- `design-governance/rules/audit.js` — audit rules
- Atlassian Design System: https://atlassian.design/
- Locked icon registry: CLAUDE.md "🔒 WORK ITEM TYPE ICONS — LOCKED REGISTRY"
- Banned columns / fields / components: CLAUDE.md permanent ban table (Comments, Story Points, MDT Ref, Service Now#, Assessment Feature, Catalyst Intelligence button, Development section, Automation section, …)

---

## Self-update policy

This skill **MUST** be updated when:
1. A clone run discovers a new failure mode → add a new G{N} gate or L{N} guard.
2. A new canonical component supersedes an old one → update the "canonical owner" examples.
3. A new variation axis is needed → expand Phase 2's table.
4. The CLAUDE.md icon registry or banned list grows → mirror in Phase 7.

Every self-update lands in the same PR as the lesson entry that triggered it.

---

## First-run inaugural validation

The inaugural use of this skill MUST be: re-clone the broken `/product-hub/INV/backlog` table from `/project-hub/BAU/backlog` end-to-end, including the inline edits that the rushed Phase B commit missed. This run will populate the first lesson entry under "## 2026-06-01 — Catalyst Clone (inaugural)" in CLAUDE.md.
