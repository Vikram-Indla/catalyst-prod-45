# Branch Workflow — Quick Reference Card

## When You Request Implementation Work

⚠️ **IMPORTANT:** Conversation starts CLEAN. No branch exists until you ask.

1. **Request implementation** in chat (e.g., "Build the backlog table in BAU")
2. **I derive branch context:**
   - Project/Hub: `BAU`, `INV`, `Projects`, `Incidents`, `Admin`, etc.
   - Sidebar menu: `backlog`, `allwork`, `detail`, `admin`, `resources`, etc.
   - Main component: `table`, `filter`, `modal`, `detail-view`, `dashboard`, etc.
3. **I echo the derived branch name** for your confirmation
4. **I create branch:**
   ```bash
   ./.claude/scripts/branch-manager.sh create YOUR-BRANCH-NAME
   ```
5. **Work & commit** on that branch (all commits here)
6. **Push when done:**
   ```bash
   git push origin YOUR-BRANCH-NAME
   ```

## Branch Naming Examples

| Task | Hub | Menu | Component | Branch Name |
|------|-----|------|-----------|-------------|
| Build backlog table | BAU | backlog | table | `BAU-backlog-table` |
| Fix incident detail view | Incidents | detail | view | `Incidents-detail-view` |
| Add project filters | Projects | dashboard | filter | `Projects-dashboard-filter` |
| Admin user management | Admin | users | management | `Admin-users-management` |
| Deploy to prod | — | — | — | `General-deploy` |
| Hotfix bug | — | — | — | `General-hotfix` |

## Invalid Branch Names (Will Be Rejected)

❌ `BacklogTable` — Missing dashes  
❌ `BAU-BacklogTable` — Mixed case  
❌ `BAU_backlog_table` — Underscores instead of dashes  
❌ `backup-table` — Lowercase project  
❌ `BAU-backlog table` — Space in name  

## Validation

Check if a branch name is valid:

```bash
./.claude/scripts/branch-manager.sh validate BAU-backlog-table
# Output: ✓ Valid feature branch: BAU-backlog-table
```

## Workflow Sequence (On-Demand)

```
Conversation opens CLEAN (no branch yet)
    ↓
You request: "Build the backlog table in BAU"
    ↓
I derive: BAU-backlog-table
    ↓
I echo branch name for confirmation
    ↓
I create & activate branch
    ↓
Code & commit (all on this branch, NOT main)
    ↓
Push: git push origin NAME
    ↓
Create PR on GitHub
    ↓
Await Vikram review/approval
    ↓
Merge to main (with explicit approval only)
```

## Key Rules

✅ **DO:** Start each conversation CLEAN (no pre-existing branch context)  
✅ **DO:** Create a branch ONLY when you request implementation work  
✅ **DO:** Use the derived branch name from YOUR request in THIS conversation  
✅ **DO:** Commit all work to this branch (never to main)  
✅ **DO:** Push to `origin <branch-name>` (not main)  
✅ **DO:** Ask if context is ambiguous (don't guess)  

❌ **DON'T:** Assume existing branches (like `ADS-migration`) should be continued  
❌ **DON'T:** Pre-create a branch before you ask for work  
❌ **DON'T:** Commit to main directly  
❌ **DON'T:** Mix multiple unrelated tasks in one branch  
❌ **DON'T:** Use mixed case or underscores in branch names  

## Files & Documentation

- **Script:** `./.claude/scripts/branch-manager.sh` — Main branch automation tool
- **Documentation:** `./.claude/scripts/BRANCH_MANAGEMENT.md` — Full details
- **CLAUDE.md:** § 2026-05-18 — Enforcement rules in main guidelines
- **Memory:** `memory/branch_management_system.md` — Persistent task context

## One-Off Commands

```bash
# Get current branch
git branch --show-current

# List recent branches
./.claude/scripts/branch-manager.sh list

# Switch to existing branch
git switch BRANCH-NAME

# Delete local branch (after merged)
git branch -d BRANCH-NAME
```
