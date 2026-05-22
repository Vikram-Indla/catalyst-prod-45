---
name: ADS Compliance Audit & Fix Checkpoint
version: 1.0.0
description: >-
  Systematic ADS compliance audit + fix dispatch checkpoint for Catalyst surfaces.
  Invoked from catalyst-agent Step 4.7 and jira-compare post-Lane A.
  Produces a scored compliance report and dispatches fix agents for P0/P1 violations.
author: Vikram × Claude, 2026-05-22
---

# ADS Compliance Audit & Fix Checkpoint (ACAFC v1.0)

> **Invoked from:** catalyst-agent Step 4.7 · jira-compare ACAFC gate (after Lane A diff table)
> **Purpose:** Systematic 5-phase audit + fix dispatch — not a report, a pipeline stage
> **Threshold:** 85% compliance score required to pass. Below threshold = dispatch fix agents.

---

## Resource Qualification Matrix (all 15 Atlassian resources)

Verdict is INCLUDE / SKIP / FLAG / CONDITIONAL / REJECT. Every INCLUDE resource has a trigger signal — if the signal fires on the surface, the resource MUST be fetched via `WebFetch`.

| # | Resource | Verdict | Signal trigger | Use in Catalyst |
|--:|---|---|---|---|
| 1 | https://atlassian.design/ | **INCLUDE — always** | Any UI surface | Single visual authority for all component/token/layout decisions |
| 2 | https://atlassian.design/components/tokens/all-tokens | **INCLUDE — always** | Any color/token/border decision | Light + dark values, semantic names. Canonical source — never guess a token name. |
| 3 | https://atlassian.design/get-started/develop | **INCLUDE — setup/audit** | New component, package install, "is there an ADS version of X?" | Confirms @atlaskit npm scope and install patterns. Consult before hand-rolling any component. |
| 4 | https://atlaskit.atlassian.com/get-started | **INCLUDE — discovery** | Unknown/new component needed | Browse available @atlaskit packages before hand-rolling. If it exists in Atlaskit, use it. |
| 5 | https://atlaskit.atlassian.com/packages/design-system/tokens/changelog | **SKIP — use #2** | — | Changelog only; all-tokens (#2) is more actionable. Refer to changelog only to check breaking token changes. |
| 6 | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ | **INCLUDE** | description, comment, ADF, rich text, editor | ADF node type verification. Cite for every description/comment rendering finding. |
| 7 | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ | **INCLUDE** | ADF validation or test-data generation needed | Generate + validate ADF JSON samples. Use before writing @atlaskit/editor-core integration code. |
| 8 | https://www.npmjs.com/package/@atlaskit/editor-core | **INCLUDE** | Description or comment in write/edit mode | Rich-text editor. Jira-grade description editing. Canonical for any editable rich-text field. |
| 9 | https://www.npmjs.com/package/@atlaskit/renderer | **INCLUDE** | Description or comment in read/display mode | ADF read-only rendering. Never use dangerouslySetInnerHTML for ADF content. |
| 10 | https://www.npmjs.com/package/@atlaskit/adf-utils | **INCLUDE** | ADF content manipulation, conversion, traversal | traverse/map API for programmatic ADF operations. |
| 11 | https://www.npmjs.com/package/@atlaskit/dynamic-table | **FLAG — reference only, BANNED as primary** | Table surface | **BANNED as primary table for work item lists** (CLAUDE.md: JiraTable is canonical). Use only to understand the underlying Atlaskit table API when extending JiraTable. Never introduce as a new table implementation. |
| 12 | https://atlassian.design/components/pragmatic-drag-and-drop | **INCLUDE — HIGH PRIORITY** | drag, drop, rank, reorder, kanban, backlog sort, sprint planning | Atlassian's canonical drag-and-drop system. Powers Jira, Trello, and Confluence. **Required for any drag interaction in Catalyst.** Any other DnD library is a P0 violation. |
| 13 | https://github.com/atlassian/pragmatic-drag-and-drop | **INCLUDE — HIGH PRIORITY** | Same as #12 | GitHub source: actual API docs, adapter list (`element`, `sortable`, `tree-item`), examples with Atlaskit integration. Fetch alongside #12 for implementation. |
| 14 | https://developer.atlassian.com/platform/forge/design-tokens-and-theming/ | **CONDITIONAL — Forge only** | Catalyst screen running inside an Atlassian Forge app | Only for Forge-embedded surfaces. Skip entirely for standalone Catalyst. Points back to ADS tokens anyway. |
| 15 | https://www.npmjs.com/package/@atlassian/aui | **REJECT** | — | Legacy AUI. Banned in Catalyst. Never introduce in new code. Ignore if seen in old code — replace with @atlaskit equivalent, do not extend. |

