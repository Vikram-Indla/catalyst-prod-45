# LANE 7 — Dialog / Drawer / Modal / Popover Audit

Feature: CAT-AUDIT-FULLSWEEP-20260703-001 · Lane: 07 (Overlays) · Date: 2026-07-03
Method: static inventory of every file in `src/` whose name matches `*Dialog*`, `*Modal*`, `*Drawer*`, `*Sheet*`, `*Popover*` (case-insensitive), classified by import system, then behavioral audit of the hand-rolled cohort, a 17-file destructive-dialog sample, width/typography scans, and CRE chokepoint cross-check. READ-ONLY; no code modified.

---

## 1. Inventory Overview

**436 overlay-named files** found in `src/` (includes 7 test files, 1 PNG asset, 1 CSS file, 5 data/hook files, 4 Storybook stories in the "none" bucket).

### Classification by overlay system (file-level, n=436)

| System | Files | Notes |
|---|---|---|
| shadcn/Radix family (`@/components/ui/dialog`, `alert-dialog`, `sheet`, `popover`, `drawer`) | **185** | dialog 132 · alert-dialog 13 · sheet 12 · popover 7 · mixed 21 |
| @atlaskit/modal-dialog | **71** | incl. 1 mixed atlaskit+radix (`src/components/overlays/AtlassianModal.tsx`) |
| Hand-rolled (fixed-position divs, no overlay-library import) | **99** | 98 confirmed overlay surfaces |
| Radix primitives directly (`@radix-ui/react-dialog`) | **2** | `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx` (the shadcn primitives themselves) |
| None / other | **79** | 7 tests, 1 asset, 5 data/hooks, 6 consumers of local wrappers (admin-dialog, CatalystDrawer, R360DrawerShared), 60 content sub-components / stories / css |

### Repo-wide consumer counts (any `.tsx` importing, not just overlay-named files)

| Import path | Consumers |
|---|---|
| `@/components/ui/dialog` (shadcn/Radix) | **194** |
| `@atlaskit/modal-dialog` | **123** |
| `@/components/ui/popover` | 91 |
| `@/components/ui/alert-dialog` | 55 |
| `@/components/ui/sheet` | 35 |
| `@/components/admin/admin-dialog` (Atlaskit shim, drop-in shadcn API) | 10 |
| `@/components/ads/Modal` (Atlaskit wrapper) | 2 |
| `@/components/ui/drawer` (vaul) | 0 — dead primitive |

**Headline:** the repo runs **three parallel modal systems** (shadcn/Radix ~194 consumers, Atlaskit ~123, hand-rolled ~99 files) plus two competing migration shims (`admin-dialog` → Atlaskit, `overlays/AtlassianModal` → Radix-with-Atlaskit-name). The canonical direction (Atlaskit per CLAUDE.md hierarchy) is a minority share.

### Hand-rolled cohort behavioral audit (n=98 overlay surfaces)

| Behavior | Missing | % |
|---|---|---|
| Focus trap (`focus-trap`/`FocusTrap`/inert) | **98/98** | 100% |
| aria-modal | 66/98 | 67% |
| role="dialog"/"alertdialog" | 65/98 | 66% |
| Portal (`createPortal`) | 60/98 | 61% |
| Body scroll lock | 50/98 | 51% |
| Escape-to-close | 34/98 | 35% |
| Backdrop click-to-close | 17/98 | 17% |

Raw per-file matrix retained in scratchpad audit; worst offenders (missing 6–7 of 7 behaviors) listed in Appendix B.

---

## 2. Findings

### CLUSTER A — System fragmentation

---

