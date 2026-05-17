---
name: catalyst-agent
version: 2.0.0
description: >-
  Probe-first router for Catalyst engineering tasks. Takes a free-form note,
  reads CLAUDE.md, then INVOKES read-only probe agents through Atlassian MCP
  + Chrome MCP + Supabase to see what's actually on Jira vs Catalyst BEFORE
  selecting implementer agents. Synthesizes the real gap, picks the right
  wrapper skill(s) from {preflight, jira-compare, design-intelligence,
  design-critique}, and announces every activation with probe evidence.
  Triggers on /catalyst-agent, /agent, "activate agents", "run agents for",
  "smart-route this", "1000 IQ this".
author: Vikram × Claude, 2026-05-11
metadata:
  category: orchestration
  tags: [routing, agents, probe-first, mcp, preflight, jira-compare, design-intelligence, design-critique, catalyst]
  maturity: stable
  agent_library: ./.claude/agents/ (184 personas, shared across team)
  wrapper_skills: [preflight, jira-compare, design-intelligence, design-critique]
  mcp_servers: [atlassian, chrome, supabase]
  supabase_project: lmqwtldpfacrrlvdnmld
  supabase_url: https://lmqwtldpfacrrlvdnmld.supabase.co
  vcs: gh (GitHub CLI)
  git_default_branch: main
  git_confirmation_gate: "before commit and push"
  iq_level: 1000
  design_system:
    source: https://atlassian.design/
    scope: exclusive                          # components + themes + typography + css — no exceptions
    components: "@atlaskit/* only"
    tokens: "@atlaskit/tokens — var(--ds-*) only"
    typography: "@atlaskit/heading + ADS tokens (live Jira anchors override per CLAUDE.md)"
    icons: "@atlaskit/icon + @/lib/jira-issue-type-icons only"
    paired_with: atlassian_mcp_probe          # design decisions must be grounded in MCP probe evidence
  pre_execution_gate:
    name: green_signal
    intensity: intensive                      # all 7 dimensions covered, both sides probed
    dimensions: [visual, structural, behavioral, schema, architecture, accessibility, claude_md]
    blocks_execution_until: 🟢
    override: vikram_only_explicit_chat_confirmation
---

# /catalyst-agent v2 — probe-first agent router

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

## The 9-step pipeline (run sequentially every time)

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

### Step 4 — MCP PROBE (the heart of v2)

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

**Why:** The codebase IS the source of truth for "what works." Existing implementations prevent wasted cycles on wrong alternatives. See CLAUDE.md 2026-05-16 lesson.

**Cost:** ~30 seconds. **Benefit:** Often eliminates the need for external debugging.

---

Invoke read-only probe agents in parallel via the `Agent` tool. Each probe agent has a narrow remit and uses ONLY the MCP servers listed.

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

This gives real isolation (separate context window, separate tool budget, parallel execution) while reusing the persona's instructions from disk.

**Mandatory: every dispatched prompt prepends the contents of `CORE_DIRECTIVES.md`** before the persona summary. The directives file enforces the ADS ring-fence (atlassian.design only) and the Green Signal gate. Cost: one extra Read at dispatch time; benefit: every agent sees the same non-negotiable rules.

The canonical full template (CORE_DIRECTIVES + persona + task) looks like:

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

Alternative — **persona overlay** (no dispatch): main Claude reads the persona file and role-plays it inline, printing the activation block manually. Cheaper but no context isolation. The CORE_DIRECTIVES still apply.

#### The 6 probe lanes (with code archaeology first)

**PRE-FLIGHT CODE ARCHAEOLOGY** (mandatory first check):
- Before probing externally, scan the codebase for existing solutions: `wh-jira-bulk-sync`, `jira-sync-projects`, related edge functions, prior implementations
- Read the working code FIRST (exact endpoint, headers, body structure, error handling)
- Only probe/debug if the replicated pattern still fails
- Why: See CLAUDE.md 2026-05-16 lesson — existing implementations are the source of truth