---

## Phase 1 — Static Scan (CLI-based, no browser needed)

Run first. Phase 1 findings feed directly into Phase 3 triage.

```bash
# Full ADS audit on the surface file(s)
node design-governance/cli/index.js audit src/[file-or-dir]

# Self-test the audit tool (verifies the scanner isn't broken — CLAUDE.md 2026-05-19 lesson)
node design-governance/scripts/self-test.mjs

# Wrong DnD library (P0 — must use pragmatic-drag-and-drop)
grep -rn "react-beautiful-dnd\|@dnd-kit\|@hello-pangea/dnd\|SortableContext\|DragDropContext\|useDraggable\|useDroppable" \
  src/ --include="*.tsx" --include="*.ts" -l

# Legacy AUI imports (P0 — banned in Catalyst)
grep -rn "@atlassian/aui" src/ --include="*.tsx" --include="*.ts" -l

# dynamic-table used as primary (P0 for work item surfaces)
grep -rn "@atlaskit/dynamic-table" \
  src/modules/project-work-hub/ src/pages/backlog/ src/pages/incidenthub/ \
  --include="*.tsx" -l 2>/dev/null

# Non-@atlaskit interactive components (shadcn, Radix)
grep -rn "from 'shadcn\|from '@radix-ui\|from 'react-select'" \
  src/ --include="*.tsx" -l

# dangerouslySetInnerHTML on description/comment content (ADF should use @atlaskit/renderer)
grep -rn "dangerouslySetInnerHTML" src/ --include="*.tsx" -l
```

Emit Phase 1 results immediately. Do not wait for Phase 2.

---

## Phase 2 — Runtime Scan (Chrome MCP probe script)

Navigate to `localhost:8080/{route}`, then run in `javascript_tool`:

