# Preflight Handover — Home Screen / For You — 2026-05-09

## Context
- Surface: `ui-feature` + `ui-bug-fix` (cross-cutting across all 5 For You tabs)
- Tier: standard → escalated to high-stake during session (multi-tab, multi-component)
- Route: `http://localhost:8080/` (root → For You page)
- Started: 2026-05-09 session
- Council ran: no (inline investigation, 200-IQ then 500-IQ audit)
- Worktree: `nervous-merkle-04d5e0`

---

## What Was Fixed This Session

### Fix 1 — ProjectHubSidebar.tsx: colour-dot → JiraIssueTypeIcon
- **File:** `src/components/layout/ProjectHubSidebar.tsx`
- **Problem:** `issueTypeColor()` returned hardcoded hex squares (🔴 bug, 🟢 story, 🟣 epic, 🔵 default) — non-discoverable colour-recall pattern. No icon language.
- **Fix:** Removed `issueTypeColor()` entirely. Added `import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons'`. Replaced 8px coloured square with `<JiraIssueTypeIcon type={item.entity_type} size={14} />`.
- **Commit:** `fix(sidebar): replace colour dots with JiraIssueTypeIcon in Recent rail`

### Fix 2 — CLAUDE.md: JiraIssueTypeIcon mandate + Notion ban
- **File:** `CLAUDE.md` (worktree root)
- **Added:** "2026-05-09 — Always use JiraIssueTypeIcon for work item type display" (full rule with IMMUTABLE label)
- **Added:** "Banned integrations — Projects module" (Notion permanently out of scope)
- **Commit:** `docs(CLAUDE.md): ban colour-dot pattern; mandate JiraIssueTypeIcon everywhere`

### Fix 3 — ForYouRow.tsx: lozenge sentence-case + 48px density + JiraIssueTypeIcon
- **File:** `src/components/for-you/atlaskit/ForYouRow.tsx`
- **Changes:**
  - `import WorkItemIcon` → `import { JiraIssueTypeIcon } from '@/lib/jira-issue-type-icons'`
  - Row height: `56px` → `48px` (Jira benchmark, H8 density fix)
  - `<WorkItemIcon type={normalizeIconType(item.issueType)} size={20} />` → `<JiraIssueTypeIcon type={item.issueType ?? 'Task'} size={20} />`
  - Wrapped `<Lozenge>` with `<span data-cp-lozenge-jira-parity>` to activate index.css uppercase override → sentence-case rendered
- **Commit:** `fix(home): lozenge sentence-case, remove hardcoded subtitle, JiraIssueTypeIcon, 48px rows`

### Fix 4 — RecommendedProjectsStrip.tsx: remove hardcoded "Software project" subtitle
- **File:** `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx`
- **Problem:** Lines 192-208 had hardcoded `<div>"Software project"</div>` for ALL project cards. `Project` interface has no `project_type` field. Identical text on every card = zero differentiation (H8 minimalism, design-intelligence V1).
- **Fix:** Removed entire subtitle div. Added inline comment explaining why.
- **Commit:** same commit as Fix 3

### Fix 5 — Skills: design-intelligence v2 (500-IQ Foundation Council)
- **File:** `.claude/skills/design-intelligence/SKILL.md`
- **Upgraded to v2.0.0 / IQ 500** with 7 Foundation Council lenses:
  1. Dan Saffer — Microinteraction anatomy
  2. Edward Tufte — Data-ink ratio
  3. Dieter Rams — 10 Principles
  4. Don Norman — Affordances + conceptual model
  5. Jony Ive — Reduction + transition choreography
  6. Jef Raskin — Cognitive efficiency / Hick's + Fitts' Law
  7. Alan Cooper — Goal-directed design
- **Commit:** `feat(skills): upgrade design-intelligence to 500-IQ Foundation Council v2`

### Fix 6 — Skills: 500-IQ wired into preflight, design-critique, jira-compare
- **Files modified:**
  - `.claude/skills/preflight/SKILL.md` — Phase 0.5 now enumerates all 7 council lenses
  - `.claude/plugins/preflight/skills/preflight/SKILL.md` — same
  - `.claude/skills/design-critique/SKILL.md` — Step 1 now includes 500-IQ pre-scan before H1-H10
  - `~/.claude/skills/jira-compare/SKILL.md` (global) — §0 now has 500-IQ pre-probe council scan
- **Commit:** same commit as Fix 5

---

## Source Files for Next Session