**CAT-AUDIT-0600**
- **Category:** Overlay system fragmentation
- **Severity:** P1
- **Surface:** Repo-wide (every hub)
- **Route:** all
- **Component:** Dialog/Modal (3 systems + 2 shims)
- **File Path:** `src/components/ui/dialog.tsx`, `src/components/admin/admin-dialog.tsx`, `src/components/overlays/AtlassianModal.tsx`, `src/components/ads/Modal.tsx`
- **Mode:** light+dark
- **CRE Rule Impact:** none direct
- **ADS Impact:** High — 194 shadcn-dialog consumers vs 123 Atlaskit; canonical hierarchy (CLAUDE.md: Catalyst canonical → Atlaskit) is the minority
- **Typography Impact:** Two different heading scales (Radix `text-lg font-semibold` vs Atlaskit ModalTitle)
- **Performance Impact:** Both Radix Dialog and @atlaskit/modal-dialog shipped in the bundle
- **Accessibility Impact:** Inconsistent — Radix/Atlaskit paths are fine; hand-rolled path is not (see 0602)
- **Evidence:** Consumer counts above. `admin-dialog.tsx` header: "drop-in shim replacing @/components/ui/dialog with @atlaskit/modal-dialog primitives" — only 10 adopters. `overlays/AtlassianModal.tsx` line 8: "Migrated: radix dialog removed — using @atlaskit/modal-dialog pattern" yet line 10 still `import * as DialogPrimitive from '@radix-ui/react-dialog'`.
- **Why:** Three systems means every modal fix (theming, a11y, z-index) must land 3×; shims exist but adoption stalled.
- **Recommended Fix:** Adopt `admin-dialog` shim as the single migration path (it is API-compatible with shadcn); ratchet-gate new `@/components/ui/dialog` imports the same way colors are gated.
- **Regression Risk:** Low for the gate; per-file migration risk medium (slot routing via displayName detection).
- **Validation Required:** Screenshot pass per migrated modal; DOM probe for ModalHeader/Body/Footer slotting.
- **Suggested PR:** PR1 (gate) + PR2–PR4 (migration tranches)

---

**CAT-AUDIT-0601**
- **Category:** Misleading wrapper / dead code
- **Severity:** P2
- **Surface:** Shared overlays
- **Route:** n/a
- **Component:** AtlassianModal, ui/drawer
- **File Path:** `src/components/overlays/AtlassianModal.tsx`, `src/components/ui/drawer.tsx`
- **Mode:** both
- **CRE Rule Impact:** none
- **ADS Impact:** `AtlassianModal` claims Atlassian anatomy but is Radix + Tailwind (`bg-black/50 backdrop-blur-sm` overlay — bare color, line 27; `bg-card border-border rounded-xl` line 67). `ui/drawer.tsx` (vaul) has **0 consumers** — dead primitive inviting accidental adoption.
- **Typography Impact:** Non-ADS heading styles inside a component named "Atlassian"
- **Performance Impact:** vaul dependency shipped for zero consumers
- **Accessibility Impact:** none (Radix handles a11y)
- **Evidence:** lines 8–10 contradictory comment/import; line 27 `bg-black/50`; grep `ui/drawer'` → 0 consumers.
- **Why:** A component named AtlassianModal that renders Radix+Tailwind actively misleads canonical-component discovery.
- **Recommended Fix:** Either finish the Atlaskit migration inside `AtlassianModal` or rename; delete/deprecate `ui/drawer.tsx`.
- **Regression Risk:** Low (rename/deprecate), medium (internal migration).
- **Validation Required:** Consumer sweep of AtlassianModal before change.
- **Suggested PR:** PR1

---

### CLUSTER B — Hand-rolled overlay accessibility (98 surfaces)

---

**CAT-AUDIT-0602**
- **Category:** Accessibility — hand-rolled modal cohort
- **Severity:** P0 (cohort)
- **Surface:** 98 overlay surfaces across WorkHub, ReleaseHub, Project Hub, Capacity, R360, ReqAssist, WSJF, Task10, Incidents
- **Route:** many
- **Component:** hand-rolled fixed-div modals/drawers
- **File Path:** full list in Appendix B; worst: `src/modules/project-work-hub/components/dialogs/story-detail-modules/ConfirmDialog.tsx`, `src/components/evidence/gallery/DeleteConfirmDialog.tsx`, `src/components/backlog/DetailPanel/modals/AddMilestoneModal.tsx` (all 7/7 behaviors missing)
- **Mode:** both
- **CRE Rule Impact:** none
- **ADS Impact:** Violates HAND-ROLLED UI BANNED (CLAUDE.md) — modals are on the banned list
- **Typography Impact:** per-file inline styles (see 0610)
- **Performance Impact:** 60/98 render without portal → deep-tree re-renders and stacking-context bugs
- **Accessibility Impact:** **Focus trap missing in 98/98 (100%)**; aria-modal missing 66; role missing 65; Escape missing 34; scroll lock missing 50
- **Evidence:** Static scan (Escape keydown handlers, focus-trap imports, role/aria attrs, createPortal, body overflow). Example: `story-detail-modules/ConfirmDialog.tsx` lines 24–28 — fixed inset-0 div, `onClick={onCancel}` backdrop only; no key handler, no role, no portal, no trap.
- **Why:** Keyboard users can Tab out of an open modal into the page behind it on every one of these 98 surfaces; 34 cannot be dismissed with Escape at all.
- **Recommended Fix:** Do not patch 98 files individually. Migrate to Atlaskit Modal / `CatalystDrawer` (`src/components/ads/CatalystDrawer.tsx`, already wraps @atlaskit/drawer and was created to "replace hand-rolled sheet/drawer patterns across 17+ surfaces") in tranches, worst-offenders first.
- **Regression Risk:** Medium per surface (layout/height assumptions).
- **Validation Required:** Keyboard-only walkthrough (Tab cycle, Escape) + screenshot per migrated surface.
- **Suggested PR:** PR2 (7/7 + 6/7 offenders, 17 files), PR3–PR5 (remainder by hub)

