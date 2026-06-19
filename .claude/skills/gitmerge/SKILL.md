---
name: gitmerge
description: >
  Git branch merge-and-cleanup automation via GitHub Desktop. Use this skill whenever the user
  mentions merging branches, cleaning up branches, deleting old branches, branch hygiene, or
  syncing with main/master. Trigger phrases include "merge branches", "clean up branches",
  "delete merged branches", "branch cleanup", "sweep branches", "merge to main", "GITMERGE",
  "git merge", "resolve conflicts", "sync main", "tidy up branches", "prune branches",
  "merge and delete", or any variation of consolidating feature branches back into a default branch.
  Also trigger when the user asks to "push to origin", "fetch and pull", or "update main" in the
  context of branch management. This skill handles the ENTIRE end-to-end workflow: checking merge
  status, resolving conflicts, merging into main, deleting local and remote branches, and
  fetching/pulling/pushing to keep the repo in sync.
---

# GITMERGE — Branch Merge & Cleanup via GitHub Desktop

You are an automation agent that merges all non-default branches into `main` (or the repo's default branch) using **GitHub Desktop**, then deletes them and syncs with the remote. This skill covers everything from the happy path (already-merged branches) to full merge-conflict resolution.

## Why this skill exists

Feature branches pile up fast — especially with AI-assisted coding that creates branches like `claude/*`. Left uncleaned, they clutter the branch picker, confuse collaborators, and risk divergence. This skill turns a tedious manual chore into a single command.

## Prerequisites

- **GitHub Desktop** must be installed and open with the target repository loaded.
- **Computer-use MCP** must be available (this skill drives GitHub Desktop's UI).
- The user should be on the **default branch** (`main` or `master`) before starting. If not, switch first.

## End-to-End Workflow

### Phase 1: Reconnaissance

1. **Request access** to GitHub Desktop via `request_access`.
2. **Take a screenshot** to see the current state.
3. **Open the branch dropdown** (click "Current Branch" in the toolbar) to inventory all branches.
4. **Zoom in** if branch names are truncated — you need the full names.
5. **List every non-default branch** and present them to the user. Ask which branches to merge and delete, or confirm "all of them" if the user already said so.

### Phase 2: Merge Check

For each branch, use the **"Merge into main"** dialog (`Cmd+Shift+M` on macOS):

1. Open the merge dialog.
2. Select the branch.
3. Read the status message at the bottom of the dialog:
   - **"main is already up to date with [branch]"** → Already merged. No action needed — proceed to deletion.
   - **"This will merge X commits into main"** with a green checkmark → Clean merge available. Click "Create a merge commit".
   - **"This branch has conflicts that must be resolved"** → Conflict detected. Proceed to Phase 3.
4. Close the dialog and move to the next branch.

### Phase 3: Conflict Resolution

When conflicts are detected:

1. **Inform the user** which branch has conflicts and how many files are affected.
2. **Ask the user** how they want to resolve:
   - **Accept theirs (incoming):** Take all changes from the feature branch.
   - **Accept ours (main):** Keep main's version for all conflicts.
   - **Manual:** Open the conflicted files and let the user decide per-file.
3. If the user chooses automatic resolution:
   - Click "Create a merge commit" to start the merge (GitHub Desktop will show the conflict UI).
   - For each conflicted file, use the conflict resolution buttons in GitHub Desktop (or open in the default editor if needed).
   - After resolving all conflicts, commit the merge.
4. If the user chooses manual:
   - Open the repository in Finder or the user's editor.
   - Wait for the user to resolve and tell you they're done.
   - Complete the merge commit in GitHub Desktop.

### Phase 4: Branch Deletion

After all branches are merged (or confirmed already merged):

1. **Switch to each branch** by clicking it in the branch dropdown.
2. **Delete it** using `Cmd+Shift+D` (or Branch menu → Delete).
3. **Confirm deletion** in the dialog that appears.
4. If the branch exists on the remote, **check the "Yes, delete this branch on the remote" checkbox** before confirming. This keeps GitHub clean too.
5. GitHub Desktop will automatically switch back to the default branch after deletion.
6. Repeat for all branches.

### Phase 5: Sync with Remote

1. **Fetch origin** — click the "Fetch origin" button in the toolbar (or wait if it says "Pull origin" with pending commits).
2. **Pull** if there are commits to pull (the button changes to "Pull origin N↓").
3. **Push** if there are local commits to push (the button shows "Push origin N↑").
4. **Verify** the final state: take a screenshot showing only the default branch remains, and "Fetch origin — Last fetched just now".

## Keyboard Shortcuts Reference (macOS)

| Action | Shortcut |
|---|---|
| Open branch dropdown | Click "Current Branch" |
| Merge into current branch | `Cmd+Shift+M` |
| Delete current branch | `Cmd+Shift+D` |
| Fetch origin | `Cmd+Shift+F` (or click toolbar button) |
| Push to origin | `Cmd+P` |

## Important Notes

- **Never delete the default branch** (`main` or `master`). Always verify you're deleting a feature branch.
- **Always confirm with the user** before resolving merge conflicts — don't make assumptions about which version to keep.
- **Remote deletion is permanent** — when checking "delete on remote", the branch is gone from GitHub. Make sure it's been merged first.
- If the branch dropdown shows `origin/` prefixed branches, these are remote tracking branches. Switch to them to create a local copy first, then merge and delete.
- If a branch says "Publish branch" instead of having a remote, it's local-only — no remote deletion checkbox will appear.

## Example Interaction

**User says:** "merge all branches to main and clean up"

**You do:**
1. Request GitHub Desktop access
2. Screenshot → see 3 feature branches
3. Confirm with user: "I see 3 branches: X, Y, Z. Merging all into main and deleting — OK?"
4. `Cmd+Shift+M` → check each branch's merge status
5. Merge any that need merging, flag conflicts if any
6. Switch to each branch → `Cmd+Shift+D` → confirm delete (+ remote if applicable)
7. Fetch origin → Pull if needed → Push if needed
8. Final screenshot showing clean branch list
9. Report: "All done — 3 branches merged and deleted, main is synced with origin."
