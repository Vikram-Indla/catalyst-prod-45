#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
# Claude Code Branch Manager — Catalyst
#
# Automatic branch creation and validation for feature work.
#
# Usage:
#   branch-manager.sh create <branch-name>
#   branch-manager.sh ensure <branch-name>
#   branch-manager.sh current
#   branch-manager.sh validate <branch-name>
#
# ─────────────────────────────────────────────────────────────────────
set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
cd "$PROJECT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─────────────────────────────────────────────────────────────────────
# Helper: Print colored output
# ─────────────────────────────────────────────────────────────────────
log_info() {
  echo -e "${GREEN}[branch-manager]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[branch-manager]${NC} $1"
}

log_error() {
  echo -e "${RED}[branch-manager]${NC} $1" >&2
}

# ─────────────────────────────────────────────────────────────────────
# Function: Validate branch name format
# Expected: {Project}-{SideMenu}-{Component}-{NN}
# Where NN = two-digit identifier (01, 02, 03, etc.)
# ─────────────────────────────────────────────────────────────────────
validate_branch_name() {
  local branch_name="$1"

  # Allow General-* branches with numeric ID
  if [[ "$branch_name" =~ ^General-[a-z-]+-[0-9]{2}$ ]]; then
    log_info "✓ Valid infrastructure branch: $branch_name"
    return 0
  fi

  # Check for {Project}-{SideMenu}-{Component}-{NN} pattern
  if [[ "$branch_name" =~ ^[A-Za-z0-9]+-[a-z-]+-[a-z-]+-[0-9]{2}$ ]]; then
    log_info "✓ Valid feature branch: $branch_name"
    return 0
  fi

  log_error "Invalid branch name format: $branch_name"
  log_error "Expected format: {Project}-{SideMenu}-{Component}-{NN}"
  log_error "Where NN = two-digit identifier (01, 02, 03, etc.)"
  log_error "Examples: BAU-backlog-table-01, Projects-dashboard-filter-01, General-deploy-01"
  return 1
}

# ─────────────────────────────────────────────────────────────────────
# Function: Create a new branch
# ─────────────────────────────────────────────────────────────────────
create_branch() {
  local branch_name="$1"

  validate_branch_name "$branch_name" || return 1

  # Check if branch already exists
  if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
    log_warn "Branch '$branch_name' already exists. Switching to it..."
    git switch "$branch_name" >/dev/null 2>&1
    log_info "Switched to branch: $(git branch --show-current)"
    return 0
  fi

  # Create branch from current HEAD
  log_info "Creating new branch: $branch_name"
  git switch --create "$branch_name" >/dev/null 2>&1

  if [ $? -eq 0 ]; then
    log_info "✓ Branch created and active: $branch_name"
    log_info "Current branch: $(git branch --show-current)"
    return 0
  else
    log_error "Failed to create branch: $branch_name"
    return 1
  fi
}

# ─────────────────────────────────────────────────────────────────────
# Function: Ensure a branch exists (create if missing)
# ─────────────────────────────────────────────────────────────────────
ensure_branch() {
  local branch_name="$1"

  validate_branch_name "$branch_name" || return 1

  # If branch exists, switch to it
  if git rev-parse --verify "$branch_name" >/dev/null 2>&1; then
    git switch "$branch_name" >/dev/null 2>&1
    log_info "Ensured branch exists and is active: $branch_name"
    return 0
  fi

  # Otherwise create it
  create_branch "$branch_name"
}

# ─────────────────────────────────────────────────────────────────────
# Function: Get current branch
# ─────────────────────────────────────────────────────────────────────
get_current_branch() {
  git branch --show-current
}

# ─────────────────────────────────────────────────────────────────────
# Function: List recent branches (for context)
# ─────────────────────────────────────────────────────────────────────
list_recent_branches() {
  log_info "Recent branches:"
  git branch -v | head -10
}

# ─────────────────────────────────────────────────────────────────────
# Main dispatch
# ─────────────────────────────────────────────────────────────────────
command="${1:-}"

case "$command" in
  create)
    branch_name="${2:-}"
    if [ -z "$branch_name" ]; then
      log_error "Usage: branch-manager.sh create <branch-name>"
      exit 1
    fi
    create_branch "$branch_name"
    ;;
  ensure)
    branch_name="${2:-}"
    if [ -z "$branch_name" ]; then
      log_error "Usage: branch-manager.sh ensure <branch-name>"
      exit 1
    fi
    ensure_branch "$branch_name"
    ;;
  current)
    current=$(get_current_branch)
    echo "$current"
    log_info "Current branch: $current"
    ;;
  validate)
    branch_name="${2:-}"
    if [ -z "$branch_name" ]; then
      log_error "Usage: branch-manager.sh validate <branch-name>"
      exit 1
    fi
    validate_branch_name "$branch_name"
    ;;
  list)
    list_recent_branches
    ;;
  *)
    echo "Branch Manager — Catalyst Feature Branch Automation"
    echo ""
    echo "Usage:"
    echo "  branch-manager.sh create <branch-name>    Create and switch to branch"
    echo "  branch-manager.sh ensure <branch-name>    Ensure branch exists"
    echo "  branch-manager.sh current                 Show current branch"
    echo "  branch-manager.sh validate <branch-name>  Validate branch name format"
    echo "  branch-manager.sh list                    List recent branches"
    echo ""
    echo "Branch format: {Project}-{SideMenu}-{Component}"
    echo "Examples: BAU-backlog-table, General-deploy"
    exit 0
    ;;
esac
