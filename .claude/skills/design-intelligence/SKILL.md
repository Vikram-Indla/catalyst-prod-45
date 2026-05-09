---
name: design-intelligence
description: >-
  500-IQ proactive design intelligence layer for the Catalyst preflight
  pipeline. Fires automatically on every UI surface task BEFORE the council.
  Activates the Foundation Council of 7 design masters (Saffer, Tufte, Rams,
  Norman, Ive, Raskin, Cooper) as mandatory analysis lenses before any pixel
  is committed. Scans canonical components, maps Jira parity gaps as
  opportunities, proposes 1-3 surface-specific AI use cases, enforces sibling
  standardisation, and scores Design Elevation /15. Output: a structured
  Design Intelligence Brief v2 that becomes the first input to every Phase 1
  council deliberation. Triggers on: any preflight with surface ∈
  {ui-feature, ui-bug-fix, ui-refactor, design-only, cross-cutting}. Manual:
  /design-intelligence [surface description].
version: 2.0.0
iq_level: 500
author: Vikram × Claude, 2026-05-09
metadata:
  category: design-quality
  tags: [design, ai, standardisation, intelligence, preflight, proactive, 500iq, foundation-council]
  maturity: stable
  pipeline_position: Phase 0.5 (fires after evidence acquisition, before council)
  council:
    - name: Dan Saffer
      domain: Microinteractions (Trigger→Rules→Feedback→Loops/Modes)
    - name: Edward Tufte
      domain: Data-ink ratio, chartjunk elimination, small multiples
    - name: Dieter Rams
      domain: 10 Principles of Good Design (honest, unobtrusive, long-lasting, thorough)
    - name: Don Norman
      domain: Affordances, signifiers, feedback loops, conceptual models (The Design of Everyday Things)
    - name: Jony Ive
      domain: Material honesty in digital, reduction to essence, inevitable transitions
    - name: Jef Raskin
      domain: No modes, minimal attention shifts, GOMS-modeled efficiency
    - name: Alan Cooper
      domain: Goal-directed design (design for the goal, not the task), persona-centered flows
---

# Design Intelligence v2 — 500-IQ Foundation Council Brief

## Purpose

Catalyst's quality bar is: **better than Jira on every surface, not merely parity.** Jira parity is the floor, not the ceiling. This skill fills the gap between "does it match Jira?" (jira-compare) and "does it exceed Jira in a way that is principled and defensible?" (design-intelligence v2).

The v2 upgrade adds the **Foundation Council** — 7 design masters whose combined lenses constitute 500-IQ design judgment. Every surface is interrogated through all 7 lenses before a line of code is written. This is not a checklist — it is a mandatory epistemological framework.

The three questions from v1, now interrogated by the council:

1. **What anti-patterns are already present or about to be introduced?** (prevent regression)
2. **What does Jira do here, and what can Catalyst do better?** (identify opportunities)
3. **What AI use cases belong on this surface?** (make Catalyst premier)

---

## Soft Announcement (mandatory — fires when skill activates)

When this skill fires, emit this exact block in chat BEFORE producing any output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence v2 · 500-IQ DISCOVERY
Surface: {surface name} · {route}
Council: Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper
Scanning: micro-interactions · data-ink · canonical components · AI use cases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When the brief is complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence v2 · BRIEF COMPLETE
{N} council findings · {M} AI opportunities · Score: {X}/15
{PROCEED / HALT — threshold 11/15}
Red arrows injected on live page. Screenshot follows.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## The Foundation Council — 7 Lenses, 500-IQ Judgment

Every surface analysis runs ALL 7 lenses. A finding from ANY lens is a blocking finding. The council does not vote — each master has veto power on their domain.

---

### Lens 1 — Dan Saffer: Microinteraction Anatomy
**Framework:** Trigger → Rules → Feedback → Loops/Modes

For every interactive element on the surface, decompose it into the four components:

| Element | Trigger | Rules | Feedback | Loops/Modes |
|---|---|---|---|---|
| {button/input/toggle} | {what initiates it — manual or system} | {what the system does, with constraints} | {what the user sees/hears/feels} | {does it recur? does it change state?} |

