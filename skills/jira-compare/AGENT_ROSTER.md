# Jira Compare v4 — Agent Roster

**Companion to `SKILL.md`.** Adds named agents from `~/.claude/agents/` per phase. The 3-lane model, the lane scope exclusivity, the sync gate, the source-of-truth hierarchy, the CRUD acceptance gate, and the 5-cycle hard cap — all unchanged. This roster only assigns named specialists to lanes and gates.

Always emit the activation line from `.claude/skills/AGENT_PIPELINE.md`.

---

## 0. Warmup (mandatory per SKILL.md)

| Agent | Role |
|---|---|
| `engineering-codebase-onboarding-engineer` | Read CLAUDE.md sections relevant to the surface; surface any banned-integration / banned-field rules before lanes start |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-codebase-onboarding-engineer
   ← invoked by: jira-compare · 0. Warmup
   role: surface CLAUDE.md banned-fields / banned-integrations relevant to surface
```

This catches the "Service Now# / Assessment Feature / MDT Ref / Story Points / AI Sparkles" bans BEFORE Lane A wastes a probe on them.

---

## 3. The Three Lanes

### Lane A — Chrome MCP (Catalyst + Jira live DOM)

| Sub-target | Agent | Role |
|---|---|---|
| Catalyst-side DOM probe | `engineering-frontend-developer` | DOM, computed styles, ARIA |
| Catalyst-side a11y assertions | `testing-accessibility-auditor` | Keyboard / focus / contrast |
| Jira-side DOM probe | `engineering-frontend-developer` | Same agent, different surface |

Activation line (one block at Lane A start):
```
🤖 LANE A — 2 agents
   engineering-frontend-developer    (DOM + computed styles, both sides)
   testing-accessibility-auditor     (Catalyst a11y assertions)
   ← invoked by: jira-compare · Lane A (Chrome MCP)
```

### Lane B — Rovo / Atlassian MCP

| Agent | Role |
|---|---|
| `project-management-jira-workflow-steward` | `getJiraIssueTypeMetaWithFields`, screen-scheme reads, custom-field meta |
| `engineering-backend-architect` | Reasons about Jira REST contracts, webhook payload shapes |

Activation line:
```
🤖 LANE B — 2 agents
   project-management-jira-workflow-steward (Jira meta, screen schemes)
   engineering-backend-architect            (REST + webhook contracts)
   ← invoked by: jira-compare · Lane B (Rovo / Atlassian MCP)
```

### Lane C — Computer Use

| Agent | Role |
|---|---|
| `testing-evidence-collector` | Visual capture for surfaces Lane A cannot reach (drag-drop, animation, native menus) |

Activation line:
```
🤖 AGENT ACTIVATED — testing-evidence-collector
   ← invoked by: jira-compare · Lane C (Computer Use)
   role: visual capture for Lane-A-unreachable interactions
```

**Lane scope is exclusive per `SKILL.md`** — agents do not cross lanes. The frontend-developer in Lane A does NOT touch Rovo; the workflow-steward in Lane B does NOT touch Chrome MCP.

---

## Sync Gate (per SKILL.md)

No agent. The gate from `SKILL.md` is unchanged: each lane reports `<ok|partial|skipped+reason>`.

---

## CRUD Acceptance Gate

| Agent | Role |
|---|---|
| `testing-api-tester` | Drive C/R/U/D against both backends (Catalyst Supabase + Jira REST) |
| `testing-reality-checker` | After each CRUD operation, verify the row truly persisted and re-renders on reload (CLAUDE.md "visual match is not parity" rule) |

Activation line:
```
🤖 CRUD GATE — 2 agents
   testing-api-tester       (drive C/R/U/D both sides)
   testing-reality-checker  (post-op persistence + re-render verification)
   ← invoked by: jira-compare · CRUD Acceptance Gate
```

The gate's pass criteria from `SKILL.md` are unchanged — visual match alone is a fail.

---

## Loop (5-cycle hard cap)

| Agent | Role |
|---|---|
| `engineering-minimal-change-engineer` | Each cycle's fix is the smallest correct patch (CLAUDE.md "small steps" + "shared component fix once" rules) |
| `testing-test-results-analyzer` | Triage the per-cycle test output to decide cycle goal |

Activation block at cycle 1:
```
🤖 LOOP ENGAGED — 2 agents per cycle (cap: 5 cycles)
   engineering-minimal-change-engineer    (cycle patch)
   testing-test-results-analyzer          (between-cycle triage)
   ← invoked by: jira-compare · Loop (Cycle 1/5)
```

Each subsequent cycle re-emits a one-line cycle marker:
```
🔁 CYCLE 2/5 — minimal-change-engineer applying patch
```

Cycle 6 escalation per `SKILL.md` is unchanged: stop, log, escalate to Vikram.

---

## Source-of-Truth Conflict Resolution

When lanes disagree, the hierarchy from `SKILL.md` (Rovo > Jira DOM > Catalyst DOM) is the law. Adjudicator:

| Agent | Role |
|---|---|
| `project-management-jira-workflow-steward` | Reads the disagreement, applies the hierarchy, writes the verdict line |

Activation line (only when there IS a conflict):
```
🤖 AGENT ACTIVATED — project-management-jira-workflow-steward
   ← invoked by: jira-compare · Source-of-Truth Adjudication
   role: apply Rovo > Jira DOM > Catalyst DOM hierarchy and write verdict
```

---

## Mode-specific notes

- **Warmup-only**: only the Phase 0 onboarding-engineer activates. No lanes.
- **Single-lane mode**: only the named lane's agents activate. Other lanes skip silently.
- **CRUD-only**: skip Lanes A/B/C visual; go straight to CRUD gate agents.
