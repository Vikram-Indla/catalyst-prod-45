#!/bin/sh
# SessionStart hook — best-effort capture of the active orchestrator model,
# written for delegation-guard.sh (PreToolUse on Agent) to read later.
#
# Claude Code does not guarantee a `model` field on every SessionStart
# payload. If it's absent we simply don't write the file, and
# delegation-guard.sh fails open (never blocks) when the model is unknown.
set -u
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.claude/logs"
mkdir -p "$LOG_DIR" 2>/dev/null

input=$(cat)
model=$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    print(json.load(sys.stdin).get('model','') or '')
except Exception:
    print('')
" 2>/dev/null)

if [ -n "$model" ]; then
  printf '%s' "$model" > "$LOG_DIR/session-model" 2>/dev/null
fi

exit 0
