# Preflight v3 — Learning Engine Protocol

> **Read in Phase 6 of `/preflight`.** Fires after every phase completes — not just at session end.
> Goal: make the preflight system self-improving. Every session extracts at least one lesson.
> Rule: Claude drafts. Vikram approves. No auto-write to CLAUDE.md or Obsidian.

Author: Preflight v3 × Vikram × Claude  
Updated: 2026-05-10  

---

## When Phase 6 Fires

Phase 6 triggers after:
- Any plan row completes with a defect fix (a bug was found and closed)
- A pattern was mis-classified (Standard turned High-stake mid-execution)
- A JIRA_ARCHITECT.md pattern fired that wasn't in the task description
- A skill mapping was wrong (matrix entry routed to wrong skill)
- A council verdict was overturned by evidence post-hoc
- A banned item was found in the task after coding started
- A session ends (mandatory — always run at session end regardless of above)

---

## Step 1 — Session Delta Extraction

Ask these 5 questions against the session transcript:

**Q1. Anti-pattern discovered?**
Did any defect emerge that wasn't caught by Phase 0.5 (Jira Architect Scan)?
→ If yes: this is a candidate for a new JIRA_ARCHITECT.md pattern (P001–P028 already exist; propose P029+).

**Q2. Lesson from a fix?**
Did fixing a bug reveal a root cause that generalises beyond this surface?
→ If yes: this is a CLAUDE.md candidate (date + surface + pattern + rule format).

**Q3. Skill matrix wrong?**
Did the Phase 3 plan route to a skill that turned out to be wrong for this surface?
→ If yes: propose a MATRIX.md patch (append-only — new row or note on existing row).

**Q4. Rubric mis-tiered?**
Was a task classified as Standard but turned out to need High-stake treatment?
→ If yes: propose a RUBRIC.md example addition.

**Q5. Council blind spot?**
Did any of the 3 councils miss something that the live DOM probe or schema probe caught?
→ If yes: propose a council advisor prompt amendment (which advisor, which question to add).

---

## Step 2 — Draft Format

For each lesson candidate, produce a draft in this exact format (CLAUDE.md-compatible):

```markdown
## {YYYY-MM-DD} — {short title}
**Surface:** {component/file/route}
**Pattern:** {what happened — what the code did wrong, which assumption failed}
**Rule:** {the generalised rule that prevents this from happening again — imperative, future-tense}
**CLAUDE.md anchor:** {existing CLAUDE.md entry this extends, or "new entry"}
**Severity:** {P0/P1/P2}
**JIRA_ARCHITECT pattern:** {pattern ID if applicable, e.g. "A3 — colored dots"}
```

Present ALL drafts in a single block at the end of the session. Do NOT write to CLAUDE.md autonomously.

---

## Step 3 — Obsidian Orchestration

### 3a. Update active/ handover file

The session's `active/preflight-handover-{date}-{topic}.md` gets a new section appended:

```markdown
## Lessons candidates (Phase 6 — draft — awaiting Vikram approval)

### L{N} — {title}
{full draft from Step 2 format above}

**Action on approval:**
- [ ] Append to CLAUDE.md (top of jira-compare section, newest at top)
- [ ] Update JIRA_ARCHITECT.md (if new pattern)
- [ ] Update MATRIX.md (if skill mapping fix)
- [ ] Write to Obsidian vault via save-memory
```

### 3b. Obsidian write (on Vikram "go" only)

When Vikram approves a lesson:
1. Invoke `save-memory` skill with the lesson body.
2. Append the lesson to the top of the `# jira-compare — compounding lessons` section in `CLAUDE.md`.
3. If a new JIRA_ARCHITECT.md pattern: append to the relevant category (S/W/D/A/B/N/P).
4. If a MATRIX.md fix: append new row or `<!-- note: ... -->` to existing row.
5. Emit confirmation: `"Lesson L{N} committed to CLAUDE.md + Obsidian + JIRA_ARCHITECT.md."`

---

## Step 4 — JIRA_ARCHITECT.md Self-Update Protocol

When Q1 (Step 1) identifies a new anti-pattern not covered by P001–P028:

**Draft format:**

```markdown
### {PID} · {Pattern Name}
**Detection:** {what in a task description or code triggers this scan}
**Check:** {what to verify}
**Gate:** {halt condition — be explicit about HALT vs flag}
**CLAUDE.md anchor:** {date + lesson title}
**Severity:** P0/P1/P2
```

New patterns append to the correct category section. Never remove existing patterns. If a pattern needs amendment (detection was too narrow), add a `> **Amendment {date}:**` block under the existing pattern.

---

## Step 5 — Auto-Commit / PR Protocol

> Fires after Vikram confirms "go" on a completed plan row.

### Commit sequence (strict order):

```bash
# Stage ONLY the specific files touched in this row
git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 add src/path/to/file.tsx src/path/to/other.tsx

# Show diff before committing
git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 diff --staged

# Commit with structured message
git -C /Users/vikramindla/Documents/GitHub/catalyst-prod-45 commit -m "$(cat <<'EOF'
{type}({scope}): {imperative description under 72 chars}

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

**Type prefixes:** `feat` (new feature), `fix` (bug fix), `refactor` (no behaviour change), `test` (test only), `docs` (docs only), `chore` (tooling/config).

**Never:** `git add -A`, `git add .`, `--no-verify`, `--no-gpg-sign`, `--amend` on published commits.

### PR creation (one PR per handover session):

PR is created ONCE — after all plan rows for the session are committed, before the Phase 7 handover is written.

```bash
gh pr create \
  --title "{short title under 70 chars}" \
  --body "$(cat <<'EOF'
## Summary
- {bullet 1: what changed}
- {bullet 2: why it changed — CLAUDE.md anchor or user directive}
- {bullet 3: visual evidence path or test count}

## Gates cleared
- [ ] ads-validator: 0 violations
- [ ] jira-compare: drift < threshold
- [ ] TDD: {N} tests green
- [ ] ask-Vikram rows: all confirmed

## Visual evidence
{annotated screenshot path or jira-compare diff JSON path}

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### PR per handover rule:
One PR per session handover file. Multiple commits, one PR. Squash merge is Vikram's call — Claude never squashes autonomously.

---

## Step 6 — Learning Continuity Across Sessions

At the START of the next session (Phase 0 Memory Bootstrap), the preflight skill:

1. Reads `active/preflight-handover-*.md` for any `## Lessons candidates` sections.
2. If lessons are marked `awaiting Vikram approval` → surface them immediately in Phase 0 output.
3. Vikram can approve inline: "approve L1, L2" → trigger Step 3b for those items.
4. Clears approved lessons from the handover "awaiting" list.

This closes the loop: no lesson draft survives beyond 2 sessions without a decision.

---

## Immutable Rules

1. **Claude drafts. Vikram approves.** No autonomous CLAUDE.md write, no autonomous Obsidian write.
2. **Append-only.** CLAUDE.md lessons and JIRA_ARCHITECT.md patterns are never deleted or rewritten. Use `> Amendment {date}:` blocks for corrections.
3. **Every session produces at least one draft.** If no defect was found and no pattern fired, the draft is: "No new patterns — Phase 0.5 coverage confirmed for {surface}." This is still a learning signal.
4. **Lesson format is non-negotiable.** The `date + surface + pattern + rule + anchor + severity` structure is what makes CLAUDE.md machine-readable by future Phase 0 bootstraps.
5. **SQL lessons → Lovable SQL note.** Any lesson involving a Supabase schema change must include a `lovable-sql` reference and the exact SQL in the lesson body so the next engineer can reproduce it.
