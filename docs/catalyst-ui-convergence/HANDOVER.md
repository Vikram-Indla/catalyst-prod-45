# UI-Convergence Discovery → Execution Handover

**Date:** 2026-07-03  
**Status:** Discovery complete, awaiting approval + execution  
**Total gaps:** 312 (P0=21, P1=118, P2=173)  
**Scope:** Release Hub, Test Hub, Incident Hub, Defects, legacy /release/incidents  

---

## QUICK START FOR NEXT SESSION

**Copy-paste this entire section into Claude Code's next conversation:**

```
Activate RTK and caveman skills for token management:
/caveman full
rtk gain

Then start the execution:
activate feature CAT-CONVERGENCE-UI-FIX-20260703-001

Read the complete handover at docs/catalyst-ui-convergence/HANDOVER.md — all decision calls are listed below. Approve each before I launch parallel agents to execute the phased fixes.
```

---

## CRITICAL DECISION LOG (blocking execution)

**All 9 need Vikram approval before agents run:**

| ID | Decision | Options | Recommendation | Blocking? |
|---|---|---|---|---|
| **DL-1** | Incident data model | converge `incidents` table readers→`ph_issues` OR keep split-brain | Converge (eliminates NewIncidentModal fork, unifies create) | YES |
| **DL-2** | Legacy `/release/incidents/*` stack | freeze + redirect to incident-hub OR delete entirely | Delete (10 files, full retirement, nav rewire) | YES |
| **DL-3** | Which ReleaseDetailPage wins | bespoke `releasehub/ReleaseDetailPage.tsx` 314L OR canonical `release-hub/ReleaseDetailPage.tsx` | Consolidate onto slug detail, retire bespoke | PARTIAL |
| **DL-4** | Test-case detail unification | CatalystDetailRouter (canonical) OR CaseDrawer (MyWork/Board fork) | Unify on CatalystDetailRouter; remove CaseDrawer | YES (MyWork/Board detail is dead) |
| **DL-5** | Wire `/testhub/defects/:key` detail | add route + mount CatalystViewDefect at row click | Wire it (currently inert row click) | YES |
| **DL-6** | StepEditor parity | ensure CatalystViewTestCase step editor matches Jira-parity requirements | Verify post-TestHub-canon work (P1-S5) | PARTIAL |
| **DL-7** | Systemic `aria-modal=false` fix | retrofit CatalystViewBase detail panels with role=dialog aria-modal=true + Escape close + scroll-lock | Fix (blocks a11y, keyboard-trap defect) | YES |
| **DL-8** | Color-scanner vs CLAUDE.md | scanner allows hex-fallback `var(--ds-*, #fallback)`, CLAUDE.md bans them — override scanner config? | Ban fallbacks, update scanner (enforce pure tokens) | NO (technical) |
| **DL-9** | Route-gating policy | apply ModuleGuard to TestHub + Project Hub routes (currently ungated), or leave as-is? | Leave ungated for MVP (gate is aspirational) | NO |

**If you approve DL-1/2/4/5/7, I can launch parallel fix agents immediately.**

---

## DISCOVERY DELIVERABLES (read in order)

