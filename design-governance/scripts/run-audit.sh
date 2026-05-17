#!/bin/bash

# Design System Audit Runner
# Usage: ./design-governance/scripts/run-audit.sh [source-path]

SOURCE_PATH="${1:-.}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Design System Audit"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Run the audit
node design-governance/rules/audit.js "$SOURCE_PATH"

RESULT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $RESULT -eq 0 ]; then
  echo "✅ All design system checks passed"
  echo ""
  exit 0
else
  echo "❌ Design system audit failed - review violations above"
  echo ""
  exit 1
fi