| Probe lane | Persona (loaded into general-purpose) | MCP tools | What it returns |
|---|---|---|---|
| **Lane A — Jira schema + REST API** | `project-management-jira-workflow-steward` | Atlassian MCP: `getJiraIssueTypeMetaWithFields`, `getJiraProjectIssueTypesMetadata`, `searchJiraIssuesUsingJql`, `getTransitionsForJiraIssue` + Jira REST API via edge functions: `/rest/api/3/search/jql` (paginated search with full issue payloads), `/rest/api/3/issue/{key}/changelog` (status transitions), `/rest/api/3/issue/{key}` (full details) | Screen scheme fields, workflow states, issue transitions, changelog history, full issue metadata, BAU-specific config |
| **Lane B — Catalyst DOM** | `engineering-frontend-developer` | Chrome MCP: `javascript_tool`, `read_page`, `find` on `localhost:8080` | Live `getComputedStyle`, DOM structure, click handler wiring, current rendered state, network calls |
| **Lane C — Supabase schema (LIVE MCP)** | `engineering-database-optimizer` | Supabase MCP (project: `lmqwtldpfacrrlvdnmld`): `list_tables`, `execute_sql`, `list_extensions`, `list_migrations` — live read-only schema probes | `ph_*` table columns, indexes, RLS policies, foreign keys, extensions, migration history, current schema state |
| **Lane D — Codebase static** | `engineering-codebase-onboarding-engineer` | Read, Grep + Rovo Search for patterns | File paths involved, call chain, prior CLAUDE.md lessons that touch these files, similar implementations in codebase |
| **Lane E — Rovo AI requirement analysis** | `project-management-jira-workflow-steward` (switched to Rovo mode) | Rovo Search + Rovo Recommendations: analyze issue descriptions, acceptance criteria, links to similar issues, dependency mapping | Requirement clarity, scope boundaries, related work, potential conflicts |

Probe lanes run **in parallel** when independent. Lane A and B always run for UI surfaces. Lane C only if `backend-migration` or schema signal. Lane D always runs. Lane E runs when task involves Jira requirement extraction or cross-linking.

Code archaeology step runs BEFORE all lanes.

Probe budget: **3-5 minutes wall-clock max per lane**. If exceeded → mark `partial` and continue.

### Step 5 — Synthesize gap report

Combine the 4 lane outputs into a single gap report:

```
GAP REPORT
   Jira reality:      <bullet list from Lane A>
   Catalyst reality:  <bullet list from Lane B>
   Backend reality:   <bullet list from Lane C, or "n/a">
   Code reality:      <bullet list from Lane D>
   Actual gap:        <synthesised diff — be specific>
   Missing on Catalyst: <list>
   Wrong on Catalyst:   <list with file:line refs>
   Out of Catalyst scope: <list if Jira has stuff Catalyst should NOT mirror>
```

The synthesis is what makes the agent "1000 IQ" — it sees both sides and the codebase before opening its mouth.

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
🟢 GREEN SIGNAL — probe complete · cleared for execution
   Coverage: visual ✓ · structural ✓ · behavioral ✓ · schema ✓ ·
             architecture ✓ · a11y ✓ · CLAUDE.md ✓
   Findings: <N> · Halts: 0 · Open questions: <N, list>
   Probe agents: <list>
   Probe duration: <wall-clock>
   Verdict: SAFE TO EXECUTE per CORE_DIRECTIVES.md Directive 2
```

```
🔴 RED SIGNAL — probe incomplete · execution BLOCKED
   Missing dimensions: <list>
   Halts: <list — CLAUDE.md anchors hit>
   Required follow-up: <list>
   Verdict: DO NOT EXECUTE — re-probe required
```

If RED: loop back to step 4 (re-probe) or escalate to Vikram. **Cap: 3 re-probes per task.** Beyond that → halt and report.

Only Vikram can manually override RED with explicit chat confirmation ("override red, proceed"). The override is logged in the activation block and any post-execution defect is auto-traced to the override.

### Step 6 — Pick wrapper(s) and implementer agents from `ROUTER.md` (with Phase 2.5 council gate)

Two matrices in `ROUTER.md`:

1. **Probe Matrix** — which probe agents to run for which signals (already used in step 4)
2. **Implementer Matrix** — given the GAP REPORT, pick wrappers + implementer agents
3. **Phase 2.5 Council Gate** — if the gap is ambiguous OR task is high-stake, convene a 5-advisor routing council to deliberate wrapper composition before hand-off

**Phase 2.5 council activates when:**
- Gap report has multiple valid wrapper paths (ambiguous routing)
- Task classified as high-stake (per RUBRIC.md)
- NOT when: trivial tier, single unambiguous wrapper match, or `--quick` mode

The council (engineering-software-architect, senior-developer, jira-workflow-steward, code-reviewer, agents-orchestrator) deliberates for 5-10 min and outputs a binding composition order + rationale. This is the 1000-IQ principle operationalized — probe-first evidence fed into a deliberative council before implementer hand-off.

Implementer agents are categorically different from probe agents:

| Role | Probe agent | Implementer agent |
|---|---|---|
| Frontend | (only reads DOM) | `engineering-frontend-developer` (writes code) |
| Schema | (only reads RLS) | `engineering-database-optimizer` (writes migration SQL for Lovable manual paste) |
| Jira | (only reads metadata) | `project-management-jira-workflow-steward` (advises on screen scheme additions, does not write to Jira) |

Same name can serve both roles in different phases.

Hard caps:
- Max **5 implementer agents** per task
- Max **4 probe agents** per task
- Council activations (preflight Phase 2) follow `AGENT_PIPELINE.md` rules

### Step 7 — Announce (BLOCKING — must print before any execution)

Output format:

```
🧭 ROUTING — /catalyst-agent
   intent:     <one-line summary>
   surface:    <surface classifier + relevant CLAUDE.md anchor>
   signals:    <quoted keywords>
   classifier: <trivial | standard | high-stake>
   bans hit:   <list or "none">

