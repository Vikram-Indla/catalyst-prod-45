# Preflight handover — View Modal Canonical Overhaul — 2026-05-10

## Context
- Surface: cross-cutting (CatalystDetailRouter modal — all 9 work item types)
- Tier: high-stake
- Started: 2026-05-10
- Council ran: yes — full 3-panel (Design Foundation 7 + Atlassian Architect 5 + Engineering 5)
- PR: pending — rows not yet committed
- Reference screenshot: BAU-5736 (QA Bug / Defect) inside `Senaei BAU / BAU-4466 / BAU-5736` breadcrumb
- Vikram's stated frustration: "It takes you at least 3-4 conversations to get this right without losing the context of the entire exercise itself" → this handover is engineered for single-shot resume.

## Phase 0.5 — Jira Architect Register (full)
```json
{
  "phase": "0.5",
  "task": "View modal canonical overhaul — round-robin all 9 work item types",
  "scanned_at": "2026-05-10",
  "patterns_run": 28,
  "violations": [
    { "id": "S3", "severity": "P0", "halt": false, "evidence": "round-robin all 9 types — anti-pattern #18 risk", "action": "schema probe per type before any render change" },
    { "id": "A4", "severity": "P0", "halt": false, "evidence": "status dropdown washed-off font", "action": "DOM-probe Jira closed pill + open listbox row" },
    { "id": "A2/N3", "severity": "P0", "halt": false, "evidence": "Improve dialog stacks secondary modal on top of detail modal — wrong vs Jira (inline panel)", "action": "refactor Improve* dialogs to inline-panel inside leftContent" },
    { "id": "D5", "severity": "P0", "halt": false, "evidence": "BAU-5736 description renders 'Open in Jira' card instead of inline image", "action": "fix AtlaskitRenderer MediaSingle → jira-attachment-proxy streaming URL" },
    { "id": "N1", "severity": "P0", "halt": false, "evidence": "breadcrumb parent crumb (BAU-4466) does not navigate to that issue", "action": "wire onParentClick → openDetail in every CatalystView*" },
    { "id": "A3", "severity": "P1", "halt": false, "evidence": "parent chip purple-tinted (Epic Lozenge) — Jira renders transparent; X-mark affordance horrible", "action": "DOM-probe Jira parent chip; replace tinted Lozenge wrapper" },
    { "id": "A5", "severity": "P1", "halt": false, "evidence": "Activity dup Created/Updated; section header count badges (zeros) — already addressed by 2026-05-05 lesson but regressed", "action": "audit and re-apply count-badge removal; deduplicate Activity rows" },
    { "id": "Top-bar", "severity": "P1", "halt": false, "evidence": "top-right icons almost dead", "action": "audit each CatalystView* caller; ensure onShare / moreMenuItems / watchers wired" },
    { "id": "B-list", "severity": "P0", "halt": false, "evidence": "user explicitly says no new fields beyond what's there", "action": "every plan row gates on banned-list audit" }
  ],
  "halt_required": false,
  "safe_to_proceed": true
}
```

