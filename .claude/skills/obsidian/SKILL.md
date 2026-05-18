# Obsidian Handover Skill — Branch Context Management

## ⚠️ CRITICAL REQUIREMENT — CLAUDE.MD MUST BE READ FIRST

**Every single invocation of `/obsidian` commands MUST follow this sequence:**

1. **READ CLAUDE.md** (`.claude/CLAUDE.md`) — Load enforcement rules, branch naming, guidelines
2. **VERIFY RULES** — Confirm branch validation regex, constraints, project context
3. **RETRIEVE HANDOVER** — Load transcript from `.claude/obsidian-handovers/`
4. **DISPLAY CONTEXT** — Show full task state, progress, commits, next steps
5. **PROVIDE RESUME POINT** — Clear next actions and file locations

**Exceptions:** None. CLAUDE.md is always read first, before any handover retrieval.

**Why:** Handovers are context snapshots, but CLAUDE.md is the living source of truth for rules, constraints, and current project state. Without reading CLAUDE.md first, enforced patterns (branch naming, design system, banned fields, etc.) from when the handover was saved may be stale or conflicting with updated rules.

---

## Overview

The `/obsidian` skill manages detailed handovers and branch context in the centralized Obsidian vault (`.claude/obsidian-handovers/`). It captures full conversation state, progress, and metadata when transitioning between branches or conversations, and retrieves that context when resuming work.

**Centralization Model:** All handovers are stored in `.claude/obsidian-handovers/` (git version-controlled), making them immediately accessible from any local machine working on the GitHub repo. No Obsidian vault setup required — just `git pull origin main`.

## Commands

### `/obsidian save`

Saves a detailed handover to the Obsidian vault.

```
/obsidian save
```

**What it captures:**
- Current branch name and numeric ID
- Full task description and context
- Current file changes and uncommitted work
- Commit history for this branch
- Progress summary and next steps
- Git status (staged, unstaged, untracked)
- Time saved and contributor info

**Output:**
- Creates/updates `handover-{BRANCH-NAME}-{NN}.md` in Obsidian vault
- Returns confirmation with file location
- Stores metadata in `.claude/obsidian-handovers/metadata.json`

**Example:**
```
You: /obsidian save
Claude: Saving handover for branch BAU-backlog-table-01...
✓ Saved to: .claude/obsidian-handovers/BAU-backlog-table-01.md
✓ Metadata updated
✓ Next branch ID will be 02
```

---

### `/obsidian branch {NN}`

Retrieves and hydrates context from a previous branch.

```
/obsidian branch 01
```

**MANDATORY SEQUENCE (on every invocation):**
1. **Read CLAUDE.md first** — Load all enforcement rules, constraints, and guidelines from `CLAUDE.md`
2. **Verify branch rules** — Confirm branch naming convention and validation rules
3. **Retrieve handover** — Load the handover transcript from `.claude/obsidian-handovers/`
4. **Display full context** — Show task, progress, files, commits, and next steps
5. **Ready to continue** — Provide resume point and next actions

**What it restores:**
- CLAUDE.md rules and enforcement context (read first)
- Full branch context and task description
- File changes made
- Commits and their messages
- Progress summary and remaining work
- Time elapsed since last save
- Contributor notes

**Behavior:**
- If branch exists locally, switches to it
- If branch doesn't exist, guides creation
- Hydrates all context from Obsidian vault
- Displays previous progress and next steps
- Suggests resume point
- **ALWAYS reads CLAUDE.md before retrieving handover** (non-negotiable)

**Example:**
```
You: /obsidian branch 01
Claude: 
  [Reading CLAUDE.md § 2026-05-18...]
  ✓ Branch naming rules loaded: {Project}-{SideMenu}-{Component}-{NN}
  ✓ Design system guardrail verified: @atlaskit/*, var(--ds-*) tokens only
  ✓ On-demand branch creation rule confirmed
  ✓ CLAUDE.md constraints and rules loaded
  
  [Retrieving handover 01...]
  ✓ Handover found: BAU-backlog-table-01-01.md
  ✓ Branch exists locally
  ✓ Context loaded
  ✓ Last saved: 2 days ago
  ✓ Progress: 60% complete

═══════════════════════════════════════════════════════════════
HANDOVER CONTEXT (01)
═══════════════════════════════════════════════════════════════

Task: Build backlog list table in BAU project

Branch: BAU-backlog-table-01 (ID: 01)
Status: in_progress (60% complete)
Last saved: 2026-05-16T14:30:00Z

Previous work (verified against CLAUDE.md rules):
  ✓ Created columns: Key, Summary, Status, Comments
  ✓ Wired up sorting and filtering (@atlaskit/table + var(--ds-*) tokens)
  ✓ Design system audit passed
  
Remaining work (per CLAUDE.md constraints):
  - Add drag-and-drop row reordering
  - Implement bulk actions footer (Atlaskit + ADS tokens)
  - Wire up to CRUD API (CLAUDE.md 2026-05-12 data model)
  - Run design-critique before marking complete

Continue from: Add drag-and-drop row reordering
Next: Follow branch-manager.sh validation (BAU-backlog-table-01 naming confirmed)
═══════════════════════════════════════════════════════════════
```