🔍 MCP PROBE — what's actually on Jira vs Catalyst
   Lane A (Jira via Atlassian MCP):
     <bullets from project-management-jira-workflow-steward>
   Lane B (Catalyst via Chrome MCP):
     <bullets from engineering-frontend-developer>
   Lane C (Supabase):
     <bullets or "n/a — backend not touched">
   Lane D (codebase):
     <bullets from engineering-codebase-onboarding-engineer>

📊 GAP REPORT
   Actual gap:        <what's really different>
   Missing on Catalyst: <list>
   Wrong on Catalyst:   <list with file:line refs>

🤖 AGENTS ACTIVATED FOR THE FIX — N
   primary:   <agent>  (<role for THIS task>)
   augment:   <agent>  (<role>)
   verify:    <agent>  (<role>)
   review:    <agent>  (<role>)
   ← /catalyst-agent · wrapper(s): <chosen wrappers> · CLAUDE.md gates: <list>

→ handing off to <first wrapper> · <first phase>…
```

### Step 8 — Hand off to wrapper(s)

Invoke the chosen wrapper skills in declared composition order. Pass the full PROBE + GAP REPORT into the wrapper as a pre-loaded context envelope so the wrapper can skip redundant evidence acquisition.

### Step 9 — Loop back if needed

If the wrapper's CRUD acceptance gate fails or new gaps emerge, the router can re-fire the probe (Step 4) to refresh the state. Loop cap: **3 re-probes** (lower than jira-compare's 5 because /catalyst-agent shouldn't be doing deep parity work — that's the wrapper's job).

---

## Worked example — the dynamic-table pain point (with probe + code archaeology)

Input:

```
/agent the BacklogPage dynamic table sort is broken — clicking column
header doesn't reorder rows
```

Output:

```
🧭 ROUTING — /catalyst-agent
   intent:     fix column-header sort in BacklogPage list view
   surface:    ui-bug-fix · BacklogPage / JiraTable
   signals:    "dynamic table" · "sort" · "BacklogPage" · "column header"
   classifier: standard (per RUBRIC.md — single surface, no schema change)
   bans hit:   none

🔎 CODE ARCHAEOLOGY — existing implementations first
   search:    grep -r "JiraTable" src/ + read JiraTable.tsx prior art
   found:     JiraTable.tsx already has useMemo + sortConfig state (lines 140-160)
   pattern:   rows are re-sorted inside useMemo, dependency array is [rows, sortConfig]
   status:    code is CORRECT in prior commit — the broken-sort report suggests a
              regression or the user hit a stale bundle. Probe will identify which.

🔍 MCP PROBE — what's actually on Jira vs Catalyst
   Lane A (Jira via Atlassian MCP + REST API — project-management-jira-workflow-steward):
     • BAU project list view sortable columns: Key, Status, Priority, Updated, Sprint, Assignee
     • Sort mechanism: REST /search?orderBy=<field>+<asc|desc> (server-side)
     • "Sprint" column belongs to screen scheme 10006 (Story) — visible by default in BAU
     • No client-side sort — Jira fetches a re-ordered page per click
   Lane B (Catalyst via Chrome MCP — engineering-frontend-developer):
     • localhost:8080/backlog visible columns: Key, Summary, Status, Comments, Parent
     • DOM: <table data-testid="jira-table"> rendered by JiraTable.tsx
     • Sort handler: column header has onClick={handleSort(colId)}
     • Probe: click fires the handler, sortConfig state updates, rows array IS re-sorted
       before render — useMemo dependency is CORRECT (no regression)
     • "Sprint" column missing from defaultColumns registry entirely
     • Screenshot shows rows are correctly reordered on the 4th click (Chrome cache issue
       or React dev-mode StrictMode double-render was the actual issue)
   Lane C (Supabase): n/a — sort is client-side, no backend involved
   Lane D (codebase — engineering-codebase-onboarding-engineer):
     • BacklogPage.atlaskit.tsx:312 — defines columns
     • JiraTable.tsx:140-160 — useMemo([rows, sortConfig]) is CORRECT
     • CLAUDE.md 2026-05-08 anchor: StatusPill probe revealed similar useMemo pitfall
       but this instance is NOT the pitfall — it was a user report artifact
   Lane E (Rovo AI requirement analysis):
     • "Broken sort" issue: request unclear on expected sort direction or column
     • Rovo search found BAU-4821 "implement multi-column sort" — related scope
     • Recommendation: Sort works as-is; missing Sprint column is the real gap

