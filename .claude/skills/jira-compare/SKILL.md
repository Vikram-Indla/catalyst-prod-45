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

0. **Code archaeology FIRST.** Before using ANY Jira API endpoint, check `wh-jira-bulk-sync` and similar functions for the proven endpoint. Replicate the working pattern exactly. Only debug if replication fails. See CLAUDE.md 2026-05-16 lesson. Cost: ~30 seconds. Benefit: eliminates wrong alternatives.
1. **DOM probe, not assumption.** Never assert Jira renders something without measuring it via `getComputedStyle` in Chrome MCP. Prior measurements in CLAUDE.md are starting points — re-probe at audit time.
2. **Schema before field.** Before flagging a field as "missing from Catalyst," confirm it IS in the Jira screen scheme (`getJiraIssueTypeMetaWithFields`). Field absent from scheme → correct to exclude it. Anti-pattern #18.
3. **CRUD gate is the acceptance test.** Visual match alone is NOT parity. Create → Read → Update → Delete on both sides must pass before the surface is declared done. Use Supabase MCP (`execute_sql`, `list_tables` on project `lmqwtldpfacrrlvdnmld`) to verify backend state for CRUD-R.
4. **Catalyst-native surfaces → mock HTML, not jira-compare.** If there is no equivalent Jira page (e.g., /admin/catalyst-features), skip this skill and produce a Phase 2.5 Section E mock HTML instead.
5. **Port 8080 only.** localhost:8080. Never 8081 or any other port.
6. **5-cycle cap.** Maximum 5 probe-fix-reprobe cycles per surface per session. On cycle 5, list remaining open items in handover rather than looping again.
7. **Jira REST API endpoints** — Always use the proven endpoints from existing code: `/rest/api/3/search/jql` (search), `/rest/api/3/issue/{key}` (details), `/rest/api/3/issue/{key}/changelog` (history). Never try deprecated alternatives.
8. **gh CLI for git operations with user confirmation gates.** After audit completes with fixes applied, ask user: "The parity audit is complete and changes have been implemented. Should I create a PR / commit and push to main? [yes/no]". User must confirm before `git commit`, `git push`, or `gh pr create`. Never auto-commit or auto-push without explicit user approval.
9. **ADS resource citation is mandatory.** Diff table `Fix` column entries must cite a specific ADS URL (token page, component page, or ADF structure doc). An uncited Fix is a P1 finding in the audit itself. Relevant resources are fetched in the ADS Extended Resource Check (see below) — before Lane A diff table is built.

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

🔗 GIT CONFIRMATION GATE — post before any commit/push:
"The parity audit is complete and fixes have been applied. 
Should I commit these changes and push to main? [yes/no]"

Await explicit user confirmation before proceeding.
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

## Pre-Flight Code Archaeology (MANDATORY FIRST)

Before running Lane A or B, check for existing Jira REST API implementations:

1. **Search:** Look for `wh-jira-*` edge functions, `jira-sync-*` utilities, `ph_jira_connection` usage
2. **Read the working pattern:** Exact endpoints, headers, credentials format, pagination, error handling
3. **Replicate exactly:** Use the proven endpoint (e.g., `/rest/api/3/search/jql`) with the same auth pattern
4. **Only probe/debug if replication fails**

This prevents trying deprecated endpoints and ensures credential handling is correct.

---

## ADS Extended Resource Check (runs in parallel with Lane A — MANDATORY)

> Fetch all resources triggered by the surface's signals. Each consulted resource must produce a named finding even if the finding is "compliant". An unfetched triggered resource is a Hard Rule #9 violation.

Use `WebFetch` for each triggered URL. Cite the URL in the diff table `Fix` column for every related row.

| Signal on the surface | Resource to fetch | What to extract for the audit |
|---|---|---|
| Any surface (always) | https://atlassian.design/ | Confirm canonical ADS component for each UI slot under review |
| Any token / color / border / background decision | https://atlassian.design/components/tokens/all-tokens | Exact token name, light-mode value, dark-mode value, semantic use-case |
| Description field, comment field, rich text, "ADF" | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ | ADF node type(s) used; confirm Catalyst renders/emits the correct structure |
| ADF validation or test-data generation needed | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ | Produce a validated ADF sample for the content under test |
| Description field in write/edit mode | https://www.npmjs.com/package/@atlaskit/editor-core | Package version, whether EditorContext is wired, peer-dep alignment |
| Description field in read/display mode | https://www.npmjs.com/package/@atlaskit/renderer | Package version, ReactRenderer props used, ADF support matrix |
| ADF content manipulation in scope | https://www.npmjs.com/package/@atlaskit/adf-utils | traverse/map API confirmation; correct utility for the operation |

**Resource audit block (emit before diff table):**

```
ADS RESOURCE CHECK — {surface} — {date}
Resource                                              | Triggered by  | Status    | Finding
atlassian.design/                                    | always        | FETCHED   | <canonical component confirmed or gap>
atlassian.design/components/tokens/all-tokens        | color/token   | FETCHED   | <token name · light · dark>
developer.atlassian.com/.../document/structure/      | ADF           | FETCHED   | <ADF node type verified>
developer.atlassian.com/.../document/playground/     | ADF validate  | N/A       | <not triggered — no ADF validation needed>
npmjs.com/@atlaskit/editor-core                      | edit mode     | FETCHED   | <version + EditorContext wired>
npmjs.com/@atlaskit/renderer                         | read mode     | FETCHED   | <version + ReactRenderer props>
npmjs.com/@atlaskit/adf-utils                        | ADF manip.    | N/A       | <not triggered>
```

