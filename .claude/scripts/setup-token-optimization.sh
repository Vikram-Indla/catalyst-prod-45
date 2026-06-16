#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────
# Catalyst — Token Optimization Stack installer (run once per machine)
#
# Installs the two tools the repo's .claude/settings.json hooks use:
#   • RTK (Rust Token Killer) — input compression on Bash output
#   • Caveman — output compression on Claude's prose (Claude Code plugin)
#
# The repo hooks are SAFE without these: RTK's hook no-ops if rtk is
# absent, and the caveman plugin only activates once installed. This
# script just turns the savings ON for your machine.
#
# Usage:  bash .claude/scripts/setup-token-optimization.sh
# ─────────────────────────────────────────────────────────────────────
set -uo pipefail

echo "▸ Catalyst token-optimization setup"

# ── RTK ───────────────────────────────────────────────────────────────
if command -v rtk >/dev/null 2>&1; then
  echo "  ✓ rtk already installed ($(rtk --version 2>/dev/null || echo 'unknown'))"
else
  if command -v brew >/dev/null 2>&1; then
    echo "  • installing rtk via Homebrew…"
    brew install rtk && rtk init || echo "  ⚠ rtk install failed — see https://github.com (rtk)"
  else
    echo "  ⚠ Homebrew not found. Install rtk manually, then run: rtk init"
  fi
fi

# ── Caveman (Claude Code plugin) ──────────────────────────────────────
# Preferred: the plugin is declared in .claude/settings.json
# (extraKnownMarketplaces + enabledPlugins). On next Claude Code start in
# this repo you'll be prompted to trust the "caveman" marketplace and the
# plugin installs itself. If you prefer the standalone installer:
echo "  • Caveman ships as a Claude Code plugin declared in .claude/settings.json."
echo "    Reload Claude Code in this repo and approve the 'caveman' marketplace prompt."
echo "    (Standalone fallback: curl -fsSL https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.sh | bash)"

echo "▸ Done. Reload Claude Code. Verify with: rtk gain   (and /caveman in chat)"
