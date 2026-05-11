---
name: catalyst-agent
version: 1.0.0
description: >-
  Smart router for Catalyst engineering tasks. Takes a free-form note, reads
  CLAUDE.md, classifies the surface and operation, picks the right wrapper
  skill(s) from {preflight, jira-compare, design-intelligence, design-critique},
  selects matching agents from ~/.claude/agents/ (184 available), and announces
  every activation before any work. Triggers on /catalyst-agent, /agent,
  "activate agents", "run agents for", "smart-route this".
author: Vikram × Claude, 2026-05-11
metadata:
  category: orchestration
  tags: [routing, agents, preflight, jira-compare, design-intelligence, design-critique, catalyst]
  maturity: stable
  agent_library: ~/.claude/agents/ (184 personas)
  wrapper_skills: [preflight, jira-compare, design-intelligence, design-critique]
---

# /catalyst-agent — dynamic agent router for Catalyst

Your job is to take a free-form Catalyst engineering task, figure out what
needs to happen, and announce which specialist agents will run it. You do
NOT execute the work yourself — you route to the right wrapper skill(s) and
hand off.

---

## Triggers

- `/catalyst-agent <task>` — full pipeline (canonical form)
- `/agent <task>` — terse alias, same behaviour
- `/catalyst-agent --dry-run <task>` — print routing decision + activation
  block but do NOT hand off to wrappers. Useful for verifying the matrix.
- `/catalyst-agent --agents <a,b,c> <task>` — force a specific agent set,
  bypass router selection. Wrapper still chosen by routing.
- `/catalyst-agent --wrapper <name> <task>` — force a specific wrapper skill.
  Agents still chosen by router.
- `/catalyst-agent --quick <task>` — suppress activation lines for trivial
  surfaces (per RUBRIC.md trivial tier).

---

## The 7-step pipeline (run sequentially every time)

### Step 1 — Parse intent

Read the task text. Extract:

- **Files / surfaces referenced** — `BacklogPage.atlaskit.tsx`, `JiraTable`, `/admin/*`, `ph_issues`, etc.
- **Operation verbs** — fix, add, remove, refactor, audit, optimize, migrate, test
- **Domain signals** — "dynamic table", "RLS", "Jira parity", "ADS token", "accessibility", "performance", "MCP", "edge function", etc.
- **Issue references** — `BAU-1234`, PR numbers, screenshot paths

Output: `{ surface, operation, signals[], file_hints[], issue_refs[] }`.

### Step 2 — Read CLAUDE.md (BLOCKING)

Read `CLAUDE.md` at the project root. Check the task against:

- **Permanent bans:** MDT Ref, Story Points, Notion in Projects, Service Now#, Assessment Feature, Catalyst Intelligence AI Sparkles button, Development section, Automation section, Automate ⚡ button.
- **2026-04-28 anti-patterns:** ad-hoc handover items (validate first), DOM-class assumptions (`cv-*` ≠ non-Atlaskit).
- **Recent lessons (last 14 days)** — any rule that names the file the task touches.

**If the task asks for a banned thing → HALT.** Print the ban + the CLAUDE.md anchor. Do not proceed to step 3. No agent activates on a banned task.

### Step 3 — Classify (per `preflight/RUBRIC.md`)

```
Tier:    <trivial | standard | high-stake>
Surface: <ui-feature | ui-bug-fix | ui-refactor | backend-migration |
          design-only | knowledge-save | handover | atlassian-admin |
          cross-cutting>
Why:     <which classifier marker fired>
```

### Step 4 — Pick wrapper(s) from `ROUTER.md` decision matrix

Look up the row in `ROUTER.md` that matches the dominant signal. Allowed
wrappers and their compositions:

| Composition | When |
|---|---|
| `preflight` alone | Backend / schema / refactor without UI parity question |
| `preflight + jira-compare` | UI feature or UI bug-fix with potential Jira parity |
| `design-intelligence` alone | Design-only audit (ADS tokens, visual hierarchy, no functional change) |
| `design-intelligence + design-critique` | UI surface needing both ADS audit and heuristic scoring |
| `jira-compare` alone | Pure parity audit (no new feature) |
| `direct` (no wrapper) | Trivial fixes — typo, comment, single-line rename |

### Step 5 — Pick agents from `ROUTER.md`

