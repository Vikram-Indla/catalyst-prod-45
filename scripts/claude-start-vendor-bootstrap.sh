#!/usr/bin/env bash
set -euo pipefail

ROOT=".claude/vendor"
mkdir -p "$ROOT"

echo "Claude /start Vendor Bootstrap"
echo "=============================="
echo ""
echo "This script clones external repos into .claude/vendor as read-only references."
echo "It does NOT install packages, configure MCP, copy external skills, or modify app code."
echo ""

read -r -p "Clone/update external repos into .claude/vendor? Type YES to continue: " confirm
if [ "$confirm" != "YES" ]; then
  echo "Aborted."
  exit 0
fi

clone_or_update() {
  local id="$1"
  local url="$2"
  local path="$ROOT/$id"

  if [ -d "$path/.git" ]; then
    echo ""
    echo "Updating $id..."
    git -C "$path" fetch --all --prune
    echo "Current commit:"
    git -C "$path" rev-parse --short HEAD
    echo "Remote default branch status:"
    git -C "$path" status --short
  elif [ -d "$path" ]; then
    echo ""
    echo "Skipping $id: $path exists but is not a git repo."
  else
    echo ""
    echo "Cloning $id..."
    git clone --depth 1 "$url" "$path"
  fi
}

clone_or_update "rtk" "https://github.com/rtk-ai/rtk.git"
clone_or_update "caveman" "https://github.com/JuliusBrussee/caveman.git"
clone_or_update "claude-context" "https://github.com/zilliztech/claude-context.git"
clone_or_update "code-review-graph" "https://github.com/tirth8205/code-review-graph.git"
clone_or_update "token-savior" "https://github.com/Mibayy/token-savior.git"
clone_or_update "context-mode" "https://github.com/mksglu/context-mode.git"
clone_or_update "memsearch" "https://github.com/zilliztech/memsearch.git"

echo ""
echo "Vendor bootstrap complete."
echo ""
echo "Next:"
echo "1. Run: bash scripts/claude-start-vendor-status.sh"
echo "2. Ask Claude to inspect any repo before installing or registering it."
echo "3. Do not configure MCP or copy external skills until reviewed."
