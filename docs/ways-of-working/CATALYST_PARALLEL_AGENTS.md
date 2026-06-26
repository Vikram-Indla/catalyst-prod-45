# CATALYST PARALLEL AGENTS

> Required agents before any non-trivial implementation.
> Spawn all in parallel. Synthesize before writing Plan Lock.

---

## MANDATORY AGENT SPAWNING

**Parallel agents are mandatory for non-trivial Catalyst work.**

Claude must not work as a single waterfall coder for non-trivial work.

All seven discovery agents are spawned in parallel before the Plan Lock is written.
Failure of any agent is a blocker — do not proceed to implementation until resolved.

---

## AGENT 1 — Canonical Component Discovery

**Purpose:** Prevent rebuilding what Catalyst already has.

**Required input:**
- Feature name and objective
- UI elements needed (table, modal, sidebar, form fields, etc.)
- Target route/surface

**Required output:**
- List of existing Catalyst canonical components that fit (with file paths)
- List of `@atlaskit/*` primitives that fit
- For each: API summary, props required, any unsuitability evidence
- Verdict: reuse / extend / new (with justification)

**Failure criteria:**
- Agent says "build new" without searching `src/components`, `src/lib`, Storybook MCP
- Agent returns "nothing found" without running grep
- Agent misses `JiraTable` for any table/list surface

---

## AGENT 2 — Canonical Screen Discovery

**Purpose:** Prevent rebuilding screens that already exist.

**Required input:**
- Feature objective
- User journey / route description
- Reference screens (Jira, Figma, or screenshot)

**Required output:**
- Existing Catalyst routes/pages that match the target UX
- Canonical screens to reuse or adapt (with route paths and component tree)
- Adapter strategy if data source differs
- Verdict: reuse / adapt / new (with justification)

**Failure criteria:**
- Agent proposes new screen without checking existing routes
- Agent misses an existing modal, drawer, or page that already covers the UX
- Agent proposes reimplementing a surface that exists with different data

---

## AGENT 3 — UI/UX Critic

**Purpose:** Score the proposed design against ADS and Storybook before any code.

**Required input:**
- Proposed UI structure (wireframe, sketch, or description)
- Storybook MCP query results for relevant components
- ADS token requirements

**Required output:**
- Compliance score against ADS (0–10)
- Specific violations: banned colors, hand-rolled UI, non-ADS spacing
- Canonical component substitutions for any proposed hand-rolled element
- Screenshot comparison plan (reference vs proposed)
- Acceptance criteria for visual signoff

**Failure criteria:**
- Agent approves bare hex colors
- Agent approves hand-rolled table/modal/menu/dropdown
- Agent does not query Storybook MCP before scoring
- Agent scores without specifying which ADS tokens to use

---

## AGENT 4 — Integration Architect

**Purpose:** Define wiring, data flow, and API contracts before code.

**Required input:**
- Feature objective
- Components to integrate (DB tables, edge functions, Supabase hooks, React Query, etc.)
- Existing patterns in codebase

**Required output:**
- Data flow diagram (textual is fine)
- DB tables involved + column existence verification
- React Query hook strategy (existing hooks vs new)
- Edge function requirements (new vs existing)
- RLS policy impact
- Props/interface contracts for each component boundary
- Integration order (what must be wired first)

**Failure criteria:**
- Agent references columns without verifying they exist in DB
- Agent proposes new hooks when existing ones suffice
- Agent ignores RLS impact on new surfaces
- Agent defines wiring that would break existing consumers

---

## AGENT 5 — Data/Safety Guard

**Purpose:** Protect DB integrity, prevent assumption defaults, flag migration risk.

**Required input:**
- Feature data requirements
- DB tables and columns involved
- Plan Lock scope

**Required output:**
- Column existence verification for each field accessed
- camelCase vs snake_case field access audit
- Assumption default scan (any `|| 'Story'` / `|| 'todo'` / `|| 'Medium'` patterns)
- Migration risk rating (none / low / medium / high)
- RLS policy review
- Rollback plan if migration is involved

**Failure criteria:**
- Agent passes without verifying column existence
- Agent misses assumption default patterns in new code
- Agent does not flag schema changes as requiring migration
- Agent does not check RLS impact

---

## AGENT 6 — Implementation Planner

**Purpose:** Produce the ordered, surgical file edit list for the Plan Lock.

**Required input:**
- Outputs from agents 1–5
- Plan Lock draft (objective, scope, canonical selections)

**Required output:**
- Ordered list of files to modify (path, change type, change summary)
- Explicit list of files forbidden (must not touch)
- Parallel vs sequential execution order
- Estimated time per file
- Total estimated time (must fit 2-hour timebox or split)
- Stop conditions (when to halt and raise RED FLAG)

**Failure criteria:**
- Plan touches files outside Plan Lock scope
- Plan exceeds 2-hour timebox without a split proposal
- Plan modifies forbidden files
- Plan has no stop conditions defined

---

## AGENT 7 — QA/Screenshot Validator

**Purpose:** Define and run the screenshot acceptance checklist.

**Required input:**
- Plan Lock screenshot checklist
- Reference screenshots (canonical Catalyst / Jira / Storybook)
- Implementation output

**Required output:**
- Screenshot for each checklist item (before/after or reference/implementation)
- DOM probe results for functional validation
- Validation command outputs
- Visual acceptance verdict per checklist item
- Any regressions detected

**Failure criteria:**
- Agent declares acceptance without screenshots
- Agent uses screenshots to validate functional behavior (screenshots ≠ functionality)
- Agent misses a regression in adjacent UI
- Agent accepts visual that uses banned colors or hand-rolled UI
