#!/bin/sh
# PreToolUse guard on the Agent tool — backs the /delegate skill's
# cost-routing policy (model-orchestration for Claude Code).
#
# Two jobs, both fail-open by design:
#   1. Always log the delegation decision for later audit
#      (.claude/logs/delegation-log.jsonl).
#   2. If we know the orchestrating session is running an expensive model
#      (opus/fable — captured by record-session-model.sh at SessionStart)
#      AND this call targets one of Catalyst's designated bulk/mechanical
#      subagent types AND no explicit `model` override was given, block
#      once and require an explicit model choice.
#
# This cannot judge whether the choice is *correct* — only whether one was
# made consciously. It never blocks on parse failure, unknown session
# model, or non-bulk agent types (see docs/ways-of-working, the "hooks
# can't semantically classify work" limitation this hook is scoped to).
set -u
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
LOG_DIR="$PROJECT_DIR/.claude/logs"
mkdir -p "$LOG_DIR" 2>/dev/null

input=$(cat)
parsed=$(printf '%s' "$input" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    ti = d.get('tool_input', {}) or {}
    print(ti.get('subagent_type','') or '')
    print(ti.get('model','') or '')
    print((ti.get('description','') or '')[:80])
except Exception:
    print('')
    print('')
    print('')
" 2>/dev/null)

subagent_type=$(printf '%s' "$parsed" | sed -n '1p')
model=$(printf '%s' "$parsed" | sed -n '2p')
desc=$(printf '%s' "$parsed" | sed -n '3p')

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown")
printf '{"ts":"%s","subagent_type":"%s","model":"%s","description":"%s"}\n' \
  "$ts" "$subagent_type" "${model:-inherited}" "$desc" >> "$LOG_DIR/delegation-log.jsonl" 2>/dev/null

# Explicit model already given — conscious choice made, nothing to enforce.
[ -n "$model" ] && exit 0

# Unknown or non-expensive session model — nothing to enforce against.
session_model=""
[ -f "$LOG_DIR/session-model" ] && session_model=$(cat "$LOG_DIR/session-model" 2>/dev/null)
case "$session_model" in
  *opus*|*fable*) : ;;
  *) exit 0 ;;
esac

# Only nudge on Catalyst's own designated bulk/mechanical subagent types.
case "$subagent_type" in
  general-purpose|Explore|repo-context-agent|token-efficiency-agent|tool-output-agent|code-graph-agent)
    echo "BLOCKED: this session is running an expensive orchestrator model ($session_model) and is about to spend it on a '$subagent_type' subagent with no explicit model override. Per the /delegate skill's cost table, route bulk/mechanical work to a cheaper model — add model: 'sonnet' (or 'haiku') to this Agent call. If the smart model is genuinely required here, set model: '$session_model' explicitly to confirm the choice was deliberate." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
