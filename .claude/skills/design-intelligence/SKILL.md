---
name: design-intelligence
description: >-
  500-IQ proactive design intelligence layer, ring-fenced exclusively to
  Atlassian Design System (https://atlassian.design/) for Catalyst
  (localhost:8080). Fires automatically on every UI surface task BEFORE
  the council. Activates the Foundation Council of 7 design masters
  (Saffer, Tufte, Rams, Norman, Ive, Raskin, Cooper) as mandatory analysis
  lenses. Every recommendation must cite an ADS token, ADS component, or
  ADS guideline — no Tailwind, no shadcn, no third-party palettes, no
  generic advice. SVG arrows injected on the live page are MANDATORY on
  every run — violations shown in-chat with red arrows, fixes shown with
  green arrows. Output: Design Intelligence Brief v2. Triggers on: any
  preflight with surface ∈ {ui-feature, ui-bug-fix, ui-refactor,
  design-only, cross-cutting}. Manual: /design-intelligence [surface].
version: 2.1.0
iq_level: 500
design_system: Atlassian Design System (https://atlassian.design/)
scope: Catalyst only (localhost:8080) — NOT generic, NOT cross-project
author: Vikram × Claude, 2026-05-09
metadata:
  category: design-quality
  tags: [design, ads, atlassian, atlaskit, catalyst, 500iq, foundation-council, ring-fenced]
  maturity: stable
  pipeline_position: Phase 0.5 (fires after evidence acquisition, before council)
---

# Design Intelligence v2.1 — 500-IQ, ADS Ring-Fenced, Catalyst Only

---

## ⚠️ HARD BOUNDARY — READ FIRST

This skill operates **exclusively within the Atlassian Design System** (ADS).

Every single recommendation, token choice, component suggestion, spacing value, color, typography rule, motion timing, and state treatment MUST be grounded in one of:

| ADS source | URL |
|---|---|
| Tokens | https://atlassian.design/foundations/tokens |
| Components | https://atlassian.design/components |
| Color | https://atlassian.design/foundations/color |
| Typography | https://atlassian.design/foundations/typography |
| Spacing | https://atlassian.design/foundations/spacing |
| Icons | https://atlassian.design/foundations/iconography |
| Motion | https://atlassian.design/foundations/motion |
| Elevation | https://atlassian.design/foundations/elevation |
| Accessibility | https://atlassian.design/foundations/accessibility |

**If a recommendation cannot be cited to one of the above URLs — it is rejected.**

No Tailwind classes. No shadcn components. No raw hex values (unless a live Jira DOM probe proves the token resolves to that hex and ADS has no matching token). No generic design-system advice. This skill does NOT know about Material Design, Carbon, or Fluent — only ADS.

**Application:** Catalyst, running at `localhost:8080`. No other app. No other port. Catalyst uses `@atlaskit/*` packages and `token()` from `@atlaskit/tokens`. These are the only implementation primitives.

---

## ⚠️ MANDATORY OUTPUT RULE — SVG ARROWS ALWAYS

**Every run of this skill MUST produce SVG arrows injected onto the live Catalyst page.**

This is not conditional. This is not "if violations are found". This is not optional.

- **Discovery phase:** Red arrows on every violation. No exceptions.
- **Post-fix phase:** Green arrows replacing red. No exceptions.
- **If the page is not open:** Navigate to `localhost:8080/{route}` first, then inject.
- **Raw screenshots with no arrows are REJECTED** — do not display them.

The annotated screenshot IS the output. A brief without a screenshot has not been delivered.

---

## Soft Announcement

When this skill fires, emit this block BEFORE any output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence v2.1 · ADS Ring-Fenced · 500-IQ
Surface: {surface name} · localhost:8080/{route}
Design system: Atlassian Design System ONLY
Council: Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper
→ Navigating to surface · Running council scan · Injecting arrows
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence v2.1 · BRIEF COMPLETE
{N} violations · {M} AI opportunities · Score: {X}/15
ADS citations: {N} tokens · {M} components referenced
{PROCEED ≥11/15 / HALT <11/15}
Red arrows injected. Screenshot inline ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ADS Component → Catalyst Canonical Map

Every slot has exactly ONE canonical. No debate. No exceptions.

| UI slot | ADS component | Atlaskit import | ADS docs URL | Do NOT use |
|---|---|---|---|---|
| Work item type icon | `JiraIssueTypeIcon` (Catalyst wrapper over ADS icon system) | `@/lib/jira-issue-type-icons` | https://atlassian.design/foundations/iconography | Coloured dots, emoji, `WorkItemIcon` shim |
| Avatar (person) | `@atlaskit/avatar` | `Avatar` from `@atlaskit/avatar` | https://atlassian.design/components/avatar | Custom img, initials divs |
| Avatar (project/space) | `@atlaskit/avatar` appearance="square" | same | same | Raw `<img>`, FolderKanban |
| Status lozenge | `@atlaskit/lozenge` + `data-cp-lozenge-jira-parity` wrapper | `Lozenge` from `@atlaskit/lozenge` | https://atlassian.design/components/lozenge | Tailwind badge, shadcn Badge |
| Status pill (header) | `StatusPill` (custom, exact Jira hex) | `@/components/shared/StatusPill` | — (Jira-measured, ADS token bypass) | ADS lozenge for header pill |
| Tooltip | `@atlaskit/tooltip` | `Tooltip` from `@atlaskit/tooltip` | https://atlassian.design/components/tooltip | Radix tooltip, shadcn Tooltip |
| Dropdown menu | `@atlaskit/dropdown-menu` | `DropdownMenu` from `@atlaskit/dropdown-menu` | https://atlassian.design/components/dropdown-menu | shadcn DropdownMenu, Radix DropdownMenu |
| Inline edit | `@atlaskit/inline-edit` | `InlineEdit` from `@atlaskit/inline-edit` | https://atlassian.design/components/inline-edit | contenteditable, shadcn Input |
| Modal | `@atlaskit/modal-dialog` | `ModalDialog` from `@atlaskit/modal-dialog` | https://atlassian.design/components/modal-dialog | shadcn Dialog, Radix Dialog |
| Popup/popover | Self-rolled `useRef` + mousedown (CLAUDE.md 2026-05-05 — `@atlaskit/popup` v4 has empty-portal bug) | — | — | `@atlaskit/popup` v4, shadcn Popover |
| Select / combobox | `@atlaskit/select` | `Select` from `@atlaskit/select` | https://atlassian.design/components/select | react-select direct, shadcn Select |
| Table (complex) | `JiraTable.tsx` (Catalyst) or `@atlaskit/dynamic-table` | project-local / `@atlaskit/dynamic-table` | https://atlassian.design/components/dynamic-table | shadcn Table, plain `<table>` |
| Button | `@atlaskit/button` | `Button` from `@atlaskit/button` | https://atlassian.design/components/button | shadcn Button, Tailwind button |
| Spinner / loading | `@atlaskit/spinner` | `Spinner` from `@atlaskit/spinner` | https://atlassian.design/components/spinner | Custom CSS spinner |
| Empty state | `@atlaskit/empty-state` | `EmptyState` from `@atlaskit/empty-state` | https://atlassian.design/components/empty-state | Custom illustration divs |
| Breadcrumbs | `@atlaskit/breadcrumbs` | `Breadcrumbs` from `@atlaskit/breadcrumbs` | https://atlassian.design/components/breadcrumbs | Custom / or › separator spans |
| Inline message | `@atlaskit/inline-message` | `InlineMessage` | https://atlassian.design/components/inline-message | Custom alert divs |
| Flag / toast | `@atlaskit/flag` | `Flag` + `FlagGroup` from `@atlaskit/flag` | https://atlassian.design/components/flag | react-hot-toast, Sonner, custom toast |

---

## ADS Token Map (mandatory for all Catalyst styling)

Every color, spacing, elevation, and typography value must use `token()` from `@atlaskit/tokens`. Raw hex is banned unless a live Jira DOM probe confirms no ADS token matches.

| Category | Token | Value (light) | When to use |
|---|---|---|---|
| **Text** | `color.text` | `#292A2E` | Primary body text, titles |
| | `color.text.subtle` | `#44546F` | Secondary labels, meta |
| | `color.text.subtlest` | `#626F86` | Timestamps, placeholders |
| | `color.text.disabled` | `#8993A5` | Disabled fields |
| | `color.text.brand` | `#0052CC` | Links, @mentions, branded actions |
| | `color.text.danger` | `#AE2A19` | Error messages |
| | `color.text.success` | `#216E4E` | Success states |
| | `color.text.warning` | `#974F0C` | Warning labels |
| | `color.text.information` | `#0055CC` | Info labels |
| **Background** | `elevation.surface` | `#FFFFFF` | Default card/panel bg |
| | `elevation.surface.hovered` | `#F0F1F2` | Hover state on interactive surfaces |
| | `elevation.surface.pressed` | `#E9EBEE` | Pressed state |
| | `elevation.surface.sunken` | `#F7F8F9` | Recessed areas (icon tiles) |
| | `elevation.surface.overlay` | `#FFFFFF` | Modals, popovers |
| | `color.background.neutral` | `rgba(9,30,66,0.06)` | Subtle neutral bg |
| | `color.background.neutral.subtle.hovered` | `rgba(9,30,66,0.06)` | Button hover |
| | `color.background.information.subtle` | `#E9F2FF` | Info chips |
| | `color.background.success.subtle` | `#DCFFF1` | Success chips |
| | `color.background.danger.subtle` | `#FFEDEB` | Error chips |
| | `color.background.warning.subtle` | `#FFF7D6` | Warning chips / stale indicators |
| **Border** | `color.border` | `rgba(11,18,14,0.14)` | Default card borders |
| | `color.border.focused` | `#388BFF` | Focus ring |
| | `color.border.danger` | `#FF5630` | Error border |
| **Icon** | `color.icon` | `#44546F` | Default icons |
| | `color.icon.subtle` | `#6B778C` | Secondary icons |
| | `color.icon.brand` | `#0052CC` | Brand icons |
| | `color.icon.success` | `#22A06B` | Success icon |
| | `color.icon.danger` | `#AE2A19` | Error icon |
| **Elevation** | `elevation.shadow.raised` | — | Cards, dropdowns |
| | `elevation.shadow.overlay` | — | Modals |

**Typography (ADS mandated — no exceptions):**

| Role | Font | Size | Weight | Line height | Token |
|---|---|---|---|---|---|
| Page heading | Inter / system-ui | 20px | 500 | 24px | — |
| Section heading | Inter / system-ui | 14px | 600 | 20px | — |
| Body / row title | Inter / system-ui | 14px | 400 | 20px | — |
| Meta / labels | Inter / system-ui | 12px | 400 | 16px | — |
| Rail field labels | Inter / system-ui | 11px | 600 | 16px | — |
| Timestamps | Inter / system-ui | 11px | 400 | 16px | — |

All text must be `sentence case`. `text-transform: uppercase` is banned on all labels and column headers (jira-compare lesson 2026-04-28).

**Spacing (ADS 4/8dp rhythm):**

| Value | Use |
|---|---|
| 4px | Tight inline gaps (icon + label) |
| 8px | Between related elements |
| 12px | Row padding inline |
| 16px | Card/section gap |
| 24px | Between sections |
| 32px | Between major blocks |

---

## SVG Arrow Injection — Mandatory Protocol

### Step 1 — Navigate to the surface

```
Navigate to: localhost:8080/{route}
```

If the route is unknown, screenshot first and identify from URL bar.

### Step 2 — Probe with DOM inspection

Use `javascript_tool` to identify violation coordinates:

```js
// Probe pattern — get element position for arrow targeting
const el = document.querySelector('{selector}');
if (el) {
  const r = el.getBoundingClientRect();
  console.log(JSON.stringify({ x: r.right, y: r.top + r.height/2, label: '{violation label}' }));
}
```

### Step 3 — Inject RED arrows (discovery)

```js
(function injectDIArrows(violations) {
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
  marker.id = 'di-red-arrow';
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
    // Arrow
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x - 60); line.setAttribute('y1', y);
    line.setAttribute('x2', x - 8);  line.setAttribute('y2', y);
    line.setAttribute('stroke', '#E5493A');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('marker-end', 'url(#di-red-arrow)');
    svg.appendChild(line);
    // Badge
    const labelLen = Math.min(label.length * 7 + 8, 210);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', x - labelLen - 60); bg.setAttribute('y', y - 11);
    bg.setAttribute('width', labelLen); bg.setAttribute('height', '16');
    bg.setAttribute('rx', '3'); bg.setAttribute('fill', '#E5493A');
    svg.appendChild(bg);
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', x - labelLen - 56); txt.setAttribute('y', y + 1);
    txt.setAttribute('font-size', '10'); txt.setAttribute('fill', 'white');
    txt.setAttribute('font-family', 'system-ui, sans-serif');
    txt.setAttribute('font-weight', '600');
    txt.textContent = label.slice(0, 30);
    svg.appendChild(txt);
  });
  document.body.appendChild(svg);
})([
  /* populate from DOM probe results — {x, y, label} per violation */
]);
```

**After injection:** Take screenshot immediately. Display inline in chat:
`🔴 DI VIOLATIONS — {surface} — {N} issues · ADS citations in brief below`

### Step 4 — Inject GREEN arrows (post-fix)

Same template, replace `#E5493A` → `#22A06B`, marker id `di-green-arrow`, label prefix `✓ `.

**After injection:** Take screenshot immediately. Display inline in chat:
`✅ DI FIXED — {surface} — {N} resolved · ADS compliance confirmed`

---

## The Brief — Full Structure (v2.1, ADS Ring-Fenced)

Every section cites ADS. Uncited recommendations are invalid.

```
## Design Intelligence Brief v2.1 — {surface} — {date}
Scope: Catalyst localhost:8080/{route} · ADS Ring-Fenced · IQ 500

### 1. ADS Canonical Component Audit

| UI slot | Required (ADS) | Detected | ADS URL | Status |
|---|---|---|---|---|
| Work item type icon | JiraIssueTypeIcon | [detected] | atlassian.design/foundations/iconography | ✅/❌ |
| Avatar | @atlaskit/avatar | … | atlassian.design/components/avatar | |
| Status | @atlaskit/lozenge + data-cp-lozenge-jira-parity | … | atlassian.design/components/lozenge | |
| Dropdown | @atlaskit/dropdown-menu | … | atlassian.design/components/dropdown-menu | |
| Tooltip | @atlaskit/tooltip | … | atlassian.design/components/tooltip | |
| Colors | token() from @atlaskit/tokens | … | atlassian.design/foundations/tokens | |
| Typography | 14px/400 body · 12px/400 meta · sentence-case | … | atlassian.design/foundations/typography | |
| Spacing | 4/8dp rhythm | … | atlassian.design/foundations/spacing | |
| Motion | ADS motion tokens (ease-out expand, ease-in collapse) | … | atlassian.design/foundations/motion | |

❌ = ADS violation → mandatory fix. Implementation halted until resolved.

### 2. Foundation Council Analysis (ADS-anchored)

Each council finding MUST reference an ADS URL or CLAUDE.md ban.

#### 2a. Saffer — Microinteraction Anatomy
For each interactive element:
| Element | Trigger | Rules | Feedback (ADS token) | Loop |
|---|---|---|---|---|
| {element} | {trigger} | {rules} | {ADS token — e.g. elevation.surface.hovered} | {loop} |

Feedback must be expressed as ADS token, not hex or description.

#### 2b. Tufte — Data-Ink Ratio (ADS Elevation layer)
Chartjunk in Catalyst = unnecessary borders (`color.border` when whitespace separates),
unnecessary backgrounds (`elevation.surface` on items that sit on `elevation.surface` = invisible = wasted).
| Element | Data ink | ADS chartjunk | Remove? |
|---|---|---|---|
| {element} | {data it encodes} | {e.g. border with no hierarchy purpose} | yes/no |

#### 2c. Rams — 10 Principles (ADS error states, empty states)
ADS has designed empty states (@atlaskit/empty-state) and inline messages (@atlaskit/inline-message).
Principle 8 violation = an error state or empty state not using the ADS component.
| Principle | Status | ADS fix |
|---|---|---|
| Useful (2) | ✅/❌ | [ADS component if missing] |
| Thorough (8) | ✅/❌ | @atlaskit/empty-state · @atlaskit/inline-message |
| Minimum design (10) | ✅/❌ | Remove non-ADS chrome |

#### 2d. Norman — Affordances (ADS signifiers)
ADS buttons have built-in appearance props: `appearance="primary"` / `"subtle"` / `"danger"` / `"link"`.
These ARE the signifier system. Using a custom button breaks ADS affordance mapping.
| Element | ADS signifier | Detected signifier | Gap |
|---|---|---|---|
| {button/input} | {@atlaskit/button appearance="X"} | [detected] | [gap if non-ADS] |

#### 2e. Ive — Reduction (ADS Elevation + Motion)
ADS elevation tokens: `elevation.shadow.raised` (card), `elevation.shadow.overlay` (modal).
Decorative shadow not from these tokens = chartjunk = Ive violation.
ADS motion: expand = `cubic-bezier(0.2, 0, 0, 1)` (ease-out), collapse = `cubic-bezier(0.4, 0, 1, 1)` (ease-in).
Reference: https://atlassian.design/foundations/motion
| Element | ADS elevation used? | ADS motion used? | Reduction possible? |
|---|---|---|---|

#### 2f. Raskin — Cognitive (ADS Lozenge grouping, menu caps)
ADS DropdownMenu supports grouping. Any menu > 7 items must use `@atlaskit/dropdown-menu` groups.
Hick's Law applies to ADS tab bars, group headers, and picker lists.
| Choice set | n choices | T = b·log₂(n+1) | ADS solution |
|---|---|---|---|
| {menu/group/tabs} | {n} | {T} | [group with @atlaskit/dropdown-menu sections] |

#### 2g. Cooper — Goal-Directed (ADS Empty State CTA)
ADS `@atlaskit/empty-state` has a `primaryAction` prop — every empty state must use it.
Empty states without a `primaryAction` = Cooper P0.
| Surface | User goal | Empty state? | ADS primaryAction present? |
|---|---|---|---|

### 3. Jira Parity → ADS Opportunity Map

| Gap | Jira approach | ADS Catalyst opportunity | Token/Component | Category |
|---|---|---|---|---|
| {gap} | {what Jira does} | {what ADS Catalyst does better} | {token or @atlaskit component} | MATCH/EXCEED/SKIP |

### 4. AI Use Cases (surface-specific, ADS-rendered)

| # | Capability | ADS presentation | Token used | Priority |
|---|---|---|---|---|
| AI-1 | {capability} | {ADS component: Flag, Lozenge, InlineMessage} | {token} | P1/P2 |

Every AI use case MUST specify the ADS component that renders its output.

### 5. Sibling Standardisation (ADS compliance check)

| Sibling | ADS component/token | Match? |
|---|---|---|
| {surface} | {ADS canonical} | yes/no |

### 6. Design Elevation Score (ADS-calibrated)

| Dimension | Score (0–3) | ADS reference |
|---|---|---|
| All UI slots using ADS canonicals | /3 | atlassian.design/components |
| All colors from token() | /3 | atlassian.design/foundations/tokens |
| All motion from ADS motion spec | /3 | atlassian.design/foundations/motion |
| AI use cases using ADS components | /3 | atlassian.design/components |
| Sibling ADS parity | /3 | — |
| **Total** | **/15** | |

< 11/15 = HALT. Redesign with ADS compliance as first constraint.

### 7. Blocking Findings

Each finding states: violation · ADS rule broken · ADS fix · URL.

| Finding | ADS rule | Fix | ADS URL |
|---|---|---|---|
| {finding} | {token/component violated} | {specific fix} | {atlassian.design/...} |
```

---

## ADS Motion Reference (mandatory for all transitions)

Source: https://atlassian.design/foundations/motion

| Motion | Curve | Duration | Use |
|---|---|---|---|
| Expand (panel open, row expand, dropdown open) | `cubic-bezier(0.2, 0, 0, 1)` | 200ms | Opening/entering |
| Collapse (panel close, row collapse, dropdown close) | `cubic-bezier(0.4, 0, 1, 1)` | 150ms | Closing/exiting |
| Hover state | `cubic-bezier(0.15, 1, 0.3, 1)` | 150ms | Interaction response |
| Error appear | instant (0ms) | — | Urgency signal |
| Success appear | `cubic-bezier(0.2, 0, 0, 1)` | 300ms | Calm confirmation |
| Stagger | base timing + 40ms per item | — | List entrance (priority-ordered) |

Using `linear`, `ease`, or custom cubic-bezier not from this table = Ive + ADS motion violation.

---

## Hard Rules (non-negotiable)

1. **ADS only.** Every recommendation cites https://atlassian.design/. Uncited = rejected.
2. **SVG arrows always.** Every run produces red arrows on discovery, green arrows post-fix. No exceptions. No "I'll skip it this time."
3. **Catalyst only.** localhost:8080. Never apply this skill to another app.
4. **`token()` for all values.** `import { token } from '@atlaskit/tokens'`. No raw hex, no Tailwind color classes.
5. **`sentence case` always.** `text-transform: none` on all labels. Banned: uppercase headers, ALL CAPS lozenges (use `data-cp-lozenge-jira-parity` wrapper).
6. **48px row height.** ADS benchmark for interactive list rows. Jira-measured. No row > 56px.
7. **4/8dp spacing rhythm.** All padding and gap values must be multiples of 4. No 5px, 6px, 7px.
8. **No banned components ever.** `@atlaskit/popup` v4 (empty-portal bug), shadcn anything, Tailwind anything = instant P0.
9. **Empty states use `@atlaskit/empty-state`.** With `primaryAction` prop. No custom illustration divs.
10. **All 7 council lenses run.** Every surface. No shortcuts.

---

## Permanent Bans (CLAUDE.md aligned)

These are banned at CLAUDE.md level AND at ADS level:

| Banned element | Why | Alternative |
|---|---|---|
| `text-transform: uppercase` on headers | ADS typography + jira-compare lesson | sentence-case string |
| Raw hex colors | ADS token mandate | `token('color.text', '#292A2E')` |
| Tailwind `text-*`, `bg-*`, `border-*` color classes | No ADS token equivalent | `token()` |
| `@atlaskit/popup` v4 | Empty-portal bug (CLAUDE.md 2026-05-05) | Self-rolled `useRef` + mousedown |
| shadcn DropdownMenu | Not ADS | `@atlaskit/dropdown-menu` |
| shadcn Button | Not ADS | `@atlaskit/button` |
| shadcn Dialog/Modal | Not ADS | `@atlaskit/modal-dialog` |
| Coloured dots for work item types | CLAUDE.md 2026-05-09 — non-discoverable colour-recall | `JiraIssueTypeIcon` |
| `WorkItemIcon` (deprecated shim) | CLAUDE.md 2026-05-09 | `JiraIssueTypeIcon` from `@/lib/jira-issue-type-icons` |
| MDT Ref field | CLAUDE.md permanent ban | Never rendered |
| Service Now# field | CLAUDE.md permanent ban | Never rendered |
| Assessment Feature field | CLAUDE.md permanent ban | Never rendered |
| Story Points field | CLAUDE.md permanent ban | Never rendered |
| AI Sparkles inline button | CLAUDE.md permanent ban | AI improve only via right-rail ImproveIssueDropdown |
| Development section | CLAUDE.md permanent ban | Never implemented |
| Automation section | CLAUDE.md permanent ban | Never implemented |
| Notion in Projects module | CLAUDE.md 2026-05-09 | Out of scope entirely |

---

## Integration with Preflight Pipeline

```
Phase 0  — Bootstrap (CLAUDE.md, skills list, prior handovers)
Phase 0.5 — THIS SKILL fires here (all 7 lenses, ADS ring-fenced)
           → Navigate to localhost:8080/{route}
           → Run DOM probe (get element coords)
           → Inject RED arrows on all violations
           → Screenshot inline in chat
           → Produce full brief with ADS citations
           → Blocking findings → mandatory Phase 2 rows
Phase 1  — Council (receives brief as first document; must cite ADS URLs)
Phase 2  — Plan (blocking findings become rows; AI use cases at P1 become rows)
Phase 4  — Visual aid
Phase 5  — Handover
Phase 6  — Closure Evidence (GREEN arrows replacing red; screenshot inline in chat)
```

---

## AI Use Case Library (ADS-rendered, Catalyst-specific)

Every use case specifies which ADS component renders the AI output.

### For You — All Tabs
- **Archival Intelligence chip:** `@atlaskit/lozenge` appearance="moved" (amber) + progress fill via inline `background: linear-gradient` on ADS `color.background.warning.subtle` — *Jira has nothing like this*
- **Smart grouping:** 3 age brackets rendered as ADS section headers with `color.text.subtle` — *50% Hick's Law reduction*

### Sidebar / Recent
- **Predictive recency rank:** ADS `color.background.warning.subtle` pill badge (score indicator) — *Jira shows raw timestamp only*

### Project Hub
- **AI health score:** Single ADS Lozenge (default/inprogress/success) per project row — *Jira shows no aggregate*

### Backlog
- **Duplicate detector:** `@atlaskit/inline-message` appearance="warning" below the summary field — *Jira has no duplicate detection*

### Detail Views
- **Relationship suggest:** `@atlaskit/flag` Flag appearance="warning" after save — *Jira has no AI relationship suggestion*

---

## References

- Atlassian Design System: https://atlassian.design/
- ADS Tokens: https://atlassian.design/foundations/tokens
- ADS Components: https://atlassian.design/components
- ADS Motion: https://atlassian.design/foundations/motion
- `CLAUDE.md` (worktree root) — ban list, canonical rules
- `design-critique/SKILL.md` — post-build H1-H10 scoring (pairs with this skill)
- `jira-compare/SKILL.md` — parity gate (provides evidence for section 3)
- `preflight/SKILL.md` — pipeline host (Phase 0.5)
