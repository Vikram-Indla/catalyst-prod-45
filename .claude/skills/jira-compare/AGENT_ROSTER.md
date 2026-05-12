# Jira-Compare v4 — Agent Roster

**Companion to `SKILL.md`.** Adds named agents from `~/.claude/agents/` per lane and gate. Does not change any lane, CRUD acceptance gate, or rule defined in `SKILL.md`. Always emit the activation line from `.claude/skills/AGENT_PIPELINE.md` before each agent does work.

---

## Phase 1 — Evidence Acquisition (3 lanes, parallel)

Each lane gets one named specialist. Lanes run in parallel per SKILL.md.

| Lane | Agent | Role |
|---|---|---|
| Lane A — Jira / Atlassian MCP | `project-management-jira-workflow-steward` | Screen scheme reads, field metadata, workflow states, status values via `getJiraIssueTypeMetaWithFields` |
| Lane B — Catalyst DOM / Chrome MCP | `engineering-frontend-developer` | Live `localhost:8080` DOM probes, computed-style measurements, current rendered state, network calls |
| Lane C — Codebase static | `engineering-codebase-onboarding-engineer` | File paths, call chain, prior CLAUDE.md lessons, imports related to the audited surface |

Activation lines (announce all 3 in one block at start of Phase 1):

```
🤖 PHASE 1 EVIDENCE LANES — 3 agents activating in parallel
   Lane A: project-management-jira-workflow-steward (Jira meta)
   Lane B: engineering-frontend-developer            (Catalyst DOM)
   Lane C: engineering-codebase-onboarding-engineer  (codebase trace)
   ← invoked by: jira-compare · Phase 1 (Evidence Acquisition)
```

Sync gate from SKILL.md is unchanged — emit per lane: `<ok|partial|skipped+reason>`.

---

## Phase 2 — Gap Synthesis

| Agent | Role |
|---|---|
| `testing-reality-checker` | Verify the gap report's layer assignment — which component/file is actually broken (CLAUDE.md 2026-05-11 lesson) |

Activation line:

```
🤖 AGENT ACTIVATED — testing-reality-checker
   ← invoked by: jira-compare · Phase 2 (Gap Synthesis)
   role: probe the broken layer to confirm gap report placement
```

---

## Phase 3 — CRUD Acceptance Gate (BLOCKING)

| Agent | Role |
|---|---|
| `testing-reality-checker` | Verify CRUD cycles on both Jira + Catalyst sides. Confirm data flows correctly through Create, Read, Update, Delete on EACH side independently. |

Activation line:

```
🤖 AGENT ACTIVATED — testing-reality-checker
   ← invoked by: jira-compare · Phase 3 (CRUD Gate)
   role: verify C/R/U/D cycles on both Jira + Catalyst independently
```

**HALT gate (unchanged from SKILL.md):** If any CRUD cycle fails on either side → RED. Audit cannot PASS. Only Vikram can override RED with explicit chat confirmation.

---

## Phase 4 — Fix Implementation (when diffs are found)

Choose primary implementer based on gap type:

| Gap type | Primary implementer |
|---|---|
| Visual drift / ADS token | `engineering-frontend-developer` |
| Typography / spacing | `design-ui-designer` |
| Handler / state wiring | `engineering-frontend-developer` |
| Schema / RLS | `engineering-database-optimizer` |
| Mixed / ambiguous | `engineering-senior-developer` |

Always pair with:
| Agent | Role |
|---|---|
| `testing-reality-checker` | Confirm fix ships to the right layer (CLAUDE.md 2026-05-11) |
| `testing-evidence-collector` | Capture before/after screenshots with SVG arrows |

Activation block (announce all 3 at start of Phase 4):

```
🤖 PHASE 4 IMPLEMENTATION — 3 agents engaged
   Implementer: <picked from table>
   Verifier:    testing-reality-checker
   Evidence:    testing-evidence-collector
   ← invoked by: jira-compare · Phase 4 (Fix Implementation)
```

---

## Phase 5 — Regression Sweep (when fixes land)

| Agent | Role |
|---|---|
| `testing-reality-checker` | Probe 3 most adjacent surfaces for regressions (shared components). CLAUDE.md 2026-04-28 lesson. |
| `testing-evidence-collector` | Capture regression test screenshots |

Activation line:

```
🤖 PHASE 5 REGRESSION SWEEP — 2 agents
   testing-reality-checker       (adjacent surface probe)
   testing-evidence-collector    (regression screenshots)
   ← invoked by: jira-compare · Phase 5 (Regression Sweep)
```

---

## Mode-specific overrides

- **`--dry-run`**: run Phases 1–2, print gap report, do NOT hand off to Phase 3 CRUD gate or Phase 4 implementation.
- **`--warmup-only`**: skip Phase 1. Use prior session's lane outputs. Mute activations (suppress agent lines for speed).
- **Trivial classification (per RUBRIC.md)**: Phase 1 still runs, Phase 2+ may be skipped if trivial. CRUD gate always runs before impl.
- **High-stake classification**: full pipeline. All agent activations announced. No skips.

---

## See also

- `SKILL.md` — 5-phase audit loop definition, 3-lane parity methodology
- `.claude/skills/AGENT_PIPELINE.md` — universal preamble + activation protocol
- `.claude/skills/catalyst-agent/SKILL.md` — how this skill fits the pipeline (often invoked as wrapper by catalyst-agent)
- `.claude/skills/preflight/AGENT_ROSTER.md` — Phase 0–7 agents (for comparison)
- `CLAUDE.md` — jira-compare compounding lessons (authoritative defect patterns)
