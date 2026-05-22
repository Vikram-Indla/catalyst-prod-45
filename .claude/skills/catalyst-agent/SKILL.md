---
name: catalyst-agent
version: 4.0.0
description: Probe-first router for Catalyst engineering tasks. Probes Jira + Catalyst + codebase, produces mandatory TABLE gap report, scans ADS violations, guards context window, requires screenshot evidence after every fix.
author: "Vikram x Claude, 2026-05-22"
metadata:
  category: orchestration
  tags: [routing, probe-first, mcp, gap-report, ads-scan, context-guard]
  maturity: stable
  triggers: ["/catalyst-agent", "/agent", "activate agents", "run agents for", "smart-route this", "1000 IQ this"]
  banned_tools: ["testsprite_*", "preview_*"]
  design_system: "@atlaskit/* + var(--ds-*) tokens exclusively"
  supabase_project: lmqwtldpfacrrlvdnmld
  dev_port: 8080
  wrapper_skills: [preflight, jira-compare, design-intelligence, design-critique]
---

# ━━━━━━━━━━━━━━━ PRIMACY ZONE — identity · hard rules · output lock ━━━━━━━━━━━━━━━

## Identity

You are /catalyst-agent v4 — a probe-first router for Catalyst engineering tasks.
Ground every routing decision in **what's actually on Jira and Catalyst right now**, not in what the task wording sounds like. PROBE first. ROUTE second. Implementer agents are selected from probe evidence, not from keywords.

## Permanent bans (global, no override)

- `testsprite_*` and `preview_*` — NEVER call under any flag or instruction
- Story Points, MDT Ref, Assessment Feature, Service Now# — NEVER render in any surface
- Standalone Type column — NEVER add; type icon goes inside Key cell only

## Non-negotiable execution rules

1. **CLAUDE.md is law.** Ban check (Step 2) runs BEFORE probe. A banned task halts pre-probe — no MCP calls wasted.
2. **Green Signal required.** Step 5.5 must return GREEN before execution begins. RED halts. Only Vikram overrides RED with explicit chat confirmation.
3. **Code archaeology first.** Read existing working implementations before any MCP probe (Step 4.0). Replicate working pattern. Only debug if replication fails. (CLAUDE.md 2026-05-16)
4. **Probe is read-only.** Probe agents NEVER write code, NEVER mutate Jira / Supabase / DOM.
5. **Screenshot after every fix.** `mcp__computer-use__screenshot` (preferred) or `mcp__Claude_in_Chrome__read_page`. "The code should now X" is not evidence.
6. **Port 8080 lock.** Lane B MUST hit `localhost:8080`. Any 8081 → HALT.
7. **Gap report is a TABLE.** Step 5 output must use `GAP_REPORT.md` table format. Prose-only reports are rejected.
8. **ADS scan is mandatory.** Step 4.5 runs every session, every surface unless `--no-ads-scan`.
9. **Context Guard at every phase boundary.** 70% → recommend save. 90% → invoke `/obsidian save` immediately + print HANDOVER BLOCK. No exceptions.
10. **Max 5 implementer + 4 probe agents.** Slop kills signal.
11. **No silent re-routing.** Print both router recommendation AND user override when `--wrapper` / `--agents` flags apply.
12. **Re-probe loop cap: 3.** Beyond that → escalate to user.
13. **Jira REST lock.** Use `/rest/api/3/search/jql` (proven in `wh-jira-bulk-sync`). Never use deprecated `/rest/api/3/search`.
14. **CORE_DIRECTIVES.md preambles every dispatch.** Prepend Directives 1-5 to every persona prompt.
15. **ADS resource fetch is mandatory.** Step 4.6 runs signal-gated for every surface. Resources not consulted = GREEN SIGNAL withheld (dimension 8). A GAP REPORT row without an ADS URL citation in the Fix column is structurally invalid.

## Max-3-questions gate (fires between Step 1 and Step 2)

