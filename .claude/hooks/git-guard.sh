#!/bin/sh
# PreToolUse guard — enforces the CLAUDE.md L4 git ban at the harness level.
# Blocks:
#   - blanket staging:  git add -A | git add . | git add --all
#   - low-effort sweep commits:  git commit -m "cc" (the 2026-06-17 itsm-sweep signature)
# Fail-open: if the command can't be parsed, allow (never brick Bash).
#
# Hook protocol: read JSON on stdin, exit 2 + stderr message to BLOCK, exit 0 to allow.

input=$(cat)
cmd=$(printf '%s' "$input" | python3 -c "import sys,json;print(json.load(sys.stdin).get('tool_input',{}).get('command',''))" 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Anchor to real command positions: start-of-string or after a shell separator
# (&& ; | &). Avoids false positives on `echo "git add -A"` / grep / docs where
# the phrase is inside quotes or another command's argument.
SEP='(^|[|;&][[:space:]]*)'

# 1) blanket add — -A / --all / a bare '.' (but allow explicit paths like 'git add ./src/x')
if printf '%s' "$cmd" | grep -qE "${SEP}git[[:space:]]+add[[:space:]]+(-A|--all|\.([[:space:]]|\$|;|&|\)))"; then
  echo "BLOCKED: 'git add -A / . / --all' is banned (CLAUDE.md L4 — sweeps stale/parallel-session files into the commit). Stage explicit paths instead: git add path/a path/b. Run 'git status' first." >&2
  exit 2
fi

# 2) low-effort 'cc' commit message (covers -m / -am / -ma).
# The message must be EXACTLY cc: after cc, allow an optional closing quote then
# require end-of-command or a shell separator. This avoids matching a 'cc' that
# appears INSIDE a longer legitimate message (text after the mention → allowed).
# Known edge: a legit message that *ends* in the literal "-m cc" is indistinguishable
# from a real `commit -m cc` and will be blocked — rephrase it (vanishingly rare).
if printf '%s' "$cmd" | grep -qE "git[[:space:]]+commit.*-[a-zA-Z]*m[[:space:]]*['\"]?cc['\"]?[[:space:]]*(\$|;|&|\|)"; then
  echo "BLOCKED: 'git commit -m cc' is banned — terse blanket commits sweep unrelated work (the 2026-06-17 ITSM-into-b2068f795 incident). Use a descriptive message AND explicit staged paths." >&2
  exit 2
fi

exit 0