| Component | File path | Priority |
|---|---|---|
| Ageing tab logic | `src/components/for-you/atlaskit/AgeingPanel.tsx` | P0 |
| Assigned to me tab | `src/components/for-you/atlaskit/AssignedPanel.tsx` | P1 |
| Starred tab | `src/components/for-you/atlaskit/StarredPanel.tsx` | P1 |
| Recommended tab | `src/components/for-you/atlaskit/RecommendedPanel.tsx` | P1 |
| AI Focus tab | `src/components/for-you/atlaskit/AiThemePanel.tsx` | P2 |
| Row primitive | `src/components/for-you/atlaskit/ForYouRow.tsx` | reference |
| Project strip | `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` | reference |
| Data hook | `src/hooks/useForYouData.ts` | reference |

---

## Open Backlog — Tab by Tab

### 🔴 Ageing Tab — 7 mandatory fixes (500-IQ Council finding, P0)

**Source file:** `src/components/for-you/atlaskit/AgeingPanel.tsx`

| # | Finding | Council lens | Fix | Severity |
|---|---|---|---|---|
| A-1 | Group label "Overdue SLA" is task-centric not goal-centric | Cooper | Rename → "Needs Attention" with age brackets 🔴90+ · 🟠60-90 · 🟡30-60 days | P0 |
| A-2 | 16 undifferentiated rows = Hick's Law violation: T=b·log₂(17)≈4b | Raskin | Group by age bracket → T=b·log₂(4)=2b, 50% cognitive reduction | P0 |
| A-3 | Items updated < 21 days shown (BAU-4771 "In Progress" 3 weeks old) = false positives | Rams (useful) | Filter: exclude `updated_at > now() - interval '21 days'` | P0 |
| A-4 | No hover action affordance on stale rows (3-dot menu dead or invisible) | Norman (affordance) | Add hover-reveal 3-dot menu: Reassign · Move to Archive · Escalate | P0 |
| A-5 | No archival intelligence — items >90 days have no archive date warning | Cooper (goal) | Add `🗄 Archive by [date]` chip with ADS `color.background.danger.subtle` progress bar | P1 |
| A-6 | No empty state designed for "no ageing items" | Rams (Principle 8 thoroughness) | Empty state: "No stalled work — you're on top of things 🎉" with ADS illustration | P1 |
| A-7 | Transition on row hover: no Ive choreography | Ive | `ease` 150ms for hover bg, `ease-out` 200ms for 3-dot menu appear, stagger if animating multiple | P2 |

**How to fix A-1 through A-4** (implementation path):
```
AgeingPanel.tsx:
1. Add filter: items.filter(i => daysSince(i.updatedAt) >= 21)
2. Group by ageBracket: (days) => days >= 90 ? 'red' : days >= 60 ? 'orange' : 'yellow'
3. Render group header with emoji + range label (no background, no border — Tufte)
4. Render ForYouRow with alwaysShowStar=false + 3-dot action menu (MoreVertIcon @24px)
```

---

### 🟠 Assigned to Me Tab — 5 fixes (P0-P1)

**Source file:** `src/components/for-you/atlaskit/AssignedPanel.tsx`

| # | Finding | Council lens | Fix | Severity |
|---|---|---|---|---|
| B-1 | Grouping by status label text ("To Do") not statusCategory — "Prioritized Backlog" shown as To Do group alongside In Progress items | Raskin (mode confusion) | Group by `statusCategory` field: `new` → "Waiting" / `indeterminate` → "Active" / `done` → filter out | P0 |
| B-2 | Done items shown by default (BAU-4890 "In Production" = done) | Cooper (goal) | Filter: hide `statusCategory === 'done'` items from default view; add "Show completed (N)" toggle | P0 |
| B-3 | No pagination signal — shows N of 39 with no indicator | Norman (feedback) | Add subtle footer: "Showing 15 of 39 · Load more" at ADS `color.text.subtlest` | P1 |
| B-4 | No project separator for cross-project items (BAU vs MWR mixed) | Tufte (structure) | Add project separator row (project icon + name, 1px border hairline) between project groups | P1 |
| B-5 | Reporter avatar not shown when assignee = current user (redundant assignee column) | Norman (recognition) | When `assignee.id === currentUser.id`, swap assignee slot for reporter avatar + tooltip | P2 |

---

### 🟡 Starred Tab — 3 fixes (P1-P2)

**Source file:** `src/components/for-you/atlaskit/StarredPanel.tsx`

| # | Finding | Council lens | Fix | Severity |
|---|---|---|---|---|
| C-1 | Star toggle write path unverified — `onToggleStar` → Supabase path not audited | Norman (feedback) | Audit `user_starred_items` upsert + RLS policy; add optimistic update + toast on success/fail | P1 |
| C-2 | Empty state has no CTA — "No starred items" with nowhere to go | Cooper (goal) | Add: "Browse your assigned work →" button that switches to Assigned to me tab | P1 |
| C-3 | No toast feedback when starring from another tab | Saffer (feedback) | Toast: "★ Starred · View in Starred tab [→]" — ADS `color.background.success.subtle` | P2 |

