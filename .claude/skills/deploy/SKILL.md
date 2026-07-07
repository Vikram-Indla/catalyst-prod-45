---
name: deploy
type: command
description: >
  Automated deployment workflow: commits pending changes, merges feature branch to main,
  handles conflicts, cleans stale branches, and generates a deployment summary.
  Uses gh CLI for GitHub operations and validates Supabase edge functions.
trigger: /deploy
---

# Deploy Automation Skill

## What This Does

When you run `/deploy`, the skill will:

1. **Validate State** — Check for uncommitted changes, branch divergence, and reachability
2. **Commit Pending** — Stage and commit any modified tracked files with auto-generated messages
3. **Fetch Latest** — Pull latest from remote (main + current branch)
4. **Merge to Main** — Attempt merge with conflict detection
5. **Conflict Resolution** — Report conflicts; halt for manual intervention if unsafe
6. **Branch Cleanup** — Delete merged branches locally and remotely
7. **Validate Deployment** — Check Supabase edge functions are deployable
8. **Summary Report** — Show commits, changed files, deletions, status

## Safety Features

- ✅ Detects merge conflicts before attempting auto-merge
- ✅ Requires explicit conflict resolution (never auto-resolves)
- ✅ Validates Supabase schema before marking deployment complete
- ✅ Preserves main branch safety — won't force-push
- ✅ Uses `gh pr` for CI status checks (optional approval gate)
- ✅ Logs all deletions with undo instructions

## Usage

```
/deploy                    # Full deployment workflow
/deploy --dry-run          # Simulate without making changes
/deploy --skip-cleanup     # Deploy but keep branches
/deploy --check-ci         # Wait for GitHub Actions to pass before merge
```

## Example Output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DEPLOYMENT SUMMARY — 2026-05-18T14:32:00Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 STATUS: ✅ DEPLOYMENT COMPLETE

 📋 COMMITS MERGED (3)
 ├─ bd112b596 Phase 1: Replace all hardcoded fontFamily with CSS variables
 ├─ 8d79fe44c feat(routing): implement Jira-canonical URL taxonomy
 └─ f9fd67088 fix(admin): GovernanceSettings imports non-existent hook

 📝 PENDING COMMITS (1)
 ├─ Phase 1: Stage catalyst-colors CSS + color constants

 📂 FILES CHANGED (2)
 ├─ src/lib/catalyst-colors.ts (modified)
 └─ src/styles/catalyst-colors.css (new)

 🌳 BRANCHES DELETED (2 local, 1 remote)
 ├─ refactor/old-nav (local → remote)
 └─ bugfix/hover-state (local)

 🔍 VALIDATION
 ├─ ✅ Supabase schema consistent (63 tables)
 ├─ ✅ Edge functions deployable (44 functions)
 └─ ✅ GitHub Actions passing (all checks)

 🔗 GITHUB
 ├─ PR #789 merged to main
 ├─ All CI checks green
 └─ Deployment: github.com/Vikram-Indla/catalyst-prod-45/commit/XXXXXXX

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Under the Hood

**Phase 1: Validation**
```bash
git -C . status                                    # Check for uncommitted
git -C . fetch origin main                        # Fetch latest main
git -C . rev-list --count main..HEAD              # Count commits ahead
```

**Phase 2: Commit Pending**
```bash
git -C . diff --name-only                         # List changed tracked files
git -C . add [files]                              # Stage
git -C . commit -m "[auto-generated message]"    # Commit with semantic prefix
```

**Phase 3: Merge**
```bash
git -C . merge origin/main --no-edit              # Attempt fast-forward or 3-way
# On conflict:
git -C . diff --name-only --diff-filter=U        # Show conflicted files
# Exit for manual resolution
```

**Phase 4: Cleanup**
```bash
git -C . branch -d [merged-local-branches]       # Delete local branches
gh api repos/Vikram-Indla/catalyst-prod-45/git/refs/heads/[branch] -X DELETE
```

**Phase 5: Validation**
```bash
supabase status --project-ref cyijbdeuehohvhnsywig
gh api repos/Vikram-Indla/catalyst-prod-45/actions/runs --created=">2026-05-18"
```

**Phase 6: Report**
```bash
git -C . log --oneline main@{1}..main             # Show merged commits
git -C . shortlog main@{1}..HEAD                  # Summary
```

---

## Recommendations (Vikram's Requirements Met)

✅ **Always commit pending changes** — No half-deployed state  
✅ **Merge main, not the other way** — Keeps feature branch clean  
✅ **Delete local AND remote stale branches** — Single source of truth  
✅ **Use gh CLI** — For GitHub PR status + link generation  
✅ **Use Supabase MCP** — For schema validation before go-live  
✅ **Provide structured summary** — Markdown table + commit log  

---

## Conflict Handling (Safety First)

If conflicts are detected during merge:

```
❌ MERGE CONFLICT DETECTED

 Conflicted files:
 ├─ src/pages/admin/AccessControl.tsx (6 conflicts)
 └─ supabase/migrations/20260517_schema.sql (3 conflicts)

 ↳ Manual resolution required.
   
   Run:
   1. git merge --abort                           # Cancel merge
   2. git switch ADS-migration                    # Back to feature branch
   3. git rebase origin/main                      # Rebase instead
   4. Resolve conflicts in your editor
   5. git add .                                   # Stage resolved files
   6. git rebase --continue                       # Complete rebase
   7. /deploy                                     # Retry deployment

 Or use git mergetool for interactive resolution:
   $ git mergetool
```

---

## Requirements

- `gh` CLI installed and authenticated
- Git configured (`git config user.name` + `git config user.email`)
- Supabase MCP connected (for validation phase)
- Permissions: `repo`, `workflow` (GitHub token scopes)

---

## Notes

- **Dry-run mode** shows what would happen without making changes
- **CI check mode** waits for GitHub Actions before merging (recommended for main)
- **Cleanup can be skipped** if you want manual branch review post-merge
- **Auto-generated commit messages** follow Conventional Commits (feat:/fix:/refactor:)
- **All operations are logged** to `.claude/deploy-logs/` for audit trail

---
