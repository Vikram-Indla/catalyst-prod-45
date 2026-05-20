---
name: context-guard-spec
version: 1.0.0
description: >-
  Context window depletion protocol for /catalyst-agent v3. Defines proxy
  heuristics for 70% and 90% thresholds, the automatic /obsidian save + HANDOVER
  BLOCK protocol at 90%, and phase-boundary check schedule.
---

# CONTEXT_GUARD.md — Context Window Depletion Protocol

This file is a Continuous Duty (Directive 4 in CORE_DIRECTIVES.md). It runs throughout
every /catalyst-agent session. The agent checks these thresholds at every phase boundary.

---

## 1. Detection Heuristics

Claude cannot read its exact token count. Use these proxy signals:

### 70% Warning threshold (any 2 of 4 active)

| Signal | Threshold |
|--------|-----------|
| Components probed | >= 3 |
| Pipeline phases completed | >= 4 of 11 |
| Re-probe cycles | >= 2 |
| Total gap rows in tables | >= 30 |

### 90% Emergency threshold (any of these active)

| Signal | Threshold |
|--------|-----------|
| Implement→verify cycles | >= 2 completed |
| ALL four 70% signals active simultaneously | — |
| Response is visibly truncating mid-sentence | — |
| Agent is unable to recall earlier probe results from this session | — |

---

## 2. 70% Warning Block

Emit this block inline when 70% is detected:

```
⚠️  CONTEXT GUARD — 70% WARNING
    Proxy signals: [list which signals triggered]
    Recommendation: complete current component before starting next
    /obsidian save available when ready for a handover checkpoint
    Continuing...
```

Then continue the current task. Do NOT stop or save automatically at 70%.

---

## 3. 90% Emergency Protocol (4 steps — execute in order)

When 90% is detected, STOP the current task and execute all 4 steps:

### Step 1 — Announce

```
🔴 CONTEXT GUARD — 90% EMERGENCY
   Proxy signals: [list which signals triggered]
   STOPPING current task. Saving handover now.
   Do NOT continue until you receive the handover block below and confirm.
```

### Step 2 — /obsidian save

Invoke the `/obsidian save` skill with the current branch and progress estimate.
This writes a structured handover to `.claude/obsidian-handovers/[branch-name].md`.

### Step 3 — Generate HANDOVER BLOCK

Output this block immediately after the save. It must be COPY-PASTEABLE as the
first message of the next conversation to resume without any manual reconstruction:

```
╔══════════════════════════════════════════════════════════════════╗
║  CATALYST-AGENT HANDOVER — copy-paste into next conversation     ║
╠══════════════════════════════════════════════════════════════════╣
║  /obsidian branch [NN]                                           ║
║                                                                  ║
║  Branch: [branch-name]                                           ║
║  Surface: [surface URL path]                                     ║
║  Session phase when saved: Step [N] — [phase name]              ║
║                                                                  ║
║  GAP REPORT STATUS:                                              ║
║  Component 1 — [Name]: [N] gaps, [N] fixed, [N] open            ║
║  Component 2 — [Name]: [N] gaps, [N] fixed, [N] open            ║
║  [repeat per component]                                          ║
║                                                                  ║
║  ADS SCAN STATUS:                                                ║
║  [N] violations found, [N] fixed, [N] open                      ║
║                                                                  ║
║  OPEN GAP ROWS (pick up here):                                   ║
║  [paste the remaining rows from the gap report table]            ║
║                                                                  ║
║  EXACT RESUME POINT:                                             ║
║  [one sentence: "Resume at Step N — [what to do next]"]          ║
║                                                                  ║
║  FILES CHANGED THIS SESSION:                                     ║
║  [list file paths]                                               ║
║                                                                  ║
║  UNCOMMITTED WORK: [yes/no — describe if yes]                   ║
╚══════════════════════════════════════════════════════════════════╝
```

### Step 4 — Explain to user

```
Handover saved. The block above is self-contained — paste it as your FIRST message
in the next conversation. Claude will call /obsidian branch [NN] which reads CLAUDE.md
first, then restores full session context.

To resume: paste the handover block → /obsidian branch [NN] triggers automatically.
```

---

## 4. Phase Boundary Check Schedule

The context guard checks proxy signals at these mandatory checkpoints:

| Checkpoint | Before Step | Why |
|-----------|-------------|-----|
| A | Step 4 (MCP Probe) | Probe output is large — check before expanding context further |
| B | Step 4.5 (ADS Scan) | ADS scan adds more findings — check before adding scan output |
| C | Step 6 (Implementation) | Implementation is the most context-heavy phase |
| D | Step 8 (Screenshot Evidence) | After fixes are in — good natural save point |
| E | Step 9 (Loop/Re-probe) | Re-probe multiplies context — check before looping |

---

## 5. Extra /obsidian Fields for Catalyst-Agent Sessions

When `/obsidian save` is invoked from a catalyst-agent session, the handover document
MUST include these extra fields (beyond the standard obsidian format):

```yaml
# Extra catalyst-agent fields in obsidian handover frontmatter:
catalyst_agent_session: true
probe_envelope:
  jira_surface: "[URL]"
  catalyst_surface: "[URL]"
  probe_lanes_completed: [A, B, C, D]
gap_report_tables: "[pasted as markdown tables]"
ads_violations:
  found: N
  fixed: N
  open: N
screenshot_paths: ["[path1]", "[path2]"]
session_phase_at_save: "Step N — [phase name]"
resume_instruction: "[one sentence]"
```

---

## 6. Interaction with Green Signal Gate

The context guard NEVER overrides the Green Signal gate (Directive 2).

- If the guard fires at 90% BEFORE the Green Signal is reached → save handover, stop. The next session must complete the probe before implementing.
- If the guard fires at 90% DURING implementation → save handover, stop mid-implementation is OK. The next session picks up from the exact resume point.
- The handover BLOCK explicitly states which step the session was at when saved, so the next session knows whether to probe first or continue implementing.

---

## See Also

- `SKILL.md` — Continuous Duty A references this file
- `CORE_DIRECTIVES.md` — Directive 4 mandates this protocol
- `GAP_REPORT.md` — HANDOVER BLOCK includes gap report tables in its format
- `.claude/skills/obsidian/SKILL.md` — the /obsidian save/branch commands
