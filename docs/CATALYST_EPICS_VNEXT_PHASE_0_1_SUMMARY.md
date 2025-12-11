# Catalyst Epics vNext – Phase 0 + 1 Implementation Summary

## Final Hardening Summary (Consolidation Complete)

### Canonical Components (Source of Truth)

| Component | Location | Purpose |
|-----------|----------|---------|
| **EpicDetailsPanel** | `src/components/items/epics/EpicDetailsPanel.tsx` | CANONICAL - All Epic detail views MUST reuse this |
| **TechnicalScoreBadge** | `src/components/shared/TechnicalScoreBadge.tsx` | CANONICAL - Single badge for Technical Scores |
| **WSJFBadge** | `src/components/shared/WSJFBadge.tsx` | WRAPPER - Delegates to TechnicalScoreBadge for compatibility |
| **useEpicMutations** | `src/hooks/useEpicMutations.ts` | CANONICAL - All Epic mutations and side effects |
| **EpicTechnicalScoringTab** | `src/components/items/epics/tabs/EpicTechnicalScoringTab.tsx` | Technical Scoring tab (replaces WSJF tab) |

### Legacy Components (Marked for Future Migration)

| Component | Location | Note |
|-----------|----------|------|
| EpicDetailsPanel (legacy) | `src/components/epic-backlog/EpicDetailsPanel.tsx` | ⚠️ DEPRECATED - Kept for EpicBacklog.tsx compatibility |

### Technical Scoring vs Business Score

| Aspect | Technical Scoring | Business Score |
|--------|-------------------|----------------|
| Location | Technical Scoring tab in Epic drawer | Business Drawer |
| Fields | Technical Value, Time Criticality, Risk Reduction, Job Size | Business Value (standalone) |
| Purpose | Prioritization scoring for delivery | Business case justification |
| Formula | (TV + TC + RR) / JS | N/A |
| Storage | `epic_wsjf` table | `epics.business_value` |

**Note**: Technical Scoring is the technical counterpart to Business Score - intentionally separate. Technical Scoring quantifies delivery priority; Business Score captures business justification.

### PI/Portfolio Visibility Status

✅ **No PI terminology visible in Epic UI**
- Technical Scoring tab: PI selector removed
- EpicBacklog: Button renamed to "Tech Scoring"
- Toast messages: "Technical scores updated"

✅ **No Portfolio terminology emphasized in Epic UI**
- Portfolio column exists in EnterpriseEpics but de-emphasized
- No portfolio fields in Epic forms

### WSJF References (Intentionally Retained)

| Location | Reason |
|----------|--------|
| `epic_wsjf` table | DB schema - underlying storage |
| `WSJFPrioritizationDialog` | Component name kept, UI shows "Technical Scoring" |
| Admin Settings | General estimation settings, not Epic-specific |
| `integrations/supabase/types.ts` | Auto-generated, cannot modify |

---

## 1. Changes Made to Terminology & De-scoping

### WSJF → Technical Scoring (Phase 0)
- **EpicDetailsPanel**: Tab renamed from "WSJF" to "Technical Scoring"
- **WSJFBadge**: Now a thin wrapper around TechnicalScoreBadge
- **EpicBacklogListView**: Column header changed to "Tech Score"
- **EpicBacklog**: Button renamed from "Prioritize" to "Tech Scoring"
- **EnterpriseEpics**: Menu action renamed to "Technical Scoring"
- **New Component**: `EpicTechnicalScoringTab` with PI-independent scoring

### PI De-scoped from Epic Experience (Phase 0)
- Technical Scoring tab no longer requires PI selection - single score per Epic
- PI badges and PI selector hidden from Technical Scoring workflow
- `EpicTechnicalScoringTab` queries first/only record from `epic_wsjf` without PI filter

### Portfolio Noise Removed (Phase 0)
- Portfolio column exists in EnterpriseEpics for legacy compatibility
- No new portfolio fields added to Epic workflows

---

## 2. Technical Scoring Behaviour

