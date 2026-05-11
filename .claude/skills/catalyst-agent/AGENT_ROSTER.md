# Catalyst-Agent v2 — Agent Roster

**Companion to `SKILL.md`.** Adds named agents from `~/.claude/agents/` per pipeline phase. Does not change any routing logic, gate, or rule defined in `SKILL.md`. Always emit the activation line from `.claude/skills/AGENT_PIPELINE.md` before each agent does work.

---

## Phase 0 — Intent Parse

| Agent | Role |
|---|---|
| `engineering-codebase-onboarding-engineer` | Read-only: extract surface, operation, signals, file hints, probe scope from task text. Parse CLAUDE.md ban list simultaneously. |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-codebase-onboarding-engineer
   ← invoked by: catalyst-agent · Phase 0 (Intent Parse)
   role: read-only surface + signal extraction + ban check pre-flight
```

Skip in `--quick` mode.

---

## Phase 1 — CLAUDE.md Ban Check

No agent needed. Run synchronously before probe. If any banned signal hits → HALT with CLAUDE.md anchor, no agents activate.

---

## Phase 2 — MCP Probe (4 lanes, parallel)

Each lane gets one named specialist. Lanes run in parallel per SKILL.md step 4.

| Lane | Agent | Role |
|---|---|---|
| Lane A — Jira schema | `project-management-jira-workflow-steward` | `getJiraIssueTypeMetaWithFields`, screen scheme reads, workflow states |
| Lane B — Catalyst DOM | `engineering-frontend-developer` | `localhost:8080` live DOM probes, computed-style, click handlers |
| Lane C — Supabase schema | `engineering-database-optimizer` | `ph_*` table schema, RLS policy, index reads (read-only) |
| Lane D — Codebase static | `engineering-codebase-onboarding-engineer` | File paths, call chain, prior CLAUDE.md lessons, imports |

Activation lines (announce all 4 in one block at start of Phase 2):

```
🤖 PHASE 2 MCP PROBE — 4 lanes activating in parallel
   Lane A: project-management-jira-workflow-steward (Jira meta)
   Lane B: engineering-frontend-developer            (Catalyst DOM)
   Lane C: engineering-database-optimizer            (Supabase schema)
   Lane D: engineering-codebase-onboarding-engineer  (codebase trace)
   ← invoked by: catalyst-agent · Phase 2 (MCP Probe)
```

Probe budget per lane: 90 seconds wall-clock max. Mark `partial` if exceeded.

---

## Phase 2.5 — Routing Council (conditional)

**When to activate:** Only when the gap report is **ambiguous** (multiple valid wrapper paths) OR the task is **high-stake** (per RUBRIC.md high-stake classification).

| Agent | Role |
|---|---|
| `engineering-software-architect` | Assess architecture risk of routing choice |
| `engineering-senior-developer` | Assess complexity + team velocity impact |
| `project-management-jira-workflow-steward` | Confirm Jira-side scope + schema implications |
| `engineering-code-reviewer` | Assess code review risk of chosen path |
| `agents-orchestrator` | Chair: synthesize verdicts into one wrapper composition order |

Activation line (single line for whole council):

```
🤖 PHASE 2.5 ROUTING COUNCIL — 5 advisors deliberating wrapper composition
   software-architect, senior-developer, jira-workflow-steward, code-reviewer, agents-orchestrator
   ← invoked by: catalyst-agent · Phase 2.5 (Routing Council — HIGH-STAKE / AMBIGUOUS)
```

Per-advisor hand-off lines are SUPPRESSED to keep chat readable.

**Skip this phase if:**
- Trivial tier classification (per RUBRIC.md) — skip straight to Phase 3
- Single unambiguous wrapper match (only one row in Implementer Matrix applies)
- `--quick` mode

---

## Phase 3 — Wrapper Selection

| Agent | Role |
|---|---|
| `agents-orchestrator` | Output activation block with chosen wrappers, implementer agents, CLAUDE.md gates. Announce evidence for each choice. |

Activation line:

```
🤖 AGENT ACTIVATED — agents-orchestrator
   ← invoked by: catalyst-agent · Phase 3 (Wrapper Selection)
   role: emit activation block + hand off to first wrapper
```

---

## Phase 4 — Hand-Off (wrapper invokes its own AGENT_ROSTER)

No agent on catalyst-agent side. The chosen wrapper (preflight / jira-compare / design-intelligence / design-critique) invokes its own Phase pipeline and agents via its AGENT_ROSTER.md.

---

## Phase 5 — Loop / Re-Probe (conditional)

If wrapper's acceptance gate fails (CRUD gate, closure-evidence gate, etc.), catalyst-agent can re-fire the probe (Phase 2) to refresh state. Loop cap: **3 re-probes**.

| Agent | Role |
|---|---|
| `engineering-codebase-onboarding-engineer` | Refresh codebase snapshot (did the wrapper commit changes?) |
| `engineering-frontend-developer` | Refresh DOM snapshot (does the fix render?) |

Activation line (only if re-probe fires):

```
🤖 RE-PROBE CYCLE — <N> of 3
   ← invoked by: catalyst-agent · Phase 5 (Loop / Re-Probe)
   reason: <wrapper gate failed | new gap emerged | user asked for refresh>
```

---

## Mode-specific overrides

- **`--quick`**: suppress Phase 0 + 2.5 activations. Phase 2 + 3 + 4 still announce.
- **`--dry-run`**: run Phases 0–3, print activation block, do NOT hand off to Phase 4 wrapper.
- **`--skip-probe`**: skip Phase 2 (MCP probe). Use keyword-only routing (v1 behaviour). Phase 2.5 council also skipped.
- **`--probe-only`**: run Phases 0–2, emit gap report, skip Phase 2.5 + 3 + 4.
- **Trivial classification (RUBRIC.md)**: skip Phase 2.5. Phase 2 + 3 still run, but council does not activate.
- **High-stake classification**: full pipeline; Phase 2.5 council MUST announce.

---

## See also

- `SKILL.md` — 9-step pipeline definition, worked examples
- `ROUTER.md` — Probe Matrix + Implementer Matrix (updated with Phase 2.5 trigger)
- `.claude/skills/AGENT_PIPELINE.md` — universal preamble + activation protocol
- `.claude/skills/preflight/AGENT_ROSTER.md` — preflight Phase 0–7 agents (often invoked as wrapper)
- `INDEX.md` — all 184 agents with Catalyst-relevance flags