---

**CAT-AUDIT-0603**
- **Category:** Accessibility — Escape unclosable modals
- **Severity:** P1
- **Surface:** 34 hand-rolled overlays with no Escape handling
- **Route:** e.g. WSJF scoring, ReqAssist epic generation, Jira sync drawer, admin BulkEditModal, UserDrawer
- **Component:** see Appendix B (esc=False rows)
- **File Path:** e.g. `src/components/wsjf/WSJFScoringModal.tsx`, `src/pages/admin/components/BulkEditModal.tsx`, `src/pages/admin/components/UserDrawer.tsx`, `src/components/project-hub/jira-sync/JiraSyncDrawer.tsx`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** anti-pattern vs Atlaskit Modal defaults · **Typography Impact:** n/a · **Performance Impact:** n/a
- **Accessibility Impact:** WCAG 2.1.2 (no keyboard trap) risk in combination with missing close affordances
- **Evidence:** scan rows `esc=False` (34 of 98).
- **Why:** Escape-to-close is a default in both Radix and Atlaskit; these surfaces silently regressed it by hand-rolling.
- **Recommended Fix:** Covered by 0602 migration; where migration is deferred, add shared `useEscapeToClose` hook.
- **Regression Risk:** Low. **Validation Required:** keyboard probe. **Suggested PR:** PR2/PR3

---

**CAT-AUDIT-0604**
- **Category:** Scroll bleed / stacking
- **Severity:** P2
- **Surface:** 50 overlays without body scroll lock; 60 without portal
- **Route:** many
- **Component:** hand-rolled cohort
- **File Path:** Appendix B (`scrolllock=False`, `portal=False` rows)
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** none · **Typography Impact:** n/a
- **Performance Impact:** non-portal overlays inherit parent stacking contexts → recurring z-index escalation (z-[10000] observed in `story-detail-modules/ConfirmDialog.tsx` line 25)
- **Accessibility Impact:** background scrolls under open modal (mobile especially)
- **Evidence:** scan counts; z-index literal 10000 evidence line 25.
- **Why:** Background scroll + z-index wars are the classic symptom of non-portal fixed divs.
- **Recommended Fix:** Same migration as 0602.
- **Regression Risk:** Low. **Validation Required:** scroll probe with long page behind modal. **Suggested PR:** PR3–PR5

---

### CLUSTER C — Destructive-action dialogs (15-file sample + 2 extra)

Sample of 17 delete/remove/archive confirm dialogs. Results: 12/17 have a danger-styled confirm button; 5/17 use typed/explicit confirmation; 5 findings below.

---

**CAT-AUDIT-0605**
- **Category:** Destructive action — wrong button appearance
- **Severity:** P1
- **Surface:** Releases — delete release
- **Route:** /releases (release detail)
- **Component:** ReleaseDeleteDialog
- **File Path:** `src/components/releases/ReleaseDeleteDialog.tsx`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** Atlaskit Button used with wrong appearance for destructive action
- **Typography Impact:** none · **Performance Impact:** none
- **Accessibility Impact:** color-conveyed severity absent
- **Evidence:** line 78–79: confirm `<Button appearance="primary"` (brand blue) on a **delete** action. Dialog does have typed confirmation (good).
- **Why:** ADS mandates `appearance="danger"` for destructive confirms; primary-blue delete invites misclick.
- **Recommended Fix:** `appearance="danger"` one-liner.
- **Regression Risk:** None. **Validation Required:** screenshot. **Suggested PR:** PR6

---

