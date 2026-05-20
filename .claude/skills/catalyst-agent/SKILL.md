---
name: catalyst-agent
version: 3.0.0
description: >-
  Probe-first router for Catalyst engineering tasks (v3). Probes Jira + Catalyst
  + codebase, produces a MANDATORY structured gap report TABLE per GAP_REPORT.md,
  scans every surface for ADS violations as value-added items (Step 4.5), monitors
  context window and saves to Obsidian at 90% depletion with a copy-paste handover
  block, and requires a Computer Use screenshot as evidence after every fix. All
  tools authorized except TestSprite + preview_*. Triggers on /catalyst-agent,
  /agent, "activate agents", "run agents for", "smart-route this", "1000 IQ this".
author: "Vikram x Claude, 2026-05-20"
metadata:
  category: orchestration
  tags: [routing, agents, probe-first, mcp, preflight, jira-compare, design-intelligence, design-critique, catalyst, gap-report, ads-scan, context-guard, screenshot-evidence]
  maturity: stable
  agent_library: ./.claude/agents/ (184 personas, shared across team)
  wrapper_skills: [preflight, jira-compare, design-intelligence, design-critique]
  mcp_servers: [atlassian, chrome, computer-use, supabase, figma]
  supabase_project: lmqwtldpfacrrlvdnmld
  supabase_url: https://lmqwtldpfacrrlvdnmld.supabase.co
  vcs: gh (GitHub CLI)
  git_default_branch: main
  git_confirmation_gate: "before commit and push"
  iq_level: 1000
  design_system:
    source: https://atlassian.design/
    scope: exclusive
    components: "@atlaskit/* only"
    tokens: "@atlaskit/tokens — var(--ds-*) only"
    typography: "@atlaskit/heading + ADS tokens (live Jira anchors override per CLAUDE.md)"
    icons: "@atlaskit/icon + @/lib/jira-issue-type-icons only"
    paired_with: atlassian_mcp_probe
  pre_execution_gate:
    name: green_signal
    intensity: intensive
    dimensions: [visual, structural, behavioral, schema, architecture, accessibility, claude_md]
    blocks_execution_until: green
    override: vikram_only_explicit_chat_confirmation
  new_in_v3:
    gap_report_table: "Step 5 produces mandatory structured table per GAP_REPORT.md — no prose-only reports"
    ads_surface_scan: "Step 4.5 scans surface for ADS violations as value-added items routed to right agent"
    tool_override: "All tools authorized (Computer Use MCP now enabled); only TestSprite + preview_* banned"
    context_guard: "Continuous duty — 90% context triggers /obsidian save + copy-paste handover block"
    screenshot_evidence: "Mandatory Computer Use screenshot after every implementation action before declaring done"
---

# /catalyst-agent v3 — probe-first agent router

Your job is to ground every routing decision in **what's actually on Jira
and Catalyst right now** — not in what the task wording sounds like. You
PROBE first, ROUTE second. Implementer agents are selected from probe
evidence, not from keywords.

---

## Triggers

- `/catalyst-agent <task>` — full pipeline (canonical form)
- `/agent <task>` — terse alias, same behaviour
- `/catalyst-agent --dry-run <task>` — run the probe + print routing, do NOT hand off
- `/catalyst-agent --skip-probe <task>` — keyword-only routing (v1 behaviour)
- `/catalyst-agent --probe-only <task>` — run probe + emit gap report, no routing
- `/catalyst-agent --agents <a,b,c> <task>` — force agent set, keep probe + wrapper picks
- `/catalyst-agent --wrapper <name> <task>` — force wrapper, keep probe + agent picks
- `/catalyst-agent --quick <task>` — suppress activation lines for trivial tier

---

## Continuous Duties (active throughout ALL steps — not optional)

### A — Context Window Guard (CONTEXT_GUARD.md, Directive 4)

Check context signals at the START of Steps 4, 4.5, 6, 8, and 9. Print the appropriate block:

- **70% warning** (3+ components probed, OR 4+ phases completed, OR 2+ re-probe cycles):
  ```
  WARNING CONTEXT GUARD — ~70% consumed
     Completed phases: [list]
     Remaining work: [list]
     Recommendation: finish current component, then /obsidian save before next
  ```
