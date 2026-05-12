---
name: jira-compare
version: 1.0.0
description: >-
  Parity audit comparing a Catalyst surface (localhost:8080) against Jira.
  Runs 3 lanes in logical parallel — Chrome MCP (live DOM on both), Rovo/Atlassian
  MCP (Jira backend, schema, tokens), Computer Use (Lovable, Supabase) — gated
  by a CRUD acceptance test. Output: structured diff table + SVG red arrows on
  Catalyst violations. Board child protocol: attaches to preflight session card
  if .catalyst-board-session exists; creates its own card if running standalone.
  Triggers on: /jira-compare, "compare with jira", "parity audit", "jira drift",
  "compare {surface} to jira". Also fires as Phase 1 Lane A inside preflight.
author: Vikram × Claude, 2026-05-11
metadata:
  category: parity-audit
  tags: [jira, parity, dom-probe, chrome-mcp, atlassian-mcp, ads, catalyst]
  maturity: stable
  pipeline_position: Phase 1 Lane A (preflight v3) + standalone
---

# jira-compare v1.0 — Catalyst ↔ Jira Parity Audit

---

## ⚠️ HARD RULES — READ FIRST

1. **DOM probe, not assumption.** Never assert Jira renders something without measuring it via `getComputedStyle` in Chrome MCP. Prior measurements in CLAUDE.md are starting points — re-probe at audit time.
2. **Schema before field.** Before flagging a field as "missing from Catalyst," confirm it IS in the Jira screen scheme (`getJiraIssueTypeMetaWithFields`). Field absent from scheme → correct to exclude it. Anti-pattern #18.
3. **CRUD gate is the acceptance test.** Visual match alone is NOT parity. Create → Read → Update → Delete on both sides must pass before the surface is declared done.
4. **Catalyst-native surfaces → mock HTML, not jira-compare.** If there is no equivalent Jira page (e.g., /admin/catalyst-features), skip this skill and produce a Phase 2.5 Section E mock HTML instead.
5. **Port 8080 only.** localhost:8080. Never 8081 or any other port.
6. **5-cycle cap.** Maximum 5 probe-fix-reprobe cycles per surface per session. On cycle 5, list remaining open items in handover rather than looping again.

---

## Soft Announcement

When this skill fires, emit BEFORE any output:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 jira-compare v1.0 · Catalyst ↔ Jira Parity Audit
Surface: {surface} · Jira issue: {BAU-XXXX or route}
Lanes: A (Chrome MCP DOM) · B (Atlassian MCP schema) · C (CRUD gate)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

When complete:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 jira-compare v1.0 · AUDIT COMPLETE
{N} drift items · {M} P0 blockers · CRUD: {PASS/FAIL}
Red arrows on open violations. Screenshot follows.
Cycle {N}/5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Board Child Protocol (runs before Lane A)

```
1. Check for session file:
   CARD_KEY=$(cat {project_root}/.catalyst-board-session 2>/dev/null | grep CARD_KEY | cut -d= -f2)

2. If CARD_KEY found (running inside preflight session):
   → Navigate Chrome MCP: localhost:8080/admin/catalyst-features
   → javascript_tool: window.__catalystBoard.addSkill("jira-compare", "$CARD_KEY");
   → Navigate back to localhost:8080/{target-route}
   → Do NOT create a new card.

3. If CARD_KEY empty (running standalone):
   → Generate: card_key = "jira-compare:{surface-slug}:{YYYY-MM-DD}"
   → Navigate Chrome MCP: localhost:8080/admin/catalyst-features
   → javascript_tool: window.__catalystBoard.write({
       card_key: "{card_key}",
       title: "jira-compare: {surface} parity audit",
       status: "in_progress",
       feature_group: "{feature_group — see preflight Step 4c}",
       surface: "{surface component name}",
       skill_source: ["jira-compare"],
       session_id: "{ISO timestamp}",
     });
   → Write card_key to .catalyst-board-session:
     echo "CARD_KEY={card_key}" > {project_root}/.catalyst-board-session
   → Navigate back to localhost:8080/{target-route}
```

---

## Lane A — Chrome MCP DOM Probe

### Step 1 — Navigate to both surfaces

```
Jira:     {Jira base URL}/browse/{BAU-XXXX}
Catalyst: localhost:8080/{route}?issue={BAU-XXXX}
```

Use `tabs_create_mcp` to open a second tab if needed. Probe one at a time.

### Step 2 — Structural probe script (run on EACH surface)

```js
// Run in Chrome MCP javascript_tool on Jira tab, then on Catalyst tab
// Returns: element inventory with computed styles
(function probe() {
  const results = [];
  const targets = [
    // Add specific selectors per surface here
    // Key details section
    { id: 'status-pill',    sel: '[data-testid="issue.views.issue-base.foundation.status.status-button-group"] button' },
    { id: 'priority-field', sel: '[data-testid*="priority"] [role="img"], [aria-label*="riority"]' },
    { id: 'assignee-field', sel: '[data-testid*="assignee"] [data-ds--text-field--input], .assignee-field' },
    // Section headers
    { id: 'section-header', sel: 'h2' },
    // Right rail labels
    { id: 'field-labels',   sel: '[data-testid*="field-label"], .field-label' },
    // Typography
    { id: 'body-text',      sel: 'p, [class*="description"]' },
  ];
  targets.forEach(t => {
    const el = document.querySelector(t.sel);
    if (!el) { results.push({ id: t.id, found: false }); return; }
    const s = getComputedStyle(el);
    results.push({
      id: t.id, found: true,
      text: el.textContent?.slice(0, 40),
      fontSize: s.fontSize, fontWeight: s.fontWeight,
      color: s.color, background: s.backgroundColor,
      padding: s.padding, height: el.getBoundingClientRect().height,
      transform: s.textTransform,
    });
  });
  console.log(JSON.stringify(results, null, 2));
  return results;
})();
```

