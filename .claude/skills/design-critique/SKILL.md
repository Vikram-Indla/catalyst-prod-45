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

## Red → Green Arrow Protocol (mandatory for all violation display)

### Discovery phase — RED arrows

When violations are found, inject SVG arrows directly onto the live page using `javascript_tool`. Every violation gets a red arrow + label.

Arrow injection template:
```js
(function injectViolationArrows(violations) {
  // Remove any existing overlay
  document.getElementById('__dc_overlay')?.remove();
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = '__dc_overlay';
  Object.assign(svg.style, {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    pointerEvents: 'none', zIndex: 99999,
  });
  // Define red arrowhead marker
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
  marker.setAttribute('id', 'dc-red-arrow');
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
    line.setAttribute('marker-end', 'url(#dc-red-arrow)');
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
// Same template, replace '#E5493A' with '#22A06B', marker id 'dc-green-arrow'
// Labels become: 'FIXED: ' + original_label
```

- Take a screenshot immediately after green injection.
- Display screenshot inline in chat with caption: `✅ FIXED — {surface} — {N} issues resolved`

Raw screenshots with no arrows are REJECTED. Both red (discovery) and green (post-fix) screenshots are mandatory.

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

## References

- `CLAUDE.md` — gates, banned columns, ADS-token rules, jira-compare lessons
- `jira-compare` skill — pixel parity gate (pairs with this skill)
- `ads-validator` skill — token compliance gate
- `preflight` Phase 6 — closure evidence protocol (same arrow/annotation rule)
- Atlassian Design System: https://atlassian.design/
