---
branch: General-home-r360-01
branch_id: 03
project: General
menu: home
component: r360
status: handoff_required
progress: 0
phase: needs_restart_by_colleague
created: 2026-05-31T16:00:00Z
last_saved: 2026-05-31T18:00:00Z
saved_by: claude-code
handoff_to: khan.jahanara@gmail.com
estimated_completion: TBD
---

# General-home-r360-01 — Home / R360 Panel Enterprise UX Pass

## ⚠️ CRITICAL — READ FIRST

**Working tree is currently CLEAN on `main`. All work from the prior session was lost** — commits were authored against a branch `General-home-r360-01` that never landed in this checkout's git reflog. **No code changes from the prior session survive on disk.** This handover documents WHAT WAS ATTEMPTED and the lessons learned, so Jahanara can restart cleanly without repeating mistakes.

---

## Task

Comprehensive enterprise UX/UI pass on the **Home page R360 panel** (`/` → "Resource 360°" tab in For You):

1. ADS-token compliance audit across `r360-member.css`, `r360.css`, `R360Panel.tsx`, `R360RingView.tsx`
2. Remove unnecessary left padding when R360 tab is active in ForYouPage layout
3. Fix washed-out / faded colour palette on ring view cards and badges
4. Rename "Intelligence" CTA to "Ask Caty" everywhere (button, aria-labels, tooltips)
5. Fix invisible "Updated Xd ago" ghost text overlapping ring cards (RCA: z-index + absolute positioning collision)
6. Add enterprise-appropriate loading state to Ask Caty button (NOT a spinning rainbow — see lessons)

---

## ❌ Prior Session Lessons Learned — DO NOT REPEAT

### Lesson 1 — NO consumer animations on enterprise buttons (P0, lock into CLAUDE.md)

**What was attempted:** A `conic-gradient` rainbow ring wrapping the "Ask Caty" button, with `transform: rotate(360deg)` animation. Because the rotation was applied to the wrapper `<div>` containing the button (not just a border element), **the entire button including its "Ask Caty" text rotated 360° continuously** — text appeared upside-down in the global nav.

**Vikram's correction (verbatim):**
> "I didn't understand why you made this animation where this is spinning around. You have definitely gone mad. Does any enterprise application make this kind of a mistake? It's your responsibility to tell me that this is not the right enterprise way of doing things. You cannot just spin these things and make this an enterprise app."

**The enterprise rule:**
- ❌ NEVER spin / rotate any container that holds text or interactive content
- ❌ NEVER use rainbow / conic-gradient borders on buttons, pills, lozenges
- ❌ NEVER add consumer-style "AI aura" effects (pulsing glows, neon outlines, particle effects)
- ✅ Loading state on buttons = `@atlaskit/spinner` (size="small", appearance="invert") replacing the icon
- ✅ Label flips to "Loading…", `disabled={true}`, `aria-busy={true}`
- ✅ Reference: NO Jira / Salesforce / Workday / ServiceNow surface uses any of the banned patterns

**Rule for Jahanara (and all future sessions):** Before implementing ANY animation, visual effect, or interaction pattern not in the ADS component catalogue → STOP and ask Vikram first. Do not assume consent.

### Lesson 2 — Branch creation must be verified before committing

**What happened:** Prior session ran `git switch --create General-home-r360-01` and made ~6 commits. Reflog shows no record of the branch ever existing. The branch creation either silently failed or happened in a worktree that wasn't this checkout. All commits are lost. Total time wasted: ~3 hours.

**Rule for Jahanara:** After creating a branch, run BOTH:
```bash
git branch --show-current  # must echo the new branch name
git rev-parse --verify HEAD  # must succeed
git -C $PWD log --oneline -1  # verify last commit lands on the new branch
```

Then push to origin IMMEDIATELY:
```bash
git push -u origin General-home-r360-XX
```

This guarantees the branch exists remotely even if local state is lost.

### Lesson 3 — TEXT-ONLY mode was active for most of session

