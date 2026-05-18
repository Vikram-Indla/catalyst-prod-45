# Branch Management — Catalyst Automatic Workflow

## Overview

All feature branches in Catalyst follow a strict naming convention and are created automatically at the start of each conversation/task. This ensures consistency, traceability, and proper GitHub integration.

## Quick Start

When a task is requested:

```bash
# Step 1: Derive the branch name from task context
# Example: "Build the backlog table for BAU project"
# Derived: BAU-backlog-table

# Step 2: Create/activate the branch
./.claude/scripts/branch-manager.sh create BAU-backlog-table

# Step 3: Work on the branch (all commits here)
# Step 4: Push when done
git -C . push origin BAU-backlog-table
```

## Branch Naming Format

```
{Project}-{SideMenu}-{Component}
```

### Components

- **Project** (Hub): `BAU`, `INV`, `Projects`, `Incidents`, `Reports`, `Admin`, `Products`, `Releases`
- **SideMenu** (Sidebar item): `backlog`, `allwork`, `detail`, `incidents`, `projects`, `admin`, `resources`, etc.
- **Component** (Main element): `table`, `filter`, `modal`, `sidebar`, `detail-view`, `dashboard`, `panel`, etc.

### Examples

- `BAU-backlog-table` — Backlog list table in BAU project
- `Incidents-detail-view` — Incident detail panel
- `Projects-dashboard-filter` — Projects module dashboard filters
- `Admin-users-management` — Admin users page management
- `General-deploy` — Deployment automation (infrastructure)
- `General-hotfix` — Urgent production fix

## Script Usage

### Create a new branch

```bash
./.claude/scripts/branch-manager.sh create <branch-name>
```

Creates a branch from the current HEAD, validates the name format, and switches to it.

### Ensure a branch exists

```bash
./.claude/scripts/branch-manager.sh ensure <branch-name>
```

Creates the branch if it doesn't exist, or switches to it if it does.

### Get current branch

```bash
./.claude/scripts/branch-manager.sh current
```

Prints the name of the currently active branch.

### Validate branch name

```bash
./.claude/scripts/branch-manager.sh validate <branch-name>
```

Validates that a branch name follows the required format. Returns 0 if valid, 1 if invalid.

### List recent branches

```bash
./.claude/scripts/branch-manager.sh list
```

Shows recent branches for reference.

## Rules & Enforcement

1. **Every implementation task gets a named branch immediately** — before any code is written
2. **Branch names are derived from task context** — hub, sidebar menu, and component
3. **If context is ambiguous, ask before creating** — do not guess
4. **All commits stay on the feature branch** — never commit to main directly
5. **Push to origin with the branch name** — not to main
6. **Create a PR with the branch name as the title** — awaiting Vikram's approval
7. **Do not merge to main without explicit approval** — feature branch is the source of truth until review is complete

## Validation Rules

Branch names must match one of:

- **Feature branch**: `{CapitalProject}-{lowercase-menu}-{lowercase-component}`
  - Example: `BAU-backlog-table` ✓
  - Invalid: `BAU-BacklogTable` ✗ (mixed case)
  - Invalid: `BAUBacklogTable` ✗ (missing dashes)

- **Infrastructure branch**: `General-{descriptor}`
  - Example: `General-deploy` ✓
  - Example: `General-hotfix` ✓
  - Invalid: `General_deploy` ✗ (underscore)

## Integration with Claude Code

The branch manager integrates with Claude Code's SessionStart hook to:

1. Check if a conversation context indicates a new task
2. Suggest the branch name based on conversation history
3. Prompt for confirmation before creating
4. Ensure all commits in that conversation go to the branch

## Troubleshooting

### Branch already exists

If the branch exists locally, the script automatically switches to it instead of erroring.

```bash
./.claude/scripts/branch-manager.sh create BAU-backlog-table
# Output: Branch 'BAU-backlog-table' already exists. Switching to it...
```

### Invalid branch name

The script rejects names that don't match the format:

```bash
./.claude/scripts/branch-manager.sh create BacklogTable
# Error: Invalid branch name format: BacklogTable
# Expected format: {Project}-{SideMenu}-{Component}
```

### Check current branch

Always verify you're on the right branch before committing:

```bash
git branch --show-current
# Output: BAU-backlog-table
```

## GitHub Integration

When pushing:

```bash
git push origin BAU-backlog-table
```

GitHub automatically:
- Creates a PR if one doesn't exist
- Links to any mentioned Jira tickets in the branch name or commit messages
- Runs CI/CD on the branch
- Awaits review before merge

## Commit Format

All commits on feature branches follow this format (unchanged):

```
<verb> <what>

- Optional details
- Jira key reference (BAU-1234)
```

Example:
```
Add bulk-edit footer bar to backlog table

- Implement multi-select checkbox in first column
- Add footer bar with actions menu
- Wire up to existing bulk API
- BAU-5234
```

After pushing, request Vikram's review on the PR.
