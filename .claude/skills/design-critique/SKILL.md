---
name: design-critique
description: >-
  Heuristic UX/UI scoring skill for Catalyst surfaces. Given a screenshot or
  live URL, scores against 10 heuristics derived from Nielsen + Atlassian
  Design System guidelines. Produces a structured findings table, severity
  ratings (P0/P1/P2), and a closure evidence block with annotated screenshots.
  Mandatory before any design-only surface is declared done.
  Triggers on: "design critique", "UX review", "audit the design", "heuristic
  review", "design score", "does this look right", "rate the UI".
version: 1.1.0
author: preflight × Vikram × Claude, 2026-06-01 (v1.1: clone-parity gate + 10 anti-shipping-fast guards)
metadata:
  category: design-quality
  tags: [design, ux, heuristics, audit, closure, ads, atlaskit]
  maturity: stable
---

# Design Critique — Heuristic UX/UI Scoring

## Purpose

Stop subjective "looks good" sign-offs. Produce a scored, evidence-backed
design audit against 10 measurable heuristics before any UI surface is
declared done. Pairs with `jira-compare` (pixel parity) and `ads-validator`
(token compliance) to form the full UI quality gate.

---

## Soft Announcement (mandatory — fires when skill activates)

When this skill fires, emit this exact block in chat BEFORE scoring:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 design-critique · HEURISTIC AUDIT
Surface: {surface name} · {route}
Scoring: H1 system status · H2 real-world match · H3 control · H4 consistency
         H5 error prevention · H6 recognition · H7 efficiency · H8 minimalism
         H9 typography · H10 help & docs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When scoring is complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 design-critique · SCORE: {X}/30
{P0 count} P0 blockers · {P1 count} P1 issues · {P2 count} P2 polish
{SHIP / HALT} — threshold is 22/30
Red arrows on all findings. Screenshot follows.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Red → Green Arrow Protocol (mandatory for all violation display)

### RCA — resize-drift bug fixed 2026-05-09

**Prior bug:** violations stored as `{x, y}` pixel snapshot → arrows drifted when browser window
resized. **Fix:** violations now use `{selector, label, side}`. A live `render()` re-queries
`getBoundingClientRect()` on every resize/scroll event via `requestAnimationFrame`.

### Discovery phase — LIVE arrows (discovery + progress)

**violations array uses `selector` (CSS selector) + `label` + `side` ('left' | 'right') + `fixed` (bool)**
`fixed: false` → RED (open violation) · `fixed: true` → GREEN (resolved)
Arrows reposition automatically on resize and scroll. Toggle button (bottom-right) to show/hide.

```js
(function injectArrows(violations) {
  // violations: [{ selector, label, side ('left'|'right'), fixed (bool) }]
  // fixed=false → RED (open violation)   fixed=true → GREEN (resolved)

  const ID = '__dc_overlay';
  const BTN_ID = '__dc_overlay_btn';
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
  [['dc-red', RED], ['dc-green', GREEN]].forEach(function(pair) {
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
      const markerRef = v.fixed ? 'dc-green' : 'dc-red';
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
  // { selector: 'h2.column-header', label: 'H9: uppercase header', side: 'right', fixed: false },
  // { selector: '[data-testid="row"]:first-child', label: 'H8: row >48px', side: 'left', fixed: false },
  // After fixing H9: change its fixed to true and re-run this block.
]);
```

- Screenshot immediately after injection.
- Caption: `🔴 DC VIOLATIONS — {surface} — {N} issues found · resize-stable`

Workflow for red → green progression:
1. Paste with all violations `fixed:false` → 🔴 screenshot → caption "X open violations"
2. Apply fix in code + reload page
3. Re-paste same block with that violation's `fixed:true` → 🟡 screenshot → "X open, Y fixed"
4. Repeat until all `fixed:true` → ✅ screenshot → "all resolved"
5. Toggle button (bottom-right) to hide/show arrows at any point without losing state

### Post-fix phase — Auto-green: flip fixed:true and re-run

After each fix is confirmed (code deployed, page reloaded):
1. Re-run the block above with the fixed violation's `fixed` changed from `false` to `true`
2. The arrow for that violation turns green automatically
3. Remaining violations stay red
4. Screenshot → caption: `🟡 DC PROGRESS — {N} open · {M} fixed`
5. When all `fixed: true` → caption: `✅ DC COMPLETE — H1-H10 score updated`

Raw screenshots with no arrows are REJECTED. Resize after injection to confirm arrows track.

---

## 0 — Proactive ADS Sensor (fires before any critique, always)

Before any heuristic scoring or visual review, run:

1. **`anthropic-skills:ads-validator`** on the surface source files
2. **`anthropic-skills:design-intelligence`** on the live route at localhost:8080

