# Preflight v3 — Agent Roster

**Companion to `SKILL.md`.** Adds named agents from `~/.claude/agents/` per phase. Does not change any phase, gate, council membership, or rule defined in `SKILL.md`. Always emit the activation line from `.claude/skills/AGENT_PIPELINE.md` before each agent does work.

---

## Phase 0 — Memory Bootstrap

| Agent | Role |
|---|---|
| `engineering-codebase-onboarding-engineer` | Read-only: enumerate the touched files, trace the call chain, surface relevant CLAUDE.md anchors. NEVER edits in Phase 0. |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-codebase-onboarding-engineer
   ← invoked by: preflight · Phase 0 (Memory Bootstrap, Step 1)
   role: read-only file/anchor enumeration for the surface
```

Skip in `--quick` mode.

---

## Phase 0.5 — Jira Architect Scan

| Agent | Role |
|---|---|
| `project-management-jira-workflow-steward` | Owns the 28-pattern scan against `references/JIRA_ARCHITECT.md`. Adjudicates halt vs safe. |

Activation line:
```
🤖 AGENT ACTIVATED — project-management-jira-workflow-steward
   ← invoked by: preflight · Phase 0.5 (Jira Architect Scan)
   role: scan 28 anti-patterns; emit halt_required / safe_to_proceed verdict
```

Always announce. The HALT gate from SKILL.md is unchanged — if the steward returns `halt_required: true`, the skill halts as before.

---

## Phase 1 — Evidence Acquisition (4 lanes)

Each lane gets one named specialist. Lanes still run in parallel per SKILL.md.

| Lane | Agent | Role |
|---|---|---|
| Lane A — Codebase | `engineering-codebase-onboarding-engineer` | Grep + trace from UI down to data |
| Lane B — Live DOM / Chrome MCP | `engineering-frontend-developer` | DOM probes, computed-style assertions |
| Lane C — Jira / Atlassian | `project-management-jira-workflow-steward` | `getJiraIssueTypeMetaWithFields`, screen scheme reads |
| Lane D — Database | `engineering-database-optimizer` | `ph_*` schema, RLS policy, index reads |

Activation lines (announce all 4 in one block at start of Phase 1):

```
🤖 PHASE 1 EVIDENCE LANES — 4 agents activating in parallel
   Lane A: engineering-codebase-onboarding-engineer (codebase trace)
   Lane B: engineering-frontend-developer            (live DOM probe)
   Lane C: project-management-jira-workflow-steward  (Jira meta)
   Lane D: engineering-database-optimizer            (Supabase schema)
   ← invoked by: preflight · Phase 1 (Evidence Acquisition)
```

Sync gate from SKILL.md is unchanged — emit per lane: `<ok|partial|skipped+reason>`.

---

## Phase 2 — 3-Panel Council

The existing council membership in SKILL.md is **not changed**. These agents are AUGMENTS — they sit alongside the canonical advisors and amplify a specific lens.

### Engineering panel (5 advisors, augment)

| Existing role | Agent augment |
|---|---|
| Architect | `engineering-software-architect` |
| Senior dev | `engineering-senior-developer` |
| Backend / Supabase | `engineering-backend-architect` |
| Security / RLS | `engineering-security-engineer` |
| Reviewer | `engineering-code-reviewer` |

### Design panel (7 masters — UNCHANGED, no agent augment)

Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper.
Agents may NOT replace any master. The `design-ux-architect` / `design-ux-researcher` / `design-brand-guardian` agents may be CONSULTED by the chairman as supplementary witnesses, but never as voting council members.

### Atlassian panel (5 — UNCHANGED, AtlasKit Architect canonical)

Activation line (single line for the whole council):
```
🤖 PHASE 2 COUNCIL — 5 engineering agents augmenting + 7 design masters + 5 Atlassian advisors
   Engineering augments: software-architect, senior-developer, backend-architect, security-engineer, code-reviewer
   Design panel: UNCHANGED (Saffer · Tufte · Rams · Norman · Ive · Raskin · Cooper)
   Atlassian panel: UNCHANGED (AtlasKit Architect + 4)
   ← invoked by: preflight · Phase 2 (3-Panel Council)