**Saffer red flags:**
- Feedback delay > 100ms (violates perceived immediacy — Fitts' Law for time)
- Mode switches with no visual mode indicator (Raskin collision — both flag)
- Trigger that is non-obvious (icon without label in non-expert context)
- Missing error state in Rules (what happens when the action fails?)
- Infinite loops with no exit affordance

**Application to Catalyst:** Every star button, inline-create, tab switch, sidebar toggle, status change, and assignee picker must pass Saffer's anatomy. The ageing tab's stale-row hover state must have: trigger (hover), rules (show 3-dot menu at opacity 1), feedback (opacity transition 150ms), loop (menu closes on blur — single mode, no modal trap).

---

### Lens 2 — Edward Tufte: Data-Ink Ratio
**Principle:** Maximize data-ink ratio. Every pixel that doesn't carry data is chartjunk and should be eliminated.

**Tufte audit for each surface element:**

| Element | Data ink | Non-data ink | Ratio | Verdict |
|---|---|---|---|---|
| {element} | {pixels encoding data} | {borders, backgrounds, decorations carrying no data} | {D/(D+N)} | ✅ KEEP / ❌ STRIP |

**Tufte red flags:**
- Table grid lines thicker than 0.5px hairlines (grid ink should whisper, not shout)
- Status lozenges with background fill when text color alone would suffice for low-density contexts
- Redundant labels (title + tooltip + ARIA label all saying the same thing)
- "Ink for ink's sake" — borders around items that are already separated by whitespace
- Sparkline axes (the sparkline IS the axis — don't add one)

**Application to Catalyst:** The For You tab bar has 5 tabs. Tufte asks: does each tab label need a badge count? Only if the count is the first thing the user acts on. A badge that says "3" when the user already knows they have 3 items = chartjunk. Reduce until what remains is irreducible.

---

### Lens 3 — Dieter Rams: 10 Principles of Good Design
**Principles (apply all 10 to every surface):**

1. **Innovative** — does this offer something Jira doesn't? (or is it a copy with worse execution?)
2. **Useful** — does every element serve a user goal? (not a developer convenience)
3. **Aesthetic** — is the design as minimal as it can be while remaining beautiful?
4. **Understandable** — does the product communicate its function without explanation?
5. **Unobtrusive** — does it allow the user to focus on their work, not on the UI?
6. **Honest** — does it not deceive? (no fake progressive disclosure, no "instant" AI that isn't)
7. **Long-lasting** — will this design age well? (no trend-dependent choices)
8. **Thorough** — is every detail considered? (not just the happy path)
9. **Environmentally friendly** — does it respect the user's attention budget? (cognitive load)
10. **As little design as possible** — have you removed everything that doesn't need to be there?

**Rams red flags:**
- Principle 5 violation: UI chrome that competes with content (the sidebar animating while a user is reading)
- Principle 8 violation: error state not designed (only happy path mocked)
- Principle 10 violation: more than 3 actions visible at once on a list row (3-dot menu is the safety valve)

---

### Lens 4 — Don Norman: Affordances, Signifiers, Feedback
**Framework:** Affordance (what action the object permits) vs Signifier (what communicates that affordance) vs Feedback (response to action)

For every interactive element:

| Element | Affordance | Signifier | Feedback | Gap |
|---|---|---|---|---|
| {element} | {what it can do} | {how it communicates that} | {what response the user gets} | {missing signifier / delayed feedback / wrong affordance} |

**Norman red flags:**
- **False affordance** — something that looks clickable but isn't (a lozenge styled like a button)
- **Hidden affordance** — hover-only actions with no visible trigger (star button at opacity 0 breaks discoverability for non-hoverers = touch users)
- **Missing feedback** — async action (save, star, assign) with no success/fail signal
- **Conceptual model mismatch** — UI uses "Archive" but data says "Close" — user thinks one thing, system does another
- **Mapping errors** — status pill colors that don't match the user's expectation from Jira (green ≠ done on every surface)

**Application to Catalyst:** The `onToggleStar` handler — does it give feedback (toast? icon state change?) within 100ms? If Supabase write is async and the icon flips optimistically, what happens on write failure? Norman demands the failure feedback be designed before the success feedback.

---

### Lens 5 — Jony Ive: Reduction and Material Honesty
**Principle:** Design to the point where you cannot remove anything more. Every element must be honest about what it is. Digital "materials" (elevation, shadow, border) must be used only when they communicate genuine hierarchy, not decoration.

**Ive audit:**

| Element | Is it earning its place? | Is the material honest? | Reduction possible? |
|---|---|---|---|
| {element} | yes/no | yes/no (fake elevation, decorative shadow) | yes/no + how |

**Ive red flags:**
- Decorative shadows that don't communicate elevation (a flat list row with a drop shadow is lying)
- Gradients for decoration rather than information encoding (gradients = state transitions in motion, not backgrounds)
- "Almost round" radius that doesn't commit to being circular or being rectangular
- Typography mixing 3+ weights on a single surface (visual noise)
- Transitions that don't feel "inevitable" — they feel arbitrary (use ease-out for expand, ease-in for collapse — never linear)

**Transition choreography rule (Ive):**
- Expand (panel open, row expand): `ease-out` — quick start, gentle settle = feels "pulled open"
- Collapse (panel close, row collapse): `ease-in` — gentle start, quick end = feels "falling shut"
- Hover state: `ease` (symmetric) — feels "responsive but calm"
- Error appear: no transition — appears instantly = urgency signal
- Success appear: `ease-out 300ms` — gentle arrival = calm confirmation
- Stagger animations: encode priority in sequence. Most important item animates first at t=0, secondary at t=40ms, tertiary at t=80ms. Never animate all items simultaneously — simultaneous = no hierarchy.

---

### Lens 6 — Jef Raskin: Cognitive Efficiency and No-Mode Design
**Principle:** The interface must demand minimum attention from the user. Every mode (a state where the same input produces different output) is a tax on the user's attention. The goal is locus of attention minimization.

**Raskin audit — modes inventory:**

| Mode | How entered | How exited | Visual indicator | User error risk |
|---|---|---|---|---|
| {modal / popover / inline edit} | {trigger} | {ESC / click outside / save} | {visual delta from base state} | high/med/low |

**Raskin red flags:**
- Mode with no visual indicator (user cannot tell which mode they are in)
- Two overlapping modes with conflicting keyboard shortcuts (ESC closes popover → ALSO closes modal = WatchersChip bug, already fixed)
- Mode that auto-activates without user intent (auto-scroll on tab switch = attention hijack)
- Hick's Law: n choices → decision time T = b·log₂(n+1). More than 7 choices in a menu = measurable slowdown. Cap at 7.
- Fitts' Law: time to acquire target ∝ distance/size. Tiny targets (< 24px) at the edge of a scrollable container = guaranteed misclick rate.

**Ageing tab example (Hick's Law applied):**
Current: 16 undifferentiated rows, no grouping = T = b·log₂(17) ≈ 4b units of decision time
Proposed: 3 age brackets (🔴90+ / 🟠60-90 / 🟡30-60) = T = b·log₂(4) = 2b units. 50% cognitive reduction from grouping alone.

---

### Lens 7 — Alan Cooper: Goal-Directed Design
**Principle:** Design for the user's goal, not the task. A task is what the user does; a goal is what they want to achieve. The interface should always work toward the goal, even when the task is ambiguous.

**Cooper audit — goal extraction:**

For each user segment visible on the surface:

| Persona | Primary goal on this surface | Tasks they perform | Is the UI optimized for the goal? | Gap |
|---|---|---|---|---|
| {persona} | {end goal} | {specific actions} | yes/no | {what's missing} |

**Cooper red flags:**
- Task-centric labeling ("Prioritized Backlog") when the goal is "what should I work on now?" — labels should answer the goal, not name the task
- Workflow dead ends (no "next action" affordance after completing an item)
- Information hierarchy that matches the data model, not the user's mental model (showing all 39 assigned items when the user wants the 3 most urgent)
- Empty states that are informational but not actionable ("No items starred" without a CTA)

---

## Red → Green Arrow Protocol (mandatory for all violation display)

### Discovery phase — RED arrows

When violations are found, inject SVG arrows directly onto the live page using `javascript_tool`. Every violation gets a red arrow + label.

Arrow injection template:
```js
(function injectViolationArrows(violations) {
  document.getElementById('__di_overlay')?.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = '__di_overlay';
  Object.assign(svg.style, {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: 99999,
  });
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
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(x - 60));
    line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(x - 8));
    line.setAttribute('y2', String(y));
    line.setAttribute('stroke', '#E5493A');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#red-arrow)');
    svg.appendChild(line);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', String(x - 220));
    bg.setAttribute('y', String(y - 11));
    bg.setAttribute('width', String(Math.min(label.length * 7 + 8, 200)));
    bg.setAttribute('height', '16');
    bg.setAttribute('rx', '3');
    bg.setAttribute('fill', '#E5493A');
    svg.appendChild(bg);
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
})([/* {x, y, label} per violation */]);
```

Rules:
- Screenshot immediately after injection.
- Caption: `🔴 VIOLATIONS — {surface} — {N} issues found — Council: {which lenses fired}`

### Post-fix phase — GREEN arrows

After fixes, replace red with green using same coordinates + `FIXED:` prefix:

```js
// Same template: replace '#E5493A' with '#22A06B', marker id 'green-arrow'
// Labels: 'FIXED: ' + original_label
```

- Screenshot after green injection.
- Caption: `✅ FIXED — {surface} — {N} resolved — Council validated`

Raw screenshots with no arrows are REJECTED.

---

## The Brief — Full Structure (v2)

Output format for every surface. Council lenses are mandatory sections.

```
## Design Intelligence Brief v2 — {surface} — {date}
IQ Level: 500 · Foundation Council: Active

### 1. Canonical Component Audit
| Component slot | Catalyst canonical | Detected / planned | Status |
|---|---|---|---|
| Work item type icon | JiraIssueTypeIcon (@/lib/jira-issue-type-icons) | [planned] | ✅ / ❌ |
| Project avatar | ProjectIcon (@/components/shared/ProjectIcon) | … | |
| Status indicator | StatusPill / @atlaskit/lozenge + data-cp-lozenge-jira-parity wrapper | … | |
| Dropdown / menu | @atlaskit/dropdown-menu | … | |
| Popup / popover | Self-rolled useRef + mousedown (CLAUDE.md 2026-05-05) | … | |
| Color / token | token() from @atlaskit/tokens | … | |
| Typography | 12px/600 headers · 14px/400 body · sentence-case | … | |

❌ rows = H4 violations. Halt implementation until resolved.

### 2. Foundation Council Analysis

#### 2a. Saffer — Microinteraction Anatomy
[For each interactive element: Trigger → Rules → Feedback → Loops/Modes table]
[Red flags: missing feedback, hidden triggers, mode traps]

#### 2b. Tufte — Data-Ink Ratio
[Data ink vs chartjunk table per element]
[Red flags: decorative borders, redundant labels, axis-for-axis-sake]

#### 2c. Rams — 10 Principles Scan
[Violations of any of the 10 principles]
[Especially: Principle 8 (thoroughness — error state), Principle 10 (minimum design)]

#### 2d. Norman — Affordances and Conceptual Model
[Affordance / Signifier / Feedback table per element]
[Red flags: false affordances, hidden affordances, missing async feedback]

#### 2e. Ive — Reduction and Transition Choreography
[Material honesty audit: is every shadow, border, gradient earning its place?]
[Transition timing: ease-out expand, ease-in collapse, stagger sequence]
[Red flags: decorative shadows, simultaneous animations, radius indecision]

#### 2f. Raskin — Cognitive Efficiency
[Modes inventory: what modes exist, how entered, how exited, visual indicator]
[Hick's Law: n choices → T = b·log₂(n+1). Flag any menu > 7 items]
[Fitts' Law: flag targets < 24px or far from predicted cursor path]

#### 2g. Cooper — Goal-Directed Design
[Persona × Goal × Task × Gap table]
[Red flags: task labels instead of goal labels, workflow dead ends, empty states without CTA]

### 3. Jira Parity Gap → Opportunity Map
| Gap | Jira approach | Catalyst opportunity | Category | Recommendation |
|---|---|---|---|---|
| [gap] | [what Jira does] | [what Catalyst could do] | MATCH/EXCEED/SKIP | [action] |

### 4. AI Use Cases (surface-specific, 1–3)
| # | AI capability | Data source | ADS token | Priority |
|---|---|---|---|---|
| AI-1 | [capability] | [Supabase table/Edge Function] | [token] | P1/P2 |

### 5. Sibling Surface Standardisation
| Sibling | Shared primitive | Their pattern | Match required? |
|---|---|---|---|
| [surface] | [primitive] | [implementation] | yes/no |

Rule: 4 of 5 siblings use X → this surface MUST use X.

### 6. Design Elevation Score (pre-build estimate)
| Dimension | Score (0–3) | Council lens | Rationale |
|---|---|---|---|
| Canonical compliance | /3 | H4 | |
| Jira parity floor met | /3 | Norman/Cooper | |
| Catalyst exceed opportunities | /3 | Rams/Ive | |
| AI use case wired | /3 | Cooper (goal) | |
| Sibling standardisation | /3 | H4/Raskin | |
| **Total** | **/15** | | |

Threshold: ≥ 11/15 to proceed. Below 11 = halt and redesign.

### 7. Blocking Findings
[All ❌ rows from section 1 + P0 council findings. These become mandatory Phase 2 rows.]
```

---

## Trigger Conditions

Fires automatically from preflight Phase 0.5 when:
- Surface ∈ `{ui-feature, ui-bug-fix, ui-refactor, design-only, cross-cutting}`
- Any user-facing component is mentioned in the task body

Manual trigger: `/design-intelligence [surface or feature description]`

Fires proactively (without preflight) when:
- A feature is under discussion and no plan exists yet — emit the brief as a recommendation document, not a gate
- User asks "how should I show X?" — run the 7 lenses and answer with the brief

---

## Canonical Component Inventory

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
| Popup / popover | Self-rolled `useRef` + mousedown (CLAUDE.md 2026-05-05) | — | `@atlaskit/popup` v4 (empty-portal bug), shadcn Popover |
| Typography | ADS token stack | `token()` | Tailwind text-* sizing |
| Priority icon | `EditablePriority` | `@/components/catalyst/EditablePriority` | Lucide ArrowUp/Down raw |

---

## AI Use Case Library (surface-indexed)

### Sidebar / Recent / Navigation
- **Predictive recency rank** — score by (recency × engagement frequency × open-action count), not raw timestamp. Cooper lens: goal is "get back to work fast", not "see what I touched"
- **Smart resume badges** — interrupted session detection. Saffer: trigger = gap > 30min after 3+ visits, feedback = ADS `warning.subtle` badge
- **Cross-project activity heatmap** — dot-size = activity density, sidebar footer. Tufte: the dot IS the data, no axis

### For You — All Tabs
- **Archival Intelligence chip** — predicted archive date = last_updated + 90 days. Rams: honest (shows real deadline), Cooper: goal is "don't lose work to archival". ADS `color.background.danger.subtle` progress bar fill 0%→100% as date approaches
- **Smart grouping** — group by `statusCategory` (not status label text). Raskin: fewer cognitive modes = faster decision. Hick's Law: 3 categories vs 16 labels = 50% reduction in decision time

### Project Hub / All Projects
- **AI project health score** — composite: overdue÷total, PR merge rate, blocker count. Tufte: single number encodes more than a full table row
- **Trend sparklines** — 7-day throughput per project. Tufte: the sparkline is its own axis, no border needed

### Backlog / Work Lists
- **AI story point estimator** — semantic similarity to closed issues. Norman: signifier = subtle chip appearing after summary typed
- **Duplicate detector** — cosine similarity > 0.85. Rams: honest — surfaces the duplicate, doesn't block the user

### Detail Views
- **Relationship suggest** — after save, scan for likely `is blocked by` / `duplicates`. Saffer: system trigger (post-save), feedback = dismissible banner, loop = recurs on subsequent saves

---

## Hard Rules

1. **All 7 council lenses are mandatory.** Not optional, not "when relevant". Every surface gets all 7.
2. **AI use cases must be surface-specific.** Generic "add AI" = rejected. Every AI row names exact component, data source, ADS token.
3. **No AI recommendation that requires banned components.** AI works within Catalyst's constraint envelope.
4. **Sibling standardisation is binary.** 4+ of 5 siblings use X → must match. No council debate.
5. **The brief is mandatory input to Phase 1.** No council proceeds without it.
6. **Update the inventory.** New canonical established = update this file immediately.
7. **Transition choreography is prescribed.** ease-out expand, ease-in collapse. No negotiation per lens 5 (Ive).
8. **Hick's Law applies.** > 7 items in any choice set = P1 finding. > 12 = P0.

---

## Integration with Preflight Pipeline

```
Phase 0  — Bootstrap (CLAUDE.md, skills list, prior handovers)
Phase 0.5 — Evidence acquisition (jira-compare, ads-validator, schema-probe)
           + design-intelligence Brief v2 ← THIS SKILL (fires here, all 7 lenses)
Phase 1  — Council (receives Phase 0.5 evidence + DI Brief as first document)
           Chairman MUST cite at least one DI Brief finding in verdict
Phase 2  — Plan synthesis (brief's blocking findings become mandatory rows)
Phase 4  — Visual aid (brief's AI use cases become optional mockup rows)
Phase 5  — Handover (brief's AI use case list appended to Open Items)
Phase 6  — Closure Evidence (annotated screenshots with council-validated green arrows)
```

---

## Worked Example — For You / Ageing Tab (500-IQ, 2026-05-09)

**Saffer (microinteraction):** 16 row items with no hover menu. Trigger for "mark done" = invisible. Feedback for "stale" = none. Loop = user returns to the same stale item every session. Verdict: P0 — add hover-reveal 3-dot menu with Reassign / Archive / Escalate.

**Tufte (data-ink):** "Overdue SLA" label is group-header text with 0 data encoding. The TIME the item has been stale is the data. Replace the label with an age bracket (🔴 90+ days, 🟠 60–90, 🟡 30–60). The emoji IS the data-ink; the text bracket range IS the data. No background, no border needed on the group header itself.

**Rams (10 principles):** Principle 2 (useful) violated — items updated within 21 days are NOT ageing. BAU-4771 "In Progress" updated 3 weeks ago is a false positive. Filter: exclude `updated_at > now() - interval '21 days'`. Principle 8 (thorough): empty state for "no ageing items" not designed.

**Norman (affordance):** "Overdue SLA" communicates a Jira-internal concept. The user's mental model is "things I should probably deal with". Label should say "Needs attention" — honest to the goal, not the data schema.

**Ive (reduction):** Archival chip: `🗄 Archive by {date}` with color-fill progress bar. The bar IS the urgency signal. No border, no shadow. Transition on bar fill: ease-out 500ms on mount (deliberate, calm). The chip should feel inevitable — of course it shows when something is about to be archived.

**Raskin (cognitive efficiency):** 16 rows ungrouped = T = b·log₂(17) ≈ 4b decision units. 3 brackets = T = b·log₂(4) = 2b. 50% reduction. Mode: clicking "Archive" enters a confirmation mode — must have clear exit (Cancel) and visual indicator (row dims to 40% opacity during confirmation).

**Cooper (goal-directed):** Persona = busy PM with 5 active projects. Goal = "clear the debt without losing context". Task = "identify and act on stale items". Gap: the tab currently shows ALL their assigned items — the goal requires only the STALE ones. Filter by default; add "Show all" toggle secondary.

**Verdict:** Design Elevation Score = 3/15 current → target 13/15 with proposed fixes. HALT on current implementation. 7 mandatory Phase 2 rows emerge from this analysis.

---

## References

- `CLAUDE.md` — canonical component rules, ban list, ADS-token mandate
- `design-critique/SKILL.md` — post-build scoring (H1-H10 against this brief's findings)
- `jira-compare/SKILL.md` — parity gate (provides evidence for section 3)
- `preflight/SKILL.md` — pipeline host
- Atlassian Design System: https://atlassian.design/
- Dan Saffer, *Microinteractions* (O'Reilly, 2013)
- Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 1983)
- Dieter Rams, *Less but Better* (Die Gestalten Verlag, 1995)
- Don Norman, *The Design of Everyday Things* (Basic Books, 1988/2013)
- Jef Raskin, *The Humane Interface* (Addison-Wesley, 2000)
- Alan Cooper, *The Inmates Are Running the Asylum* (Sams, 1999)