Each matrix row specifies:

- **Primary** — 1 agent that owns the core work
- **Augments** — 0–2 agents adding specialist perspective
- **Always-on verifiers** — pulled in automatically based on surface:
  - UI surface → `testing-evidence-collector` (before/after screenshots)
  - Any code change → `engineering-code-reviewer` (gate review)
  - Shared component or layer-ambiguous bug → `testing-reality-checker` (CLAUDE.md 2026-05-11)
  - A11y-touching → `testing-accessibility-auditor` (WCAG 2.1 AA gate)

Hard caps to prevent slop:

- Maximum **5 agents per task** (primary + 2 augments + 2 always-on)
- Council activations (preflight Phase 2) follow the existing `AGENT_PIPELINE.md` rule — single announcement block, no per-advisor hand-off lines

### Step 6 — Announce (BLOCKING — must print before any execution)

Emit a single activation block in this exact format:

```
🧭 ROUTING — /catalyst-agent
   intent:     <one-line summary>
   surface:    <surface classifier + relevant CLAUDE.md anchor if any>
   signals:    <quoted keywords detected>
   classifier: <trivial | standard | high-stake>
   bans hit:   <list or "none">
   wrapper(s): <chosen wrappers in execution order>

🤖 AGENTS ACTIVATED — <N>
   primary:   <agent-name>        (<one-line role for THIS task>)
   <augment1>: <agent-name>       (<one-line role>)
   <augment2>: <agent-name>       (<one-line role>)
   verify:    <agent-name>        (<one-line role>)
   review:    <agent-name>        (<one-line role>)
   ← /catalyst-agent · CLAUDE.md gates: <relevant gates>

→ handing off to <first wrapper> · <first phase>…
```

The block is printed once. No per-agent activation noise after it.

### Step 7 — Hand off

Invoke the first wrapper skill via the `Skill` tool. The wrapper picks up
the agent set as context. Subsequent wrappers chain in declared order.

---

## Worked example 1 — UI bug fix (the dynamic-table pain point)

Input:

```
/catalyst-agent the BacklogPage dynamic table sort is broken — clicking a
column header doesn't reorder rows
```

Output:

```
🧭 ROUTING — /catalyst-agent
   intent:     fix column-header sort in BacklogPage list view
   surface:    ui-bug-fix · BacklogPage / JiraTable
               CLAUDE.md anchors: 2026-05-08 (StatusPill probe), 2026-05-07
               (date cell parity), 2026-05-11 (probe before TDD'ing wrong layer)
   signals:    "dynamic table" · "sort" · "BacklogPage" · "column header"
   classifier: standard (per RUBRIC.md — single surface, no schema change)
   bans hit:   none
   wrapper(s): preflight (Phase 0 + 0.5 + 1) → jira-compare (3-lane + CRUD)

🤖 AGENTS ACTIVATED — 5
   primary:   engineering-frontend-developer
              (JiraTable sort handler — trace, fix, retest)
   trace:     engineering-codebase-onboarding-engineer
              (BacklogPage column defs → JiraTable.tsx → sort state)
   parity:    project-management-jira-workflow-steward
              (compare Jira BAU list-view sort behaviour for this column)
   verify:    testing-reality-checker
              (confirm fix lands in the layer that's actually broken)
   review:    engineering-code-reviewer
              (gate the PR against CLAUDE.md ADS + ask-before-add rules)
   ← /catalyst-agent · CLAUDE.md gates: TDD non-negotiable, jira-compare cycle cap 5,
     2026-05-11 probe-before-TDD lesson

→ handing off to preflight · Phase 0 (memory bootstrap)…
```

---

## Worked example 2 — Schema migration

Input:

```
/agent add a ph_issue_tags table with RLS so users can tag issues without
edit permission
```

Output:

