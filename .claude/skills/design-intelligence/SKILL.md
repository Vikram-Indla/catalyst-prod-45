---
name: design-intelligence
description: >-
  Proactive design intelligence layer for the Catalyst preflight pipeline.
  Fires automatically on every UI surface task BEFORE the council. Scans
  the surface under discussion against the Catalyst canonical component
  inventory, flags anti-patterns before code is written, identifies Jira
  parity gaps as opportunities (not defects), proposes 1–3 AI use cases
  specific to the surface, and enforces standardisation against the 5
  nearest sibling surfaces. Output: a structured "Design Intelligence Brief"
  that becomes the first input to Phase 1 council deliberation.
  Triggers on: any preflight with surface ∈ {ui-feature, ui-bug-fix,
  ui-refactor, design-only, cross-cutting}. Also manually triggerable via
  `/design-intelligence [surface description]`.
version: 1.0.0
author: Vikram × Claude, 2026-05-09
metadata:
  category: design-quality
  tags: [design, ai, standardisation, intelligence, preflight, proactive]
  maturity: stable
  pipeline_position: Phase 0.5 (fires after evidence acquisition, before council)
---

# Design Intelligence — Proactive Surface Brief

## Purpose

Catalyst's quality bar is: **better than Jira on every surface, not merely parity.** Jira parity is the floor, not the ceiling. This skill fills the gap between "does it match Jira?" (jira-compare) and "does it exceed Jira?" (design-intelligence). It runs before implementation starts so recommendations shape the build, not retrofit it.

The three questions it answers, for every surface, before a line of code is written:

1. **What anti-patterns are already present or about to be introduced?** (prevent regression)
2. **What does Jira do here, and what can Catalyst do better?** (identify opportunities)
3. **What AI use cases belong on this surface?** (make Catalyst premier)

---

## Soft Announcement (mandatory — fires when skill activates)

When this skill fires, emit this exact block in chat BEFORE producing any output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence · DISCOVERY
Surface: {surface name} · {route}
Scanning: canonical components · Jira parity gaps · AI use cases · sibling standardisation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When the brief is complete and violations are injected, emit:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence · BRIEF COMPLETE
{N} violations found · {M} AI opportunities · Score: {X}/15
Red arrows injected on live page. Screenshot follows.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Red → Green Arrow Protocol (mandatory for all violation display)

### Discovery phase — RED arrows

When violations are found, inject SVG arrows directly onto the live page using `javascript_tool`. Every violation gets a red arrow + label.

Arrow injection template:
```js
(function injectViolationArrows(violations) {
  // Remove any existing overlay
  document.getElementById('__di_overlay')?.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = '__di_overlay';
  Object.assign(svg.style, {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: 99999,
  });
  // Define red arrowhead marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'red-arrow');
  marker.setAttribute('markerWidth', '10');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('refX', '10');
  marker.setAttribute('refY', '3.5');
  marker.setAttribute('orient', 'auto');
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
  poly.setAttribute('points', '0 0, 10 3.5, 0 7');
  poly.setAttribute('fill', '#E5493A');
  marker.appendChild(poly);
  defs.appendChild(marker);
  svg.appendChild(defs);

  violations.forEach(({ x, y, label }) => {
    // Arrow line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x - 60));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(x - 8));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', '#E5493A');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#red-arrow)');
    svg.appendChild(line);
    // Label background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', String(x - 220));
    bg.setAttribute('y', String(y - 11));
    bg.setAttribute('width', String(Math.min(label.length * 7 + 8, 200)));
    bg.setAttribute('height', '16');
    bg.setAttribute('rx', '3');
    bg.setAttribute('fill', '#E5493A');
    svg.appendChild(bg);
    // Label text
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', String(x - 216));
    text.setAttribute('y', String(y + 1));
    text.setAttribute('font-size', '10');
    text.setAttribute('fill', 'white');
    text.setAttribute('font-family', 'system-ui, sans-serif');
    text.setAttribute('font-weight', '600');
    text.textContent = label.slice(0, 28);
    svg.appendChild(text);
  });
  document.body.appendChild(svg);
})([/* violations array: {x, y, label} */]);
```