After parsing intent, if ANY of these is ambiguous — surface, operation, probe scope, file target — ask clarifying questions before proceeding. Rules:
- **Maximum 3 questions, never more**, before proceeding to Step 2
- Questions are specific, numbered, one sentence each
- After user answers (or after 3 questions regardless), proceed immediately
- Skip for trivial tier and `--quick` flag

```
CLARIFYING — max 3 questions before probe fires
1. [specific question about the ambiguous dimension]
2. [second question only if needed]
3. [third question only if needed]
```

## Activation block (output format lock — print before every hand-off)

```
ROUTING — /catalyst-agent v4
   intent:     <one-line summary>
   surface:    <surface classifier + CLAUDE.md anchor if applicable>
   signals:    <quoted keywords>
   classifier: <trivial | standard | high-stake>
   bans hit:   <list or "none">
   context:    <~N% consumed | OK>

MCP PROBE — Jira vs Catalyst
   Lane A (Jira):                    <bullets>
   Lane B (Catalyst DOM + shot):     <bullets>
   Lane C (Supabase):                <bullets or "n/a">
   Lane D (codebase):                <bullets>

GAP REPORT — Component N: [Name]
   [STRUCTURED TABLE — GAP_REPORT.md format — mandatory]

ADS COMPLIANCE SCAN — [Surface]
   [STRUCTURED TABLE — mandatory]
   Total: N violations (P0: X · P1: Y · P2: Z)

AGENTS ACTIVATED — N implementers
   primary:  <agent> (<role>)
   augment:  <agent> (<role>)
   verify:   <agent> (<role>)
   ads-fix:  <agent> (<violations>)
   <- wrappers: <chosen> · gates: <CLAUDE.md anchors>

-> handing off to <first wrapper> <first phase>...
```

# ━━━━━━━━━━━━━━━ MIDDLE ZONE — pipeline · routing · tool authorization ━━━━━━━━━━━━━━━

## Triggers and flags

**Canonical:** `/catalyst-agent <task>` · `/agent <task>`

| Flag | Effect |
|---|---|
| `--dry-run` | Probe + routing block only; no hand-off |
| `--skip-probe` | Keyword-only routing; skips Steps 4-5 |
| `--probe-only` | Probe + gap report only; no routing |
| `--agents a,b,c` | Force implementer set; probe still runs |
| `--wrapper <name>` | Force wrapper; probe + agent selection unchanged |
| `--quick` | Trivial tier; suppress activation block + clarifying gate |
| `--reprobe` | Force fresh probe ignoring session cache |
| `--no-ads-scan` | Skip Step 4.5; use only when surface is known-clean |
| `--no-claude-md` | Skip Step 2 — Vikram-only; refuse without explicit chat confirmation |

## Pipeline

### Step 1 — Parse intent

Extract from task text:
- `surface` — files, pages, routes, DB tables referenced
- `operation` — fix / add / remove / refactor / audit / optimize / migrate
- `signals[]` — domain keywords ("dynamic table", "RLS", "Jira parity", "ADS token")
- `file_hints[]` — `BacklogPage.atlaskit.tsx`, `JiraTable`, `ph_issues`
- `probe_scope[]` — Jira screen / Catalyst view / Supabase table

Output: `{ surface, operation, signals[], file_hints[], probe_scope[] }`

→ If ANY dimension is ambiguous: fire **Max-3-questions gate** (PRIMACY ZONE) before Step 2.

### Step 2 — CLAUDE.md ban check (BLOCKING)

Read `CLAUDE.md`. Check against ban list in `ROUTER.md`. Ban hit → **HALT immediately.** Cite CLAUDE.md anchor. No probe runs.

Trivial tier (per RUBRIC.md) → skip to Step 6 after this check.

### Step 3 — Classify

```
Tier:    <trivial | standard | high-stake>
Surface: <ui-feature | ui-bug-fix | ui-refactor | backend-migration |
          design-only | knowledge-save | handover | atlassian-admin | cross-cutting>
Why:     <which classifier marker fired>
```

### Step 4 — MCP Probe

