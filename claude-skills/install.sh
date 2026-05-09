#!/usr/bin/env bash
# Install claude-skills into ~/.claude/skills and ~/.claude/plugins
# Usage: bash install.sh [--dry-run]

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$HOME/.claude/skills"
PLUGINS_DIR="$HOME/.claude/plugins"
DRY_RUN=false

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

install_dir() {
  local src="$1" dst="$2"
  if $DRY_RUN; then
    echo "[dry-run] Would copy $src → $dst"
  else
    mkdir -p "$(dirname "$dst")"
    cp -r "$src" "$dst"
    echo "✓ Installed $(basename "$dst")"
  fi
}

echo "Installing Claude skills from $REPO_DIR"
echo ""

# --- Regular skills (go into ~/.claude/skills/<name>/) ---
for skill_dir in "$REPO_DIR"/jira-compare "$REPO_DIR"/design-intelligence; do
  name="$(basename "$skill_dir")"
  dst="$SKILLS_DIR/$name"
  if [[ -d "$dst" ]]; then
    echo "⚠  $name already exists at $dst — skipping (delete it first to reinstall)"
  else
    install_dir "$skill_dir" "$dst"
  fi
done

# --- Plugin skills (go into ~/.claude/plugins/<name>/) ---
plugin_src="$REPO_DIR/preflight-plugin"
plugin_dst="$PLUGINS_DIR/preflight"
if [[ -d "$plugin_dst" ]]; then
  echo "⚠  preflight plugin already exists at $plugin_dst — skipping (delete it first to reinstall)"
else
  install_dir "$plugin_src" "$plugin_dst"
fi

echo ""
echo "Done. Restart Claude Code (or run /reload-skills if available) to pick up new skills."
