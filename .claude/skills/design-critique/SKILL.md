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
version: 1.0.0
author: preflight × Vikram × Claude, 2026-05-09
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

## Board Child Protocol (runs immediately after Soft Announcement)

```
1. Check session file:
   CARD_KEY=$(cat {project_root}/.catalyst-board-session 2>/dev/null | grep CARD_KEY | cut -d= -f2)

2. If CARD_KEY found (inside a preflight session):
   → Navigate to localhost:8080/admin/catalyst-features
   → javascript_tool: window.__catalystBoard.addSkill("design-critique", "$CARD_KEY");
   → Navigate back to localhost:8080/{target-route}
   → Do NOT create a new card.

3. If CARD_KEY empty (standalone /design-critique run):
   → card_key = "design-critique:{surface-slug}:{YYYY-MM-DD}"
   → Navigate to localhost:8080/admin/catalyst-features
   → javascript_tool: window.__catalystBoard.write({
       card_key: "{card_key}", title: "design-critique: {surface} heuristic audit",
       status: "in_progress", feature_group: "{feature_group}",
       surface: "{surface}", skill_source: ["design-critique"],
       session_id: "{ISO timestamp}",
     });
   → echo "CARD_KEY={card_key}" > {project_root}/.catalyst-board-session
   → Navigate back to target surface.
```

**Failure mode:** never halt for a board write failure — log and continue.

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

## The 10 Heuristics (scored 0–3 per surface)

| # | Heuristic | What passes | ADS resource required |
|---|---|---|---|
| H1 | **Visibility of system status** | User always knows what's loading, synced, errored | — |
| H2 | **Match between system and real world** | Labels, icons, terminology match Jira vocabulary; description/comment fields use ADF format (`@atlaskit/renderer` / `@atlaskit/editor-core`), not markdown or raw HTML | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ |
| H3 | **User control and freedom** | Undo, cancel, escape — no dead ends | — |
| H4 | **Consistency and standards** | ADS tokens used; same `@atlaskit/*` component for same pattern throughout; ADF content uses canonical packages | https://atlassian.design/components · https://atlassian.design/components/tokens/all-tokens |
| H5 | **Error prevention** | Destructive actions confirm; required fields validate before submit | — |
| H6 | **Recognition over recall** | State visible in UI without requiring memory; no hidden columns | — |
| H7 | **Flexibility and efficiency** | Power users: keyboard shortcuts, bulk actions; beginners: discoverable defaults | — |
| H8 | **Aesthetic and minimalist design** | No redundant info, no banned columns, density matches Jira benchmark | — |
| H9 | **Typography and visual hierarchy** | ADS token stack (12px/600 headers, 14px/400 body, sentence-case labels, `token()` colours); every token cited from all-tokens page | https://atlassian.design/components/tokens/all-tokens · https://atlassian.design/foundations/typography |
| H10 | **Help and documentation** | Empty states have a call-to-action; error messages name the fix | — |

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
6. **ADS citation required for H4 and H9.** Any H4 (Consistency) or H9 (Typography) finding that scores below 3/3 MUST cite a specific URL from the ADS Extended Resources below. Uncited H4/H9 findings are capped at 1/3 regardless of the actual score.
7. **ADF compliance is an H2 and H4 check.** If the surface contains a description or comment field, the critique MUST verify whether ADF structure is being used (H2: real-world match with Jira) and whether `@atlaskit/renderer` / `@atlaskit/editor-core` are the implementation (H4: consistency). Fetch the ADF structure doc and package pages before scoring these heuristics.

## ADS Extended Resources — Contextual Fetch Table

> These resources are fetched contextually during the critique. Each triggered resource must produce a named finding in the findings table.

| Trigger | Resource | Heuristics informed |
|---|---|---|
| Any surface (always) | https://atlassian.design/ | H4, H9 |
| Any token / color / border / background decision | https://atlassian.design/components/tokens/all-tokens | H4, H9 |
| Description, comment, or rich-text field present | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ | H2, H4 |
| ADF content needs validation | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ | H2, H5 |
| Description in write/edit mode | https://www.npmjs.com/package/@atlaskit/editor-core | H2, H4 |
| Description in read/display mode | https://www.npmjs.com/package/@atlaskit/renderer | H2, H4 |
| ADF data manipulation in scope | https://www.npmjs.com/package/@atlaskit/adf-utils | H4 |

---

## References

- `CLAUDE.md` — gates, banned columns, ADS-token rules, jira-compare lessons
- `jira-compare` skill — pixel parity gate (pairs with this skill)
- `ads-validator` skill — token compliance gate
- `preflight` Phase 6 — closure evidence protocol (same arrow/annotation rule)

### ADS Extended Resources (see contextual fetch table above)

| Resource | Heuristics | Use |
|---|---|---|
| https://atlassian.design/ | H4, H9 | ADS source of truth — canonical components + guidelines |
| https://atlassian.design/components/tokens/all-tokens | H4, H9 | All tokens with light/dark values — cite in every H4/H9 finding |
| https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ | H2, H4 | ADF document structure — verify description/comment field compliance |
| https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ | H2, H5 | ADF playground — validate ADF content structure |
| https://www.npmjs.com/package/@atlaskit/editor-core | H2, H4 | Rich-text editor for description write mode |
| https://www.npmjs.com/package/@atlaskit/renderer | H2, H4 | ADF read-only renderer for description display mode |
| https://www.npmjs.com/package/@atlaskit/adf-utils | H4 | ADF content traversal/modification utilities |

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules.
