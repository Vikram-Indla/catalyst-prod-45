#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Team token-optimization hook — RTK (Rust Token Killer)
#
# Routes Bash tool calls through `rtk hook claude`, which compresses
# command OUTPUT before it reaches the context window (60–90% fewer
# tokens on dev operations: git, grep, ls, test runs, ps, etc.).
#
# SAFE BY DESIGN: if `rtk` is not installed on this machine, the hook
# exits 0 with no output — the Bash tool call then runs completely
# unmodified. A teammate who hasn't installed rtk is NEVER blocked or
# slowed; they simply don't get the savings until they install it.
#
# Install (one-time, per machine):
#   brew install rtk && rtk init
# See .claude/TOKEN_OPTIMIZATION_SETUP.md for the full stack.
# ─────────────────────────────────────────────────────────────────────

# rtk absent → pass the tool call through untouched (no stdout = no change).
command -v rtk >/dev/null 2>&1 || exit 0

# rtk present → hand stdin (the PreToolUse hook payload) to rtk's handler.
exec rtk hook claude
