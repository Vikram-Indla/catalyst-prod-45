# CATALYST AIDEN VALIDATION BLOCK

> Every major Claude response must end with an Aiden Validation Block.
>
> "Major" = any response that contains implementation decisions, code changes, Plan Lock proposals, discovery conclusions, or handover state.
> Trivial single-sentence answers to questions do not need the block.

---

## REQUIRED FORMAT

Copy this block exactly. Fill in every field. No field may be left empty — use `N/A` or `NONE` if genuinely not applicable.

```
=== AIDEN VALIDATION BLOCK START ===

Feature Work ID:          [CAT-<AREA>-<FEATURE>-<YYYYMMDD>-<###> or NONE if not yet assigned]
Claude conversation title: [Recommended title for this session]
Session log:              [sessions/<NNN>_<purpose>.md or NOT_CREATED]
Current mode:             [DISCOVERY | PLANNING | EXECUTION | VALIDATION | HANDOVER]
Current objective:        [One sentence — what this response achieves]

Plan Lock status:         [NOT_WRITTEN | DRAFT | APPROVED | SUPERSEDED]
Plan Lock file:           [~/catalyst/features/<ID>/03_PLAN_LOCK.md or N/A]

Canonical components selected:
  - [Component name → file path]
  - [or NONE]

Canonical components rejected:
  - [Component name → reason for rejection]
  - [or NONE]

Files changed this response:
  - [path/to/file.tsx — what changed]
  - [or NONE]

Files allowed by Plan Lock:
  - [path/to/file.tsx]
  - [or N/A — Plan Lock not yet written]

Files forbidden:
  - [path/to/file.tsx — why forbidden]
  - [or NONE]

Agent outputs summary:
  - [Agent name: key finding — one line each]
  - [or NOT_YET_RUN]

Karpathy loop log:
  - [LOOP-NNN: hypothesis → KEEP/DISCARD — one line each]
  - [or NOT_YET_RUN]

Validation evidence:
  - [Command run: output summary]
  - [or NOT_YET_RUN]

Screenshot status:        [NOT_REQUIRED | PENDING | ACCEPTED | REJECTED]
Screenshot checklist:     [~/catalyst/features/<ID>/10_SCREENSHOT_CHECKLIST.md or N/A]

Drift check:              [NO_DRIFT | DRIFT_DETECTED: <description>]
Open risks:
  - [Risk description — one line each]
  - [or NONE]

Next recommended action:  [Exact next step — one sentence]
Decision needed from Vikram/JK:
  - [Decision required — one line each]
  - [or NONE]

=== AIDEN VALIDATION BLOCK END ===
```

---

## WHEN TO INCLUDE

| Response type | Block required? |
|---|---|
| `activate feature` | YES — after discovery and Plan Lock draft |
| `continue feature` | YES — after rehydration report |
| Any file edit | YES |
| Any Plan Lock proposal | YES |
| Any agent output synthesis | YES |
| Discovery findings | YES |
| Validation results | YES |
| Handover write | YES |
| Short factual Q&A (no code) | NO |

---

## COMMON MISTAKES

**BAD — fields left blank:**
```
Files changed this response:
Plan Lock status:
```

**BAD — vague entries:**
```
Validation evidence: - ran some tests
Screenshot status: done
```

**GOOD:**
```
Validation evidence:
  - npx tsc --noEmit: 0 errors
  - grep -r "var(--ds-" src/components/admin/rbac: 12 matching lines
Screenshot status: ACCEPTED (Vikram confirmed 2026-06-26 17:42)
```

---

## WHY THIS EXISTS

The Aiden Validation Block forces Claude to externalize its internal state at every decision point. It prevents:
- Silent drift from Plan Lock
- Undeclared file changes
- Unreviewed canonical component decisions
- Screenshots being skipped
- Handovers that lose context
- Banned colors/UI sneaking through undetected

It is the primary trust mechanism between Claude Code and the TRIAD.
