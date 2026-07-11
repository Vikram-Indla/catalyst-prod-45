#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Chrome Native Host Timeout Wrapper
#
# Points: Chrome native messaging manifest → this wrapper → real host binary
# Purpose: enforce a 30-second timeout on every native host invocation so
#   a broken/hung host can never block Claude indefinitely.
#
# Setup (one-time, run manually):
#
#   1. Find the real native host binary path:
#        MANIFEST=~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json
#        REAL_HOST=$(python3 -c "import json,sys; print(json.load(open(sys.argv[1]))['path'])" "$MANIFEST")
#
#   2. Export it into this wrapper's env (add to your shell profile):
#        export CLAUDE_CHROME_NATIVE_HOST_BIN="$REAL_HOST"
#
#   3. Point the manifest at this wrapper:
#        python3 - <<'EOF'
#        import json, os
#        manifest = os.path.expanduser(
#          "~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.anthropic.claude_browser_extension.json")
#        with open(manifest) as f: data = json.load(f)
#        data["path"] = os.path.expanduser(
#          "~/Documents/GitHub/catalyst-prod-45/.claude/hooks/chrome-native-host-wrapper.sh")
#        with open(manifest, "w") as f: json.dump(data, f, indent=2)
#        print("Manifest updated:", manifest)
#        EOF
#
#   4. Restart Chrome.
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

REAL_HOST="${CLAUDE_CHROME_NATIVE_HOST_BIN:-}"

if [ -z "$REAL_HOST" ]; then
  # Auto-detect: look for the real binary next to this script or in common paths
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  for candidate in \
    "${SCRIPT_DIR}/chrome-native-host-real" \
    "/Applications/Claude.app/Contents/MacOS/chrome-native-host" \
    "${HOME}/Library/Application Support/claude-chrome-extension/chrome-native-host"; do
    if [ -x "$candidate" ]; then
      REAL_HOST="$candidate"
      break
    fi
  done
fi

if [ -z "$REAL_HOST" ] || [ ! -x "$REAL_HOST" ]; then
  # Log the failure to stderr (Chrome extension sees it as a native messaging error,
  # which is recoverable — much better than hanging forever).
  echo '{"error":"chrome-native-host-wrapper: real host binary not found — set CLAUDE_CHROME_NATIVE_HOST_BIN"}' >&2
  exit 1
fi

# Enforce a 30-second timeout. If the host hangs, it gets SIGTERM after 30s.
# Claude Code sees an EOF / broken pipe — which it can handle — instead of
# blocking indefinitely.
exec timeout 30 "$REAL_HOST" "$@"