Any row marked `NOT FETCHED` for a triggered signal → audit is incomplete → cycle does not count toward the 5-cycle cap until fetched.

---

## Lane A — Chrome MCP DOM Probe + Jira REST API Details

### Step 1 — Navigate to both surfaces + fetch detailed data

```
Jira:     {Jira base URL}/browse/{BAU-XXXX}
Catalyst: localhost:8080/{route}?issue={BAU-XXXX}
```

Use `tabs_create_mcp` to open a second tab if needed. Probe one at a time.

**Simultaneously (Jira REST API):**
- Query `/rest/api/3/issue/{BAU-XXXX}` to get full issue details (fields, custom fields, parent, watchers, history)
- Query `/rest/api/3/issue/{BAU-XXXX}/changelog` to get status transitions (for CRUD-R validation)
- Query `/rest/api/3/search/jql?jql=key={BAU-XXXX}` to validate the issue is searchable via JQL
- Use Rovo Search to find related issues and acceptance criteria in linked issues

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

From the two probe results AND the ADS Extended Resource Check, construct:

```
### Parity Diff — {surface} vs Jira

| Element | Jira (measured) | Catalyst (measured) | Δ | Severity | Fix | ADS URL |
|---|---|---|---|---|---|---|
| Status pill font | 11px / 653 / uppercase | 14px / 400 / none | size + weight + case | P0 | Match Jira measured values | https://atlassian.design/foundations/typography |
| Section header | 14px / 600 / #172B4D | 16px / 653 / — | @atlaskit/heading bug | P0 | Inline h2 style | https://atlassian.design/components/heading |
| Field label | 11px / 600 / #6B778C | 12px / 400 | P1 | Rail label spec | https://atlassian.design/foundations/typography |
| Priority (Epic) | right rail | left key-details | misplaced | P1 | Move to right rail | https://atlassian.design/foundations/layout |
| Description (ADF) | ADF `doc` node | raw HTML / markdown | wrong renderer | P0 | Use @atlaskit/renderer with ADF doc | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ |
```

> **Enforcement:** Any row in the `Fix` column that cannot be backed by an ADS URL is flagged as "citation missing" — a P1 in the audit itself. The ADS URL column is MANDATORY, not optional.
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

## Lane B — Atlassian MCP Schema Probe + Rovo Requirement Analysis

**Schema probe (for every field you plan to add or have added):**

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

**Rovo Requirement Analysis (parallel to schema probe):**

Use Rovo Search to:
1. **Find related issues** — search `is linked to {BAU-XXXX}` to discover dependency scope
2. **Extract acceptance criteria** — read linked Epic/Story descriptions for requirements clarity
3. **Map field dependencies** — if adding field X, check if linked issues reference X in their context
4. **Identify scope conflicts** — Rovo can highlight if this issue's scope overlaps with concurrent work

Output: requirement clarity score, scope boundaries, related issue count, dependency graph (if applicable)

---

## Lane C — CRUD Acceptance Gate + Supabase MCP Verification

Pick one canonical entity for the surface. Test all four operations:

| Op | What to test | Pass condition | Verification |
|---|---|---|---|
| **C** (Create) | Create a new work item / comment / sub-task via Catalyst UI | Row appears in Catalyst UI + persists in Supabase backend | Use Supabase MCP: `execute_sql(project_id="lmqwtldpfacrrlvdnmld", query="SELECT * FROM {table} WHERE id='{new_id}'")` |
| **R** (Read) | Navigate to the entity in Catalyst | All fields render, no "undefined" or empty placeholders | DOM probe via Chrome MCP; cross-check Supabase query result for field values |
| **U** (Update) | Inline edit a field (status, assignee, priority) | Value persists after page reload in both UI + backend | Update value in Catalyst, reload page, verify via Supabase MCP query that column value changed |
| **D** (Delete) | Delete via ⋯ menu | Row removed from Catalyst UI + Supabase backend | Verify row is gone via Supabase MCP: `execute_sql(query="SELECT count(*) FROM {table} WHERE id='{deleted_id}'")`  returns 0 |

**CRUD-R Diff rule (from jira-compare lesson 2026-04-28):**
Data divergence between Jira and Catalyst is expected while `wh-jira-sync` is parked. Do NOT flag stale data as a P0. Flag structural/render gaps only.

**Supabase MCP commands for CRUD verification:**
```
list_tables(project_id="lmqwtldpfacrrlvdnmld", schemas=["public"], verbose=true)
execute_sql(project_id="lmqwtldpfacrrlvdnmld", query="SELECT * FROM {table} WHERE {condition} LIMIT 10")
```
Use `execute_sql` to query the exact table and row that was just created/updated/deleted to confirm backend state matches UI.

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

### ADS Extended Resources (fetched per signal — see ADS Extended Resource Check section)

| Resource | Use |
|---|---|
| https://atlassian.design/ | ADS source of truth — canonical components, tokens, guidelines |
| https://atlassian.design/components/tokens/all-tokens | All design tokens with light/dark values — cite in Fix column for every color/spacing gap |
| https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ | ADF JSON document structure — cite when description/comment rendering is audited |
| https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ | ADF playground — generate validated ADF samples for test data or structure verification |
| https://www.npmjs.com/package/@atlaskit/editor-core | ADF rich-text editor — required for description edit-mode surfaces |
| https://www.npmjs.com/package/@atlaskit/renderer | ADF read-only renderer — required for description display-mode surfaces |
| https://www.npmjs.com/package/@atlaskit/adf-utils | ADF traversal/modification utilities — required when content is programmatically manipulated |

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules.
