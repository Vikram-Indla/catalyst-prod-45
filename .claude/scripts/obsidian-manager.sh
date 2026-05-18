#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Claude Code Obsidian Handover Manager — Catalyst
#
# Manages detailed handovers and branch context in the Obsidian vault.
# Captures full conversation state, progress, and metadata when transitioning
# between branches or conversations, and retrieves that context when resuming.
#
# Usage:
#   obsidian-manager.sh save <branch-name> <branch-id>
#   obsidian-manager.sh retrieve <branch-id>
#   obsidian-manager.sh list
#   obsidian-manager.sh delete <branch-id>
#
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

HANDOVER_DIR=".claude/obsidian-handovers"
METADATA_FILE="$HANDOVER_DIR/metadata.json"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ─────────────────────────────────────────────────────────────────────
# Helper: Print colored output
# ─────────────────────────────────────────────────────────────────────
log_info() {
  echo -e "${GREEN}[obsidian]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[obsidian]${NC} $1"
}

log_error() {
  echo -e "${RED}[obsidian]${NC} $1" >&2
}

log_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ─────────────────────────────────────────────────────────────────────
# Function: Initialize metadata if missing
# ─────────────────────────────────────────────────────────────────────
ensure_metadata() {
  if [ ! -f "$METADATA_FILE" ]; then
    mkdir -p "$HANDOVER_DIR"
    echo '{"branches": {}, "last_updated": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}' > "$METADATA_FILE"
    log_info "Metadata file initialized"
  fi
}

# ─────────────────────────────────────────────────────────────────────
# Function: Get current git state
# ─────────────────────────────────────────────────────────────────────
get_git_state() {
  local branch_name=$(git -C "$PROJECT_DIR" branch --show-current)
  local commit_hash=$(git -C "$PROJECT_DIR" rev-parse HEAD)
  local commit_short=$(git -C "$PROJECT_DIR" rev-parse --short HEAD)
  local changed_files=$(git -C "$PROJECT_DIR" diff --name-only | wc -l)
  local staged_files=$(git -C "$PROJECT_DIR" diff --cached --name-only | wc -l)
  local untracked_files=$(git -C "$PROJECT_DIR" ls-files --others --exclude-standard | wc -l)

  echo "{\"branch\":\"$branch_name\",\"commit\":\"$commit_hash\",\"commit_short\":\"$commit_short\",\"changed_files\":$changed_files,\"staged_files\":$staged_files,\"untracked_files\":$untracked_files}"
}

# ─────────────────────────────────────────────────────────────────────
# Function: Get recent commits
# ─────────────────────────────────────────────────────────────────────
get_recent_commits() {
  local format='%H|%h|%s|%ai|%an'
  git -C "$PROJECT_DIR" log --pretty=format:"$format" -10 2>/dev/null || echo ""
}

# ─────────────────────────────────────────────────────────────────────
# Function: Get modified files list
# ─────────────────────────────────────────────────────────────────────
get_modified_files() {
  git -C "$PROJECT_DIR" diff --name-only
  git -C "$PROJECT_DIR" diff --cached --name-only
  git -C "$PROJECT_DIR" ls-files --others --exclude-standard
}