1. **[00-DISCOVERY-CONSOLIDATED.md](00-DISCOVERY-CONSOLIDATED.md)** — executive summary (scorecard, decision log, plan overview)
2. **[agents/01-route-discovery-agent.md](agents/01-route-discovery-agent.md)** — route universe (~120 routes, ~10 broken/dupe)
3. **[agents/02-project-hub-canonical-agent.md](agents/02-project-hub-canonical-agent.md)** — canonical component registry (JiraTable, CatalystDetailRouter, StatusLozenge, etc.)
4. **[agents/03-destination-hub-agent.md](agents/03-destination-hub-agent.md)** — per-hub surface inventory + gaps
5. **[agents/04-dom-probe-agent.md](agents/04-dom-probe-agent.md)** — live DOM structure + row-height deltas
6. **[agents/05-css-token-probe-agent.md](agents/05-css-token-probe-agent.md)** — computed-style mismatches (raw #E0E0E0 borders, +2px/-1px font deltas)
7. **[agents/06-chrome-mcp-interaction-agent.md](agents/06-chrome-mcp-interaction-agent.md)** — interaction probes (dead detail wiring, NewIncidentModal fork, testhub/board crash)
8. **[agents/07-component-mapping-agent.md](agents/07-component-mapping-agent.md)** — 57 mappings + ~45-file delete list
9. **[agents/08-accessibility-zindex-agent.md](agents/08-accessibility-zindex-agent.md)** — a11y defects (aria-modal=false panel, focus-trap failures)
10. **[agents/09-ads-rule-engine-agent.md](agents/09-ads-rule-engine-agent.md)** — ADS violations (952 Tailwind color utils, 253 rgb, 36 raw tables)
11. **[agents/10-evidence-consolidation-agent.md](agents/10-evidence-consolidation-agent.md)** — 312-gap inventory (full table, route coverage, plan)

---

## GAP INVENTORY BY HUB

### Release Hub (118 gaps, **D grade**)
**Worst ADS files** (top 5 worst):
- `src/pages/releases/DefectDetailPage.tsx` — 130 hits
- `src/features/all-releases/components/ReleaseCard.tsx` — 47
- `src/features/all-releases/components/EnterpriseTableView.tsx` — 46
- `src/pages/release/IncidentDashboardPage.tsx` — 32
- `src/pages/release/IncidentCommandCenter.tsx` — 28

**Major gaps:**
- RH-001…RH-010: 6 local pills (HealthPill×2, RiskPill×2, StatusPill, ResultBadge) → StatusLozenge
- RH-011…RH-030: table/list structure (raw role=null, 52/66px rows vs 39px canon, zero testids)
- RH-031…RH-050: detail fork (bespoke 8-tab ReleaseDetailPage 314L + duplicate slug detail)
- RH-051…RH-080: token violations (raw #6B6E76 subtle text, #E0E0E0 borders, Tailwind utils)
- RH-081…RH-118: hand-rolled dashboard, modals, cards, avatars

**Delete list (frees 7 top-20 ADS files):**
- `src/pages/releases/*` (12 files)
- `src/features/{all-releases,release-compare,release-calendar,my-test-scope}/` (dead-gen)
- `src/components/releases/defects/*` (8 files)

### Test Hub (58 gaps, **C+ grade**)
**Major gaps:**
- TH-001…TH-010: raw tables (CycleDetailPage:424, SetDetailPage:600/663 — native &lt;table&gt; instead of JiraTable)
- TH-011…TH-020: detail split (CaseDrawer vs CatalystDetailRouter — MyWork/Board bypass canon)
- TH-021…TH-030: dead interactions (defect row click inert, mywork row-click bounces to UUID-param ?case=)
- TH-031…TH-040: modals (CreateCycleModal, AddCasesModal, CreateSetModal — unlabeled native selects)
- TH-041…TH-058: token violations (#E0E0E0 borders ×6 surfaces, row-height -1px deltas)

**New live bug:** `/testhub/board` crashes — column `tm_test_cases.key` does not exist (stale query).

### Incident Hub (74 gaps, **B grade**)
**Major gaps:**
- IH-001…IH-010: incident create fork (shadcn NewIncidentModal vs CreateStoryModal, writes `incidents` vs `ph_issues`)
- IH-011…IH-050: legacy `/release/incidents/*` routes (10 routed surfaces: RoomList/RoomDetail, CreateIncident, IncidentCommandCenter, Kanban, Insights, Reports) + nav-rewire (OperationsSidebar + 2 ItemsDropdowns point to legacy stack)
- IH-051…IH-065: a11y defects (aria-modal=false un-dismissable panel on IncidentDetailPage, CatalystDetailRouter detail panels)
- IH-066…IH-074: token violations, unlabeled controls (CommitteeModal, ConvertDialog)

### Project Hub baseline (28 gaps, **baseline**)
- PH-001…PH-028: bare hex in details (StoryDetailPage:148, IssueDetailPage:140, wizard/StepDetails.tsx, phStyles.css), BacklogTable fork (2026-06-30, shares types but maintains separate impl)

### Defects (17 gaps, **C live / F dead**)
- DF-001…DF-010: live (defect detail inert, CreateStoryModal isDefect branch works, canonical structure)
- DF-011…DF-017: dead gen (src/pages/releases/* defect surfaces, DefectsPage 657L, DefectDetailPage 1,052L with 18 bare Tailwind colors)

### Cross-hub / A11y (17 gaps, **critical**)
- XH-001…XH-005: aria-modal=false un-dismissable panel (CatalystViewBase detail panels, affects multiple hubs)
- XH-006…XH-010: focus-trap failures (NewIncidentModal, unlabeled controls in modals)
- XH-011…XH-017: JiraTable grid ARIA incomplete, dropdown/popover positioning, z-index conflicts

---

## PHASED EXECUTION PLAN

**All slices ≤2hr, ordered by priority: P0 fixes → dead-code deletion → legacy retirement → structural convergence → token cleanup.**

### Phase P0: Correctness + A11y (P0=21 gaps, ~6 slices)

| Slice | Feature ID | Files touched | Canonical source | Tests | P0 fixes |
|---|---|---|---|---|---|
| P0-S1 | CAT-CONVERGENCE-DEFECT-DETAIL-20260703-001 | defectsDataSource.ts, CatalystDetailRouter.tsx, FullAppRoutes.tsx | CatalystViewDefect | /testhub/defects/:key click → detail opens | TH-021 (inert detail) |
| P0-S2 | CAT-CONVERGENCE-TESTCASE-DETAIL-UNIFY-20260703-001 | MyWorkPage.tsx, BoardPage.tsx, RepositoryPage.tsx, TestDataSource.tsx, CatalystDetailRouter.tsx | CatalystViewTestCase | /testhub/my-work + /board row-click → CatalystDetailRouter (not ?case= bounce) | TH-022/023 (dead bounce) |
| P0-S3 | CAT-CONVERGENCE-ARIA-MODAL-FIX-20260703-001 | CatalystViewBase.tsx, CatalystDetailPanel.tsx, IncidentDetailPage.tsx, CatalystDetailRouter.tsx | @atlaskit/modal-dialog + Escape close + scroll-lock | keyboard-only dismiss test | XH-001…005 (aria-modal=false) |
| P0-S4 | CAT-CONVERGENCE-TESTHUB-BOARD-FIX-20260703-001 | CycleDetailPage.tsx, test-cases.ts query | verify tm_test_cases.key exists in schema | /testhub/board loads cards | TH-030 (board crash) |
| P0-S5 | CAT-CONVERGENCE-INCIDENT-CREATE-UNIFY-20260703-001 | CreateStoryModal.tsx, ja/CreateDropdown.tsx, incidentsBacklogDataSource.ts | CreateStoryModal → isDefect + isIncident branches | incident create modal opens, writes ph_issues | IH-001 (create fork) + DL-1 |
| P0-S6 | CAT-CONVERGENCE-LEGACY-INCIDENT-RETIRE-20260703-001 | FullAppRoutes.tsx, OperationsSidebar.tsx, ItemsDropdown.tsx, GlobalPageHeader.tsx, all /release/incidents/* routes | IncidentDashboardPage + incident-hub canonical | nav points to /incident-hub, legacy routes 404/redirect | IH-011…050 + DL-2 |

### Phase P1: Dead code + structural (118 gaps, ~8 slices)

| Slice | Feature ID | Files | Canonical | Tests | Gaps |
|---|---|---|---|---|---|
| P1-S1 | CAT-CONVERGENCE-DELETE-RELEASES-GEN-20260703-001 | src/pages/releases/* (12), src/features/{all-releases,release-compare,…} (8) | (delete only) | grep RH-081 finds 0 | RH-081…090 |
| P1-S2 | CAT-CONVERGENCE-DELETE-RELEASES-DEFECTS-20260703-001 | src/components/releases/defects/* (8), ReleasesDefectKanban*, ReportDefectModal* | (delete only) | grep RH files count 0 | RH-091…100 |
| P1-S3 | CAT-CONVERGENCE-RAW-TABLES-JIRATABLE-20260703-001 | CycleDetailPage.tsx:424, SetDetailPage.tsx:600/663 | JiraTable | row virtualization works | TH-001…010 |
| P1-S4 | CAT-CONVERGENCE-PILLS-CONSOLIDATE-20260703-001 | HealthPill.tsx (×2), RiskPill.tsx (×2), StatusPill.tsx, ResultBadge.tsx, 5 incident pills | StatusLozenge + canonical PriorityIndicator | all pills render + dark-theme-reactive | RH-001…010 + IH-045…055 |
| P1-S5 | CAT-CONVERGENCE-AVATARS-CANONICAL-20260703-001 | ~20 files hand-rolled initials avatars | CatalystAvatar | avatar+tooltip renders | RH-110…118 |
| P1-S6 | CAT-CONVERGENCE-MODALS-ADS-20260703-001 | CommitteeModal, ConvertDialog, NewIncidentModal, CreateCycleModal, native &lt;select&gt; audit | @atlaskit/modal-dialog + @atlaskit/select + labeled controls | modals focus-trapped, dropdowns accessible | IH-065…074 + TH-040…050 |
| P1-S7 | CAT-CONVERGENCE-RELEASE-DETAIL-CONSOLIDATE-20260703-001 | retire bespoke releasehub/ReleaseDetailPage.tsx, keep release-hub/ReleaseDetailPage.tsx slug-detail | release-hub/ReleaseDetailPage | /release-hub/releases-management/:slug detail opens | RH-031…050 + DL-3 |
| P1-S8 | CAT-CONVERGENCE-DASHBOARD-CANONICAL-20260703-001 | CommandCenterPage bespoke dashboard | ProjectDashboardPage mode='release' | cards + KPI tiles render | RH-061…070 |

### Phase P2: Token cleanup (173 gaps, ~6 slices)

| Slice | Feature ID | Files | Canonical token | Tests | Gaps |
|---|---|---|---|---|---|
| P2-S1 | CAT-CONVERGENCE-BORDERS-TOKENS-20260703-001 | ~6 surfaces with #E0E0E0 borders (release-mgmt, testhub tables, incident, etc.) | --ds-border | dark-mode reactive | RH-051…060 + TH-041…045 + IH-066…070 |
| P2-S2 | CAT-CONVERGENCE-SUBTLE-TEXT-TOKENS-20260703-001 | Release Hub headers + changes list (raw #6B6E76) | --ds-text-subtle #505258 | dark-mode reactive | RH-061…070 |
| P2-S3 | CAT-CONVERGENCE-TAILWIND-COLORS-RELEASE-20260703-001 | 732 Tailwind color utils in Release Hub | --ds-* tokens | audit:ads count ≤ baseline | RH-071…090 |
| P2-S4 | CAT-CONVERGENCE-TAILWIND-COLORS-TESTHUB-20260703-001 | 34 Tailwind color utils in Test Hub | --ds-* tokens | audit:ads count ≤ baseline | TH-050…058 |
| P2-S5 | CAT-CONVERGENCE-TAILWIND-COLORS-INCIDENT-20260703-001 | 76 Tailwind color utils in Incident Hub (legacy + new) | --ds-* tokens | audit:ads count ≤ baseline | IH-065…074 |
| P2-S6 | CAT-CONVERGENCE-HEX-BASES-20260703-001 | Project Hub bare hex (StoryDetailPage, IssueDetailPage, phStyles.css) | --ds-* tokens | grep lint:colors count 0 | PH-001…028 |

---

## HOW TO USE THIS HANDOVER IN NEXT SESSION

**1. Copy-paste the QUICK START block (above) into your next Claude Code conversation with this repo.**

**2. I will:**
   - Verify you have Vikram approval on DL-1/2/4/5/7 (the blocking decisions)
   - Activate RTK + caveman skills for token management
   - Launch `activate feature CAT-CONVERGENCE-UI-FIX-20260703-001`
   - Read this handover fully
   - Spawn parallel agents for P0 slices (6 agents, no sequential waits)
   - Chain P1 agents (8, one-at-a-time or small batches per git state)
   - Run P2 agents (6, token-heavy, batch-cleanup)

**3. Each agent will:**
   - Read the slice spec (Feature ID, files, canonical source, test)
   - Implement the fix
   - Run the validation command (jest, npm run lint:colors, manual click-test)
   - Commit with Conventional Commits
   - Write session log to `~/catalyst/features/CAT-CONVERGENCE-UI-FIX-20260703-001/sessions/NNN_<purpose>.md`

**4. Parallel vs sequential:**
   - P0 slices 1-6 can run in parallel (all modify different files, no conflicts)
   - P1 slices 1-2 (delete) must block on each other (both touch src/pages/releases/*, src/features/)
   - P1 slices 3-8 can run after delete completes (no conflicts)
   - P2 slices 1-6 can all run in parallel (only token edits, no structure changes)

**5. ADS ratchet baselines** must be downraced after slices 1-2 (delete removes top-20 files):
   ```bash
   npm run lint:colors:gate --update
   npm run audit:ads:gate --update
   ```
   After each P1 slice, test for ratchet compliance:
   ```bash
   npm run lint:colors:gate
   npm run audit:ads:gate
   ```

---

## KEY FILES TO REFERENCE DURING EXECUTION

- **Canonical registry:** [agents/02-project-hub-canonical-agent.md](agents/02-project-hub-canonical-agent.md)
- **Component mappings:** [agents/07-component-mapping-agent.md](agents/07-component-mapping-agent.md)
- **Full gap table:** [agents/10-evidence-consolidation-agent.md](agents/10-evidence-consolidation-agent.md)
- **Repo CLAUDE.md:** `/Users/vikramindla/Documents/GitHub/catalyst-prod-45/CLAUDE.md`

---

## KNOWN LIMITATIONS

- **Screenshots:** all evidence is ID-only (Chrome MCP host-FS issue). If visuals needed for PR review, re-capture from localhost:8080 by navigating each route.
- **Haiku model:** phased execution should use Opus for agent quality; Haiku for light token ops only.
- **RTK + caveman skills:** activate early to manage token budget; discovery used ~1.5M tokens (9 agents on Opus).

---

## APPROVAL CHECKLIST

**Vikram must sign off on:**
- [ ] DL-1: Incident data model convergence (incidents → ph_issues)
- [ ] DL-2: Legacy /release/incidents full delete + nav rewire
- [ ] DL-4: Test-case detail unification (CaseDrawer → CatalystDetailRouter)
- [ ] DL-5: Wire /testhub/defects/:key detail
- [ ] DL-7: Systemic aria-modal=false fix (retrofit all detail panels)

**Once approved, I will:**
- [ ] Activate feature with approved Feature Work ID
- [ ] Launch P0 agents (6 parallel)
- [ ] Commit each slice with evidence
- [ ] Ratchet down ADS baselines post-deletion
- [ ] Report completion + PR ready for review

---

**End of handover. Ready for next session.**
