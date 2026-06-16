#!/usr/bin/env bash
set -euo pipefail

ROOT=".claude/vendor"

echo "Claude /start Vendor Status"
echo "==========================="
echo ""

repos=(
  "rtk"
  "caveman"
  "claude-context"
  "code-review-graph"
  "token-savior"
  "context-mode"
  "memsearch"
)

echo "Vendor root: $ROOT"
echo ""

for repo in "${repos[@]}"; do
  path="$ROOT/$repo"
  if [ -d "$path/.git" ]; then
    echo "CLONED     $repo -> $path"
    git -C "$path" remote get-url origin 2>/dev/null | sed 's/^/  origin: /' || true
    git -C "$path" rev-parse --short HEAD 2>/dev/null | sed 's/^/  commit: /' || true
  elif [ -d "$path" ]; then
    echo "PRESENT    $repo -> $path (not a git repo)"
  else
    echo "MISSING    $repo"
  fi
done

echo ""
echo "CLI availability:"
commands=(
  "rtk"
  "caveman"
  "claude-context"
  "code-review-graph"
  "token-savior"
  "context-mode"
  "memsearch"
)

for cmd in "${commands[@]}"; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "FOUND      $cmd -> $(command -v "$cmd")"
  else
    echo "NOT FOUND  $cmd"
  fi
done

echo ""
echo "Note: missing CLI does not always mean unusable. Some repos are MCP packages or skill folders, not global CLI commands."