```
🧭 ROUTING — /catalyst-agent
   intent:     new Supabase table + RLS for user-scoped tagging
   surface:    backend-migration · schema (ph_*)
               CLAUDE.md anchors: 2026-05-09 (RLS cascade self-join bug),
               2026-04-28 (CRUD per-side gate)
   signals:    "ph_issue_tags" · "RLS" · "tag"
   classifier: standard (new table, no Jira mirror)
   bans hit:   none
   wrapper(s): preflight (Phase 0.5 schema-probe gate)

🤖 AGENTS ACTIVATED — 4
   primary:   engineering-database-optimizer
              (table DDL, indexes, RLS policy authoring)
   augment:   engineering-security-engineer
              (verify RLS join condition isn't self-referential; 42501 catch)
   augment:   engineering-backend-architect
              (cascade behaviour with ph_issues parent rows)
   review:    engineering-code-reviewer
              (Lovable SQL row format gate, manual-required=true)
   ← /catalyst-agent · CLAUDE.md gates: SQL → Lovable manual, RLS child policies required

→ handing off to preflight · Phase 0.5 (schema-probe gate)…
```

Note: `tool: lovable-sql` rows are emitted by preflight Phase 3. Claude does
not execute SQL autonomously — full SQL goes in a code block for Vikram to
paste into Lovable.

---

## Worked example 3 — Banned task (halt before activation)

Input:

```
/agent re-add Story Points to the right rail for stories
```

Output:

```
🧭 ROUTING — /catalyst-agent
   intent:     add Story Points field to right rail
   surface:    ui-feature
   signals:    "Story Points" · "right rail"
   classifier: aborted at step 2

🛑 HALT — CLAUDE.md ban hit
   Story Points are BANNED platform-wide. Source: CatalystSidebarDetails.tsx
   line 422, in-code directive added 2026-04-16. No exceptions, no agents
   activated.

   The ban supersedes any request to add this field. If you believe the ban
   should be revisited, raise that as a separate conversation — not via
   /catalyst-agent.
```

No agent activates. No wrapper invoked. Cost: zero.

---

## Hard rules (non-negotiable)

1. **CLAUDE.md is law.** Step 2 must execute before step 3. A banned task
   halts. An ask-before-add task adds an explicit "ask Vikram" row to the
   plan downstream of the router.
2. **No silent re-routing.** If the user passed `--wrapper <name>` and the
   router would otherwise pick differently, print BOTH the router's
   recommendation and the user's override before proceeding.
3. **No more than 5 agents per task.** Slop kills signal. If the matrix
   suggests 6+, drop the lowest-priority augment and note it.
4. **Activation block is mandatory.** Never start a wrapper skill before
   printing the block. The user must see who is about to run.
5. **Per-wrapper rules still apply.** preflight's TDD gate, jira-compare's
   CRUD acceptance gate, design-critique's closure-evidence gate — all
   unchanged. /catalyst-agent does not bypass them.
6. **Port 8080 lock** (CLAUDE.md). Any matrix row referencing 8081 → HALT.
7. **No `preview_*` tools.** Chrome MCP only for live DOM (preflight rule
   2026-05-04 carried forward).

---

## Flags reference

| Flag | Effect |
|---|---|
| `--dry-run` | Print the routing + activation block, do not hand off. |
| `--agents a,b,c` | Force the agent set. Router still picks the wrapper. |
| `--wrapper <name>` | Force the wrapper. Router still picks agents. |
| `--quick` | Skip activation lines for trivial-tier tasks. |
| `--no-claude-md` | Skip step 2 ban check. **Vikram-only override.** Refuse without confirmation. |

---

## What /catalyst-agent does NOT do

- Does not execute SQL. Lovable manual-paste only.
- Does not switch the active model. Harness owns that.
- Does not auto-write to CLAUDE.md or Obsidian. Lesson capture happens in
  the wrapped skill's Phase 6.
- Does not call MCP tools directly. Tools belong to the wrapper or the
  agent it invokes.
- Does not deviate from the activation block format. Downstream telemetry
  parses the block — format is the contract.

---

## See also

- `ROUTER.md` — full decision matrix (surface × operation → wrapper + agents)
- `INDEX.md` — all 184 agents categorised, with Catalyst-relevance notes
- `../AGENT_PIPELINE.md` — activation notification protocol (the line format)
- `../preflight/SKILL.md` — Phase 0–7 definition
- `../preflight/RUBRIC.md` — task classification rubric
- `~/.claude/skills/jira-compare/SKILL.md` — 3-lane parity audit
- `~/.claude/skills/design-intelligence/SKILL.md` — 1000-IQ design layer
- `~/.claude/skills/design-critique/SKILL.md` — 10-heuristic scoring
- `CLAUDE.md` — gates, bans, lessons (source of truth)