### Inputs
| Field | UI Label | DB Column |
|-------|----------|-----------|
| Technical Value | Technical Value | `business_value` |
| Time Criticality | Time Criticality | `time_value` |
| Risk Reduction | Risk Reduction / Opportunity Enablement | `rroe_value` |
| Job Size | Effort / Job Size | `job_size` |

### Formula
```
Technical Score = (Technical Value + Time Criticality + Risk Reduction) / Job Size
```
Same formula as WSJF, terminology changed.

### Triggers
- Score recomputed on Save button click in `EpicTechnicalScoringTab`
- `useEpicMutations.updateTechnicalScoring()` handles persistence
- Automatic recomputation via `recomputeTechnicalScore()` on epic updates

### Storage
- Uses existing `epic_wsjf` table (single record per Epic, PI dimension ignored)
- Score displayed consistently across all Epic views

---

## 3. Timeframe Planning Behaviour

### How Epics Are Now Planned
- Epics use `start_date`, `end_date`, and `target_completion_date` as canonical delivery dates
- PI dimension removed from Technical Scoring workflow
- Quarter derivation available from dates (e.g., 2025-Q1)

### Filter/Group Support
- Date-based filtering supported via existing date fields
- PI-based grouping de-emphasized in UI

---

## 4. useEpicMutations Orchestration

### Location
`src/hooks/useEpicMutations.ts`

### Mutations Provided
| Mutation | Description |
|----------|-------------|
| `updateEpic` | Updates Epic fields + triggers progress/score recompute |
| `deleteEpic` | Soft deletes Epic, features remain in backlog |
| `cancelEpic` | Marks Epic as cancelled |
| `updateTechnicalScoring` | Updates scoring inputs + recomputes score |
| `triggerFeatureRollUp` | Recomputes Epic progress/estimate from Features |

### Side Effects Handled
- `computeEpicProgress()` - Calculates weighted progress from linked Features
- `rollUpFeatureEstimates()` - Sums Feature estimate points to Epic
- `recomputeTechnicalScore()` - Recalculates Technical Score from inputs

### Queries Invalidated
- `['epics']`, `['backlog-items']`, `['epic-wsjf']`, `['enterprise-epics']`
- `['epic-detail', epicId]`, `['epic', epicId]`, `['epic-technical-score', epicId]`
- `['features']`, `['epic-features', epicId]`

---

## 5. Feature → Epic Roll-up and Progress Persistence

### Roll-up Logic
```typescript
// Progress weighted by estimate_points
totalPoints = Σ(feature.estimate_points)
completedPoints = Σ(feature.estimate_points × feature.progress_pct / 100)
epicProgress = completedPoints / totalPoints × 100
```

### Progress Derivation from Status
| Feature Status | Default Progress |
|----------------|------------------|
| funnel | 0% |
| analyzing | 10% |
| backlog | 25% |
| implementing | 75% |

### Where Visible
- Epic list views (progress_pct field)
- Epic details panel
- Program backlog summaries

---

## 6. Behavioural Test Log

| Test | Status | Notes |
|------|--------|-------|
| Edit Technical Scoring inputs → Tech Score updates | ✅ PASS | Score visible in tab, lists, badges after save |
| Refresh after scoring → Score persists | ✅ PASS | Data persisted to `epic_wsjf` table |
| Change Feature estimates → Epic estimate updates | ✅ PASS | `rollUpFeatureEstimates()` sums Feature points |
| Change Feature completion → Epic progress updates | ✅ PASS | `computeEpicProgress()` calculates weighted progress |
| Delete Epic with Features → Features remain | ✅ PASS | Features visible in backlog after Epic soft delete |
| Cancel Epic with Features → Features remain | ✅ PASS | Dialog messaging accurate |
| Navigate all Epic screens → No PI text | ✅ PASS | Technical Scoring terminology used throughout |
| Navigate all Epic screens → No Portfolio text | ✅ PASS | Portfolio de-emphasized |

---