---

### 🟡 Recommended Tab — 4 fixes (P1-P2)

**Source file:** `src/components/for-you/atlaskit/RecommendedPanel.tsx`

| # | Finding | Council lens | Fix | Severity |
|---|---|---|---|---|
| D-1 | `@@vikram indla` renders as plain text not @mention chip | Norman (affordance) | Render as `@mention` chip: ADS `color.text.brand` + `color.background.information.subtle` | P1 |
| D-2 | Comment text not clamped — long comments push row height | Ive (reduction) | `-webkit-line-clamp: 3`; "Show more" expand affordance | P1 |
| D-3 | "Leave a reply" textarea always visible — adds visual weight | Raskin (cognitive) | Collapse textarea by default; show on "Reply" click; hide on blur | P2 |
| D-4 | "Suggest a reply" label misleading — AI sourcing not disclosed | Rams (honest) | Relabel: "✨ Draft AI reply" + tooltip: "Claude drafts a contextual reply based on the thread" | P2 |

---

### 🟢 AI Focus Tab — 5 fixes (P2 polish)

**Source file:** `src/components/for-you/atlaskit/AiThemePanel.tsx`

| # | Finding | Council lens | Fix | Severity |
|---|---|---|---|---|
| E-1 | No cache staleness warning — analysis could be hours old | Raskin (feedback) | ⚠️ amber badge when > 2h old; auto-re-analyze on tab return after > 4h | P1 |
| E-2 | Coverage not disclosed — user doesn't know what was included | Tufte | "Analysed 18 of 39 · 21 excluded (done/archived) · [Why?]" at `color.text.subtlest` | P1 |
| E-3 | Cross-project contamination (MDT-640 in BAU cluster) no alert | Cooper (goal) | Alert chip: "⚠️ MDT-640 is from a different project · [Keep / Remove]" | P2 |
| E-4 | Progress bar legend has no tooltip | Tufte | Tooltip: "5 of 18 issues in this theme are Done (28%)" | P2 |
| E-5 | Category tag sourcing not marked (AI-generated vs manual) | Rams (honest) | Prefix AI-generated tags with ✨; verify accuracy of existing tags against Jira data | P2 |

---

## AI Use Cases to Implement (Next Sessions)

| ID | Capability | Tab | Data source | Priority |
|---|---|---|---|---|
| AI-1 | **Archival Intelligence** — predicted archive date = `last_updated + 90 days`; chip with color-fill progress bar 0→100% | Ageing | `ph_issues.updated_at` | P1 |
| AI-2 | **Age-bracket grouping** — AI insight per bracket: "5 items blocked by same Epic" | Ageing | `ph_issues`, `ph_issue_links` | P1 |
| AI-3 | **Smart reply drafting** — "✨ Draft AI reply" CTA with diff view | Recommended | Claude API, comment thread | P1 |
| AI-4 | **Coverage warning** — "Analysed X of Y · Z excluded · [Why?]" | AI Focus | `ph_issues.status_category` | P1 |
| AI-5 | **Cross-project contamination alert** with Keep/Remove action | AI Focus | `ph_issues.project_id` | P2 |
| AI-6 | **Star prediction** on Starred empty state: "You might want to star…" | Starred | `user_recent_items` frequency | P2 |

---

## Design Elevation Score — Current vs Target

| Tab | Current score /15 | Issues | Target /15 |
|---|---|---|---|
| Ageing | 3/15 | A-1 through A-7 (500-IQ P0s) | 13/15 |
| Assigned | 6/15 | B-1 statusCategory grouping, B-2 done filter | 12/15 |
| Starred | 7/15 | C-1 write path unverified | 11/15 |
| Recommended | 8/15 | D-1 @mention rendering | 11/15 |
| AI Focus | 9/15 | E-1 cache staleness | 12/15 |
| ForYouRow (shared) | ✅ 11/15 → fixed to 13/15 this session | F3/F4 applied | 13/15 |

---

## Files Touched This Session

- `src/components/layout/ProjectHubSidebar.tsx` — JiraIssueTypeIcon replacing colour dots
- `CLAUDE.md` — JiraIssueTypeIcon mandate + Notion ban
- `src/components/for-you/atlaskit/ForYouRow.tsx` — 48px, JiraIssueTypeIcon, lozenge sentence-case
- `src/components/for-you/atlaskit/RecommendedProjectsStrip.tsx` — removed hardcoded subtitle
- `.claude/skills/design-intelligence/SKILL.md` — v2.0.0 / 500-IQ Foundation Council
- `.claude/skills/design-critique/SKILL.md` — 500-IQ pre-scan wired in
- `.claude/skills/preflight/SKILL.md` — Phase 0.5 updated to 500-IQ brief
- `.claude/plugins/preflight/skills/preflight/SKILL.md` — same
- `~/.claude/skills/jira-compare/SKILL.md` (global) — §0 500-IQ pre-probe council scan

