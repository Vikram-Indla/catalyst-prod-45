#!/bin/bash
# PreToolUse guard for Supabase --linked commands.
# `supabase db query --linked` / `supabase db push` resolve their target project
# from <cwd>/supabase/.temp/project-ref. A cd, a deleted worktree, or a recovered
# shell can silently retarget between staging and prod (see CLAUDE.md
# "CONCURRENT SESSIONS & DB TARGETING"). This hook:
#   1. surfaces the resolved project-ref into the tool context before execution
#   2. BLOCKS the command when no project-ref can be found (unlinked / wrong cwd)

set -u

INPUT=$(cat)
CMD=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)

# Only guard linked db commands; everything else passes silently.
case "$CMD" in
  *"db query --linked"*|*"supabase db push"*) ;;
  *) exit 0 ;;
esac

# Candidate cwd: last `cd <path>` in the command wins (compound commands),
# else the session cwd from the hook input.
SESSION_CWD=$(printf '%s' "$INPUT" | jq -r '.cwd // empty' 2>/dev/null)
CD_TARGET=$(printf '%s' "$CMD" | grep -oE '(^|[;&|]\s*)cd [^;&|]+' | tail -1 | sed -E 's/^[;&|[:space:]]*cd //; s/[[:space:]]+$//')

resolve_ref() {
  local dir="$1"
  [ -n "$dir" ] && [ -f "$dir/supabase/.temp/project-ref" ] && cat "$dir/supabase/.temp/project-ref" && return 0
  return 1
}

REF=""
REF_DIR=""
if [ -n "$CD_TARGET" ]; then
  # expand ~ and $VARS the shell would expand (best effort, no eval of the command itself)
  EXPANDED=$(eval "printf '%s' \"$CD_TARGET\"" 2>/dev/null || printf '%s' "$CD_TARGET")
  if REF=$(resolve_ref "$EXPANDED"); then REF_DIR="$EXPANDED"; fi
fi
if [ -z "$REF" ] && [ -n "$SESSION_CWD" ]; then
  if REF=$(resolve_ref "$SESSION_CWD"); then REF_DIR="$SESSION_CWD"; fi
fi

if [ -z "$REF" ]; then
  jq -n '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: "BLOCKED: no supabase/.temp/project-ref found for this command'"'"'s working directory. The --linked target is unknown (unlinked dir, deleted worktree, or wrong cwd). Run supabase link in the intended directory and verify the ref (prod=lmqwtldpfacrrlvdnmld, staging=cyijbdeuehohvhnsywig) before retrying."
    }
  }'
  exit 0
fi

LABEL="$REF"
case "$REF" in
  lmqwtldpfacrrlvdnmld) LABEL="$REF (PROD)" ;;
  cyijbdeuehohvhnsywig) LABEL="$REF (staging)" ;;
esac

jq -n --arg ctx "supabase --linked target check: project-ref = $LABEL (from $REF_DIR/supabase/.temp/project-ref). Abort if this is not the intended environment." '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: $ctx
  }
}'
exit 0