📊 GAP REPORT
   Code archaeology result:
     • JiraTable sort implementation is CORRECT (no regression)
     • User's "broken sort" was likely a stale bundle or dev-mode render artifact
     • Actual gap: "Sprint" column missing from Catalyst columns registry
   Missing on Catalyst: Sprint column option
   Wrong on Catalyst:   Nothing (sort logic is correct)
   Out of scope:        Multi-column sort (BAU-4821 related, defer to future)

🤖 AGENTS ACTIVATED FOR THE FIX — 3
   primary:   engineering-frontend-developer
              (add Sprint column option to BacklogPage defaultColumns + JiraTable)
   augment:   design-ui-designer
              (Sprint column header styling per ADS — match other column headers)
   review:    engineering-code-reviewer
              (gate before commit — ADS + ask-before-add Sprint column)
   ← /catalyst-agent · wrapper(s): jira-compare (CRUD gate on Sprint column)
   ← CLAUDE.md gates: ask-before-add (Sprint column on Story only), 2026-05-07 default-visible sync rule

→ handing off to jira-compare · Lane A (DOM probe of Sprint column styling)…
```

**Key lesson from this example:**
Code archaeology found that the reported bug was not actually a bug — the implementation was correct. This prevented wasted cycles on debugging a non-existent defect and redirected focus to the real gap (Sprint column). The 30-second code archaeology step saved ~30 minutes of probe work.

The implementer agents are now picked from **evidence** (useMemo bug, missing Sprint column), not from **keywords** ("dynamic table" → frontend developer).

---

## Worked example — banned task (halt before probe)

Input: `/agent re-add Story Points to the right rail for stories`

Output:

```
🧭 ROUTING — /catalyst-agent
   intent:     add Story Points field to right rail
   surface:    ui-feature
   signals:    "Story Points" · "right rail"
   classifier: aborted at step 2

🛑 HALT — CLAUDE.md ban hit
   Story Points are BANNED platform-wide. Source: CatalystSidebarDetails.tsx:422
   (in-code directive added 2026-04-16). No probe runs. No agents activate.

   The ban supersedes any request to add this field.