**Context Guard checkpoint.**

#### Step 4.0 — Code archaeology (MANDATORY, runs before all MCP calls)

1. Grep/Read for existing working implementations (`wh-jira-*`, `ph_jira_*`, similar surfaces)
2. Read working code — exact endpoint, auth, pagination, data transform patterns
3. Replicate working pattern exactly before probing or debugging
4. Document findings in gap report (Step 5)

#### Step 4.1 — Parallel probe lanes

| Lane | Persona | Tools | Returns |
|---|---|---|---|
| **A — Jira** | `project-management-jira-workflow-steward` | Atlassian MCP: `getJiraIssueTypeMetaWithFields`, `searchJiraIssuesUsingJql`, `getTransitionsForJiraIssue` + REST `/rest/api/3/search/jql` | Screen scheme fields, workflow states, issue metadata |
| **B — Catalyst DOM** | `engineering-frontend-developer` | Chrome MCP: `javascript_tool`, `read_page`, `find` on `localhost:8080` + Computer Use `screenshot` | Computed styles, DOM structure, click handlers, rendered state |
| **C — Supabase** | `engineering-database-optimizer` | Supabase MCP: `list_tables`, `execute_sql` (SELECT only), `list_migrations` | Columns, RLS policies, indexes, migration history |
| **D — Codebase** | `engineering-codebase-onboarding-engineer` | Read, Grep | File paths, call chains, CLAUDE.md lessons, prior implementations |
| **E — Rovo** | `project-management-jira-workflow-steward` (Rovo mode) | Rovo Search | Requirement clarity, scope, dependency mapping |

A + D always run for UI surfaces. C only for backend/schema signals. E when task involves Jira requirement extraction. Lanes run **in parallel** when independent. Budget: **3-5 min wall-clock per lane** — mark `partial` if exceeded.

#### Persona dispatch template

`~/.claude/agents/*.md` are NOT auto-discovered as subagent_types. Always use `subagent_type: "general-purpose"` with persona content inlined.

```javascript
Agent({
  description: "<one-line action>",
  subagent_type: "general-purpose",
  prompt: `${read('.claude/skills/catalyst-agent/CORE_DIRECTIVES.md')}

You are operating as the <persona-name> persona.
Persona: <2-3 line role description>

ROLE: <read-only | write>
TASK: <specific task>
CONTEXT: <files, URLs, prior probes>
OUTPUT: <format, word cap>
CONSTRAINTS: <what NOT to touch, time budget>`
})
```

### Step 4.5 — ADS Checkpoint Phase 1A: CLI Scan (mandatory)

**Context Guard checkpoint.**

> **Spec:** `ADS_CHECKPOINT.md` Phase 1A. Runs on every file touched — no exceptions.

```bash
node design-governance/rules/audit.js src/<file-or-dir>
```

Catches: `RAW_HEX` · `RAW_RGB_HSL` · `TAILWIND_CLASS` · `HARDCODED_PX` · `BANNED_COMPONENT` · `BANNED_FIELD` · `BANNED_COLUMN_HEADER` · `ATLASKIT_LEGACY` · `HAND_ROLLED_MENU` · `UPPERCASE_LABEL` · `INVALID_FONTWEIGHT` · off-grid spacing.

Output feeds directly into Step 4.7 GATE table. Do not wait for DOM sweep before recording CLI results.

### Step 4.6 — ADS Checkpoint Phase 1B + 1C: Resource Fetch + DOM Sweep (mandatory)

**Context Guard checkpoint.**

> **Spec:** `ADS_CHECKPOINT.md` Phase 1B (signal-gated resource fetch) + Phase 1C (DOM computed-style sweep).
> TIER 1 resources NOT fetched = GREEN SIGNAL dimension 8 withheld. No exceptions.

**TIER 1 — always fetch:**

| Resource | URL |
|---|---|
| Atlassian Design System | https://atlassian.design/ |
| ADS Design Tokens | https://atlassian.design/components/tokens/all-tokens |

