# Handover Standard Template
**For:** All future handover blocks  
**Rule:** Every handover uses this format (2-3 lines, copy-paste ready)

---

## Format (Use This Every Time)

```
📋 HANDOVER — [Phase/Task Name]

Files to read (in order):
  1. /path/to/file1.md
  2. /path/to/file2.md
  3. /path/to/file3.md

Action: [EXACT COPY-PASTE COMMAND]
```

---

## Example (What It Looks Like)

```
📋 HANDOVER — Date Pulse Phase 2 Implementation

Files to read (in order):
  1. /Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/Catalyst-web/DATE_PULSE_ARCHITECTURE_PHASE_1.md
  2. /Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/Catalyst-web/DATE_PULSE_PHASE2_HANDOVER.md

Action: cd ~/catalyst && git status && npm run dev
```

---

## Rules for Handover Blocks

1. **Always absolute paths** — use `~` or full `/Users/...` path, not relative
2. **Always file names** — include `.md` or `.ts` extension
3. **Always action/command** — copy-paste ready, no explanation needed
4. **Keep to 2-3 lines** — nothing longer
5. **Save to memory** — store handover path in `/Users/jahanarakhan/.claude/projects/[project]/memory/`
6. **Link to this standard** — reference this doc in memory files so future sessions know the format

---

## When to Create Handover

- ✅ End of major phase (Phase 0, 1, 2, etc.)
- ✅ Context window high (> 80%)
- ✅ Work paused for next session
- ✅ Switching between features or subagents

## What NOT to Do

- ❌ Don't write long explanations in handover block (that's what the docs are for)
- ❌ Don't create relative paths (`./src/...` is wrong, use `/Users/...`)
- ❌ Don't assume next session read the memo (docs are links, not memory)
- ❌ Don't create handover for trivial changes (only major milestones)

---

## Save This Pattern to Memory

**File:** `/Users/jahanarakhan/.claude/projects/-Users-jahanarakhan-Documents-GitHub-catalyst-prod-45-Catalyst-web/memory/handover-standard.md`

**Content:** Link to this file + the format template

**Why:** Future Claude Code sessions can reference the standard and never ask "what format?"

---

## Template You Can Paste

```markdown
📋 HANDOVER — [PHASE/TASK NAME]

Files to read (in order):
  1. [FULL/PATH/TO/FILE1.md]
  2. [FULL/PATH/TO/FILE2.md]

Action: [EXACT COPY-PASTE COMMAND]
```

That's it. Use this every time.