Prior session was running under a TEXT-ONLY constraint that prevented tool use for large portions. Reading source files, running probes, and applying edits all happened inconsistently. **Jahanara: confirm tool use is enabled BEFORE starting.** TEXT-ONLY mode has been permanently lifted per `~/.claude/projects/.../memory/MEMORY.md`.

---

## What Needs To Be Done (Clean Implementation Plan for Jahanara)

### Phase 1 — Branch setup (5 min)
```bash
git switch main
git pull origin main
git switch --create General-home-r360-01
git push -u origin General-home-r360-01
git branch --show-current   # MUST echo "General-home-r360-01"
```

### Phase 2 — ADS token sweep on R360 CSS files (60 min)

**Files to audit:**
- `src/components/resource360/r360-member.css` (1500+ lines, many `--cp-*` custom vars)
- `src/styles/r360.css` (~210 lines)
- `src/components/resource360/R360Panel.tsx`
- `src/components/resource360/R360RingView.tsx`
- `src/pages/r360-member/RingView.tsx`

**Token replacements (ADS canonical from CLAUDE.md):**
| Bad pattern | Replace with |
|---|---|
| `#D4D4D8`, `#94A3B8`, custom border hex | `var(--ds-border, #DFE1E6)` |
| `var(--cp-ink-2, #334155)` (17 places) | `var(--ds-text-subtle, #42526E)` |
| `#F8FAFC`, `#F1F5F9` Tailwind fallbacks | `var(--ds-surface-sunken, #F7F8F9)` |
| `var(--ds-text-brand)` used as background | `var(--ds-background-information-bold, #0052CC)` (semantic correctness) |
| Custom rgba hover | `var(--ds-background-neutral-subtle-hovered, rgba(9,30,66,0.06))` |

**Run audit before/after to verify drift:**
```bash
node design-governance/cli/index.js audit src/components/resource360/
node design-governance/cli/index.js audit src/styles/r360.css
```

### Phase 3 — Ring view fixes (30 min)

**3a. Status card hardcoded hex → ADS tokens** in `R360RingView.tsx` lines 8-33:
- To Do: `#FFFBEB`/`#78350F` → `var(--ds-background-warning, #FFF7D6)` / `var(--ds-text-warning, #974F0C)`
- In Progress: `--ds-background-selected` (WRONG TOKEN) → `var(--ds-background-information, #E9F2FE)`
- Done: `#F0FDF4`/`#14532D` → `var(--ds-background-success, #DCFFF1)` / `var(--ds-text-success, #216E4E)`
- Blocked: `#FEF2F2`/`#7F1D1D` → `var(--ds-background-danger, #FFECEB)` / `var(--ds-text-danger, #AE2A19)`

**3b. Remove ghost text** in `src/pages/r360-member/RingView.tsx` lines 438-441:
```tsx
// DELETE this block — overlay collides with card header due to position:absolute on .r3-ring-card
{/* Age label below card */}
<div style={{ textAlign: 'center', marginTop: 5, fontSize: 10, color: T.textSubtlest(), width: `${CARD_W}px`, pointerEvents: 'none' }}>
  Updated {item.age_days}d ago
</div>
```
The age info is already shown inside the card at Row 1 (`{item.age_days}d` with correct colour). The overlay is redundant AND broken.

**3c. Completed badge — fix washed-out light mint** in `r360-member.css:861`:
```css
/* Currently: background: var(--cp-lozenge-green-bg, #1B7F37) !important; */
/* The --cp-lozenge-green-bg resolves to #E3FCEF (light mint) in product-backlog.css:69 */
/* Replace with high-contrast ADS success token: */
background: var(--ds-background-success-bold, #1F845A) !important;
color: var(--ds-text-inverse, #FFFFFF) !important;
```

### Phase 4 — ForYouPage padding cascade fix (15 min)

In `src/pages/ForYouPage.atlaskit.tsx` lines 263-267 — make layout properties conditional on `isR360Active`:
```tsx
paddingInline: isR360Active ? 0 : 'clamp(16px, 3vw, 32px)',
paddingBlockStart: isR360Active ? 0 : 24,
paddingBlockEnd: isR360Active ? 0 : 48,
maxWidth: isR360Active ? 'none' : 1280,
marginInline: isR360Active ? 0 : 'auto',
```

