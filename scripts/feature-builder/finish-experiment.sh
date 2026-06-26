#!/bin/bash
# Catalyst Feature Finder & Builder — finish-experiment
# Records the final decision. Updates decision.md, decision-log.md, experiment-log.tsv.
#
# Usage:
#   ./scripts/feature-builder/finish-experiment.sh <feature-slug> <experiment-id> <decision> "<reason>"
#
# Decision values: keep | revise | reject | blocked
#
# Example:
#   ./scripts/feature-builder/finish-experiment.sh sample-feature exp-000 blocked "Dry run complete; ready for approval"

set -euo pipefail

FEATURE_SLUG="${1:?ERROR: feature-slug required}"
EXPERIMENT_ID="${2:?ERROR: experiment-id required}"
DECISION="${3:?ERROR: decision required: keep|revise|reject|blocked}"
REASON="${4:?ERROR: reason required}"
DATE=$(date +%Y-%m-%d)

# Validate decision value
case "${DECISION}" in
  keep|revise|reject|blocked) ;;
  *)
    echo "ERROR: decision must be one of: keep | revise | reject | blocked"
    echo "Got: '${DECISION}'"
    exit 1
    ;;
esac

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

FEATURE_DIR="${REPO_ROOT}/docs/feature-builder/features/${FEATURE_SLUG}"
EXP_DIR="${FEATURE_DIR}/experiments/${EXPERIMENT_ID}"
DECISION_FILE="${EXP_DIR}/decision.md"
DECISION_LOG="${FEATURE_DIR}/decision-log.md"
EXPERIMENT_LOG="${REPO_ROOT}/experiment-log.tsv"

echo "Catalyst Feature Builder — finish-experiment"
echo "  Feature:    ${FEATURE_SLUG}"
echo "  Experiment: ${EXPERIMENT_ID}"
echo "  Decision:   ${DECISION}"
echo "  Reason:     ${REASON}"
echo ""

# Guard: experiment must exist
if [ ! -d "${EXP_DIR}" ]; then
  echo "ERROR: Experiment not found: ${EXP_DIR}"
  exit 1
fi

# Read title from hypothesis.md if available
TITLE="unknown"
if [ -f "${EXP_DIR}/hypothesis.md" ]; then
  TITLE=$(grep "^\*\*Title:\*\*" "${EXP_DIR}/hypothesis.md" | head -1 | sed 's/\*\*Title:\*\* //' || echo "unknown")
fi

# ── Update decision.md ────────────────────────────────────────────────────────
if [ -f "${DECISION_FILE}" ]; then
  # Replace _pending_ lines
  TMP=$(mktemp)
  sed "s/\*\*DECISION:\*\* _pending_/**DECISION: ${DECISION}**/g" "${DECISION_FILE}" > "$TMP"
  sed -i "" "s/\*\*REASON:\*\* _pending_/**REASON:** ${REASON}/g" "$TMP"
  mv "$TMP" "${DECISION_FILE}"
  echo "✓ Updated decision.md"
fi

# ── Update decision-log.md ────────────────────────────────────────────────────
if [ -f "${DECISION_LOG}" ]; then
  echo "| ${DATE} | ${EXPERIMENT_ID} | ${DECISION} | ${REASON} |" >> "${DECISION_LOG}"
  echo "✓ Appended to decision-log.md"
fi

# ── Append to experiment-log.tsv ─────────────────────────────────────────────
# Init tsv if needed
if [ ! -f "${EXPERIMENT_LOG}" ]; then
  echo -e "experiment\tstatus\tfeature\tfiles_touched\tscorecard_ads\tscorecard_parity\tscorecard_functional\tscorecard_reuse\tcomposite\tdecision\tdescription" > "${EXPERIMENT_LOG}"
  echo "✓ Created experiment-log.tsv"
fi

# Determine status from decision
case "${DECISION}" in
  keep)    STATUS="complete" ;;
  revise)  STATUS="revise" ;;
  reject)  STATUS="rejected" ;;
  blocked) STATUS="blocked" ;;
esac

# Extract scorecard if validation-log exists
ADS_SCORE="-"
PARITY_SCORE="-"
FUNCTIONAL_SCORE="-"
REUSE_SCORE="-"
COMPOSITE="-"

if [ -f "${DECISION_FILE}" ]; then
  # Try to extract composite score if filled
  COMPOSITE_LINE=$(grep "Composite" "${DECISION_FILE}" | grep -v "^\|.*\*\*" | head -1 || echo "")
fi

echo -e "${EXPERIMENT_ID}\t${STATUS}\t${FEATURE_SLUG}\tnone\t${ADS_SCORE}\t${PARITY_SCORE}\t${FUNCTIONAL_SCORE}\t${REUSE_SCORE}\t${COMPOSITE}\t${DECISION}\t${TITLE}" >> "${EXPERIMENT_LOG}"
echo "✓ Appended to experiment-log.tsv"

echo ""

# Print summary by decision type
case "${DECISION}" in
  keep)
    echo "✓ KEEP — Experiment accepted."
    echo ""
    echo "Update experiment-roadmap.md to mark ${EXPERIMENT_ID} as 'complete'."
    echo "Run next experiment in sequence."
    ;;
  revise)
    echo "⟳ REVISE — Fix issues and re-run validation before keep."
    echo ""
    echo "After fixes:"
    echo "  ./scripts/feature-builder/validate-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID}"
    echo "  ./scripts/feature-builder/finish-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID} keep \"<updated reason>\""
    ;;
  reject)
    echo "✗ REJECT — Start fresh with different approach."
    echo ""
    echo "Start new experiment:"
    echo "  ./scripts/feature-builder/start-experiment.sh ${FEATURE_SLUG} <new-exp-id> \"<new approach>\""
    ;;
  blocked)
    echo "⏸ BLOCKED — ${REASON}"
    echo ""
    echo "Resume when unblocked:"
    echo "  ./scripts/feature-builder/finish-experiment.sh ${FEATURE_SLUG} ${EXPERIMENT_ID} keep|reject \"<unblocked reason>\""
    ;;
esac

echo ""
echo "Log: ${EXPERIMENT_LOG}"