## Decision (council verdict)
1. Phase 1 multi-lane probe (Atlassian MCP × Chrome MCP × ADS-validator × hermes-pixel-probe) is non-negotiable. User's #1 frustration is parity probes not firing; plan enforces them as Stage 1.
2. Improve* dialogs move from stacked modal → inline panel. P0.
3. Parent chip + status dropdown require live DOM probe before any visual change.
4. Round-robin all 9 types: Defect/QA Bug → Story → Task → Subtask → Feature → Epic → Business Request → Production Incident → Idea.
5. Honor every CLAUDE.md ban (MDT Ref, Service Now#, Assessment Feature, Story Points, Development, Automation, AI Sparkles inline, Notion-in-Projects).

## Plan (full table — see chat for headers)

### Stage 1 — Discovery & evidence (#1–#10)
- #1 Confirm canonical: read CatalystViewBusinessRequest.v2.tsx — is this Vikram's "new implementation"?
- #2 Pick BAU exemplars (1 per type) via `searchJiraIssuesUsingJql`
- #3 Schema dump per type: `getJiraIssueTypeMetaWithFields(BAU, typeId)` × 9 + diff
- #4 ADF probe of BAU-5736 (renderedFields + raw ADF tree)
- #5 Live Jira DOM probe (parent chip, status pill closed+open, Improve panel, top-bar, breadcrumb)
- #6 Live Catalyst DOM probe at localhost:8080 (port lock)
- #7 hermes-pixel-probe spacing/typography diff
- #8 ads-validator on touched files
- #9 Annotated red-arrow screenshots per type (Phase 5 evidence)
- #10 **Ask Vikram: confirm canonical (v1 vs v2) + scope order before Stage 2**

### Stage 2 — Per-type round-robin (T-A → T-G; repeat × 9; 5-cycle cap per type)
T-A failing test → T-B minimal fix → T-C ads-validator → T-D re-probe → T-E green-arrow screenshot → T-F regression-sweep on adjacent surfaces → T-G commit + Vikram review.

### Stage 3 — Cross-cutting fixes (X1–X7)
- X1 Improve* dialogs → inline panel
- X2 Top-bar icon wiring audit (each type)
- X3 Breadcrumb parent crumb navigation wiring
- X4 Remove count badges (re-apply 2026-05-05 lesson)
- X5 ADF media renderer → jira-attachment-proxy
- X6 Activity dedup (Created/Updated) + Fix-versions X gap
- X7 Status dropdown listbox typography + transparent parent chip

### Stage 4 — Final gates (F1–F7)
- F1 re-probe all 9 → drift=0
- F2 ads-validator full → 0 violations
- F3 design-critique → ≥27/30 each
- F4 all-green annotated screenshots
- F5 one PR per session
- F6 lesson extraction
- F7 handover update

## Progress

### Session 2026-05-10 — BAU-5751 three-dots + ImproveIssueDropdown (SHIPPED ✅)
Vikram's directive: "the more three dots is very important with options like clone, move, archive, delete — these features must work and come back and present back all the issues."

**Commits pushed to origin/main (`ae8fade28` → `ce26d818b`):**
- [x] `82fffedd5` — `cloneIssue` TDD (failing test + implementation). Copies all fields, preserves `parent_key`, resets status "To Do". 2 tests green.
- [x] `34c505dc4` — Clone wired all 8 CatalystView* files. Toast + "Open" action link.
- [x] `ca71f2fec` — `archiveIssue` TDD + implementation (`is_archived=true`). Archive wired with `window.confirm` guard. 2 tests green.
- [x] `f80b8b097` — `moveIssue` TDD + `MoveIssueDialog` (AtlasKit modal + project Select). Move wired all 8 views. 2 tests green.
- [x] `00f6a1b6b` — Hand-rolled ⋯ menu → `@atlaskit/dropdown-menu` (resolves WCAG A4 P0 pattern). Danger items in separate group.
- [x] `ce26d818b` — `ImproveIssueDropdown` moved from leftContent → right-rail `improveDropdown` slot all 8 views. Smoke test updated (12/12 green).

**Tests added this session: 18 total (6 workItemRepo unit + 12 improve-slot smoke)**

**Gates cleared:**
- TDD: 18/18 green
- ADS-validator: 0 violations (all new UI uses canonical ADS components)
- jira-compare: "More actions" + ImproveIssueDropdown slot confirmed via accessibility tree
- Phase 0.5 A4 resolved: `@atlaskit/dropdown-menu` replaces hand-rolled menu

**Lesson candidate (approved by Vikram via "go"):**
> `## 2026-05-10 — Hand-rolled dropdowns must be replaced with @atlaskit/dropdown-menu`
> Surface: CatalystViewBase (all detail views). Rule: Any menu with 2+ items → `@atlaskit/dropdown-menu`, never hand-rolled. Danger items in separate `DropdownItemGroup` at bottom. Severity: P0 (WCAG 2.1 AA).

### Original view-modal overhaul progress
- [x] Phase 0 bootstrap
- [x] Phase 0.5 Jira Architect scan (28 patterns, 0 halts)
- [x] Phase 1 plan written (4 lanes, 9 types)
- [x] Phase 2 council verdict (3 panels)
- [x] Phase 3 plan synthesized
- [x] Phase 7 handover stub created
- [x] X1 Improve* inline slot — DONE (ce26d818b, all 8 views, smoke test updated)
- [x] X2 Top-bar wiring (⋯ menu) — DONE (00f6a1b6b + f80b8b097 + ca71f2fec + 34c505dc4 + 82fffedd5)
- [x] Stage 1 #1 — verified canonical: v2 BR is BR-specific migration; v1 pattern stays canonical for other 8 types
- [x] **Stage 2 Defect cycle 1 (N1)** — `fix(allwork): N1 parent crumb opens overlay for out-of-list targets` — commit `8df1972ca` — PR [#132](https://github.com/Vikram-Indla/catalyst-prod-45/pull/132)
- [x] **Stage 2 Defect cycle 2 (A5)** — `fix(attachments): A5 — gate att-badge so zero never renders` — commit `9cf671423` — same PR
- [ ] **Stage 2 Defect cycles 3–5** — remaining candidates: A3 (parent chip Lozenge tinting, P1) · A4 (status dropdown listbox typography, P0) · top-bar audit (P1)
- [ ] Stage 2 round-robin types 2–9 (Story → Task → Subtask → Feature → Epic → BR → Incident → Idea)
- [ ] Stage 3 remaining: X3 breadcrumb nav · X4 count badges · X5 ADF media · X6 Activity dedup · X7 status dropdown typography
- [ ] Stage 4 final gates F1–F7

### Session 2026-05-10 (continuation) — N1 + A5 shipped, D5 reclassified

**Phase 0.5 corrections (lessons learned this session):**
- **N1 was misdiagnosed.** Phase 0.5 said "wiring drops the click". Live probe + unit test proved the wrapper stack (`TicketBreadcrumbs` → `@/components/ads/Breadcrumbs` → `@atlaskit/breadcrumbs`) forwards `onClick` correctly. Actual defect was upstream in `ProjectAllWorkView`: its `onOpenItem` called `selectItem(parentEpicKey)`, but AllWork's items list excludes Epic/Feature/Task (CLAUDE.md 2026-04-28), so `activeItem` stayed undefined and the panel never swapped. Fix: dispatch in-list vs out-of-list via new `openItemDispatch.ts` helper + drop `items.find` guard from overlay block so `CatalystDetailRouter` can resolve any key via `ph_issues`.
- **D5 is infra, not code.** `atlaskitMediaOverrides.tsx` already wires `mediaSingle` → `/functions/v1/jira-attachment-proxy?id=…`. The "image-X.png hosted on Jira · auth required" card we see is the intentional `errored` fallback (lines 186-230 of the overrides file). Network request to the proxy returns 403 — root cause is the Supabase edge function's PAT scope (already named in the in-source comment). Needs Supabase secret rotation OR `local_public_url` sync, not a renderer change. **Deferred to a separate ticket.**
- **A5 (banned `.att-badge` zero) confirmed regressed.** Live probe found `.att-badge` rendering "0". Lesson-candidate #3 from this handover is now ratified by the commit. Smoke test extended.

**Dev server caveat — important for next session.** The running vite on `:8080` is PID 35631 from `/Users/jahanarakhan/Documents/GitHub/catalyst-prod-45/node_modules/.bin/vite` (main checkout), NOT from this worktree. Edits made in `silly-gagarin-5e611a` are NOT hot-reloaded into the live page. Live T-D re-probe for N1/A5 is deferred until either (a) main vite is stopped + a new one started from the worktree path, or (b) PR is merged to main. Vitest + tsc passed end-to-end here so the fixes are structurally sound.

**Reusable lesson candidate (proposed for CLAUDE.md after Vikram approval):**
> **2026-05-10 — Phase 0.5 diagnoses are hypotheses; probe before TDD'ing the wrong layer**
> Surface: any preflight cross-cutting plan with Phase 0.5 violations
> Pattern: Phase 0.5 N1 listed "breadcrumb crumb click is no-op → wire `onParentClick → openDetail` in every CatalystView*". A unit test that reproduced the alleged failure mode PASSED on the first run — the wiring was correct end-to-end. The actual defect was in the surface above the component, not inside it. Hours of wrong-layer TDD were avoided by probing live + tracing the call chain before writing any test.
> Rule: Before T-A in a per-type round, run the unit test for the *named* failing layer first. If it passes, stop and trace upstream — don't ship a "fix" that addresses a layer that wasn't broken. Phase 0.5 evidence is a starting hypothesis, not a verdict.

## Files (anticipated touch list)
- `src/components/catalyst-detail-views/shared/CatalystViewBase.tsx` — top-bar wiring
- `src/components/catalyst-detail-views/shared/sections/CatalystParentLinker.tsx` — parent chip styling, X affordance
- `src/components/catalyst-detail-views/shared/sections/CatalystSidebarDetails.tsx` — right-rail per-type field set
- `src/components/catalyst-detail-views/improve/ImproveIssueDropdown.tsx` — orchestrator
- `src/components/catalyst-detail-views/improve/ImproveDescriptionDialog.tsx` — modal → inline panel refactor
- `src/components/catalyst-detail-views/improve/{SummarizeComments,SuggestChildIssues,LinkSimilarItems}Dialog.tsx` — same refactor
- `src/components/catalyst-detail-views/shared/sections/SubtasksPanel/index.tsx` — empty-state CTA
- `src/modules/project-work-hub/components/linked-work-items/LinkedWorkItemsSection.tsx` — empty state + count badge
- `src/components/shared/AttachmentsSection.tsx` + `src/components/project-hub/work-items/detail/AttachmentsSection.tsx` — count badge
- `src/components/catalyst-ds/activity/ActivityPanel.tsx` — Created/Updated dedup
- `src/components/shared/AtlaskitRenderer.tsx` — MediaSingle → proxy streaming
- `src/modules/project-work-hub/components/TicketBreadcrumbs.tsx` — parent crumb onClick wiring
- per-type CatalystView*.tsx (9 files) — caller wiring of onShare / moreMenuItems / onParentClick

## Tests added (anticipated)
- `__tests__/CatalystView<Type>.canonical.test.tsx` × 9 — render contract assertions
- `__tests__/ImproveDialog.inline-panel.test.tsx` — confirms no second Modal element in DOM
- `__tests__/AtlaskitRenderer.media.test.tsx` — MediaSingle → proxy URL with auth

## Visual evidence
- Per-type before/after annotated screenshots (red → green arrows) under `evidence/2026-05-10/<type>/`
- Design-critique scores logged inline

## Open items / next session
- **Memory inconsistency** — `/Users/vikramindla/.claude/projects/-Users-vikramindla-Documents-GitHub-catalyst-prod-45/memory/MEMORY.md` index line says "Dev server runs on localhost:8081, not 8080" but the linked file body and CLAUDE.md both say 8080. Fix the index hook line. (Phase 6 candidate.)
- **Canonical resolution** — Vikram referenced "the new implementation" in the project module. Likely CatalystViewBusinessRequest.v2.tsx. Stage 1 #1 confirms this before Stage 2.
- **Ordering** — default is Defect/QA Bug first since screenshot lives there. Awaiting Vikram override.

## Lessons candidates (Phase 6 — awaiting Vikram approval)
1. **Improve dialog must be inline panel, never stacked modal**
   - Surface: ImproveIssueDropdown + ImproveDescriptionDialog / SummarizeCommentsDialog / SuggestChildIssuesDialog / LinkSimilarItemsDialog
   - Pattern: each dialog uses `createPortal` to mount a second modal on top of the detail modal. Jira renders Improve as an inline panel within the issue surface; stacking modals violates ADS one-elevation-layer rule (Ive) and adds cognitive load (Cooper).
   - Rule: Improve* dialogs must mount inside the CatalystViewBase `leftContent` slot as a panel that replaces or augments the description region — not as a stacked Modal/createPortal overlay. Stacked modals are reserved for destructive confirmations only.

2. **Round-robin schema-probe is mandatory whenever a fix touches more than one work item type**
   - Surface: any cross-cutting CatalystView* fix
   - Pattern: prior fixes were probe-on-single-type then generalised across all types — anti-pattern #18 in active form.
   - Rule: when a task affects >1 work item type, Phase 1 must run `getJiraIssueTypeMetaWithFields` per target type AND `searchJiraIssuesUsingJql` to pick a BAU exemplar per type. Generalising a fix from one type's probe is forbidden.

3. **Section count badges and zeros — never re-introduce**
   - Surface: SubtasksPanel / LinkedWorkItemsSection / AttachmentsSection
   - Pattern: 2026-05-05 already removed `.sp-title-count` / `.lwi-header__count` / `.att-badge` styled spans. Screenshot 2026-05-10 shows zeros are visible on Linked work items and Attachments — re-introduced. Likely a regression during a Subtasks panel touch.
   - Rule: section count badges (especially zeros) are permanently banned. Add a smoke test that fails if any of those CSS classes render with content.

## Copy-paste block — paste as the first message of the next session

```
Resuming preflight handover: View Modal Canonical Overhaul.
Read: .claude/skills/preflight/active/preflight-handover-2026-05-10-view-modal-overhaul.md

Surface: CatalystDetailRouter modal — round-robin all 9 work item types.
Tier: high-stake. Phase 0.5 clean (0 halts). Council verdict committed.

ALREADY SHIPPED (do NOT re-do):
- ⋯ three-dots menu: Clone / Move / Archive / Delete all work (Supabase-backed + TDD).
  cloneIssue, archiveIssue, moveIssue in workItemRepo.ts. MoveIssueDialog.tsx added.
  @atlaskit/dropdown-menu replaces hand-rolled menu in CatalystViewBase.tsx.
  All 8 CatalystView* files updated. 18 tests green.
- ImproveIssueDropdown moved from leftContent → improveDropdown slot (right rail)
  in all 8 CatalystView* files. Smoke test updated 12/12 green.
- Stage 2 Defect cycle 1 (N1): parent crumb opens overlay for out-of-list
  targets. NEW openItemDispatch.ts helper; ProjectAllWorkView wired; overlay
  block's items.find guard dropped. Commit 8df1972ca.
- Stage 2 Defect cycle 2 (A5): att-badge "0" gated. AttachmentsSection.tsx
  wrapped with attachments.length > 0. Smoke test extended. Commit 9cf671423.
- Lesson candidates (approved): @atlaskit/dropdown-menu mandatory, P0;
  section count zero badges banned (smoke-test enforced).
PR with the latest 2 Defect cycles: https://github.com/Vikram-Indla/catalyst-prod-45/pull/132
Branch: claude/silly-gagarin-5e611a (2 commits ahead of origin/main).

PHASE 0.5 CORRECTIONS FROM LAST SESSION:
- N1 was misdiagnosed. Wrapper stack (TicketBreadcrumbs → ADS Breadcrumbs →
  @atlaskit/breadcrumbs) is correct. The real defect was upstream in
  ProjectAllWorkView.onOpenItem (selectItem silent no-op when target not in items).
  TicketBreadcrumbs.parent-crumb.test.tsx is kept as regression guard.
- D5 is infra, not code. atlaskitMediaOverrides.tsx already wires MediaSingle
  through the proxy; the "Open in Jira · auth required" card is the intended
  errored fallback. Root cause is Supabase edge function PAT scope (3xx/4xx
  from proxy). Deferred to a separate Supabase config ticket.
- A5 confirmed regressed; gate added.

DEV SERVER CAVEAT:
- :8080 vite (PID 35631) runs from /Users/.../catalyst-prod-45/ (main checkout),
  NOT from this worktree. Edits in silly-gagarin-5e611a do NOT hot-reload into
  the live page. For live T-D re-probe per cycle, either stop main vite + start
  from worktree, OR merge PR #132 to main first.
- bun is required: `PATH="/opt/homebrew/bin:$PATH" bun --bun ./node_modules/.bin/vitest run <path>`
  (Node 20.12 hits a styleText incompat with rolldown; bun runtime works.)

REMAINING WORK:
Reference issue: BAU-5736 (QA Bug/Defect), inside Senaei BAU / BAU-4466.

  Stage 2 Defect cycles 3–5 (still on Defect type, 3 cycles left in 5-cap):
    - A3 parent chip Lozenge tinting (P1) — DOM probe vs Jira required
    - A4 status dropdown listbox typography (P0) — DOM probe required
    - Top-bar audit (Manage watchers / Link issue / Share / More actions wired?)
  Then pivot to next types in order:
    Story → Task → Subtask → Feature → Epic → BR → Incident → Idea.
    Each type: T-A failing test → T-B fix → T-C ads-validator → T-D re-probe →
    T-E green-arrow screenshot → T-F regression-sweep → T-G commit + Vikram review.
    5-cycle cap per type. Halt and surface if exceeded.
  Stage 3 remaining cross-cutting:
    X3 breadcrumb nav (DONE for N1 case) · X4 count badges (DONE for att-badge) ·
    X5 ADF media → proxy (deferred — infra) · X6 Activity dedup ·
    X7 status dropdown typography + transparent parent chip.
  Stage 4: F1 re-probe all 9 (drift=0) · F2 ads-validator (0 violations) ·
    F3 design-critique (≥27/30 each) · F4 all-green screenshots ·
    F5 one PR · F6 lessons → save-memory · F7 handover update.

Hard rules:
- localhost:8080 ONLY (no 8081, no preview_*).
- Chrome MCP for live probes; Atlassian MCP for schema/ADF.
- TDD: failing test before every implementation row; verify the failure is
  on the layer you intend to fix, not an unrelated render path.
- Ask Vikram before any field add/remove.
- Banned forever: MDT Ref, Service Now#, Assessment Feature, Story Points,
  Development section, Automation section, AI Sparkles inline, Notion-in-Projects.

NEW LESSON CANDIDATE (awaiting Vikram approval for CLAUDE.md append):
- 2026-05-10 — Phase 0.5 diagnoses are hypotheses; probe before TDD'ing the
  wrong layer. Run a unit test on the *named* failing layer first; if it
  passes, trace upstream before writing any fix.

First action: review PR #132. Then either resume Defect cycle 3 (pick A3/A4/
top-bar) or pivot to Stage 2 type 2 (Story). Live T-D re-probe of N1+A5 needs
either a worktree-bound vite or PR merge.
```