### Step 3 — Build diff table

From the two probe results, construct:

```
### Parity Diff — {surface} vs Jira

| Element | Jira (measured) | Catalyst (measured) | Δ | Severity | Fix |
|---|---|---|---|---|---|
| Status pill font | 11px / 653 / uppercase | 14px / 400 / none | size + weight + case | P0 | Match Jira measured values |
| Section header | 14px / 600 / #172B4D | 16px / 653 / — | @atlaskit/heading bug | P0 | Inline h2 style |
| Field label | 11px / 600 / #6B778C | 12px / 400 | P1 | Rail label spec |
| Priority (Epic) | right rail | left key-details | misplaced | P1 | Move to right rail |
```

### Step 4 — SVG arrows on Catalyst (identical protocol to design-intelligence)

Use the `injectArrows` script from `design-intelligence/SKILL.md`. Arrow ID prefix: `jc` (not `di`).

```js
// Replace ID = '__di_overlay' with ID = '__jc_overlay'
// Replace BTN_ID = '__di_overlay_btn' with BTN_ID = '__jc_overlay_btn'
// Replace marker IDs 'di-red', 'di-green' with 'jc-red', 'jc-green'
// violations array:
[
  { selector: '{CSS selector}', label: 'JC-{N}: {element} — {Jira vs Catalyst}', side: 'right', fixed: false },
]
```

---

## Lane B — Atlassian MCP Schema Probe

Run for every field you plan to add or have added:

```
Tool: getJiraIssueTypeMetaWithFields
Args: projectKey="BAU", issueTypeId="{type id for the surface's issue type}"

Issue type IDs:
  Epic = 10000, Story = 10006, Task = 10010, QA Bug = 10012
  Production Incident = 10045, Business Gap = 10035
  Feature = 10173, Change Request = 10305

Output: list fields[].key present in scheme
Cross-check: every Catalyst field rendered for this type MUST appear in fields[].key
             OR be explicitly Catalyst-native (not a Jira proxy field)
```

Anti-pattern #18 gate: if a field is in Catalyst's render path but NOT in `fields[].key` → P0 violation → remove or gate by type.

---

## Lane C — CRUD Acceptance Gate

Pick one canonical entity for the surface. Test all four operations:

| Op | What to test | Pass condition |
|---|---|---|
| **C** (Create) | Create a new work item / comment / sub-task | Row appears in Supabase + rendered in Catalyst UI |
| **R** (Read) | Navigate to the entity in Catalyst | All fields render, no "undefined" or empty placeholders |
| **U** (Update) | Inline edit a field (status, assignee, priority) | Value persists after page reload |
| **D** (Delete) | Delete via ⋯ menu | Row removed from Supabase, UI updates |

**CRUD-R Diff rule (from jira-compare lesson 2026-04-28):**
Data divergence between Jira and Catalyst is expected while `wh-jira-sync` is parked. Do NOT flag stale data as a P0. Flag structural/render gaps only.

---

## Output Format

After all three lanes run, emit the complete parity report:

```markdown
## jira-compare Report — {surface} — {date} — Cycle {N}/5

### Diff Table (Lane A)
{table from Step 3}

### Schema Gate (Lane B)
Fields in scheme but missing from Catalyst: {list}
Fields in Catalyst but NOT in scheme (anti-pattern #18): {list with P0 tag}

### CRUD Gate (Lane C)
C: {PASS/FAIL — evidence}
R: {PASS/FAIL — evidence}
U: {PASS/FAIL — evidence}
D: {PASS/FAIL — evidence}

### Open Items (to carry into next cycle or handover)
- {item}: {reason blocked}

### Resolved This Cycle
- {item}: {fix applied + commit hash if known}
```

---

## jira-compare Lessons (append-only, newest first)

See CLAUDE.md `# jira-compare — compounding lessons` section. These are authoritative.
Key anchors to apply before every audit:

- Status pill colors: always DOM-probe `getComputedStyle` — never assume "Blocked = red"
- Section header: inline `h2` at 14px/600 — never `@atlaskit/heading size="small"`
- StatusPill inner text: innermost colored span — not outer wrapper
- Right rail fields: transparent idle borders; border only on hover + focus
- Lozenge sentence-case: wrap with `data-cp-lozenge-jira-parity`
- MDT Ref / Service Now# / Assessment Feature: permanently banned — never add
- Epic Priority: must be in right rail, NOT key details left block

---

## References

- `CLAUDE.md` `# jira-compare — compounding lessons` — all prior audit lessons
- `design-intelligence/SKILL.md` — SVG arrow injection protocol (shared)
- `preflight/SKILL.md` Phase 1 Lane A — how this skill fits the pipeline
- `references/JIRA_ARCHITECT.md` — 28-pattern checklist (cross-reference)

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules.
