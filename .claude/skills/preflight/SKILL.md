---
name: preflight
version: 3.0.0
description: >-
  1000-IQ Universal pre-flight planner for Catalyst engineering tasks.
  Phase 0: multi-source memory bootstrap (Obsidian-primary) with port-8080
  lock. Phase 0.5: always-on Jira Architect Scan (28 patterns, even for
  unrelated tasks). Phase 1: 4-lane evidence acquisition. Phase 2: 3-panel
  1000-IQ council (Design Foundation ×7 + Atlassian Architect ×5 +
  Engineering ×5). Phase 3: plan synthesis with mandatory rows. Phase 4:
  execution loop with auto-commit/PR on Vikram confirmation. Phase 5: visual
  evidence (SVG arrows mandatory). Phase 6: learning engine (lesson
  extraction, Obsidian orchestration, JIRA_ARCHITECT.md self-update).
  Phase 7: Obsidian handover + gh PR creation. Triggers on /preflight,
  /plan-it, "preflight this", "plan this".
author: Vikram × Claude, 2026-05-10
metadata:
  category: planning
  tags: [preflight, planning, 1000iq, atlassian, ads, jira-architect, learning-engine, obsidian]
  maturity: stable
  iq_level: 1000
  design_system: Atlassian Design System (https://atlassian.design/)
---

# /preflight v3 — 1000-IQ Catalyst Engineering Planner

Your job is to classify, plan, and gate. Not to execute. Execution happens in subsequent turns.

---

## Triggers

- `/preflight [topic]` — full pre-flight.
- `/preflight --council [topic]` — force council on Standard tasks.
- `/preflight --quick [topic]` — skip Phase 0 bootstrap; plan-only mode.
- `/preflight --handover` — Phase 7 only; produce/update handover note.

---

## Phase 0 — Memory Bootstrap

> Always runs unless `--quick`. Multi-source, ordered. Obsidian is primary.

### Step 1 — Multi-source load (in this order)

1. **Obsidian primary:** Read `~/.claude/projects/*/memory/*.md` — these are the most current lessons written by the learning engine. List each file found.
2. **Active handover:** Scan `active/preflight-handover-*.md` for the most recent file. If it covers the same surface → summarise its progress state and any `## Lessons candidates` sections awaiting Vikram approval. Surface pending lesson approvals immediately.
3. **CLAUDE.md gates:** Read project `CLAUDE.md`. Quote the most relevant gates verbatim (TDD, small-steps, ADS-only, jira-compare, ask-before-add, ban list, recent lessons). This is the authoritative rule source.
4. **Skill inventory:** List available skills that satisfy the MATRIX.md rows for this task's surface.

### Step 2 — Port 8080 LOCK (enforced from this moment)

```
⚠️ PORT LOCK ACTIVE: localhost:8080 is the only permitted Catalyst dev server.
Any plan row referencing localhost:8081 or any other port → HALT.
Claude preview tools (preview_start, preview_screenshot, preview_eval, etc.) → HALT.
SQL execution via Claude tools → HALT. SQL goes to Lovable SQL editor (manual).
```

This lock stays active for the entire session. If a plan row violates it, halt that row and correct before proceeding.

### Step 3 — Classify (per RUBRIC.md)

Output verbatim:

```
Tier: <trivial | standard | high-stake>
Surface: <ui-feature | ui-bug-fix | ui-refactor | backend-migration | design-only | knowledge-save | handover | atlassian-admin | cross-cutting>
Why: <one sentence — which classifier marker fired>
```

**Trivial** → skip Phases 0.5, 1, 2. Go to Phase 3.
**Standard** → run Phases 0.5, 1; skip Phase 2 unless `--council`. Go to Phase 3.
**High-stake** → run all phases. Phase 2 full 3-panel council is mandatory.

Ship/merge on high-stake with no council transcript in `active/` from the past week → HALT. Run with `--council`.

---

## Phase 0.5 — Jira Architect Scan

> Runs on every Standard and High-stake task. Regardless of whether the task is Jira-related.
> Read `references/JIRA_ARCHITECT.md`. Run all 28 patterns against the task description and any code files mentioned.

### Scan output

```json
{
  "phase": "0.5",
  "task": "<task description>",
  "scanned_at": "<ISO timestamp>",
  "patterns_run": 28,
  "violations": [
    {
      "pattern_id": "A3",
      "name": "Colored Dots for Work Item Type",
      "severity": "P0",
      "halt": true,
      "evidence": "<what triggered this>",
      "action": "Replace with JiraIssueTypeIcon from @/lib/jira-issue-type-icons"
    }
  ],
  "halt_required": false,
  "safe_to_proceed": true
}
```

**If `halt_required: true`** → surface ALL halt violations. Do NOT proceed to Phase 1 until Vikram acknowledges each one. Fix the halt patterns, re-scan, then proceed.

**If `safe_to_proceed: true`** → append this register to the Phase 2 council prompt. Chairman must reference at least one pattern result in the verdict.

**If no violations found** → emit: `"Phase 0.5: 28 patterns scanned · 0 violations · safe to proceed."` This is still logged in the handover.

---

## Phase 1 — Evidence Acquisition

> Fires before council for all UI surfaces (ui-feature, ui-bug-fix, ui-refactor, design-only, cross-cutting).

### When Phase 1 fires (any of)

- Task contains: match, compare, parity, audit, drift, regression, diff, mirror, clone jira, align with.
- Surface ∈ `{ui-feature, ui-bug-fix, ui-refactor, design-only}`.
- Task references a BAU issue key, Jira field name, or screen scheme.
- Prior handover transcript exists for this surface (re-probe to confirm prior state).

### Four lanes (delegate, don't reimplement)

| Lane | Primitive | Output |
|---|---|---|
| A — Visual/structural | `jira-compare` (Chrome MCP DOM probe, both Jira and Catalyst) | DOM probe JSON, computed-style diff, annotated screenshots |
| B — Schema/data | Atlassian MCP: `getJiraIssueTypeMetaWithFields`, `getJiraProjectIssueTypesMetadata`, `searchJiraIssuesUsingJql` | Fields JSON, workflow states, permission schemes |
| C — Static analysis | `ads-validator` | ADS token violations with file/line refs |
| D — DOM measurements | `hermes-pixel-probe` | Spacing, typography, element dimensions |

### Evidence envelope (passed to all Phase 2 advisors)

```json
{
  "surface": "<surface>",
  "probes_run": ["jira-compare", "ads-validator", "hermes-pixel-probe"],
  "evidence": {
    "live_jira": { "...": "..." },
    "live_catalyst": { "...": "..." },
    "diff": [ "..." ],
    "ads_violations": [ "..." ],
    "schema": { "...": "..." }
  },
  "captured_at": "<ISO timestamp>",
  "jira_architect_register": { "...phase 0.5 output..." },
  "open_questions": ["<thing probes couldn't answer>"]
}
```

### Phase 1 halts

- Comparative task + NO probe results → HALT. Council cannot deliberate on assumptions for parity work.
- Probe failed (Chrome MCP unreachable) → HALT. Surface failure to user; do not substitute assumption.
- Schema probe returns "field not in screen scheme" for a field the task wants to add → HALT. Anti-pattern #18 (CLAUDE.md 2026-05-05).

---

## Phase 2 — 1000-IQ Council

**Trivial** → skip entirely.
**Standard without `--council`** → skip.
**Standard with `--council`** → Engineering Council only (3-advisor abridged: Contrarian, First Principles, Executor). One-paragraph chairman synthesis.
**High-stake** → full 3-panel council (17 advisors total). Mandatory.

Every advisor receives: Phase 1 evidence envelope + Phase 0.5 Jira Architect register.

### Panel A — Design Foundation Council (7 masters)

Each advisor is ring-fenced to ADS. Every finding must cite an ADS token, component, or guideline URL.

| Advisor | Lens | ADS anchor |
|---|---|---|
| **Saffer** | Microinteraction anatomy: Trigger → Rules → Feedback → Loop | ADS motion: cubic-bezier(0.2,0,0,1) / cubic-bezier(0.4,0,1,1) |
| **Tufte** | Data-ink ratio: every border/bg must encode hierarchy, not decoration | ADS elevation tokens |
| **Rams** | 10 principles: useful, honest, thorough, minimum design | ADS empty-state, inline-message |
| **Norman** | Affordances: ADS button appearances are the canonical signifier system | @atlaskit/button appearance props |
| **Ive** | Reduction: one ADS elevation layer per surface; ADS motion only | elevation.shadow.raised / overlay |
| **Raskin** | Hick's Law: menus > 7 items → @atlaskit/dropdown-menu groups | ADS dropdown grouping |
| **Cooper** | Goal-directed: every empty state needs a primaryAction | @atlaskit/empty-state primaryAction |

### Panel B — Atlassian Architect Council (5 specialists)

These advisors have built Jira and AtlasKit. They operate on schema, platform, and component-internals knowledge that the design council cannot see.

| Advisor | Expertise | Mandate |
|---|---|---|
| **Jira Schema Architect** | Screen schemes, field types, issue type configs, project configuration | Blocks any field add not in the screen scheme (anti-pattern #18). Must cite `getJiraIssueTypeMetaWithFields` result from Phase 1 evidence. |
| **Workflow State Machine Expert** | Jira workflows, transition conditions, post-functions, status categories | Validates every status transition. Catches impossible state changes. Must cite actual workflow from BAU project. |
| **Permission Model Specialist** | Project roles, global permissions, issue security levels, RLS, Supabase cascade | Catches 42501 errors, missing RLS child policies, and permission scheme mismatches before code is written. References JIRA_ARCHITECT W3 pattern. |
| **AtlasKit Platform Architect** | Atlaskit component internals, deprecations, known bugs, upgrade paths | Knows @atlaskit/popup empty-portal bug (A2), @atlaskit/heading size mismatch (A5), react-select import violation (A6). Flags any use of deprecated APIs. Must cite the AtlasKit package version and known issue. |
| **Accessibility & Standards Lead** | WCAG 2.1 AA, ADS color contrast ratios, keyboard navigation, focus rings, ARIA | Validates focus management, contrast ratios via ADS tokens, keyboard traps in modals, screen reader semantics. References ADS accessibility guidelines. |

### Panel C — Engineering Council (5 advisors)

| Advisor | Role |
|---|---|
| **Contrarian** | Challenges every assumption. Asks: "what if the user's framing is wrong?" |
| **First Principles** | Strips to fundamentals. What is the minimal correct implementation? |
| **Expansionist** | Considers scope creep risks. What does this unlock that we aren't ready for? |
| **Outsider** | Reviews as a new engineer with no context. What is unclear or fragile? |
| **Executor** | Blocks the plan into sequential phases with concrete test criteria. |

### Chairman synthesis — 1000-IQ verdict

The chairman MUST:
1. Cite at least one piece of Phase 1 probe evidence (file/line/computed-style/JQL result).
2. Cite at least one Phase 0.5 Jira Architect pattern result (even if all clear).
3. Reject any plan missing an `ads-validator` gate for UI tasks.
4. Reject any plan for a comparative task missing a re-probe step post-fix.
5. Reject any plan that re-introduces a CLAUDE.md banned item (MDT Ref, Service Now#, Assessment Feature, Story Points, Development section, Automation section, AI Sparkles button, Notion in Projects).
6. Output: `{verdict in 5 bullets} · Blocking issues: {N} · Recommended tier: {trivial/standard/high-stake}`

---

## Phase 3 — Plan Synthesis

Produce an ordered task list. Every row has seven columns. Downstream tooling parses this format — do not deviate.

```
| # | Task | Tool | Skill (justified) | Model | Gate | Metric |
|---|---|---|---|---|---|---|
```

### Column rules

- **Tool:** `claude-code` | `lovable-sql` | `atlassian-admin` | `manual` | `chrome-mcp`
- **Skill:** from `references/MATRIX.md`. Every skill needs a one-line justification with CLAUDE.md anchor.
- **Model:** `opus` (synthesis), `sonnet` (default implementation), `haiku` (mechanical verify). Suggestion only — harness controls the active model.
- **Gate:** which CLAUDE.md rule blocks merge at this row.
- **Metric:** what evidence proves this row succeeded.

### Mandatory rows (auto-injected, non-negotiable)

| Row type | When | Gate |
|---|---|---|
| **Failing test** | Before ANY implementation row | TDD non-negotiable, CLAUDE.md |
| **ads-validator** | Before any UI merge | CLAUDE.md 2026-04-28 |
| **ask-Vikram** | Before any add/remove of user-visible field/component | CLAUDE.md 2026-05-04 |
| **jira-compare** | Before any UI feature declared done | CLAUDE.md 2026-05-04 |
| **schema probe** | Any backend/field task | Anti-pattern #18, CLAUDE.md 2026-05-05 |
| **re-probe** | After any comparative fix | jira-compare cycle cap 5 |
| **remove banned reference** | If Phase 0.5 detected a ban violation | CLAUDE.md ban list |
| **SQL → Lovable** | Any Supabase schema change | `tool: lovable-sql, manual-required: true` |
| **ask-Vikram before merge** | End of every phase | CLAUDE.md small-steps |

If any mandatory row is missing → HALT and re-plan.

### SQL rows — mandatory format

```
| N | {description} | lovable-sql | — | — | Vikram pastes in Lovable SQL editor | SQL applied, no error |
```

Include the full SQL in a code block directly below the row. Vikram copies and pastes it. Claude does not execute SQL autonomously under any circumstances.

---

## Phase 4 — Execution Loop

> Restored from v2 cut. Runs per plan row during the implementation session.

For each row:
1. Implement the row's task.
2. Run the row's gate (test, ads-validator, jira-compare, etc.).
3. If gate fails → halt, diagnose, fix, re-gate. Never proceed to the next row on a failing gate.
4. Present result to Vikram with: what was done, what the gate result was, suggested commit message.
5. Await Vikram "go".
6. On "go" → trigger auto-commit sequence (see LEARNING_ENGINE.md Step 5).

### Auto-commit on "go"

```bash
git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 add [specific files only]
git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 diff --staged
git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 commit -m "$(cat <<'EOF'
{type}({scope}): {description under 72 chars}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

Never: `git add -A`, `git add .`, `--no-verify`, `--no-gpg-sign`.

### PR creation — one per handover session

After all plan rows for the session are committed, before Phase 7 handover:

```bash
gh pr create \
  --title "{short title under 70 chars}" \
  --body "$(cat <<'EOF'
## Summary
- {what changed}
- {why — CLAUDE.md anchor or directive}
- {visual evidence path or test count}

## Gates cleared
- [ ] ads-validator: 0 violations
- [ ] jira-compare: drift < threshold
- [ ] TDD: {N} tests green
- [ ] ask-Vikram: all confirmed

## Visual evidence
{annotated screenshot path}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Phase 5 — Visual Evidence

> Mandatory on every UI surface. Not optional. Not conditional.

### Minimum output per UI task

1. **SVG red arrows** on every open violation (injected via `design-intelligence` skill protocol).
2. **Annotated screenshot** — inline in chat. Caption: `🔴 {N} violations open`.
3. After fixes: **SVG green arrows** + screenshot. Caption: `✅ all resolved`.
4. **Design score:** `X/30` from `design-critique` skill.
5. **Jira drift:** `N items` from `jira-compare`. Target: 0.
6. **ADS violations:** `N` from `ads-validator`. Target: 0.
7. **Phase 0.5 register summary:** patterns scanned, violations found, halts resolved.

Raw screenshots without arrows = rejected. The annotated screenshot is the evidence.

### Session resume continuity (CLAUDE.md 2026-05-09)

When resuming a session on a surface that was already audited:
- Re-inject the COMPLETE violation list from the prior session's handover file.
- Mark resolved items `fixed: true` → green.
- Mark still-open items `fixed: false` → red.
- Never start a fresh subset — the full before/after colour progression is the evidence trail.

---

## Phase 6 — Learning Engine

> Read `references/LEARNING_ENGINE.md`. Run after every phase completes and mandatorily at session end.

### Quick protocol

1. **Extract delta:** Did a defect emerge that Phase 0.5 didn't catch? If yes → propose new JIRA_ARCHITECT.md pattern.
2. **Draft lesson:** Does the fix generalise? Draft CLAUDE.md entry (date + surface + pattern + rule + anchor + severity).
3. **Check matrix:** Was a skill routing wrong? Propose MATRIX.md append.
4. **Check rubric:** Was the tier wrong? Propose RUBRIC.md example.
5. **Present drafts** to Vikram. No autonomous CLAUDE.md or Obsidian write.
6. **On approval:** invoke `save-memory` skill → Obsidian write + CLAUDE.md append.

Every session produces at least one draft. If no defect found: `"Phase 6: no new patterns — Phase 0.5 coverage confirmed for {surface}."` That is a valid output.

---

## Phase 7 — Obsidian Handover

> Always prepares. Writes incrementally from Phase 3 onward. Never left incomplete at session end.

File: `active/preflight-handover-{YYYY-MM-DD}-{topic-slug}.md`

```markdown
# Preflight handover — {topic} — {date}

## Context
- Surface: {value}
- Tier: {value}
- Started: {ISO timestamp}
- Council ran: {yes/no — panel(s) that ran}
- PR: {gh pr URL, or "pending — rows not yet committed"}

## Phase 0.5 — Jira Architect Register
{full JSON from Phase 0.5 scan}

## Decision (council verdict — if Phase 2 ran)
{verdict summary, max 5 bullets, with ADS citations}

## Plan
{Phase 3 table verbatim}

## Progress
- [x] {completed row + commit hash}
- [ ] {pending row}

## Files touched
- `path/to/file.tsx` — {one-line what changed}

## Tests added
- `path/to/test.tsx` — {N assertions}

## Visual evidence
- {screenshot path or description} — {design score, drift count, ADS violations}

## Open items / next session
- {deferred decisions, pending Vikram approvals, telemetry gaps}

## Lessons candidates (Phase 6 — awaiting Vikram approval)
{lesson drafts in CLAUDE.md format}

## Copy-paste block (next session first message)
{self-contained context block — surface, tier, PR link, progress, open items, pending lessons}
```

The copy-paste block is mandatory. The next session pastes it as the first message. No context reconstruction needed.

### Auto-write rule

Preflight owns `active/` handover files and updates them throughout the session. It does NOT auto-write to `CLAUDE.md`, Obsidian vault, or `MEMORY.md`. Those require explicit Vikram approval via Phase 6 → `save-memory`.

---

## Hard Rules (non-negotiable)

1. **ADS gate.** Any UI plan must include `ads-validator`. Halt if missing.
2. **TDD gate.** Failing test row precedes any implementation row.
3. **Ask-before-add/remove.** Explicit row in plan for any user-visible field/component change.
4. **Lovable SQL.** All schema changes: `tool: lovable-sql, manual-required: true`. Full SQL in code block. Claude does not execute autonomously.
5. **Port 8080 lock.** Any plan row using another port → HALT.
6. **No Claude preview tools.** `preview_*` tools are banned on Catalyst. Chrome MCP only.
7. **Jira parity gate.** Any UI feature: `jira-compare` before "done".
8. **One PR per session.** After all rows committed; before Phase 7 handover.
9. **Phase 0.5 always.** 28 patterns run on every Standard/High-stake task.
10. **Learning engine always.** Phase 6 runs at every session end, no exceptions.

---

## What preflight v3 does NOT do

- Does not execute implementation (suggests; user triggers).
- Does not switch the active model (harness controls; plan suggests).
- Does not auto-write to `CLAUDE.md` or Obsidian (requires Vikram approval).
- Does not enforce branch logic (markdown limitation — inline conditionals instead).
- Does not estimate duration (depends on harness state preflight cannot see).
- Does not execute SQL (Lovable SQL editor only, manual-required).
- Does not use Claude preview tools (Chrome MCP only for visual verification).

---

## References

- `references/JIRA_ARCHITECT.md` — 28-pattern Phase 0.5 checklist (Jira Architect Scan)
- `references/LEARNING_ENGINE.md` — lesson extraction, Obsidian orchestration, auto-commit protocol
- `references/MATRIX.md` — surface→skill matrix
- `references/RUBRIC.md` — task classification rubric
- `CLAUDE.md` (project root) — gates, bans, lessons; source of truth
- `~/.claude/skills/design-intelligence/SKILL.md` — Design Intelligence v3 (1000-IQ, fires in Phase 1)
- `~/.claude/skills/jira-compare/SKILL.md` — parity audit (Phase 1 Lane A + Phase 3 gate)
- `~/.claude/skills/design-critique/SKILL.md` — heuristic scoring (Phase 5 visual evidence)
- `~/.claude/skills/llm-council/SKILL.md` — council protocol (Phase 2 advisors)