- **90% emergency** (2+ full implement→verify cycles, OR all 70% signals simultaneously):
  1. Print: `EMERGENCY CONTEXT GUARD — ~90% consumed SAVING NOW`
  2. Invoke `/obsidian save [%]`
  3. Print HANDOVER BLOCK (copy-paste ready) — format in `CONTEXT_GUARD.md`
  4. Explain to user how to resume

### B — Tool Authorization (CORE_DIRECTIVES.md, Directive 3)

ALL tools are authorized throughout this skill — for BOTH probing AND implementing:
- **Chrome MCP** (`mcp__Claude_in_Chrome__*`) — DOM probing, navigation, clicking
- **Computer Use MCP** (`mcp__computer-use__*`) — screenshots (mandatory after every fix), visual verification
- **Atlassian MCP**, **Supabase MCP**, **Figma MCP** — all phases
- **Bash, Read, Write, Edit, Agent, WebFetch** — all available

**Banned (2 only, global, cannot be overridden):** `testsprite_*` and `preview_*`.

The CLAUDE.md restriction "Chrome MCP only for Lane B" is **suspended** under /catalyst-agent. Computer Use MCP is explicitly authorized for visual verification and screenshot evidence.

---

## The 11-step pipeline (v3 — run sequentially every time)

### Step 1 — Parse intent

Read the task text. Extract:

- **Files / surfaces referenced** — `BacklogPage.atlaskit.tsx`, `JiraTable`, `/admin/*`, `ph_issues`, etc.
- **Operation verbs** — fix, add, remove, refactor, audit, optimize, migrate
- **Domain signals** — "dynamic table", "RLS", "Jira parity", "ADS token", "accessibility"
- **Issue / entity references** — `BAU-1234`, PR numbers, screenshot paths, surface URLs
- **Probe scope hints** — which Jira screen / Catalyst view / Supabase table

Output: `{ surface, operation, signals[], file_hints[], probe_scope[] }`.

### Step 2 — Read CLAUDE.md (BLOCKING ban check)

Read `CLAUDE.md` at project root. Check against the **permanent ban list** (see ROUTER.md ban table). If any banned signal hits → **HALT immediately**. Do NOT enter probe step. No agent activates. Cite the CLAUDE.md anchor.

This step runs before probe to avoid wasting MCP calls on tasks that will be refused anyway.

### Step 3 — Classify (per `preflight/RUBRIC.md`)

```
Tier:    <trivial | standard | high-stake>
Surface: <ui-feature | ui-bug-fix | ui-refactor | backend-migration |
          design-only | knowledge-save | handover | atlassian-admin |
          cross-cutting>
Why:     <which classifier marker fired>
```

Trivial tier → skip probe (step 4), go straight to step 6. Probe is too expensive for typos.

### Step 4 — MCP PROBE (the heart of v3)

**Context Guard checkpoint** — check signals before starting this step.

#### Step 4.0 — Code archaeology (MANDATORY FIRST, before any MCP tools)

Before spinning up any probe agents, scan the codebase for existing working implementations:

1. **Search for related functions/files** using Bash grep or Explore agent:
   - `wh-jira-*` functions for Jira integrations
   - `ph_jira_*` tables for related schemas
   - Prior audit lanes in CLAUDE.md lessons
   - Similar surface implementations (backlog, allwork, detail views)

2. **Read the working code** (if found):
   - Exact endpoint used (e.g., `/rest/api/3/search/jql` vs deprecated `/rest/api/3/search`)
   - Headers, auth patterns, pagination logic
   - Error handling, retry patterns
   - Data transformation rules (ADF → plaintext, status name mapping, etc.)

3. **Replicate the working pattern exactly** before probing/debugging:
   - If a Jira API endpoint is already proven in `wh-jira-bulk-sync`, use it
   - Don't try alternatives until the replicated pattern fails
   - Document what you found in the GAP REPORT (step 5)

4. **Only then** proceed to MCP probes if the replicated pattern still fails or reveals new gaps.

**Why:** The codebase IS the source of truth for "what works." See CLAUDE.md 2026-05-16 lesson.

**Cost:** ~30 seconds. **Benefit:** Often eliminates the need for external debugging.

---

Invoke read-only probe agents in parallel via the `Agent` tool. Each probe agent has a narrow remit.

#### How persona dispatch actually works (important)

