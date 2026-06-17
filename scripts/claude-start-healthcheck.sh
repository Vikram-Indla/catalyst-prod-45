#!/usr/bin/env bash
set -euo pipefail

echo "Claude /start Base Pack Healthcheck"
echo "=================================="
echo ""

required=(
  ".claude/skills/start/SKILL.md"
  ".claude/commands/start.md"
  ".claude/agents/repo-context-agent.md"
  ".claude/agents/code-graph-agent.md"
  ".claude/agents/token-efficiency-agent.md"
  ".claude/agents/tool-output-agent.md"
  ".claude/agents/memory-guardrail-agent.md"
  ".claude/agents/ui-dom-probe-agent.md"
  ".claude/agents/implementation-planner-agent.md"
  ".claude/agents/safety-change-control-agent.md"
  ".claude/start-orchestrator/guardrails.md"
  ".claude/start-orchestrator/output-templates.md"
)

missing=0
for file in "${required[@]}"; do
  if [ -f "$file" ]; then
    echo "OK   $file"
  else
    echo "MISS $file"
    missing=$((missing + 1))
  fi
done

echo ""

if [ -f "scripts/claude-start-vendor-status.sh" ]; then
  echo "Vendor status script: OK"
else
  echo "Vendor status script: missing"
fi

if command -v rtk >/dev/null 2>&1; then
  echo "RTK CLI: FOUND -> $(command -v rtk)"
else
  echo "RTK CLI: NOT FOUND"
fi

echo ""

if [ "$missing" -eq 0 ]; then
  echo "Base /start pack is installed."
else
  echo "$missing required file(s) missing."
  exit 1
fi
