#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Chrome MCP Health Check — runs before every mcp__Claude_in_Chrome__* call
#
# Root cause this prevents:
#   chrome-native-host zombie process holds a broken stdin/stdout pipe.
#   Claude's next MCP call writes to the dead pipe → blocks indefinitely
#   → renderer thread hangs → whole Claude Code desktop freezes.
#
# Fix: kill any chrome-native-host process older than 5 minutes.
#   Chrome spawns a fresh one on the next MCP call — connection resets.
#   5-minute threshold: live hosts are short-lived (< 60s per call);
#   anything older is a zombie.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

# Only macOS has the Chrome native messaging architecture this targets.
if [[ "$(uname)" != "Darwin" ]]; then
  exit 0
fi

STALE_THRESHOLD_SECONDS=300  # 5 minutes

# Find all native host processes for Anthropic/Claude Chrome extensions.
# Pattern covers: com.anthropic.claude_browser_extension, chrome-native-host
PIDS=$(pgrep -f "chrome.native.host\|com\.anthropic\|claude.*browser.*extension\|claude-browser-extension" 2>/dev/null || true)

if [ -z "$PIDS" ]; then
  exit 0
fi

NOW=$(date +%s)

for PID in $PIDS; do
  # Get process start time (macOS ps -o lstart= returns "Day Mon DD HH:MM:SS YYYY")
  START_STR=$(ps -o lstart= -p "$PID" 2>/dev/null | xargs || true)
  if [ -z "$START_STR" ]; then
    continue  # Process already gone
  fi

  START_EPOCH=$(date -j -f "%a %b %d %T %Y" "$START_STR" "+%s" 2>/dev/null || echo "$NOW")
  AGE=$(( NOW - START_EPOCH ))

  if [ "$AGE" -gt "$STALE_THRESHOLD_SECONDS" ]; then
    echo "[chrome-mcp-health] stale native-host PID=$PID age=${AGE}s — killing" >&2
    kill -9 "$PID" 2>/dev/null || true
  fi
done

exit 0