# ─────────────────────────────────────────────────────────────────────
# Function: Save handover
# ─────────────────────────────────────────────────────────────────────
save_handover() {
  local branch_name="$1"
  local branch_id="$2"
  local progress="${3:-50}"

  # If branch_name not provided, auto-detect from current git branch
  if [ -z "$branch_name" ]; then
    branch_name=$(git -C "$PROJECT_DIR" branch --show-current)
    if [ -z "$branch_name" ] || [ "$branch_name" = "HEAD" ]; then
      log_error "Not on a valid git branch. Please switch to a feature branch first."
      return 1
    fi
  fi

  # If branch_id not provided, extract from branch_name (e.g., BAU-backlog-table-01 -> 01)
  if [ -z "$branch_id" ]; then
    branch_id=$(echo "$branch_name" | sed 's/.*-\([0-9][0-9]\)$/\1/')
    if [ "$branch_id" = "$branch_name" ]; then
      log_error "Branch name must follow format: {Project}-{SideMenu}-{Component}-{NN}"
      log_error "Current branch: $branch_name"
      log_error "Example: BAU-backlog-table-01"
      return 1
    fi
  fi

  # Extract components from branch name (format: {Project}-{SideMenu}-{Component}-{NN})
  local project=$(echo "$branch_name" | cut -d'-' -f1)
  local menu=$(echo "$branch_name" | cut -d'-' -f2)
  local component=$(echo "$branch_name" | cut -d'-' -f3)

  ensure_metadata

  # Create handover filename
  local handover_file="$HANDOVER_DIR/${branch_name}-${branch_id}.md"

  # Get git state
  local git_state=$(get_git_state)
  local git_branch=$(echo "$git_state" | grep -o '"branch":"[^"]*' | cut -d'"' -f4)
  local commit_short=$(echo "$git_state" | grep -o '"commit_short":"[^"]*' | cut -d'"' -f4)
  local changed_files=$(echo "$git_state" | grep -o '"changed_files":[0-9]*' | cut -d':' -f2)
  local staged_files=$(echo "$git_state" | grep -o '"staged_files":[0-9]*' | cut -d':' -f2)
  local untracked_files=$(echo "$git_state" | grep -o '"untracked_files":[0-9]*' | cut -d':' -f2)

  # Get recent commits
  local commits_list=""
  while IFS='|' read -r hash short msg date author; do
    [ -n "$hash" ] && commits_list+="$short - $msg"$'\n'
  done < <(get_recent_commits)

  # Get modified files
  local files_changed=$(mktemp)
  get_modified_files > "$files_changed" 2>/dev/null || true

  local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  local progress=${3:-0}

  # Create YAML frontmatter
  cat > "$handover_file" << 'FRONTMATTER'
---
FRONTMATTER

  cat >> "$handover_file" << EOF
branch: $branch_name
branch_id: $branch_id
project: $project
menu: $menu
component: $component
status: in_progress
progress: $progress
created: $timestamp
last_saved: $timestamp
saved_by: claude-code
git_branch: $git_branch
git_commit: $commit_short
changed_files: $changed_files
staged_files: $staged_files
untracked_files: $untracked_files
---

# $branch_name Handover

## Task Context

Branch: \`$branch_name\` (ID: \`$branch_id\`)
Project: \`$project\`
Menu: \`$menu\`
Component: \`$component\`

## Current State

**Git Status:**
- Branch: \`$git_branch\`
- Latest commit: \`$commit_short\`
- Changed files: $changed_files
- Staged files: $staged_files
- Untracked files: $untracked_files

## Recent Commits

\`\`\`
$commits_list
\`\`\`

## Modified Files

\`\`\`
$(cat "$files_changed" | head -20)
\`\`\`

## Progress

**Status:** In Progress ($progress%)

### Completed
- [Add details of completed work]

### In Progress
- [Current focus]

### Remaining
- [Upcoming tasks]

## Next Steps

1. [Next action]
2. [Subsequent tasks]

## Notes

- Auto-generated by obsidian-manager.sh on $timestamp
- Ready for context restoration via \`/obsidian branch $branch_id\`

EOF

  rm "$files_changed"

  # Update metadata
  local metadata_tmp=$(mktemp)
  jq ".branches[\"$branch_id\"] = {
    \"name\": \"$branch_name\",
    \"project\": \"$project\",
    \"menu\": \"$menu\",
    \"component\": \"$component\",
    \"status\": \"in_progress\",
    \"progress\": $progress,
    \"created\": \"$timestamp\",
    \"last_saved\": \"$timestamp\",
    \"git_branch\": \"$git_branch\",
    \"git_commit\": \"$commit_short\"
  } | .last_updated = \"$timestamp\"" "$METADATA_FILE" > "$metadata_tmp"
  mv "$metadata_tmp" "$METADATA_FILE"

  log_info "✓ Handover saved: $handover_file"
  log_info "✓ Metadata updated (branch ID: $branch_id)"
  echo ""
  log_header "Resume Point"
  echo "Next conversation, use: /obsidian branch $branch_id"
}

# ─────────────────────────────────────────────────────────────────────
# Function: Retrieve handover
# ─────────────────────────────────────────────────────────────────────
retrieve_handover() {
  local branch_id="$1"

  ensure_metadata

  # Find handover file matching this branch ID
  local handover_file=$(find "$HANDOVER_DIR" -name "*-${branch_id}.md" -type f | head -1)

  if [ -z "$handover_file" ] || [ ! -f "$handover_file" ]; then
    log_error "No handover found for branch ID: $branch_id"
    return 1
  fi

  # Extract branch name from filename (remove .md and -NN suffix)
  local filename=$(basename "$handover_file")
  local branch_name=$(echo "$filename" | sed "s/-${branch_id}.md$//")

  log_header "Retrieving Branch Context"

  # Read metadata
  local metadata=$(jq ".branches[\"$branch_id\"]" "$METADATA_FILE" 2>/dev/null || echo "{}")
  local status=$(echo "$metadata" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
  local progress=$(echo "$metadata" | jq -r '.progress // 0' 2>/dev/null || echo "0")
  local last_saved=$(echo "$metadata" | jq -r '.last_saved // "unknown"' 2>/dev/null || echo "unknown")

  log_info "Branch: $branch_name"
  log_info "Status: $status (${progress}% complete)"
  log_info "Last saved: $last_saved"
  echo ""

  # Display handover content
  log_header "Handover Content"
  cat "$handover_file"

  echo ""
  log_header "To Continue"
  echo "1. Check out branch: \`git switch $branch_name\`"
  echo "2. Pull latest changes: \`git pull origin $branch_name\`"
  echo "3. Resume from the Next Steps section above"
}

# ─────────────────────────────────────────────────────────────────────
# Function: List all handovers
# ─────────────────────────────────────────────────────────────────────
list_handovers() {
  ensure_metadata

  log_header "Saved Handovers"

  local count=$(jq '.branches | length' "$METADATA_FILE" 2>/dev/null || echo "0")

  if [ "$count" -eq 0 ]; then
    log_warn "No saved handovers found"
    return 0
  fi

  echo ""
  jq -r '.branches | to_entries[] | "\(.key) | \(.value.name) | Progress: \(.value.progress)% | Status: \(.value.status) | Saved: \(.value.last_saved)"' "$METADATA_FILE" | column -t -s '|' || true
  echo ""
}

# ─────────────────────────────────────────────────────────────────────
# Function: Delete (archive) handover
# ─────────────────────────────────────────────────────────────────────
delete_handover() {
  local branch_id="$1"

  ensure_metadata

  # Find and remove handover file
  local handover_file=$(find "$HANDOVER_DIR" -name "*-${branch_id}.md" -type f | head -1)

  if [ -z "$handover_file" ] || [ ! -f "$handover_file" ]; then
    log_error "No handover found for branch ID: $branch_id"
    return 1
  fi

  # Move to archive (soft delete)
  local archive_dir="$HANDOVER_DIR/.archive"
  mkdir -p "$archive_dir"
  mv "$handover_file" "$archive_dir/$(basename "$handover_file").archived"

  # Remove from metadata
  local metadata_tmp=$(mktemp)
  jq "del(.branches[\"$branch_id\"])" "$METADATA_FILE" > "$metadata_tmp"
  mv "$metadata_tmp" "$METADATA_FILE"

  log_info "✓ Handover archived for branch ID: $branch_id"
}

# ─────────────────────────────────────────────────────────────────────
# Main dispatch
# ─────────────────────────────────────────────────────────────────────
command="${1:-}"

case "$command" in
  save)
    branch_name="${2:-}"
    branch_id="${3:-}"
    progress="${4:-50}"
    # Note: branch_name and branch_id are optional — will be auto-detected from current git branch
    save_handover "$branch_name" "$branch_id" "$progress"
    ;;
  retrieve)
    branch_id="${2:-}"
    if [ -z "$branch_id" ]; then
      log_error "Usage: obsidian-manager.sh retrieve <branch-id>"
      exit 1
    fi
    retrieve_handover "$branch_id"
    ;;
  list)
    list_handovers
    ;;
  delete)
    branch_id="${2:-}"
    if [ -z "$branch_id" ]; then
      log_error "Usage: obsidian-manager.sh delete <branch-id>"
      exit 1
    fi
    delete_handover "$branch_id"
    ;;
  *)
    echo "Obsidian Handover Manager — Catalyst Branch Context Management"
    echo ""
    echo "Usage:"
    echo "  obsidian-manager.sh save [progress]              # Auto-detect current branch"
    echo "  obsidian-manager.sh retrieve <branch-id>"
    echo "  obsidian-manager.sh list"
    echo "  obsidian-manager.sh delete <branch-id>"
    echo ""
    echo "Examples:"
    echo "  obsidian-manager.sh save                # Auto-detect branch, 50% progress (default)"
    echo "  obsidian-manager.sh save 75             # Auto-detect branch, 75% progress"
    echo "  obsidian-manager.sh retrieve 01         # Retrieve handover for branch ID 01"
    echo "  obsidian-manager.sh list                # List all saved handovers"
    echo ""
    echo "Branch Format (auto-detected):"
    echo "  {Project}-{SideMenu}-{Component}-{NN}"
    echo "  Example: BAU-backlog-table-01"
    echo ""
    exit 0
    ;;
esac
