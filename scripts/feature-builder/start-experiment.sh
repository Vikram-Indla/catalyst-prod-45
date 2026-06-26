#!/bin/bash
# Catalyst Feature Finder & Builder — start-experiment
# Creates a 9-file experiment workspace.
# NO experiment may begin implementation until allowed-edit-surface.md is filled.
#
# Usage:
#   ./scripts/feature-builder/start-experiment.sh <feature-slug> <experiment-id> "<title>"
#
# Example:
#   ./scripts/feature-builder/start-experiment.sh test-hub exp-001 "Feature intake and Catalyst pattern discovery"

set -euo pipefail

FEATURE_SLUG="${1:?ERROR: feature-slug required}"
EXPERIMENT_ID="${2:?ERROR: experiment-id required (e.g. exp-001)}"
TITLE="${3:?ERROR: title required}"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

FEATURE_DIR="${REPO_ROOT}/docs/feature-builder/features/${FEATURE_SLUG}"
EXP_DIR="${FEATURE_DIR}/experiments/${EXPERIMENT_ID}"

echo "Catalyst Feature Builder — start-experiment"
echo "  Feature:    ${FEATURE_SLUG}"
echo "  Experiment: ${EXPERIMENT_ID}"
echo "  Title:      ${TITLE}"
echo ""

# Guard: feature must be initialized
if [ ! -d "${FEATURE_DIR}" ]; then
  echo "ERROR: Feature not initialized. Run first:"
  echo "  ./scripts/feature-builder/init-feature.sh ${FEATURE_SLUG} \"<objective>\""
  exit 1
fi

# Guard: experiment must not already exist
if [ -d "${EXP_DIR}" ]; then
  echo "ERROR: Experiment already exists at:"
  echo "  ${EXP_DIR}"
  exit 1
fi

# Determine experiment type from ID number
EXP_NUM=$(echo "${EXPERIMENT_ID}" | grep -o '[0-9]*' | head -1)
if [ -n "${EXP_NUM}" ] && [ "${EXP_NUM}" -le 5 ] 2>/dev/null; then
  EXP_TYPE="research"
  TYPE_NOTE="Research experiment — NO code changes allowed. Documentation only."
else
  EXP_TYPE="build"
  TYPE_NOTE="Build experiment — fill allowed-edit-surface.md BEFORE touching any file."
fi

mkdir -p "${EXP_DIR}"

# ── 1. hypothesis.md ──────────────────────────────────────────────────────────
cat > "${EXP_DIR}/hypothesis.md" << EOF
# Hypothesis: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Title:** ${TITLE}
**Date:** ${DATE}
**Type:** ${EXP_TYPE}

> ${TYPE_NOTE}

---

## Hypothesis

_What we expect to find or prove. Fill before starting work._

---

## Acceptance Criteria

Declare ALL criteria BEFORE starting work. Do not modify after starting.

- [ ] <criterion 1>
- [ ] <criterion 2>
- [ ] ADS audit: 0 new violations in touched files (build experiments only)
- [ ] TypeScript: 0 new errors (build experiments only)
- [ ] No hard-fail check failed (see scorecard.md)

---

## Pre-Work Reuse Check (build experiments only)

