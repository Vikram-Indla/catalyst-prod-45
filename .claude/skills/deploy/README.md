# Deploy Skill

**Automated deployment workflow for Catalyst: merge, commit, cleanup, and summary.**

## Quick Start

```bash
/deploy                    # Run full deployment
/deploy --dry-run          # Simulate without changes
/deploy --skip-cleanup     # Deploy but keep branches
/deploy --check-ci         # Wait for GitHub Actions before merge
```

## What It Does

The deploy skill automates your entire merge-to-production workflow in 7 phases:

### Phase 1: Validate State ✓
- Detects uncommitted changes
- Checks branch divergence from main
- Validates git configuration

### Phase 2: Commit Pending ✓
- Stages modified tracked files + untracked files
- Auto-generates semantic commit messages (feat:/fix:/style:/refactor:)
- Creates commit with consistent message format

### Phase 3: Fetch Latest ✓
- Pulls latest from `origin/main` and current branch
- Ensures no stale reference issues

### Phase 4: Merge to Main ✓
- Attempts merge with `git merge origin/main --no-edit`
- Detects conflicts and halts for manual resolution (safe!)
- Captures all merged commit hashes and messages

### Phase 5: GitHub CI Checks (Optional) ✓
- If `--check-ci` flag: polls GitHub Actions for pass/fail
- Waits up to 5 minutes for CI to complete
- Blocks merge on CI failure

### Phase 6: Cleanup Branches ✓
- Deletes local branches merged into main
- Deletes remote branches (via `gh api ... -X DELETE`)
- Never deletes main or current branch

### Phase 7: Validate Deployment ✓
- Checks Supabase schema consistency
- Validates edge functions are deployable
- Confirms CI checks are green

## Output Format

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 DEPLOYMENT SUMMARY — 2026-05-18T14:32:00Z
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

 STATUS: ✅ DEPLOYMENT COMPLETE

 📋 COMMITS MERGED (3)
 ├─ bd112b596 Phase 1: Replace all hardcoded fontFamily
 ├─ 8d79fe44c feat(routing): implement Jira-canonical URL
 └─ f9fd67088 fix(admin): GovernanceSettings imports fix

 📝 PENDING COMMITS (1)
 ├─ style: Update design system colors

 🌳 BRANCHES DELETED (2 local, 1 remote)
 ├─ refactor/old-nav (local, remote)
 └─ bugfix/hover-state (local)

 🔍 VALIDATION
 ├─ ✅ Supabase schema
 ├─ ✅ Edge Functions
 └─ ✅ GitHub CI

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Safety Features

### Conflict Handling
If a merge conflict is detected:
1. Workflow **halts immediately** (no auto-resolve)
2. Displays which files have conflicts
3. Provides manual resolution instructions
4. You resolve + commit, then run `/deploy` again

### Dry-Run Mode
Use `--dry-run` to see what WOULD happen:
- No files staged
- No commits made
- No branches deleted
- Perfect for pre-flight checks

### Skip Cleanup
Use `--skip-cleanup` to:
- Deploy and merge normally
- Keep all branches for manual review
- Useful if you want to double-check before deleting

### CI Gating
Use `--check-ci` to:
- Block merge until GitHub Actions passes
- Polls every 10 seconds (max 5 min)
- Fails immediately on any CI check failure

## Requirements

```bash
# Check requirements
git --version              # Git 2.20+
gh --version              # GitHub CLI 2.0+
npm list supabase         # Supabase SDK available
```

**Environment:**
- `GH_TOKEN` environment variable (auth for `gh` CLI)
- Git configured: `git config user.name` + `git config user.email`
- Supabase MCP connected for phase 7 validation

## Logs

All operations are logged to `.claude/deploy-logs/deploy-TIMESTAMP.log`:

```bash
cat .claude/deploy-logs/deploy-2026-05-18-143200.log
```

Logs include:
- Every executed command and its output
- Timestamp of each phase
- Conflicts or warnings encountered
- Full deployment timeline

## Conflict Resolution Example

If you hit a conflict:

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
```

Then after manually resolving, run `/deploy` again — it will retry from merge.

## Advanced Options

### Custom Commit Messages

By default, messages are generated semantically:
- `src/**/*.css` → `style: Update...`
- `**/config/**` → `chore: Update configuration`
- New files → `feat: Add...`
- Existing files → `refactor: Update...`

To override, manually stage and commit before running `/deploy`.

### Multiple Branches

The skill merges your CURRENT branch to main. To deploy a different branch:

```bash
git -C . switch feature/my-branch
/deploy
```

## Troubleshooting

### "Command failed: fatal: not a git repository"
→ Make sure you're running from the Catalyst project root, or check `PROJECT_ROOT` in the skill.

### "gh: command not found"
→ Install GitHub CLI: `brew install gh` (macOS) or visit https://cli.github.com

### "permission denied: ./.claude/deploy-logs"
→ The skill creates `.claude/deploy-logs/` on first run. Check directory permissions.

### "Merge conflict — I want to abort completely"
```bash
git -C . merge --abort
# Then fix the underlying issue and retry
```

## Recommendations (Built-In)

✅ **Always commits pending changes** — No half-deployed state  
✅ **Merges main (not the reverse)** — Keeps feature branch clean  
✅ **Detects conflicts early** — Never auto-resolves (safe!)  
✅ **Deletes both local + remote stale branches** — Single source of truth  
✅ **Uses gh CLI for GitHub ops** — Native GitHub integration  
✅ **Uses Supabase MCP for validation** — Pre-deployment schema check  
✅ **Structured, tabular summary** — Easy to scan and audit  
✅ **Full command logging** — Audit trail for compliance  

## Future Enhancements

- [ ] Slack/Discord notification on deployment completion
- [ ] Automated rollback on deployment failure
- [ ] Integration with Sentry for error tracking
- [ ] Database migration verification (post-Lovable deprecation)
- [ ] Edge function version pinning
- [ ] Deployment history dashboard

---

**Questions?** Run `/deploy --help` or read `SKILL.md` for implementation details.