Auto-findings that require NO user prompt:
- `isBold` on Lozenge → H4=0 (consistency), H9≤1 (typography)  
- Raw hex colors → H4=0 (design system violation)
- Hardcoded px spacing → H8≤2, H9≤2
- Unwanted helper text / "Learn about" links → H8 finding (minimalism)
- Premature validation errors → H5 P0 (error prevention)
- Hand-rolled ADS-replaceable components → H4=0

Sensor P0s automatically cap the heuristic score at 0/3 — they cannot be scored around.
Sensor P1s cap at 1/3.

**This section fires without being asked. It is the intelligence layer that makes critique proactive, not reactive.**

---

## The 10 Heuristics (scored 0–3 per surface)

| # | Heuristic | What passes |
|---|---|---|
| H1 | **Visibility of system status** | User always knows what's loading, synced, errored |
| H2 | **Match between system and real world** | Labels, icons, terminology match user's mental model (Jira vocabulary where applicable) |
| H3 | **User control and freedom** | Undo, cancel, escape — no dead ends |
| H4 | **Consistency and standards** | ADS tokens used; same component for same pattern throughout |
| H5 | **Error prevention** | Destructive actions confirm; required fields validate before submit |
| H6 | **Recognition over recall** | State visible in UI without requiring memory; no hidden columns |
| H7 | **Flexibility and efficiency** | Power users: keyboard shortcuts, bulk actions; beginners: discoverable defaults |
| H8 | **Aesthetic and minimalist design** | No redundant info, no banned columns, density matches Jira benchmark |
| H9 | **Typography and visual hierarchy** | ADS token stack (12px/600 headers, 14px/400 body, sentence-case labels, `token()` colours) |
| H10 | **Help and documentation** | Empty states have a call-to-action; error messages name the fix |

Score per heuristic: **3** = fully met · **2** = minor gap · **1** = significant gap · **0** = failing

---

## 500-IQ Foundation Council Pre-Scan (mandatory — runs before heuristic scoring)

Before scoring H1–H10, run the Foundation Council scan from `design-intelligence v2`. This takes ~2 minutes and produces council findings that feed DIRECTLY into the heuristic scores:

