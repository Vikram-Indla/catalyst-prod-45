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
- [x] Phase 0 bootstrap
- [x] Phase 0.5 Jira Architect scan (28 patterns, 0 halts)
- [x] Phase 1 plan written (4 lanes, 9 types)
- [x] Phase 2 council verdict (3 panels)
- [x] Phase 3 plan synthesized
- [x] Phase 7 handover stub created
- [ ] Stage 1 #1 — read CatalystViewBusinessRequest.v2.tsx
- [ ] Stage 1 #10 — Vikram confirms canonical + ordering
- [ ] Stage 2 round-robin × 9 types
- [ ] Stage 3 cross-cutting X1–X7
- [ ] Stage 4 final gates F1–F7

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

Reference issue (screenshot): BAU-5736 (QA Bug/Defect), inside Senaei BAU / BAU-4466.
Canonical hypothesis: CatalystViewBusinessRequest.v2.tsx is the "new implementation"
Vikram referenced — confirm at Stage 1 step #1 before any code.

Run order:
  Stage 1 (#1–#10): Discovery (read v2 → JQL exemplars → schema dump × 9 →
    ADF probe of BAU-5736 → Jira DOM probe → Catalyst DOM probe at localhost:8080 →
    pixel probe → ads-validator → red-arrow screenshots → ASK VIKRAM)
  Stage 2: Per-type round-robin × 9, in order:
    Defect/QA Bug → Story → Task → Subtask → Feature → Epic → BR → Incident → Idea.
    Each type: T-A failing test → T-B fix → T-C ads-validator → T-D re-probe →
    T-E green-arrow screenshot → T-F regression-sweep → T-G commit + Vikram review.
    5-cycle cap per type. Halt and surface if exceeded.
  Stage 3 cross-cutting: X1 Improve→inline panel · X2 top-bar wiring ·
    X3 breadcrumb nav · X4 remove count badges · X5 ADF media → proxy ·
    X6 Activity dedup · X7 status dropdown typography + transparent parent chip.
  Stage 4: F1 re-probe all 9 (drift=0) · F2 ads-validator (0 violations) ·
    F3 design-critique (≥27/30 each) · F4 all-green screenshots ·
    F5 one PR · F6 lessons → save-memory · F7 handover update.

Hard rules in force:
- localhost:8080 ONLY (no 8081, no preview_*).
- Chrome MCP for live probes; Atlassian MCP for schema/ADF; Lovable for SQL (none expected).
- TDD: failing test before every implementation row.
- Ask Vikram before any field add/remove or banned-item touch.
- Banned (NEVER add): MDT Ref, Service Now#, Assessment Feature, Story Points,
  Development section, Automation section, AI Sparkles inline, Notion-in-Projects.
- One PR per session, after all rows committed.

First action: confirm canonical by reading CatalystViewBusinessRequest.v2.tsx,
then ask Vikram for go on Stage 2 ordering.
```