Rules:
- Take a screenshot immediately after injection — violations must be visible with red arrows.
- Display screenshot inline in chat with caption: `🔴 VIOLATIONS — {surface} — {N} issues found`

### Post-fix phase — GREEN arrows

After fixes are applied, replace red arrows with green arrows using the same coordinates + "FIXED" prefix on each label:

```js
// Same template, replace '#E5493A' with '#22A06B', marker id 'green-arrow'
// Labels become: 'FIXED: ' + original_label
```

- Take a screenshot immediately after green injection.
- Display screenshot inline in chat with caption: `✅ FIXED — {surface} — {N} issues resolved`

Raw screenshots with no arrows are REJECTED. Both red (discovery) and green (post-fix) screenshots are mandatory.

---

## Trigger Conditions

Fires automatically from preflight Phase 0.5 when:
- Surface classification ∈ `{ui-feature, ui-bug-fix, ui-refactor, design-only, cross-cutting}`
- Task body mentions any visible user-facing component

Manual trigger: `/design-intelligence [surface or feature description]`

---

## The Brief — Structure (always produced)

The output is a **Design Intelligence Brief** in this exact format. It becomes the first document in every Phase 1 council prompt.

```
## Design Intelligence Brief — {surface} — {date}

### 1. Canonical Component Audit
| Component slot | Catalyst canonical | Detected / planned | Status |
|---|---|---|---|
| Work item type icon | JiraIssueTypeIcon (@/lib/jira-issue-type-icons) | [what the PR/task plans to use] | ✅ / ❌ |
| Project avatar | ProjectIcon (@/components/shared/ProjectIcon) | … | |
| Status indicator | StatusPill (custom) / @atlaskit/lozenge + override | … | |
| Sidebar nav item | SidebarBase + SidebarSection | … | |
| Dropdown / menu | @atlaskit/dropdown-menu (NOT shadcn DropdownMenu) | … | |
| Table row | @atlaskit/dynamic-table or JiraTable.tsx | … | |
| Inline edit | @atlaskit/inline-edit | … | |
| Color / token | token() from @atlaskit/tokens | … | |
| Typography | ADS token stack (12/600 headers, 14/400 body) | … | |

❌ rows = H4 violations. Halt implementation until resolved.

### 2. Jira Parity Gap → Opportunity Map
For each gap between Jira's surface and Catalyst's planned surface:
| Gap | Jira approach | Catalyst opportunity | Recommendation |
|---|---|---|---|
| Recent items typing | No icon — just text truncation | JiraIssueTypeIcon + two-line layout | Already applied 2026-05-09 |
| [next gap] | … | … | … |

Opportunities are categorised:
- **MATCH** — implement to Jira parity (floor)
- **EXCEED** — implement better than Jira (target)
- **SKIP** — deliberately below Jira (banned columns, Development section, etc.)

### 3. AI Use Cases (surface-specific)
For each surface, 1–3 AI enhancements that Catalyst can own and Jira cannot:

| # | Surface | AI capability | Implementation hint | Priority |
|---|---|---|---|---|
| AI-1 | Sidebar Recent | **Predictive recency** — rank recent items by predicted next-visit probability (staleness × open PR count × last comment delta), not raw timestamp | Supabase Edge Function scoring recent items at query time; client receives pre-ranked list | P1 |
| AI-2 | Recent list | **Smart resume** — detect "interrupted sessions" (item visited > 3 times in 2h, then abandoned) and surface with "Continue where you left off?" badge | `user_recent_items` frequency + gap analysis; badge renders as ADS `color.background.warning.subtle` pill | P2 |
| AI-3 | Inline create | **Type prediction** — pre-select work item type in inline create based on the group context (e.g. if group header is a QA Bug status, default type = QA Bug) | Last-used-type per group stored in localStorage; override with LLM call if Jira screen scheme is available | P2 |

### 4. Sibling Surface Standardisation Check
The 5 nearest surfaces that use overlapping primitives:
| Sibling surface | Shared primitive | Their pattern | Match planned? |
|---|---|---|---|
| BacklogPage list | JiraIssueTypeIcon | size=16, direct import | — |
| GlobalSearchPanel | JiraIssueTypeIcon | size=16, direct import | — |
| NotificationsPanel | WorkItemIcon (deprecated shim) | — | — |
| AllWorkPage | JiraIssueTypeIcon | size=16, direct import | — |
| KanbanBoardPage | JiraIssueTypeIcon | size=16, direct import | — |

Rule: if 4 of 5 siblings use pattern X, the surface under design MUST use pattern X. No exceptions without explicit Vikram approval.

### 5. Design Elevation Score (pre-build)
Estimate before implementation. Re-score after implementation (design-critique does the post-build score).

| Dimension | Score (0–3) | Rationale |
|---|---|---|
| Canonical compliance | /3 | |
| Jira parity floor met | /3 | |
| Catalyst exceed opportunities identified | /3 | |
| AI use case wired | /3 | |
| Sibling standardisation | /3 | |
| **Total** | **/15** | |

Threshold: **≥ 11/15** to proceed. Below 11 = halt and redesign.

### 6. Blocking Findings (must resolve before Phase 1 council)
List all ❌ rows from section 1 + any EXCEED opportunities that are P0.
```