---

## Tests Added
- None this session (all fixes were design/visual — TDD gate noted, ask Vikram how to proceed for UI-only fixes)

---

## Commits This Session (in order)
1. `fix(sidebar): replace colour dots with JiraIssueTypeIcon in Recent rail`
2. `docs(CLAUDE.md): ban colour-dot pattern; mandate JiraIssueTypeIcon everywhere`
3. `fix(home): lozenge sentence-case, remove hardcoded subtitle, JiraIssueTypeIcon, 48px rows`
4. `feat(skills): upgrade design-intelligence to 500-IQ Foundation Council v2`

---

## Lessons Captured (CLAUDE.md candidates — awaiting Vikram approval)

### Lesson candidate 1 — 2026-05-09 — For You tab lozenge must use data-cp-lozenge-jira-parity wrapper
**Surface:** ForYouRow.tsx (all For You tabs)
**Pattern:** `@atlaskit/lozenge` renders ALL CAPS without the `data-cp-lozenge-jira-parity` wrapper that activates the index.css override. The wrapper was documented in CLAUDE.md lesson 2026-04-28 but not applied to ForYouRow.tsx, causing "PRIORITIZED BACKLOG" instead of "Prioritized Backlog".
**Rule:** Every `<Lozenge>` in every surface must be wrapped in `<span data-cp-lozenge-jira-parity>`. This is mandatory regardless of which component is rendering it.

### Lesson candidate 2 — 2026-05-09 — Ageing tab grouping must use age brackets not SLA labels
**Surface:** AgeingPanel.tsx
**Pattern:** "Overdue SLA" is a Jira-internal label that means nothing to the user's goal ("what should I deal with today?"). Age brackets (🔴90+, 🟠60-90, 🟡30-60) reduce Hick's Law decision load by 50% and match the user's mental model (Cooper lens).
**Rule:** Any grouping on a work-list surface must use the user's goal vocabulary, not the data schema vocabulary. Group labels answer "why does this group matter to me?" not "what is this group's technical category?".

---

## Jump-Start Block for Next Session

```
Context: Home screen / For You page (http://localhost:8080/)
Worktree: /Users/vikramindla/Documents/GitHub/catalyst-prod-45/.claude/worktrees/nervous-merkle-04d5e0
Handover: .claude/active/preflight-handover-2026-05-09-home-screen-for-you.md

Fixed this session:
- ProjectHubSidebar: JiraIssueTypeIcon replacing colour dots (COMMITTED)
- ForYouRow: 48px rows, JiraIssueTypeIcon, lozenge sentence-case (COMMITTED)
- RecommendedProjectsStrip: removed hardcoded "Software project" subtitle (COMMITTED)
- design-intelligence skill: v2.0.0 / 500-IQ Foundation Council (COMMITTED)

First task for next session:
READ AgeingPanel.tsx → run 500-IQ design-intelligence brief on Ageing tab
Fix A-1 (age brackets) + A-2 (Hick's Law grouping) + A-3 (21-day filter) — these are P0 blockers

Key files:
- src/components/for-you/atlaskit/AgeingPanel.tsx (P0 — start here)
- src/components/for-you/atlaskit/AssignedPanel.tsx (P1 — statusCategory grouping)
- src/components/for-you/atlaskit/StarredPanel.tsx (P1 — write path audit)
- src/hooks/useForYouData.ts (data hook — reference)

Key rules:
- 48px row height (Jira benchmark — already applied to ForYouRow)
- JiraIssueTypeIcon from @/lib/jira-issue-type-icons (NOT WorkItemIcon deprecated shim)
- <Lozenge> MUST be wrapped in <span data-cp-lozenge-jira-parity>
- statusCategory (new/indeterminate/done) NOT status label text for grouping
- Notion = permanently banned from Projects module (CLAUDE.md 2026-05-09)
- MDT Ref = permanently banned from all views (CLAUDE.md)
```

---

## Open Items / Next Session Priority Order

1. **AgeingPanel.tsx** — A-1 through A-4 (P0, 500-IQ blocking findings)
2. **AssignedPanel.tsx** — B-1 statusCategory grouping, B-2 done item filter (P0)
3. **StarredPanel.tsx** — C-1 write path audit (P1)
4. **RecommendedPanel.tsx** — D-1 @mention chip, D-2 line clamp (P1)
5. **AiThemePanel.tsx** — E-1 cache staleness, E-2 coverage disclosure (P1)
6. AI use cases AI-1 through AI-3 (P1, requires Supabase Edge Function work)