Why: R360's roster sidebar should start at x=0 when the tab is active; the wrapper's auto-centering adds 65-97px of unwanted left margin on R360 only.

### Phase 5 — Ask Caty button (ENTERPRISE pattern, NO ANIMATIONS) (20 min)

**File:** `src/components/ui/AIIntelligenceButton.tsx`

**Current state on `main`:** Button uses `var(--ds-text-brand)` as background (semantic misuse — text token used as bg). Default label is generic, not "Ask Caty".

**Target enterprise pattern:**
```tsx
import Spinner from '@atlaskit/spinner';

// Props
label?: string;  // defaults to 'Ask Caty'
isLoading?: boolean;  // shows spinner replacing Zap icon + label "Loading…"

// Background fix
background: 'var(--ds-background-information-bold, #0052CC)'  // not --ds-text-brand

// Loading state
{isLoading ? <Spinner size="small" appearance="invert" /> : <Zap size={13} />}
{isLoading ? 'Loading…' : label}
```

**Call sites to update** (just remove `label="Intelligence"` to inherit "Ask Caty" default):
- `src/pages/R360MemberDetail.tsx:566`
- `src/pages/producthub/IdeationPage.tsx:145`

**Aria-label updates** (rename "Intelligence" → "Ask Caty"):
- `src/components/resource360/R360ProfileHeader.tsx:79`
- `src/components/resource360/Toolbar.tsx:218`

### Phase 6 — CLAUDE.md enterprise guardrail (10 min)

Append a P0 section to `CLAUDE.md` near the top (after THE FOUR RULES):

```markdown
## 🏢 ENTERPRISE UI GUARDRAIL — NEVER IMPLEMENT CONSUMER ANIMATIONS (P0, Non-Negotiable)

Catalyst is an enterprise work-management platform. Every UI decision must pass:
"Does Jira / Salesforce / Workday / ServiceNow do this?" If no → stop and ask Vikram.

Permanently banned:
- ❌ Spinning / rotating containers (the content rotates, not just a sub-element)
- ❌ Rainbow / multi-colour gradient borders on interactive controls
- ❌ Conic-gradient animations on buttons, pills, clickable surfaces
- ❌ Pulsing glows, neon outlines, particle effects, "AI aura" effects
- ❌ Any animation on a wrapper that contains text

Approved loading patterns:
- ✅ @atlaskit/spinner (size="small", appearance="invert") replacing the icon
- ✅ disabled={true} + cursor:not-allowed + aria-busy={true}
- ✅ Label change ("Loading…")
- ✅ opacity: 0.7 on non-interactive state

Incident reference: 2026-05-31 — Spinning rainbow on "Ask Caty" button caused entire button label to rotate upside-down. Full revert required.
```

### Phase 7 — Verify, commit, push (10 min)

```bash
# Re-audit
node design-governance/cli/index.js audit src/components/resource360/
node design-governance/cli/index.js audit src/pages/ForYouPage.atlaskit.tsx
node design-governance/cli/index.js audit src/components/ui/AIIntelligenceButton.tsx

# Commit per phase (do NOT bundle into one commit)
git add src/components/resource360/r360-member.css src/styles/r360.css
git commit -m "fix(r360): replace --cp-* custom vars with ADS canonical tokens"

git add src/components/resource360/R360RingView.tsx
git commit -m "fix(r360): use ADS background/text tokens for status cards"

git add src/pages/r360-member/RingView.tsx
git commit -m "fix(r360): remove ghost Updated-ago text overlapping ring cards"

git add src/pages/ForYouPage.atlaskit.tsx
git commit -m "fix(home): remove R360 left padding via conditional layout"

git add src/components/ui/AIIntelligenceButton.tsx src/pages/R360MemberDetail.tsx \
        src/pages/producthub/IdeationPage.tsx \
        src/components/resource360/R360ProfileHeader.tsx \
        src/components/resource360/Toolbar.tsx
git commit -m "feat(caty): rename Intelligence→Ask Caty with ADS spinner loading state"

git add CLAUDE.md
git commit -m "docs(claude.md): add P0 enterprise UI guardrail — no consumer animations"

# Push
git push -u origin General-home-r360-01

# Verify on GitHub
git -C $PWD log --oneline origin/General-home-r360-01 | head -10
```

