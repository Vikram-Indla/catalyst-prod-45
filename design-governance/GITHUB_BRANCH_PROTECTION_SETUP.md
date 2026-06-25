# GitHub Branch Protection Setup

Enforce design compliance on every merge to `main`.

---

## Step-by-step (GitHub UI)

1. Go to: `https://github.com/<org>/catalyst-prod-45/settings/branches`
2. Under **Branch protection rules**, click **Add rule**
3. **Branch name pattern:** `main`
4. Apply the settings below exactly

---

## Required settings

### ✅ Require status checks to pass before merging

Enable this. Then add these **required status checks** (exact job names from the workflows):

| Check name | Workflow | Blocks merge? |
|---|---|---|
| `Design System Compliance Check` | `design-system-audit.yml` | ✅ Yes |
| `🎨 Token Validator` | `design-compliance.yml` | ✅ Yes |
| `🔍 Atlaskit Auditor` | `design-compliance.yml` | ✅ Yes |
| `CI` | `ci.yml` | ✅ Yes |

> **Note:** `📸 Visual Regression Check` is label-gated — do NOT add as required (only runs on `visual`-labelled PRs).

Enable: **Require branches to be up to date before merging**

---

### ✅ Require a pull request before merging

- **Required approvals:** `1`
- Enable: **Dismiss stale pull request approvals when new commits are pushed**
- Enable: **Require review from Code Owners** (if `.github/CODEOWNERS` exists)

---

### ✅ Require conversation resolution before merging

Prevents merging with unresolved PR comments.

---

### ✅ Do not allow bypassing the above settings

Applies to admins too. Vikram can temporarily disable via the emergency bypass below if needed.

---

### ❌ Leave these OFF

- ~~Require signed commits~~ — not configured for this repo
- ~~Require linear history~~ — squash merges already enforce this via Vercel/CI
- ~~Restrict who can push~~ — all team members can open PRs

---

## Emergency bypass (admin only)

If a hotfix must merge without CI passing:

1. Go to branch protection rule → temporarily disable the failing check
2. Merge
3. **Re-enable immediately after** — add a Jira comment with reason + timestamp
4. File a follow-up ticket to fix the skipped check

Do NOT use `git push --force` or `--no-verify` as bypass mechanisms.

---

## GitHub CLI equivalent (one-time setup)

```bash
gh api repos/:owner/catalyst-prod-45/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["Design System Compliance Check","🎨 Token Validator","🔍 Atlaskit Auditor","CI"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field required_conversation_resolution=true
```

> Replace `:owner` with the GitHub org/user.

---

## Required GitHub Actions secrets

Set at: `Settings → Secrets and variables → Actions → New repository secret`

| Secret | Required by | Value |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `design-system-audit.yml` | Service role key for `lmqwtldpfacrrlvdnmld` |
| `SUPABASE_URL` | `design-system-audit.yml` | `https://lmqwtldpfacrrlvdnmld.supabase.co` |
| `VITE_SUPABASE_URL` | `design-compliance.yml` (visual job) | Same as above |
| `VITE_SUPABASE_ANON_KEY` | `design-compliance.yml` (visual job) | Anon key from Supabase dashboard |
| `SLACK_WEBHOOK_URL` | Manual / weekly cron | Incoming webhook from Slack app |

---

## Verifying the setup

After saving branch protection:

```bash
# Try to push directly to main (should be rejected)
git push origin main
# Expected: remote: error: GH006: Protected branch update failed

# Open a test PR without checks passing (should not be mergeable)
# The merge button will be greyed out until all required checks pass
```

Check status at: `https://github.com/<org>/catalyst-prod-45/settings/branches`
