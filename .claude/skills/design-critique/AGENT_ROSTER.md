# Design Critique — Agent Roster

**Companion to `SKILL.md`.** Adds named agents from `~/.claude/agents/` per phase. The 10 heuristics, the 500-IQ Foundation Council Pre-Scan, the Red→Green arrow protocol, the closure-evidence gate — all unchanged. This roster only ASSIGNS named specialists to mechanical phases and to specific heuristics where a topic-expert dramatically tightens the score.

Always emit the activation line from `.claude/skills/AGENT_PIPELINE.md`.

---

## Soft Announcement (mandatory per SKILL.md)

No agent. The skill's own announcement template fires first.

---

## 500-IQ Foundation Council Pre-Scan

The pre-scan is run via `design-intelligence v2`'s council per `SKILL.md`. Agent augments are inherited from `.claude/skills/design-intelligence/AGENT_ROSTER.md` — see that file for the augment table.

Activation line (one line, references the inherited roster):
```
🤖 COUNCIL PRE-SCAN — running design-intelligence council with its own augment roster
   ← invoked by: design-critique · 500-IQ Council Pre-Scan
   see: .claude/skills/design-intelligence/AGENT_ROSTER.md for augment list
```

Council findings DIRECTLY drive heuristic scores per `SKILL.md` (Raskin P0 → H3=0/3, Cooper P0 → H10=0/3, etc.). That gating is unchanged.

---

## Heuristic Scoring (10 H's)

Specific heuristics get a named agent owner. The agent does NOT score on its own — it advises the scorer with a focused signal. The scorer remains the skill itself.

| Heuristic | Owning agent | What the agent contributes |
|---|---|---|
| H1 — Visual hierarchy | `design-ui-designer` | Spacing / size / weight / token compliance |
| H2 — Information density | `design-visual-storyteller` | Tufte data-ink lens for ratio scoring |
| H3 — Consistency / mode safety | `design-ux-architect` | Mode-trap detection (Raskin lens) |
| H4 — Accessibility (contrast) | `testing-accessibility-auditor` | WCAG 2.1 AA contrast ratios |
| H5 — Accessibility (keyboard) | `testing-accessibility-auditor` | Tab order, focus traps, escape capture (CLAUDE.md WatchersChip pattern) |
| H6 — Error / empty / loading states | `design-ui-designer` | State coverage matrix |
| H7 — Microcopy | `engineering-technical-writer` | Sentence case, no jargon, action verbs |
| H8 — Discoverability | `design-ux-researcher` | Self-labelling vs colour-recall (CLAUDE.md JiraIssueTypeIcon pattern) |
| H9 — Performance (perceived) | `testing-performance-benchmarker` | LCP / INP / interaction lag |
| H10 — Goal completion | `design-ux-researcher` | Cooper goal-directed lens (empty-state CTAs) |

Activation block at start of heuristic scoring:
```
🤖 HEURISTIC SCORING — 7 unique agent advisors engaged
   H1, H6:        design-ui-designer
   H2:            design-visual-storyteller
   H3:            design-ux-architect
   H4, H5:        testing-accessibility-auditor
   H7:            engineering-technical-writer
   H8, H10:       design-ux-researcher
   H9:            testing-performance-benchmarker
   ← invoked by: design-critique · Heuristic Scoring
```

Per-heuristic hand-off lines are SUPPRESSED; emit only the block above plus a single `✅ HEURISTIC SCORING — done` at the end.

---

## Closure Evidence (mandatory gate per SKILL.md)

| Agent | Role |
|---|---|
| `testing-evidence-collector` | Capture before / after / annotated screenshots; generate the closure block per `SKILL.md` |

Activation line:
```
🤖 AGENT ACTIVATED — testing-evidence-collector
   ← invoked by: design-critique · Closure Evidence
   role: produce annotated before/after closure block per SKILL.md
```

The closure-evidence gate from `SKILL.md` is unchanged — no surface is "done" without this block.

---

## Mode-specific overrides

- **Single-screenshot mode**: skip Council Pre-Scan; skip H9 (perf needs live page). All other agents activate normally.
- **Comparative mode (Catalyst vs Jira)**: pair every H4/H5 activation with a `jira-compare` Lane B reading from `project-management-jira-workflow-steward`.
