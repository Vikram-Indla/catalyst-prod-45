# Design Intelligence v3 — Agent Roster

**Companion to `SKILL.md`.** Adds named agents from `~/.claude/agents/` per phase. The 7 design masters (Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper) and the AtlasKit Platform Architect remain canonical and cannot be replaced. Agents AUGMENT specific lenses or run mechanical phases (pre-scan, arrow injection, brief production).

Always emit the activation line from `.claude/skills/AGENT_PIPELINE.md` before each agent does work.

---

## Lessons-Applied Pre-Scan

| Agent | Role |
|---|---|
| `engineering-codebase-onboarding-engineer` | Read all relevant CLAUDE.md anchors and `references/JIRA_ARCHITECT.md` patterns; emit the pre-scan violation list |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-codebase-onboarding-engineer
   ← invoked by: design-intelligence · Lessons-Applied Pre-Scan
   role: read CLAUDE.md anchors + JIRA_ARCHITECT.md patterns; emit pre-scan list
```

The pre-scan output feeds DIRECTLY into the council per `SKILL.md` — unchanged.

---

## Foundation Council (8 advisors UNCHANGED)

The council membership in `SKILL.md` is law:

- Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper · AtlasKit Platform Architect

**No agent replaces a master.** The following augments are CONSULTED by the chairman after the council's votes are in, only when the chairman explicitly requests a deeper read on one lens:

| Lens (master) | Optional augment agent | When to consult |
|---|---|---|
| Saffer (interaction model) | `design-ux-architect` | Augment when finding involves IA / multi-step task flow |
| Norman (cognitive load) | `testing-accessibility-auditor` | Augment when finding involves contrast / focus / keyboard |
| Rams (less but better) | `design-brand-guardian` | Augment when finding involves token drift |
| Cooper (goal-directed) | `design-ux-researcher` | Augment when finding involves user-goal/persona |
| AtlasKit Architect | `engineering-frontend-developer` | Augment when finding lists a specific ADS component swap |

Activation line (single line at council start, lists augments only — masters are canonical and NOT re-announced):
```
🤖 COUNCIL AUGMENTS — 5 optional agents on standby (chairman calls them in as needed)
   design-ux-architect, testing-accessibility-auditor, design-brand-guardian,
   design-ux-researcher, engineering-frontend-developer
   ← invoked by: design-intelligence · Foundation Council
   masters UNCHANGED: Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper · AtlasKit Architect
```

When the chairman actually consults an augment for a finding, emit a one-line nested call:
```
   ↳ chairman consults testing-accessibility-auditor for finding #N (Norman lens, contrast)
```

---

## SVG Arrow Injection (mandatory per SKILL.md)

| Agent | Role |
|---|---|
| `testing-evidence-collector` | Execute the 4-step injection protocol from `SKILL.md` (Navigate → Probe → Inject → Auto-green) |

Activation line:
```
🤖 AGENT ACTIVATED — testing-evidence-collector
   ← invoked by: design-intelligence · SVG Arrow Injection
   role: discovery + progress + auto-green arrow injection per SKILL.md protocol
```

The toggle button + session-resume continuity rules from `SKILL.md` are unchanged.

---

## Brief Production

| Agent | Role |
|---|---|
| `engineering-technical-writer` | Format the Design Intelligence Brief v3.0 per the structure in `SKILL.md` (sections 1–N) |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-technical-writer
   ← invoked by: design-intelligence · Brief Production
   role: render the Brief v3.0 in the canonical structure from SKILL.md
```

---

## Mode-specific notes

- **Manual `/design-intelligence [surface]`**: full pipeline, all activations announced.
- **Auto-fire from preflight Phase 1**: pre-scan + council activate normally; the SVG arrow injection is shared with the parent preflight Phase 5 — the evidence-collector is announced once by whichever skill calls it first, and re-uses its output.
- **Session-resume**: re-inject the FULL violation list per `SKILL.md` rule. The pre-scan agent still announces; the council re-runs only on items not yet flipped to `fixed: true`.