```js
(function acafcRuntimeScan() {
  const violations = [];
  const v = (cat, sev, el, msg, sel) =>
    violations.push({ category: cat, severity: sev, element: el, message: msg, selector: sel || null });

  // 1. HARDCODED COLORS — inline style with raw hex or rgb not wrapped in var()
  document.querySelectorAll('[style]').forEach(el => {
    const s = el.getAttribute('style') || '';
    if (s.match(/#[0-9a-fA-F]{3,8}(?![^(]*\))/)) {
      v('TOKEN', 'P0', el.tagName + (el.className ? '.' + String(el.className).slice(0,30) : ''),
        'Hardcoded hex in inline style: ' + s.slice(0,80));
    }
    if (s.match(/(?<!\bvar\b.*?)rgb\(\d+/)) {
      v('TOKEN', 'P1', el.tagName,
        'Bare rgb() in inline style (wrap in var(--ds-token, rgb(...))): ' + s.slice(0,80));
    }
  });

  // 2. UPPERCASE LABELS — text-transform: uppercase on visible text elements
  document.querySelectorAll('th, td, label, [role="columnheader"], [class*="label"], [class*="header"]').forEach(el => {
    if (getComputedStyle(el).textTransform === 'uppercase' && el.textContent.trim().length > 0) {
      v('TYPOGRAPHY', 'P0', el.tagName + ':' + el.textContent.trim().slice(0,20),
        'text-transform: uppercase — Jira uses sentence-case everywhere');
    }
  });

  // 3. NON-ATLASKIT INTERACTIVE COMPONENTS
  [
    ['[class*="shadcn"]', 'P0', 'shadcn component detected — replace with @atlaskit equivalent'],
    ['[class*="radix-"]', 'P0', 'Radix UI component — replace with @atlaskit equivalent'],
    ['[data-rbd-drag-handle-draggable-id]', 'P0', 'react-beautiful-dnd drag handle — replace with @atlaskit/pragmatic-drag-and-drop'],
    ['[class*="dnd-kit"]', 'P0', '@dnd-kit detected — replace with @atlaskit/pragmatic-drag-and-drop'],
  ].forEach(([sel, sev, msg]) => {
    const count = document.querySelectorAll(sel).length;
    if (count > 0) v('COMPONENT', sev, sel, msg + ' (' + count + ' instances)', sel);
  });

  // 4. DRAG HANDLE — rows in sortable tables/backlogs should have pragmatic drag affordance
  const tableRows = document.querySelectorAll('[data-jira-table-row], [role="row"]:not([class*="header"]):not(thead *)');
  const hasPragmaticHandle = document.querySelector('[data-drag-handle-element-id], [aria-roledescription*="drag"], [class*="drag-handle"]');
  if (tableRows.length >= 2 && !hasPragmaticHandle) {
    v('DRAG', 'P1', 'table rows (' + tableRows.length + ')',
      'No drag handle found on table rows. Jira shows a 6-dot drag affordance on hover. Implement with @atlaskit/pragmatic-drag-and-drop');
  }

  // 5. OFF-GRID SPACING — check visible interactive elements
  const validGrid = new Set([0, 2, 4, 8, 12, 16, 24, 32, 40, 48]);
  let spacingViolations = 0;
  document.querySelectorAll('button, th, td, [role="cell"]').forEach(el => {
    const s = getComputedStyle(el);
    ['paddingTop', 'paddingLeft'].forEach(p => {
      const val = Math.round(parseFloat(s[p]));
      if (val > 0 && !validGrid.has(val)) spacingViolations++;
    });
  });
  if (spacingViolations > 5) {
    v('SPACING', 'P1', 'multiple elements', spacingViolations + ' off-grid spacing values (valid: 0/4/8/12/16/24/32px)');
  }

  // 6. ADF RENDERER — description rendered as raw HTML?
  document.querySelectorAll('[class*="description"], [data-testid*="description"], [data-component-selector*="description"]').forEach(el => {
    const hasRenderer = el.querySelector('[class*="renderer"], [class*="ak-renderer"]');
    if (!hasRenderer && el.innerHTML.includes('<p>') && el.textContent.length > 10) {
      v('ADF', 'P0', 'description area',
        'Description content may be raw HTML — should use @atlaskit/renderer with ADF JSON. Citation: https://www.npmjs.com/package/@atlaskit/renderer');
    }
  });

  // 7. FONT WEIGHT — non-ADS weights
  const validWeights = new Set(['300', '400', '500', '600', '653', '700', '800', '900', 'normal', 'bold']);
  let weightViolations = 0;
  document.querySelectorAll('h1, h2, h3, th, [class*="title"], [class*="heading"]').forEach(el => {
    const w = getComputedStyle(el).fontWeight;
    if (!validWeights.has(w)) weightViolations++;
  });
  if (weightViolations > 0) {
    v('TYPOGRAPHY', 'P2', 'headings/titles', weightViolations + ' non-ADS font-weight values (valid: 300/400/500/600/653/700/800/900)');
  }

  // SUMMARY
  const counts = { P0: 0, P1: 0, P2: 0 };
  violations.forEach(v => counts[v.severity]++);
  const penalty = counts.P0 * 10 + counts.P1 * 3 + counts.P2 * 1;
  const score = Math.max(0, 100 - penalty);
  const byCategory = violations.reduce((acc, v) => { acc[v.category] = (acc[v.category]||0)+1; return acc; }, {});

  console.log('ACAFC Phase 2 — score: ' + score + '% (P0:' + counts.P0 + ' P1:' + counts.P1 + ' P2:' + counts.P2 + ')');
  console.log('By category:', JSON.stringify(byCategory));
  console.log('Violations:', JSON.stringify(violations, null, 2));
  return { score, counts, byCategory, violations };
})();
```

---

## Phase 3 — Triage + Compliance Score

Combine Phase 1 (CLI) and Phase 2 (runtime) into the compliance report. Emit this block in chat:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACAFC COMPLIANCE REPORT — {surface} — {date}

