# Catalyst skill & agent stack — README

A single reference for everything in `.claude/skills/` and `~/.claude/agents/`. Read this first if you've never touched the agent stack before.

---

## TL;DR (60 seconds)

You have **5 skills** and **184 agent personas**.

- **Skills** are workflows. Each has a SKILL.md with a multi-phase pipeline, gates, and triggers. Think: "the recipe."
- **Agents** are personas. Each has a single .md file with a role, voice, and process. Think: "the specialist who follows the recipe."
- The top-level skill is **`/catalyst-agent`** (or `/agent`). It probes Jira + Catalyst first, decides what's broken, picks which other skill(s) to invoke, and selects which agents run the work.

Default entry point for any Catalyst task: **`/agent <free-form task>`**.

---

## The 5 skills at a glance

| Skill | Purpose | Trigger | First action | Wrappers it can call | Output |
|---|---|---|---|---|---|
| **`/catalyst-agent`** | Probe-first router. Reads Jira + Catalyst state, picks wrappers + agents from real evidence | `/agent <task>`, `/catalyst-agent <task>` | MCP probe (Atlassian + Chrome + Supabase) | preflight, jira-compare, design-intelligence, design-critique | Routing block + probe evidence + agent activations |
| **`/preflight`** | Thorough 8-phase planner with 17-advisor council on high-stake | `/preflight <topic>`, `/plan-it`, "preflight this" | Memory bootstrap from Obsidian + CLAUDE.md | None (it IS the wrapper) | Phased plan + handover note |
| **`/jira-compare`** | 3-lane parity audit (Jira vs Catalyst) with CRUD acceptance gate | `/jira-compare <surface>`, "compare to jira" | DOM + schema probe | None (called BY others) | Diff table + SVG red arrows |
| **`/design-intelligence`** | 1000-IQ design audit ring-fenced to Atlassian Design System | `/design-intelligence <surface>`, "audit design" | ADS-token scan + Foundation Council (7 design masters) | None | Design Intelligence Brief v3 |
| **`/design-critique`** | 10-heuristic UX/UI scoring (Nielsen + ADS) | `/design-critique`, "review this design" | Heuristic walkthrough | None | Findings table + severity ratings (P0/P1/P2) |

### Skills compose, they don't compete

```
/agent "fix the dynamic table sort"
   ↓
[catalyst-agent: probe Jira + Catalyst + codebase]
   ↓
[gap report: useMemo bug + missing Sprint column]
   ↓
[router picks: preflight (Phase 0.5) → jira-compare (CRUD gate)]
   ↓
[preflight runs with probe pre-loaded — skips its own evidence acquisition]
   ↓
[jira-compare confirms the fix via 3-lane DOM + schema + CRUD test]
   ↓
[evidence-collector takes before/after screenshots]
   ↓
[code-reviewer gates the PR]
```

---

## The 184 agents at a glance

Installed at `~/.claude/agents/`. Organized by category prefix.

### Top-tier for Catalyst (the router picks from these most)

| Role | Agent |
|---|---|
| UI implementer | `engineering-frontend-developer` |
| Backend implementer | `engineering-backend-architect` |
| Schema / RLS | `engineering-database-optimizer` |
| Security | `engineering-security-engineer` |
| Code review gate | `engineering-code-reviewer` |
| Codebase trace | `engineering-codebase-onboarding-engineer` |
| Smallest correct change | `engineering-minimal-change-engineer` |
| Catch-all senior | `engineering-senior-developer` |
| Architecture decisions | `engineering-software-architect` |
| Git / PR ceremony | `engineering-git-workflow-master` |
| Documentation / lessons | `engineering-technical-writer` |
| Design lead | `design-ui-designer` |
| Information architecture | `design-ux-architect` |
| User research | `design-ux-researcher` |
| ADS conformance | `design-brand-guardian` |
| Visual evidence narration | `design-visual-storyteller` |
| Inclusion overlay | `design-inclusive-visuals-specialist` |
| Layer-ambiguous bug verifier | `testing-reality-checker` |
| Before/after screenshots | `testing-evidence-collector` |
| WCAG 2.1 AA gate | `testing-accessibility-auditor` |
| Vitest/Playwright triage | `testing-test-results-analyzer` |
| CRUD verification | `testing-api-tester` |
| Performance probe | `testing-performance-benchmarker` |
| Jira metadata expert | `project-management-jira-workflow-steward` |
| MCP tool builder | `specialized-mcp-builder` |
| Fallback orchestrator | `agents-orchestrator` |

