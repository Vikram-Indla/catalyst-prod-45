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
<<<<<<< HEAD
9. **ADS resource citation is mandatory.** Diff table `Fix` column entries must cite a specific ADS URL (token page, component page, or ADF structure doc). An uncited Fix is a P1 finding in the audit itself. Relevant resources are fetched in the ADS Extended Resource Check (see below) — before Lane A diff table is built.
=======
9. **Screenshot → auto-fix → rebuild loop (MANDATORY).** When ANY screenshot is shared in chat that shows a defect, crash, build error, or broken UI state: (a) immediately diagnose the root cause from the screenshot without asking for permission, (b) fix the code, (c) kill and rebuild the dev server on port 8080 (`kill $(lsof -t -i:8080); bun run dev --port 8080`), (d) navigate Chrome MCP to the affected URL and check for console errors, (e) take a Computer Use screenshot to confirm visually. If still broken, loop steps b–e. Never wait for "should I fix this?" — diagnose and fix immediately on screenshot receipt.
>>>>>>> origin/BAU-filters-01

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
ADS GATE: {PASS/FAIL} · P0: {X} · P1: {Y} · P2: {Z}
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

> **Canonical spec:** `../catalyst-agent/ADS_CHECKPOINT.md` — TIER 1/TIER 2/BANNED qualification table lives there. This section is the jira-compare invocation binding; the checkpoint file is the single source of truth.

Use `WebFetch` for each triggered URL. An unfetched TIER 1 resource is a Hard Rule #9 violation — the cycle does not count toward the 5-cycle cap until fetched.

### TIER 1 — Always fetch (every audit, every surface)

| Resource | URL | What to extract |
|---|---|---|
| Atlassian Design System | https://atlassian.design/ | Canonical component for every UI slot under review |
| ADS Design Tokens | https://atlassian.design/components/tokens/all-tokens | Exact token name · light value · dark value — cite in the Fix column for every color/spacing/border gap |

### TIER 2 — Signal-gated (fetch only when the matching signal is detected)