**CAT-AUDIT-0606**
- **Category:** Destructive action — unstyled stub dialog
- **Severity:** P1
- **Surface:** WorkHub shared confirm
- **Route:** WorkHub surfaces (2 consumers per component registry)
- **Component:** ConfirmDialog (workhub)
- **File Path:** `src/components/workhub/shared/ConfirmDialog.tsx`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** zero ADS anatomy — not a modal at all
- **Typography Impact:** unstyled `<p>`/`<button>` · **Performance Impact:** none
- **Accessibility Impact:** no overlay, no focus management, no role
- **Evidence:** entire file is 12 lines: `props: any`, bare `<div><p>…<button onClick={props.onConfirm}>` — renders inline in flow, no backdrop, no danger styling. Already marked `status: 'replace', adsCloseness: 'none'` in `src/stories/audit-grade/00-ComponentRegistry.stories.tsx:202`.
- **Why:** A destructive confirm that renders as two unstyled inline buttons is a broken safety gate.
- **Recommended Fix:** Replace consumers with `DangerConfirmModal` (`src/components/shared/DangerConfirmModal.tsx`, Atlaskit + typed confirm) or Atlaskit Modal.
- **Regression Risk:** Low (2 consumers). **Validation Required:** screenshot + confirm flow probe. **Suggested PR:** PR6

---

**CAT-AUDIT-0607**
- **Category:** Destructive action — Enter-anywhere confirms delete
- **Severity:** P1
- **Surface:** Chat v2 — delete message
- **Route:** chat
- **Component:** DeleteMessageDialog
- **File Path:** `src/features/chat-v2/components/MessagePanel/DeleteMessageDialog.tsx`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** custom cv2 token family instead of ADS, fixed `width: 520` (line 44)
- **Typography Impact:** mixes `--ds-font-*` with `--cv2-font` · **Performance Impact:** none
- **Accessibility Impact:** document-level capture-phase keydown: `e.key === 'Enter'` → `onConfirm()` (lines 17–22) — **pressing Enter anywhere while the dialog is open deletes the message**, combined with `autoFocus` on the Delete button (line 136). Otherwise the best hand-rolled dialog in the cohort (portal, role, aria-modal, Escape, backdrop all present).
- **Evidence:** lines 16–23, 133–152.
- **Why:** Global Enter-to-destroy violates the explicit-confirmation principle; a user mid-keystroke can destroy data.
- **Recommended Fix:** Remove the document Enter handler; rely on focused-button activation only.
- **Regression Risk:** None. **Validation Required:** keyboard probe. **Suggested PR:** PR6

---

**CAT-AUDIT-0608**
- **Category:** Destructive action — bare color + wrong token role
- **Severity:** P2
- **Surface:** Project Work Hub — delete confirm
- **Route:** project work hub story detail
- **Component:** DeleteConfirmDialog (pwh)
- **File Path:** `src/modules/project-work-hub/components/dialogs/DeleteConfirmDialog.tsx`
- **Mode:** dark mode risk (white literal)
- **CRE Rule Impact:** none
- **ADS Impact:** line 48: `style={{ backgroundColor: 'var(--ds-text-danger, var(--cp-danger))', color: 'white' }}` — a **text** token used as background, plus named color `white` (banned bare color)
- **Typography Impact:** none · **Performance Impact:** none · **Accessibility Impact:** contrast unverified
- **Evidence:** line 45–51.
- **Why:** Should be `var(--ds-background-danger-bold)` + `var(--ds-text-inverse)`; token-role misuse breaks theme parity.
- **Recommended Fix:** Swap tokens; or use shadcn `variant="destructive"` which the AlertDialogAction supports.
- **Regression Risk:** None. **Validation Required:** dark-mode screenshot. **Suggested PR:** PR6

---

**CAT-AUDIT-0609**
- **Category:** Destructive action — hand-rolled delete confirms
- **Severity:** P1
- **Surface:** Evidence gallery, Kanban overflow, Skills inventory, Task10
- **Route:** several
- **Component:** 5 hand-rolled delete dialogs in sample
- **File Path:** `src/components/evidence/gallery/DeleteConfirmDialog.tsx` (7/7 a11y behaviors missing), `src/components/kanban/overflow-menu/DeleteConfirmDialog.tsx` (bare hex colors present), `src/components/skills-inventory/DeleteSkillDialog.tsx`, `src/modules/task10/components/modals/T10DeleteModal.tsx`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** kanban DeleteConfirmDialog contains bare hex/red literals · **Typography Impact:** inline styles
- **Accessibility Impact:** evidence-gallery dialog: no Escape, no role, no trap, no portal — a destructive dialog with zero a11y affordances
- **Evidence:** hand-rolled audit matrix rows; bare-color regex hit on kanban file.
- **Why:** Destructive flows deserve the *most* robust dialog primitives, these have the least.
- **Recommended Fix:** Standardize all delete confirms on `DangerConfirmModal` (already exists, Atlaskit-based, typed confirmation).
- **Regression Risk:** Low. **Validation Required:** per-dialog confirm-flow probe. **Suggested PR:** PR6