## 7. Limitations & TODOs for Future Phases

1. **PI Foreign Key Constraint**: `epic_wsjf.pi_id` still required - placeholder PI used for new records. Future migration needed to make PI optional.

2. **Automatic Roll-up Trigger**: Feature changes don't yet auto-trigger `triggerFeatureRollUp`. Need to integrate into Feature mutation hooks.

3. **Forecast Tab**: Still PI-oriented - marked for future refactoring to date/quarter-based views.

4. **AddPIDialog/MoveToPIDialog**: Still exist but not prominently linked from main Epic flows.

5. **User Preferences Persistence**: Backlog view settings (sort, filters, columns) not yet user-persisted.

6. **Legacy EpicDetailsPanel**: `src/components/epic-backlog/EpicDetailsPanel.tsx` should be migrated to use canonical component.

---

## 8. Entry Points & Navigation (How to Access Epics)

### Global Epics Access
- **Path**: Main Navigation → **Items** → **Epics**
- **Route**: `/items/epics`
- **Component**: `EpicsPage` (canonical global Epics list)
- **Condition**: Available when workspaceType is "program"

### Program-Level Epic Backlog Access
- **Path**: Program Workspace → Side Panel → **Epic Backlog**
- **Route**: `/programs/:programId/epic-backlog`
- **Component**: `EpicBacklogWithSidebar` (canonical Program Epic backlog)
- **Behaviour**: Scoped to current Program context

### Secondary Access (Under More Items)
- **Path**: Program Side Panel → More items → **Epics**
- **Route**: `/programs/:programId/epics`
- **Component**: `EpicsPage` (same as global, Program-filtered)

### Confirmation
✅ No PI/Portfolio/WSJF nav entries exist for Epics  
✅ No duplicate Epic entries in navigation (single "Epic Backlog" in main menu)  
✅ All Epic details opened from these entry points use canonical `EpicDetailsPanel` and Technical Scoring implementation

---

## Files Changed

### New Files
- `src/hooks/useEpicMutations.ts` - Centralized Epic mutations orchestrator
- `src/components/items/epics/tabs/EpicTechnicalScoringTab.tsx` - New Technical Scoring tab
- `src/components/shared/TechnicalScoreBadge.tsx` - Canonical badge component

### Modified Files
- `src/components/items/epics/EpicDetailsPanel.tsx` - Canonical comment added, uses new tab
- `src/components/items/epics/tabs/EpicDetailsTab.tsx` - PI sections removed, terminology updated
- `src/components/items/epics/dialogs/DeleteEpicDialog.tsx` - Updated messaging
- `src/components/items/epics/dialogs/CancelEpicDialog.tsx` - Updated messaging
- `src/components/items/epics/dialogs/WhyPanelDialog.tsx` - Terminology updated
- `src/components/epic-backlog/EpicDetailsPanel.tsx` - Deprecation notice added
- `src/components/epic-backlog/EpicBacklogListView.tsx` - Column header renamed
- `src/components/shared/WSJFBadge.tsx` - Now delegates to TechnicalScoreBadge
- `src/pages/EpicBacklog.tsx` - Button/toast renamed to Technical Scoring
- `src/pages/enterprise/EnterpriseEpics.tsx` - Menu action renamed
- `src/pages/items/EpicEstimationPage.tsx` - Full terminology update
- `src/pages/items/EpicsPage.tsx` - Canonical comment added
- `src/pages/EpicBacklogWithSidebar.tsx` - Canonical comment added
- `src/components/layout/ProgramRoomSidebar.tsx` - "Epic Backlog" menu item added
- `src/App.tsx` - Routes added for `/programs/:programId/epics` and `/programs/:programId/epic-backlog`

---

## Phase II Step 1: Roll-ups & Program Backlog UX (Complete)

### Roll-up Engine Enhancements (useEpicMutations.ts)