| Signal detected | Resource | URL |
|---|---|---|
| description / comment / rich text / "ADF" | ADF structure | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ |
| ADF test data or structure validation | ADF playground | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ |
| description field in **edit/write** mode | @atlaskit/editor-core | https://www.npmjs.com/package/@atlaskit/editor-core |
| description field in **read/display** mode | @atlaskit/renderer | https://www.npmjs.com/package/@atlaskit/renderer |
| ADF traversal or programmatic manipulation | @atlaskit/adf-utils | https://www.npmjs.com/package/@atlaskit/adf-utils |
| kanban / backlog rank / any drag-drop | Pragmatic DnD | https://atlassian.design/components/pragmatic-drag-and-drop |
| DnD implementation detail needed | Pragmatic DnD GitHub | https://github.com/atlassian/pragmatic-drag-and-drop |
| installing a new @atlaskit/* package | Atlaskit portal | https://atlaskit.atlassian.com/get-started |

### BANNED — Never fetch, never use

| Resource | Reason |
|---|---|
| `@atlaskit/dynamic-table` (direct) | **BANNED** for work-item surfaces — `JiraTable` is canonical. Flag any direct import as P0. |
| `@atlassian/aui` | Legacy; not used in Catalyst. |

**Resource audit block (emit before diff table) — use ADS_CHECKPOINT.md Phase 1B format:**

```
ADS RESOURCE CHECK — {surface} — {date}

Resource                                              | Tier   | Status      | Finding
atlassian.design/                                    | 1      | FETCHED     | <canonical component confirmed or gap noted>
atlassian.design/components/tokens/all-tokens        | 1      | FETCHED     | <token · light · dark for each gap>
developer.atlassian.com/.../document/structure/      | 2-ADF  | FETCHED/N/A | <ADF node type verified or not triggered>
developer.atlassian.com/.../document/playground/     | 2-ADF  | FETCHED/N/A | <sample generated or not triggered>
npmjs.com/@atlaskit/editor-core                      | 2-edit | FETCHED/N/A | <version + EditorContext wired or not triggered>
npmjs.com/@atlaskit/renderer                         | 2-read | FETCHED/N/A | <version + ReactRenderer props or not triggered>
npmjs.com/@atlaskit/adf-utils                        | 2-ADF  | FETCHED/N/A | <traverse/map API or not triggered>
atlassian.design/components/pragmatic-drag-and-drop  | 2-dnd  | FETCHED/N/A | <DnD pattern confirmed or not triggered>
github.com/atlassian/pragmatic-drag-and-drop         | 2-dnd  | FETCHED/N/A | <implementation detail or not triggered>
atlaskit.atlassian.com/get-started                   | 2-pkg  | FETCHED/N/A | <package install pattern or not triggered>
```

A TIER 1 row left `NOT FETCHED` → audit is incomplete → cycle does not count toward the 5-cycle cap until fetched.

---

## ADS Checkpoint Gate — Phase 2 → 4 (runs after Lane A diff table is built)

> **Full spec:** `../catalyst-agent/ADS_CHECKPOINT.md` — Phases 1A/1B/1C (AUDIT), 2 (GATE), 3 (FIX), 4 (VERIFY)

After building the Lane A diff table and before running the CRUD gate (Lane C):

1. **Phase 1A — CLI Scan** (run on every file touched during this cycle):
   ```bash
   node design-governance/rules/audit.js src/<file-or-dir>
   ```
2. **Phase 1B — Resource Fetch** — emit ADS RESOURCE CHECK block (TIER 1 + triggered TIER 2)
3. **Phase 1C — DOM Sweep** — run computed-style sweep from ADS_CHECKPOINT.md Phase 1C on the surface
4. **Phase 2 — GATE** — classify findings P0/P1/P2; emit ADS COMPLIANCE SCAN table:
   - P0 present → `ADS GATE: FAIL` → ask user before continuing — "ADS Checkpoint found {N} P0 violations. Fix now or proceed and file as P0 gaps? [fix/proceed]"
   - P0 = 0 → `ADS GATE: PASS`
5. **Phase 3 — FIX** (user-gated — only after explicit user approval):
   Route each violation via the routing matrix in ADS_CHECKPOINT.md; per-fix commit format: `fix(ads): <violation-type> in <ComponentName>`
6. **Phase 4 — VERIFY** — re-run CLI + screenshot + DOM sweep; emit ADS VERIFY block

```
ADS CHECKPOINT GATE — {surface} — cycle {N}
P0: {X} · P1: {Y} · P2: {Z}
ADS GATE: PASS (no P0) | FAIL ({X} P0 violations — fix required before cycle can PASS)

Note: Phase 3 FIX dispatch does NOT auto-commit in jira-compare.
All fixes are staged and presented to user via the Git Confirmation Gate.
```

`ADS GATE: FAIL` blocks the **cycle closing verdict**. A cycle cannot close with `PASS` while any P0 violation remains unfixed or Vikram-approved deferred.

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

### ADS Resource Check
{resource audit block from ADS Extended Resource Check section}

### Diff Table (Lane A)
{table from Step 3 — Fix column must cite ADS URL}

### ADS Checkpoint Report (Phases 1A–1C + Gate)
{ADS RESOURCE CHECK block}
{ADS COMPLIANCE SCAN table — P0/P1/P2 rows with Fix column citing ADS URL}
ADS GATE: PASS (no P0) | FAIL ({X} P0 violations — listed in Open Items)

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
- ADS P0: {violation} — {fix required before ADS GATE: CLEAR and cycle can PASS}

### Resolved This Cycle
- {item}: {fix applied + commit hash if known}

### Cycle Verdict
{PASS: diff ≤ N items, CRUD ✅, ADS GATE: CLEAR (P0=0)}
{FAIL: list blocking items — P0 violations / CRUD failures / TIER 1 resources not fetched}
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

### ADS Resources — TIER classification (canonical spec: `../catalyst-agent/ADS_CHECKPOINT.md`)

**TIER 1 — Always fetch:**
| Resource | URL |
|---|---|
| Atlassian Design System | https://atlassian.design/ |
| ADS Design Tokens | https://atlassian.design/components/tokens/all-tokens |

**TIER 2 — Signal-gated:**
| Signal | Resource | URL |
|---|---|---|
| ADF / rich text | ADF structure | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ |
| ADF test data | ADF playground | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ |
| Description edit mode | editor-core | https://www.npmjs.com/package/@atlaskit/editor-core |
| Description read mode | renderer | https://www.npmjs.com/package/@atlaskit/renderer |
| ADF manipulation | adf-utils | https://www.npmjs.com/package/@atlaskit/adf-utils |
| drag / rank / DnD | Pragmatic DnD | https://atlassian.design/components/pragmatic-drag-and-drop |
| DnD implementation | Pragmatic DnD GitHub | https://github.com/atlassian/pragmatic-drag-and-drop |
| new @atlaskit/* install | Atlaskit portal | https://atlaskit.atlassian.com/get-started |

**BANNED — Never fetch, never use:**
| Resource | Reason |
|---|---|
| `@atlaskit/dynamic-table` (direct) | BANNED for work items — use `JiraTable` |
| `@atlassian/aui` | Legacy, not in Catalyst |

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules.