---

### CLUSTER D — Responsive width risk

---

**CAT-AUDIT-0610**
- **Category:** Fixed widths >600px without responsive handling
- **Severity:** P2
- **Surface:** 53 width literals >600px across overlay files
- **Route:** many
- **Component:** worst: PresentationModal (1200), ResourceAllocationModal (1200), CreateEditTestPlanDialog (1120), StrategyAnalyticsModal (1100), IncidentDetailModal (1000), SmartAssignmentModal (1000), WSJFModal `w-[900px]` (not max-w), AddMilestoneModal `w-[800px]`
- **File Path:** `src/components/ideas-roadmap/PresentationModal.tsx:117`, `src/components/resource-allocation/ResourceAllocationModal.tsx:116`, `src/components/test-plans/dialogs/CreateEditTestPlanDialog.tsx:173`, `src/modules/okr-v2/components/StrategyAnalyticsModal.tsx:719`, `src/components/backlog/DetailPanel/modals/WSJFModal.tsx:48`, `src/components/backlog/DetailPanel/modals/AddMilestoneModal.tsx:71`, `src/components/wsjf/WSJFScoringModal.tsx:231` — full list in scratchpad `widths.txt`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** Atlaskit Modal width prop unused · **Typography Impact:** n/a · **Performance Impact:** n/a
- **Accessibility Impact:** WCAG 1.4.10 reflow — hard `w-[900px]`/`width: 640` (no max-w/vw clamp) overflows small viewports
- **Evidence:** regex scan for width/maxWidth/w-[Npx] > 600; `max-w-*` variants are lower risk, plain `w-[900px]` / `width: 640` (CreateProjectModal line 130, ThemeCreateModal line 129, AddRequestModal line 91) are hard overflow.
- **Why:** Modals wider than the viewport clip form controls with no horizontal recovery.
- **Recommended Fix:** clamp pattern `width: min(Npx, calc(100vw - 32px))` or Atlaskit Modal `width="x-large"`.
- **Regression Risk:** Low. **Validation Required:** 375px-wide screenshot per fixed surface. **Suggested PR:** PR7

---

**CAT-AUDIT-0611**
- **Category:** Sheet primitive fixed widths
- **Severity:** P3
- **Surface:** All `ui/sheet` consumers using `wide`/`xl`
- **Route:** many
- **Component:** sheetWidthVariants
- **File Path:** `src/components/ui/sheet.tsx:58-71`
- **Mode:** both
- **CRE Rule Impact:** none · **ADS Impact:** none · **Typography Impact:** n/a · **Performance Impact:** n/a
- **Accessibility Impact:** `wide: "w-[640px]"`, `xl: "w-[800px]"` have no viewport clamp (only the legacy `auto` variant has `sm:max-w-sm`)
- **Evidence:** lines 61–65.
- **Why:** One-line fix at the primitive covers every consumer.
- **Recommended Fix:** `w-[800px] max-w-[100vw]` (or `max-w-full`) on wide/xl variants.
- **Regression Risk:** None on desktop. **Validation Required:** mobile screenshot of one sheet per variant. **Suggested PR:** PR7

---

### CLUSTER E — Typography / spacing drift inside modals

---

**CAT-AUDIT-0612**
- **Category:** Spacing/typography drift vs @atlaskit/modal-dialog defaults
- **Severity:** P2
- **Surface:** 39 of 71 Atlaskit-modal files carry hardcoded px padding and/or fontSize overrides inside modal anatomy
- **Route:** admin RBAC, chat, releases, catalyst-detail-views, project-hub widgets
- **Component:** worst: UserOverridesModal (10 fontSize literals + `16px 24px` paddings), EditStatusModal (8 fontSize literals), EditDatesModal (4)
- **File Path:** `src/components/admin/rbac/UserOverridesModal.tsx`, `src/components/admin/EditStatusModal.tsx`, `src/components/shared/Timeline/EditDatesModal.tsx`, `src/components/catalyst-detail-views/business-request/BrMoveProductDialog.tsx` (custom `fontFamily: var(--cp-font-body)`), `src/components/project-hub/dashboard/widgets/TimeInStatusFullscreenModal.tsx` (raw `ui-monospace` stacks) — full 39-file list in scratchpad `drift.txt`
- **Mode:** both
- **CRE Rule Impact:** none
- **ADS Impact:** ModalHeader/Body/Footer own their spacing (24px gutter) and type scale; per-file overrides fork the anatomy
- **Typography Impact:** direct — hardcoded `fontSize: NNpx` bypasses `--ds-font-*` scale (feeds the audit:ads typography ratchet)
- **Performance Impact:** none · **Accessibility Impact:** fixed px font sizes ignore user font scaling
- **Evidence:** regex scan `fontSize: N(px)` / `padding: 'Npx …'` / non-ds `fontFamily` restricted to the 71 atlaskit-modal files → 39 hits.
- **Why:** Defeats the point of using the canonical modal; visual drift between admin modals and the rest.
- **Recommended Fix:** Replace fontSize literals with `font: var(--ds-font-body[-*])`; drop padding overrides that duplicate Atlaskit gutters; keep genuinely denser sub-grids only with a comment.
- **Regression Risk:** Low-medium (visual). **Validation Required:** before/after screenshots of the 3 worst modals. **Suggested PR:** PR8