| Council lens | Heuristics informed |
|---|---|
| Saffer (micro-interactions) | H1 (system status feedback), H3 (user control), H7 (efficiency) |
| Tufte (data-ink) | H8 (minimalism), H9 (visual hierarchy) |
| Rams (10 principles) | H3 (thoroughness of error states), H8 (as little design as possible) |
| Norman (affordances) | H2 (real world match), H5 (error prevention), H6 (recognition over recall) |
| Ive (reduction) | H8 (aesthetic), H9 (typography) |
| Raskin (cognitive efficiency) | H7 (efficiency — Hick's/Fitts' Law violations), H3 (no mode traps) |
| Cooper (goal-directed) | H2 (match to user's mental model), H10 (help and documentation — CTAs in empty states) |

Emit this block when this layer activates:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 design-critique · 500-IQ COUNCIL PRE-SCAN
Surface: {surface} · Route: {route}
Council: Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper
Pre-scan complete → feeding into H1-H10 scores
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Council findings elevate heuristic severity: a Raskin P0 (mode trap) automatically makes H3 = 0/3. A Cooper P0 (empty state without CTA) automatically makes H10 = 0/3. The council cannot be overridden by the heuristic scorer.

---

## Critique Protocol

### Step 1 — Screenshot all states + 500-IQ Council Pre-Scan
First run the 500-IQ Foundation Council Pre-Scan (above). Then capture screenshots of the surface in:
- Default loaded state
- Empty state (no data)
- Loading state (skeleton or spinner)
- Error state (network failure or permission denied)
- Expanded / collapsed variants (sidebar, panels)
- Dark mode (if supported)

### Step 2 — Score each heuristic
For each heuristic, state:
- **Score**: 0–3
- **Evidence**: what you observed (DOM probe or visual)
- **Finding**: what's wrong (if score < 3)
- **Severity**: P0 (blocks ship) / P1 (fix before next release) / P2 (polish backlog)

### Step 3 — Produce findings table

```
| Heuristic | Score | Finding | Severity | Fix |
|---|---|---|---|---|
| H4 Consistency | 1 | Three-dots uses shadcn DropdownMenu; rest of app uses AKDropdownMenu | P0 | Replace with AKDropdownMenu |
| H9 Typography | 2 | Column headers UPPERCASE (text-transform: uppercase) vs Jira sentence-case | P1 | Set text-transform: none; sentence-case label strings |
```

### Step 4 — Closure Evidence (MANDATORY — same rule as preflight Phase 6)

When the critique is complete and findings are resolved:

1. **Take maximum visual screenshots** covering every state listed in Step 1.
2. **Inject SVG arrow annotations directly on the live page** (↓ ← → ↑) via `javascript_tool`. Every arrow carries a before/after label: `← AKDropdownMenu (was shadcn, dead)`. Raw screenshots with no arrows are **rejected**.
3. **Display each annotated screenshot inline in the chat** — the conversation IS the artefact. No file export, no folder, no disk storage. Caption each image in chat: surface · heuristic(s) fixed · severity resolved.
4. Update the preflight handover under `## Design Closure Evidence` with the **caption list only** — visuals live in the chat session above.
5. Commit before declaring the surface design-complete.

A critique that closes without annotated screenshots has NOT closed.

---

## Mandatory Gates

This skill is a **blocking prerequisite** before:
- Any `ui-feature` or `design-only` surface is marked done in the preflight handover
- Any PR description claims "design complete" or "UX reviewed"

If the score is below **22 / 30** (< 73%), the surface MUST NOT ship. Halt and file P0/P1 findings as tasks.

---

## Hard Rules (non-negotiable)

1. **No banned columns** — Type/Pipe, Category, Space URL, Templates are permanently banned from Projects module. Flagging one of these as "present" is an instant P0.
2. **ADS tokens only** — any raw hex or `text-slate-*` Tailwind class is an H4/H9 violation.
3. **No `text-transform: uppercase` on column headers** — sentence-case only (jira-compare lesson 2026-05-09).
4. **Row density** — target 48px row height (Jira benchmark). Anything ≥ 56px is H8 P1.
5. **Sidebar Recent** — two-line layout (summary line 1, KEY line 2) is the canonical pattern. Single-line truncation is H6 P1.

---

## 🔒 PRE-FLIGHT CLONE-PARITY GATE (mandatory — BLOCKS critique start)

**When a critique is on a surface that "must look like" another surface (product↔project, child hub↔parent hub, etc.), the FIRST action before scoring any heuristic is the Clone-Parity Gate. If it fails, halt and surface a P0 — do not score, do not "look at the design", do not propose visual tweaks.**

### The gate (10 mandatory checks — ALL must pass)

Run BEFORE any heuristic scoring. Each is a hard yes/no, evidence-required.

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 design-critique · CLONE-PARITY GATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

G1 [component identity] Are the EXACT SAME React components from the
   reference surface mounted on the surface under critique?
   Probe: `grep -r "import.*Editable\|CatalystSidebar\|StatusTransition" {surface_file}`
   Required: every shared field uses the canonical component, not a hand-
   rolled @atlaskit/* equivalent.
   FAIL → P0 "parallel reimplementation" — score H4=0 immediately, halt.

G2 [shared component reuse] If the canonical component is hardwired to one
   data source (e.g. ph_issues), is the FIX to parameterise it (adapter
   prop) — NOT to fork it as a new component?
   Required: zero new components named like `Br*`, `Pr*`, `Prod*` that
   shadow an existing canonical (`Catalyst*`, `Editable*`).
   FAIL → P0 "fork instead of parameterise". Halt.

G3 [interaction parity, not just visual] Does clicking / focusing /
   keyboarding the surface produce the SAME state transitions as the
   reference? Probe via dispatchEvent + DOM assertion.
   Required: `aria-expanded`, popover open, items reachable. Visual
   match ≠ functional match.
   FAIL → P0. Halt.

G4 [naming parity] Do nav labels, section headers, and field labels
   mirror the reference labels by ROLE (e.g. "Project Work" → "Product
   Work", "Project Backlog" → "Product Backlog")?
   Required: word-for-word, role-substituted only.
   FAIL → P1 "naming drift".

G5 [icon type registry] Every work-item-type icon must use the
   `JiraIssueTypeIcon type=` string from the locked CLAUDE.md icon
   registry. NEVER pass a field value (e.g. `request_type`) as a `type`
   prop. NEVER build a `map*ToIconType` helper.
   FAIL → P0. Halt.

G6 [external image ban] No `<img src={external_url}>` for any avatar,
   icon, or asset. ONLY bundled-local paths via the canonical resolver
   (`resolveAvatarUrl`, etc). External URLs in DB rows MUST be ignored.
   Probe: `document.querySelectorAll('img')` → assert no `gravatar`,
   `secure.`, `cdn.`, `atl-paas` in src.
   FAIL → P0. Halt.

G7 [global CSS collision] Root elements of any panel/section MUST be
   `<div>`, NEVER `<aside>` / `<section>` / `<nav>` — those are claimed
   by global `@layer components` rules and silently paint backgrounds /
   borders the surface didn't ask for.
   FAIL → P0 if a panel uses a semantic tag and inherits paint.

G8 [duplicate fields ban] If a field appears in the right rail, it must
   NOT also render in the center column (and vice versa). No 2×2 grid
   of cards duplicating right-rail fields.
   FAIL → P0 "information architecture drift".

G9 [field-component contract] Every right-rail field must show the
   reference's idle-state affordances: PriorityIcon for Priority,
   Avatar+name for Assignee/Reporter, "Assign to me" link, plain-text
   idle (not always-open select), borderless chrome on hover.
   FAIL per missing affordance → P1 each.

G10 [evidence] Every G1–G9 verdict requires a DOM/CSS probe quote
    (selector + computed value). Visual inspection or screenshot
    inference is REJECTED.
    FAIL → halt, re-probe.
```

### Output format when the gate fires

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 design-critique · CLONE-PARITY GATE: {N}/10 pass
   Surface: {surface} vs reference {ref}
   FAILED gates: G{x}, G{y}, G{z}
   Each failed gate = automatic P0 in the heuristic table.
   Heuristic scoring SUSPENDED until all 10 pass.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If even one gate fails, the heuristic score is NOT emitted. The output is the gate table + a fix plan referencing the canonical component to adopt.

---

## 🚫 ANTI-SHIPPING-FAST GUARDS (mandatory — read before every fix)

These 10 guards exist because a single session (2026-06-01) reproduced ALL
of them. They are not theoretical — they are the documented failure modes
of "shipping something visible fast." Every rule below is a HARD halt.

### L1 — NEVER build a parallel section component
If the reference surface uses `CatalystSidebarDetails`, the cloned surface
MUST mount `CatalystSidebarDetails` (parameterised), NOT a new `BrSidebarDetails`.
**Halt if you find yourself typing `function {Br|Pr|Prod}{Section,Panel,Field}(`.**

### L2 — NEVER map field-values to icon-type-strings
`type` props on `JiraIssueTypeIcon` are PROPER NAMES from the locked
CLAUDE.md icon registry (Story, Epic, Business Request, ...). Field values
like `request_type='feature'` are NOT type strings.
**Halt if you find yourself writing a `map*ToIconType()` helper.**

### L3 — NEVER use external image URLs as avatar sources
DB rows can contain external URLs (Gravatar, Atlassian CDN). Those are
explicitly banned by CLAUDE.md §19. The only legal sources are
`resolveAvatarUrl(name)` (bundled local) or `null` (→ initials).
**Halt if you find yourself writing `<img src={profile.avatar_url}>`.**

### L4 — NEVER `git add -A` / `git add .` / `git add --all`
Stage explicit paths only. `git status` before every commit. If
unexpected files are staged, halt — they likely belong to a parallel
agent or a stale working tree.
**Halt if you find yourself typing `git add -A`.**

### L5 — Visual parity ≠ functional parity
Matching font/colour/size is NOT done. The component must also produce
the same interaction (click → popover, keyboard → focus shift, etc).
**Probe via `dispatchEvent` + DOM assertion before claiming "matched".**

### L6 — Read CLAUDE.md before EVERY edit on the target file
A lesson logged earlier in the same session is worthless if it isn't
re-read before the next commit touches the relevant surface. CLAUDE.md
is loaded into context — re-read the relevant section by `grep -n`
before editing.
**Halt if you cannot quote the relevant CLAUDE.md rule for the change.**

### L7 — Root elements are `<div>`, never `<aside>` / `<section>` / `<nav>`
Global `@layer components` rules paint semantic tags with surface
defaults intended for the left nav. The right rail is NOT a nav.
**Halt if you find yourself writing `<aside data-cv-section=`.**

### L8 — Naming must mirror the reference role-for-role
"Project X" → "Product X", "Project Y" → "Product Y". Never invent a new
label ("All Work" when the reference says "Project Work").
**Halt if the new label is not a 1-word substitution of the reference.**

### L9 — Never render the same field in two places
A field appears in EITHER the center column OR the right rail, not both.
2×2 grids of bordered cards duplicating right-rail fields are a P0.
**Halt if you find yourself building a "key details" grid AND a sidebar
that share fields.**

### L10 — "Visible fast" is the slowest path
Building a new component takes 30 minutes; re-doing it 4 times when the
defects surface takes 6 hours. The correct path (parameterise the shared
component once) takes 90 minutes and never needs redoing.
**Halt and ask: "If I had to do this AGAIN next month with full parity,
would I still build it this way?" If no, stop — adopt the canonical.**

---

## References

- `CLAUDE.md` — gates, banned columns, ADS-token rules, jira-compare lessons
- `jira-compare` skill — pixel parity gate (pairs with this skill)
- `ads-validator` skill — token compliance gate
- `preflight` Phase 6 — closure evidence protocol (same arrow/annotation rule)
- Atlassian Design System: https://atlassian.design/
