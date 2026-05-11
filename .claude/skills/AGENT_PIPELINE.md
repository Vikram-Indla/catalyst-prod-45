# Agent Pipeline — companion to Catalyst skills

**Status:** purely additive. Does not change any existing skill instruction. The 4 active skills (`preflight`, `design-intelligence`, `design-critique`, `jira-compare`) keep their phases, council membership, gates, and rules unchanged. This pipeline only specifies **which agent from `~/.claude/agents/` is invoked at which phase**, plus a uniform notification protocol.

**Why this exists.** 184 agents from `agency-agents/` are now installed in `~/.claude/agents/`. Without a pipeline they sit dormant. With this pipeline each skill phase gets a named specialist (read-only or implementer) so the work is partitioned cleanly and Vikram always knows who is doing what.

---

## Activation notification protocol (mandatory whenever an agent is invoked)

Whenever any skill loads an agent, emit ONE line in this exact form before the agent does any work:

```
🤖 AGENT ACTIVATED — <agent-name>
   ← invoked by: <skill-name> · <phase-id> (<phase-label>)
   role: <one-sentence role>
```

Example:

```
🤖 AGENT ACTIVATED — engineering-codebase-onboarding-engineer
   ← invoked by: preflight · Phase 1 (Evidence Acquisition, Lane A)
   role: read-only trace from CatalystView* down to ph_issues
```

When the agent finishes its phase contribution, emit:

```
✅ AGENT HAND-OFF — <agent-name> → <next-agent | phase-end>
```

**Hand-off is silent for council members** (Phase 2 of preflight, design-intelligence council, design-critique council). Council activations announce ONCE at the start of the council with the full roster, then run in parallel without per-advisor hand-off lines. This keeps the chat readable for the largest skill (preflight Phase 2 with 17 advisors).

---

## Per-skill pipeline pointer

Each skill has a companion `AGENT_ROSTER.md` in its own directory. They map phases → agents and inherit the notification protocol above.

| Skill | Roster path | Top-3 agents per skill |
|---|---|---|
| `preflight` | `.claude/skills/preflight/AGENT_ROSTER.md` | `engineering-codebase-onboarding-engineer`, `engineering-software-architect`, `engineering-minimal-change-engineer` |
| `design-intelligence` | `.claude/skills/design-intelligence/AGENT_ROSTER.md` | `design-ux-architect`, `testing-accessibility-auditor`, `testing-evidence-collector` |
| `design-critique` | `.claude/skills/design-critique/AGENT_ROSTER.md` | `testing-accessibility-auditor`, `design-ui-designer`, `testing-evidence-collector` |
| `jira-compare` | `skills/jira-compare/AGENT_ROSTER.md` | `project-management-jira-workflow-steward`, `engineering-frontend-developer`, `testing-reality-checker` |

---

## Hard rules (override nothing in the parent skills)

1. **No agent may override a Foundation Council master.** Saffer / Tufte / Rams / Norman / Ive / Raskin / Cooper / AtlasKit Architect remain canonical in `design-intelligence` and `design-critique`. Agents listed here AUGMENT a council lens — they don't replace it.
2. **No agent may bypass a skill's HALT gate.** preflight Phase 0.5 halt-required violations, jira-compare CRUD-acceptance gate, design-critique closure-evidence gate — all unchanged.
3. **Agent activation is silent in `--quick` modes.** preflight `--quick`, jira-compare warmup-only, design-critique single-screenshot mode → skip the activation lines (the agent is still loaded but the announce is suppressed to keep `--quick` actually quick).
4. **One activation line per agent per phase.** Re-loading the same agent in a later phase requires a fresh activation line; mention the previous phase for context.
5. **CLAUDE.md guardrails always win.** If an agent's persona conflicts with a CLAUDE.md lesson (e.g. an agent suggests adding Notion to Projects), the CLAUDE.md ban wins. Agent personas are advisory, CLAUDE.md is law.

---

## Productivity multiplier (why this matters)

| Skill alone | Skill + agents | Delta |
|---|---|---|
| preflight: 1 generalist running all phases | preflight: named specialist per phase, council pre-staffed | ~3× faster Phase 1 + 2 |
| design-intelligence: 8-master council, single voice synthesis | + frontend-developer + a11y-auditor injected per finding | ~2× tighter "what to fix" instructions |
| design-critique: heuristic scoring + council pre-scan | + a11y-auditor automatically scoring H4–H10 | ~2× confidence on closure |
| jira-compare: 3 lanes, single voice | + jira-workflow-steward in Lane B + reality-checker at CRUD gate | catches lane-disagreement faster, ~5 cycles → ~3 cycles |

**Expected combined: 5–10× wall-clock faster on Standard surfaces, larger on High-stake.**

---

## Optional auto-load hook (additive 4-line block for each SKILL.md)

If you want the rosters loaded automatically whenever a skill activates, paste this block at the END of each `SKILL.md` (no other edits):

```markdown
---

## Agent Roster (companion)

When this skill activates, also load `AGENT_ROSTER.md` from this directory and follow its activation-notification protocol. The roster is purely additive and does not change any instruction in this file. See `.claude/skills/AGENT_PIPELINE.md` for the cross-skill rules.
```

This hook is OPTIONAL. If you don't paste it, the rosters still work — invoke them with: *"load AGENT_ROSTER.md for this skill and follow it"*.