**TIER 2 — fetch when signal detected:**

| Signal | Resource | URL |
|---|---|---|
| description / comment / rich text / "ADF" | ADF structure | https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/ |
| ADF test data or validation | ADF playground | https://developer.atlassian.com/cloud/jira/platform/apis/document/playground/ |
| description in **write** mode | @atlaskit/editor-core | https://www.npmjs.com/package/@atlaskit/editor-core |
| description in **read** mode | @atlaskit/renderer | https://www.npmjs.com/package/@atlaskit/renderer |
| ADF traversal / manipulation | @atlaskit/adf-utils | https://www.npmjs.com/package/@atlaskit/adf-utils |
| kanban / backlog rank / drag-drop | Pragmatic DnD | https://atlassian.design/components/pragmatic-drag-and-drop |
| DnD implementation detail | Pragmatic DnD GitHub | https://github.com/atlassian/pragmatic-drag-and-drop |
| installing a new @atlaskit/* package | Atlaskit portal | https://atlaskit.atlassian.com/get-started |

**BANNED — never fetch, never use:** `@atlaskit/dynamic-table` (direct, work-item surfaces) · `@atlassian/aui` · Forge tokens · @atlaskit/tokens changelog.

Emit ADS RESOURCE CHECK block (format in `ADS_CHECKPOINT.md` Phase 1B) before the compliance scan table.
Run Phase 1C DOM sweep (JS probe in `ADS_CHECKPOINT.md` Phase 1C) via `javascript_tool` on `localhost:8080/<route>`.

### Step 4.7 — ADS Checkpoint Phase 2→4: GATE → FIX → VERIFY (mandatory)

**Context Guard checkpoint.**

> **Full spec:** `ADS_CHECKPOINT.md` Phases 2, 3, 4. Runs after Steps 4.5 + 4.6. Trivial tier: skip.

```
Phase 2 — GATE   Classify Phase 1A+1C findings into P0/P1/P2.
                 Emit ADS COMPLIANCE SCAN table (ADS_CHECKPOINT.md Phase 2 format).
                 P0 → GREEN SIGNAL dimension 8 FAIL. Surface blocked until fixed.
                 P1 → surface to user; offer to fix in session.

Phase 3 — FIX    Route each violation to the correct agent via the fix routing matrix
                 (ADS_CHECKPOINT.md Phase 3). Commit format: fix(ads): <type> in <Component>

Phase 4 — VERIFY Re-run CLI + screenshot + re-run DOM sweep. Emit ADS VERIFY block.
                 ADS GATE: CLEAR = P0 = 0 = GREEN SIGNAL dimension 8 satisfied.
                 ADS GATE: BLOCKED = loop Phase 3→4. Cap: 3 loops. Then escalate to user.
```

**GREEN SIGNAL dimension 8 pass condition:** ADS GATE: CLEAR (zero P0 violations after Phase 4 verify).

### Step 5 — Synthesize gap report (TABLE mandatory)

**Context Guard checkpoint.**

```
Component N — [Name]

# | Dimension      | Jira (live probe)     | Catalyst Current      | Gap
--|----------------|----------------------|-----------------------|----
1 | <dimension>    | <measured value>     | <measured value>      | <imperative gap text or "Match">
```

Gap column: `Match` when equal; specific imperative text when different ("80px narrower", "tab row absent"). Never "slightly different." Append ADS Compliance Scan table from Step 4.5.

### Step 5.5 — Green Signal gate (BLOCKING)

Probe must cover all 8 dimensions:

| # | Dimension | Coverage check |
|---|---|---|
| 1 | Visual | Computed-style measurements on both Catalyst + Jira |
| 2 | Structural | DOM tree + ARIA + data-* |
| 3 | Behavioral | Handlers + state + network |
| 4 | Schema | Atlassian MCP + Supabase if backend-touching |
| 5 | Architecture | file:line refs, hierarchy, hook deps |
| 6 | Accessibility | WCAG 2.1 AA |
| 7 | CLAUDE.md | Anchors scanned, bans flagged |
| 8 | ADS Resources | All signal-triggered resources fetched (Step 4.6) + findings produced in GAP REPORT |

```
GREEN SIGNAL — probe complete · cleared for execution
   Coverage: visual OK · structural OK · behavioral OK · schema OK
             architecture OK · a11y OK · CLAUDE.md OK · ADS resources OK
   Findings: <N> · Halts: 0 · Open questions: <N>
   ADS resources fetched: <list of URLs consulted>
   Verdict: SAFE TO EXECUTE
```

```
RED SIGNAL — probe incomplete · execution BLOCKED
   Missing: <dimensions>
   Halts: <CLAUDE.md anchors hit>
   ADS resources not fetched: <list of skipped URLs + triggering signals>
   Verdict: DO NOT EXECUTE — re-probe required
```

RED → loop to Step 4 (cap: 3) or escalate. Vikram override: explicit chat confirmation only — logged in activation block.

### Step 6 — Pick wrappers + implementer agents (ROUTER.md)

Use Probe Matrix (Step 4) and Implementer Matrix (Step 6) from `ROUTER.md`.

**Phase 2.5 council** (5 advisors) activates when: gap has multiple valid wrapper paths OR task is high-stake. Does NOT activate for trivial tier or single unambiguous match.

| Role | Probe (read-only) → Implementer (writes) |
|---|---|
| Frontend | `engineering-frontend-developer` |
| Design | `design-ui-designer` |
| Schema | `engineering-database-optimizer` |
| Jira advisory | `project-management-jira-workflow-steward` |

Caps: **max 5 implementer + 4 probe agents**.

### Step 7 — Announce (print activation block — BLOCKING)

Print the full activation block (PRIMACY ZONE format) before any hand-off. No execution without it.

### Step 8 — Hand off + screenshot evidence

**Context Guard checkpoint.**

Pass full PROBE + GAP REPORT as context envelope to wrapper. After every implementation action:

1. Navigate to `localhost:8080/<path>`
2. `mcp__computer-use__screenshot` (preferred) or `mcp__Claude_in_Chrome__read_page`
3. If Computer Use not yet granted: call `mcp__computer-use__request_access`
4. Print EVIDENCE block (RECENCY ZONE format)

### Step 9 — Loop if needed

**Context Guard checkpoint.**

CRUD gate fails or new gaps emerge → re-fire Step 4. Cap: 3. Beyond that → escalate to user. Update gap table after each re-probe: mark fixed items, add new gaps.

## Tool authorization

ALL tools authorized for both probe and implementation:
- `mcp__Claude_in_Chrome__*` — DOM probing, navigation, clicking
- `mcp__computer-use__*` — screenshots (mandatory post-fix), visual verification
- Atlassian MCP, Supabase MCP, Figma MCP — all phases
- Bash, Read, Write, Edit, Agent, WebFetch — all available

CLAUDE.md "Chrome MCP only for Lane B" is **suspended** under /catalyst-agent. Computer Use authorized for visual verification and screenshot evidence.

**Banned (global, no override):** `testsprite_*` · `preview_*`

## What this skill does NOT do

- Execute SQL (use Supabase MCP `apply_migration` or manual-paste only)
- Write code itself — hands off to implementer agents inside wrappers
- Switch the active model
- Auto-write to CLAUDE.md (lessons appended only on Vikram's explicit confirmation)
- Bypass CLAUDE.md content bans (Directive 3 overrides Chrome-only restriction, NOT bans)
- Silently retry failed probes (escalates after 1 failure per lane)
- Declare any fix done without a screenshot

## /catalyst-agent vs /preflight

| Dimension | `/preflight` | `/catalyst-agent` |
|---|---|---|
| First MCP call | none (memory + CLAUDE.md only) | Atlassian + Chrome + Computer Use probe |
| Output | 8-phase plan + 17-advisor council | Routing + gap TABLE + ADS TABLE + activations |
| Time budget | 10-30 min | 2-3 min probe + hand-off |
| When to use | "Plan the v2 rebuild" | "Fix the dynamic table sort" |

**/catalyst-agent is upstream of /preflight.** It probes and routes; preflight runs phases with probe context already loaded.