---

### `/obsidian list`

Lists all saved handovers and branch IDs.

```
/obsidian list
```

**Output:**
- Table of all branches with metadata
- Last saved date/time
- Completion percentage
- Status (active, archived, merged)

---

### `/obsidian delete {NN}`

Archives a handover (soft delete).

```
/obsidian delete 01
```

**Behavior:**
- Marks handover as archived (doesn't delete)
- Can be restored if needed
- Helps clean up stale branches

---

## Storage Structure

Handovers are stored in `.claude/obsidian-handovers/`:

```
.claude/obsidian-handovers/
├── BAU-backlog-table-01.md          # Full handover document
├── BAU-backlog-table-02.md          # Second iteration
├── Incidents-detail-view-01.md
├── General-deploy-01.md
└── metadata.json                     # Index of all handovers
```

## Handover Document Format

Each handover is a structured Markdown file with YAML frontmatter:

```markdown
---
branch: BAU-backlog-table-01
branch_id: 01
project: BAU
menu: backlog
component: table
status: in_progress
progress: 60
created: 2026-05-18T10:00:00Z
last_saved: 2026-05-18T14:30:00Z
saved_by: claude-code
estimated_completion: 2026-05-19
---

# BAU-backlog-table-01 Handover

## Task
Build the backlog list table in BAU project with sorting, filtering, and bulk actions.

## Context
Started: 2026-05-18
Current branch: BAU-backlog-table-01
Local commits: 5
Uncommitted changes: 3 files

## Progress (60%)

### ✅ Completed
- Column structure (Key, Summary, Status, Comments, Parent, Fix versions)
- Sorting implementation
- Column picker interface
- Filter bar integration

### 🔄 In Progress
- Drag-and-drop row reordering

### ⏳ Remaining
- Bulk actions footer bar
- Bulk change wizard (edit, move, transition, delete)
- API wiring for CRUD operations
- Test coverage

## File Changes
```
src/components/BacklogPage.tsx (modified)
src/components/shared/JiraTable/cells.tsx (modified)
src/components/shared/JiraTable/JiraTable.tsx (modified)
src/hooks/useBacklogItems.ts (new)
```

## Recent Commits
```
5a2c3b1 - Add column picker to backlog table
3f1d2e4 - Implement sorting by column
2c1a0f5 - Wire filter bar to table
1e9d8c4 - Create table skeleton component
0b7a6f2 - Add useBacklogItems hook
```

## Next Steps
1. Implement drag-and-drop row reordering using react-beautiful-dnd
2. Create bulk actions footer bar (multi-select + actions dropdown)
3. Build bulk change wizard (4-step modal for edit/move/transition/delete)
4. Wire bulk endpoints to API
5. Test with real data

## Notes
- Design-audit passed for current state
- Jira parity at 85% (see jira-compare notes)
- TypeScript compilation clean
- No console errors

## Resume Point
**Next action:** Add drag-and-drop row reordering to BacklogPage.tsx line 342

**Code snippet to continue:**
```typescript
// In BacklogPage.tsx around line 342
// Add DragDropContext wrapper around JiraTable
// Implement onDragEnd handler
```

## Related Documentation
- [CLAUDE.md § 2026-05-18](../../CLAUDE.md) — Branch management rules
- [BacklogPage spec](../docs/BACKLOG_SPEC.md) — Feature specification
- [Jira parity audit](./jira-compare-notes.md) — Parity status

---

*Auto-generated by /obsidian save on 2026-05-18 at 14:30 UTC*
```

## Workflow Integration

### At Conversation Start

When you reference a branch ID or open with no context:

```
You: /obsidian branch 01
Claude: [Retrieves and hydrates context automatically]
```

### Mid-Conversation Save

When transitioning or taking a break:

```
You: /obsidian save
Claude: [Captures current state, commits pending work, saves handover]
```

### Resuming Next Session

Next conversation, same context is available:

```
New conversation opens
You: /obsidian branch 01
Claude: [Full context restored immediately]
```

## Handover Metadata (metadata.json)

```json
{
  "branches": {
    "01": {
      "name": "BAU-backlog-table-01",
      "project": "BAU",
      "menu": "backlog",
      "component": "table",
      "status": "in_progress",
      "progress": 60,
      "created": "2026-05-18T10:00:00Z",
      "last_saved": "2026-05-18T14:30:00Z",
      "local_commits": 5,
      "uncommitted_files": 3,
      "next_id": 2
    },
    "02": {
      "name": "BAU-backlog-table-02",
      "status": "planning",
      "progress": 0,
      "created": "2026-05-18T15:00:00Z",
      "last_saved": "2026-05-18T15:05:00Z"
    }
  },
  "last_updated": "2026-05-18T15:05:00Z"
}
```

## Session Warm-Up

Before every conversation, check for available handovers:

1. If user mentions a branch ID → Retrieve and hydrate
2. If current git branch exists in handover → Offer to restore
3. If new conversation → Start clean (no handover)

## Multi-Machine Access — Centralized Obsidian Vault

All handovers are stored in **`.claude/obsidian-handovers/`** which is the **centralized, authoritative source for all branch context** across the entire project:

### Centralization Guarantee
- ✅ **Version-controlled in git** — All handovers committed to GitHub
- ✅ **Shared across all machines** — Pull origin/main → handovers available instantly
- ✅ **Accessible to all team members** — No setup, no Obsidian app required
- ✅ **Authoritative & singular** — One source of truth per branch ID
- ✅ **Safe to push to origin** — Design is for multi-machine git sync
- ✅ **No external dependencies** — Works on any machine with git

### How to Access Handovers from Any Local Machine

**On any machine working on this GitHub repo:**

```bash
# Step 1: Pull latest handovers from GitHub
git pull origin main

# Step 2: List available handovers
/obsidian list
# Output shows all branch IDs (01, 02, 03, etc.) with progress

# Step 3: Retrieve specific handover
/obsidian branch 01
# Reads CLAUDE.md first, then displays full context

# Step 4: Continue work
git switch BAU-backlog-table-01
git pull origin BAU-backlog-table-01
[resume from handover's next steps]
```

### Handover Storage

```
.claude/obsidian-handovers/
├── metadata.json                    ← Index of all branch IDs
├── BAU-backlog-table-01.md          ← Handover for ID 01
├── Incidents-detail-view-02.md      ← Handover for ID 02
├── Projects-dashboard-filter-01.md  ← Handover for ID 01 (different project)
└── .archive/                        ← Soft-deleted handovers
```

All files are **git-tracked** and **automatically synced** via `git pull`. No Obsidian vault app, no external service, no manual sync required.

### Example: Same Handover, Different Machine

**Machine 1 (MacBook):**
```bash
/obsidian save BAU-backlog-table-01 01 75
git push origin BAU-backlog-table-01
```

**Machine 2 (Linux, same repo):**
```bash
git pull origin main
/obsidian branch 01
# Output: [Full handover loaded, CLAUDE.md rules verified, context ready]
```

**Result:** Same context, different machines, zero setup.

## Best Practices

1. **Save frequently** — Use `/obsidian save` before long pauses or context switches
2. **Detailed progress** — Update progress percentages realistically
3. **Clear next steps** — Write actionable "Resume Point" sections
4. **Link related docs** — Reference specs, audits, and design notes
5. **Keep it concise** — Handovers should be readable in 2 minutes

## Skill Triggers

The `/obsidian` skill is triggered by:
- `/obsidian save` — Explicit save command (reads CLAUDE.md first for rules context)
- `/obsidian branch {NN}` — Explicit context retrieval (ALWAYS reads CLAUDE.md first before handover)
- `/obsidian list` — List all handovers (reads CLAUDE.md first for validation rules)
- `/obsidian delete {NN}` — Archive a handover (reads CLAUDE.md first)
- Auto-detection when starting a conversation with a branch ID in the context (reads CLAUDE.md first)

**Execution Order (MANDATORY for all triggers):**
```
1. Read .claude/CLAUDE.md (full file, § 2026-05-18 section minimum)
2. Parse enforcement rules (branch naming, validation, constraints)
3. Execute requested operation (save/retrieve/list/delete)
4. Verify output against rules read in step 1
5. Display result with CLAUDE.md context embedded in response
```

---

**Version:** 1.0  
**Created:** 2026-05-18  
**Status:** Active & Deployed  
**Available to:** All machines via git