---

## Canonical Component Inventory (maintained here — update when a new canonical is established)

| Slot | Canonical component | Import path | Do NOT use |
|---|---|---|---|
| Work item type icon | `JiraIssueTypeIcon` | `@/lib/jira-issue-type-icons` | Coloured dots, `WorkItemIcon` (deprecated shim), raw emoji |
| Project avatar | `ProjectIcon` | `@/components/shared/ProjectIcon` | Raw `<img>`, FolderKanban icon |
| Status indicator | `StatusPill` (custom) | `@/components/shared/StatusPill` | Raw `@atlaskit/lozenge` without the uppercase-override wrapper |
| Sidebar nav | `SidebarBase` + `SidebarSection` | `@/components/layout/SidebarBase` | Custom nav lists, shadcn nav items |
| Dropdown menu | `@atlaskit/dropdown-menu` | `@atlaskit/dropdown-menu` | shadcn `DropdownMenu`, radix `DropdownMenu` |
| Table | `JiraTable` (complex) or `@atlaskit/dynamic-table` | project-local / `@atlaskit/dynamic-table` | shadcn Table, plain `<table>` |
| Inline edit | `@atlaskit/inline-edit` | `@atlaskit/inline-edit` | contenteditable divs, shadcn Input in edit mode |
| Color tokens | `token()` | `@atlaskit/tokens` | Raw hex, `text-slate-*`, Tailwind color classes |
| Popup / popover | Self-rolled `useRef` + mousedown (see CLAUDE.md 2026-05-05) | — | `@atlaskit/popup` v4 (empty-portal bug), shadcn Popover |
| Typography | ADS token stack | `token()` | Tailwind text-* sizing |
| Priority icon | `EditablePriority` | `@/components/catalyst/EditablePriority` | Lucide ArrowUp/Down as raw priority indicators |

---

## AI Use Case Library (surface-indexed)

When this skill fires, pull the relevant rows for the surface under discussion. Add new use cases here as they are identified.

### Sidebar / Recent / Navigation
- **Predictive recency rank** — score items by (recency × engagement frequency × open-action count) not raw timestamp. Jira shows raw timestamp; Catalyst can show ranked by predicted relevance.
- **Smart resume badges** — detect interrupted sessions and surface "Continue?" affordance with ADS `warning.subtle` bg.
- **Cross-project activity heatmap** — for power users with 5+ projects, show a minimap in the sidebar footer showing which projects had activity in the last 24h (dot size = activity density). Jira has nothing like this.

### Project Hub / All Projects
- **AI project health score** — per-project composite: overdue issues ÷ total, recent PR merge rate, blocker count. Single number (0–100) with ADS traffic-light color. Jira shows no such aggregate.
- **Trend sparklines** — 7-day sparkline of issue throughput per project in the table row. Jira has no sparklines.
- **Smart "Create project" pre-fill** — when user clicks Create Project, LLM suggests project key, name, and icon based on the name typed. Jira shows blank fields.

