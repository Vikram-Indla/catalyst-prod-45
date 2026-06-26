# UI Extraction & React Replication Skill

**Systematically extract any page (screenshot + URL) and build exact React/Catalyst implementations.**

---

## What This Is

A production-ready skill for replicating any UI page into working React components using Catalyst/Atlaskit. Encodes best practices from the Jira Releases page extraction.

**In:** Screenshot + URL  
**Out:** Complete React implementation (100% Atlaskit, zero prototypes)  
**Duration:** ~3 hours per page  

---

## Files in This Directory

1. **SKILL.md** ← Start here
   - What the skill does
   - Activation command (`/ui-extract`)
   - 7-phase pipeline overview
   - Key rules and guarantees

2. **extraction-protocol.md**
   - Detailed step-by-step 7-phase protocol
   - DevTools commands and actions
   - Red flag checklist (stop-and-fix issues)
   - Printable checklist for use during extraction

3. **component-mapping-guide.md**
   - How to map every UI element to Atlaskit
   - 20+ pattern examples (buttons, inputs, tables, dialogs, etc.)
   - ❌ WRONG vs. ✅ CORRECT code for each pattern
   - Token reference table
   - Quick component lookup

4. **validation-checklist.md**
   - Final QA checklist (80+ items)
   - Visual accuracy criteria
   - Functional testing
   - Code quality requirements
   - Accessibility verification (WCAG 2.1 AA)
   - Red flag blockers

---

## How to Use

### For Developers Using the Skill

1. **Provide inputs:**
   - Screenshot of target page (full-page, clear regions)
   - Live URL to the page
   - Any region priorities (optional)

2. **Command:**
   ```
   /ui-extract
   ```

3. **You get:**
   - 6 extraction documents
   - Full React component set
   - TypeScript types
   - Mock data (15+ items)
   - Route integrated into App.tsx
   - Validation evidence (screenshots, diffs)

### For Developers Understanding the Skill

1. Read **SKILL.md** (5 min) — understand what you're asking for
2. Reference **extraction-protocol.md** (during extraction) — check your work
3. Check **component-mapping-guide.md** (while coding) — map UI to Atlaskit
4. Run **validation-checklist.md** (before sign-off) — verify quality

---

## Key Principles

✅ **Systematic exhaustion** — Inspect every element (no guessing)  
✅ **Token-first styling** — All colors via `token('ds-...')` (no hardcoded hex)  
✅ **Semantic HTML** — `<button>`, `<input>`, `<table>` (never `<div>`)  
✅ **Complete state coverage** — default, hover, focus, active, disabled (all of them)  
✅ **Micro-interaction precision** — Timing, debounce, validation match exactly  
✅ **Component reuse** — Extract patterns into reusable sub-components  
✅ **Type safety** — Full TypeScript, no `any` types  
✅ **Mock data fidelity** — 15+ realistic items covering edge cases  
✅ **Validation evidence** — Screenshots, diffs, test results prove it works  
✅ **Zero errors** — Console clean, TypeScript clean (non-negotiable)  

---

## Example: Jira Releases Page

**Input:**
- Screenshot of Jira Releases page
- URL: `https://jira.atlassian.net/projects/BAU/versions`

**Output:**
```
src/pages/jira-clone/releases/
├── ReleasePage.tsx
├── types.ts
├── data/mockReleases.ts (18 items)
└── components/
    ├── ReleasesToolbar.tsx
    ├── ReleasesTable.tsx
    ├── ReleaseTableRow.tsx
    ├── ProgressBar.tsx
    ├── CreateReleaseDialog.tsx
    └── ReleaseConfirmationDialog.tsx
```

**Route:** `/catalyst/releases` (test environment)

---

## When to Use

**✅ Great for:**
- Replicating Jira pages (Releases, Backlog, Board, etc.)
- Cloning internal admin dashboards
- Porting Figma designs to React
- Building parity implementations
- Extracting competitor UI patterns (research)

**❌ Not ideal for:**
- Simple one-off forms (just code directly)
- Highly custom creative designs with heavy animations
- Pages with massive video/media content

---

## Time Estimates

| Phase | Duration | What |
|-------|----------|------|
| 1: Visual Inventory | 15-20 min | Screenshots, layout |
| 2: DOM Inspection | 10-15 min | Structure, roles, ARIA |
| 3: Computed Styles | 15-20 min | Colors, typography, spacing |
| 4: Interactions | 20-30 min | Buttons, dropdowns, dialogs, keyboard |
| 5: Data Model | 10-15 min | Tables, forms, mock data |
| 6: Component Architecture | 15-20 min | Map to Atlaskit, hierarchy |
| 7: Implementation | 60-90 min | Code, integrate, validate |
| **TOTAL** | **145-190 min** | **~3 hours** |

---

## Code Quality Guarantees

✅ Zero hardcoded colors (all Atlaskit tokens)  
✅ 100% TypeScript (no `any` types)  
✅ Semantic HTML + ARIA attributes  
✅ All interactive states (hover, focus, active, disabled)  
✅ Keyboard navigation (Tab, Enter, Escape)  
✅ Form validation & error handling  
✅ Pixel-perfect layout (~2-3% tolerance)  
✅ Zero console/TypeScript errors  

---

## Lessons Baked In

From the Jira Releases page extraction:

1. Don't guess — inspect every element systematically
2. Never hardcode colors — use design tokens
3. Semantic HTML first — `<button>` not `<div>`
4. Every state matters — default, hover, focus, active, disabled
5. Micro-interactions are details — match timing, debounce, validation
6. Patterns are reusable — extract StatusBadge, ProgressBar, DateCell
7. Types are non-negotiable — full TypeScript, no `any`
8. Mock data matters — 15+ items covering edge cases
9. Validation proves it works — screenshots, diffs, test results
10. Zero errors, always — console and TypeScript both clean

---

## Getting Help

**Questions on a specific phase?**
→ See extraction-protocol.md for that phase

**How do I map this UI to Atlaskit?**
→ See component-mapping-guide.md (20+ examples)

**Is my implementation done?**
→ Run validation-checklist.md (80+ checkboxes)

**Can I use a custom component here?**
→ Only with explicit approval. Try Atlaskit first.

---

## For Team Leads

This skill is production-ready and designed for team reuse:

- **Consistent approach** — All extractions follow same 7-phase pipeline
- **Quality guaranteed** — Checklist ensures zero errors, full accessibility
- **Fast delivery** — ~3 hours per page from screenshot to production code
- **Team knowledge** — Skill documents encoding all lessons learned
- **No surprises** — Validation evidence proves pixel-perfect match

**Training new developers:**
1. Show them SKILL.md
2. Have them read extraction-protocol.md
3. Let them practice with component-mapping-guide.md
4. Review their work against validation-checklist.md

---

## Version History

- **1.0** (2026-06-26): Initial release. Tested on Jira Releases page. Production-ready.

---

**Ready to extract a page? Use `/ui-extract` with screenshot + URL.**