---

### CLUSTER F — Create-dialog duplication + CRE gating

---

**CAT-AUDIT-0613**
- **Category:** CRE chokepoint bypass — create dialogs not gated
- **Severity:** P1
- **Surface:** Work-item creation
- **Route:** in-jira module, project-hub work items, backlog
- **Component:** CreateIssueModal (in-jira), CreateWorkItemModal (project-hub), CreateEpicModal (backlog), CreateEpicDialog (program-epics), CreateFeatureDialog (pwh), CreateFeatureModal
- **File Path:** `src/modules/in-jira/components/CreateIssueModal.tsx`, `src/components/project-hub/work-items/CreateWorkItemModal.tsx`, `src/modules/backlog/components/CreateEpicModal.tsx`, `src/modules/program-epics/components/CreateEpicDialog.tsx`, `src/modules/project-work-hub/components/dialogs/CreateFeatureDialog.tsx`, `src/components/features/CreateFeatureModal.tsx`
- **Mode:** n/a
- **CRE Rule Impact:** **Direct.** Only 4 UI files call `filterCreatableTypes` from `@/lib/catalyst-rules`: `src/components/WorkListPanel/IssueTypeSelector.tsx` (which gates `WorkListPanel/CreateModal.tsx`), `src/components/kanban/InlineCreateCard.tsx`, `src/features/kanban-board/components/InlineCreate.tsx`, `src/components/workhub/create-story/CreateStoryModal.tsx`, plus `BacklogPage.atlaskit.tsx`. Every other create dialog above inserts work items (`.insert(`/mutations present) with **no CRE type filtering**. `in-jira/CreateIssueModal.tsx:34-40` hardcodes its own 5-type `ISSUE_TYPES` list, letting users create any type regardless of module ownership rules.
- **ADS Impact:** same file lines 35–39 use banned Tailwind color utilities (`bg-purple-500`, `bg-green-500`, `bg-blue-400`, `bg-red-500`, `bg-orange-500`)
- **Typography Impact:** n/a · **Performance Impact:** n/a · **Accessibility Impact:** n/a
- **Evidence:** grep `filterCreatableTypes` → 7 files total (3 lib/pages); type-selector + insert scans per file above; `CreateIssueModal.tsx:34-40` verbatim.
- **Why:** CRE exists to be the single authority on what can be created where; ungated dialogs are rule-engine bypasses that will produce hierarchy-invalid items.
- **Recommended Fix:** Route every type list through `filterCreatableTypes`; for single-type dialogs (CreateEpicModal etc.) assert creatability of the fixed type at open time.
- **Regression Risk:** Medium — gating may hide types users currently (incorrectly) can create. Raise before landing.
- **Validation Required:** per-dialog create probe on a CRE-restricted module.
- **Suggested PR:** PR9

---

**CAT-AUDIT-0614**
- **Category:** Duplicated Create* dialogs
- **Severity:** P2
- **Surface:** Creation flows repo-wide (44 Create*Modal/Dialog files, excl. tests/stories)
- **Route:** several
- **Component/File Path — duplicate pairs:**
  - Story: `src/components/workhub/create-story/CreateStoryModal.tsx` (canonical, CRE-gated, 1666 lines) vs `src/modules/project-work-hub/components/dialogs/CreateStoryDialog.tsx` (already neutralized stub — good precedent)
  - Project: `src/components/project-hub/CreateProjectModal.tsx` (hand-rolled) vs `src/components/projects/CreateProjectDialog.tsx`
  - Release: `src/components/product/CreateReleaseModal.tsx` vs `src/components/releasehub/CreateReleaseModal.tsx` (same name, two files)
  - Space: `src/components/knowledge-hub/CreateSpaceDialog.tsx` vs `src/spaces/components/CreateSpaceModal.tsx`
  - Feature: `src/components/features/CreateFeatureModal.tsx` vs `src/modules/project-work-hub/components/dialogs/CreateFeatureDialog.tsx`
  - Epic: `src/modules/backlog/components/CreateEpicModal.tsx` vs `src/modules/program-epics/components/CreateEpicDialog.tsx`
  - Objective: `src/modules/objectives/components/ObjectivePanel/CreateObjectiveDialog.tsx` vs `src/modules/okr-v2/components/CreateObjectiveDialogV2.tsx`
