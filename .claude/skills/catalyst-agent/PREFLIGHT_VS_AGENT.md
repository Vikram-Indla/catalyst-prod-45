# `/preflight` vs `/catalyst-agent` — when to use which, how they compose

Both skills exist for Catalyst engineering. They are NOT competing. They sit at different layers and chain when needed.

---

## The one-line answer

- **`/preflight`** is a thorough 8-phase planner with a 17-advisor council. It reads CLAUDE.md and writes a plan.
- **`/catalyst-agent`** is a probe-first router. It opens Atlassian MCP + Chrome MCP, sees what's actually on Jira vs Catalyst, then picks which wrapper skill(s) and agents to invoke based on the real gap.

`/catalyst-agent` sits **upstream** of `/preflight` and often invokes it as one of its possible wrappers.

---

## Side-by-side comparison

| Dimension | `/preflight` | `/catalyst-agent` |
|---|---|---|
| **Primary purpose** | Plan a Catalyst task end-to-end | Route a Catalyst task to the right wrapper + agents based on live evidence |
| **First action** | Memory bootstrap from Obsidian + CLAUDE.md | MCP probe of Jira + Catalyst (read-only) |
| **MCP usage** | Optional, only during Phase 1 evidence acquisition | Mandatory at step 4 — probe-first is the whole point |
| **Output** | 8-phase plan + handover note + (if high-stake) 17-advisor council verdict | Routing decision + probe evidence + gap report + 1-5 agent activations |
| **Wall-clock time** | 10-30 min for full pipeline (council + plan + handover) | 2-3 min probe + hand-off to wrapper(s) |
| **Council** | Mandatory on high-stake (17 advisors across 3 panels) | Skipped — defers to wrapped skill's council if needed |
| **Wrappers it can call** | None (it IS the wrapper) | preflight, jira-compare, design-intelligence, design-critique |
| **Best input** | Surface name + topic ("Backlog v2 hub rebuild") | Free-form task ("fix the dynamic table sort") |
| **When task is ambiguous** | Asks clarifying questions, runs RUBRIC.md classifier | Probes first to discover the actual gap, then routes |
| **Output style** | Long-form markdown plan with 7-column row table | Single activation block with probe evidence + agent list |
| **Trigger** | `/preflight`, `/plan-it`, "preflight this", "plan this" | `/catalyst-agent`, `/agent`, "1000 IQ this" |

---

## When to use which

### Use `/preflight` alone when:

- You already know the surface and want the full 8-phase ceremony
- High-stake work where the 17-advisor council adds value (architecture decisions, major refactors)
- Starting a new hub / new project rebuild
- Producing a handover document for next session
- Pressure-testing a non-obvious design decision

**Example:** `/preflight rebuild the Projects hub with new sidebar architecture`

### Use `/catalyst-agent` alone when:

- You don't know which wrapper to invoke
- You want the system to figure out what's actually broken via MCP probe before doing anything
- One-liner pain points: "fix X", "audit Y", "improve Z"
- The task wording could mean multiple things and you want evidence to disambiguate

**Example:** `/agent the dynamic table sort is broken`

### Use them together when:

- Non-trivial fix with both UI and parity dimensions
- `/catalyst-agent` does the upfront probing + decides preflight is the right wrapper
- preflight runs its phases with the probe evidence pre-loaded (Phase 1 is shorter because the work is already done)

**Example flow:**

```
/agent fix the dynamic table sort
   ↓
[probe Jira + Catalyst + codebase]
   ↓
[gap: useMemo dep bug + missing Sprint column]
   ↓
[route: preflight (Phase 0.5 with pre-loaded probe) → jira-compare (CRUD gate)]
   ↓
[fix lands with full pipeline benefits, but probe wasn't re-done]
```

---

## What about `/jira-compare`, `/design-intelligence`, `/design-critique`?

These are wrapped skills. You CAN invoke them directly when:

- `/jira-compare <surface>` — pure parity audit, no fix work, just diff
- `/design-intelligence <surface>` — pure design audit, no functional work
- `/design-critique <surface>` — heuristic UX/UI scoring

But the typical entry point is `/catalyst-agent`, which decides which one(s) to invoke based on the probe.

---

## How they avoid re-doing each other's work

Probe context envelope:

```
{
  "lane_a_jira": { "screen_scheme": ..., "fields": [...], ... },
  "lane_b_catalyst": { "computed_style": ..., "dom": ..., ... },
  "lane_c_supabase": { "tables": [...], "rls": [...], ... },
  "lane_d_codebase": { "files_traced": [...], "anchors": [...] },
  "gap_report": { "missing": [...], "wrong": [...], ... },
  "captured_at": "<ISO>"
}
```

When `/catalyst-agent` hands off to `/preflight`:

- preflight Phase 0.5 reads `gap_report` directly → skips its own Jira Architect scan
- preflight Phase 1 reads `lane_a_jira` + `lane_b_catalyst` → skips re-probing
- preflight Phases 2-7 run normally

When `/catalyst-agent` hands off to `/jira-compare`:

- jira-compare Lane A (Chrome MCP) reads `lane_b_catalyst` → skips DOM re-probe
- jira-compare Lane B (Atlassian MCP) reads `lane_a_jira` → skips schema re-probe
- jira-compare Lane C runs fresh (Lovable / Supabase mutation) — this is the CRUD acceptance test
- 5-cycle cap still applies

This is the value of probe-first routing — the probe is done once at the top, and downstream wrappers consume it. No duplicated MCP calls, no re-running getComputedStyle on the same DOM node 4 times.

---

## Composition patterns by task type

| Task type | Recommended entry point | Composition |
|---|---|---|
| Quick UI bug fix | `/agent` | catalyst-agent → preflight (Phase 0.5) → jira-compare (CRUD) |
| New feature implementation | `/agent` or `/preflight` | catalyst-agent → preflight (full) → jira-compare (full) |
| Refactor consolidation | `/agent` | catalyst-agent → preflight (full) → regression-sweep |
| Pure visual audit | `/agent` | catalyst-agent → design-intelligence → design-critique |
| Accessibility sweep | `/agent` | catalyst-agent → design-critique (a11y lens) |
| Schema migration | `/agent` | catalyst-agent → preflight (Phase 0.5) → Lovable SQL paste |
| Hub rebuild planning | `/preflight` direct | preflight (full + council) — no catalyst-agent needed |
| One-off "is the deploy live?" | direct shell / direct Bash | Neither — too small |

---

## TL;DR

```
/preflight     = plan thoroughly (8 phases, 17 advisors, long-form)
/catalyst-agent = route smartly (probe first, pick wrappers, short-form)

Most of the time: use /agent. It will call /preflight if needed.
Specific use case (deep architecture work): use /preflight directly.
```

---

## See also

- `SKILL.md` — /catalyst-agent pipeline (9 steps)
- `ROUTER.md` — Probe Matrix + Implementer Matrix
- `INDEX.md` — all 184 agents categorised
- `../preflight/SKILL.md` — Phase 0-7 definition
- `../preflight/RUBRIC.md` — tier classification (trivial / standard / high-stake)
- `../AGENT_PIPELINE.md` — shared activation line format
