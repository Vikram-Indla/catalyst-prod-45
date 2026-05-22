---
name: design-intelligence
description: >-
  1000-IQ proactive design intelligence layer, ring-fenced exclusively to
  Atlassian Design System (https://atlassian.design/) for Catalyst
  (localhost:8080). Fires in Preflight v3 Phase 1 (evidence acquisition).
  Activates the Foundation Council of 7 design masters (Saffer, Tufte, Rams,
  Norman, Ive, Raskin, Cooper) PLUS the AtlasKit Platform Architect as an 8th
  mandatory lens. Every recommendation must cite an ADS token, ADS component,
  or ADS guideline. SVG arrows injected on the live page are MANDATORY on
  every run. Session-resume continuity: full violation list re-injected on
  every resume — resolved items green, open items red — no fresh-subset restarts.
  Lessons-applied scan: checks all CLAUDE.md lesson anchors and
  JIRA_ARCHITECT.md patterns against the surface before any recommendation.
  Output: Design Intelligence Brief v3. Triggers on: any preflight with surface
  ∈ {ui-feature, ui-bug-fix, ui-refactor, design-only, cross-cutting}.
  Manual: /design-intelligence [surface].
version: 3.0.0
iq_level: 1000
design_system: Atlassian Design System (https://atlassian.design/)
scope: Catalyst only (localhost:8080) — NOT generic, NOT cross-project
author: Vikram × Claude, 2026-05-10
metadata:
  category: design-quality
  tags: [design, ads, atlassian, atlaskit, catalyst, 1000iq, foundation-council, atlaskit-architect, ring-fenced, lessons-applied]
  maturity: stable
  pipeline_position: Phase 1 — evidence acquisition (preflight v3)
---

# Design Intelligence v3.0 — 1000-IQ, ADS Ring-Fenced, Catalyst Only

---

## ⚠️ HARD BOUNDARY — READ FIRST

This skill operates **exclusively within the Atlassian Design System** (ADS).

Every single recommendation, token choice, component suggestion, spacing value, color, typography rule, motion timing, and state treatment MUST be grounded in one of:

| ADS source | URL |
|---|---|
| Tokens | https://atlassian.design/foundations/tokens |
| **All tokens (light + dark values)** | **https://atlassian.design/components/tokens/all-tokens** |
| Components | https://atlassian.design/components |
| Color | https://atlassian.design/foundations/color |
| Typography | https://atlassian.design/foundations/typography |
| Spacing | https://atlassian.design/foundations/spacing |
| Icons | https://atlassian.design/foundations/iconography |
| Motion | https://atlassian.design/foundations/motion |
| Elevation | https://atlassian.design/foundations/elevation |
| Accessibility | https://atlassian.design/foundations/accessibility |
| **ADF document structure** | **https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/** |
| **ADF playground (validation + test data)** | **https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/** |
| **@atlaskit/editor-core (ADF write mode)** | **https://www.npmjs.com/package/@atlaskit/editor-core** |
| **@atlaskit/renderer (ADF read mode)** | **https://www.npmjs.com/package/@atlaskit/renderer** |
| **@atlaskit/adf-utils (ADF traversal/modification)** | **https://www.npmjs.com/package/@atlaskit/adf-utils** |

**If a recommendation cannot be cited to one of the above URLs — it is rejected.**

> **Enforcement for ADF surfaces:** When the surface under audit contains a description field, comment field, or any rich-text content: fetch the ADF structure doc and the relevant npm package page before proceeding to council analysis. An ADF-related finding without a citation to `developer.atlassian.com/.../structure/` or the relevant package is structurally invalid.

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
🔍 design-intelligence v3.0 · ADS Ring-Fenced · 1000-IQ
Surface: {surface name} · localhost:8080/{route}
Design system: Atlassian Design System ONLY
Council: Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper · AtlasKit Architect
→ Lessons-applied scan → Navigate → Council scan → Injecting arrows
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 design-intelligence v3.0 · BRIEF COMPLETE
{N} violations · {M} AI opportunities · Score: {X}/15
Lessons-applied: {N} CLAUDE.md anchors checked · {M} active warnings
ADS citations: {N} tokens · {M} components referenced
{PROCEED ≥11/15 / HALT <11/15}
Red arrows injected. Screenshot inline ↓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Board Child Protocol (runs immediately after Soft Announcement)

```
1. Check session file:
   CARD_KEY=$(cat {project_root}/.catalyst-board-session 2>/dev/null | grep CARD_KEY | cut -d= -f2)

2. If CARD_KEY found (inside a preflight session):
   → Navigate to localhost:8080/admin/catalyst-features
   → javascript_tool: window.__catalystBoard.addSkill("design-intelligence", "$CARD_KEY");
   → Navigate back to localhost:8080/{target-route}
   → Do NOT create a new card.

3. If CARD_KEY empty (standalone /design-intelligence run):
   → card_key = "design-intelligence:{surface-slug}:{YYYY-MM-DD}"
   → Navigate to localhost:8080/admin/catalyst-features
   → javascript_tool: window.__catalystBoard.write({
       card_key: "{card_key}", title: "design-intelligence: {surface}",
       status: "in_progress", feature_group: "{feature_group}",
       surface: "{surface}", skill_source: ["design-intelligence"],
       session_id: "{ISO timestamp}",
     });
   → echo "CARD_KEY={card_key}" > {project_root}/.catalyst-board-session
   → Navigate back to target surface.
```

**Failure mode:** if `window.__catalystBoard` is undefined, wait 2s and retry once. Never halt the skill for a board write failure.

---

## Lessons-Applied Pre-Scan (NEW in v3 — runs before council)

> Before any council lens fires, scan the surface against all known CLAUDE.md lessons and JIRA_ARCHITECT.md patterns. This prevents the council from recommending something that is already known-broken or permanently banned.

### Pre-scan checklist (run top-to-bottom against the surface)

| Check | Source | What to look for |
|---|---|---|
| JiraIssueTypeIcon | CLAUDE.md 2026-05-09 | Any colored dot, square, or color map for work item type? → P0 halt |
| Colored lozenge appearance | CLAUDE.md 2026-05-08 | Any lozenge `appearance` not from live DOM probe? → P0 |
| @atlaskit/popup inside overflow:hidden | CLAUDE.md 2026-05-08 | Any popup in an overflow:hidden parent without createPortal? → P0 |
| Section header font | CLAUDE.md 2026-05-08 | Any `@atlaskit/heading size="small"` used as a section header? → P1 |
| Assignee "Assign to me" link | CLAUDE.md 2026-05-06 | Right rail Assignee field without idle "Assign to me" link (11px, blue)? → P1 |
| Watcher Escape propagation | CLAUDE.md 2026-05-08 | WatchersChip popover without capture-phase Escape handler? → P1 |
| Row click navigation | CLAUDE.md 2026-05-10 | navigate('/issues/:key') used in any For You / home panel? → P0 |
| Projects route | CLAUDE.md 2026-05-10 | navigate('/projects') used for "View all projects"? → P0 |
| Section count badges | CLAUDE.md 2026-05-05 | Any pill/badge on section header counts? → P2 |
| Right rail idle borders | CLAUDE.md 2026-05-05 | Any visible border on idle select fields in right rail? → P2 |
| InlineCreateWithAI empty guard | CLAUDE.md 2026-05-08 | InlineCreate only inside rows.length > 0? → P1 |
| Focused-state border span | CLAUDE.md 2026-05-08 | Key cell focus border uses inline-block instead of block + width:100%? → P1 |
| Comment badge dot | CLAUDE.md 2026-05-08 | Comments cell missing 6px blue dot on rows with comments? → P2 |
| Banned items (B1-B8) | JIRA_ARCHITECT.md | MDT Ref / Service Now# / Assessment Feature / Story Points / Dev section / Automation / AI Sparkles / Notion? → P0 halt |
| Priority in wrong location | CLAUDE.md 2026-05-06 | Priority in right rail for non-Epic types? (Must be in Key details left). Priority in left for Epic? (Must be in right rail). → P1 |
| Star button dead interaction | CLAUDE.md 2026-05-10 | AgeingPanel star button rendered but no-op? → P1 |
| Motion not ADS-spec | CLAUDE.md 2026-04-28 | Any linear/ease/custom-bezier animation not from ADS motion spec? → P2 |
| ADF description editor | ADS + HARD BOUNDARY | Description field in edit mode NOT using `@atlaskit/editor-core`? → P0 (fetch https://www.npmjs.com/package/@atlaskit/editor-core) |
| ADF description renderer | ADS + HARD BOUNDARY | Description field in read mode NOT using `@atlaskit/renderer`? → P0 (fetch https://www.npmjs.com/package/@atlaskit/renderer) |
| ADF structure compliance | ADS + HARD BOUNDARY | Rich-text content stored/transmitted as markdown or raw HTML instead of ADF JSON? → P0 (fetch https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) |
| Token light/dark parity | ADS + HARD BOUNDARY | Any token used without checking its dark-mode value? → P1 (fetch https://atlassian.design/components/tokens/all-tokens) |

**Output of pre-scan:**

```
📋 Lessons-applied pre-scan: {N} CLAUDE.md anchors checked
  ✅ {M} clear
  🔴 {X} active violations (listed below with CLAUDE.md anchor)
  ⚠️  {Y} warnings (not halt, but flag in brief)
```

Pre-scan violations are added to the violation list BEFORE council analysis. Council advisors receive the pre-scan result and must reference it.

---

## Session-Resume Continuity (NEW in v3)

When resuming a session on a surface that was already audited in a prior session:

1. Read the prior `active/preflight-handover-*.md` for that surface.
2. Extract the full violation list from the prior session's SVG injection block.
3. Mark violations that have been fixed since (check git log / file changes) as `fixed: true`.
4. Mark violations still open as `fixed: false`.
5. Re-inject the COMPLETE list — do NOT start a fresh subset.
6. Emit: `"Resuming {surface} audit: {N} prior violations restored — {M} green (fixed), {X} red (open)."`

**Why:** The red→green progression is the evidence trail the user reads. A fresh-subset restart loses the before-state and makes the "after" meaningless.
**CLAUDE.md anchor:** 2026-05-09 — "carry the full violation list across sessions (arrow continuity)."

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
| Description editor (write/edit mode) | `@atlaskit/editor-core` | `EditorContext, Editor` from `@atlaskit/editor-core` | https://www.npmjs.com/package/@atlaskit/editor-core | contenteditable, TipTap, Quill, Trix, any non-Atlaskit editor |
| Description viewer (read/display mode) | `@atlaskit/renderer` | `ReactRenderer` from `@atlaskit/renderer` | https://www.npmjs.com/package/@atlaskit/renderer | dangerouslySetInnerHTML, markdown-it, react-markdown, custom ADF parser |
| ADF content traversal / modification | `@atlaskit/adf-utils` | `traverse, map` from `@atlaskit/adf-utils` | https://www.npmjs.com/package/@atlaskit/adf-utils | Manual JSON walking, custom recursive ADF traversal |

---

## ADS Token Map (mandatory for all Catalyst styling)

Every color, spacing, elevation, and typography value must use `token()` from `@atlaskit/tokens`. Raw hex is banned unless a live Jira DOM probe confirms no ADS token matches.

**Canonical source for all token names, light-mode values, and dark-mode values:** https://atlassian.design/components/tokens/all-tokens — fetch this page when any token decision is being made. The table below is a curated subset; the full token registry is authoritative.

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

### RCA — why arrows drifted on window resize (fixed 2026-05-09)

**Root cause:** Prior versions stored `{x, y}` pixel snapshots from `getBoundingClientRect()` at
injection time. When the browser window was resized, the DOM elements moved to new positions but the
SVG arrow coordinates stayed hardcoded — causing the misalignment visible in screenshots.

**Fix:** Arrows now store CSS **selectors**, not coordinates. A `render()` function re-queries
`getBoundingClientRect()` live on every call. `window.addEventListener('resize', ...)` and a
capture-phase scroll listener trigger `requestAnimationFrame(render)` so arrows reposition
instantly as the layout reflows. This is the ONLY correct approach.

---

### Step 1 — Navigate to the surface

```
Navigate to: localhost:8080/{route}
```

### Step 2 — Probe to find CSS selectors for each violation

Use `javascript_tool` to confirm the selector targets the right element:

```js
// Confirm selector resolves and log its position (for verification only)
const el = document.querySelector('{your-selector}');
el ? console.log(el.getBoundingClientRect(), el.textContent.slice(0,40)) : console.log('NOT FOUND');
```

### Step 3 — Inject LIVE arrows (discovery + progress)

**violations array uses `selector` (CSS selector) + `label` + `side` ('left' | 'right') + `fixed` (bool)**
`fixed: false` → RED (open violation) · `fixed: true` → GREEN (resolved)
Arrows reposition automatically on resize and scroll. Toggle button (bottom-right) to show/hide.

```js
(function injectArrows(violations) {
  // violations: [{ selector, label, side ('left'|'right'), fixed (bool) }]
  // fixed=false → RED (open violation)   fixed=true → GREEN (resolved)

  const ID = '__di_overlay';
  const BTN_ID = '__di_overlay_btn';
  const RED = '#E5493A', GREEN = '#22A06B';

  // cleanup previous overlay + listeners + toggle button
  const prev = document.getElementById(ID);
  if (prev && prev._destroy) prev._destroy();
  if (prev) prev.remove();
  const prevBtn = document.getElementById(BTN_ID);
  if (prevBtn) prevBtn.remove();

  // SVG canvas
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = ID;
  Object.assign(svg.style, {
    position: 'fixed', top: '0', left: '0',
    width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: '99998',
  });
  document.body.appendChild(svg);

  // Both arrowhead markers in defs (red + green)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  [['di-red', RED], ['di-green', GREEN]].forEach(function(pair) {
    const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    m.id = pair[0];
    m.setAttribute('markerWidth','10'); m.setAttribute('markerHeight','7');
    m.setAttribute('refX','10'); m.setAttribute('refY','3.5'); m.setAttribute('orient','auto');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    p.setAttribute('points','0 0,10 3.5,0 7'); p.setAttribute('fill', pair[1]);
    m.appendChild(p); defs.appendChild(m);
  });
  svg.appendChild(defs);

  // live render — re-queries getBoundingClientRect() on every call
  function render() {
    Array.from(svg.children).forEach(function(c) { if (c.tagName !== 'defs') c.remove(); });
    violations.forEach(function(v) {
      const el = document.querySelector(v.selector);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      const color = v.fixed ? GREEN : RED;
      const markerRef = v.fixed ? 'di-green' : 'di-red';
      const vy = r.top + r.height / 2;
      const side = v.side || 'right';
      var lineStartX, lineEndX;
      if (side === 'right') { lineStartX = r.right + 78; lineEndX = r.right + 10; }
      else                  { lineStartX = r.left - 78;  lineEndX = r.left - 10;  }

      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', lineStartX); line.setAttribute('y1', vy);
      line.setAttribute('x2', lineEndX);   line.setAttribute('y2', vy);
      line.setAttribute('stroke', color);  line.setAttribute('stroke-width', '2');
      line.setAttribute('marker-end', 'url(#' + markerRef + ')');
      svg.appendChild(line);

      var badgeW = Math.min(v.label.length * 6.5 + 12, 240);
      var bx = side === 'right' ? lineStartX : lineStartX - badgeW;
      var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bg.setAttribute('x', bx); bg.setAttribute('y', vy - 11);
      bg.setAttribute('width', badgeW); bg.setAttribute('height', '16');
      bg.setAttribute('rx', '3'); bg.setAttribute('fill', color);
      svg.appendChild(bg);

      var txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', bx + 4); txt.setAttribute('y', vy + 1);
      txt.setAttribute('font-size', '10'); txt.setAttribute('fill', 'white');
      txt.setAttribute('font-family', 'system-ui,sans-serif');
      txt.setAttribute('font-weight', '600');
      txt.textContent = v.label.slice(0, 36);
      svg.appendChild(txt);
    });
  }

  render(); // draw immediately

  // reposition on resize + scroll (capture phase catches nested scroll containers)
  var rafId;
  function scheduleRender() { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(render); }
  window.addEventListener('resize', scheduleRender);
  window.addEventListener('scroll', scheduleRender, true);

  // floating toggle button
  var btn = document.createElement('button');
  btn.id = BTN_ID;
  var vis = true;
  Object.assign(btn.style, {
    position: 'fixed', bottom: '16px', right: '16px', zIndex: '100000',
    background: '#292A2E', color: '#fff', border: 'none', borderRadius: '6px',
    padding: '6px 12px', fontSize: '12px', fontFamily: 'system-ui,sans-serif',
    cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  });
  btn.textContent = '👁 Arrows';
  btn.onclick = function() {
    vis = !vis;
    svg.style.visibility = vis ? 'visible' : 'hidden';
    btn.textContent = vis ? '👁 Arrows' : '👁 Arrows (hidden)';
    btn.style.opacity = vis ? '1' : '0.5';
  };
  document.body.appendChild(btn);

  // cleanup — removes listeners + toggle button
  svg._destroy = function() {
    cancelAnimationFrame(rafId);
    window.removeEventListener('resize', scheduleRender);
    window.removeEventListener('scroll', scheduleRender, true);
    var b = document.getElementById(BTN_ID); if (b) b.remove();
  };

  var open = violations.filter(function(v){return !v.fixed;}).length;
  var fixed = violations.filter(function(v){return v.fixed;}).length;
  console.log('Overlay ' + ID + ': ' + open + ' open (red), ' + fixed + ' fixed (green)');
})([
  // Add violations here. Start all as fixed:false. Flip to fixed:true as each fix lands.
  // { selector: '[data-testid="for-you-row"]:first-child', label: 'V-1: row height >48px',    side: 'right', fixed: false },
  // { selector: '[data-cp-lozenge-jira-parity]',           label: 'V-2: lozenge wrap missing', side: 'left',  fixed: false },
  // After fixing V-1: change its fixed to true and re-run this block.
]);
```

**After injection:** Take screenshot immediately. Arrows reposition if you resize.
Caption: `🔴 DI VIOLATIONS — {surface} — {N} open violations`

Workflow for red → green progression:
1. Paste with all violations `fixed:false` → 🔴 screenshot → caption "X open violations"
2. Apply fix in code + reload page
3. Re-paste same block with that violation's `fixed:true` → 🟡 screenshot → "X open, Y fixed"
4. Repeat until all `fixed:true` → ✅ screenshot → "all resolved"
5. Toggle button (bottom-right) to hide/show arrows at any point without losing state

### Step 4 — Auto-green: flip fixed:true and re-run

After each fix is confirmed (code deployed, page reloaded):
1. Re-run the Step 3 block with the fixed violation's `fixed` changed from `false` to `true`
2. The arrow for that violation turns green automatically
3. Remaining violations stay red
4. Screenshot → caption: `🟡 DI PROGRESS — {N} open · {M} fixed`
5. When all `fixed: true` → caption: `✅ DI COMPLETE — all resolved`

---

## The Brief — Full Structure (v2.1, ADS Ring-Fenced)

Every section cites ADS. Uncited recommendations are invalid.

```
## Design Intelligence Brief v3.0 — {surface} — {date}
Scope: Catalyst localhost:8080/{route} · ADS Ring-Fenced · IQ 1000

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

### 1b. Lessons-Applied Pre-Scan Summary
{output of pre-scan: N anchors checked, violations found, warnings}

### 2. Foundation Council Analysis (ADS-anchored)

Each council finding MUST reference an ADS URL or CLAUDE.md ban. Lens 2h (AtlasKit Architect) is mandatory alongside 2a–2g.

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

#### 2h. AtlasKit Platform Architect (NEW in v3 — 8th mandatory lens)

This advisor has built Jira's own UI. Knows AtlasKit component internals, version-specific bugs, deprecation paths, and correct usage patterns that no other lens can see.

Mandatory checks — run on every surface:

| Component used | AtlasKit version risk | Known issue | Correct pattern |
|---|---|---|---|
| `@atlaskit/popup` | v4.16 — empty-portal bug | Popup never renders inside overflow:hidden | createPortal to document.body + data-portal attr |
| `@atlaskit/heading` | any | size="small" = 16px/653, not 14px/600 | Inline h2 at 14px/600 for section headers |
| `@atlaskit/select` | any | classNamePrefix produces custom DOM classes — does NOT mean non-Atlaskit | Check import source, not DOM class |
| `@atlaskit/modal-dialog` | any | height:Xvh inside ScrollContainer = double height context clipping top bar | Use minHeight only, never height inside modal |
| `@atlaskit/lozenge` | v11 | Inner span carries text-transform:uppercase, fontWeight:653 — Jira renders sentence-case | Wrap in data-cp-lozenge-jira-parity; CSS override inner span |
| `react-select` | any | Direct import bypasses ADS token system | Must import from @atlaskit/select |
| `WorkItemIcon` | deprecated shim | Does not render JiraIssueTypeIcon | Import from @/lib/jira-issue-type-icons directly |
| `@atlaskit/button` | any | appearance prop is the signifier system — custom buttons break ADS | Always use appearance prop |

AtlasKit Architect output per surface:

```
🏗️ AtlasKit Architect findings:
  {component} v{version}: {known issue} → {correct pattern} [P0/P1/P2]
  Deprecated: {component} — replace with {canonical}
  Version-specific bugs active: {list}
```

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

## Integration with Preflight v3 Pipeline

```
Phase 0   — Bootstrap (Obsidian-primary, CLAUDE.md gates, port 8080 lock)
Phase 0.5 — Jira Architect Scan (28 patterns, always runs)
Phase 1   — THIS SKILL fires here (all 8 lenses, ADS ring-fenced, 1000-IQ)
            → Lessons-applied pre-scan (CLAUDE.md anchors + JIRA_ARCHITECT.md patterns)
            → Session-resume continuity (re-inject full prior violation list if resuming)
            → Navigate to localhost:8080/{route}
            → Run DOM probe (get CSS selectors for each violation)
            → Inject RED arrows on all violations (pre-scan + council)
            → Screenshot inline in chat (annotated — plain screenshot rejected)
            → Produce full brief v3.0 with ADS citations
            → Blocking findings → mandatory Phase 3 rows
Phase 2   — Council (receives brief as first document; must cite ADS URLs)
Phase 3   — Plan (blocking findings become rows; AI use cases at P1 become rows)
Phase 4   — Execution loop (auto-commit on Vikram "go")
Phase 5   — Visual evidence (GREEN arrows replacing red; before/after screenshot pair)
Phase 6   — Learning engine (lesson extraction from DI findings)
Phase 7   — Obsidian handover
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

### ADS Core
- Atlassian Design System: https://atlassian.design/
- ADS Tokens: https://atlassian.design/foundations/tokens
- **All tokens (light + dark):** https://atlassian.design/components/tokens/all-tokens ← fetch for every token decision
- ADS Components: https://atlassian.design/components
- ADS Motion: https://atlassian.design/foundations/motion

### ADF (Atlassian Document Format)
- **ADF structure:** https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ ← fetch when description/comments in scope
- **ADF playground:** https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ ← fetch to generate/validate ADF samples

### Atlaskit Content Packages
- **@atlaskit/editor-core:** https://www.npmjs.com/package/@atlaskit/editor-core ← fetch for description edit-mode surfaces
- **@atlaskit/renderer:** https://www.npmjs.com/package/@atlaskit/renderer ← fetch for description read-mode surfaces
- **@atlaskit/adf-utils:** https://www.npmjs.com/package/@atlaskit/adf-utils ← fetch for ADF content manipulation

### Skills
- `CLAUDE.md` (worktree root) — ban list, canonical rules
- `design-critique/SKILL.md` — post-build H1-H10 scoring (pairs with this skill)
- `jira-compare/SKILL.md` — parity gate (provides evidence for section 3)
- `preflight/SKILL.md` — pipeline host (Phase 0.5)

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules.
