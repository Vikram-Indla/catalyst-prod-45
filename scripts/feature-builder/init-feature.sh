#!/bin/bash
# Catalyst Feature Finder & Builder — init-feature
# Creates a feature workspace under docs/feature-builder/features/<slug>/
#
# Usage:
#   ./scripts/feature-builder/init-feature.sh <feature-slug> "<objective>"
#
# Example:
#   ./scripts/feature-builder/init-feature.sh admin-rbac "Build enterprise-grade Catalyst-native role and permission management"

set -euo pipefail

FEATURE_SLUG="${1:?ERROR: feature-slug required. Usage: init-feature.sh <feature-slug> \"<objective>\"}"
OBJECTIVE="${2:?ERROR: objective required. Usage: init-feature.sh <feature-slug> \"<objective>\"}"
DATE=$(date +%Y-%m-%d)

# Resolve repo root from script location
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

FEATURE_DIR="${REPO_ROOT}/docs/feature-builder/features/${FEATURE_SLUG}"
REGISTRY="${REPO_ROOT}/docs/feature-builder/feature-registry.md"

echo "Catalyst Feature Builder — init-feature"
echo "  Slug:      ${FEATURE_SLUG}"
echo "  Objective: ${OBJECTIVE}"
echo "  Directory: ${FEATURE_DIR}"
echo ""

# Guard: already initialized
if [ -d "${FEATURE_DIR}" ]; then
  echo "ERROR: Feature workspace already exists at:"
  echo "  ${FEATURE_DIR}"
  echo "Delete it first or choose a different slug."
  exit 1
fi

# Create directory structure
mkdir -p "${FEATURE_DIR}/experiments"

# ── feature-program.md ──────────────────────────────────────────────────────
cat > "${FEATURE_DIR}/feature-program.md" << EOF
# Feature Program: ${FEATURE_SLUG}

**Date:** ${DATE}
**Objective:** ${OBJECTIVE}
**Status:** intake

---

## Objective

${OBJECTIVE}

---

## Constraints (Non-Negotiable)

1. Catalyst-native only — no new design language
2. ADS tokens only — no hardcoded colors
3. No new DB schema without human approval (Gate 4)
4. No new edge functions without human approval (Gate 5)
5. Staging-first — no direct prod changes (CLAUDE.md P0)
6. Reuse canonical components before building new (CLAUDE.md P0)
7. [Add feature-specific constraints here]

---

## Research Requirements

- [ ] Catalyst pattern discovery complete (exp-001)
- [ ] Current state audit complete (exp-002)
- [ ] External benchmark research complete (exp-003) — benchmark: _fill or N/A_
- [ ] Gap analysis complete (exp-004)
- [ ] Target Catalyst design approved (exp-005)

---

## Build Scope

_Defined after research phase and human approval (Gate 3)._

---

## Out of Scope

_Defined before build phase starts._

1. _fill_

---

## Success Criteria

_Defined after target design experiment._

---

## Human Approval Gates

See: docs/feature-builder/human-approval-gates.md

- Gate 3: Phase 0 → Phase 1 (research complete, target design approved)
- Gate 4: Any DB schema change
- Gate 5: Any new edge function
- Gate 7: Any AI feature
- Gate 9: Phase completion + ship

---

## Experiment Roadmap

See: experiment-roadmap.md
EOF

# ── feature-intake.md ───────────────────────────────────────────────────────
cat > "${FEATURE_DIR}/feature-intake.md" << EOF
# Feature Intake: ${FEATURE_SLUG}

**Date:** ${DATE}
**Slug:** ${FEATURE_SLUG}
**Objective:** ${OBJECTIVE}

---

## Inputs

**Requestor:** _fill_
**Priority:** P0 | P1 | P2

**External benchmarks to research:**

| Benchmark | Access method | Why benchmarked |
|---|---|---|
| _fill_ | | |

**Known constraints:**
1. _fill_

**Related Catalyst features/modules:**
- _fill_

**Suspected existing implementations:**
- _fill_

**Suspected DB tables:**
- _fill_

---

## Intake Questions

1. What does "done" look like for a single user in 60 seconds?
2. Which Catalyst hubs does this touch (project, product, admin, testhub, releases)?
3. Is this a new module or enhancement to existing?
4. External benchmark required, or Catalyst-native?
5. Known blockers (missing DB tables, unapproved schema, etc.)?

---

## Intake Decision

- [ ] Proceed to discovery (exp-001)
- [ ] Blocked: _reason_
- [ ] Out of scope: _reason_
- [ ] Needs more information: _what_
EOF

# ── catalyst-pattern-discovery.md ───────────────────────────────────────────
cat > "${FEATURE_DIR}/catalyst-pattern-discovery.md" << EOF
# Catalyst Pattern Discovery: ${FEATURE_SLUG}

**Date:** ${DATE}
**Experiment:** exp-001
**Type:** research (no code changes)

---

## Objective

