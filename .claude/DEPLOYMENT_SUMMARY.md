# Branch Management + Obsidian Handover System — DEPLOYED

## Overview

The complete branch management and Obsidian handover system has been deployed to production. All files are version-controlled in git and immediately available on any machine that pulls from origin/main.

**Deployment Date:** 2026-05-18  
**Commit:** 55d66216c  
**Status:** ✅ READY FOR USE

---

## System Architecture

### 1. Branch Management System

**Purpose:** Enforce consistent, on-demand branch creation with the naming convention:
```
{Project}-{SideMenu}-{Component}-{NN}
```

**Files:**
- `./.claude/scripts/branch-manager.sh` — Shell script for branch creation/validation
- `./.claude/scripts/BRANCH_MANAGEMENT.md` — Complete technical documentation
- `./.claude/BRANCH_WORKFLOW_QUICKREF.md` — Quick reference card
- `CLAUDE.md § 2026-05-18` — Enforcement rules and guidelines

**Key Principle:** Clean slate per conversation. Branches are created ON-DEMAND when the user explicitly requests implementation work, never pre-created or carried over from previous sessions.

### 2. Obsidian Handover Skill

**Purpose:** Capture detailed context when switching between branches and retrieve full state in subsequent conversations.

**Files:**
- `./.claude/skills/obsidian/SKILL.md` — Comprehensive skill documentation
- `./.claude/scripts/obsidian-manager.sh` — Implementation script for all handover operations
- `./.claude/obsidian-handovers/` — Vault storage directory (git version-controlled)
- `./.claude/obsidian-handovers/metadata.json` — Index of all saved handovers

**Commands:**
```bash
/obsidian save {branch-name} {branch-id} {progress}     # Save current context
/obsidian branch {branch-id}                             # Retrieve previous context
/obsidian list                                           # List all saved handovers
/obsidian delete {branch-id}                             # Archive a handover
```

---

## Usage Workflow

### Step 1: Start a Conversation (Clean Slate)

Conversation opens with NO pre-existing branch.

```
User: Build the backlog table in BAU project
Claude: Derives branch name from context...
```

### Step 2: Create Branch On-Demand

Claude derives the branch name and creates it immediately:

```bash
# Derived: BAU-backlog-table-01
git switch --create BAU-backlog-table-01
```

**Branch Name Components:**
- **Project (Hub):** BAU, INV, Projects, Incidents, Reports, Admin, etc.
- **SideMenu:** backlog, allwork, detail, incidents, dashboard, settings, etc.
- **Component:** table, filter, modal, sidebar, form, view, etc.
- **Numeric ID:** 01, 02, 03, etc. (context identifier)

### Step 3: Work & Commit

All commits go to the feature branch:

```bash
git add <files>
git commit -m "Add bulk-edit footer to backlog table"
```

### Step 4: Save Handover Before Context Switch

When pausing, save detailed context:

```bash
/obsidian save BAU-backlog-table-01 01 75
```

**Captured:**
- Current branch and git state
- File changes and commits
- Progress percentage
- Task description and context
- Next steps and resume point

### Step 5: Push When Complete

```bash
git push origin BAU-backlog-table-01
```

### Step 6: Resume in Next Conversation

New conversation, same context:

```
User: /obsidian branch 01
Claude: [Loads full context from Obsidian vault]
        [Hydrates: task, progress, files, commits, next steps]
        [Ready to continue work]
```

---

## Enforcement Rules

### ✅ MANDATORY

1. **Every conversation starts CLEAN** — No branch pre-created
2. **Branches created ON-DEMAND** — Only when user requests implementation work
3. **Branch name derives from task context** — Project, SideMenu, Component, ID (01/02/03)
4. **All commits go to the feature branch** — Never to main
5. **Push to origin with branch name** — Not to main
6. **Numeric ID links to handover** — 01 = retrieve context via `/obsidian branch 01`
7. **Handovers are self-contained** — No external file references, portable across machines

### ❌ DON'T

- Assume existing branches (like ADS-migration) should be continued
- Pre-create branches before work is requested
- Commit directly to main
- Mix multiple unrelated tasks in one branch
- Use mixed case or underscores in branch names
- Forget to save handover before context switch

---

## Multi-Machine Access

### For Any Local Machine

**Step 1: Clone or update the repository**
```bash
git pull origin main
```

**Step 2: All handovers are now available**
```bash
# List all saved handovers
./.claude/scripts/obsidian-manager.sh list

# Retrieve a specific handover
/obsidian branch 01
```

**Why It Works:**
- `.claude/obsidian-handovers/` is git version-controlled
- `metadata.json` tracks all branch handovers
- Handover files are portable Markdown with YAML frontmatter
- No external dependencies — works everywhere git is available

---

## Directory Structure

```
catalyst-prod-45/
├── .claude/
│   ├── scripts/
│   │   ├── branch-manager.sh                 ← Branch creation/validation
│   │   ├── obsidian-manager.sh               ← Handover save/retrieve
│   │   ├── BRANCH_MANAGEMENT.md              ← Full documentation
│   │   └── ...
│   ├── skills/
│   │   └── obsidian/
│   │       └── SKILL.md                      ← Skill documentation
│   ├── obsidian-handovers/
│   │   ├── metadata.json                     ← Index of all handovers
│   │   ├── BAU-backlog-table-01.md           ← Example handover
│   │   ├── Incidents-detail-view-02.md
│   │   └── ...
│   ├── BRANCH_WORKFLOW_QUICKREF.md           ← Quick reference
│   └── ...
├── CLAUDE.md                                  ← Enforcement rules
└── ...
```

