#!/bin/bash
# Catalyst Feature Finder & Builder — validate-experiment
# Runs TypeScript, ADS audit, and ADS self-test. Writes results to validation-log.md.
#
# Usage:
#   ./scripts/feature-builder/validate-experiment.sh <feature-slug> <experiment-id>
#
# Example:
#   ./scripts/feature-builder/validate-experiment.sh sample-feature exp-000

set -euo pipefail

FEATURE_SLUG="${1:?ERROR: feature-slug required}"
EXPERIMENT_ID="${2:?ERROR: experiment-id required}"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H:%M)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

EXP_DIR="${REPO_ROOT}/docs/feature-builder/features/${FEATURE_SLUG}/experiments/${EXPERIMENT_ID}"
VALIDATION_LOG="${EXP_DIR}/validation-log.md"

echo "Catalyst Feature Builder — validate-experiment"
echo "  Feature:    ${FEATURE_SLUG}"
echo "  Experiment: ${EXPERIMENT_ID}"
echo "  Date:       ${DATE} ${TIME}"
echo ""

# Guard: experiment must exist
if [ ! -d "${EXP_DIR}" ]; then
  echo "ERROR: Experiment not found. Run first:"
  echo "  ./scripts/feature-builder/start-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID} \"<title>\""
  exit 1
fi

# Guard: validation-log must exist
if [ ! -f "${VALIDATION_LOG}" ]; then
  echo "ERROR: validation-log.md missing from ${EXP_DIR}"
  exit 1
fi

echo "Running validation checks..."
echo ""

# ── TypeScript check ──────────────────────────────────────────────────────────
echo "1. TypeScript..."
TS_OUTPUT=$(cd "${REPO_ROOT}" && npx tsc --noEmit 2>&1 || true)
TS_ERRORS=$(echo "${TS_OUTPUT}" | grep -c "error TS" 2>/dev/null || true)
TS_ERRORS="${TS_ERRORS:-0}"
echo "   TypeScript errors: ${TS_ERRORS}"

# ── ADS audit ─────────────────────────────────────────────────────────────────
echo "2. ADS governance self-test..."
SELF_TEST_OUTPUT=$(cd "${REPO_ROOT}" && node design-governance/scripts/self-test.mjs 2>&1 || true)
if echo "${SELF_TEST_OUTPUT}" | grep -q "FAIL\|Error"; then
  SELF_TEST_STATUS="FAIL"
else
  SELF_TEST_STATUS="PASS"
fi
echo "   Self-test: ${SELF_TEST_STATUS}"

# ── ADS scan on src/ (summarized) ─────────────────────────────────────────────
echo "3. ADS audit (full src scan for reference)..."
ADS_OUTPUT=$(cd "${REPO_ROOT}" && node design-governance/rules/audit.js src/ 2>&1 | tail -10 || true)
echo "   (See validation-log.md for full output)"

# ── Write results to validation-log.md ───────────────────────────────────────
# Append a timestamped run block
cat >> "${VALIDATION_LOG}" << EOF

---

## Validation Run: ${DATE} ${TIME}

### TypeScript

\`\`\`
Errors: ${TS_ERRORS}
\`\`\`

### ADS Self-Test

\`\`\`
Result: ${SELF_TEST_STATUS}
${SELF_TEST_OUTPUT}
\`\`\`

### ADS Audit Summary

\`\`\`
${ADS_OUTPUT}
\`\`\`

### Summary for This Run

TypeScript errors: ${TS_ERRORS}
ADS self-test:     ${SELF_TEST_STATUS}

EOF

echo ""
echo "✓ Validation complete. Results appended to:"
echo "  ${VALIDATION_LOG}"
echo ""

# Determine overall result
if [ "${TS_ERRORS}" -gt 0 ] || [ "${SELF_TEST_STATUS}" = "FAIL" ]; then
  echo "⚠  Issues found:"
  [ "${TS_ERRORS}" -gt 0 ] && echo "   - TypeScript: ${TS_ERRORS} errors"
  [ "${SELF_TEST_STATUS}" = "FAIL" ] && echo "   - ADS self-test: FAIL"
  echo ""
  echo "Resolve issues before calling finish-experiment.sh with 'keep'."
  echo ""
  echo "To finish anyway (revise/reject/blocked):"
  echo "  ./scripts/feature-builder/finish-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID} revise|reject|blocked \"<reason>\""
else
  echo "✓ All automated checks pass."
  echo ""
  echo "Next:"
  echo "  ./scripts/feature-builder/finish-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID} keep|revise|reject|blocked \"<reason>\""
fi