\`\`\`bash
grep -r "<concept>" src/components src/lib src/hooks --include="*.tsx" --include="*.ts" -l
\`\`\`

**Found:** _fill_
**Decision:** mount existing | extend | build new (build-new requires human approval)
EOF

# ── 2. allowed-edit-surface.md ────────────────────────────────────────────────
# Karpathy equivalent of "only edit train.py"
cat > "${EXP_DIR}/allowed-edit-surface.md" << EOF
# Allowed Edit Surface: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Date:** ${DATE}
**Type:** ${EXP_TYPE}

> MANDATORY — no implementation work may begin until this file is filled and reviewed.
> This is the Catalyst equivalent of Karpathy AutoResearch's constrained editable file.

---

## Allowed Files

_Fill before starting. Be specific — list exact file paths._

- [ ] (none yet — fill before starting)

---

## Forbidden Files

Always forbidden without explicit human approval:

- \`supabase/migrations/\` — schema changes need Gate 4
- \`supabase/functions/\` — edge functions need Gate 5
- \`src/routes/FullAppRoutes.tsx\` — route changes need Gate 6
- \`src/components/layout/SidebarBase.tsx\` — nav changes need human approval
- \`package.json\` / \`package-lock.json\` — dependency changes need human approval
- \`CLAUDE.md\` — governance doc, never modified
- \`design-governance/\` — audit infrastructure, never modified
- Global theme / CSS variables — ADS tokens only, never new themes
- Auth / RBAC source files — security boundary, never touched without Gate approval
- Any file NOT in the Allowed list above

---

## Edit Rules

1. No file outside the Allowed list may be edited.
2. If a new file becomes necessary mid-experiment, STOP. Update this document first.
3. If schema changes emerge, STOP. Request Gate 4 approval.
4. If route changes emerge, STOP. Request Gate 6 approval.
5. If a shared component needs parameterising (not forking), confirm with Vikram first.

---

## Gate Status

- [ ] Allowed edit surface reviewed before work started
- [ ] No files added mid-experiment without updating this document
EOF

# ── 3. research-notes.md ─────────────────────────────────────────────────────
cat > "${EXP_DIR}/research-notes.md" << EOF
# Research Notes: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Title:** ${TITLE}
**Date:** ${DATE}
**Type:** ${EXP_TYPE}

For research experiments: record discovery findings here.
For build experiments: record architectural decisions, component choices, tradeoffs.

---

## Findings

1. _fill_

---

## Evidence

| Claim | Source (command + output, or file:line) |
|---|---|
| _fill_ | _fill_ |

---

## Acceptance Criteria Status

| Criterion | Pass? | Evidence |
|---|---|---|
| _fill_ | ✅ / ❌ | _fill_ |
EOF

# ── 4. baseline.md ───────────────────────────────────────────────────────────
cat > "${EXP_DIR}/baseline.md" << EOF
# Baseline: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Date:** ${DATE}
**Time:** ${TIME}

Record current state BEFORE any changes.

---

## Files to be Touched

| File | Current state | ADS violations | TS errors |
|---|---|---|---|
| _fill before starting_ | | | |

## Relevant Data State (research experiments)

\`\`\`
_fill: table counts, row examples, schema state, route list, etc._
\`\`\`

## Baseline ADS Audit (build experiments)

\`\`\`
Run: node design-governance/rules/audit.js <target-files> 2>&1 | tail -20
Result: _fill_
\`\`\`

## Baseline TypeScript (build experiments)

\`\`\`
Run: npx tsc --noEmit 2>&1 | grep -c "error TS" 2>/dev/null || echo 0
Result: _ errors before this experiment
\`\`\`
EOF

# ── 5. implementation-notes.md ────────────────────────────────────────────────
cat > "${EXP_DIR}/implementation-notes.md" << EOF
# Implementation Notes: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Title:** ${TITLE}
**Date:** ${DATE}
**Type:** ${EXP_TYPE}

For research experiments: leave blank or note "N/A — research only".
For build experiments: record what was changed and why.

---

## Changes Made

| File | Change | Reason |
|---|---|---|
| _fill_ | | |

---

## Reuse Decisions

| Need | Used | Alternative considered |
|---|---|---|
| _fill_ | | |

---

## Deferred / Out of Scope

_Anything discovered but explicitly deferred from this experiment._

1. _fill_
EOF

# ── 6. validation-log.md ─────────────────────────────────────────────────────
cat > "${EXP_DIR}/validation-log.md" << EOF
# Validation Log: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Date:** ${DATE}
**Type:** ${EXP_TYPE}

---

## Validation Commands

\`\`\`bash
# Run BEFORE calling finish-experiment.sh

# 1. TypeScript
npx tsc --noEmit 2>&1 | tail -20

# 2. ADS audit on touched files (build experiments)
node design-governance/rules/audit.js <touched-file-1> <touched-file-2>

# 3. ADS self-test
node design-governance/scripts/self-test.mjs

# 4. Build check (build experiments)
npm run build 2>&1 | tail -20
\`\`\`

---

## Results

**TypeScript errors:** _
**ADS violations (touched files):** _
**ADS self-test:** pass / fail
**Build:** pass / fail
**Screenshot path:** _path | N/A (research experiment)_

---

## Delta from Baseline

**TypeScript errors:** before _ → after _ (delta: _)
**ADS violations:** before _ → after _ (delta: _)
EOF

# ── 7. screenshot-notes.md ───────────────────────────────────────────────────
cat > "${EXP_DIR}/screenshot-notes.md" << EOF
# Screenshot Notes: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Title:** ${TITLE}
**Date:** ${DATE}
**Type:** ${EXP_TYPE}

> Screenshot required for all build experiments with UI changes (CLAUDE.md P0).
> Research experiments: mark N/A.

---

## Screenshots

| Surface | Path | Status | Notes |
|---|---|---|---|
| _fill_ | | pending / taken / N/A | |

---

## Visual Parity Check (build experiments)

| Element | Expected | Observed | Match? |
|---|---|---|---|
| _fill_ | | | ✅ / ❌ |

---

## Screenshot Status

- [ ] All UI surfaces screenshotted
- [ ] Parity check complete
- [ ] OR: N/A — research experiment, no UI changes
EOF

# ── 8. scorecard.md ──────────────────────────────────────────────────────────
# Karpathy equivalent of val_bpb
cat > "${EXP_DIR}/scorecard.md" << EOF
# Experiment Scorecard: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Title:** ${TITLE}
**Date:** ${DATE}
**Type:** ${EXP_TYPE}

> This is the Catalyst equivalent of Karpathy AutoResearch's val_bpb.
> Fill AFTER experiment, BEFORE calling finish-experiment.sh.

---

## Scorecard

| Dimension | Max | Score | Notes |
|---|---:|---:|---|
| Catalyst-native visual quality | 25 | PENDING | ADS tokens, no hardcoded colors, correct spacing |
| Functional correctness | 20 | PENDING | CRUD works, data persists, no silent failures |
| Data correctness | 15 | PENDING | Correct tables, snake_case access, no typed fallbacks |
| Pattern reuse | 15 | PENDING | Canonical components mounted, nothing rebuilt |
| Validation health | 10 | PENDING | TS 0 errors, ADS 0 violations, build passes |
| UX completeness | 5 | PENDING | Acceptance criteria all pass |
| Maintainability | 10 | PENDING | No dead code, no speculative abstractions |
| **Total** | **100** | **PENDING** | |

**Threshold:** ≥ 80 = keep · 65–79 = revise · < 65 = reject

---

## Hard Fail Check

Any FAIL here = automatic reject, regardless of scorecard total.

| Check | Pass/Fail | Notes |
|---|---|---|
| TypeScript passes (0 new errors) | PENDING | |
| App route loads without crash | PENDING | |
| No console crash on mount | PENDING | |
| No unauthorized access introduced | PENDING | |
| No global theme mutation | PENDING | |
| No unapproved migration | PENDING | |
| No route duplication | PENDING | |
| No major visual mismatch (build only) | PENDING | |
| allowed-edit-surface.md was filled before work | PENDING | |

---

## Final Score

\`\`\`
Total: PENDING / 100
Hard fails: PENDING
Threshold met: PENDING
\`\`\`

## Decision

PENDING — fill after scoring above.
EOF

# ── 9. decision.md ────────────────────────────────────────────────────────────
cat > "${EXP_DIR}/decision.md" << EOF
# Decision: ${FEATURE_SLUG} / ${EXPERIMENT_ID}

**Title:** ${TITLE}
**Date:** ${DATE}
**Type:** ${EXP_TYPE}

_Filled by finish-experiment.sh after scorecard.md is complete._

---

## DECISION: _pending_

**REASON:** _pending_

---

## Decision Rules

| Rule | Applied? |
|---|---|
| scorecard.md total ≥ 80 | _yes/no_ |
| Zero hard fails in scorecard.md | _yes/no_ |
| allowed-edit-surface.md was filled before work started | _yes/no_ |
| Screenshot provided (if UI build) | _yes/no_ |

---

## Human Approval

- [ ] Vikram reviewed and approved
- **Approved:** _date_
EOF

echo "✓ Experiment workspace created:"
echo "  ${EXP_DIR}"
echo ""
echo "Files (9):"
ls "${EXP_DIR}" | sed 's/^/  /'
echo ""
echo "Type: ${EXP_TYPE}"
echo ""
echo "MANDATORY NEXT STEP:"
echo "  1. Fill allowed-edit-surface.md — list exactly which files may be edited"
echo "  2. Fill hypothesis.md — write hypothesis and acceptance criteria"
echo "  3. Fill baseline.md — record current state"
echo "  4. Only then start work"
echo ""
echo "When done:"
echo "  ./scripts/feature-builder/validate-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID}"
echo "  Fill scorecard.md"
echo "  ./scripts/feature-builder/finish-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID} keep|revise|reject|blocked \"<reason>\""