The Claude Code harness has a **fixed compiled-in set of subagent types**: `claude-code-guide`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`. Files at `~/.claude/agents/*.md` are **NOT auto-discovered as subagent types** — `Agent({subagent_type: 'engineering-frontend-developer'})` fails with "Agent type not found" (verified 2026-05-11).

**The working dispatch pattern is `general-purpose` + persona content in the prompt:**

```
Agent({
  description: "<one-line action>",
  subagent_type: "general-purpose",
  prompt: `You are operating as the <persona-name> persona from
./.claude/agents/<persona-name>.md. Persona summary: <2-3 line role description>.

ROLE: <read-only / write / etc>
TASK: <specific task>
CONTEXT: <files, URLs, prior probes>
OUTPUT: <format expectation, word cap>
CONSTRAINTS: <what NOT to touch, time budget>`
})
```

**Mandatory: every dispatched prompt prepends the contents of `CORE_DIRECTIVES.md`** before the persona summary. This gives every agent Directives 1-5 (ADS ring-fence, Green Signal gate, tool authorization, context guard, screenshot evidence).

The canonical full template:

```
Agent({
  description: "<one-line action>",
  subagent_type: "general-purpose",
  prompt: `${read('.claude/skills/catalyst-agent/CORE_DIRECTIVES.md')}

You are operating as the <persona-name> persona from
./.claude/agents/<persona-name>.md. Persona summary: <2-3 line role>.

ROLE: <read-only / write / etc>
TASK: <specific task>
CONTEXT: <files, URLs, prior probes>
OUTPUT: <format expectation, word cap>
CONSTRAINTS: <what NOT to touch, time budget>`
})
```

Alternative — **persona overlay** (no dispatch): main Claude reads the persona file and role-plays it inline. Cheaper but no context isolation. The CORE_DIRECTIVES still apply.

#### The 5 probe lanes (with code archaeology first)

| Probe lane | Persona (loaded into general-purpose) | MCP tools | What it returns |
|---|---|---|---|
| **Lane A — Jira schema + REST API** | `project-management-jira-workflow-steward` | Atlassian MCP: `getJiraIssueTypeMetaWithFields`, `getJiraProjectIssueTypesMetadata`, `searchJiraIssuesUsingJql`, `getTransitionsForJiraIssue` + Jira REST: `/rest/api/3/search/jql`, `/rest/api/3/issue/{key}/changelog`, `/rest/api/3/issue/{key}` | Screen scheme fields, workflow states, transitions, full issue metadata |
| **Lane B — Catalyst DOM** | `engineering-frontend-developer` | Chrome MCP: `javascript_tool`, `read_page`, `find` on `localhost:8080` + **Computer Use MCP: `screenshot`** for visual capture | Live `getComputedStyle`, DOM structure, click handlers, rendered state, screenshots |
| **Lane C — Supabase schema** | `engineering-database-optimizer` | Supabase MCP (project: `lmqwtldpfacrrlvdnmld`): `list_tables`, `execute_sql`, `list_extensions`, `list_migrations` | `ph_*` columns, RLS policies, indexes, migration history |
| **Lane D — Codebase static** | `engineering-codebase-onboarding-engineer` | Read, Grep | File paths, call chain, CLAUDE.md lessons, similar implementations |
| **Lane E — Rovo AI requirement analysis** | `project-management-jira-workflow-steward` (Rovo mode) | Rovo Search + Recommendations | Requirement clarity, scope, related work, dependency mapping |

Probe lanes run **in parallel** when independent. Lane A and B always run for UI surfaces. Lane C only for `backend-migration` or schema signals. Lane D always runs. Lane E when task involves Jira requirement extraction.

Code archaeology step runs BEFORE all lanes.

Probe budget: **3-5 minutes wall-clock max per lane**. If exceeded → mark `partial` and continue.

### Step 4.5 — ADS Surface Scan — value-added items [NEW in v3]

**Context Guard checkpoint** — check signals before starting this step.

While the probe evidence is fresh, scan the surface being worked on for ADS violations. This is "value-added" work — the agent is already on the surface, context is loaded, and fixing these catches compliance drift before it compounds.

#### How to run the scan

1. **CLI audit** — run the design-governance tool against the files identified in Lane D:
   ```bash
   node design-governance/cli/index.js audit src/[file-or-dir]
   ```

2. **Chrome MCP computed style sweep** — for every visible component on the surface, check:
   - Hardcoded hex/RGB (not `var(--ds-*)`)
   - Tailwind utility classes in `className` (e.g., `text-slate-500`, `p-3`, `rounded-lg`)
   - Non-`@atlaskit/*` interactive components (dropdowns, modals, selects, buttons)
   - Off-grid spacing values (not in 4/8/16/24/32px set)
   - Wrong font-weights (not in ADS set — 300/400/500/600/653/700/800/900)
   - Uppercase labels (`textTransform: uppercase`)

3. **Output as ADS Compliance Scan table** (format from `GAP_REPORT.md`):
   ```
   ADS COMPLIANCE SCAN — [Surface name] ([file:line])

   # | Element/File          | Violation       | Current value      | ADS fix                       | Severity
   --|-----------------------|-----------------|--------------------|-------------------------------|--------
   1 | FilterPanel.tsx:42    | HARDCODED_HEX   | #1F845A            | var(--ds-background-success)  | P1
   2 | AllWorkToolbar.tsx:18 | TAILWIND_UTILITY | text-slate-500    | var(--ds-text-subtle)         | P1
   3 | ColumnPicker.tsx:91   | OFF_GRID_SPACING | padding: 12px    | padding: 8px or 16px          | P2

   Total: N violations — P0: X · P1: Y · P2: Z
   ```

4. **Route violations to right agent**:
   - Hardcoded hex / wrong token → `design-ui-designer` + `engineering-frontend-developer`
   - Non-Atlaskit interactive component → `engineering-frontend-developer` (replace with `@atlaskit/*`)
   - Off-grid spacing → `engineering-frontend-developer`
   - Typography drift → `design-ui-designer`
   - RLS / schema issue → `engineering-database-optimizer`

5. **Offer to fix in current session** — these are value-added items, not blocking items (unless P0). Ask Vikram whether to include them in scope for this session.

### Step 5 — Synthesize gap report [UPDATED in v3 — TABLE FORMAT MANDATORY]

**Context Guard checkpoint** — check signals before starting this step.

Combine the probe lane outputs into a **structured gap report table** per `GAP_REPORT.md`. **Prose-only or bullet-list-only gap reports are rejected.** The mandatory format is:

```
Component N — [Component Name]

# | Dimension          | Jira (live probe)                    | Catalyst Current              | Gap
--|--------------------|------------------------------------- |-------------------------------|----
1 | Panel trigger      | Filter button + Shift+F wired        | "More filters" chip, no Shift+F | Shift+F not wired to allwork filter
2 | Tab bar            | Basic/Advanced/JQL (3 tabs)          | None — no tab bar at all      | Basic/Advanced/JQL tab row entirely absent
3 | Panel size         | 600 x 489px                          | 520 x 420px                   | 80px narrower, 69px shorter
...
9 | Active accent      | 2px blue left rail on active category | 2px blue left rail via ::before | Match
```

**Dimensions to probe** — use dimension lists from `GAP_REPORT.md` for the surface type:
- **UI Component** (panel, modal): 14 standard dimensions
- **List/Table surface**: 12 standard dimensions
- **Detail view / right rail field**: 9 standard dimensions
- **Toolbar**: 7 standard dimensions

**Gap column rules:**
- Use `Match` when Jira === Catalyst (with green check styling)
- Use specific imperative gap text when they differ: "80px narrower", "tab row absent", "Shift+F not wired"
- Never use vague descriptions like "slightly different" — measure and name the difference

**After the gap table, append the ADS Compliance Scan table from Step 4.5.**

Multi-component sessions: number components sequentially (Component 1, Component 2...) with a horizontal rule between them. Append a SESSION SUMMARY after the last component.

The synthesis is what makes the agent "1000 IQ" — it sees both sides and the codebase before opening its mouth, and presents findings as a scannable evidence table, not prose.

### Step 5.5 — Green Signal gate (BLOCKING — see `CORE_DIRECTIVES.md` Directive 2)

Before any execution can be considered, the probe must produce a **GREEN signal**. The verdict block is mandatory and must check coverage on all 7 dimensions:

1. Visual (computed-style measurements on both Catalyst + Jira)
2. Structural (DOM tree + ARIA + data-*)
3. Behavioral (handlers + state + network)
4. Schema (Atlassian MCP + Supabase if backend-touching)
5. Architecture (file:line refs, hierarchy, hook deps)
6. Accessibility (WCAG 2.1 AA)
7. CLAUDE.md cross-reference (anchors scanned, bans flagged)

Verdict block formats (must emit verbatim):

```
GREEN SIGNAL — probe complete cleared for execution
   Coverage: visual OK structural OK behavioral OK schema OK
             architecture OK a11y OK CLAUDE.md OK
   Findings: <N> Halts: 0 Open questions: <N, list>
   Probe agents: <list>
   Probe duration: <wall-clock>
   Verdict: SAFE TO EXECUTE per CORE_DIRECTIVES.md Directive 2
```

```
RED SIGNAL — probe incomplete execution BLOCKED
   Missing dimensions: <list>
   Halts: <list — CLAUDE.md anchors hit>
   Required follow-up: <list>
   Verdict: DO NOT EXECUTE — re-probe required
```

If RED: loop back to step 4 (re-probe) or escalate to Vikram. **Cap: 3 re-probes per task.** Beyond that → halt and report.

Only Vikram can manually override RED with explicit chat confirmation ("override red, proceed"). The override is logged in the activation block and any post-execution defect is auto-traced to the override.

### Step 6 — Pick wrapper(s) and implementer agents from `ROUTER.md` (with Phase 2.5 council gate)

**Context Guard checkpoint** — check signals before starting this step.

Two matrices in `ROUTER.md`:

1. **Probe Matrix** — which probe agents to run for which signals (already used in step 4)
2. **Implementer Matrix** — given the GAP REPORT, pick wrappers + implementer agents
3. **Phase 2.5 Council Gate** — if the gap is ambiguous OR task is high-stake, convene a 5-advisor routing council

**Phase 2.5 council activates when:**
- Gap report has multiple valid wrapper paths (ambiguous routing)
- Task classified as high-stake (per RUBRIC.md)
- NOT when: trivial tier, single unambiguous wrapper match, or `--quick` mode

The council (engineering-software-architect, senior-developer, jira-workflow-steward, code-reviewer, agents-orchestrator) deliberates for 5-10 min and outputs a binding composition order + rationale.

Implementer agents are categorically different from probe agents:

| Role | Probe agent | Implementer agent |
|---|---|---|
| Frontend | (only reads DOM) | `engineering-frontend-developer` (writes code) |
| Design | (only reads tokens) | `design-ui-designer` (fixes ADS violations) |
| Schema | (only reads RLS) | `engineering-database-optimizer` (writes migration SQL) |
| Jira | (only reads metadata) | `project-management-jira-workflow-steward` (advises on screen scheme) |

Same name can serve both roles in different phases.

Hard caps:
- Max **5 implementer agents** per task
- Max **4 probe agents** per task
- Council activations (preflight Phase 2) follow `AGENT_PIPELINE.md` rules

### Step 7 — Announce (BLOCKING — must print before any execution)

Output format (updated in v3 to include ADS scan results and context guard status):

```
ROUTING — /catalyst-agent v3
   intent:     <one-line summary>
   surface:    <surface classifier + relevant CLAUDE.md anchor>
   signals:    <quoted keywords>
   classifier: <trivial | standard | high-stake>
   bans hit:   <list or "none">
   context:    <~N% consumed | OK>

MCP PROBE — what's actually on Jira vs Catalyst
   Lane A (Jira via Atlassian MCP):
     <bullets from project-management-jira-workflow-steward>
   Lane B (Catalyst via Chrome MCP + Computer Use screenshot):
     <bullets from engineering-frontend-developer>
   Lane C (Supabase):
     <bullets or "n/a — backend not touched">
   Lane D (codebase):
     <bullets from engineering-codebase-onboarding-engineer>

GAP REPORT — Component N: [Name]
   [STRUCTURED TABLE per GAP_REPORT.md — mandatory]

ADS COMPLIANCE SCAN — [Surface]
   [STRUCTURED TABLE per GAP_REPORT.md — mandatory]
   Total violations: N (P0: X P1: Y P2: Z)

AGENTS ACTIVATED — N implementers
   primary:   <agent>  (<role for THIS task>)
   augment:   <agent>  (<role>)
   verify:    <agent>  (<role>)
   review:    <agent>  (<role>)
   ads-fix:   <agent>  (<ADS violations to address>)
   <- /catalyst-agent v3 wrappers: <chosen> CLAUDE.md gates: <list>

-> handing off to <first wrapper> <first phase>...
```

### Step 8 — Hand off to wrapper(s) + Screenshot Evidence [UPDATED in v3]

**Context Guard checkpoint** — check signals before starting this step.

Invoke the chosen wrapper skills in declared composition order. Pass the full PROBE + GAP REPORT as a pre-loaded context envelope so the wrapper can skip redundant evidence acquisition.

**MANDATORY after every implementation action (Directive 5):**

After any code change, style fix, or component update:

1. Navigate to the exact URL on `localhost:8080`
2. Take a screenshot using `mcp__computer-use__screenshot` (preferred) OR `mcp__Claude_in_Chrome__read_page`
3. If Computer Use is not yet granted: call `mcp__computer-use__request_access` with the browser application
4. Print the completion evidence block:

```
EVIDENCE — Component N ([Component Name]) after fix
   URL:       http://localhost:8080/[path]
   Screenshot: [attached via computer-use]
   Gap items resolved: N of total
   Fixed: [dimension labels fixed this session]
   Remaining: [list with reason if deferred]
   ADS violations fixed: N
   ADS violations remaining: N
```

**Never declare a fix "done" without a screenshot.** "The code should now X" is not evidence. Prove it.

### Step 9 — Loop back if needed

**Context Guard checkpoint** — check signals (this step signals a long session).

If the wrapper's CRUD acceptance gate fails or new gaps emerge, the router can re-fire the probe (Step 4) to refresh the state. Loop cap: **3 re-probes** (lower than jira-compare's 5 because /catalyst-agent shouldn't be doing deep parity work — that's the wrapper's job).

After each re-probe, update the gap report table with the latest state (mark fixed items, add any newly discovered gaps).

---

## Worked example — the dynamic-table pain point (with probe + code archaeology)

Input:

```
/agent the BacklogPage dynamic table sort is broken — clicking column
header doesn't reorder rows
```

Output:

```
ROUTING — /catalyst-agent v3
   intent:     fix column-header sort in BacklogPage list view
   surface:    ui-bug-fix BacklogPage / JiraTable
   signals:    "dynamic table" "sort" "BacklogPage" "column header"
   classifier: standard (per RUBRIC.md — single surface, no schema change)
   bans hit:   none
   context:    ~15% OK

CODE ARCHAEOLOGY — existing implementations first
   search:    grep -r "JiraTable" src/ + read JiraTable.tsx prior art
   found:     JiraTable.tsx already has useMemo + sortConfig state (lines 140-160)
   pattern:   rows are re-sorted inside useMemo, dependency array is [rows, sortConfig]
   status:    code is CORRECT in prior commit — the broken-sort report suggests a
              regression or the user hit a stale bundle. Probe will identify which.

MCP PROBE — what's actually on Jira vs Catalyst
   Lane A (Jira via Atlassian MCP — project-management-jira-workflow-steward):
     - BAU project list view sortable columns: Key, Status, Priority, Updated, Sprint, Assignee
     - Sort mechanism: REST /search?orderBy=<field>+<asc|desc> (server-side)
     - "Sprint" column belongs to screen scheme 10006 (Story) — visible by default in BAU
   Lane B (Catalyst via Chrome MCP + screenshot — engineering-frontend-developer):
     - localhost:8080/backlog visible columns: Key, Summary, Status, Comments, Parent
     - Sort handler: column header has onClick={handleSort(colId)} — correctly wired
     - useMemo dependency is CORRECT (no regression confirmed)
     - "Sprint" column missing from defaultColumns registry entirely
   Lane C (Supabase): n/a — sort is client-side
   Lane D (codebase — engineering-codebase-onboarding-engineer):
     - BacklogPage.atlaskit.tsx:312 — column definitions
     - JiraTable.tsx:140-160 — useMemo([rows, sortConfig]) is CORRECT

GAP REPORT — Component 1: BacklogPage List Table (sort feature)

# | Dimension      | Jira (live probe)                       | Catalyst Current          | Gap
--|-----------------|-----------------------------------------|---------------------------|----
1 | Sprint column   | Visible by default for Story rows       | Missing from columns registry | Sprint column absent from BacklogPage
2 | Sort trigger    | Server-side (REST /search?orderBy=...)  | Client-side useMemo (correct) | Match — different mechanism, both work
3 | Sort indicator  | Arrow icon on sorted column header      | Arrow icon present         | Match

ADS COMPLIANCE SCAN — BacklogPage.atlaskit.tsx
(running node design-governance/cli/index.js audit src/pages/backlog...)

# | File                     | Violation  | Current       | ADS fix              | Severity
--|--------------------------|------------|---------------|----------------------|--------
1 | BacklogPage.atlaskit.tsx:318 | OFF_GRID_SPACING | gap: 6px | gap: 8px        | P2

Total: 1 violation — P0: 0 P1: 0 P2: 1

AGENTS ACTIVATED — 3
   primary:  engineering-frontend-developer (add Sprint column to BacklogPage defaultColumns)
   augment:  design-ui-designer (Sprint column header styling per ADS)
   review:   engineering-code-reviewer (ADS gate + ask-before-add Sprint column)
   ads-fix:  engineering-frontend-developer (fix gap: 6px -> 8px in BacklogPage.atlaskit.tsx:318)
   <- /catalyst-agent v3 wrappers: jira-compare CLAUDE.md gates: ask-before-add, 2026-05-07 default-visible sync

-> handing off to jira-compare Lane A (DOM probe of Sprint column styling)...
```

---

## Worked example — banned task (halt before probe)

Input: `/agent re-add Story Points to the right rail for stories`

Output:

```
ROUTING — /catalyst-agent v3
   intent:     add Story Points field to right rail
   surface:    ui-feature
   signals:    "Story Points" "right rail"
   classifier: aborted at step 2

HALT — CLAUDE.md ban hit
   Story Points are BANNED platform-wide. Source: CatalystSidebarDetails.tsx:422
   (in-code directive added 2026-04-16). No probe runs. No agents activate.

   The ban supersedes any request to add this field.
```

---

## Hard rules (non-negotiable)

1. **CORE_DIRECTIVES.md is the preamble for every dispatch.** Every persona prompt prepends Directives 1-5 (ADS ring-fence, Green Signal gate, tool authorization, context guard, screenshot evidence).
2. **Green Signal required before execution.** Step 5.5 must produce a GREEN verdict. RED halts the pipeline. Only Vikram can override RED, explicitly in chat.
3. **CLAUDE.md is law.** Step 2 must execute before step 4. A banned task halts pre-probe.
4. **Code archaeology FIRST** (Step 4.0, before all MCP probes). Read existing working implementations before probing externally. Replicate the working pattern exactly. Only debug if replication fails. See CLAUDE.md 2026-05-16 lesson.
5. **No silent re-routing.** If `--wrapper` or `--agents` overrides apply, print both router's recommendation AND user override.
6. **Probe is read-only.** Probe agents NEVER write code, NEVER mutate Jira / Supabase / DOM.
7. **Max 5 implementer + 4 probe agents.** Slop kills signal.
8. **Activation block is mandatory.** Probe + gap TABLE + ADS scan TABLE + green-signal + agents — all must print before hand-off.
9. **Per-wrapper rules still apply.** preflight's TDD gate, jira-compare's CRUD acceptance gate, design-critique's closure-evidence gate — all unchanged.
10. **Port 8080 lock** (CLAUDE.md). Lane B probe MUST hit localhost:8080. Any 8081 → HALT.
11. **No `preview_*` tools.** Still banned (global, cannot be overridden even by Directive 3).
12. **Re-probe loop cap: 3.** Beyond that, escalate to user.
13. **Supabase MCP for Lane C.** Read-only: `list_tables`, `execute_sql` (SELECT only), `list_extensions`, `list_migrations` on project `lmqwtldpfacrrlvdnmld`. Never write via MCP during probe phase.
14. **Jira REST API endpoints** (Lane A): Prefer proven endpoints from `wh-jira-bulk-sync`. Approved: `/rest/api/3/search/jql` (paginated), `/rest/api/3/issue/{key}/changelog` (transitions), `/rest/api/3/issue/{key}` (details).
15. **gh CLI for git.** Push directly to `origin main` (Vikram authorized — see memory: feedback_git_push.md). Still use commit message format: `<type>(<scope>): <subject>` + `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` footer.
16. **Gap report is a TABLE, not prose.** Step 5 output must use the `GAP_REPORT.md` table format. Bullet-list-only gap reports from this skill are rejected.
17. **ADS scan is mandatory for every surface** (Step 4.5). Even if the task is not ADS-related. Value-added violations must be surfaced and offered to the user.
18. **Context Guard runs at every phase boundary** (Continuous Duty A). Never skip a checkpoint. 90% = save immediately, no exceptions.
19. **Screenshot after every fix** (Directive 5). A fix without a screenshot is not done. Call `mcp__computer-use__screenshot` or `mcp__Claude_in_Chrome__read_page`. If Computer Use access is not granted, call `mcp__computer-use__request_access` and wait.
20. **Computer Use MCP is authorized** (Directive 3). The CLAUDE.md "Chrome MCP only for Lane B" restriction is suspended under /catalyst-agent. Computer Use is authorized for screenshots and visual verification.
21. **TestSprite and preview_* remain banned** even under Directive 3's tool override. These are global bans.

---

## Flags reference

| Flag | Effect |
|---|---|
| `--dry-run` | Run probe + emit routing + activation block. Do not hand off. |
| `--skip-probe` | Skip steps 4-5. Use v1 keyword-only routing. Useful for trivial fixes. |
| `--probe-only` | Run probe + emit gap report. Skip routing/activation. |
| `--agents a,b,c` | Force implementer set. Probe still runs unless `--skip-probe` also set. |
| `--wrapper <name>` | Force wrapper. Probe + agent selection unchanged. |
| `--quick` | Trivial tier — suppress activation block. |
| `--no-claude-md` | Skip step 2 ban check. **Vikram-only override.** Refuse unless explicitly confirmed. |
| `--reprobe` | Force a fresh probe even if previous probe is cached in session. |
| `--no-ads-scan` | Skip Step 4.5 ADS scan. Use only when surface is known-clean. |

---

## How /catalyst-agent differs from /preflight

See `PREFLIGHT_VS_AGENT.md` for the full comparison. Quick summary:

| Dimension | `/preflight` | `/catalyst-agent` |
|---|---|---|
| First MCP call | none (memory + CLAUDE.md only) | Atlassian MCP + Chrome MCP + Computer Use probe |
| Output | 8-phase plan + 17-advisor council on high-stake | Routing decision + gap TABLE + ADS scan TABLE + implementer activations |
| Time budget | 10-30 min long-form | 2-3 min probe + hand-off |
| When to use | "Plan the v2 rebuild" | "Fix the dynamic table sort" |
| Composition | Standalone or as wrapper invoked BY /catalyst-agent | Calls /preflight as one possible wrapper |

**/catalyst-agent is upstream of /preflight.** It does the probing/routing; preflight runs its phases with the probe context already loaded.