---

## Implementation Details

### Branch Manager (`branch-manager.sh`)

**Validates branch names:**
- Feature: `{CapitalProject}-{lowercase-menu}-{lowercase-component}-[0-9]{2}`
- Infrastructure: `General-{descriptor}-[0-9]{2}`

**Operations:**
- `create <branch-name>` — Create and switch to branch
- `ensure <branch-name>` — Create if missing, or switch to existing
- `current` — Show current branch
- `validate <branch-name>` — Validate format
- `list` — Show recent branches

### Obsidian Manager (`obsidian-manager.sh`)

**Captures on save:**
- Git state (branch, commit, files changed)
- Commit history (last 10)
- File modifications
- Progress metadata
- Task context and next steps

**Restores on retrieve:**
- Full YAML frontmatter (metadata)
- Complete handover document
- File state and commit history
- Resume point and remaining work

**Metadata structure:**
```json
{
  "branches": {
    "01": {
      "name": "BAU-backlog-table-01",
      "project": "BAU",
      "status": "in_progress",
      "progress": 75,
      "created": "2026-05-18T10:00:00Z",
      "last_saved": "2026-05-18T14:30:00Z",
      "git_commit": "a1b2c3d"
    }
  },
  "last_updated": "2026-05-18T14:30:00Z"
}
```

---

## Quick Start

### For New Conversations

```bash
# 1. User requests: "Build the dashboard filter in Projects"
# 2. Claude derives: Projects-dashboard-filter-01
# 3. Claude creates branch and begins work
```

### For Resuming Work

```bash
# New conversation, user says:
/obsidian branch 01

# Claude output:
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Retrieving Branch Context
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Branch: BAU-backlog-table-01
# Status: in_progress (75% complete)
# Last saved: 2026-05-18T14:30:00Z
# [Full handover content displayed]
#
# To Continue:
# 1. Check out branch: git switch BAU-backlog-table-01
# 2. Pull latest changes: git pull origin BAU-backlog-table-01
# 3. Resume from the Next Steps section above
```

---

## Testing the System

### Test 1: Branch Creation
```bash
./.claude/scripts/branch-manager.sh create BAU-backlog-table-01
# Expected: ✓ Valid feature branch: BAU-backlog-table-01
#           ✓ Branch created and active: BAU-backlog-table-01
```

### Test 2: Save Handover
```bash
./.claude/scripts/obsidian-manager.sh save BAU-backlog-table-01 01 50
# Expected: ✓ Handover saved: .claude/obsidian-handovers/BAU-backlog-table-01-01.md
#           ✓ Metadata updated (branch ID: 01)
```

### Test 3: Retrieve Handover
```bash
./.claude/scripts/obsidian-manager.sh retrieve 01
# Expected: [Full handover content displayed with all context]
```

### Test 4: List Handovers
```bash
./.claude/scripts/obsidian-manager.sh list
# Expected: Table of all saved handovers with progress and status
```

### Test 5: Multi-Machine Access
On another machine:
```bash
git pull origin main
./.claude/scripts/obsidian-manager.sh list
# Expected: Same handovers available immediately
```

---

## Troubleshooting

### Branch already exists
```bash
./.claude/scripts/branch-manager.sh create BAU-backlog-table-01
# Output: Branch 'BAU-backlog-table-01' already exists. Switching to it...
```
✅ This is expected — the script will switch to the existing branch.

### Invalid branch name
```bash
./.claude/scripts/branch-manager.sh validate BacklogTable
# Output: ✗ Invalid branch name format: BacklogTable
#         Expected format: {Project}-{SideMenu}-{Component}-{NN}
```
Use dashes, include numeric ID (01/02), no spaces or underscores.

### Handover not found
```bash
./.claude/scripts/obsidian-manager.sh retrieve 99
# Output: [obsidian] No handover found for branch ID: 99
```
Use `/obsidian list` to see available branch IDs.

---

## Best Practices

1. **Save frequently** — Use `/obsidian save` before long pauses or context switches
2. **Realistic progress** — Update progress percentages accurately (0-100%)
3. **Clear next steps** — Write actionable resume points
4. **One task per branch** — Don't mix unrelated work
5. **Push when done** — `git push origin {branch-name}` after completing work
6. **Pull before resume** — `git pull origin {branch-name}` when resuming from handover

---

## System Guarantees

✅ **Immediate availability** — No setup needed on any cloned machine  
✅ **Version control** — All handovers tracked in git  
✅ **Portability** — Handovers work on any machine  
✅ **Clean slate** — Each conversation starts fresh  
✅ **Context preservation** — Full task state captured and restorable  
✅ **Multi-machine sync** — `git pull` brings all handovers to any machine  

---

## Related Documentation

- `.claude/scripts/BRANCH_MANAGEMENT.md` — Technical implementation guide
- `.claude/BRANCH_WORKFLOW_QUICKREF.md` — Daily reference card
- `.claude/skills/obsidian/SKILL.md` — Skill documentation and examples
- `CLAUDE.md § 2026-05-18` — Enforcement rules and integration

---

**Status:** ✅ PRODUCTION READY  
**Deployed:** 2026-05-18  
**Available:** All machines (git version-controlled)  
**Maintenance:** Automatic (no manual updates required)