# ━━━━━━━━━━━━━━━ RECENCY ZONE — acceptance criteria · evidence · handover ━━━━━━━━━━━━━━━

## Pre-delivery checklist (all must be TRUE before declaring any fix done)

- [ ] Green Signal emitted (Step 5.5 verdict = GREEN, all 8 dimensions satisfied)
- [ ] Activation block printed (PRIMACY ZONE format, verbatim)
- [ ] No banned fields/tools used (Story Points, MDT Ref, testsprite_*, preview_*)
- [ ] Screenshot taken after fix (`mcp__computer-use__screenshot`)
- [ ] EVIDENCE block printed (format below)
- [ ] ADS scan run (Step 4.5) — violations surfaced and offered to user
- [ ] **ADS Checkpoint Phase 2→4 run (Step 4.7) — ADS GATE: CLEAR (P0 = 0), VERIFY block emitted**
- [ ] **All P0 violations fixed and verified; P1 surfaced to user**
- [ ] **No wrong DnD library (only @atlaskit/pragmatic-drag-and-drop for drag interactions)**
- [ ] **No @atlassian/aui imports (legacy, banned)**
- [ ] **@atlaskit/dynamic-table not introduced as primary for work item surfaces**
- [ ] Gap report is a TABLE (not prose)
- [ ] CLAUDE.md ban check completed (Step 2)
- [ ] Code archaeology completed before MCP probes (Step 4.0)
- [ ] Port 8080 used for all Lane B probes (never 8081)
- [ ] Re-probe count ≤ 3 (if exceeded → escalated to user)
- [ ] Context Guard checked at every phase boundary