```

Per-advisor hand-off lines are SUPPRESSED for the council to keep chat readable.

---

## Phase 3 — Plan Synthesis

| Agent | Role |
|---|---|
| `engineering-minimal-change-engineer` | Pares the council's verdict down to the smallest correct change. CLAUDE.md "small steps" enforcement. |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-minimal-change-engineer
   ← invoked by: preflight · Phase 3 (Plan Synthesis)
   role: shrink the council verdict to one logical change at a time
```

---

## Phase 4 — Execution Loop (TDD)

Choose ONE primary implementer based on surface type. Always pair with the test-result analyzer and reality-checker.

| Surface type | Primary implementer agent |
|---|---|
| UI (CatalystView*, rails, panels) | `engineering-frontend-developer` |
| Backend (Edge Function, Supabase RPC) | `engineering-backend-architect` |
| Schema (RLS, migrations, `ph_*` tables) | `engineering-database-optimizer` |
| Mixed | `engineering-senior-developer` (chairman) |

Plus always:
| Agent | Role |
|---|---|
| `testing-test-results-analyzer` | Triage every failing vitest / playwright run between TDD cycles |
| `testing-reality-checker` | After each green cycle, confirm the fix actually shipped to the right layer (CLAUDE.md 2026-05-11 lesson) |

Activation block (announce all 3 at start of Phase 4):
```
🤖 PHASE 4 EXECUTION — 3 agents engaged
   Implementer: <picked from table>
   Triage:      testing-test-results-analyzer
   Verifier:    testing-reality-checker
   ← invoked by: preflight · Phase 4 (Execution Loop)
```

---

## Phase 5 — Visual Evidence (SVG arrows mandatory)

| Agent | Role |
|---|---|
| `testing-evidence-collector` | Inject SVG arrows per `references/VISUAL_EVIDENCE.md`; capture before/after screenshots |
| `testing-accessibility-auditor` | A11y validation pass on the post-fix surface (WCAG 2.1 AA gate from CLAUDE.md) |

Activation line:
```
🤖 PHASE 5 EVIDENCE — 2 agents
   testing-evidence-collector       (SVG arrows + screenshots)
   testing-accessibility-auditor    (a11y validation)
   ← invoked by: preflight · Phase 5 (Visual Evidence)
```

---

## Phase 6 — Learning Engine

| Agent | Role |
|---|---|
| `engineering-technical-writer` | Distill the cycle into a CLAUDE.md lesson (date / surface / pattern / rule / severity). Writes nothing without a confirmed root cause. |

Activation line:
```
🤖 AGENT ACTIVATED — engineering-technical-writer
   ← invoked by: preflight · Phase 6 (Learning Engine)
   role: append a CLAUDE.md lesson + JIRA_ARCHITECT.md anti-pattern if applicable
```

---

## Phase 7 — Handover + PR

| Agent | Role |
|---|---|
| `engineering-git-workflow-master` | Branch hygiene, commit shaping, force-with-lease guard, PR draft creation |
| `engineering-technical-writer` | Obsidian handover doc with copy-paste warm-up block |

Activation line:
```
🤖 PHASE 7 HANDOVER — 2 agents
   engineering-git-workflow-master  (branch + PR)
   engineering-technical-writer     (Obsidian handover)
   ← invoked by: preflight · Phase 7 (Handover + PR)
```

---

## Mode-specific overrides

- **`--quick`**: skip activations for Phase 0, 0.5, 1, 2. Phase 3+ still announce.
- **`--handover`**: Phase 7 only — only the 2 handover agents activate.
- **Trivial classification (per RUBRIC.md)**: skip Phases 0.5, 1, 2 — Phase 3 minimal-change-engineer announces, then Phase 4 implementer.
- **High-stake classification**: full pipeline; council MUST announce its augment lineup.