- **Mode:** n/a · **CRE Rule Impact:** each duplicate is a separate ungated insert path (compounds 0613) · **ADS Impact:** duplicates diverge in system (hand-rolled vs shadcn vs atlaskit) · **Typography Impact:** divergent · **Performance Impact:** duplicate form logic in bundle · **Accessibility Impact:** inherits worst-of-pair
- **Evidence:** find scan of Create*Modal/Dialog (44 files); pair analysis above; `CreateStoryDialog.tsx:1-15` documents the intended dedupe pattern.
- **Why:** Same entity, two creation forms → field drift, validation drift, CRE drift.
- **Recommended Fix:** Per pair: confirm live consumer, neutralize the loser exactly like CreateStoryDialog was.
- **Regression Risk:** Low if consumer-verified first. **Validation Required:** grep consumers per pair before neutralizing. **Suggested PR:** PR9

---

**CAT-AUDIT-0615**
- **Category:** Hand-rolled create modals (banned pattern) 
- **Severity:** P2
- **Surface:** Creation flows
- **Route:** project hub, boards, planhub, strategy themes, product-hub roadmap
- **Component:** CreateProjectModal, CreateBoardModal, ThemeCreateModal, AddRequestModal, CreateWorkItemModal
- **File Path:** `src/components/project-hub/CreateProjectModal.tsx` (`width: 640`, no trap/role/portal), `src/components/boards/CreateBoardModal.tsx` (`maxWidth: 680`), `src/components/strategy/themes/ThemeCreateModal.tsx` (`width: 640`), `src/components/product-hub/roadmap/AddRequestModal.tsx` (`width: 640`), `src/components/project-hub/work-items/CreateWorkItemModal.tsx`
- **Mode:** both · **CRE Rule Impact:** overlaps 0613 · **ADS Impact:** HAND-ROLLED UI BANNED violation · **Typography Impact:** inline styles · **Performance Impact:** no portal · **Accessibility Impact:** all missing focus trap + role + aria-modal (Appendix B)
- **Evidence:** hand-rolled matrix + width scan rows.
- **Why:** Create flows are the highest-traffic modals; they should be first migration targets.
- **Recommended Fix:** Migrate to Atlaskit Modal via admin-dialog shim in the same pass as 0613 CRE gating (one touch per file).
- **Regression Risk:** Medium. **Validation Required:** create-flow probe + screenshots. **Suggested PR:** PR9

---

## Appendix A — Classification totals

| Bucket | Count |
|---|---|
| Total overlay-named files scanned | 436 |
| shadcn/Radix consumers (file-level) | 185 |
| @atlaskit/modal-dialog (file-level) | 71 |
| Hand-rolled overlays | 99 (98 confirmed overlay surfaces) |
| Radix-direct primitives | 2 |
| Non-overlay (tests/assets/data/content/wrapper-consumers/stories/css) | 79 |
| Width literals >600px in overlay files | 53 |
| Atlaskit modals with px font/padding drift | 39 / 71 |
| Create*Modal/Dialog files (excl. tests/stories) | 44 |
| Create-type UI files CRE-gated via filterCreatableTypes | 4 |
| Destructive dialogs sampled | 17 (12 danger-styled, 5 typed-confirm) |

## Appendix B — Hand-rolled worst offenders (missing behaviors of: esc, trap, role, aria-modal, backdrop, portal, scroll-lock)