```

---

## Hard rules (non-negotiable)

1. **CORE_DIRECTIVES.md is the preamble for every dispatch.** Every persona prompt prepends Directive 1 (ADS ring-fence — atlassian.design only) and Directive 2 (Green Signal gate — intensive probe before execution).
2. **Green Signal required before execution.** Step 5.5 must produce a 🟢 verdict. RED halts the pipeline. Only Vikram can override RED, explicitly in chat.
3. **CLAUDE.md is law.** Step 2 must execute before step 4. A banned task halts pre-probe.
4. **Code archaeology FIRST** (Step 4.0, before all MCP probes). Read existing working implementations before probing externally. Replicate the working pattern exactly. Only debug if replication fails. See CLAUDE.md 2026-05-16 lesson. Cost: ~30 seconds. Benefit: Often eliminates wasted probe cycles on wrong alternatives.
5. **No silent re-routing.** If `--wrapper` or `--agents` overrides apply, print both router's recommendation AND user override.
6. **Probe is read-only.** Probe agents NEVER write code, NEVER mutate Jira / Supabase / DOM. If a probe tool returns a write capability, the probe agent refuses.
7. **Max 5 implementer + 4 probe agents.** Slop kills signal.
8. **Activation block is mandatory.** Probe + gap + green-signal + agents — all four must print before hand-off.
9. **Per-wrapper rules still apply.** preflight's TDD gate, jira-compare's CRUD acceptance gate, design-critique's closure-evidence gate — all unchanged.
10. **Port 8080 lock** (CLAUDE.md). Lane B probe MUST hit localhost:8080. Any 8081 → HALT.
11. **No `preview_*` tools.** Chrome MCP only for Lane B.
12. **Re-probe loop cap: 3.** Beyond that, escalate to user.
13. **Supabase MCP for Lane C.** Read-only schema introspection: `list_tables`, `execute_sql` (SELECT only), `list_extensions`, `list_migrations` on project `lmqwtldpfacrrlvdnmld`. Never write via MCP during probe phase.
14. **Jira REST API endpoints** (Lane A): Prefer existing proven endpoints in the codebase (e.g., `/rest/api/3/search/jql` from `wh-jira-bulk-sync`). Never try deprecated endpoints. Current approved endpoints: `/rest/api/3/search/jql` (paginated search), `/rest/api/3/issue/{key}/changelog` (transitions), `/rest/api/3/issue/{key}` (details). Always use the working credential pattern from `ph_jira_connection` table.
15. **gh CLI for git operations with user confirmation gates.** Before any `git commit` or `git push origin main`, ask user explicitly: "Ready to commit these changes and push to main? [yes/no]". User must confirm in chat before proceeding. Use `gh` CLI (not direct git) for all PR/issue operations. Never auto-commit; never auto-push.
16. **Commit message format:** `<type>(<scope>): <subject>` + `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>` footer. Example: `fix(backlog): sort config race in JiraTable` + footer.

---

## Flags reference

| Flag | Effect |
|---|---|
| `--dry-run` | Run probe + emit routing + activation block. Do not hand off. |
| `--skip-probe` | Skip steps 4-5. Use v1 keyword-only routing. Useful for trivial fixes. |
| `--probe-only` | Run probe + emit gap report. Skip routing/activation. Useful for "what's the state?" queries. |
| `--agents a,b,c` | Force implementer set. Probe still runs unless `--skip-probe` also set. |
| `--wrapper <name>` | Force wrapper. Probe + agent selection unchanged. |
| `--quick` | Trivial tier — suppress activation block. |
| `--no-claude-md` | Skip step 2 ban check. **Vikram-only override.** Refuse unless explicitly confirmed. |
| `--reprobe` | Force a fresh probe even if previous probe is cached in session. |

---

## How /catalyst-agent differs from /preflight

See `PREFLIGHT_VS_AGENT.md` for the full comparison. Quick summary:

| Dimension | `/preflight` | `/catalyst-agent` |
|---|---|---|
| First MCP call | none (memory + CLAUDE.md only) | Atlassian MCP + Chrome MCP probe |
| Output | 8-phase plan + 17-advisor council on high-stake | Routing decision + probe evidence + implementer activations |
| Time budget | 10-30 min long-form | 2-3 min probe + hand-off |
| When to use | "Plan the v2 rebuild" | "Fix the dynamic table sort" |
| Composition | Standalone or as wrapper invoked BY /catalyst-agent | Calls /preflight as one possible wrapper |

**/catalyst-agent is upstream of /preflight.** It does the probing/routing; preflight runs its phases with the probe context already loaded.

---

## What /catalyst-agent does NOT do

- Does not execute SQL. Lovable manual-paste only.
- Does not write code itself — hands off to implementer agents inside wrappers.
- Does not switch the active model.
- Does not auto-write to CLAUDE.md or Obsidian.
- Does not bypass any CLAUDE.md gate.
- Does not call MCP tools outside of probe agents — implementers do their own.
- Does not silently retry failed probes — escalates to user after 1 failure per lane.

---

## See also

- `ROUTER.md` — Probe Matrix + Implementer Matrix (the data)
- `AGENT_ROSTER.md` — Phase 0–5 agent dispatch (companion to this skill)
- `INDEX.md` — all 184 agents with Catalyst-relevance flags
- `PREFLIGHT_VS_AGENT.md` — full comparison + composition patterns
- `../AGENT_PIPELINE.md` — activation line format (shared protocol)
- `../preflight/SKILL.md` — Phase 0–7 definition
- `../preflight/RUBRIC.md` — trivial / standard / high-stake classification
- `~/.claude/skills/jira-compare/SKILL.md` — 3-lane parity audit (often a wrapper)
- `~/.claude/skills/design-intelligence/SKILL.md` — 1000-IQ design layer
- `~/.claude/skills/design-critique/SKILL.md` — heuristic scoring
- `CLAUDE.md` — gates, bans, lessons (source of truth)

---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules and Phase 2.5 council gate logic.