Determine: what does Catalyst already have for this feature?

---

## Discovery Commands

\`\`\`bash
# Search for feature concepts
grep -r "<concept>" src/components src/lib src/hooks --include="*.tsx" --include="*.ts" -l

# Check existing pages
ls -la src/pages/<area>/

# Check routes
grep -n "<feature-path>" src/routes/FullAppRoutes.tsx

# Check sidebar nav
grep -n "<feature-path>" src/components/layout/SidebarBase.tsx
\`\`\`

---

## Components Found

| Component | File | Purpose | Reusable? |
|---|---|---|---|
| _fill_ | | | |

## Hooks Found

| Hook | File | Purpose | Reusable? |
|---|---|---|---|
| _fill_ | | | |

## Existing Pages / Routes

| Route | File | State |
|---|---|---|
| _fill_ | | not-started / partial / exists |

---

## Conclusion

**Does Catalyst already have this feature?** _fill_

**Canonical components this feature MUST reuse:**
1. _fill_

**New components that may need building (requires human approval):**
1. _fill_

---

**Next step:** exp-002 Current state audit
EOF

# ── current-state-audit.md ──────────────────────────────────────────────────
cat > "${FEATURE_DIR}/current-state-audit.md" << EOF
# Current State Audit: ${FEATURE_SLUG}

**Date:** ${DATE}
**Experiment:** exp-002
**Type:** research (no code changes)

---

## Files Audited

| File | Size | DB tables read | ADS violations | Notes |
|---|---|---|---|---|
| _fill_ | | | | |

## Routes Registered

| Route | Component | Status |
|---|---|---|
| _fill_ | | registered / missing |

## ADS Violations

\`\`\`
Run: node design-governance/rules/audit.js src/pages/<area>/ 2>&1 | tail -40
Result:
  Token violations:      _
  Typography violations: _
  Total:                 _
\`\`\`

## TypeScript Errors

\`\`\`
Run: npx tsc --noEmit 2>&1 | grep "<area>"
Result: _ errors
\`\`\`

## DB Tables Used

| Table | Correct? | Notes |
|---|---|---|
| _fill_ | | |

## Summary

**Overall state:** not-started | partial | exists-unverified | exists-verified
**ADS debt:** _ violations
**Missing routes:** _fill_

**Next step:** exp-003 External benchmark research
EOF

# ── external-benchmark-research.md ──────────────────────────────────────────
cat > "${FEATURE_DIR}/external-benchmark-research.md" << EOF
# External Benchmark Research: ${FEATURE_SLUG}

**Date:** ${DATE}
**Experiment:** exp-003
**Type:** research (no code changes)

---

## Benchmark Products

| Product | Access method | Why selected |
|---|---|---|
| _fill_ | | |

## Research Method

- [ ] PDF documentation
- [ ] Live product
- [ ] Other: _fill_

**Access limitations:** _fill_

---

## Feature Categories

### Category 1: <name>

| Feature | Benchmark behavior | Notes |
|---|---|---|
| _fill_ | | |

---

## Key Findings

1. _fill_

## Catalyst Opportunities (beyond benchmark)

1. _fill_

## Out of Scope (do not replicate)

1. _fill_ — Reason: _fill_

**Next step:** exp-004 Gap analysis
EOF

# ── gap-analysis.md ─────────────────────────────────────────────────────────
cat > "${FEATURE_DIR}/gap-analysis.md" << EOF
# Gap Analysis: ${FEATURE_SLUG}

**Date:** ${DATE}
**Experiment:** exp-004
**Type:** research (no code changes)

---

## Status Values

| Status | Meaning |
|---|---|
| exists-verified | Built, wired, tested |
| exists-unverified | File exists, functional state unknown |
| partial | Partially built |
| missing | Not built |
| out-of-scope | Explicitly excluded |
| catalyst-native | Catalyst-only advantage |

---

## Gap Matrix

| Feature | Benchmark has it | Catalyst status | Experiment |
|---|---|---|---|
| _fill_ | yes / no | _status_ | exp-xxx |

---

## Gap Summary

\`\`\`
Total features catalogued:    _
Exists and verified:          0
Exists unverified:            _
Partial:                      _
Missing:                      _
Out of scope:                 _
Catalyst-native (planned):    _
\`\`\`

**Next step:** exp-005 Target Catalyst design
EOF

# ── target-catalyst-design.md ───────────────────────────────────────────────
cat > "${FEATURE_DIR}/target-catalyst-design.md" << EOF
# Target Catalyst Design: ${FEATURE_SLUG}

**Date:** ${DATE}
**Experiment:** exp-005
**Type:** research (no code changes)
**Gate required:** Human approval (Gate 3) before build phase starts

---

## Design Principles Applied

1. Catalyst-native first — no new design language
2. Reuse canonical components before building new
3. ADS tokens only
4. Zero assumption code — no typed domain fallbacks
5. Staging-first

---

## Entity Model

\`\`\`
<Entity A>
  └─ <Entity B>
       └─ <Entity C>
\`\`\`

---

## Route Plan

| Route | Component | Phase |
|---|---|---|
| _fill_ | | |

## Component Plan

| Need | Use (canonical or new) | Justification |
|---|---|---|
| _fill_ | | |

## DB Tables Required

| Table | Exists? | Changes needed | Approval required? |
|---|---|---|---|
| _fill_ | | | |

---

## Human Approval Checklist (Gate 3)

- [ ] Vikram approved target design
- [ ] Route plan approved
- [ ] DB changes approved (if any)
- [ ] AI use cases approved (if any)
- **Approved:** _date_
EOF

# ── experiment-roadmap.md ────────────────────────────────────────────────────
cat > "${FEATURE_DIR}/experiment-roadmap.md" << EOF
# Experiment Roadmap: ${FEATURE_SLUG}

**Date:** ${DATE}
**Status:** research phase

---

## Phase 0 — Research (no code)

| ID | Title | Status |
|---|---|---|
| exp-001 | Catalyst pattern discovery | not-started |
| exp-002 | Current state audit | not-started |
| exp-003 | External benchmark research | not-started |
| exp-004 | Gap analysis | not-started |
| exp-005 | Target Catalyst design | not-started |

**Phase 0 gate:** All 5 complete + human approval (Gate 3)

---

## Phase 1 — Core Loop

_Defined after Phase 0 approves._

| ID | Title | Files | Status |
|---|---|---|---|
| exp-006 | _fill_ | _fill_ | not-started |

**Phase 1 gate:** Core user journey works end-to-end + human approval (Gate 9)

---

## Phase 2 — Full Feature Coverage

_Defined after Phase 1 ships._

---

## Phase 3 — Admin + AI + Edge Cases

_Defined after Phase 2 ships._
EOF

# ── decision-log.md ─────────────────────────────────────────────────────────
cat > "${FEATURE_DIR}/decision-log.md" << EOF
# Decision Log: ${FEATURE_SLUG}

**Feature:** ${FEATURE_SLUG}
**Initialized:** ${DATE}

---

| Date | Experiment | Decision | Reason |
|---|---|---|---|
| ${DATE} | — | initialized | Feature workspace created by init-feature.sh |
EOF

# ── experiments/README.md ────────────────────────────────────────────────────
cat > "${FEATURE_DIR}/experiments/README.md" << EOF
# Experiments: ${FEATURE_SLUG}

Each experiment lives in its own subdirectory.

## Commands

\`\`\`bash
# Start an experiment
./scripts/feature-builder/start-experiment.sh ${FEATURE_SLUG} exp-001 "<title>"

# Validate
./scripts/feature-builder/validate-experiment.sh ${FEATURE_SLUG} exp-001

# Record decision
./scripts/feature-builder/finish-experiment.sh ${FEATURE_SLUG} exp-001 keep|revise|reject|blocked "<reason>"
\`\`\`

## Experiment ID Convention

\`\`\`
exp-001 through exp-005  ← Phase 0: Research (no code)
exp-006 onwards          ← Phase 1+: Build
\`\`\`
EOF

# ── Register in feature-registry.md ─────────────────────────────────────────
if [ -f "${REGISTRY}" ]; then
  # Check if registry has the header row already
  if grep -q "| Date |" "${REGISTRY}"; then
    # Append data row (remove the placeholder row if it's there)
    if grep -q "_No features registered yet_" "${REGISTRY}"; then
      # Replace placeholder line with real entry
      TMP=$(mktemp)
      grep -v "_No features registered yet_" "${REGISTRY}" > "$TMP"
      echo "| ${DATE} | \`${FEATURE_SLUG}\` | ${OBJECTIVE} | intake |" >> "$TMP"
      mv "$TMP" "${REGISTRY}"
    else
      echo "| ${DATE} | \`${FEATURE_SLUG}\` | ${OBJECTIVE} | intake |" >> "${REGISTRY}"
    fi
  else
    echo "" >> "${REGISTRY}"
    echo "| ${DATE} | \`${FEATURE_SLUG}\` | ${OBJECTIVE} | intake |" >> "${REGISTRY}"
  fi
else
  cat > "${REGISTRY}" << EOF
# Feature Registry

| Date | Slug | Objective | Status |
|---|---|---|---|
| ${DATE} | \`${FEATURE_SLUG}\` | ${OBJECTIVE} | intake |
EOF
fi

echo "✓ Feature workspace created:"
echo "  ${FEATURE_DIR}"
echo ""
echo "✓ Registered in:"
echo "  ${REGISTRY}"
echo ""
echo "Files created:"
ls "${FEATURE_DIR}" | sed 's/^/  /'
echo ""
echo "Next step:"
echo "  ./scripts/feature-builder/start-experiment.sh ${FEATURE_SLUG} exp-001 \"Catalyst pattern discovery\""