### Categories (counts)

```
engineering   29   (Catalyst dev core)
design         8   (operational design pairings)
testing        8   (verifiers, always-on)
project        6   (Jira workflow steward + 5 PM agents)
product        5   (PM strategy)
specialized   11   (chief-of-staff, mcp-builder, etc.)

— Out of Catalyst scope but reachable via --agents <name> —
marketing    30   (Reddit, TikTok, SEO, etc.)
sales        10
paid-media    7
finance       5
academic      5
support       6
healthcare    2
legal         3
game/3D      17   (unreal, unity, godot, xr, roblox, blender)
singletons   ~30  (accounts-payable, translator, zk-steward, etc.)
```

Full index with relevance flags: `.claude/skills/catalyst-agent/INDEX.md`.

---

## When to use which skill

```
                  ┌──────────────────────────────────┐
                  │ Have a Catalyst task?            │
                  └────────────────┬─────────────────┘
                                   │
                  ┌────────────────┴─────────────────┐
                  │ Do you know exactly which skill  │
                  │ you need?                        │
                  └────────────────┬─────────────────┘
                                   │
                  ┌──────NO────────┴──────YES─────────┐
                  ▼                                    ▼
        ┌─────────────────┐               ┌──────────────────────┐
        │ /agent <task>   │               │ Pick directly:       │
        │                 │               │                      │
        │ Probes Jira     │               │ deep plan / council  │
        │ + Catalyst,     │               │   → /preflight       │
        │ picks the right │               │                      │
        │ wrapper + agents│               │ pure parity audit    │
        │                 │               │   → /jira-compare    │
        │ Best default.   │               │                      │
        └─────────────────┘               │ design audit         │
                                          │   → /design-intelligence │
                                          │                      │
                                          │ heuristic scoring    │
                                          │   → /design-critique │
                                          └──────────────────────┘
```

### Cheatsheet

| Task type | Best entry point |
|---|---|
| "Fix the X bug" | `/agent` |
| "Add a new admin page" | `/agent` (will pick preflight full + ADS validator) |
| "Plan the Projects hub v2 rebuild" | `/preflight` direct (you want the council) |
| "Does this match Jira?" | `/agent` or `/jira-compare` direct |
| "Audit ADS compliance on this surface" | `/design-intelligence` direct |
| "Is this UX good?" | `/design-critique` direct |
| "What's the actual gap between Catalyst and Jira on detail view?" | `/agent --probe-only` |
| One-line typo / rename | direct edit, no skill |

---

## The activation pipeline (what you see on screen)

Every skill that runs prints the same activation block format. See `.claude/skills/AGENT_PIPELINE.md` for the full spec.

```
🤖 AGENT ACTIVATED — <agent-name>
   ← invoked by: <skill-name> · <phase-id> (<phase-label>)
   role: <one-sentence role>
```

When `/catalyst-agent` runs, you also see:

```
🧭 ROUTING — /catalyst-agent
🔍 MCP PROBE — what's actually on Jira vs Catalyst
📊 GAP REPORT
🤖 AGENTS ACTIVATED FOR THE FIX — N
```

This is the contract. Every skill follows it so the chat stays scannable.

---

## File map — where everything lives

```
.claude/skills/
├── README.md                              ← this file
├── AGENT_PIPELINE.md                      ← activation line protocol (shared by all skills)
│
├── catalyst-agent/                        ← /agent and /catalyst-agent (router)
│   ├── SKILL.md                           ← 9-step probe-first pipeline
│   ├── ROUTER.md                          ← Probe Matrix + Implementer Matrix
│   ├── INDEX.md                           ← all 184 agents categorised
│   └── PREFLIGHT_VS_AGENT.md              ← /preflight vs /catalyst-agent comparison
│
├── preflight/                             ← /preflight (deep planner)
│   ├── SKILL.md                           ← 8 phases + 17-advisor council
│   ├── MATRIX.md                          ← surface→skill mapping
│   ├── RUBRIC.md                          ← trivial/standard/high-stake classifier
│   ├── AGENT_ROSTER.md                    ← baseline agent picks per phase
│   ├── active/                            ← in-flight handover docs
│   └── references/                        ← JIRA_ARCHITECT.md, LEARNING_ENGINE.md
│
├── design-intelligence/                   ← /design-intelligence (ADS audit)
│   ├── SKILL.md                           ← Foundation Council protocol
│   └── AGENT_ROSTER.md                    ← pre-scan + augment + brief lineup
│
└── design-critique/                       ← /design-critique (10-heuristic scoring)
    ├── SKILL.md                           ← heuristic walkthrough
    └── AGENT_ROSTER.md                    ← 10 heuristics × named owners

~/.claude/agents/                          ← 184 agent persona .md files
~/.claude/skills/jira-compare/             ← /jira-compare (global, not project-local)
   ├── SKILL.md
   ├── CLAUDE.md
   ├── AGENT_ROSTER.md                     ← 3 lanes + CRUD gate + loop
   ├── assets/
   └── references/
```

