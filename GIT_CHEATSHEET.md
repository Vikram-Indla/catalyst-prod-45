# Git Daily Command List — Vikram's Reference

---

## CHECK & REVIEW

| Command | Meaning | Example |
|---|---|---|
| `git status` | What have I changed? | `git status` |
| `git diff` | Show me the exact changes | `git diff` |
| `git log --oneline -10` | Last 10 commits in short form | `git log --oneline -10` |

---

## GET LATEST FROM GITHUB

| Command | Meaning | Example |
|---|---|---|
| `git fetch origin` | Download updates, don't apply yet | `git fetch origin` |
| `git pull origin main` | Download + apply to my local main | `git pull origin main` |

---

## SAVE & SHIP YOUR WORK

| Command | Meaning | Example |
|---|---|---|
| `git add .` | Stage all changed files | `git add .` |
| `git add filename` | Stage one specific file | `git add CreateStoryModal.tsx` |
| `git commit -m ""` | Label and save locally | `git commit -m "remove old constant"` |
| `git push origin main` | Ship to GitHub | `git push origin main` |

---

## UNDO MISTAKES

| Command | Meaning | Example |
|---|---|---|
| `git reset --soft HEAD~1` | Undo last commit, keep changes | `git reset --soft HEAD~1` |
| `git checkout -- filename` | Undo changes to one file | `git checkout -- CreateStoryModal.tsx` |

---

## YOUR DAILY FLOW

```bash
# 1. Start of day — get latest
git pull origin main

# 2. Make your changes...

# 3. Review before saving
git status
git diff

# 4. Stage, commit, push
git add .
git commit -m "describe what you did"
git push origin main
```

---

## Memory Trick

```
Pull → Code → Diff → Add → Commit → Push
 ⬇       🔨      👀     📦      🏷       🚀
```

**"Every Coder Drinks A Cold Pint"**
> E = fetch, C = code, D = diff, A = add, C = commit, P = push