### Backlog / Work Lists
- **AI story point estimator** — when inline create commits a summary, suggest a size (XS/S/M/L/XL) based on semantic similarity to closed issues.
- **Duplicate detector** — as user types a new issue summary, surface a "similar existing issue" chip if cosine similarity > 0.85 against the project's issue embeddings.
- **Smart assignee suggest** — suggest assignee based on who resolved the last 5 similar issues (type + label cluster).

### Detail Views / Sidebars
- **AI description enhancer** — already exists as ImproveIssueDropdown in right rail. Ensure it is the ONLY AI entry point (no inline sparkle button — permanently banned).
- **Relationship suggest** — after saving a new issue, AI scans for likely `is blocked by` / `duplicates` links based on title embedding match. Shows as a dismissible banner.

### Kanban / Board
- **Bottleneck detection** — highlight columns where average dwell time > project median. ADS `color.background.danger.subtle` column header wash. Jira has WIP limits but no AI dwell-time analysis.
- **Swimlane auto-grouping** — suggest optimal swimlane dimension (assignee vs epic vs priority) based on current sprint composition.

---

## Hard Rules

1. **AI use cases must be surface-specific.** Generic "add AI" recommendations are worthless. Every AI row must name the exact component it touches, the data source, and the ADS color token it renders with.
2. **No AI recommendation that requires banned components** (Development section, Automation section, AI sparkle inline button, Service Now#, MDT Ref). AI use cases work within Catalyst's constraints.
3. **Sibling standardisation rule is binary.** If 4+ of 5 siblings use a canonical, you must match it. There is no "discuss with council" — the council receives this as a constraint, not a question.
4. **The brief is mandatory input to Phase 1.** No council proceeds without the brief. If the surface is trivial (council skipped), the brief still goes in the Phase 2 plan as a constraint row.
5. **Update the inventory.** When a new canonical component is established in any session, add it to the Canonical Component Inventory table in this SKILL.md. Don't let it drift.

---

## Integration with Preflight Pipeline

```
Phase 0  — Bootstrap (CLAUDE.md, skills list, prior handovers)
Phase 0.5 — Evidence acquisition (jira-compare, ads-validator, schema-probe)
           + design-intelligence Brief ← THIS SKILL (fires here)
Phase 1  — Council (receives Phase 0.5 evidence + design-intelligence Brief)
Phase 2  — Plan synthesis (brief's blocking findings become mandatory rows)
Phase 4  — Visual aid (brief's AI use cases become optional mockup rows)
Phase 5  — Handover (brief's AI use case list appended to Open Items)
Phase 6  — Closure Evidence (annotated screenshots, inline in chat)
```

The brief's **Blocking Findings** (section 6) always become mandatory Phase 2 rows — they are not optional.
The brief's **AI use cases** at P1 priority become Phase 2 rows. P2 become Phase 5 Open Items.

---

## Worked Example — Sidebar Recent (2026-05-09, retrospective)

This is what would have fired had the skill existed during the sidebar Recent build:

**Canonical Component Audit:**
- Work item type icon slot: ❌ — planned as coloured dot via `issueTypeColor()`. Canonical = `JiraIssueTypeIcon`. Halt.

**Jira Parity Gap → Opportunity:**
- Jira shows plain text with timestamp. Catalyst two-line (summary + KEY) already EXCEEDS Jira — keep.
- Jira shows no type icon in Recent at all. Catalyst adding `JiraIssueTypeIcon` = EXCEED. Apply.

**AI Use Cases proposed:**
- AI-1: Predictive recency rank (P1)
- AI-2: Smart resume badge (P2)
- AI-3: Cross-project activity heatmap in sidebar footer (P2)

**Sibling check:** BacklogPage, GlobalSearch, AllWork, Kanban all use `JiraIssueTypeIcon` size=16. Sidebar must match.

**Result:** Blocking finding caught before any code written. Council not needed for a trivial fix. Fix applied in < 5 minutes. Zero regression risk.

---

## References

- `CLAUDE.md` — canonical component rules, ban list, ADS-token mandate
- `design-critique/SKILL.md` — post-build scoring (pairs with this skill)
- `jira-compare/SKILL.md` — parity gate (provides evidence for section 2)
- `preflight/SKILL.md` — pipeline host
- Atlassian Design System: https://atlassian.design/