| Missing | File |
|---|---|
| 7/7 | src/modules/project-work-hub/components/dialogs/story-detail-modules/ConfirmDialog.tsx |
| 7/7 | src/components/evidence/gallery/DeleteConfirmDialog.tsx |
| 7/7 | src/components/backlog/DetailPanel/modals/AddMilestoneModal.tsx |
| 6/7 | src/pages/admin/components/UserDrawer.tsx |
| 6/7 | src/pages/admin/components/BulkEditModal.tsx |
| 6/7 | src/modules/task10/components/landing/T10CompletedDetailModal.tsx |
| 6/7 | src/modules/project-work-hub/components/FilterDrawer.tsx |
| 6/7 | src/modules/incidents/analytics/components/DrilldownDrawer.tsx |
| 6/7 | src/components/wsjf/WSJFScoringModal.tsx |
| 6/7 | src/components/workhub/workitems/WorkItemDrawer.tsx |
| 6/7 | src/components/workhub/themes/ThemeModal.tsx |
| 6/7 | src/components/wiki/WikiQuickRefDrawer.tsx |
| 6/7 | src/components/skills-inventory/DeleteSkillDialog.tsx |
| 6/7 | src/components/releasehub/ChgGateModal.tsx |
| 6/7 | src/components/releasehub/ChgDrawer.tsx |
| 6/7 | src/components/project-hub/jira-sync/JiraSyncDrawer.tsx |
| 6/7 | src/components/WorkListPanel/CreateModal.tsx |
| 5/7 | 18 further files incl. AddColumnModal, StatusPopover, PriorityPopover, StrategyAnalyticsModal, ReleaseModal, ThemeCreateModal, RA* (4 ReqAssist files), CreateWorkItemModal, ArchiveConfirmModal, ConflictResolutionDrawer, CreateProjectModal, StageDrillDownDrawer, BrPostMortemModal, ModalHeader (planner), MobileMenuDrawer |
| ≤4/7 | remaining 63 files — cohort totals: trap 98, ariamodal 66, role 65, portal 60, scrolllock 50, esc 34, backdrop 17 |

Full machine-readable matrices retained in session scratchpad (`overlay_files.txt`, `classified.txt`, `handrolled_audit.txt`, `widths.txt`, `drift.txt`).

## Appendix C — Suggested PR mapping

| PR | Scope | Findings |
|---|---|---|
| PR1 | Overlay-system ratchet gate + shim cleanup (AtlassianModal, dead ui/drawer) | 0600, 0601 |
| PR2 | Migrate 17 worst hand-rolled overlays (7/7 + 6/7) to Atlaskit/CatalystDrawer | 0602, 0603 |
| PR3–PR5 | Remaining hand-rolled migration by hub (WorkHub / ReleaseHub+Admin / rest) | 0602–0604 |
| PR6 | Destructive-dialog hardening (danger appearance, DangerConfirmModal adoption, Enter-to-delete removal, token fixes) | 0605–0609 |
| PR7 | Width clamps (sheet primitive + 53 literals) | 0610, 0611 |
| PR8 | Atlaskit-modal typography/spacing drift (39 files, worst 3 first) | 0612 |
| PR9 | Create-dialog dedupe + CRE gating | 0613–0615 |

---

## Lane Summary

436 overlay-named files inventoried. The repo runs **three parallel overlay systems** — shadcn/Radix (185 files / 194 dialog consumers), @atlaskit/modal-dialog (71 files / 123 consumers), and **99 hand-rolled fixed-div overlays** — despite two existing Atlaskit migration shims with almost no adoption (admin-dialog: 10 consumers; ads/Modal: 2) and one mislabeled Radix shim named "AtlassianModal". The hand-rolled cohort is the dominant risk: **0 of 98 have a focus trap**, two-thirds lack role/aria-modal, 34 cannot be closed with Escape, and 3 destructive-confirm dialogs miss all seven baseline behaviors. Destructive-action sampling (17 dialogs) found a primary-blue Delete button (ReleaseDeleteDialog), a completely unstyled inline "ConfirmDialog" stub guarding WorkHub deletes, and a chat delete dialog where pressing Enter anywhere confirms deletion. 53 width literals >600px (up to 1200px, several plain `w-[900px]` with no clamp) create mobile reflow risk, amplified by unclamped `wide`/`xl` sheet variants at the primitive. 39 of 71 Atlaskit modals hardcode px fonts/padding inside canonical anatomy. CRE gating is effectively bypassed at creation: only 4 UI chokepoints call `filterCreatableTypes` while ~40 other Create* dialogs insert work items ungated, including in-jira's CreateIssueModal with a hardcoded 5-type list styled in banned Tailwind colors, and 7 duplicate create-dialog pairs persist. 16 findings (CAT-AUDIT-0600–0615) mapped to PR1–PR9; top priorities: PR2 (worst-17 hand-rolled migration), PR6 (destructive-dialog hardening), PR9 (CRE gating).