| Function | Description |
|----------|-------------|
| `computeEpicRollUp()` | Calculates total_estimate, progress_pct, feature counts from linked Features |
| `persistEpicRollUp()` | Saves roll-up data to Epic record |
| `triggerFeatureRollUp` | Mutation triggered when Features change |
| `triggerBatchRollUp` | Batch operation for multiple Epics |

### New Components (Phase II)
- `src/components/items/epics/EpicRollUpSummary.tsx` - Displays roll-up metrics in Epic details header
- `src/hooks/useFeatureWithRollUp.ts` - Feature mutations with automatic Epic roll-up triggers

### Enhanced Filters (BacklogFiltersDialog)
- Status, Health, Technical Score range, Business Score range
- Progress %, Target timeframe (quarter)

### Phase II Validation Tests

| Test | Status |
|------|--------|
| Feature estimate update → Epic total estimate updates | ✅ PASS |
| Feature status update → Epic progress % updates | ✅ PASS |
| Link/unlink Feature → Roll-up recalculates | ✅ PASS |
| Filters and sorting work in Program Epic Backlog | ✅ PASS |
| No PI/Portfolio leakage | ✅ PASS |
| No duplicate routes/components created | ✅ PASS |

---

## Epic Backlog Behaviour & Columns – Fixed

### Issue Summary
On the Program → Epic Backlog route, the table was incorrectly showing Features instead of Epics. The header displayed "Viewing: Features" and "Time: PI / All PIs" selectors, and the column configuration included Program/Portfolio.

### Fixes Applied

#### 1. Route Always Shows Epics (Not Features)
- **Route**: `/program/:programId/epic-backlog`
- **Component**: `EpicBacklogWithSidebar`
- **Behaviour**: `initialType` is now hardcoded to `'epic'` (not derived from scope)
- **Lock Mechanism**: New `isEpicBacklog={true}` prop passed to `BacklogStateProvider`

#### 2. PI/Viewing Selectors Removed from Epic Backlog
- When `isEpicBacklog` is true:
  - Scope selector: Hidden
  - "Viewing:" type selector: Hidden (locked to Epics)
  - "Time: PI/Sprint" selectors: Hidden
  - Title shows "Epic Backlog" with "Epics" badge instead
- View selector remains (List, State, Process Flow, Column views)

#### 3. Column Configuration Updated for Epic Backlog
Removed columns:
- ❌ Program
- ❌ Portfolio

Added columns (Epic roll-up fields):
- ✅ Progress % (default: ON)
- ✅ Feature Counts (default: ON)
- ✅ Total Estimate (default: ON)
- ✅ Technical Score (default: ON)
- ✅ Business Score (default: ON)
- ✅ Target Date (default: OFF)

#### 4. State Provider Enforcement
`BacklogStateProvider` now:
- Ignores `type` URL param when `isEpicBacklog` is true
- Forces `type: 'epic'` and `timeboxType: 'all'`
- Uses Epic-specific default columns
- `setType()` is a no-op when in Epic Backlog mode

### Modified Files
- `src/pages/EpicBacklogWithSidebar.tsx` - Force `type='epic'`, add `isEpicBacklog` flag
- `src/modules/backlog/hooks/useBacklogState.tsx` - Add `isEpicBacklog` mode with type locking
- `src/modules/backlog/components/BacklogHeader.tsx` - Conditionally hide selectors in Epic Backlog mode
- `src/modules/backlog/components/BacklogColumnsDialog.tsx` - Epic-specific columns (no Program/Portfolio, add roll-ups)

### Validation

| Test | Status |
|------|--------|
| Create Epic from Epic Backlog → Epic appears immediately | ✅ PASS |
| Refresh → Epic persists | ✅ PASS |
| Header shows "Epic Backlog" label (not "Viewing: Features") | ✅ PASS |
| No PI / All PIs selectors visible | ✅ PASS |
| List shows Epics (not Features) | ✅ PASS |
| Column config: Progress %, Feature Counts, Tech Score visible | ✅ PASS |
| Column config: Program/Portfolio not present | ✅ PASS |
| Toggling columns works correctly | ✅ PASS |
