# Obsidian Handover Skill — Branch Context Management

## Overview

The `/obsidian` skill manages detailed handovers and branch context in the Obsidian vault. It captures full conversation state, progress, and metadata when transitioning between branches or conversations, and retrieves that context when resuming work.

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

**What it restores:**
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

**Example:**
```
You: /obsidian branch 01
Claude: Retrieving handover for BAU-backlog-table-01...
✓ Branch exists locally
✓ Context loaded
✓ Last saved: 2 days ago
✓ Progress: 60% complete

Task: Build backlog list table in BAU project
Previous work:
  - Created columns: Key, Summary, Status, Comments
  - Wired up sorting and filtering
  
Remaining work:
  - Add drag-and-drop row reordering
  - Implement bulk actions footer
  - Wire up to CRUD API

Continue from: Add drag-and-drop row reordering
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

## Multi-Machine Access

All handovers are stored in `.claude/obsidian-handovers/` which is:
- ✅ Version-controlled in git
- ✅ Shared across all machines via GitHub
- ✅ Accessible to all users on the project
- ✅ Safe to push to origin

When you `git pull` on a new machine, all handovers are immediately available.

## Best Practices

1. **Save frequently** — Use `/obsidian save` before long pauses or context switches
2. **Detailed progress** — Update progress percentages realistically
3. **Clear next steps** — Write actionable "Resume Point" sections
4. **Link related docs** — Reference specs, audits, and design notes
5. **Keep it concise** — Handovers should be readable in 2 minutes

## Skill Triggers

The `/obsidian` skill is triggered by:
- `/obsidian save` — Explicit save command
- `/obsidian branch {NN}` — Explicit context retrieval
- `/obsidian list` — List all handovers
- `/obsidian delete {NN}` — Archive a handover
- Auto-detection when starting a conversation with a branch ID in the context

---

**Version:** 1.0  
**Created:** 2026-05-18  
**Status:** Active & Deployed  
**Available to:** All machines via git