---

## Hard rules across all skills (from CLAUDE.md)

1. **Port 8080 lock.** Any plan referencing 8081 → halt.
2. **No `preview_*` tools.** Chrome MCP only for live DOM.
3. **TDD non-negotiable.** Failing test row precedes implementation.
4. **ADS gate.** Any UI plan must include `ads-validator`.
5. **Ask-before-add/remove.** Explicit row for any user-visible field/component change.
6. **Lovable SQL only.** All schema changes manual paste, never autonomous execution.
7. **Jira parity.** Any UI feature needs `jira-compare` before "done".
8. **Phase 0.5 always.** 28 anti-patterns scanned on every Standard/High-stake task.
9. **No bans bypassed.** MDT Ref / Story Points / Notion in Projects / Service Now# / Assessment Feature / AI Sparkles button / Development section / Automation section / Automate ⚡ — all permanently off-limits.

---

## How to extend

### Add a new task type to `/catalyst-agent`

Edit `.claude/skills/catalyst-agent/ROUTER.md`. Add a row to:

- **Probe Matrix** if it changes WHAT to probe (Lane A/B/C/D)
- **Implementer Matrix** if it changes WHO fixes the gap

Cite the CLAUDE.md anchor in the new row. No code change.

### Add a new CLAUDE.md lesson

The lesson should append to project `CLAUDE.md`. If it generalises to a new agent activation pattern, also add a matrix row in ROUTER.md.

### Add a new skill

Use the `hermes-skill` skill (`/hermes-skill`). It scaffolds SKILL.md frontmatter, triggers, output format, and links into the existing pipeline.

### Add a new agent persona

Drop a new `.md` file into `~/.claude/agents/` following the existing format. Update `.claude/skills/catalyst-agent/INDEX.md` to flag its Catalyst-relevance.

---

## Common questions

**Q: Do I need to invoke skills in order?**
A: No. `/agent` figures out the order automatically. Direct invocation runs that one skill standalone.

**Q: Can I run multiple agents in parallel?**
A: Phase 1 (preflight) and probe step (catalyst-agent) run lanes in parallel. Council deliberations run sequentially.

**Q: What happens if MCP servers are down?**
A: `/catalyst-agent` marks the affected lane as `partial` and continues with what's available. `/preflight` falls back to memory-only mode (Phase 1 skipped). The activation block always shows lane status.

**Q: Where do CLAUDE.md lessons get applied?**
A: Step 2 of `/catalyst-agent` (ban check) and Phase 0.5 of `/preflight` (28-pattern scan).

**Q: How do I see what's actually running?**
A: Every agent prints the activation line. Look for `🤖 AGENT ACTIVATED — <name>` in the chat.

**Q: Can I force a specific agent?**
A: `/catalyst-agent --agents <a,b,c> <task>` — bypasses the router's selection.

**Q: Is there a dry-run mode?**
A: `/catalyst-agent --dry-run <task>` — runs probe + emits routing decision, does NOT hand off.

---

## See also

- `.claude/skills/catalyst-agent/SKILL.md` — full pipeline definition
- `.claude/skills/catalyst-agent/ROUTER.md` — decision matrices
- `.claude/skills/catalyst-agent/INDEX.md` — all 184 agents categorised
- `.claude/skills/catalyst-agent/PREFLIGHT_VS_AGENT.md` — comparison + composition
- `.claude/skills/AGENT_PIPELINE.md` — activation line protocol
- `CLAUDE.md` (project root) — gates, bans, lessons (source of truth)