---

## File Index (where each change goes)

| File | Phase | Change |
|---|---|---|
| `src/components/resource360/r360-member.css` | 2, 3c | ADS token sweep + fix completed badge bg |
| `src/styles/r360.css` | 2 | Replace 19× `--cp-ink-2` with `--ds-text-subtle` |
| `src/components/resource360/R360RingView.tsx` | 3a | Status card colours → ADS tokens |
| `src/pages/r360-member/RingView.tsx` | 3b | Delete lines 438-441 (ghost text) |
| `src/pages/ForYouPage.atlaskit.tsx` | 4 | Conditional layout when `isR360Active` |
| `src/components/ui/AIIntelligenceButton.tsx` | 5 | Default label "Ask Caty" + `isLoading` prop + Spinner |
| `src/pages/R360MemberDetail.tsx` | 5 | Remove `label="Intelligence"` prop |
| `src/pages/producthub/IdeationPage.tsx` | 5 | Remove `label="Intelligence"` prop |
| `src/components/resource360/R360ProfileHeader.tsx` | 5 | aria-label → "Ask Caty" |
| `src/components/resource360/Toolbar.tsx` | 5 | aria-label → "Ask Caty" |
| `CLAUDE.md` | 6 | Insert enterprise UI guardrail P0 section |

---

## Verification Checklist (Jahanara: run all before declaring done)

- [ ] `git branch --show-current` echoes `General-home-r360-01`
- [ ] `git push -u origin General-home-r360-01` succeeded
- [ ] `node design-governance/cli/index.js audit src/components/resource360/` passes (0 P0)
- [ ] `node design-governance/cli/index.js audit src/styles/r360.css` passes
- [ ] R360 ring view: "Ask Caty" button visible, no rainbow ring, no spinning
- [ ] R360 ring view: "Updated Xd ago" overlay text is gone
- [ ] R360 ring view: Completed badge is high-contrast green, not washed mint
- [ ] R360 tab active: roster sidebar starts at x=0 (no 65-97px left margin)
- [ ] Ask Caty button: clicking opens panel, no animation on button itself
- [ ] CLAUDE.md: contains "ENTERPRISE UI GUARDRAIL" P0 section
- [ ] GitHub PR opened against main for `General-home-r360-01`

---

## Handoff Context for Jahanara

- **Repo:** https://github.com/Vikram-Indla/catalyst-prod-45
- **Dev server:** Always `http://localhost:8080` (per CLAUDE.md, never 8081)
- **Branch to create:** `General-home-r360-01`
- **Estimated time:** 2.5 hours (Phase 1: 5min, Phase 2: 60min, Phase 3: 30min, Phase 4: 15min, Phase 5: 20min, Phase 6: 10min, Phase 7: 10min, buffer: 20min)
- **Approval required from Vikram BEFORE merging to main**
- **Design-audit CI gate must be green before PR review**

---

## Related Documentation

- [CLAUDE.md § FOUR RULES](../../CLAUDE.md) — Think before coding, simplicity, surgical, goal-driven
- [CLAUDE.md § ADS Tokens Mandatory](../../CLAUDE.md) — Hardcoded colors banned, canonical token map
- [CLAUDE.md § Branch Management 2026-05-18](../../CLAUDE.md) — On-demand branch creation
- [MEMORY.md](~/.claude/projects/-Users-vikramindla-Documents-GitHub-catalyst-prod-45/memory/MEMORY.md) — TEXT-ONLY constraint permanently lifted

---

*Auto-generated by /obsidian save on 2026-05-31 — handoff to khan.jahanara@gmail.com*