Category    │ P0 │ P1 │ P2 │ Total │ Status
────────────┼────┼────┼────┼───────┼────────
TOKEN       │  X │  X │  X │   X   │ ✅/❌
COMPONENT   │  X │  X │  X │   X   │ ✅/❌
TYPOGRAPHY  │  X │  X │  X │   X   │ ✅/❌
SPACING     │  X │  X │  X │   X   │ ✅/❌
ADF         │  X │  X │  X │   X   │ ✅/❌
DRAG        │  X │  X │  X │   X   │ ✅/❌
MOTION      │  X │  X │  X │   X   │ ✅/❌
────────────┼────┼────┼────┼───────┼────────
TOTAL       │  X │  X │  X │   X   │

Compliance score: {N}%
  P0 × 10pt penalty + P1 × 3pt + P2 × 1pt deducted from 100
  Threshold: 85% — below this → FIX DISPATCH

Verdict: {PASS ≥85% | FAIL <85% → dispatch fix agents}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Severity definitions:**

| Severity | Penalty | Examples | Action |
|---|---|---|---|
| P0 | −10pt each | Wrong component (non-@atlaskit), hardcoded hex, wrong DnD library, ADF as raw HTML, AUI import | Dispatch fix agent immediately — blocks Step 5 / cycle close |
| P1 | −3pt each | Token misuse (wrong token for context), off-grid spacing, uppercase labels, missing drag handle | Dispatch fix agent in current session — offer before moving on |
| P2 | −1pt each | Non-ADS motion curve, section count badge styled, idle border on select, font weight 653 missing | Log in polish backlog — offer but does not block |

---

## Phase 4 — Fix Dispatch

**P0 violations:** dispatch fix agent immediately. Step 5 (gap report / diff table) does NOT proceed until P0s are resolved.
**P1 violations:** dispatch fix agent, offer to fix before moving to next component.
**P2 violations:** add to polish backlog in handover. Do not block.

### Fix patterns (use these in every fix agent prompt)

**TOKEN — hardcoded hex:**
```tsx
// BEFORE
style={{ color: '#172B4D', background: '#F4F5F7' }}

// AFTER
import { token } from '@atlaskit/tokens';
style={{
  color: token('color.text', '#172B4D'),
  background: token('color.background.neutral', '#F4F5F7'),
}}
// Citation: https://atlassian.design/components/tokens/all-tokens
```

**COMPONENT — non-@atlaskit dropdown:**
```tsx
// BEFORE
import { Select } from 'react-select';
import { DropdownMenu } from 'some-ui-lib';

// AFTER
import Select from '@atlaskit/select';
import DropdownMenu, { DropdownItem } from '@atlaskit/dropdown-menu';
// Citation: https://atlassian.design/components/select
//           https://atlassian.design/components/dropdown-menu
```

**DRAG — wrong DnD library:**
```tsx
// BEFORE — any of these:
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';

// AFTER
import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
// For lists/tables with auto-scroll:
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
// Citation: https://atlassian.design/components/pragmatic-drag-and-drop
// API:      https://github.com/atlassian/pragmatic-drag-and-drop
```

**ADF — raw HTML description rendering:**
```tsx
// BEFORE
<div dangerouslySetInnerHTML={{ __html: issue.description }} />
// or
<ReactMarkdown>{issue.description}</ReactMarkdown>

// AFTER
import ReactRenderer from '@atlaskit/renderer';
<ReactRenderer document={issue.description} /* ADF JSON doc node */ />
// Citation: https://www.npmjs.com/package/@atlaskit/renderer
// ADF structure: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/
```

**ADF — non-ADF description editor:**
```tsx
// BEFORE
<textarea value={description} onChange={...} />
// or any non-Atlaskit rich text editor

// AFTER
import { EditorContext, EditorActions } from '@atlaskit/editor-core';
import { Editor } from '@atlaskit/editor-core';
<EditorContext>
  <Editor
    appearance="comment"  // or "full-page" for full description edit
    onChange={(editorView) => { /* editorView.state.doc is the ADF doc */ }}
  />
</EditorContext>
// Citation: https://www.npmjs.com/package/@atlaskit/editor-core
// ADF playground: https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/
```

**TYPOGRAPHY — uppercase labels:**
```tsx
// BEFORE
<th style={{ textTransform: 'uppercase', fontWeight: 700 }}>STATUS</th>

// AFTER
<th style={{ textTransform: 'none', fontWeight: 600 }}>Status</th>
// Citation: https://atlassian.design/foundations/typography
```