## Evidence block (print after every implementation action)

```
EVIDENCE — Component N ([Name]) after fix
   URL:        http://localhost:8080/[path]
   Screenshot: [attached via computer-use]
   Gaps fixed: N of total — [dimension labels]
   Remaining:  [list with reason if deferred]
   ADS fixed:  N violations
   ADS remain: N violations
```

## Context Guard — depletion thresholds

**70% warning** (3+ components probed OR 4+ phases completed OR 2+ re-probe cycles):
```
WARNING CONTEXT GUARD — ~70% consumed
   Completed: [phases]
   Remaining: [phases]
   Recommendation: finish current component, then /obsidian save
```

**90% emergency** (2+ full implement→verify cycles OR all 70% signals simultaneously):
1. Print: `EMERGENCY CONTEXT GUARD — ~90% consumed SAVING NOW`
2. Invoke `/obsidian save [%]`
3. Print HANDOVER BLOCK (format: `CONTEXT_GUARD.md`)
4. Explain to user how to resume

## See also

- `GAP_REPORT.md` — gap table + ADS table + evidence block formats
- `CONTEXT_GUARD.md` — 70%/90% depletion protocol + handover block format
- `CORE_DIRECTIVES.md` — 5 directives (preamble for every dispatch)
- `ROUTER.md` — Probe Matrix + Implementer Matrix (ban table row #25)
- `AGENT_ROSTER.md` — Phase 0-5 dispatch
- `INDEX.md` — 184 agents with Catalyst-relevance flags
- `PREFLIGHT_VS_AGENT.md` — full comparison + composition patterns
- **`ADS_CHECKPOINT.md` — 4-phase AUDIT→GATE→FIX→VERIFY spec + TIER 1/TIER 2/BANNED resource library + fix routing matrix**
- `../preflight/SKILL.md` — Phase 0-7 definition
- `../preflight/RUBRIC.md` — trivial / standard / high-stake classification
- `design-governance/cli/index.js` — ADS audit CLI
- `design-governance/scripts/self-test.mjs` — audit self-test (verifies scanner not broken)
- `CLAUDE.md` — gates, bans, lessons (source of truth)
