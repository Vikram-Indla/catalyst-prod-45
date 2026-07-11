# Create-Modal Unification Audit (VERIFIED code, 2026-07-05)

## Canonical: CreateStoryModal.tsx
@atlaskit/modal-dialog shell; 11-field stack; **work-type Select (L1047) = the extension seam**. Adding a type = append WORK_TYPES + `isX` bool + branch state/reset + status-default effect + handleSubmit branch to its own table + conditional field block + hide ph_issues-only fields. **Task (tasks table) and QA Bug (tm_defects) are LIVE proofs — modal already writes tm_defects today.**

## Create-surface inventory (fate)
| Surface | Impl | Fix |
|---|---|---|
| **Create test case** RepositoryPage:884 | **DEAD** — sets drawerOpen/editingCase (575-576), nothing renders | **Add 'Test Case' work type** → useCreateTestCase; wire button; delete dead state. PRIORITY 1 |
| Create cycle CyclesPage:252 | modal-dialog + tabs BUT native select + native date + TextArea (no ADF) | Add 'Test Cycle' type OR canonical sub-components; sprint via @atlaskit/select |
| Create test set TestSetsPage:321 | **inline expanding div, not a modal** | Add 'Test Set' type OR wrap in modal-dialog |
| Create folder/rename RepositoryPage:49,115 | modal-dialog BUT native select/input + hand-rolled buttons | Adopt @atlaskit/select+Textfield+button/new (not a work type) |
| **Create defect** CreateStoryModal isDefect | ✅ CANONICAL (tm_defects) | keep — the proof |
| Add cases→set SetDetailPage:96 | **hand-rolled fixed-div overlay, NO modal-dialog** (worst) | convert to modal-dialog; share one AddCasesModal w/ CycleDetail:1045 |
| Add cases→cycle CycleDetailPage:1045 | modal-dialog ✅ | keep/share |
| AI generate | shadcn Dialog + ui/* + framer | route output → 'Test Case' hook; migrate chrome later |
| Test plan / admin create | no UI | n/a |

## Unification plan (sequenced)
1. **'Test Case'** work type (fixes dead button, biggest impact): isTestCase branch; keep Project (resolveTmProjectId); Status=tm_case_status; extra Objective(ADF)/Preconditions/Priority(tm_case_priorities)/Folder/Steps(reuse StepEditor.tsx); submit useCreateTestCase; hide Sprint/Labels/Reporter. Wire RepositoryPage:884, delete dead state.
2. **'Test Set'** (smallest): isTestSet; Name→summary, Description→ADF, Set type+Membership conditional block; useCreateTestSet; replace inline card.
3. **'Test Cycle'** (largest): isTestCycle; Sprint via @atlaskit/select (project sprint field per Vikram), Owner Select, dates via @atlaskit/datetime-picker; Cases scope secondary section; useCreateCycle+useAddCasesToScope; retire CreateCycleModal.
4. Sub-component sweep: folder modals + set add-cases overlay → canonical @atlaskit components; extract shared AddCasesModal.

No 'Scenario' work type (no create surface). Note: MCP (storybook/supabase) unavailable this session — source-grounded only.