**TABLE — dynamic-table used as primary on work item surface:**
```tsx
// BEFORE — for work items
import DynamicTable from '@atlaskit/dynamic-table';

// AFTER — for work items
import JiraTable from '@/components/shared/JiraTable';
// See: src/components/shared/JiraTable/ — canonical work item table (CLAUDE.md)
// dynamic-table reference: https://www.npmjs.com/package/@atlaskit/dynamic-table
```

### Fix agent dispatch template

```javascript
Agent({
  description: "Fix ADS [CATEGORY] [SEVERITY] violation: [short description]",
  subagent_type: "general-purpose",
  prompt: `Fix an ADS compliance violation in Catalyst.

File: [file path:line number]
Violation: [CATEGORY] [SEVERITY] — [description]
Current code: [exact snippet]
Required fix: [exact fix from fix patterns above]
ADS citation: [URL from Resource Qualification Matrix]

Rules:
- Use token() from @atlaskit/tokens for all color values
- Use @atlaskit/* components only — no shadcn, react-select, @dnd-kit, react-beautiful-dnd
- Use @atlaskit/pragmatic-drag-and-drop for ALL drag interactions
- Use @atlaskit/renderer for ADF read mode, @atlaskit/editor-core for ADF write mode
- JiraTable is canonical for work items — never introduce @atlaskit/dynamic-table as primary
- Match existing code style — minimal diff — fix only the stated violation
- After the fix, run: node design-governance/cli/index.js audit src/[file]
- Report: violations before and after`
})
```

---

## Phase 5 — Re-Verify

After all P0 and P1 fixes are applied:

```bash
# Re-run static scan
node design-governance/cli/index.js audit src/[file-or-dir]

# Re-run self-test
node design-governance/scripts/self-test.mjs
```

Re-run Phase 2 runtime probe. Emit the delta block:

```
ACAFC RE-VERIFY — {surface} — cycle {N}/3

P0: {before} → {after} ({fixed} fixed · {remaining} remaining)
P1: {before} → {after} ({fixed} fixed · {remaining} remaining)
P2: {before} → {after}

Compliance score: {before}% → {after}%
Status: {PASS ≥85% / FAIL → loop to Phase 4 (cap: 3 cycles)}
```

**Pass condition:** score ≥ 85% AND zero P0 violations remaining.
**On pass:** update GREEN SIGNAL dimension 8 (catalyst-agent) or mark ACAFC gate PASS (jira-compare).
**On fail after 3 cycles:** escalate remaining violations to user with explicit list. Do not loop further.

---

## Integration Points

| Skill / Gate | Where ACAFC runs | Phases executed | Pass condition |
|---|---|---|---|
| catalyst-agent Step 4.7 | After Step 4.6 (resource fetch) | All 5 phases | Score ≥ 85%, P0 = 0 |
| jira-compare ACAFC gate | After Lane A diff table, before CRUD gate | Phases 1–3; fix dispatch on user confirmation | Score ≥ 85% or Vikram-deferred items logged |
| GREEN SIGNAL dimension 8 | Withheld until ACAFC passes | Phase 3 score must be ≥ 85% | Score ≥ 85% |
| design-critique H4 (Consistency) | Informed by ACAFC Phase 3 TOKEN + COMPONENT | Phase 3 output | Zero COMPONENT P0s |
| design-critique H9 (Typography) | Informed by ACAFC Phase 3 TYPOGRAPHY | Phase 3 output | Zero TYPOGRAPHY P0s |
| design-intelligence pre-scan | ADF editor/renderer checks fed from ACAFC | Phase 1 static grep | Zero ADF P0s |

---

## Soft Announcement (emit when ACAFC activates)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  ACAFC v1.0 · ADS Compliance Audit & Fix Checkpoint
Surface: {surface} · localhost:8080/{route}
Phases: 1-Static → 2-Runtime → 3-Triage → 4-Fix dispatch → 5-Re-verify
Resources: 10 INCLUDE · 1 FLAG · 1 CONDITIONAL · 1 SKIP · 2 REJECT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️  ACAFC v1.0 · {PASS / FAIL}
Score: {N}% · P0: {X} · P1: {Y} · P2: {Z}
{PASS ≥85%: "GREEN SIGNAL dimension 8 satisfied"}
{FAIL <85%: "Fix dispatch in progress — {X} agents dispatched"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