---

## What /catalyst-agent does NOT do

- Does not execute SQL. Supabase MCP apply_migration or Lovable manual-paste only.
- Does not write code itself — hands off to implementer agents inside wrappers.
- Does not switch the active model.
- Does not auto-write to CLAUDE.md. Lessons appended only when Vikram explicitly confirms.
- Does not bypass any CLAUDE.md gate (Directive 3 overrides Chrome-only restriction, NOT CLAUDE.md content bans).
- Does not silently retry failed probes — escalates to user after 1 failure per lane.
- Does not skip the ADS surface scan — it is mandatory for every session.
- Does not declare any fix "done" without a screenshot.

---

## See also

- `GAP_REPORT.md` — mandatory gap report table format + ADS scan table + evidence block [NEW v3]
- `CONTEXT_GUARD.md` — context window depletion protocol + handover block format [NEW v3]
- `CORE_DIRECTIVES.md` — 5 directives (Directives 3-5 are new in v3)
- `ROUTER.md` — Probe Matrix + Implementer Matrix (includes row #25 for ADS compliance)
- `AGENT_ROSTER.md` — Phase 0-5 agent dispatch (companion to this skill)
- `INDEX.md` — all 184 agents with Catalyst-relevance flags
- `PREFLIGHT_VS_AGENT.md` — full comparison + composition patterns
- `../AGENT_PIPELINE.md` — activation line format (shared protocol)
- `../preflight/SKILL.md` — Phase 0-7 definition
- `../preflight/RUBRIC.md` — trivial / standard / high-stake classification
- `~/.claude/skills/jira-compare/SKILL.md` — 3-lane parity audit (often a wrapper)
- `~/.claude/skills/design-intelligence/SKILL.md` — 1000-IQ design layer
- `~/.claude/skills/design-critique/SKILL.md` — heuristic scoring
- `~/.claude/skills/obsidian/SKILL.md` — handover save/retrieve (invoked by Context Guard)
- `design-governance/cli/index.js` — ADS audit CLI tool (used in Step 4.5)
- `CLAUDE.md` — gates, bans, lessons (source of truth)

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules and Phase 2.5 council gate logic.
